/**
 * Notification API Client
 * Wraps server notification endpoints for client use
 */

import axios from 'axios';

const API_BASE = 'http://localhost:4000';

export const notificationAPI = {
  /**
   * Get unread notifications for a user
   */
  getUnread: async (userId) => {
    const response = await axios.get(`${API_BASE}/api/notifications/${userId}`);
    return response.data.unread || [];
  },

  /**
   * Get all notifications for a user
   */
  getAll: async (userId) => {
    const response = await axios.get(`${API_BASE}/api/notifications/${userId}/all`);
    return response.data.notifications || [];
  },

  /**
   * Mark a notification as read
   */
  markAsRead: async (userId, notificationId) => {
    const response = await axios.post(`${API_BASE}/api/notifications/${userId}/mark-read/${notificationId}`);
    return response.data.success;
  }
};
