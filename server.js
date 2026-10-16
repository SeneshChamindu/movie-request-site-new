const express = require("express");
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve website files
app.use(express.static(path.join(__dirname, "public")));

// API status
app.get("/api/status", (req, res) => {
    res.json({
        success: true,
        website: "online",
        bot: "not_connected"
    });
});

// Health check
app.get("/api/health", (req, res) => {
    res.json({
        success: true,
        message: "Server is running"
    });
});

// Start server
app.listen(PORT, "0.0.0.0", () => {
    console.log(`Website running on port ${PORT}`);
});
