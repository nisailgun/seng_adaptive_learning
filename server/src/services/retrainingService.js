/**
 * ML Ops Retraining Service
 * UC18: Retrain/Update AI Models
 * Automated background process for model retraining
 */

import TrainingDataModel from '../models/trainingData.js';
import ModelVersionModel from '../models/modelVersion.js';
import QuestionModel from '../models/question.js';
import UserModel from '../models/user.js';

class RetrainingService {
  constructor() {
    this.isTraining = false;
    this.currentVersion = null;
  }

  /**
   * Main retraining function - reads training data and updates model
   */
  async retrainModel(options = {}) {
    if (this.isTraining) {
      console.log('[Retraining] ⚠️ Training already in progress');
      return { success: false, message: 'Training already in progress' };
    }

    this.isTraining = true;
    const startTime = new Date();
    
    try {
      console.log('[Retraining] 🚀 Starting automated model retraining...');
      
      // Step 1: Fetch training data
      const trainingData = await this.fetchTrainingData(options);
      console.log(`[Retraining] 📊 Loaded ${trainingData.length} training samples`);
      
      if (trainingData.length === 0) {
        throw new Error('No training data available');
      }

      // Step 2: Create new model version
      const version = await this.createModelVersion(trainingData.length, startTime);
      this.currentVersion = version;
      console.log(`[Retraining] 📦 Created model version: ${version.version}`);

      // Step 3: Run learning algorithm
      const modelParameters = await this.runLearningAlgorithm(trainingData, version);
      console.log('[Retraining] 🧮 Learning algorithm completed');

      // Step 4: Evaluate model performance
      const metrics = await this.evaluateModel(trainingData, modelParameters);
      console.log('[Retraining] 📈 Model evaluation completed');

      // Step 5: Save updated model
      const savedVersion = await this.saveModelVersion(version._id, modelParameters, metrics);
      console.log(`[Retraining] ✅ Model version ${savedVersion.version} saved successfully`);

      // Step 6: Auto-deploy if performance is good
      if (metrics.accuracy > 0.75 && options.autoDeploy !== false) {
        await this.deployModel(savedVersion._id);
        console.log('[Retraining] 🚀 Model deployed to production');
      }

      this.isTraining = false;
      
      return {
        success: true,
        version: savedVersion.version,
        metrics,
        trainingDataCount: trainingData.length,
        duration: (new Date() - startTime) / 1000
      };

    } catch (error) {
      this.isTraining = false;
      console.error('[Retraining] ❌ Error:', error);
      
      if (this.currentVersion) {
        await ModelVersionModel.findByIdAndUpdate(this.currentVersion._id, {
          status: 'failed',
          errors: [{
            timestamp: new Date(),
            message: error.message,
            stack: error.stack
          }]
        });
      }
      
      return {
        success: false,
        message: error.message,
        error: error.stack
      };
    }
  }

  /**
   * Fetch training data from database
   */
  async fetchTrainingData(options = {}) {
    const { limit = 10000, since } = options;
    
    const query = {
      interactionType: 'quiz_answer',  // Only quiz interactions for now
      answerCorrect: { $exists: true }
    };
    
    if (since) {
      query.timestamp = { $gte: new Date(since) };
    }
    
    return await TrainingDataModel.find(query)
      .limit(limit)
      .sort({ timestamp: -1 })
      .lean();
  }

  /**
   * Create new model version entry
   */
  async createModelVersion(dataCount, startTime) {
    const latestVersion = await ModelVersionModel.findOne()
      .sort({ createdAt: -1 });
    
    const versionNumber = latestVersion 
      ? parseInt(latestVersion.version.replace('v', '')) + 1 
      : 1;
    
    return await ModelVersionModel.create({
      version: `v${versionNumber}`,
      modelType: 'irt',
      trainingDataCount: dataCount,
      trainingStartedAt: startTime,
      status: 'training',
      trainedBy: 'automated_system',
      config: {
        batchSize: 32,
        validationSplit: 0.2,
        randomSeed: 42
      }
    });
  }

