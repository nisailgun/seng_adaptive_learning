// server/src/content-service/models/ContentBlock.js
const mongoose = require("mongoose");

const ContentBlockSchema = new mongoose.Schema(
  {
    topic: { type: String, required: true }, // örn: "basic_greetings"
    variant: {
      type: String,
      enum: ["normal", "simplified"],
      default: "normal"
    },
    languageCode: { type: String, default: "en" },
    title: { type: String, required: true },
    html: { type: String, required: true } // içeriğin kendisi (HTML/markdown)
  },
  { timestamps: true }
);

module.exports = mongoose.model("ContentBlock", ContentBlockSchema);
