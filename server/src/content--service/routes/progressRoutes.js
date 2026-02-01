const express = require("express");
const router = express.Router();

// POST /api/progress/sync
router.post("/sync", (req, res) => {
  console.log("✅ Synced progress:", req.body);
  res.json({ success: true });
});

module.exports = router;
