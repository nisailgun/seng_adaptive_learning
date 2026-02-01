import express from 'express';
import cors from 'cors';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Setup path for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables - look in parent directory (server root)
dotenv.config({ path: path.join(__dirname, '..', '.env') });

import { connectMongo } from './db/mongo.js';
import ModuleModel from './models/module.js';
import UserModel from './models/user.js';
import QuestionModel from './models/question.js';
import ResponseModel from './models/response.js';
import TrainingDataModel from './models/trainingData.js';
import * as analyticsService from './services/analyticsService.js';
import * as notificationService from './services/notificationService.js';
import * as pathGenerationService from './services/pathGenerationService.js';
import * as dataCollectionService from './services/dataCollectionService.js';
import aiService from './services/aiService.js';
import * as assessmentService from './services/assessmentService.js';
import userService from './services/userService.js';
import * as auditService from './services/auditService.js';
import gdprService from './services/gdprService.js';
import reportExportService from './services/reportExportService.js';
import gamificationService from './services/gamificationService.js';
import schedulingService from './services/schedulingService.js';
import monitoringService from './services/monitoringService.js';


const app = express();
// const prisma = new PrismaClient();
const MONGODB_URI = process.env.MONGODB_URI || '';
const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret';

// Helper to safely verify JWT and extract userId
function verifyJWT(token, secret = JWT_SECRET) {
  try {
    return jwt.verify(token, secret);
  } catch (err) {
    return null;
  }
}

// connect to MongoDB (non-blocking)
connectMongo(MONGODB_URI).then(async ()=>{
  console.log('✓ Connected to MongoDB');
  console.log('✓ Use "npm run seed" to populate the database with content');
}).catch(err => {
  console.warn('MongoDB not connected:', err.message);
});

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

// Apply monitoring middleware to track all requests (NFR1-3)
app.use(monitoringService.requestTracker());

// Register
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await UserModel.create({ username, password });
    
    // Log registration
    await auditService.logAction(
      'REGISTER',
      username,
      'New user registration',
      req.ip,
      'SUCCESS',
      user._id
    );
    
    res.json({ id: user._id, username: user.username });
  } catch (e) {
    // Log failed registration
    await auditService.logAction(
      'REGISTER',
      username || 'unknown',
      `Registration failed: ${e.message}`,
      req.ip,
      'FAILURE'
    );
    
    res.status(400).json({ error: 'User exists' });
  }
});

