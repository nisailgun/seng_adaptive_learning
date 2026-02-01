/**
 * AI Service using Google Gemini 1.5 API
 * Backend-only service for Adaptive AI Learn
 */

import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();
const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  console.warn('⚠️ GEMINI_API_KEY not set — AI features will be disabled.');
}

// --------------------------------------------------
// Gemini Client (only if API key present)
// --------------------------------------------------
let genAI = null;
if (API_KEY) {
  genAI = new GoogleGenerativeAI(API_KEY);
}

// Helper to extract text from varying Gemini response shapes
function extractAIText(result) {
  if (!result) return '';

  // 1) Common SDK: result.response.text()
  try {
    if (result.response && typeof result.response.text === 'function') {
      const t = result.response.text();
      if (t) return t;
    }
  } catch (e) {}

  // 2) outputText convenience field
  if (result.outputText) return result.outputText;

  // 3) output array -> content -> text
  if (Array.isArray(result.output) && result.output.length) {
    try {
      return result.output
        .map(o => {
          if (!o) return '';
          if (o.content && Array.isArray(o.content)) {
            return o.content.map(c => c.text || '').join('');
          }
          return '';
        })
        .join('\n') || '';
    } catch (e) {}
  }

  // 4) candidates / message shapes
  if (Array.isArray(result.candidates) && result.candidates.length) {
    const cand = result.candidates[0];
    if (cand.content && Array.isArray(cand.content)) {
      return cand.content.map(c => c.text || '').join('');
    }
    if (cand.message && cand.message.content) {
      return cand.message.content.map(c => c.text || '').join('');
    }
  }

  // 5) fallback: try to pull any "text" fields from JSON
  try {
    const s = JSON.stringify(result);
    const m = s.match(/"text"\s*:\s*"([^"]+)"/);
    if (m) return m[1];
    return s;
  } catch (e) {
    return String(result);
  }
}

class AIService {
  constructor() {
    this.disabled = !API_KEY;
    if (!this.disabled && genAI) {
      // Preferred model (may be invalid for some API versions)
      this.modelName = process.env.GENERATIVE_MODEL || 'gemini-1.5-flash';
      this.model = genAI.getGenerativeModel({ model: this.modelName });
      this._triedFallback = false;
    }
  }

  // Internal wrapper to call generateContent and retry with a fallback model
  async _generate(prompt) {
    if (this.disabled) {
      return null;
    }
    
    // If no genAI, we're disabled
    if (!genAI) {
      return null;
    }

    try {
      return await this.model.generateContent(prompt);
    } catch (err) {
      // If model not found (404), return null instead of throwing
      if (err?.status === 404 || err?.statusCode === 404) {
        console.warn(`Model ${this.modelName} not found (404). Returning null for graceful degradation.`);
        return null;
      }
      throw err;
    }
  }

  // --------------------------------------------------
  // 1. Personalized feedback
  // --------------------------------------------------
  async generateFeedback(question, userAnswer, correctAnswer, isCorrect) {
    if (this.disabled) {
      return isCorrect
        ? 'Great job! Keep going!'
        : 'Good try! Review the rule and try again.';
    }
    const prompt = `
You are a friendly English learning assistant.

Question: "${question}"
Student Answer: "${userAnswer}"
Correct Answer: "${correctAnswer}"
Result: ${isCorrect ? 'Correct' : 'Incorrect'}

Give 2–3 short, encouraging sentences.
If incorrect, explain why and give a helpful tip.
`;

    try {
      const result = await this._generate(prompt);
      if (!result) {
        return isCorrect
          ? 'Great job! Keep going!'
          : 'Good try! Review the rule and try again.';
      }
      const text = extractAIText(result);
      return text || (isCorrect
        ? 'Great job! Keep going!'
        : 'Good try! Review the rule and try again.');
    } catch (err) {
      console.error('AI Feedback Error:', err);
      return isCorrect
        ? 'Great job! Keep going!'
        : 'Good try! Review the rule and try again.';
    }
  }

  // --------------------------------------------------
  // 2. Explain grammar / vocabulary concept
  // --------------------------------------------------
  async explainConcept(concept, userLevel = 'intermediate') {
    if (this.disabled) {
      return 'AI unavailable: GEMINI_API_KEY not set.';
    }
    const prompt = `
You are an English teacher.

Explain "${concept}" to a ${userLevel} student.

Include:
1. Short explanation (2–3 sentences)
2. Two example sentences
3. One easy tip to remember
`;

    try {
      const result = await this._generate(prompt);
      if (!result) {
        return 'Explanation unavailable. Please try again later.';
      }
      const text = extractAIText(result);
      return text || 'Explanation unavailable. Please try again later.';
    } catch (err) {
      console.error('AI Explanation Error:', err);
      return 'Explanation unavailable. Please try again later.';
    }
  }

