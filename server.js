```javascript
const express = require("express");
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// Website status
app.get("/api/status", (req, res) => {
    res.json({
        success: true,
        website: "online",
        bot: "not_connected"
    });
});

// Movie search
app.get("/api/movies/search", async (req, res) => {
    const query = String(req.query.query || "").trim();

    if (!query) {
        return res.status(400).json({
            success: false,
            message: "Movie name is required.",
            results: []
        });
    }

    const apiKey = process.env.TMDB_API_KEY;

    if (!apiKey) {
        return res.status(503).json({
            success: false,
            message: "Movie search API is not configured yet.",
            results: []
        });
    }

    try {
        const url = new URL(
            "https://api.themoviedb.org/3/search/movie"
        );

        url.searchParams.set("query", query);
        url.searchParams.set("include_adult", "false");

        const response = await fetch(url, {
            headers: {
                Authorization: `Bearer ${apiKey}`,
                Accept: "application/json"
            }
        });

        if (!response.ok) {
            throw new Error("Movie service request failed.");
        }

        const data = await response.json();

        const results = (data.results || []).map((movie) => ({
            id: movie.id,
            title: movie.title,
            year: movie.release_date
                ? movie.release_date.slice(0, 4)
                : "",
            rating: movie.vote_average
                ? movie.vote_average.toFixed(1)
                : "",
            overview: movie.overview || "",
            poster: movie.poster_path
                ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
                : ""
        }));

        res.json({
            success: true,
            results
        });
    } catch (error) {
        console.error("Movie search error:", error.message);

        res.status(502).json({
            success: false,
            message: "Unable to search movies right now.",
            results: []
        });
    }
});

// Movie request endpoint
// Temporary in-memory queue; MongoDB can be added later.
const requests = [];
let nextRequestId = 1;

app.post("/api/requests", (req, res) => {
    const title = String(req.body.title || "").trim();
    const note = String(req.body.note || "").trim();
    const year = req.body.year;

    if (!title || title.length > 150) {
        return res.status(400).json({
            success: false,
            message: "Enter a valid movie name."
        });
    }

    if (note.length > 500) {
        return res.status(400).json({
            success: false,
            message: "Additional details are too long."
        });
    }

    if (
        year !== undefined &&
        year !== null &&
        year !== "" &&
        (!Number.isInteger(year) || year < 1888 || year > 2100)
    ) {
        return res.status(400).json({
            success: false,
            message: "Enter a valid release year."
        });
    }

    const request = {
        id: nextRequestId++,
        title,
        year: year || null,
        note,
        status: "pending",
        createdAt: new Date().toISOString()
    };

    requests.push(request);

    console.log("New movie request:", request.title);

    res.status(201).json({
        success: true,
        message: "Movie request received.",
        request: {
            id: request.id,
            title: request.title,
            status: request.status
        }
    });
});

// Basic health check
app.get("/api/health", (req, res) => {
    res.json({
        success: true,
        message: "Server is running."
    });
});

// Start server
app.listen(PORT, "0.0.0.0", () => {
    console.log(`Website running on port ${PORT}`);
});
```
