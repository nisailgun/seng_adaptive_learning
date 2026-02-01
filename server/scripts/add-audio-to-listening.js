import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

import QuestionModel from '../src/models/question.js';

const MONGODB_URI = process.env.MONGODB_URI || '';

async function addAudioToListeningQuestions() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✓ Connected to MongoDB');

    // Find all listening questions
    const listeningQuestions = await QuestionModel.find({ 
      skill: 'listening'
    });

    console.log(`Found ${listeningQuestions.length} listening questions`);

    // Sample free audio URLs (using public domain/free audio sources)
    const audioUrls = [
      'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
      'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
      'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
      'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
      'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3',
      'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3',
    ];

    let updated = 0;
    for (let i = 0; i < listeningQuestions.length; i++) {
      const question = listeningQuestions[i];
      const audioUrl = audioUrls[i % audioUrls.length];
      
      // Clean question text: remove [Audio: ...] prefix
      let cleanedText = question.text;
      cleanedText = cleanedText.replace(/\[Audio:.*?\]\s*-\s*/, '');
      
      // Extract transcript from original text if available
      const audioTextMatch = question.text.match(/\[Audio:\s*'([^']+)'\]/);
      const audioText = audioTextMatch ? audioTextMatch[1] : cleanedText;
      
      await QuestionModel.findByIdAndUpdate(
        question._id,
        {
          text: cleanedText, // Clean the question text
          audioUrl: audioUrl,
          audioText: audioText,
          type: 'objective' // ensure it's objective type with options
        }
      );
      
      updated++;
      console.log(`✓ Updated question ${i + 1}/${listeningQuestions.length}: "${cleanedText.substring(0, 50)}..."`);
    }

    console.log(`✅ Successfully updated ${updated} listening questions with audio`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

addAudioToListeningQuestions();