  // --------------------------------------------------
  // 3. Adaptive question generator (JSON)
  // --------------------------------------------------
  async generateQuestion(topic, difficulty = 'intermediate', skillType = 'vocabulary') {
    if (this.disabled) {
      return {
        text: `Choose the correct option about ${topic}`,
        answer: 'example',
        difficulty: 1,
        options: ['example', 'sample', 'test', 'try'],
        explanation: 'AI unavailable: GEMINI_API_KEY not set.'
      };
    }
    const difficultyMap = {
      beginner: 0,
      intermediate: 1,
      advanced: 2,
    };

    const prompt = `
You are an English exam generator.

Create ONE ${difficulty} ${skillType} question about "${topic}".

Return ONLY valid JSON. No markdown. No text outside JSON.

{
  "text": "",
  "answer": "",
  "difficulty": ${difficultyMap[difficulty] ?? 1},
  "options": ["", "", "", ""],
  "explanation": ""
}
`;

    try {
      const result = await this._generate(prompt);
      if (!result) {
        return {
          text: `Choose the correct option about ${topic}`,
          answer: 'example',
          difficulty: 1,
          options: ['example', 'sample', 'test', 'try'],
          explanation: 'Fallback question used.',
        };
      }
      const raw = (extractAIText(result) || '').trim();

      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('JSON not found');

      return JSON.parse(jsonMatch[0]);
    } catch (err) {
      console.error('AI Question Error:', err);
      return {
        text: `Choose the correct option about ${topic}`,
        answer: 'example',
        difficulty: 1,
        options: ['example', 'sample', 'test', 'try'],
        explanation: 'Fallback question used.',
      };
    }
  }

  // --------------------------------------------------
  // 4. Learning pattern analysis
  // --------------------------------------------------
  async analyzeLearningPattern(responses, userTheta) {
    if (this.disabled) {
      return 'AI unavailable: GEMINI_API_KEY not set.';
    }
    const correct = responses.filter(r => r.correct).length;
    const total = responses.length;
    const accuracy = total ? ((correct / total) * 100).toFixed(1) : 0;

    const prompt = `
You are an English learning coach.

Stats:
- Questions: ${total}
- Correct: ${correct}
- Accuracy: ${accuracy}%
- Theta: ${userTheta.toFixed(2)}

Provide:
1. Short assessment (2 sentences)
2. Two improvement tips
3. One motivational sentence
`;

    try {
      const result = await this._generate(prompt);
      if (!result) {
        return 'Keep practicing regularly. You are making progress!';
      }
      return extractAIText(result) || 'Keep practicing regularly. You are making progress!';
    } catch (err) {
      console.error('AI Analysis Error:', err);
      return 'Keep practicing regularly. You are making progress!';
    }
  }

  // --------------------------------------------------
  // 5. Conversation scenario generator
  // --------------------------------------------------
  async generateConversation(topic, level = 'intermediate') {
    if (this.disabled) {
      return 'AI unavailable: GEMINI_API_KEY not set.';
    }
    const prompt = `
Create an English conversation for ${level} learners about "${topic}".

Include:
- Setting (1 sentence)
- Dialogue (4–6 turns)
- 3 vocabulary words
- 1 grammar point highlighted
`;

    try {
      const result = await this._generate(prompt);
      if (!result) {
        return 'Conversation generation failed.';
      }
      return extractAIText(result) || 'Conversation generation failed.';
    } catch (err) {
      console.error('AI Conversation Error:', err);
      return 'Conversation generation failed.';
    }
  }

  // --------------------------------------------------
  // 6. Writing correction assistant
  // --------------------------------------------------
  async correctWriting(text, focusArea = 'general') {
    if (this.disabled) {
      return 'AI unavailable: GEMINI_API_KEY not set.';
    }
    const prompt = `
You are an English writing tutor.

Correct this text focusing on ${focusArea}:

"${text}"

Return:
1. Corrected version
2. Main issues
3. One improvement suggestion
`;

    try {
      const result = await this._generate(prompt);
      if (!result) {
        return 'Writing review unavailable.';
      }
      return extractAIText(result) || 'Writing review unavailable.';
    } catch (err) {
      console.error('AI Writing Error:', err);
      return 'Writing review unavailable.';
    }
  }
}

// --------------------------------------------------
// Export singleton
// --------------------------------------------------
export default new AIService();
