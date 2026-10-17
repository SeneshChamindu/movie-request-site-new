
require("dotenv").config();

const express = require("express");
const path = require("path");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "20kb" }));
app.use(express.static(path.join(__dirname, "public")));

const requests = [];
const MAX_REQUESTS = 500;
let botOnline = false;

// Movie API search URL එකේ {query} කොටසට movie name එක යොදනවා.
app.get("/api/movies/search", async (req, res) => {
  const query = String(req.query.q || "").trim();

  if (!query || query.length > 120) {
    return res.status(400).json({ error: "Valid movie name එකක් ඇතුළත් කරන්න." });
  }

  if (!process.env.MOVIE_API_SEARCH_URL) {
    return res.status(503).json({
      error: "Movie API එක තවම configure කරලා නැහැ. .env එකට API URL එක දාන්න."
    });
  }

  try {
    const url = process.env.MOVIE_API_SEARCH_URL.replace(
      "{query}",
      encodeURIComponent(query)
    );

    const headers = { Accept: "application/json" };

    if (process.env.MOVIE_API_KEY) {
      headers[process.env.MOVIE_API_KEY_HEADER || "x-api-key"] =
        process.env.MOVIE_API_KEY;
    }

    const response = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(12000)
    });

    if (!response.ok) {
      return res.status(502).json({ error: "Movie API එකෙන් error එකක් ලැබුණා." });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Movie search error:", error.message);
    res.status(502).json({ error: "Movie search කරන්න බැරි වුණා. නැවත උත්සාහ කරන්න." });
  }
});

// Public website settings
app.get("/api/config", (_req, res) => {
  res.json({
    groupLink: process.env.WHATSAPP_GROUP_LINK || "",
    botOnline
  });
});

// Bot status is OFFLINE until your real bot integration updates it.
app.get("/api/status", (_req, res) => {
  res.json({
    online: botOnline,
    message: botOnline ? "Bot is ready." : "Bot is currently offline."
  });
});

// Submit a movie request
app.post("/api/requests", (req, res) => {
  const movie = String(req.body.movie || "").trim();
  const contact = String(req.body.contact || "").trim();

  if (!movie || movie.length > 200) {
    return res.status(400).json({ error: "Movie title එක පරීක්ෂා කරන්න." });
  }

  if (!/^\+?[0-9][0-9\s-]{6,18}$/.test(contact)) {
    return res.status(400).json({ error: "නිවැරදි WhatsApp / Telegram number එකක් දෙන්න." });
  }

  if (requests.length >= MAX_REQUESTS) {
    return res.status(503).json({ error: "Queue එක දැනට පිරී ඇත. පසුව උත්සාහ කරන්න." });
  }

  const duplicate = requests.find(
    item => item.movie.toLowerCase() === movie.toLowerCase()
      && item.contact === contact
      && ["Pending", "Processing"].includes(item.status)
  );

  if (duplicate) {
    return res.status(409).json({
      error: "මේ movie එකට ඔයාගෙන් request එකක් දැනටමත් තියෙනවා.",
      request: duplicate
    });
  }

  const request = {
    id: crypto.randomUUID(),
    number: requests.length ? requests[requests.length - 1].number + 1 : 1,
    movie,
    contact,
    status: "Pending",
    createdAt: new Date().toISOString()
  };

  requests.push(request);

  res.status(201).json({
    request,
    position: requests.filter(item =>
      ["Pending", "Processing"].includes(item.status)
    ).findIndex(item => item.id === request.id) + 1
  });
});

// Look up a request using its unique ID
app.get("/api/requests/:id", (req, res) => {
  const request = requests.find(item => item.id === req.params.id);

  if (!request) {
    return res.status(404).json({ error: "Request එක හමු වුණේ නැහැ." });
  }

  const position = ["Pending", "Processing"].includes(request.status)
    ? requests.filter(item =>
        ["Pending", "Processing"].includes(item.status)
      ).findIndex(item => item.id === request.id) + 1
    : 0;

  res.json({ request, position });
});

// Public queue view: do not expose phone numbers or private IDs.
app.get("/api/queue", (_req, res) => {
  res.json({
    total: requests.filter(item =>
      ["Pending", "Processing"].includes(item.status)
    ).length,
    queue: requests
      .filter(item => ["Pending", "Processing"].includes(item.status))
      .slice(0, 10)
      .map(item => ({
        number: item.number,
        movie: item.movie,
        status: item.status
      }))
  });
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Cine Request running on port ${PORT}`);
});
