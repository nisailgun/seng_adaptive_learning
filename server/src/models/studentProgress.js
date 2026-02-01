import mongoose from 'mongoose';

const StudentProgressSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  theta: { type: Number, default: 0 }, // Student's ability level
  points: { type: Number, default: 0 }, // Gamification points
  totalQuestionsAnswered: { type: Number, default: 0 },
  correctAnswers: { type: Number, default: 0 },
  accuracy: { type: Number, default: 0 }, // Percentage
  lastActivityDate: { type: Date, default: Date.now }
}, { timestamps: true });

export const StudentProgressModel = mongoose.models.StudentProgress || mongoose.model('StudentProgress', StudentProgressSchema);
export default StudentProgressModel;
