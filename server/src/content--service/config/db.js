// src/config/db.js
const mongoose = require("mongoose");

async function connectDB() {
  const uri = "mongodb://localhost:27017/content_service"; // kendi URI’nı yaz

  try {
    await mongoose.connect(uri);
    console.log("MongoDB connected");
  } catch (err) {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  }
}

module.exports = connectDB;