// Login
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await UserModel.findOne({ username });
  if (user && await bcrypt.compare(password, user.password)) {
    const token = jwt.sign({ userId: user._id.toString() }, JWT_SECRET);
    
    // Log successful login
    await auditService.logAction(
      'LOGIN',
      username,
      'User logged in',
      req.ip,
      'SUCCESS',
      user._id
    );
    
    res.json({ 
      token, 
      user: { 
        id: user._id.toString(), 
        username, 
        theta: user.theta,
        role: user.role || 'student',
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName
      } 
    });
  } else {
    // Log failed login
    await auditService.logAction(
      'LOGIN',
      username || 'unknown',
      'Invalid credentials',
      req.ip,
      'FAILURE'
    );
    
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// ===== OAUTH ENDPOINTS =====

// OAuth Login (Google)
app.post('/api/auth/google', async (req, res) => {
  const { token } = req.body;
  
  if (!token) {
    return res.status(400).json({ error: 'OAuth token is required' });
  }

  try {
    const result = await userService.loginWithOAuth(token, 'google');
    
    if (result.success) {
      res.json({
        success: true,
        token: result.token,
        user: result.user
      });
    } else {
      res.status(401).json({ error: result.message });
    }
  } catch (error) {
    console.error('OAuth login error:', error);
    res.status(500).json({ error: 'OAuth login failed' });
  }
});

// Email Verification
app.post('/api/verify-email', async (req, res) => {
  const { token } = req.body;
  
  if (!token) {
    return res.status(400).json({ error: 'Verification token is required' });
  }

  try {
    const result = await userService.activateAccount(token);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Verification failed' });
  }
});

// Get next adaptive question
app.get('/api/next-question', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    const { userId } = jwt.verify(token, JWT_SECRET) || {};
    const user = await UserModel.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const questions = await QuestionModel.find().lean();
    const responses = await ResponseModel.find({ user: userId }).lean();

    const now = new Date();
    const dueQuestions = questions.filter(q => {
      const resp = responses.find(r => r.question && r.question.toString() === q._id.toString());
      return !resp || new Date(resp.nextReview) <= now;
    });

    if (dueQuestions.length === 0) {
      return res.json({ message: "All caught up! Take a break" });
    }

    // Simple IRT: pick question with difficulty closest to user's theta
    const best = dueQuestions.reduce((best, q) => {
      const diff = Math.abs((q.difficulty || 0) - user.theta);
      const bestDiff = Math.abs((best.difficulty || 0) - user.theta);
      return diff < bestDiff ? q : best;
    });

    res.json(best);
  } catch (e) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Submit answer (supports both objective and NLP-based free-text responses)
app.post('/api/submit', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const { questionId, correct, userAnswer, isNLP } = req.body;

  try {
    const { userId } = jwt.verify(token, JWT_SECRET) || {};
    const question = await QuestionModel.findById(questionId);
    if (!question) return res.status(404).json({ error: 'Question not found' });

    const user = await UserModel.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    let finalCorrect = correct;
    let nlpEvaluation = null;
    let aiFeedback = null;

    // Handle NLP/semantic evaluation for free-text responses
    if (isNLP && userAnswer) {
      const evaluation = assessmentService.GradingService.evaluateResponse(userAnswer, {
        submissionId: `${userId}-${questionId}-${Date.now()}`,
        promptId: questionId,
        studentId: userId
      });
      
      nlpEvaluation = evaluation;
      // Consider response correct if grade >= 70 and not flagged for manual review
      finalCorrect = evaluation.status === 'graded' && evaluation.grade >= 70;
      aiFeedback = evaluation.feedback;
    }

    // Spaced repetition interval
    let interval = 1;
    const last = await ResponseModel.findOne({ user: userId, question: questionId }).sort({ timestamp: -1 });
    if (last && last.correct) {
      const daysSince = (Date.now() - new Date(last.timestamp).getTime()) / 86400000;
      interval = Math.max(1, daysSince * 2);
    }

    const nextReview = new Date(Date.now() + interval * 24 * 60 * 60 * 1000);
    await ResponseModel.create({ 
      user: userId, 
      question: questionId, 
      correct: finalCorrect, 
      nextReview,
      userAnswer: userAnswer || '',
      nlpGrade: nlpEvaluation?.grade,
      nlpConfidence: nlpEvaluation?.confidence
    });

    // Update user ability (simple Elo-like)
    const k = 0.5;
    const expected = 1 / (1 + Math.exp(-((user.theta || 0) - (question.difficulty || 0))));
    const newTheta = (user.theta || 0) + k * ((finalCorrect ? 1 : 0) - expected);

    user.theta = newTheta;
    await user.save();

    // Check for new badges (FR3: Gamification)
    let newBadges = [];
    try {
      newBadges = await gamificationService.checkAndAwardBadges(userId);
    } catch (badgeError) {
      console.error('Badge check failed:', badgeError);
    }

    // Generate AI feedback if enabled and not already provided by NLP
    if (!aiFeedback && process.env.GEMINI_API_KEY && process.env.ENABLE_AI_FEEDBACK === 'true') {
      try {
        aiFeedback = await aiService.generateFeedback(
          question.text,
          userAnswer || '',
          question.answer,
          finalCorrect
        );
      } catch (err) {
        console.error('AI feedback generation failed:', err);
      }
    }

    res.json({ 
      newTheta, 
      correct: finalCorrect, 
      nextReview, 
      aiFeedback,
      nlpEvaluation,
      newBadges // Include newly earned badges in response
    });
  } catch (e) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Evaluate speech response (FR23: Voice Input for Speaking Module)
app.post('/api/evaluate-speech', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const { questionId, transcript } = req.body;

  if (!token) return res.status(401).json({ error: 'No token' });
  if (!transcript || transcript.trim().length === 0) {
    return res.status(400).json({ error: 'No speech transcript provided' });
  }

  try {
    const { userId } = jwt.verify(token, JWT_SECRET) || {};
    const question = await QuestionModel.findById(questionId);
    if (!question) return res.status(404).json({ error: 'Question not found' });

    const user = await UserModel.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Analyze speech using NLP service
    const speechEvaluation = assessmentService.NLPService.analyzeSpeech(transcript);
    
    // Consider speech response correct if grade >= 60 (more lenient than text)
    const finalCorrect = speechEvaluation.grade >= 60;
    
    // Calculate spaced repetition interval
    let interval = 1;
    const last = await ResponseModel.findOne({ user: userId, question: questionId }).sort({ timestamp: -1 });
    if (last && last.correct) {
      const daysSince = (Date.now() - new Date(last.timestamp).getTime()) / 86400000;
      interval = Math.max(1, daysSince * 2);
    }

    const nextReview = new Date(Date.now() + interval * 24 * 60 * 60 * 1000);
    
    // Store response with speech-specific data
    await ResponseModel.create({ 
      user: userId, 
      question: questionId, 
      correct: finalCorrect, 
      nextReview,
      userAnswer: transcript,
      nlpGrade: speechEvaluation.grade,
      nlpConfidence: speechEvaluation.confidence,
      isSpeech: true,
      speechMetrics: {
        fluency: speechEvaluation.fluency,
        vocabulary: speechEvaluation.vocabulary,
        coherence: speechEvaluation.coherence,
        wordCount: speechEvaluation.wordCount,
        sentenceCount: speechEvaluation.sentenceCount
      }
    });

    // Update user ability (simple Elo-like)
    const k = 0.5;
    const expected = 1 / (1 + Math.exp(-((user.theta || 0) - (question.difficulty || 0))));
    const newTheta = (user.theta || 0) + k * ((finalCorrect ? 1 : 0) - expected);

    user.theta = newTheta;
    await user.save();

    // Check for new badges (FR3: Gamification)
    let newBadges = [];
    try {
      newBadges = await gamificationService.checkAndAwardBadges(userId);
    } catch (badgeError) {
      console.error('Badge check failed:', badgeError);
    }

    res.json({ 
      newTheta, 
      correct: finalCorrect, 
      nextReview,
      speechEvaluation,
      feedback: speechEvaluation.feedback,
      newBadges // Include newly earned badges
    });
  } catch (e) {
    console.error('Speech evaluation error:', e);
    res.status(500).json({ error: 'Speech evaluation failed', details: e.message });
  }
});

// Map theta to approximate level
function thetaToLevel(theta) {
  if (theta < -1) return 0;
  if (theta < 0) return 1;
  if (theta < 1) return 2;
  if (theta < 2) return 3;
  return 4;
}

// Return personalized learning path (list of modules prioritized)
app.get('/api/learning-path', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    const { userId } = jwt.verify(token, JWT_SECRET) || {};
    const user = await UserModel.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // load modules from Mongo
    const modules = await ModuleModel.find().lean();
    const targetLevel = thetaToLevel(user.theta);
    
    // Filter modules within 1 level of user's current level
    const filtered = modules.filter(m => Math.abs(m.level - targetLevel) <= 1);
    
    // Sort by closeness to target level
    filtered.sort((a, b) => Math.abs(a.level - targetLevel) - Math.abs(b.level - targetLevel));
    
    // Map _id to id for frontend compatibility
    const modulesWithId = filtered.map(m => ({
      ...m,
      id: m._id.toString()
    }));
    
    res.json({ modules: modulesWithId, suggestedLevel: targetLevel, theta: user.theta });
  } catch (e) {
    console.error('Error in /api/learning-path:', e);
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Get module details (items with question content)
app.get('/api/module/:id', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  // Token verification is optional for module retrieval
  if (token) {
    const decoded = verifyJWT(token);
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid token' });
    }
  }
  
  // Prevent caching to ensure fresh data is always returned
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  
  try {
    const id = req.params.id;
    const module = await ModuleModel.findById(id).lean();
    if (!module) return res.status(404).json({ error: 'Module not found' });

    console.log(`📦 Loading module: ${module.title}`);
    console.log(`   Items in DB: ${module.items?.length || 0}`);
    console.log(`   Exercises in DB: ${module.exercises?.length || 0}`);

    // Handle both old format (items with questionId) and new format (exercises array)
    let items = [];
    
    if (module.exercises && module.exercises.length > 0) {
      // New format: exercises array contains question IDs directly
      console.log('   Using exercises format');
      items = await Promise.all(module.exercises.map(async (exerciseId) => {
        const q = await QuestionModel.findById(exerciseId).lean();
        return {
          id: exerciseId,
          title: q?.text?.substring(0, 50) + '...' || 'Question',
          type: q?.type || 'objective',
          difficulty: q?.difficulty || 0,
          question: q
        };
      }));
    } else if (module.items && module.items.length > 0) {
      // Old format: items with questionId field
      console.log('   Using items format');
      items = await Promise.all(module.items.map(async (it, index) => {
        console.log(`   Loading item ${index + 1}, questionId: ${it.questionId}`);
        const q = it.questionId ? await QuestionModel.findById(it.questionId).lean() : null;
        console.log(`   Question found: ${q ? 'YES' : 'NO'}`);
        if (q && index === 0) {
          console.log(`   FIRST QUESTION DETAILS:`);
          console.log(`     Text: ${q.text?.substring(0, 50)}`);
          console.log(`     AudioUrl: ${q.audioUrl ? 'YES - ' + q.audioUrl : 'NO'}`);
          console.log(`     Type: ${q.type}`);
          console.log(`     Skill: ${q.skill}`);
        }
        return { 
          ...it, 
          id: it._id || it.questionId || `item-${index}`,
          question: q 
        };
      }));
    }

    console.log(`   ✅ Loaded ${items.length} items with questions`);
    module.items = items;
    res.json(module);
  } catch (e) {
    console.error('Error in /api/module/:id:', e);
    res.status(500).json({ error: 'Failed to load module', details: e.message });
  }
});

