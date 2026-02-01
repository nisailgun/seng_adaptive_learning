// server/src/content-service/services/adaptiveService.js
const ContentBlock = require("../models/ContentBlock");

// Yanlış cevap geldiğinde çağrılacak fonksiyon
async function requestSimplification(topic, languageCode = "en") {
  // Önce simplified içeriği bulmayı dene
  const simplified = await ContentBlock.findOne({
    topic,
    variant: "simplified",
    languageCode
  }).lean();

  if (simplified) {
    // Bu aslında "simplifiedContentBlock"
    return simplified;
  }

  // Simplified yoksa normal içeriğe düş
  const normal = await ContentBlock.findOne({
    topic,
    variant: "normal",
    languageCode
  }).lean();

  return normal;
}

module.exports = {
  requestSimplification
};