  /**
   * Run the learning algorithm (IRT-based)
   * This is a simplified version - in production, use proper IRT estimation
   */
  async runLearningAlgorithm(trainingData, version) {
    console.log('[Learning] 🧠 Running IRT-based learning algorithm...');
    
    // Group data by question and user
    const questionStats = {};
    const userStats = {};
    
    // Pass 1: Collect statistics
    for (const sample of trainingData) {
      const qid = sample.questionId?.toString();
      const uid = sample.anonymizedUserId;
      
      if (!qid || !uid) continue;
      
      // Question statistics
      if (!questionStats[qid]) {
        questionStats[qid] = {
          attempts: 0,
          correct: 0,
          totalTime: 0,
          difficulties: []
        };
      }
      questionStats[qid].attempts++;
      if (sample.answerCorrect) questionStats[qid].correct++;
      if (sample.responseTime) questionStats[qid].totalTime += sample.responseTime;
      if (sample.questionDifficulty !== undefined) {
        questionStats[qid].difficulties.push(sample.questionDifficulty);
      }
      
      // User statistics
      if (!userStats[uid]) {
        userStats[uid] = {
          attempts: 0,
          correct: 0,
          levels: []
        };
      }
      userStats[uid].attempts++;
      if (sample.answerCorrect) userStats[uid].correct++;
      if (sample.userLevel !== undefined) {
        userStats[uid].levels.push(sample.userLevel);
      }
    }
    
    // Pass 2: Calculate model parameters
    const questionCount = Object.keys(questionStats).length;
    const userCount = Object.keys(userStats).length;
    
    // Calculate difficulty adjustments
    const difficultyAdjustments = {};
    for (const [qid, stats] of Object.entries(questionStats)) {
      const successRate = stats.correct / stats.attempts;
      const avgDifficulty = stats.difficulties.length > 0
        ? stats.difficulties.reduce((a, b) => a + b, 0) / stats.difficulties.length
        : 0;
      
      // Adjust difficulty based on success rate
      // If too easy (>80% correct), increase difficulty
      // If too hard (<30% correct), decrease difficulty
      let adjustment = 0;
      if (successRate > 0.8) adjustment = 0.2;
      else if (successRate < 0.3) adjustment = -0.2;
      else adjustment = (0.5 - successRate) * 0.4;  // Linear adjustment
      
      difficultyAdjustments[qid] = {
        currentDifficulty: avgDifficulty,
        suggestedDifficulty: avgDifficulty + adjustment,
        successRate,
        sampleSize: stats.attempts
      };
    }
    
    // Calculate ability estimate adjustments
    const abilityAdjustments = {};
    for (const [uid, stats] of Object.entries(userStats)) {
      const successRate = stats.correct / stats.attempts;
      const avgLevel = stats.levels.length > 0
        ? stats.levels.reduce((a, b) => a + b, 0) / stats.levels.length
        : 0;
      
      // Map success rate to ability (theta)
      // 90%+ correct -> theta 2.0+
      // 70-89% -> theta 1.0-2.0
      // 50-69% -> theta 0.0-1.0
      // <50% -> theta < 0.0
      let estimatedTheta;
      if (successRate >= 0.9) estimatedTheta = 2.0 + (successRate - 0.9) * 5;
      else if (successRate >= 0.7) estimatedTheta = 1.0 + (successRate - 0.7) * 5;
      else if (successRate >= 0.5) estimatedTheta = 0.0 + (successRate - 0.5) * 5;
      else estimatedTheta = -1.0 + successRate * 2;
      
      abilityAdjustments[uid] = {
        currentLevel: avgLevel,
        estimatedTheta,
        successRate,
        sampleSize: stats.attempts
      };
    }
    
    // Calculate overall statistics
    const allDifficulties = Object.values(difficultyAdjustments)
      .map(d => d.suggestedDifficulty);
    const allAbilities = Object.values(abilityAdjustments)
      .map(a => a.estimatedTheta);
    
    const parameters = {
      difficulty: {
        mean: this.calculateMean(allDifficulties),
        variance: this.calculateVariance(allDifficulties),
        adjustmentFactor: 0.1
      },
      discrimination: {
        mean: 1.0,
        variance: 0.2
      },
      abilityEstimates: {
        mean: this.calculateMean(allAbilities),
        variance: this.calculateVariance(allAbilities)
      },
      learningRate: 0.01,
      iterations: trainingData.length,
      convergenceThreshold: 0.001,
      
      // Store adjustments for later application
      _adjustments: {
        questions: difficultyAdjustments,
        users: abilityAdjustments
      }
    };
    
    console.log(`[Learning] 📊 Processed ${questionCount} questions and ${userCount} users`);
    console.log(`[Learning] 📈 Difficulty mean: ${parameters.difficulty.mean.toFixed(2)}`);
    console.log(`[Learning] 📈 Ability mean: ${parameters.abilityEstimates.mean.toFixed(2)}`);
    
    return parameters;
  }

