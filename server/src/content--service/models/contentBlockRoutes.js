// server/src/content-service/routes/contentBlockRoutes.js
const express = require("express");
const router = express.Router();
const ContentBlock = require("./ContentBlock");

// Yeni content block oluştur (normal veya simplified)
router.post("/", async (req, res) => {
  try {
    const block = await ContentBlock.create(req.body);
    res.status(201).json(block);
  } catch (err) {
    console.error("create content block error:", err);
    res.status(500).json({ message: "Error creating content block" });
  }
});

// (Opsiyonel) belli topic için tüm blokları listele
router.get("/", async (req, res) => {
  try {
    const { topic } = req.query;
    const filter = {};
    if (topic) filter.topic = topic;

    const blocks = await ContentBlock.find(filter).lean();
    res.json(blocks);
  } catch (err) {
    console.error("list content blocks error:", err);
    res.status(500).json({ message: "Error listing content blocks" });
  }
});

module.exports = router;
