// services/caregiverAPI.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_BASE_URL from './apiConfig';

export const CaregiverAPI = {
  // Get all patients for a caregiver (my patients)
  getMyPatients: async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      
      const response = await fetch(`${API_BASE_URL}/caregiver-links/my-patients`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message?.join(', ') || 'Failed to fetch patients');
      }

      return data.data;
    } catch (error) {
      console.error("Error fetching my patients:", error);
      throw error;
    }
  },

  // Get my caregivers (as a patient)
  getMyCaregivers: async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      
      const response = await fetch(`${API_BASE_URL}/caregiver-links/my-caregivers`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message?.join(', ') || 'Failed to fetch caregivers');
      }

      return data.data;
    } catch (error) {
      console.error("Error fetching my caregivers:", error);
      throw error;
    }
  },

  // Revoke caregiver access (patient removes caregiver)
  revokeAccess: async (linkId) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      
      const response = await fetch(`${API_BASE_URL}/caregiver-links/${linkId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message?.join(', ') || 'Failed to revoke access');
      }

      return data;
    } catch (error) {
      console.error("Error revoking access:", error);
      throw error;
    }
  },

  // Send caregiver request with role specification
  sendRequest: async (targetUserId, myRole) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      
      const response = await fetch(`${API_BASE_URL}/caregiver-requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          target_user_id: targetUserId,
          my_role: myRole // "PATIENT" or "CAREGIVER"
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message?.join(', ') || 'Failed to send request');
      }

      return data.data;
    } catch (error) {
      console.error("Error sending caregiver request:", error);
      throw error;
    }
  },

  // Get pending requests (as patient)
  getPendingRequests: async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      
      const response = await fetch(`${API_BASE_URL}/caregiver-requests/pending`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message?.join(', ') || 'Failed to fetch pending requests');
      }

      return data.data;
    } catch (error) {
      console.error("Error fetching pending requests:", error);
      throw error;
    }
  },

  // Approve request (patient approves caregiver)
  approveRequest: async (requestId) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      
      const response = await fetch(`${API_BASE_URL}/caregiver-requests/${requestId}/approve`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message?.join(', ') || 'Failed to approve request');
      }

      return data.data;
    } catch (error) {
      console.error("Error approving request:", error);
      throw error;
    }
  },
// Add this to your CaregiverAPI in caregiverAPI.js
// Get sent requests (as caregiver)
getSentRequests: async () => {
  try {
    const token = await AsyncStorage.getItem('userToken');
    
    const response = await fetch(`${API_BASE_URL}/caregiver-requests/sent`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message?.join(', ') || 'Failed to fetch sent requests');
    }

    return data.data;
  } catch (error) {
    console.error("Error fetching sent requests:", error);
    throw error;
  }
},
  // Reject request (patient rejects caregiver)
  rejectRequest: async (requestId) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      
      const response = await fetch(`${API_BASE_URL}/caregiver-requests/${requestId}/reject`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message?.join(', ') || 'Failed to reject request');
      }

      return data.data;
    } catch (error) {
      console.error("Error rejecting request:", error);
      throw error;
    }
  },
};