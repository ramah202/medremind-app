//(app)/_layout
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef } from "react";
import { Alert } from "react-native";
import * as Notifications from "expo-notifications";
import { PushTokenAPI } from "../services/pushTokenAPI";
import { configureNotifications } from "../services/localNotificationService";



export default function Layout() {
  const router = useRouter();
  const notificationListener = useRef<any>(null);
  const responseListener = useRef<any>(null);

  useEffect(() => {
    // Configure local notifications (works in Expo Go)
    configureNotifications();
    
    // Configure push notifications (for development build)
    PushTokenAPI.configureNotifications();
    
    // Register push token when app starts
    const registerToken = async () => {
      await PushTokenAPI.registerAndSaveToken();
    };
    
    registerToken();


notificationListener.current =
  Notifications.addNotificationReceivedListener((notification) => {
    console.log("Notification received while app is open:", notification);

    const data = notification.request.content.data;
    const body =
      notification.request.content.body || "You have a new notification";
    
    if (data?.type === "caregiver_request") {
      Alert.alert("New Caregiver Request", body, [
        { text: "Later", style: "cancel" },
        { text: "View", onPress: () => router.push("/(tabs)/caregiver") },
      ]);
    } else if (data?.type === "caregiver_approved") {
      Alert.alert("Request Approved", body, [
        { text: "OK", onPress: () => router.push("/(tabs)/caregiver") },
      ]);
    } else if (
      data?.type === "medication_reminder" ||
      data?.type === "medication_reminder_followup" ||
      data?.type === "caregiver_missed_dose"
    ) {
      Alert.alert("Medication Notification", body, [
        { text: "OK", onPress: () => router.push("/(tabs)") },
      ]);
    }
  });



    // Handle notification tap (when user clicks on notification from notification center)
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      console.log('Notification tapped:', data);
      
      // Navigate based on notification type
      if (data?.type === 'caregiver_request') {
        router.push('/(tabs)/caregiver');
      } else if (data?.type === 'caregiver_approved') {
        router.push('/(tabs)/caregiver');
      } else if (data?.type === 'dose_reminder' || data?.type === 'medication') {
        router.push('/(tabs)');
      }
    });

    // Cleanup
    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [router]);

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "white" },
          animation: "slide_from_right",
        }}
      >
        {/* Splash screen */}
        <Stack.Screen name="index" />
        
        {/* Auth group */}
        <Stack.Screen name="(auth)" />
        
        {/* Main tabs */}
        <Stack.Screen name="(tabs)" />

        {/* Profile screens */}
        <Stack.Screen name="(profile)" />
        
        {/* Other screens */}
       <Stack.Screen name="medications" />
  <Stack.Screen name="medications/[id]" />
      </Stack>
    </>
  );
}