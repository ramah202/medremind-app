// services/api.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_BASE_URL from './apiConfig';
import { PushTokenAPI } from './pushTokenAPI';

export const API = {

  // Login user
  login: async (email, password) => {
    try {
      const response = await fetch(`${API_BASE_URL}/user/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message?.join(', ') || 'Login failed');
      }

      if (data.success) {
        // Store token and user data
        await AsyncStorage.setItem('userToken', data.data.token);
        await AsyncStorage.setItem('userData', JSON.stringify(data.data.user));

        // Register and save Expo push token after login
        try {
          await PushTokenAPI.registerAndSaveToken();
        } catch (pushError) {
          console.log("Push token registration failed:", pushError);
        }

        return data.data;
      } else {
        throw new Error(data.message?.join(', ') || 'Login failed');
      }
    } catch (error) {
      console.error("Error logging in:", error);
      throw error;
    }
  },

  // Register user
  register: async (userData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/user/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message?.join(', ') || 'Registration failed');
      }

      if (data.success) {
        return data.data;
      } else {
        throw new Error(data.message?.join(', ') || 'Registration failed');
      }
    } catch (error) {
      console.error("Error registering user:", error);
      throw error;
    }
  },

  // Get current user (protected)
  getCurrentUser: async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');

      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${API_BASE_URL}/user/me`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          // Token expired or invalid
          await AsyncStorage.removeItem('userToken');
          await AsyncStorage.removeItem('userData');
        }
        throw new Error(data.message?.join(', ') || 'Failed to get user');
      }

      if (data.success) {
        return data.data;
      } else {
        throw new Error(data.message?.join(', ') || 'Failed to get user');
      }
    } catch (error) {
      console.error("Error getting current user:", error);
      throw error;
    }
  },

  // Update current user (protected)
  updateUser: async (userData) => {
    try {
      const token = await AsyncStorage.getItem('userToken');

      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${API_BASE_URL}/user/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message?.join(', ') || 'Failed to update user');
      }

      if (data.success) {
        // Update stored user data
        await AsyncStorage.setItem('userData', JSON.stringify(data.data));
        return data.data;
      } else {
        throw new Error(data.message?.join(', ') || 'Failed to update user');
      }
    } catch (error) {
      console.error("Error updating user:", error);
      throw error;
    }
  },

  // Deactivate user account (protected)
  deactivateUser: async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');

      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${API_BASE_URL}/user/me`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message?.join(', ') || 'Failed to deactivate account');
      }

      if (data.success) {
        // Clear stored data on deactivation
        await AsyncStorage.removeItem('userToken');
        await AsyncStorage.removeItem('userData');
        return true;
      } else {
        throw new Error(data.message?.join(', ') || 'Failed to deactivate account');
      }
    } catch (error) {
      console.error("Error deactivating user:", error);
      throw error;
    }
  },

  // Logout user
  logout: async () => {
    try {
      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('userData');
      return true;
    } catch (error) {
      console.error("Error logging out:", error);
      throw error;
    }
  },

  // Check if user is authenticated
  isAuthenticated: async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      return !!token;
    } catch (error) {
      console.error("Error checking authentication:", error);
      return false;
    }
  },

  // Get stored user data
  getStoredUser: async () => {
    try {
      const userData = await AsyncStorage.getItem('userData');
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error("Error getting stored user:", error);
      return null;
    }
  },
  // Search users by name or email
  searchUsers: async (query) => {
    try {
      const token = await AsyncStorage.getItem('userToken');

      const response = await fetch(`${API_BASE_URL}/users/search?q=${encodeURIComponent(query)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message?.join(', ') || 'Failed to search users');
      }

      return data.data;
    } catch (error) {
      console.error("Error searching users:", error);
      throw error;
    }
  },
  // Search users by username (using your new backend endpoint)
  searchByUsername: async (username) => {
    try {
      const token = await AsyncStorage.getItem('userToken');

      const response = await fetch(`${API_BASE_URL}/user/search-by-username?username=${encodeURIComponent(username)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message?.join(', ') || 'Failed to search users');
      }

      return data.data || [];
    } catch (error) {
      console.error("Error searching users:", error);
      throw error;
    }
  },

  // Get current user info
  getCurrentUser: async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');

      const response = await fetch(`${API_BASE_URL}/user/me`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message?.join(', ') || 'Failed to get user');
      }

      return data.data;
    } catch (error) {
      console.error("Error getting current user:", error);
      throw error;
    }
  },
};