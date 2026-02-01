const mongoose = require("mongoose");
const { makeKey, getCache, setCache } = require("./cache");
const Lesson = require("../models/Lesson");
const LessonTranslation = require("../models/LessonTranslation");
const MediaAsset = require("../models/MediaAsset");

// Yeni lesson + çeviri + media oluştur
async function createLesson(data) {
  const { translations, mediaAssets, ...lessonData } = data;

  try {
    const lesson = await Lesson.create(lessonData);

    // translations
    if (Array.isArray(translations)) {
      const trDocs = translations.map((t) => ({
        lesson: lesson._id,
        languageCode: t.languageCode,
        title: t.title,
        summary: t.summary,
        contentHtml: t.contentHtml
      }));
      await LessonTranslation.insertMany(trDocs);
    }

    // media
    if (Array.isArray(mediaAssets)) {
      const mediaDocs = mediaAssets.map((m) => ({
        lesson: lesson._id,
        mediaType: m.mediaType,
        url: m.url,
        caption: m.caption,
        languageCode: m.languageCode
      }));
      await MediaAsset.insertMany(mediaDocs);
    }

    return getLessonById(lesson._id);
  } catch (err) {
    console.error("Lesson create error:", err);
    throw err;
  }
}

// ID ile lesson (FULL – translations + media)
async function getLessonById(id) {
  const lesson = await Lesson.findById(id).lean();
  if (!lesson) return null;

  const translations = await LessonTranslation.find({ lesson: id }).lean();
  const mediaAssets = await MediaAsset.find({ lesson: id }).lean();

  return { ...lesson, translations, mediaAssets };
}

// ✅ CACHE'Lİ LESSON CONTENT (FR20 & NFR1)
async function getLessonContent(lessonId, languageCode = "en") {
  // (opsiyonel) güvenlik: invalid id gelirse null dön
  if (!mongoose.isValidObjectId(lessonId)) return null;

  const objectId = new mongoose.Types.ObjectId(lessonId);
  const cacheKey = makeKey(["lessonContent", lessonId, languageCode]);

  // 1️⃣ Cache kontrolü
  const cached = getCache(cacheKey);
  if (cached) return cached;

  // 2️⃣ DB
  const lesson = await Lesson.findById(objectId).lean();
  if (!lesson) return null;

  const translation =
    (await LessonTranslation.findOne({
      lesson: objectId,
      languageCode
    }).lean()) ||
    (await LessonTranslation.findOne({ lesson: objectId }).lean());

  const mediaAssets = await MediaAsset.find({
    lesson: objectId,
    languageCode
  }).lean();

  const result = {
    ...lesson,
    translation,
    mediaAssets
  };

  // 3️⃣ Cache yaz
  setCache(cacheKey, result);

  return result;
}

// Listeleme
async function listLessons(filter = {}) {
  const query = {};
  if (filter.topic) query.topic = filter.topic;
  if (filter.level) query.level = filter.level;
  if (filter.isActive !== undefined) query.isActive = filter.isActive;

  return Lesson.find(query).lean();
}

// ✅ Translation upsert
async function upsertLessonTranslation(lessonId, translation) {
  if (!mongoose.isValidObjectId(lessonId)) {
    throw new Error("Invalid lessonId");
  }

  const { languageCode, title, summary, contentHtml } = translation;
  if (!languageCode) throw new Error("languageCode is required");

  const doc = await LessonTranslation.findOneAndUpdate(
    { lesson: lessonId, languageCode },
    { $set: { title, summary, contentHtml } },
    { new: true, upsert: true }
  ).lean();

  // (opsiyonel) burada cache invalidate da yapabilirsin, ama şart değil
  return doc;
}

module.exports = {
  createLesson,
  getLessonById,
  getLessonContent,
  listLessons,
  upsertLessonTranslation
};
