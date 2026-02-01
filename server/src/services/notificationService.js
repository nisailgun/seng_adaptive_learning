/**
 * Notification Service
 * FR17: Configurable Notifications (Email/Push/In-App)
 * UC16: Configure Notification Preferences
 * * Bu servis, kullanıcılara bildirim gönderme işlemlerini yönetir.
 * Bellekte (in-memory) çalışır, veritabanı gerektirmez.
 */

// Bellek tabanlı veri yapıları
const notifications = {}; 
const userPreferences = {}; // { userId: { email: true, push: false, inApp: true } }

/**
 * FR17 & UC16: Kullanıcı bildirim tercihlerini al
 * Varsayılan: Email ve In-App açık, Push kapalı
 */
export const getUserPreferences = (userId) => {
  if (!userPreferences[userId]) {
    userPreferences[userId] = {
      emailEnabled: true,
      pushEnabled: false,
      inAppEnabled: true
    };
  }
  return userPreferences[userId];
};

/**
 * UC16: Kullanıcı bildirim tercihlerini güncelle
 */
export const updateUserPreferences = (userId, preferences) => {
  userPreferences[userId] = {
    ...getUserPreferences(userId),
    ...preferences
  };
  console.log(`[Preferences] User ${userId} updated notification settings:`, userPreferences[userId]);
  return userPreferences[userId];
};

/**
 * FR17: Çok kanallı bildirim gönderme fonksiyonu
 * Kullanıcı tercihlerine göre Email/Push/In-App kanallarına bildirim gönderir
 */
const sendNotification = (userId, type, title, message) => {
  const prefs = getUserPreferences(userId);
  const notification = {
    id: Date.now(),
    userId,
    type,
    title,
    message,
    timestamp: new Date(),
    read: false
  };

  // IN-APP: Kullanıcı tercihi aktifse, bellekte sakla
  if (prefs.inAppEnabled) {
    if (!notifications[userId]) notifications[userId] = [];
    notifications[userId].push(notification);
    console.log(`[In-App] ✅ Notification added for user ${userId}: ${title}`);
  }

  // EMAIL: Kullanıcı tercihi aktifse, email simülasyonu
  if (prefs.emailEnabled) {
    console.log(`[Email] 📧 Email sent to user ${userId}: ${title}`);
  }

  // PUSH: Kullanıcı tercihi aktifse, push simülasyonu
  if (prefs.pushEnabled) {
    console.log(`[Push] 📲 Push notification sent to user ${userId}: ${title}`);
  }

  return notification;
};

/**
 * FR17: Performance Alert (Performans düşünce uyarı)
 * Kullanıcının puanı düştüğünde çağrılır
 */
export const sendPerformanceAlert = async (userId, currentScore) => {
  const title = 'Performance Alert ⚠️';
  const message = `Warning: Your proficiency score has dropped to ${currentScore}. We recommend reviewing previous modules.`;
  
  return sendNotification(userId, 'alert', title, message);
};

/**
 * FR19: Milestone Notification (Başarı bildirimi)
 * Kullanıcı bir seviyeyi tamamladığında çağrılır
 */
export const sendMilestoneAchieved = async (userId, milestone) => {
  const title = 'Milestone Achieved! 🎉';
  const message = `Great job! You've achieved: ${milestone}`;
  
  return sendNotification(userId, 'milestone', title, message);
};

/**
 * FR18: Review Reminder (Tekrar hatırlatıcısı)
 * Kullanıcıya konu tekrarı yapması gerektiğinde çağrılır
 */
export const sendReviewReminder = async (userId, topicName) => {
  const title = 'Time to Review! ⏰';
  const message = `Don't forget to review: ${topicName}`;
  
  return sendNotification(userId, 'reminder', title, message);
};

/**
 * UC20 & FR23: Destek Talebi Onay Bildirimi
 */
export const sendSupportConfirmation = (userId, ticketId) => {
  const title = 'Support Request Received 🎫';
  const message = `Your ticket #${ticketId} has been successfully created and is under review.`;
  
  return sendNotification(userId, 'system', title, message);
};

/**
 * Password Reset Email
 */
export const sendPasswordResetEmail = (email) => {
  console.log(`[Email]: Password reset link sent to ${email}`);
  return { success: true, message: 'Password reset email sent' };
};

/**
 * Kayıt Doğrulama Email
 */
export const sendVerificationEmail = async (email, token) => {
  console.log(`[Email] 📨 Verification email sent to: ${email} | Token: ${token}`);
  return true;
};

/**
 * API Helper: Kullanıcının okunmamış bildirimlerini getir
 */
export const getUnreadNotifications = (userId) => {
  return (notifications[userId] || [])
    .filter(n => !n.read)
    .sort((a, b) => b.timestamp - a.timestamp); // Yeni bildirimleri üstte göster
};

/**
 * API Helper: Tüm bildirimleri getir (okunmuş + okunmamış)
 */
export const getAllNotifications = (userId) => {
  return (notifications[userId] || [])
    .sort((a, b) => b.timestamp - a.timestamp);
};

/**
 * API Helper: Bildirimi okundu olarak işaretle
 */
export const markAsRead = (userId, notificationId) => {
  if (!notifications[userId]) return false;
  
  const notification = notifications[userId].find(n => n.id === notificationId);
  if (notification) {
    notification.read = true;
    console.log(`[Notification] ✓ Marked as read: ${notificationId} for user ${userId}`);
    return true;
  }
  
  return false;
};

/**
 * API Helper: Tüm bildirimleri okundu olarak işaretle
 */
export const markAllAsRead = (userId) => {
  if (!notifications[userId]) return 0;
  
  let count = 0;
  notifications[userId].forEach(n => {
    if (!n.read) {
      n.read = true;
      count++;
    }
  });
  
  console.log(`[Notification] ✓ Marked ${count} notifications as read for user ${userId}`);
  return count;
};