// ===== ANALYTICS ENDPOINTS =====
app.get('/api/analytics/user/:userId', async (req, res) => {
  try {
    const metrics = await analyticsService.getUserMetrics(req.params.userId);
    res.json(metrics);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/analytics/class/:classId', async (req, res) => {
  try {
    const metrics = await analyticsService.getClassMetrics(req.params.classId);
    res.json(metrics);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/analytics/progress/:userId', async (req, res) => {
  try {
    const report = await analyticsService.getProgressReport(req.params.userId);
    res.json(report);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ===== NOTIFICATION ENDPOINTS (FR17 & UC16) =====
// Legacy endpoints (kept for backward compatibility)
app.get('/api/notifications/:userId', (req, res) => {
  try {
    const unread = notificationService.getUnreadNotifications(req.params.userId);
    res.json({ unread });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/notifications/:userId/all', (req, res) => {
  try {
    const all = notificationService.getAllNotifications(req.params.userId);
    res.json({ notifications: all });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/notifications/:userId/mark-read/:notificationId', (req, res) => {
  try {
    const success = notificationService.markAsRead(req.params.userId, parseInt(req.params.notificationId));
    res.json({ success });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// New token-based notification endpoints
app.get('/api/notifications/unread', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  try {
    const { userId } = jwt.verify(token, JWT_SECRET);
    const unread = notificationService.getUnreadNotifications(userId);
    res.json({ count: unread.length, notifications: unread });
  } catch (e) {
    res.status(401).json({ error: 'Unauthorized' });
  }
});

app.get('/api/notifications/all', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  try {
    const { userId } = jwt.verify(token, JWT_SECRET);
    const all = notificationService.getAllNotifications(userId);
    res.json({ notifications: all });
  } catch (e) {
    res.status(401).json({ error: 'Unauthorized' });
  }
});

app.post('/api/notifications/:notificationId/read', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const { notificationId } = req.params;
  
  try {
    const { userId } = jwt.verify(token, JWT_SECRET);
    const success = notificationService.markAsRead(userId, parseInt(notificationId));
    res.json({ success });
  } catch (e) {
    res.status(401).json({ error: 'Unauthorized' });
  }
});

app.post('/api/notifications/mark-all-read', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  try {
    const { userId } = jwt.verify(token, JWT_SECRET);
    const count = notificationService.markAllAsRead(userId);
    res.json({ success: true, markedCount: count });
  } catch (e) {
    res.status(401).json({ error: 'Unauthorized' });
  }
});

// UC16: Notification preferences
app.get('/api/notifications/preferences', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  try {
    const { userId } = jwt.verify(token, JWT_SECRET);
    const prefs = notificationService.getUserPreferences(userId);
    res.json(prefs);
  } catch (e) {
    res.status(401).json({ error: 'Unauthorized' });
  }
});

app.post('/api/notifications/preferences', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const { emailEnabled, pushEnabled, inAppEnabled } = req.body;
  
  try {
    const { userId } = jwt.verify(token, JWT_SECRET);
    const updated = notificationService.updateUserPreferences(userId, {
      emailEnabled,
      pushEnabled,
      inAppEnabled
    });
    res.json({ success: true, preferences: updated });
  } catch (e) {
    res.status(401).json({ error: 'Unauthorized' });
  }
});

// ===== SUPPORT SYSTEM (FR23) =====
if (!global.supportTickets) global.supportTickets = [];

// Destek talebi oluştur
// UC18 & FR23: Support Ticket Endpoint Güncellemesi
app.post('/api/support/tickets', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  try {
    const { userId } = jwt.verify(token, JWT_SECRET);
    const user = await UserModel.findById(userId);
    const { subject, message, priority } = req.body;
    
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    const ticket = {
      id: "TICK-" + Date.now(),
      userId,
      subject,
      message,
      status: 'open',
      priority: priority || 'normal', // Varsayılan değer eklendi
      createdAt: new Date()
    };

    global.supportTickets.push(ticket);
    console.log(`[Support] 🎫 New ticket created: #${ticket.id} by ${user.username}`);
    
    // Send confirmation notification (UC20 & FR23)
    notificationService.sendSupportConfirmation(userId, ticket.id);
    
    res.json({ 
      success: true, 
      ticket: { id: ticket.id, status: ticket.status },
      message: 'Your support request has been received. We will get back to you shortly.'
    });
  } catch (e) {
    res.status(401).json({ error: 'Unauthorized' });
  }
});

app.get('/api/support/tickets', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  try {
    const { userId } = jwt.verify(token, JWT_SECRET);
    
    const userTickets = global.supportTickets
      .filter(t => t.userId === userId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    res.json({ tickets: userTickets });
  } catch (e) {
    res.status(401).json({ error: 'Unauthorized' });
  }
});

// Get user profile
app.get('/api/profile', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    const { userId } = jwt.verify(token, JWT_SECRET) || {};
    const user = await UserModel.findById(userId).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Update user profile
app.put('/api/profile', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    const { userId } = jwt.verify(token, JWT_SECRET) || {};
    const { email, firstName, lastName } = req.body;
    
    const user = await UserModel.findByIdAndUpdate(
      userId, 
      { email, firstName, lastName },
      { new: true, select: '-password' }
    );
    
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ===== GDPR DATA PRIVACY ENDPOINTS (FR19) =====

// Export user data (GDPR Right to Data Portability)
app.get('/api/gdpr/export', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    const { userId } = jwt.verify(token, JWT_SECRET);
    const dataExport = await gdprService.exportUserData(userId);
    
    // Log data export request
    await auditService.logAction(
      'DATA_EXPORT',
      dataExport.user.username,
      'User requested data export (GDPR)',
      req.ip,
      'SUCCESS',
      userId
    );
    
    res.json({
      success: true,
      data: dataExport
    });
  } catch (e) {
    console.error('Data export error:', e);
    res.status(500).json({ error: 'Failed to export data', details: e.message });
  }
});

// Delete user account and all data (GDPR Right to Erasure)
app.delete('/api/gdpr/delete-account', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    const { userId } = jwt.verify(token, JWT_SECRET);
    const { password, reason } = req.body;
    
    // Verify password before deletion
    const user = await UserModel.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid password' });
    }
    
    // Log deletion request before deleting
    await auditService.logAction(
      'ACCOUNT_DELETION_REQUEST',
      user.username,
      `User requested account deletion: ${reason || 'No reason provided'}`,
      req.ip,
      'SUCCESS',
      userId
    );
    
    const deletionSummary = await gdprService.deleteUserData(userId, reason);
    
    res.json({
      success: true,
      message: 'Account and all associated data have been permanently deleted',
      summary: deletionSummary
    });
  } catch (e) {
    console.error('Account deletion error:', e);
    res.status(500).json({ error: 'Failed to delete account', details: e.message });
  }
});

