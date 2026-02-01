import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:4000/api"
});

/* ================= AUTH ================= */

export const register = (username, password) =>
  API.post("/register", { username, password }).then((r) => r.data);

export const login = (username, password) =>
  API.post("/login", { username, password }).then((r) => r.data);

// Google OAuth Login
export const loginWithGoogle = (token) =>
  API.post("/auth/google", { token }).then((r) => r.data);

// Email Verification
export const verifyEmail = (token) =>
  API.post("/verify-email", { token }).then((r) => r.data);

/* ================= ASSESSMENT ================= */

export const getNextQuestion = (token, languageCode = "en") =>
  API.get("/next-question", {
    params: { languageCode },
    headers: { Authorization: `Bearer ${token}` }
  }).then((r) => r.data);

export const submit = (token, questionId, correct, userAnswer = '', isNLP = false) =>
  API.post(
    "/submit",
    { questionId, correct, userAnswer, isNLP },
    { headers: { Authorization: `Bearer ${token}` } }
  ).then((r) => r.data);

export const seed = () => API.get("/seed").then((r) => r.data);

/* ================= NLP EVALUATION ================= */

// Evaluate free-text response using NLP semantic analysis
export const evaluateResponse = (token, text, questionId = null) =>
  API.post(
    "/evaluate-response",
    { text, questionId },
    { headers: { Authorization: `Bearer ${token}` } }
  ).then((r) => r.data);

/* ================= LEARNING PATH ================= */

export const getLearningPath = (token, languageCode = "en") =>
  API.get("/learning-path", {
    params: { languageCode },
    headers: { Authorization: `Bearer ${token}` }
  }).then((r) => r.data);

export const getModule = (token, id, languageCode = "en") =>
  API.get(`/module/${id}`, {
    params: { languageCode, t: Date.now() },
    headers: { Authorization: `Bearer ${token}` }
  }).then((r) => r.data);

export const createModule = (data) => API.post("/module", data).then((r) => r.data);

/* ================= LESSONS (LOCALIZATION) ================= */

export const getLessonContent = (lessonId, languageCode = "en") =>
  API.get(`/lessons/${lessonId}/content`, {
    params: { languageCode }
  }).then((r) => r.data);

export const createLesson = (data) => API.post("/lessons", data).then((r) => r.data);

export const addLessonTranslation = (lessonId, translation) =>
  API.post(`/lessons/${lessonId}/translations`, translation).then((r) => r.data);

/* ================= PROGRESS (BACKGROUND SYNC) ================= */

// ✅ Called when internet is restored to sync offline progress
// POST /api/progress/sync
export const syncProgress = (token, progressPayload) =>
  API.post("/progress/sync", progressPayload, {
    headers: { Authorization: `Bearer ${token}` }
  }).then((r) => r.data);

/* ================= INITIAL PATH GENERATION ================= */

// Generate initial learning path for new users
export const generateInitialPath = (token, externalScores, targetSkills) =>
  API.post('/path/generate', { externalScores, targetSkills }, {
    headers: { Authorization: `Bearer ${token}` }
  }).then((r) => r.data);

// Check if user needs initial path generation
export const checkNeedsGeneration = (token) =>
  API.get('/path/needs-generation', {
    headers: { Authorization: `Bearer ${token}` }
  }).then((r) => r.data);

/* ================= SUPPORT TICKETS ================= */

// Create a support ticket
export const createSupportTicket = (token, subject, message, priority = 'medium') =>
  API.post('/support/tickets', { subject, message, priority }, {
    headers: { Authorization: `Bearer ${token}` }
  }).then((r) => r.data);

// Get user's support tickets
export const getSupportTickets = (token) =>
  API.get('/support/tickets', {
    headers: { Authorization: `Bearer ${token}` }
  }).then((r) => r.data);

/* ================= AI FEATURES ================= */

// Get AI explanation for a concept
export const getAIExplanation = (token, concept, level = 'intermediate') =>
  API.post('/ai/explain', { concept, level }, {
    headers: { Authorization: `Bearer ${token}` }
  }).then((r) => r.data);

// Generate AI practice question
export const generateAIQuestion = (token, topic, difficulty = 'intermediate', skillType = 'vocabulary') =>
  API.post('/ai/generate-question', { topic, difficulty, skillType }, {
    headers: { Authorization: `Bearer ${token}` }
  }).then((r) => r.data);

// Get AI learning progress analysis
export const getAIAnalysis = (token) =>
  API.get('/ai/analyze-progress', {
    headers: { Authorization: `Bearer ${token}` }
  }).then((r) => r.data);

// Generate conversation practice
export const generateConversation = (token, topic, level = 'intermediate') =>
  API.post('/ai/conversation', { topic, level }, {
    headers: { Authorization: `Bearer ${token}` }
  }).then((r) => r.data);

// Get AI writing correction
export const correctWriting = (token, text, focusArea = 'general') =>
  API.post('/ai/correct-writing', { text, focusArea }, {
    headers: { Authorization: `Bearer ${token}` }
  }).then((r) => r.data);
