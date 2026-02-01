/**
 * Audit Service
 * Logs security-related actions and system events
 */

import AuditLogModel from '../models/auditLog.js';

/**
 * Create an audit log entry
 */
export async function logAction(action, user, details, ipAddress, status = 'SUCCESS', userId = null) {
  try {
    await AuditLogModel.create({
      action,
      user,
      userId,
      details,
      ip_address: ipAddress,
      status
    });
  } catch (error) {
    console.error('[Audit] Failed to log action:', error);
  }
}

/**
 * Get all audit logs (with optional filters)
 */
export async function getAuditLogs(filters = {}) {
  const query = {};
  
  if (filters.user) {
    query.user = new RegExp(filters.user, 'i');
  }
  
  if (filters.action) {
    query.action = new RegExp(filters.action, 'i');
  }
  
  if (filters.status) {
    query.status = filters.status;
  }
  
  if (filters.startDate || filters.endDate) {
    query.timestamp = {};
    if (filters.startDate) query.timestamp.$gte = new Date(filters.startDate);
    if (filters.endDate) query.timestamp.$lte = new Date(filters.endDate);
  }
  
  return await AuditLogModel.find(query)
    .sort({ timestamp: -1 })
    .limit(filters.limit || 1000);
}

/**
 * Get audit logs for specific user
 */
export async function getUserAuditLogs(userId, limit = 100) {
  return await AuditLogModel.find({ userId })
    .sort({ timestamp: -1 })
    .limit(limit);
}

/**
 * Delete old audit logs (cleanup)
 */
export async function cleanupOldLogs(daysToKeep = 90) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
  
  const result = await AuditLogModel.deleteMany({
    timestamp: { $lt: cutoffDate }
  });
  
  return result.deletedCount;
}
