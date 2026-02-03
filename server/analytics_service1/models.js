const mongoose = require('mongoose');

// Student Schema
const studentSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String },
    current_level: { type: String, default: 'Beginner' },
    created_at: { type: Date, default: Date.now }
});

// Student Progress Schema
const studentProgressSchema = new mongoose.Schema({
    student_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    retention_score: { type: Number, default: 0 },
    total_questions_answered: { type: Number, default: 0 },
    correct_answers: { type: Number, default: 0 },
    last_activity: { type: Date, default: Date.now }
});

const Student = mongoose.model('AnalyticsStudent', studentSchema);
const StudentProgress = mongoose.model('StudentProgress', studentProgressSchema);

module.exports = { Student, StudentProgress };
