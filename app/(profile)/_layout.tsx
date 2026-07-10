// app/profile/_layout.tsx
import { Stack } from "expo-router";

export default function ProfileLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: "#2196F3",
        },
        headerTintColor: "white",
        headerTitleStyle: {
          fontWeight: "600",
        },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "Profile",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="edit-profile"
        options={{
          title: "Edit Profile",
        }}
      />
      <Stack.Screen
        name="change-password"
        options={{
          title: "Change Password",
        }}
      />
      <Stack.Screen
        name="devices"
        options={{
          title: "Connected Devices",
        }}
      />
        <Stack.Screen
        name="scan-device"
        options={{
          title: "Scan for Devices",
          headerShown: false, // We hide the header because we have our own custom header in the scan screen
        }}/>
      <Stack.Screen
        name="settings"
        options={{
          title: "Settings",
        }}
      />
      <Stack.Screen
        name="help"
        options={{
          title: "Help & Support",
        }}
      />
    </Stack>
  );
}