const mongoose = require("mongoose");

const MediaAssetSchema = new mongoose.Schema(
  {
    lesson: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lesson",
      required: true
    },
    mediaType: { type: String, required: true }, // "video", "pdf", "image"
    url: { type: String, required: true },
    caption: { type: String },
    languageCode: { type: String }
  },
  { timestamps: true }
);

module.exports = mongoose.model("MediaAsset", MediaAssetSchema);
