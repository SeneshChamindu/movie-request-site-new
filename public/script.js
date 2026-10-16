```javascript
const searchForm = document.getElementById("searchForm");
const movieSearch = document.getElementById("movieSearch");
const searchMessage = document.getElementById("searchMessage");
const movieResults = document.getElementById("movieResults");

const requestForm = document.getElementById("requestForm");
const requestMovieName = document.getElementById("requestMovieName");
const requestMovieYear = document.getElementById("requestMovieYear");
const requestMovieNote = document.getElementById("requestMovieNote");
const requestMessage = document.getElementById("requestMessage");

const botStatus = document.getElementById("botStatus");

// Current year
document.getElementById("currentYear").textContent =
    new Date().getFullYear();

// Show a message safely
function showMessage(element, message, type = "") {
    element.textContent = message;
    element.className = type;
}

// Search movies
searchForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const query = movieSearch.value.trim();

    if (!query) {
        showMessage(searchMessage, "Enter a movie name.", "error");
        return;
    }

    movieResults.replaceChildren();
    showMessage(searchMessage, "Searching movies...");

    try {
        const response = await fetch(
            `/api/movies/search?query=${encodeURIComponent(query)}`
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Movie search failed.");
        }

        if (!Array.isArray(data.results) || data.results.length === 0) {
            showMessage(searchMessage, "No movies found.");
            return;
        }

        showMessage(
            searchMessage,
            `Found ${data.results.length} movie(s).`
        );

        data.results.forEach((movie) => {
            const card = document.createElement("article");
            card.className = "movie-card";

            const poster = document.createElement("img");
            poster.src = movie.poster || "/images/no-poster.png";
            poster.alt = `${movie.title || "Movie"} poster`;
            poster.loading = "lazy";

            poster.onerror = () => {
                poster.onerror = null;
                poster.removeAttribute("src");
                poster.alt = "Poster unavailable";
            };

            const content = document.createElement("div");
            content.className = "movie-card-content";

            const title = document.createElement("h3");
            title.textContent = movie.title || "Unknown title";

            const details = document.createElement("p");
            details.textContent = [
                movie.year || "Year unknown",
                movie.rating ? `Rating: ${movie.rating}` : ""
            ].filter(Boolean).join(" · ");

            const overview = document.createElement("p");
            overview.textContent = movie.overview || "";

            const requestButton = document.createElement("button");
            requestButton.type = "button";
            requestButton.textContent = "Request Movie";

            requestButton.addEventListener("click", () => {
                requestMovieName.value = movie.title || "";
                requestMovieYear.value = movie.year || "";

                document.getElementById("request").scrollIntoView({
                    behavior: "smooth"
                });

                requestMovieName.focus();
            });

            content.append(title, details);

            if (movie.overview) {
                content.appendChild(overview);
            }

            content.appendChild(requestButton);
            card.append(poster, content);
            movieResults.appendChild(card);
        });
    } catch (error) {
        showMessage(
            searchMessage,
            error.message || "Cannot search movies right now.",
            "error"
        );
    }
});

// Submit a movie request
requestForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const title = requestMovieName.value.trim();
    const year = requestMovieYear.value;
    const note = requestMovieNote.value.trim();

    if (!title) {
        showMessage(requestMessage, "Enter a movie name.", "error");
        return;
    }

    showMessage(requestMessage, "Submitting request...");

    const submitButton = requestForm.querySelector(
        'button[type="submit"]'
    );

    submitButton.disabled = true;

    try {
        const response = await fetch("/api/requests", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                title,
                year: year ? Number(year) : null,
                note
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Request submission failed.");
        }

        showMessage(
            requestMessage,
            data.message || "Your request was submitted successfully.",
            "success"
        );

        requestForm.reset();
    } catch (error) {
        showMessage(
            requestMessage,
            error.message || "Cannot submit the request right now.",
            "error"
        );
    } finally {
        submitButton.disabled = false;
    }
});

// Check website and bot status
async function checkStatus() {
    try {
        const response = await fetch("/api/status");
        const data = await response.json();

        if (!response.ok) {
            throw new Error("Status unavailable");
        }

        botStatus.textContent = data.bot === "online"
            ? "Bot is online"
            : "Bot is not connected";
    } catch {
        botStatus.textContent = "Status unavailable";
    }
}

checkStatus();
```