  /**
   * Evaluate model performance
   */
  async evaluateModel(trainingData, parameters) {
    console.log('[Evaluation] 🔍 Evaluating model performance...');
    
    // Simple evaluation: check prediction accuracy
    let correct = 0;
    let total = 0;
    let sumSquaredError = 0;
    let sumAbsoluteError = 0;
    
    for (const sample of trainingData) {
      if (!sample.questionId || !sample.anonymizedUserId) continue;
      
      const qid = sample.questionId.toString();
      const uid = sample.anonymizedUserId;
      
      const questionAdj = parameters._adjustments.questions[qid];
      const userAdj = parameters._adjustments.users[uid];
      
      if (!questionAdj || !userAdj) continue;
      
      // Predict using IRT: P(correct) = 1 / (1 + exp(-(theta - difficulty)))
      const theta = userAdj.estimatedTheta;
      const difficulty = questionAdj.suggestedDifficulty;
      const predictedProb = 1 / (1 + Math.exp(-(theta - difficulty)));
      
      // Threshold at 0.5
      const predicted = predictedProb >= 0.5;
      const actual = sample.answerCorrect;
      
      if (predicted === actual) correct++;
      total++;
      
      const error = predictedProb - (actual ? 1 : 0);
      sumSquaredError += error * error;
      sumAbsoluteError += Math.abs(error);
    }
    
    const accuracy = total > 0 ? correct / total : 0;
    const rmse = total > 0 ? Math.sqrt(sumSquaredError / total) : 0;
    const mae = total > 0 ? sumAbsoluteError / total : 0;
    
    // Calculate precision, recall, F1 (simplified)
    const precision = accuracy;  // Simplified
    const recall = accuracy;     // Simplified
    const f1Score = 2 * (precision * recall) / (precision + recall || 1);
    
    console.log(`[Evaluation] ✅ Accuracy: ${(accuracy * 100).toFixed(2)}%`);
    console.log(`[Evaluation] 📊 RMSE: ${rmse.toFixed(4)}`);
    
    return {
      accuracy,
      precision,
      recall,
      f1Score,
      rmse,
      mae,
      logLikelihood: -sumSquaredError  // Approximation
    };
  }

  /**
   * Save model version with parameters and metrics
   */
  async saveModelVersion(versionId, parameters, metrics) {
    // Remove internal adjustments before saving
    const { _adjustments, ...cleanParameters } = parameters;
    
    return await ModelVersionModel.findByIdAndUpdate(
      versionId,
      {
        parameters: cleanParameters,
        metrics,
        status: 'completed',
        trainingCompletedAt: new Date()
      },
      { new: true }
    );
  }

  /**
   * Deploy model to production
   */
  async deployModel(versionId) {
    console.log('[Deploy] 🚀 Deploying model to production...');
    
    const deployed = await ModelVersionModel.promoteToProduction(versionId);
    
    // Apply model adjustments to actual questions and users
    const version = await ModelVersionModel.findById(versionId);
    if (version && version.parameters) {
      // In production, you would apply these adjustments
      console.log('[Deploy] 📝 Model parameters ready for application');
      // await this.applyModelAdjustments(version.parameters);
    }
    
    return deployed;
  }

  /**
   * Apply model adjustments to database (optional)
   */
  async applyModelAdjustments(parameters) {
    // This would update question difficulties and user theta values
    // based on the learned parameters
    console.log('[Apply] 🔄 Applying model adjustments to production data...');
    
    // Example: Update question difficulties
    // for (const [qid, adj] of Object.entries(adjustments.questions)) {
    //   await QuestionModel.findByIdAndUpdate(qid, {
    //     difficulty: adj.suggestedDifficulty
    //   });
    // }
    
    return { applied: true };
  }

  /**
   * Utility: Calculate mean
   */
  calculateMean(values) {
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  /**
   * Utility: Calculate variance
   */
  calculateVariance(values) {
    if (values.length === 0) return 0;
    const mean = this.calculateMean(values);
    const squaredDiffs = values.map(v => (v - mean) ** 2);
    return this.calculateMean(squaredDiffs);
  }

  /**
   * Get retraining status
   */
  getStatus() {
    return {
      isTraining: this.isTraining,
      currentVersion: this.currentVersion?.version || null
    };
  }
}

export default new RetrainingService();
