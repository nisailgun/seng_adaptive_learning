import React, { useState, useEffect } from 'react';
import axios from 'axios';

/**
 * NotificationSettings Component
 * FR16: Configurable Alerts (Email vs. In-App)
 * UC16: Configure Notification Preferences
 */
const NotificationSettings = ({ token }) => {
  const [prefs, setPrefs] = useState({
    emailEnabled: true,
    pushEnabled: false,
    inAppEnabled: true
  });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);

  const API_BASE = 'http://localhost:4000';

  // Mevcut tercihleri yükle
  useEffect(() => {
    const fetchPrefs = async () => {
      try {
        const response = await axios.get(`${API_BASE}/api/notifications/preferences`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setPrefs(response.data);
      } catch (error) {
        console.error('Tercihler yüklenemedi:', error);
      } finally {
        setLoading(false);
      }
    };

    if (token) fetchPrefs();
  }, [token]);

  // Tercihleri güncelle
  const handleToggle = async (key) => {
    const updatedPrefs = { ...prefs, [key]: !prefs[key] };
    setPrefs(updatedPrefs); // İyimser güncelleme

    try {
      await axios.post(`${API_BASE}/api/notifications/preferences`, updatedPrefs, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage({ type: 'success', text: 'Preferences updated successfully!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update preferences.' });
      setPrefs(prefs); // Hata durumunda geri al
    }
  };

  if (loading) return <div>Loading settings...</div>;

  return (
    <div style={{ padding: '20px', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
      <h2 style={{ color: '#667eea' }}>Notification Settings</h2>
      <p style={{ color: '#666', fontSize: '14px' }}>Choose how you want to be notified about your progress.</p>

      {message && (
        <div style={{ 
          padding: '10px', 
          marginBottom: '15px', 
          borderRadius: '4px',
          backgroundColor: message.type === 'success' ? '#e8f5e9' : '#ffebee',
          color: message.type === 'success' ? '#2e7d32' : '#c62828'
        }}>
          {message.text}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <div style={styles.settingItem}>
          <div>
            <div style={styles.label}>Email Notifications</div>
            <div style={styles.description}>Receive performance alerts and reminders via email.</div>
          </div>
          <input 
            type="checkbox" 
            checked={prefs.emailEnabled} 
            onChange={() => handleToggle('emailEnabled')}
            style={styles.checkbox}
          />
        </div>

        <div style={styles.settingItem}>
          <div>
            <div style={styles.label}>In-App Notifications</div>
            <div style={styles.description}>Show alerts in the bell icon on the dashboard.</div>
          </div>
          <input 
            type="checkbox" 
            checked={prefs.inAppEnabled} 
            onChange={() => handleToggle('inAppEnabled')}
            style={styles.checkbox}
          />
        </div>

        <div style={styles.settingItem}>
          <div>
            <div style={styles.label}>Push Notifications</div>
            <div style={styles.description}>Receive browser push notifications.</div>
          </div>
          <input 
            type="checkbox" 
            checked={prefs.pushEnabled} 
            onChange={() => handleToggle('pushEnabled')}
            style={styles.checkbox}
          />
        </div>
      </div>
    </div>
  );
};

const styles = {
  settingItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 0',
    borderBottom: '1px solid #eee'
  },
  label: {
    fontWeight: 'bold',
    color: '#333'
  },
  description: {
    fontSize: '12px',
    color: '#999'
  },
  checkbox: {
    width: '20px',
    height: '20px',
    cursor: 'pointer'
  }
};

export default NotificationSettings;