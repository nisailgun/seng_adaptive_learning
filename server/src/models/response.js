import mongoose from 'mongoose';

const ResponseSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  question: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true },
  correct: { type: Boolean, required: true },
  timestamp: { type: Date, default: () => new Date() },
  nextReview: { type: Date, default: () => new Date() },
  userAnswer: { type: String, default: '' },
  nlpGrade: { type: Number },
  nlpConfidence: { type: Number }
}, { timestamps: true });

export const ResponseModel = mongoose.models.Response || mongoose.model('Response', ResponseSchema);
export default ResponseModel;
