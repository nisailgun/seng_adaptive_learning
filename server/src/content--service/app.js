// src/app.js
const contentBlockRoutes = require("./routes/contentBlockRoutes");
const adaptiveRoutes = require("./routes/adaptiveRoutes");

const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const lessonRoutes = require("./routes/lessonRoutes");
const progressRoutes = require("./routes/progressRoutes");


const app = express();
const PORT = process.env.PORT || 4000;

// middlewares
app.use(cors());
app.use(express.json());

// routes
app.use("/api/lessons", lessonRoutes);
app.use("/api/content-blocks", contentBlockRoutes);
app.use("/api/content", adaptiveRoutes);
app.use("/api/progress", progressRoutes);


// health check
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// DB + server
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Content service running on port ${PORT}`);
  });
});
