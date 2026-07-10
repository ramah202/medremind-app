// services/deviceAPI.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_BASE_URL from './apiConfig';

export const DeviceAPI = {
  // Get all devices (patient has at most one)
  getAll: async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      
      const response = await fetch(`${API_BASE_URL}/devices`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message?.join(', ') || 'Failed to fetch devices');
      }

      return data.data;
    } catch (error) {
      console.error("Error fetching devices:", error);
      throw error;
    }
  },

  // Get single device by ID
  getById: async (id) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      
      const response = await fetch(`${API_BASE_URL}/devices/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message?.join(', ') || 'Failed to fetch device');
      }

      return data.data;
    } catch (error) {
      console.error("Error fetching device:", error);
      throw error;
    }
  },

  // Create device (register)
  create: async (deviceData) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const userData = await AsyncStorage.getItem('userData');
      const user = userData ? JSON.parse(userData) : null;
      
      const response = await fetch(`${API_BASE_URL}/devices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...deviceData,
          patient_id: user?.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message?.join(', ') || 'Failed to register device');
      }

      return data.data;
    } catch (error) {
      console.error("Error creating device:", error);
      throw error;
    }
  },

  // Update device by ID
  update: async (id, updateData) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      
      const response = await fetch(`${API_BASE_URL}/devices/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(updateData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message?.join(', ') || 'Failed to update device');
      }

      return data.data;
    } catch (error) {
      console.error("Error updating device:", error);
      throw error;
    }
  },

  // Update device by UID (useful when you only have the UID from ESP32)
  updateByUID: async (deviceUid, updateData) => {
    try {
      // First get all devices and find the one with matching UID
      const devices = await DeviceAPI.getAll();
      const device = devices.find(d => d.device_uid === deviceUid);
      
      if (!device) {
        throw new Error('Device not found');
      }
      
      // Then update using the device ID
      return await DeviceAPI.update(device.id, updateData);
    } catch (error) {
      console.error("Error updating device by UID:", error);
      throw error;
    }
  },

  // Delete device
  delete: async (id) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      
      const response = await fetch(`${API_BASE_URL}/devices/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message?.join(', ') || 'Failed to delete device');
      }

      return data.success;
    } catch (error) {
      console.error("Error deleting device:", error);
      throw error;
    }
  },
};