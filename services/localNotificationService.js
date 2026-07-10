
// services/localNotificationService.js
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

export const configureNotifications = async () => {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#2196F3",
      sound: "default",
    });
  }

  console.log("✅ Push notification display configured");
};