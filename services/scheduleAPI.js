import AsyncStorage from '@react-native-async-storage/async-storage';
import API_BASE_URL from './apiConfig';

export const ScheduleAPI = {
      // Create schedule for a medication
  create: async (scheduleData) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      
      const response = await fetch(`${API_BASE_URL}/medication-schedules`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(scheduleData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message?.join(', ') || 'Failed to create schedule');
      }

      return data.data;
    } catch (error) {
      console.error("Error creating schedule:", error);
      throw error;
    }
  },
  // Get schedules for a medication
  getByMedication: async (medicationId) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      
      const response = await fetch(`${API_BASE_URL}/medication-schedules/medication/${medicationId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message?.join(', ') || 'Failed to fetch schedules');
      }

      return data.data;
    } catch (error) {
      console.error("Error fetching schedules:", error);
      throw error;
    }
  },

  // Update schedule
  update: async (id, scheduleData) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      
      const response = await fetch(`${API_BASE_URL}/medication-schedules/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(scheduleData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message?.join(', ') || 'Failed to update schedule');
      }

      return data.data;
    } catch (error) {
      console.error("Error updating schedule:", error);
      throw error;
    }
  },

  // Delete schedule
  delete: async (id) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      
      const response = await fetch(`${API_BASE_URL}/medication-schedules/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message?.join(', ') || 'Failed to delete schedule');
      }

      return data.success;
    } catch (error) {
      console.error("Error deleting schedule:", error);
      throw error;
    }
  },
};