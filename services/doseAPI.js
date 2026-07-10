import AsyncStorage from '@react-native-async-storage/async-storage';
import API_BASE_URL from './apiConfig';

export const DoseAPI = {
  // Record a dose taken
  recordDose: async (medicationId, scheduleId, takenAt) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      
      const response = await fetch(`${API_BASE_URL}/doses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          medication_id: medicationId,
          schedule_id: scheduleId,
          taken_at: takenAt,
          status: 'TAKEN',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message?.join(', ') || 'Failed to record dose');
      }

      return data.data;
    } catch (error) {
      console.error("Error recording dose:", error);
      throw error;
    }
  },

  // Get today's doses
  getTodayDoses: async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const today = new Date().toISOString().split('T')[0];
      
      const response = await fetch(`${API_BASE_URL}/doses?date=${today}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message?.join(', ') || 'Failed to fetch doses');
      }

      return data.data;
    } catch (error) {
      console.error("Error fetching today's doses:", error);
      throw error;
    }
  },
};