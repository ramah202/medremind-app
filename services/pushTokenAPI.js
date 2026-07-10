// services/pushTokenAPI.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import API_BASE_URL from './apiConfig';
import Constants from 'expo-constants';

export const PushTokenAPI = {
  // Debug function to check permissions and token
  debugPushSetup: async () => {
    console.log("=== PUSH NOTIFICATION DEBUG ===");

    // 1. Check permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    console.log("1. Permission status:", existingStatus);

    // 2. Check if running in Expo Go or standalone
    const isExpoGo = Constants.appOwnership === 'expo';
    console.log("2. Running in Expo Go:", isExpoGo);
    console.log("2. App ownership:", Constants.appOwnership);


    try {
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId,
      });

      console.log("3. Expo push token:", tokenData.data);
      console.log("3. Token length:", tokenData.data?.length);
    } catch (error) {
      console.error("3. Error getting token:", error.message);
    }

    // 4. Check Android channel
    if (Platform.OS === 'android') {
      try {
        const channels = await Notifications.getNotificationChannelsAsync();
        console.log("4. Android channels:", channels.map(c => c.name));
      } catch (error) {
        console.log("4. Error getting channels:", error.message);
      }
    }

    console.log("================================");
  },

  registerAndSaveToken: async () => {
    try {
      // First, debug the setup
      await PushTokenAPI.debugPushSetup();

      // Request permission if needed
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('❌ Failed to get push token permissions');
        return null;
      }

      console.log('✅ Permission granted');

      // Get Expo push token - for Expo Go, we need a different approach
      let tokenData;
      try {
        // For Expo Go, we can still get a token but it won't work for custom backends
        // tokenData = await Notifications.getExpoPushTokenAsync();
        tokenData = await Notifications.getExpoPushTokenAsync({
          projectId: Constants.expoConfig?.extra?.eas?.projectId,
        });
        console.log('✅ Got Expo push token:', tokenData.data);
      } catch (tokenError) {
        console.error('❌ Error getting token:', tokenError.message);
        return null;
      }

      const token = tokenData.data;

      // Get auth token
      const authToken = await AsyncStorage.getItem('userToken');
      if (!authToken) {
        console.log('❌ User not logged in');
        return null;
      }

      console.log("++++++++++++++++++++++ START PUSH TOKEN REGISTER");

      console.log(" +++++++++++++++++++++++++++++API URL:", `${API_BASE_URL}/user/push-token`);

      console.log(" ++++++++++++++++++++++++++++AUTH TOKEN:", authToken);

      console.log(" +++++++++++++++++++++++++++ EXPO TOKEN:", token);

      // Send token to backend
      console.log('📤 Sending token to backend...');
      const response = await fetch(`${API_BASE_URL}/user/push-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          push_token: token,
          device_type: Platform.OS,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('❌ Backend error:', data.message);
        throw new Error(data.message?.join(', ') || 'Failed to save push token');
      }

      console.log('✅ Push token saved to backend');
      return token;

    } catch (error) {
      console.error('❌ Error registering push token:', error);
      return null;
    }
  },

  configureNotifications: () => {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });

    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#2196F3',
      });
    }
  },
};