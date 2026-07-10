import AsyncStorage from '@react-native-async-storage/async-storage';
import API_BASE_URL from './apiConfig';

export const MedicationAPI = {
    create: async (medicationData) => {
  try {
    const token = await AsyncStorage.getItem('userToken');
    
    const response = await fetch(`${API_BASE_URL}/medications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(medicationData),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message?.join(', ') || 'Failed to create medication');
    }

    return data.data;
  } catch (error) {
    console.error("Error creating medication:", error);
    throw error;
  }
},
  // Create medication with schedule (combined)
  createWithSchedule: async (medicationData, scheduleData) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      
      const response = await fetch(`${API_BASE_URL}/medications/create-with-schedule`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...medicationData,
          ...scheduleData,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message?.join(', ') || 'Failed to create medication');
      }

      return data.data;
    } catch (error) {
      console.error("Error creating medication with schedule:", error);
      throw error;
    }
  },

  // Get all medications for current user
  getAll: async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      
      const response = await fetch(`${API_BASE_URL}/medications`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message?.join(', ') || 'Failed to fetch medications');
      }

      return data.data;
    } catch (error) {
      console.error("Error fetching medications:", error);
      throw error;
    }
  },

  // Get single medication by ID
  getById: async (id) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      
      const response = await fetch(`${API_BASE_URL}/medications/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message?.join(', ') || 'Failed to fetch medication');
      }

      return data.data;
    } catch (error) {
      console.error("Error fetching medication:", error);
      throw error;
    }
  },

  // Update medication
  update: async (id, updateData) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      
      const response = await fetch(`${API_BASE_URL}/medications/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(updateData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message?.join(', ') || 'Failed to update medication');
      }

      return data.data;
    } catch (error) {
      console.error("Error updating medication:", error);
      throw error;
    }
  },

  // Deactivate medication (soft delete)
  deactivate: async (id) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      
      const response = await fetch(`${API_BASE_URL}/medications/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message?.join(', ') || 'Failed to deactivate medication');
      }

      return data.success;
    } catch (error) {
      console.error("Error deactivating medication:", error);
      throw error;
    }
  },
};