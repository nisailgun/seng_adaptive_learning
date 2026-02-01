/**
 * GDPR Service - FR19: Data Privacy Controls
 * Handles data export, deletion, and privacy compliance
 */

import UserModel from '../models/user.js';
import ResponseModel from '../models/response.js';
import TrainingDataModel from '../models/trainingData.js';
import AuditLogModel from '../models/auditLog.js';

class GDPRService {
  /**
   * Export all user data in JSON format (GDPR Right to Data Portability)
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Complete user data export
   */
  async exportUserData(userId) {
    try {
      // Fetch all user-related data
      const user = await UserModel.findById(userId).select('-password').lean();
      if (!user) {
        throw new Error('User not found');
      }

      const responses = await ResponseModel.find({ user: userId }).lean();
      const trainingData = await TrainingDataModel.find({ userId }).lean();
      const auditLogs = await AuditLogModel.find({ userId }).lean();

      // Compile complete data export
      const dataExport = {
        exportDate: new Date().toISOString(),
        exportVersion: '1.0',
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          createdAt: user.createdAt
        },
        responses: responses.map(r => ({
          questionId: r.question,
          answer: r.userAnswer,
          correct: r.correct,
          timestamp: r.timestamp,
          nlpGrade: r.nlpGrade,
          nlpConfidence: r.nlpConfidence,
          isSpeech: r.isSpeech,
          speechMetrics: r.speechMetrics
        })),
        trainingData: trainingData.map(t => ({
          interactionType: t.interactionType,
          timestamp: t.timestamp,
          data: t.data
        })),
        activityLog: auditLogs.map(log => ({
          action: log.action,
          description: log.description,
          timestamp: log.timestamp,
          status: log.status
        })),
        statistics: {
          totalResponses: responses.length,
          correctResponses: responses.filter(r => r.correct).length,
          accuracy: responses.length > 0 
            ? ((responses.filter(r => r.correct).length / responses.length) * 100).toFixed(2) + '%'
            : '0%',
          totalInteractions: trainingData.length,
          accountAge: Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24)) + ' days'
        }
      };

      return dataExport;
    } catch (error) {
      console.error('GDPR Export Error:', error);
      throw error;
    }
  }

  /**
   * Delete all user data (GDPR Right to Erasure)
   * @param {string} userId - User ID
   * @param {string} reason - Deletion reason
   * @returns {Promise<Object>} Deletion summary
   */
  async deleteUserData(userId, reason = 'User requested') {
    try {
      const user = await UserModel.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Count records before deletion
      const responsesCount = await ResponseModel.countDocuments({ user: userId });
      const trainingDataCount = await TrainingDataModel.countDocuments({ userId });

      // Delete all user-related data
      await ResponseModel.deleteMany({ user: userId });
      await TrainingDataModel.deleteMany({ userId });
      
      // Anonymize audit logs (keep for compliance but remove PII)
      await AuditLogModel.updateMany(
        { userId },
        { 
          $set: { 
            username: `[DELETED-${userId}]`,
            userId: null 
          } 
        }
      );

      // Create final audit log before deletion
      await AuditLogModel.create({
        action: 'ACCOUNT_DELETION',
        username: user.username,
        description: `Account deletion requested: ${reason}`,
        timestamp: new Date(),
        status: 'SUCCESS',
        userId
      });

      // Delete user account
      await UserModel.findByIdAndDelete(userId);

      const summary = {
        success: true,
        deletedAt: new Date().toISOString(),
        deletedUser: {
          username: user.username,
          email: user.email,
          accountCreated: user.createdAt
        },
        deletedRecords: {
          responses: responsesCount,
          trainingData: trainingDataCount,
          auditLogsAnonymized: await AuditLogModel.countDocuments({ 
            username: `[DELETED-${userId}]` 
          })
        },
        reason
      };

      return summary;
    } catch (error) {
      console.error('GDPR Deletion Error:', error);
      throw error;
    }
  }

  /**
   * Get user's data processing consent status
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Consent information
   */
  async getConsentStatus(userId) {
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    return {
      userId: user._id,
      dataProcessingConsent: user.dataProcessingConsent || true,
      marketingConsent: user.marketingConsent || false,
      analyticsConsent: user.analyticsConsent || true,
      consentDate: user.consentDate || user.createdAt,
      lastUpdated: user.consentUpdatedAt || user.createdAt
    };
  }

  /**
   * Update user's data processing consent
   * @param {string} userId - User ID
   * @param {Object} consents - Consent settings
   * @returns {Promise<Object>} Updated consent status
   */
  async updateConsent(userId, consents) {
    const { dataProcessing, marketing, analytics } = consents;

    const user = await UserModel.findByIdAndUpdate(
      userId,
      {
        dataProcessingConsent: dataProcessing !== undefined ? dataProcessing : true,
        marketingConsent: marketing !== undefined ? marketing : false,
        analyticsConsent: analytics !== undefined ? analytics : true,
        consentUpdatedAt: new Date()
      },
      { new: true }
    );

    if (!user) {
      throw new Error('User not found');
    }

    return {
      success: true,
      consents: {
        dataProcessing: user.dataProcessingConsent,
        marketing: user.marketingConsent,
        analytics: user.analyticsConsent
      },
      updatedAt: user.consentUpdatedAt
    };
  }

  /**
   * Anonymize user data for research purposes
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Anonymized data
   */
  async anonymizeUserData(userId) {
    const responses = await ResponseModel.find({ user: userId }).lean();
    const user = await UserModel.findById(userId).lean();

    return {
      anonymousId: `anon-${Math.random().toString(36).substr(2, 9)}`,
      theta: user.theta,
      responsesAnonymized: responses.map(r => ({
        correct: r.correct,
        difficulty: r.difficulty || 0,
        timestamp: r.timestamp,
        responseTime: r.responseTime
      })),
      aggregateMetrics: {
        totalResponses: responses.length,
        accuracy: responses.filter(r => r.correct).length / responses.length,
        averageTheta: user.theta
      }
    };
  }
}

export default new GDPRService();
