// src/models/LessonTranslation.js
const mongoose = require("mongoose");

const LessonTranslationSchema = new mongoose.Schema(
  {
    lesson: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lesson",
      required: true
    },
    languageCode: { type: String, required: true },
    title: { type: String, required: true },
    summary: { type: String },
    contentHtml: { type: String }
  },
  { timestamps: true }
);

module.exports = mongoose.model("LessonTranslation", LessonTranslationSchema);
