// app/profile/add-device.tsx (FIXED VERSION)
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { DeviceAPI } from "../../services/deviceAPI";

export default function AddDeviceScreen() {
  const router = useRouter();
  const [deviceUID, setDeviceUID] = useState("");
  const [deviceName, setDeviceName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleAddDevice = async () => {
    // Validate inputs
    if (!deviceUID.trim()) {
      Alert.alert("Error", "Please enter a valid Device UID");
      return;
    }

    if (!deviceName.trim()) {
      Alert.alert("Error", "Please enter a device name");
      return;
    }

    setIsLoading(true);
    try {
      const newDevice = await DeviceAPI.create({
        device_uid: deviceUID.trim(),
        device_name: deviceName.trim(),
        is_connected: false,
      });

      Alert.alert(
        "Success",
        `Device "${deviceName}" added successfully!`,
        [{ text: "OK", onPress: () => router.back() }]
      );
    } catch (error: any) {
      console.error("Error adding device:", error);
      Alert.alert("Error", error.message || "Failed to add device");
    } finally {
      setIsLoading(false);
    }
  };

  // Helper component for step numbers
  const StepNumber = ({ number, text }: { number: number; text: string }) => (
    <View style={styles.instructionItem}>
      <View style={styles.stepCircle}>
        <Text style={styles.stepText}>{number}</Text>
      </View>
      <Text style={styles.instructionText}>{text}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#2196F3", "#1976D2"]}
        style={styles.headerGradient}
      />

      <View style={styles.content}>

        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.card}>
            <Ionicons name="hardware-chip-outline" size={60} color="#2196F3" />
            <Text style={styles.cardTitle}>Connect Your Smart Pill Dispenser</Text>
            <Text style={styles.cardText}>
              Enter the device UID shown on your device's screen or in the serial monitor.
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Device UID *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., DEVICE_001"
                placeholderTextColor="#999"
                value={deviceUID}
                onChangeText={setDeviceUID}
                autoCapitalize="characters"
              />
              <Text style={styles.hint}>
                This is the unique identifier from your ESP32 device
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Device Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Smart Pill Dispenser"
                placeholderTextColor="#999"
                value={deviceName}
                onChangeText={setDeviceName}
              />
            </View>

            <TouchableOpacity
              style={styles.addButton}
              onPress={handleAddDevice}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.addButtonText}>Add Device</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Info Section - Fixed Icons */}
          <View style={styles.infoSection}>
            <Text style={styles.infoTitle}>How to find your Device UID?</Text>
            
            <StepNumber number={1} text="Connect your ESP32 to your computer via USB" />
            <StepNumber number={2} text="Open the Serial Monitor in Arduino IDE" />
            <StepNumber number={3} text='Look for the line: "Device UID: DEVICE_XXX"' />
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  headerGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: Platform.OS === "ios" ? 140 : 120,
  },
  content: {
    flex: 1,
    paddingTop: Platform.OS === "ios" ? 50 : 30,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "white",
  },
  card: {
    backgroundColor: "white",
    margin: 20,
    padding: 25,
    borderRadius: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginTop: 15,
    marginBottom: 10,
  },
  cardText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 25,
    lineHeight: 20,
  },
  inputGroup: {
    width: "100%",
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#f5f5f5",
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  hint: {
    fontSize: 11,
    color: "#999",
    marginTop: 5,
  },
  addButton: {
    backgroundColor: "#2196F3",
    paddingHorizontal: 30,
    paddingVertical: 14,
    borderRadius: 25,
    width: "100%",
    alignItems: "center",
    marginTop: 10,
  },
  addButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  infoSection: {
    backgroundColor: "white",
    marginHorizontal: 20,
    marginBottom: 30,
    padding: 20,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 15,
  },
  instructionItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  stepCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#2196F3",
    justifyContent: "center",
    alignItems: "center",
  },
  stepText: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
  },
  instructionText: {
    flex: 1,
    fontSize: 13,
    color: "#666",
  },
});