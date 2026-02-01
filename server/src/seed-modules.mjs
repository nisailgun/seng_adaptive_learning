// Directly seed the database using Mongoose
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const moduleSchema = new mongoose.Schema({
  title: String,
  skill: String,
  level: Number,
  description: String,
  items: [{ title: String, questionId: mongoose.Schema.Types.ObjectId, difficulty: Number }]
});

const Module = mongoose.model('Module', moduleSchema);

async function seed() {
  try {
    const MONGODB_URI = process.env.MONGODB_URI;
    if (!MONGODB_URI) {
      throw new Error('MONGODB_URI not found in environment');
    }

    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✓ Connected to MongoDB');

    // Check existing modules
    const existingModules = await Module.find();
    console.log(`Found ${existingModules.length} existing modules`);

    if (existingModules.length > 0) {
      console.log('Modules already exist. Deleting them first...');
      await Module.deleteMany({});
      console.log('✓ Deleted existing modules');
    }

    // Create modules for all 4 skills
    const modules = [
      // Reading modules
      { 
        title: 'Foundations: Numbers & Facts', 
        skill: 'reading', 
        level: 1, 
        description: 'Basic facts and short passages.', 
        items: [
          { title: 'Simple arithmetic', difficulty: -2 },
          { title: 'World capitals', difficulty: -1 }
        ]
      },
      { 
        title: 'Intermediate: Math & Logic', 
        skill: 'reading', 
        level: 2, 
        description: 'Short problem solving passages.', 
        items: [
          { title: 'Multiplication', difficulty: 0.5 },
          { title: 'Calculus basics', difficulty: 1 }
        ]
      },

      // Writing modules
      { 
        title: 'Basic Grammar', 
        skill: 'writing', 
        level: 1, 
        description: 'Essential grammar rules and sentence structure.', 
        items: [
          { title: 'Simple sentences', difficulty: -1.5 },
          { title: 'Basic verb tenses', difficulty: -1 }
        ]
      },
      { 
        title: 'Paragraph Writing', 
        skill: 'writing', 
        level: 2, 
        description: 'Learn to write coherent paragraphs.', 
        items: [
          { title: 'Topic sentences', difficulty: 0 },
          { title: 'Supporting details', difficulty: 0.5 }
        ]
      },

      // Listening modules
      { 
        title: 'Basic Listening', 
        skill: 'listening', 
        level: 1, 
        description: 'Understanding simple spoken English.', 
        items: [
          { title: 'Greetings and introductions', difficulty: -1.5 },
          { title: 'Simple questions', difficulty: -1 }
        ]
      },
      { 
        title: 'Conversation Comprehension', 
        skill: 'listening', 
        level: 2, 
        description: 'Understanding everyday conversations.', 
        items: [
          { title: 'Short dialogues', difficulty: 0 },
          { title: 'Common phrases', difficulty: 0.5 }
        ]
      },

      // Speaking modules
      { 
        title: 'Pronunciation Basics', 
        skill: 'speaking', 
        level: 1, 
        description: 'Learn correct pronunciation of common words.', 
        items: [
          { title: 'Vowel sounds', difficulty: -1.5 },
          { title: 'Consonant sounds', difficulty: -1 }
        ]
      },
      { 
        title: 'Speaking Practice', 
        skill: 'speaking', 
        level: 2, 
        description: 'Practice speaking in common situations.', 
        items: [
          { title: 'Asking for directions', difficulty: 0 },
          { title: 'Ordering food', difficulty: 0.5 }
        ]
      }
    ];

    console.log('Creating modules...');
    await Module.insertMany(modules);
    console.log(`✓ Created ${modules.length} sample modules across all skills`);

    // Verify
    const finalCount = await Module.countDocuments();
    console.log(`\n✓ Success! Database now has ${finalCount} modules:`);
    
    const skillCounts = await Module.aggregate([
      { $group: { _id: '$skill', count: { $sum: 1 } } }
    ]);
    
    skillCounts.forEach(({ _id, count }) => {
      console.log(`  - ${_id}: ${count} modules`);
    });

  } catch (error) {
    console.error('✗ Error seeding database:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n✓ Disconnected from MongoDB');
    process.exit(0);
  }
}

seed();
