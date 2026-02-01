import mongoose from 'mongoose';

const ItemSchema = new mongoose.Schema({
  title: String,
  type: { type: String, default: 'objective' },
  difficulty: { type: Number, default: 0 },
  discrimination: { type: Number, default: 1 },
  questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question' }
}, { _id: false });

const ModuleSchema = new mongoose.Schema({
  title: String,
  skill: String,
  level: { type: Number, default: 0 },
  description: String,
  items: [ItemSchema]
}, { timestamps: true });

export const ModuleModel = mongoose.models.Module || mongoose.model('Module', ModuleSchema);
export default ModuleModel;
