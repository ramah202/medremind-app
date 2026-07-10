// app/profile/edit-device.tsx (FIXED VERSION)
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { DeviceAPI } from "../../services/deviceAPI";

export default function EditDeviceScreen() {
  const router = useRouter();
  const { id, name, uid } = useLocalSearchParams();
  const [deviceName, setDeviceName] = useState<string>(
  typeof name === "string" ? name : ""
);
  const [isLoading, setIsLoading] = useState(false);

  const handleUpdateDevice = async () => {
    // Safe validation with null check
    if (!deviceName || deviceName.trim() === "") {
      Alert.alert("Error", "Please enter a device name");
      return;
    }

    setIsLoading(true);
    try {
      await DeviceAPI.update(Number(id), {
        device_name: deviceName.trim(),
      });

      Alert.alert("Success", "Device updated successfully", [
        { text: "OK", onPress: () => router.back() }
      ]);
    } catch (error: any) {
      console.error("Error updating device:", error);
      Alert.alert("Error", error.message || "Failed to update device");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#2196F3", "#1976D2"]}
        style={styles.headerGradient}
      />

      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Device</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.card}>
          <Ionicons name="hardware-chip-outline" size={60} color="#2196F3" />
          <Text style={styles.cardTitle}>Edit Device Information</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Device UID:</Text>
            <Text style={styles.infoValue}>{uid || "N/A"}</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Device Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter device name"
              placeholderTextColor="#999"
              value={deviceName}
              onChangeText={setDeviceName}
            />
          </View>

          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleUpdateDevice}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.saveButtonText}>Save Changes</Text>
            )}
          </TouchableOpacity>
        </View>
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
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    marginBottom: 20,
  },
  infoLabel: {
    fontSize: 14,
    color: "#666",
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
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
    width: "100%",
  },
  saveButton: {
    backgroundColor: "#2196F3",
    paddingHorizontal: 30,
    paddingVertical: 14,
    borderRadius: 25,
    width: "100%",
    alignItems: "center",
    marginTop: 10,
  },
  saveButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});