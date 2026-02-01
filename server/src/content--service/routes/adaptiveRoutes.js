// server/src/content-service/routes/adaptiveRoutes.js
const express = require("express");
const router = express.Router();
const { requestSimplification } = require("../services/adaptiveService");

// Yanlış cevapta çağrılacak endpoint
// POST /api/content/request-simplification
router.post("/request-simplification", async (req, res) => {
  try {
    const { topic, languageCode } = req.body;

    if (!topic) {
      return res.status(400).json({ message: "topic is required" });
    }

    const block = await requestSimplification(topic, languageCode || "en");

    if (!block) {
      return res.status(404).json({ message: "No content found for topic" });
    }

    // Bu response, dokümandaki simplifiedContentBlock
    res.json(block);
  } catch (err) {
    console.error("requestSimplification error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;