// Get consent status
app.get('/api/gdpr/consent', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    const { userId } = jwt.verify(token, JWT_SECRET);
    const consentStatus = await gdprService.getConsentStatus(userId);
    res.json(consentStatus);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Update consent preferences
app.put('/api/gdpr/consent', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    const { userId } = jwt.verify(token, JWT_SECRET);
    const consents = req.body;
    
    const updated = await gdprService.updateConsent(userId, consents);
    
    // Log consent update
    await auditService.logAction(
      'CONSENT_UPDATE',
      (await UserModel.findById(userId)).username,
      `User updated consent preferences`,
      req.ip,
      'SUCCESS',
      userId
    );
    
    res.json(updated);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Admin: Get user data (for support/compliance)
app.get('/api/admin/user-data/:userId', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    const { userId: adminId } = jwt.verify(token, JWT_SECRET);
    const admin = await UserModel.findById(adminId);
    
    if (!admin || admin.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const targetUserId = req.params.userId;
    const dataExport = await gdprService.exportUserData(targetUserId);
    
    // Log admin data access
    await auditService.logAction(
      'ADMIN_DATA_ACCESS',
      admin.username,
      `Admin accessed user data for: ${dataExport.user.username}`,
      req.ip,
      'SUCCESS',
      adminId
    );
    
    res.json(dataExport);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ===== END GDPR ENDPOINTS =====

// Admin: Get all users
app.get('/api/admin/users', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    const { userId } = jwt.verify(token, JWT_SECRET) || {};
    const admin = await UserModel.findById(userId);
    if (!admin || admin.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const users = await UserModel.find().select('-password').lean();
    res.json(users);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ===== REPORT EXPORT ENDPOINTS (FR13) =====

// Export student progress report as CSV
app.get('/api/reports/student/:userId/csv', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    const { userId: requesterId } = jwt.verify(token, JWT_SECRET);
    const requester = await UserModel.findById(requesterId);
    
    // Students can export their own data, teachers/admins can export any student's data
    if (requesterId !== req.params.userId && !['teacher', 'admin'].includes(requester?.role)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const reportData = await reportExportService.generateStudentReport(req.params.userId);
    const csv = reportExportService.toCSV(reportData, 'student');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="student-report-${req.params.userId}.csv"`);
    res.send(csv);
  } catch (e) {
    res.status(500).json({ error: 'Failed to generate report', details: e.message });
  }
});

// Export class report as CSV (teachers/admins only)
app.post('/api/reports/class/csv', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    const { userId } = jwt.verify(token, JWT_SECRET);
    const requester = await UserModel.findById(userId);
    
    if (!['teacher', 'admin'].includes(requester?.role)) {
      return res.status(403).json({ error: 'Teacher or admin access required' });
    }

    const { studentIds } = req.body;
    if (!studentIds || !Array.isArray(studentIds)) {
      return res.status(400).json({ error: 'studentIds array required' });
    }

    const reportData = await reportExportService.generateClassReport(studentIds);
    const csv = reportExportService.toCSV(reportData, 'class');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="class-report-${Date.now()}.csv"`);
    res.send(csv);
  } catch (e) {
    res.status(500).json({ error: 'Failed to generate class report', details: e.message });
  }
});

// Get student report data as JSON (for display in UI)
app.get('/api/reports/student/:userId', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    const { userId: requesterId } = jwt.verify(token, JWT_SECRET);
    const requester = await UserModel.findById(requesterId);
    
    if (requesterId !== req.params.userId && !['teacher', 'admin'].includes(requester?.role)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const reportData = await reportExportService.generateStudentReport(req.params.userId);
    res.json(reportData);
  } catch (e) {
    res.status(500).json({ error: 'Failed to generate report', details: e.message });
  }
});

// ===== END REPORT EXPORT ENDPOINTS =====

// ===== GAMIFICATION ENDPOINTS (FR3: Achievement Badges/Points) =====

// Get user's badges and points
app.get('/api/gamification/user/:userId', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    const { userId: requesterId } = jwt.verify(token, JWT_SECRET);
    
    // Users can view their own data, teachers/admins can view any user's data
    if (requesterId !== req.params.userId) {
      const requester = await UserModel.findById(requesterId);
      if (!['teacher', 'admin'].includes(requester?.role)) {
        return res.status(403).json({ error: 'Unauthorized' });
      }
    }

    const gamificationData = await gamificationService.getUserGamification(req.params.userId);
    res.json(gamificationData);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get leaderboard
app.get('/api/gamification/leaderboard', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    jwt.verify(token, JWT_SECRET);
    const limit = parseInt(req.query.limit) || 10;
    const leaderboard = await gamificationService.getLeaderboard(limit);
    res.json(leaderboard);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Initialize default badges (admin only)
app.post('/api/gamification/init-badges', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    const { userId } = jwt.verify(token, JWT_SECRET);
    const admin = await UserModel.findById(userId);
    
    if (!admin || admin.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    await gamificationService.initializeDefaultBadges();
    res.json({ success: true, message: 'Default badges initialized' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Check and award badges (called after user actions)
app.post('/api/gamification/check-badges/:userId', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    const { userId: requesterId } = jwt.verify(token, JWT_SECRET);
    
    // Only the user themselves can trigger badge checks
    if (requesterId !== req.params.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const newBadges = await gamificationService.checkAndAwardBadges(req.params.userId);
    
    if (newBadges.length > 0) {
      res.json({
        success: true,
        newBadges,
        message: `Congratulations! You earned ${newBadges.length} new badge(s)!`
      });
    } else {
      res.json({
        success: true,
        newBadges: [],
        message: 'No new badges earned'
      });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ===== END GAMIFICATION ENDPOINTS =====

// ===== SCHEDULING ENDPOINTS (FR12: Schedule Lessons, Assignments, and Deadlines) =====

// Create assignment (teachers only)
app.post('/api/assignments', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    const { userId } = jwt.verify(token, JWT_SECRET);
    const teacher = await UserModel.findById(userId);
    
    if (!['teacher', 'admin'].includes(teacher?.role)) {
      return res.status(403).json({ error: 'Teacher access required' });
    }

    const assignment = await schedulingService.createAssignment(userId, req.body);
    res.json(assignment);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get assignments (filtered by role)
app.get('/api/assignments', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    const { userId } = jwt.verify(token, JWT_SECRET);
    const user = await UserModel.findById(userId);

    let assignments;
    if (['teacher', 'admin'].includes(user.role)) {
      assignments = await schedulingService.getTeacherAssignments(userId, req.query);
    } else {
      assignments = await schedulingService.getStudentAssignments(userId, req.query);
    }

    res.json(assignments);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Publish assignment
app.post('/api/assignments/:assignmentId/publish', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    const { userId } = jwt.verify(token, JWT_SECRET);
    const teacher = await UserModel.findById(userId);
    
    if (!['teacher', 'admin'].includes(teacher?.role)) {
      return res.status(403).json({ error: 'Teacher access required' });
    }

    const assignment = await schedulingService.publishAssignment(req.params.assignmentId, userId);
    res.json(assignment);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Submit assignment (students)
app.post('/api/assignments/:assignmentId/submit', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    const { userId } = jwt.verify(token, JWT_SECRET);
    const { score } = req.body;

    const assignment = await schedulingService.submitAssignment(
      req.params.assignmentId,
      userId,
      score
    );

    res.json({ success: true, assignment });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Update assignment
app.put('/api/assignments/:assignmentId', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    const { userId } = jwt.verify(token, JWT_SECRET);
    const teacher = await UserModel.findById(userId);
    
    if (!['teacher', 'admin'].includes(teacher?.role)) {
      return res.status(403).json({ error: 'Teacher access required' });
    }

    const assignment = await schedulingService.updateAssignment(
      req.params.assignmentId,
      userId,
      req.body
    );

    res.json(assignment);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Delete assignment
app.delete('/api/assignments/:assignmentId', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    const { userId } = jwt.verify(token, JWT_SECRET);
    const teacher = await UserModel.findById(userId);
    
    if (!['teacher', 'admin'].includes(teacher?.role)) {
      return res.status(403).json({ error: 'Teacher access required' });
    }

    const success = await schedulingService.deleteAssignment(req.params.assignmentId, userId);
    
    if (success) {
      res.json({ success: true, message: 'Assignment deleted' });
    } else {
      res.status(404).json({ error: 'Assignment not found' });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get calendar view
app.get('/api/calendar', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    const { userId } = jwt.verify(token, JWT_SECRET);
    const user = await UserModel.findById(userId);

    const { startDate, endDate } = req.query;

    const events = await schedulingService.getCalendar(
      userId,
      user.role,
      startDate,
      endDate
    );

    res.json(events);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ===== END SCHEDULING ENDPOINTS =====

// ===== MONITORING ENDPOINTS (NFR1-3: Performance Monitoring, Uptime Tracking, Health Checks) =====

// Public health check endpoint (no authentication required)
app.get('/health', async (req, res) => {
  try {
    const mongoose = await import('mongoose');
    const health = await monitoringService.performHealthCheck({ mongoose });
    
    const statusCode = health.status === 'healthy' ? 200 : 
                       health.status === 'degraded' ? 200 : 503;
    
    res.status(statusCode).json(health);
  } catch (error) {
    res.status(503).json({
      status: 'error',
      error: error.message,
      timestamp: Date.now()
    });
  }
});

// Performance metrics (admin only)
app.get('/api/monitoring/metrics', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    const { userId } = jwt.verify(token, JWT_SECRET);
    const user = await UserModel.findById(userId);
    
    if (user?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const metrics = monitoringService.getPerformanceMetrics();
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint-specific metrics (admin only)
app.get('/api/monitoring/endpoints', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    const { userId } = jwt.verify(token, JWT_SECRET);
    const user = await UserModel.findById(userId);
    
    if (user?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const endpoints = monitoringService.getEndpointMetrics();
    res.json(endpoints);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Complete monitoring dashboard data (admin only)
app.get('/api/monitoring/dashboard', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    const { userId } = jwt.verify(token, JWT_SECRET);
    const user = await UserModel.findById(userId);
    
    if (user?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const mongoose = await import('mongoose');
    
    // Perform fresh health check
    await monitoringService.performHealthCheck({ mongoose });
    
    // Get all monitoring data
    const data = monitoringService.getMonitoringData({ mongoose });
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== END MONITORING ENDPOINTS =====

// Admin: Update user role
app.put('/api/admin/users/:userId/role', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    const { userId } = jwt.verify(token, JWT_SECRET) || {};
    const admin = await UserModel.findById(userId);
    if (!admin || admin.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { role } = req.body;
    if (!['student', 'teacher', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const user = await UserModel.findByIdAndUpdate(
      req.params.userId,
      { role },
      { new: true, select: '-password' }
    );

    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Teacher: Get all students
app.get('/api/teacher/students', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    const { userId } = jwt.verify(token, JWT_SECRET) || {};
    const teacher = await UserModel.findById(userId);
    if (!teacher || !['teacher', 'admin'].includes(teacher.role)) {
      return res.status(403).json({ error: 'Teacher access required' });
    }

    const students = await UserModel.find({ role: 'student' }).select('-password').lean();
    
    // Get progress for each student
    const studentsWithProgress = await Promise.all(students.map(async (student) => {
      const responses = await ResponseModel.find({ user: student._id }).lean();
      const totalQuestions = responses.length;
      const correctAnswers = responses.filter(r => r.correct).length;
      const accuracy = totalQuestions > 0 ? (correctAnswers / totalQuestions * 100).toFixed(1) : 0;
      
      return {
        ...student,
        stats: {
          totalQuestions,
          correctAnswers,
          accuracy: parseFloat(accuracy)
        }
      };
    }));

    res.json(studentsWithProgress);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Create a new module (admin/content-author)
app.post('/api/module', async (req, res) => {
  try {
    // in a production system we'd check RBAC and roles; for now accept and create
    const data = req.body;
    const created = await ModuleModel.create(data);
    res.json(created);
  } catch (e) {
    res.status(500).json({ error: 'Failed to create module', details: e.message });
  }
});

// ===== PATH GENERATION ENDPOINTS =====

// Generate initial learning path for user
app.post('/api/path/generate', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET) || {};
    const userId = decoded.userId;
    
    if (!userId) {
      console.error('No userId in token. Decoded:', decoded);
      return res.status(401).json({ error: 'Invalid token: no userId' });
    }

    const { externalScores, targetSkills } = req.body;

    const path = await pathGenerationService.generateInitialPath(userId, {
      externalScores,
      targetSkills,
      includeOnboarding: true
    });

    res.json(path);
  } catch (e) {
    console.error('Path generation error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Check if user needs initial path
app.get('/api/path/needs-generation', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    const { userId } = jwt.verify(token, JWT_SECRET) || {};
    const needs = await pathGenerationService.needsInitialPath(userId);
    res.json({ needsGeneration: needs });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Regenerate path based on performance
app.post('/api/path/regenerate', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    const { userId } = jwt.verify(token, JWT_SECRET) || {};
    const path = await pathGenerationService.regeneratePath(userId);
    res.json(path);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ===== DATA COLLECTION ENDPOINTS (UC18: Training Data Collection) =====

// Record any interaction for training data
app.post('/api/training-data/record', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    const { userId } = jwt.verify(token, JWT_SECRET) || {};
    const interactionData = { ...req.body, userId };
    
    const result = await dataCollectionService.recordInteraction(interactionData);
    res.json(result);
  } catch (e) {
    console.error('Error recording interaction:', e);
    res.status(500).json({ error: e.message });
  }
});

// Record quiz answer specifically
app.post('/api/training-data/quiz-answer', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    const { userId } = jwt.verify(token, JWT_SECRET) || {};
    const { questionId, answerCorrect, responseTime, additionalData } = req.body;
    
    const result = await dataCollectionService.recordQuizAnswer(
      userId, 
      questionId, 
      answerCorrect, 
      responseTime, 
      additionalData
    );
    res.json(result);
  } catch (e) {
    console.error('Error recording quiz answer:', e);
    res.status(500).json({ error: e.message });
  }
});

// Record click interaction
app.post('/api/training-data/click', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    const { userId } = jwt.verify(token, JWT_SECRET) || {};
    const { elementClicked, pageUrl, timeSpent } = req.body;
    
    const result = await dataCollectionService.recordClick(userId, elementClicked, pageUrl, timeSpent);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Record page view
app.post('/api/training-data/page-view', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    const { userId } = jwt.verify(token, JWT_SECRET) || {};
    const { pageUrl, previousPage, timeSpent } = req.body;
    
    const result = await dataCollectionService.recordPageView(userId, pageUrl, previousPage, timeSpent);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Record module start
app.post('/api/training-data/module-start', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    const { userId } = jwt.verify(token, JWT_SECRET) || {};
    const { moduleId, moduleLevel, moduleSkill } = req.body;
    
    const result = await dataCollectionService.recordModuleStart(userId, moduleId, moduleLevel, moduleSkill);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Record module completion
app.post('/api/training-data/module-complete', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    const { userId } = jwt.verify(token, JWT_SECRET) || {};
    const { moduleId, moduleLevel, moduleSkill, timeSpent } = req.body;
    
    const result = await dataCollectionService.recordModuleComplete(userId, moduleId, moduleLevel, moduleSkill, timeSpent);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Record session (start/end)
app.post('/api/training-data/session', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    const { userId } = jwt.verify(token, JWT_SECRET) || {};
    const { type, sessionDuration } = req.body;
    
    const result = await dataCollectionService.recordSession(userId, type, sessionDuration);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get training data (admin only)
app.get('/api/training-data/export', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    const { userId } = jwt.verify(token, JWT_SECRET) || {};
    const user = await UserModel.findById(userId);
    
    // Check if user is admin
    if (user?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { startDate, endDate, interactionType, limit, skip } = req.query;
    const filters = { startDate, endDate, interactionType, limit, skip };
    
    const data = await dataCollectionService.getTrainingData(filters);
    res.json({ success: true, count: data.length, data });
  } catch (e) {
    console.error('Error exporting training data:', e);
    res.status(500).json({ error: e.message });
  }
});

// Get training data statistics (admin only)
app.get('/api/training-data/stats', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    const { userId } = jwt.verify(token, JWT_SECRET) || {};
    const user = await UserModel.findById(userId);
    
    // Check if user is admin
    if (user?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const stats = await dataCollectionService.getTrainingDataStats();
    res.json(stats);
  } catch (e) {
    console.error('Error fetching training data stats:', e);
    res.status(500).json({ error: e.message });
  }
});

// Export training data in batches (admin only)
app.get('/api/training-data/batch/:batchNumber', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    const { userId } = jwt.verify(token, JWT_SECRET) || {};
    const user = await UserModel.findById(userId);
    
    // Check if user is admin
    if (user?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const batchNumber = parseInt(req.params.batchNumber) || 0;
    const batchSize = parseInt(req.query.batchSize) || 10000;
    
    const batch = await dataCollectionService.exportTrainingDataBatch(batchSize, batchNumber);
    res.json(batch);
  } catch (e) {
    console.error('Error exporting batch:', e);
    res.status(500).json({ error: e.message });
  }
});

// ===== NLP EVALUATION ENDPOINT =====

// Evaluate free-text response using NLP and semantic analysis
app.post('/api/evaluate-response', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    const { userId } = jwt.verify(token, JWT_SECRET);
    const { text, questionId } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required for evaluation' });
    }

    // Perform NLP semantic evaluation
    const evaluation = assessmentService.GradingService.evaluateResponse(text, {
      submissionId: `${userId}-${questionId || 'custom'}-${Date.now()}`,
      promptId: questionId || 'free-text-evaluation',
      studentId: userId
    });

    res.json({
      evaluation,
      passed: evaluation.status === 'graded' && evaluation.grade >= 70,
      needsReview: evaluation.status === 'pending_manual_review'
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ===== AI ENDPOINTS =====

function normalizeAI(text) {
  return {
    content: typeof text === 'string' ? text : JSON.stringify(text)
  };
}
// Get AI-powered explanation for a concept
app.post('/api/ai/explain', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    jwt.verify(token, JWT_SECRET);
    const { concept, level } = req.body;

    if (!concept) {
      return res.status(400).json({ error: 'Concept is required' });
    }

    const explanation = await aiService.explainConcept(
      concept,
      level || 'intermediate'
    );

    const normalized = normalizeAI(explanation);
    res.json({ explanation: normalized.content });
  } catch (e) {
    console.error('AI explain error:', e);
    res.status(500).json({ error: 'AI explanation failed' });
  }
});



// Generate AI practice question
app.post('/api/ai/generate-question', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    jwt.verify(token, JWT_SECRET);
    const { topic, difficulty, skillType } = req.body;

    if (!topic) {
      return res.status(400).json({ error: 'Topic is required' });
    }

    const question = await aiService.generateQuestion(
      topic,
      difficulty || 'intermediate',
      skillType || 'vocabulary'
    );

    res.json({
      ...question,
      content: question.text // 🔥 normalized field
    });
  } catch (e) {
    console.error('AI question error:', e);
    res.status(500).json({ error: 'AI question generation failed' });
  }
});


// Get AI learning analysis
app.get('/api/ai/analyze-progress', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    const { userId } = jwt.verify(token, JWT_SECRET);
    const user = await UserModel.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const responses = await ResponseModel.find({ user: userId }).lean();
    const analysis = await aiService.analyzeLearningPattern(responses, user.theta);
    
    res.json({ 
      analysis,
      stats: {
        totalQuestions: responses.length,
        correctCount: responses.filter(r => r.correct).length,
        currentLevel: user.theta
      }
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Generate conversation practice
app.post('/api/ai/conversation', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    jwt.verify(token, JWT_SECRET);
    const { topic, level } = req.body;

    if (!topic) {
      return res.status(400).json({ error: 'Topic is required' });
    }

    const conversation = await aiService.generateConversation(
      topic,
      level || 'intermediate'
    );

    const normalized = normalizeAI(conversation);
    res.json({ conversation: normalized.content });
  } catch (e) {
    console.error('AI conversation error:', e);
    res.status(500).json({ error: 'AI conversation failed' });
  }
});


// AI writing correction
app.post('/api/ai/correct-writing', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    jwt.verify(token, JWT_SECRET);
    const { text, focusArea } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const correction = await aiService.correctWriting(
      text,
      focusArea || 'general'
    );

    const normalized = normalizeAI(correction);
    res.json({ correction: normalized.content });
  } catch (e) {
    console.error('AI writing error:', e);
    res.status(500).json({ error: 'AI writing correction failed' });
  }
});


// ============================================================================
// AUDIT LOG ENDPOINTS
// ============================================================================

// Get all audit logs (admin only)
app.get('/api/audit-logs', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    const { userId } = jwt.verify(token, JWT_SECRET);
    const user = await UserModel.findById(userId);
    
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const filters = {
      user: req.query.user,
      action: req.query.action,
      status: req.query.status,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      limit: req.query.limit ? parseInt(req.query.limit) : 1000
    };

    const logs = await auditService.getAuditLogs(filters);
    res.json(logs);
  } catch (e) {
    console.error('[Audit] Error fetching logs:', e);
    res.status(500).json({ error: e.message });
  }
});

// Get audit logs for current user
app.get('/api/audit-logs/me', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    const { userId } = jwt.verify(token, JWT_SECRET);
    const logs = await auditService.getUserAuditLogs(userId, 100);
    res.json(logs);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ============================================================================
// ML OPS ENDPOINTS - UC18: Retrain/Update AI Models
// ============================================================================

import retrainingService from './services/retrainingService.js';
import ModelVersionModel from './models/modelVersion.js';

// Trigger model retraining (admin only)
app.post('/api/mlops/retrain', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    const { userId } = jwt.verify(token, JWT_SECRET);
    const user = await UserModel.findById(userId);
    
    // Check if user is admin
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Get options from request
    const { limit, autoDeploy, since } = req.body;
    const options = {
      limit: limit || 10000,
      autoDeploy: autoDeploy !== false,
      since: since || null
    };

    // Run retraining
    console.log('[API] 🚀 Starting model retraining...');
    const result = await retrainingService.retrainModel(options);
    
    res.json(result);
  } catch (e) {
    console.error('[API] ❌ Retraining error:', e);
    res.status(500).json({ error: e.message });
  }
});

// Get retraining status
app.get('/api/mlops/status', async (req, res) => {
  try {
    const status = retrainingService.getStatus();
    res.json(status);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// List all model versions
app.get('/api/mlops/versions', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    const { userId } = jwt.verify(token, JWT_SECRET);
    const user = await UserModel.findById(userId);
    
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const versions = await ModelVersionModel.find()
      .sort({ createdAt: -1 })
      .limit(50);
    
    res.json({ versions });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get current production model
app.get('/api/mlops/production', async (req, res) => {
  try {
    const productionModel = await ModelVersionModel.getCurrentProductionModel();
    
    if (!productionModel) {
      return res.status(404).json({ error: 'No production model found' });
    }
    
    res.json({ model: productionModel });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Deploy a model version to production
app.post('/api/mlops/deploy/:versionId', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    const { userId } = jwt.verify(token, JWT_SECRET);
    const user = await UserModel.findById(userId);
    
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { versionId } = req.params;
    const deployed = await retrainingService.deployModel(versionId);
    
    res.json({ 
      success: true, 
      version: deployed.version,
      deployedAt: deployed.deployedAt 
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get model version details
app.get('/api/mlops/versions/:versionId', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    const { userId } = jwt.verify(token, JWT_SECRET);
    const user = await UserModel.findById(userId);
    
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { versionId } = req.params;
    const version = await ModelVersionModel.findById(versionId);
    
    if (!version) {
      return res.status(404).json({ error: 'Version not found' });
    }
    
    res.json({ version });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ============================================================================

// Start server
app.listen(4000, () => {
  console.log('Server running on http://localhost:4000');
  console.log('Seed questions: GET /api/seed');
  console.log('AI Features:', process.env.GEMINI_API_KEY ? '✓ Enabled' : '✗ Disabled (add GEMINI_API_KEY to .env)');
  console.log('ML Ops:', '✓ Automated retraining available');
});