const lessonService = require("../services/lessonService");
async function upsertTranslation(req, res) {
  try {
    const { id } = req.params; // lessonId
    const translation = req.body; // { languageCode, title, summary, contentHtml }
    const result = await lessonService.upsertLessonTranslation(id, translation);
    res.json(result);
  } catch (err) {
    console.error("upsertTranslation error:", err);
    res.status(500).json({ message: "Error upserting translation" });
  }
}

async function createLesson(req, res) {
  try {
    const lesson = await lessonService.createLesson(req.body);
    res.status(201).json(lesson);
  } catch (err) {
    console.error("createLesson error:", err);
    res.status(500).json({ message: "Error creating lesson" });
  }
}

async function getLesson(req, res) {
  try {
    const lesson = await lessonService.getLessonById(req.params.id);
    if (!lesson) {
      return res.status(404).json({ message: "Lesson not found" });
    }
    res.json(lesson);
  } catch (err) {
    console.error("getLesson error:", err);
    res.status(500).json({ message: "Error fetching lesson" });
  }
}

// ✅ NEW: Cache-first lesson content endpoint
async function getLessonContent(req, res) {
  try {
    const { lessonId } = req.params;
    const languageCode = req.query.languageCode || "en";

    const result = await lessonService.getLessonContent(lessonId, languageCode);

    if (!result) {
      return res.status(404).json({ message: "Lesson not found" });
    }

    res.status(200).json(result);
  } catch (err) {
    console.error("getLessonContent error:", err);
    res.status(500).json({ message: "Error fetching lesson content" });
  }
}

async function listLessons(req, res) {
  try {
    const { topic, level, isActive } = req.query;
    const filter = {
      topic,
      level,
      isActive: isActive !== undefined ? isActive === "true" : undefined
    };

    const lessons = await lessonService.listLessons(filter);
    res.json(lessons);
  } catch (err) {
    console.error("listLessons error:", err);
    res.status(500).json({ message: "Error listing lessons" });
  }
}


  module.exports = {
  createLesson,
  getLesson,
  listLessons,
  getLessonContent,
  upsertTranslation, 
};


