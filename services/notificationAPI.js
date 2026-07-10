// services/notificationAPI.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_BASE_URL from './apiConfig';

export const NotificationAPI = {

  // Get my notification logs (today's doses)
  getMyLogs: async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      
      const response = await fetch(`${API_BASE_URL}/notification-logs`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message?.join(', ') || 'Failed to fetch logs');
      }

      return data.data;
    } catch (error) {
      console.error("Error fetching notification logs:", error);
      throw error;
    }
  },

  // Confirm a dose (mark as taken)
  confirmDose: async (logId) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      
      const response = await fetch(`${API_BASE_URL}/notification-logs/${logId}/confirm`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message?.join(', ') || 'Failed to confirm dose');
      }

      return data.data;
    } catch (error) {
      console.error("Error confirming dose:", error);
      throw error;
    }
  },
};