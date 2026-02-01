import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

import QuestionModel from '../src/models/question.js';
import ModuleModel from '../src/models/module.js';
import UserModel from '../src/models/user.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/english-learning';

/**
 * Content Statistics Viewer
 * Shows detailed statistics about content in the database
 */

async function viewContentStats() {
  try {
    console.log('📊 Content Statistics Viewer\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);

    // Get all questions
    const questions = await QuestionModel.find();
    const modules = await ModuleModel.find();
    const users = await UserModel.find();

    // Overall Statistics
    console.log('📈 Overall Statistics:');
    console.log(`   Total Questions: ${questions.length}`);
    console.log(`   Total Modules: ${modules.length}`);
    console.log(`   Total Users: ${users.length}\n`);

    // Questions by Skill
    console.log('📚 Questions by Skill:');
    const skills = ['reading', 'writing', 'listening', 'speaking'];
    for (const skill of skills) {
      const count = questions.filter(q => q.skill === skill).length;
      const bar = '█'.repeat(Math.ceil(count / 2));
      console.log(`   ${skill.padEnd(10)}: ${count.toString().padStart(3)} ${bar}`);
    }
    console.log();

    // Questions by Type
    console.log('🎯 Questions by Type:');
    const types = {};
    questions.forEach(q => {
      types[q.type || 'other'] = (types[q.type || 'other'] || 0) + 1;
    });
    Object.entries(types)
      .sort((a, b) => b[1] - a[1])
      .forEach(([type, count]) => {
        const bar = '█'.repeat(Math.ceil(count / 2));
        console.log(`   ${type.padEnd(20)}: ${count.toString().padStart(3)} ${bar}`);
      });
    console.log();

    // Questions by CEFR Level
    console.log('📊 Questions by CEFR Level:');
    const levels = {
      'A1 (Beginner)': { min: -3, max: -1, color: '🟢' },
      'A2 (Elementary)': { min: -1, max: 0, color: '🟡' },
      'B1 (Intermediate)': { min: 0, max: 1, color: '🟠' },
      'B2 (Upper-Int)': { min: 1, max: 2, color: '🔴' },
      'C1 (Advanced)': { min: 2, max: 3, color: '🟣' }
    };

    for (const [level, range] of Object.entries(levels)) {
      const count = questions.filter(q => 
        q.difficulty >= range.min && q.difficulty < range.max
      ).length;
      const percentage = ((count / questions.length) * 100).toFixed(1);
      const bar = '█'.repeat(Math.ceil(count / 2));
      console.log(`   ${range.color} ${level.padEnd(20)}: ${count.toString().padStart(3)} (${percentage}%) ${bar}`);
    }
    console.log();

    // Modules by Skill
    console.log('📦 Modules by Skill:');
    for (const skill of skills) {
      const count = modules.filter(m => m.skill === skill).length;
      console.log(`   ${skill.padEnd(10)}: ${count}`);
    }
    console.log();

    // Module Details
    console.log('📖 Module Details:\n');
    for (const skill of skills) {
      const skillModules = modules.filter(m => m.skill === skill).sort((a, b) => a.level - b.level);
      if (skillModules.length > 0) {
        console.log(`   ${skill.toUpperCase()}:`);
        skillModules.forEach(m => {
          const itemCount = m.items?.length || 0;
          const withQuestions = m.items?.filter(i => i.questionId).length || 0;
          console.log(`      Level ${m.level}: ${m.title}`);
          console.log(`              Items: ${itemCount} (${withQuestions} with questions)`);
          console.log(`              Difficulty: ${m.difficulty}`);
        });
        console.log();
      }
    }

    // Difficulty Distribution
    console.log('📉 Difficulty Distribution:');
    const difficultyRanges = [
      { label: 'Very Easy (-3 to -2)', min: -3, max: -2 },
      { label: 'Easy (-2 to -1)', min: -2, max: -1 },
      { label: 'Medium (-1 to 0)', min: -1, max: 0 },
      { label: 'Medium (0 to 1)', min: 0, max: 1 },
      { label: 'Hard (1 to 2)', min: 1, max: 2 },
      { label: 'Very Hard (2 to 3)', min: 2, max: 3 }
    ];

    difficultyRanges.forEach(range => {
      const count = questions.filter(q => 
        q.difficulty >= range.min && q.difficulty < range.max
      ).length;
      const bar = '█'.repeat(Math.ceil(count / 2));
      console.log(`   ${range.label.padEnd(20)}: ${count.toString().padStart(3)} ${bar}`);
    });
    console.log();

    // User Statistics
    if (users.length > 0) {
      console.log('👥 User Statistics:');
      const roles = {};
      users.forEach(u => {
        roles[u.role || 'student'] = (roles[u.role || 'student'] || 0) + 1;
      });
      Object.entries(roles).forEach(([role, count]) => {
        console.log(`   ${role.padEnd(10)}: ${count}`);
      });
      console.log();

      // Average theta
      const avgTheta = users.reduce((sum, u) => sum + (u.theta || 0), 0) / users.length;
      console.log(`   Average θ (ability): ${avgTheta.toFixed(2)}\n`);
    }

    // Open-ended Questions
    const openEnded = questions.filter(q => q.isOpenEnded).length;
    const multipleChoice = questions.filter(q => q.choices && q.choices.length > 0).length;
    console.log('💡 Question Formats:');
    console.log(`   Multiple Choice: ${multipleChoice}`);
    console.log(`   Open-ended: ${openEnded}`);
    console.log(`   Other: ${questions.length - multipleChoice - openEnded}\n`);

    // Content Quality Indicators
    console.log('✨ Content Quality Indicators:');
    const questionsWithChoices = questions.filter(q => q.choices && q.choices.length >= 3).length;
    const questionsWithDifficulty = questions.filter(q => typeof q.difficulty === 'number').length;
    const modulesWithItems = modules.filter(m => m.items && m.items.length > 0).length;
    
    console.log(`   ✅ Questions with answer choices: ${questionsWithChoices}/${questions.length}`);
    console.log(`   ✅ Questions with difficulty rating: ${questionsWithDifficulty}/${questions.length}`);
    console.log(`   ✅ Modules with exercises: ${modulesWithItems}/${modules.length}`);
    console.log();

    // Recommendations
    console.log('💡 Recommendations:');
    const totalNeeded = 500; // Target number of questions
    const remaining = totalNeeded - questions.length;
    
    if (questions.length < 100) {
      console.log(`   ⚠️  Consider adding more questions (${remaining} needed for target of ${totalNeeded})`);
    } else if (questions.length < 300) {
      console.log(`   👍 Good start! Add ${remaining} more questions to reach target of ${totalNeeded}`);
    } else {
      console.log(`   🎉 Excellent content library!`);
    }

    // Check for missing audio/media
    const listeningQuestions = questions.filter(q => q.skill === 'listening');
    const withAudio = listeningQuestions.filter(q => q.audioUrl).length;
    if (withAudio < listeningQuestions.length) {
      console.log(`   ⚠️  ${listeningQuestions.length - withAudio} listening questions need audio files`);
    }

    const speakingQuestions = questions.filter(q => q.skill === 'speaking');
    if (speakingQuestions.length > 0) {
      console.log(`   💡 Speaking module ready (voice recording integration needed)`);
    }

    console.log();
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Statistics generated successfully!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
  }
}

// Run the stats viewer
viewContentStats();
