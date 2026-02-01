const mongoose = require("mongoose");

const LessonSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true },
    defaultLanguage: { type: String, default: "en" },
    topic: { type: String, required: true },
    level: { type: String, required: true }, // A1/B1/beginner...
    estimatedMinutes: { type: Number, default: 10 },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Lesson", LessonSchema);
