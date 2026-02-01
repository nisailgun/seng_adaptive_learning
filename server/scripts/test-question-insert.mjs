import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/english-learning';

(async () => {
  await mongoose.connect(MONGODB_URI);
  
  import QuestionModel from '../src/models/question.js' then (mod) => {
    const testQuestion = {
      text: "Test question",
      answer: "test",
      difficulty: 0.5,
      skill: "reading",
      type: "multiple-choice",
      options: ["test", "other"]
    };
    
    mod.default.create(testQuestion).then(q => {
      console.log('✓ Question created:', q._id);
    }).catch(e => {
      console.error('✗ Error:', e.message);
    }).finally(() => {
      process.exit(0);
    });
  };
})();
