/**
 * Complete Database Reset
 * Clears ALL data and reseeds with fresh English content
 */

import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

import { allQuestions, modules } from '../src/data/contentData.js';
import QuestionModel from '../src/models/question.js';
import ModuleModel from '../src/models/module.js';
import UserModel from '../src/models/user.js';
import ResponseModel from '../src/models/response.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/adaptive-learning';

async function resetDatabase() {
  try {
    console.log('🔄 COMPLETE DATABASE RESET\n');
    console.log('⚠️  This will delete ALL data including users and responses!\n');

    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected\n');

    // Clear EVERYTHING
    console.log('🗑️  Clearing all collections...');
    await QuestionModel.deleteMany({});
    await ModuleModel.deleteMany({});
    await UserModel.deleteMany({});
    await ResponseModel.deleteMany({});
    console.log('✅ All data cleared\n');

    // Insert questions
    console.log('📝 Inserting questions...');
    const insertedQuestions = await QuestionModel.insertMany(allQuestions);
    console.log(`✅ Inserted ${insertedQuestions.length} questions\n`);

    // Create modules with linked questions
    console.log('📚 Creating modules...');
    const createdModules = [];
    
    for (const moduleData of modules) {
      const matchingQuestions = insertedQuestions.filter(q => {
        if (q.skill !== moduleData.skill) return false;
        const minDiff = moduleData.difficultyRange[0];
        const maxDiff = moduleData.difficultyRange[1];
        return q.difficulty >= (minDiff - 1.0) && q.difficulty <= (maxDiff + 1.0);
      });

      const module = await ModuleModel.create({
        ...moduleData,
        exercises: matchingQuestions.map(q => q._id)
      });

      createdModules.push(module);
      console.log(`✅ Created: ${module.title} (${matchingQuestions.length} questions)`);
    }
    console.log();

    // Create demo users
    console.log('👥 Creating demo users...');
    const demoUsers = [
      {
        email: 'student_demo@example.com',
        username: 'student_demo',
        password: 'password123',
        firstName: 'Demo',
        lastName: 'Student',
        role: 'student',
        theta: 0.0,
        studentProfile: {
          gradeLevel: 'intermediate',
          learningGoals: ['improve reading', 'practice writing']
        }
      },
      {
        email: 'teacher_demo@example.com',
        username: 'teacher_demo',
        password: 'password123',
        firstName: 'Demo',
        lastName: 'Teacher',
        role: 'teacher',
        teacherProfile: {
          subjectArea: 'English Language',
          yearsExperience: 5
        }
      },
      {
        email: 'admin_demo@example.com',
        username: 'admin_demo',
        password: 'password123',
        firstName: 'Demo',
        lastName: 'Admin',
        role: 'admin'
      }
    ];

    for (const userData of demoUsers) {
      await UserModel.create(userData);
      console.log(`✅ Created: ${userData.username} / password123`);
    }
    console.log();

    // Final summary
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✨ DATABASE RESET COMPLETE!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📊 Summary:');
    console.log(`   Questions: ${insertedQuestions.length}`);
    console.log(`   Modules: ${createdModules.length}`);
    console.log(`   Users: 3\n`);
    console.log('🔐 Demo Accounts (all with password: password123):');
    console.log('   • student_demo');
    console.log('   • teacher_demo');
    console.log('   • admin_demo\n');
    console.log('⚠️  Your old account was deleted!');
    console.log('   Please register a new account or use demo accounts.\n');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('👋 Database connection closed');
  }
}

resetDatabase();
