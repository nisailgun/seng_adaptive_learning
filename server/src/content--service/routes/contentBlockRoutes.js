const express = require("express");
const router = express.Router();

const ContentBlock = require("../models/ContentBlock");

// POST /api/content-blocks  (create)
router.post("/", async (req, res) => {
  try {
    const created = await ContentBlock.create(req.body);
    res.status(201).json(created);
  } catch (err) {
    console.error("create content block error:", err);
    res.status(500).json({ message: "Error creating content block" });
  }
});

// GET /api/content-blocks?topic=...&variant=...&languageCode=...
router.get("/", async (req, res) => {
  try {
    const { topic, variant, languageCode } = req.query;
    const query = {};
    if (topic) query.topic = topic;
    if (variant) query.variant = variant;
    if (languageCode) query.languageCode = languageCode;

    const blocks = await ContentBlock.find(query).lean();
    res.json(blocks);
  } catch (err) {
    console.error("list content blocks error:", err);
    res.status(500).json({ message: "Error listing content blocks" });
  }
});

module.exports = router;
