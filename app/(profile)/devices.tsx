
// app/profile/devices.tsx (UPDATED VERSION)
import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { DeviceAPI } from "../../services/deviceAPI";

interface Device {
  id: number;
  patient_id: number;
  device_uid: string;
  device_name: string;
  is_connected: boolean;
  created_at: string;
  updated_at: string;
}

export default function DevicesScreen() {
  const router = useRouter();
  const [device, setDevice] = useState<Device | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updating, setUpdating] = useState(false);

  const loadDevice = async () => {
    try {
      setLoading(true);
      const devices = await DeviceAPI.getAll();
      
      // Filter devices for current user (backend already does this, but double-check)
      if (devices && devices.length > 0) {
        setDevice(devices[0]);
      } else {
        setDevice(null);
      }
    } catch (error: any) {
      console.error("Error loading device:", error);
      if (error.message?.includes("401")) {
        router.replace("/(auth)/sign-in");
      }
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadDevice();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDevice();
    setRefreshing(false);
  };

  const editDevice = () => {
    if (!device) return;
    
    router.push({
      pathname: "/(profile)/edit-device",
      params: {
        id: device.id,
        name: device.device_name,
        uid: device.device_uid,
      },
    });
  };

  const removeDevice = () => {
    if (!device) return;
    
    Alert.alert(
      "Remove Device",
      "Are you sure you want to remove this device? You will need to add it again later.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            setUpdating(true);
            try {
              await DeviceAPI.delete(device.id);
              setDevice(null);
              Alert.alert("Success", "Device removed successfully");
              loadDevice(); // Refresh the list
            } catch (error: any) {
              console.error("Error removing device:", error);
              Alert.alert("Error", error.message || "Failed to remove device");
            } finally {
              setUpdating(false);
            }
          },
        },
      ]
    );
  };

  const navigateToAddDevice = () => {
    router.push("/(profile)/add-device");
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Loading device info...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#2196F3"]} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerText}>Device</Text>
        {!device && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={navigateToAddDevice}
          >
            <Ionicons name="add-circle" size={20} color="white" />
            <Text style={styles.addButtonText}>Add Device</Text>
          </TouchableOpacity>
        )}
      </View>

      {!device ? (
        <View style={styles.emptyState}>
          <Ionicons name="hardware-chip-outline" size={80} color="#ccc" />
          <Text style={styles.emptyStateTitle}>No Device Connected</Text>
          <Text style={styles.emptyStateText}>
            Tap the "Add Device" button to register your Smart Pill Dispenser
          </Text>
          <TouchableOpacity
            style={styles.emptyAddButton}
            onPress={navigateToAddDevice}
          >
            <Text style={styles.emptyAddButtonText}>Add Device</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.deviceCard}>
          <View style={styles.deviceIcon}>
            <Ionicons name="hardware-chip" size={32} color="#2196F3" />
          </View>
          
          <View style={styles.deviceInfo}>
            <Text style={styles.deviceName}>{device.device_name}</Text>
            <Text style={styles.deviceUid}>UID: {device.device_uid}</Text>
            
            <View style={styles.deviceStatus}>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: device.is_connected ? "#4CAF50" : "#FF9800" },
                ]}
              />
              <Text style={styles.statusText}>
                {device.is_connected ? "Connected" : "Pending Connection"}
              </Text>
            </View>
            
            <View style={styles.deviceDetails}>
              <Ionicons name="calendar-outline" size={14} color="#666" />
              <Text style={styles.detailText}>
                Added: {formatDate(device.created_at)}
              </Text>
            </View>
          </View>
          
          <View style={styles.deviceActions}>
            <TouchableOpacity
              onPress={editDevice}
              style={styles.editButton}
              disabled={updating}
            >
              <Ionicons name="create-outline" size={22} color="#2196F3" />
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={removeDevice}
              style={styles.removeButton}
              disabled={updating}
            >
              <Ionicons name="trash-outline" size={22} color="#FF5252" />
            </TouchableOpacity>
          </View>
        </View>
      )}
      
      {/* Info Section */}
      <View style={styles.infoSection}>
        <Text style={styles.infoTitle}>About Your Device</Text>
        <View style={styles.infoItem}>
          <Ionicons name="information-circle-outline" size={20} color="#2196F3" />
          <Text style={styles.infoText}>
            The Smart Pill Dispenser will automatically dispense medications assigned to boxes.
          </Text>
        </View>
        <View style={styles.infoItem}>
          <Ionicons name="notifications-outline" size={20} color="#2196F3" />
          <Text style={styles.infoText}>
            You'll receive notifications when medication is dispensed or when the device needs attention.
          </Text>
        </View>
        <View style={styles.infoItem}>
          <Ionicons name="wifi-outline" size={20} color="#2196F3" />
          <Text style={styles.infoText}>
            Make sure your device is connected to WiFi and powered on.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  headerText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2196F3",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  addButtonText: {
    color: "white",
    fontWeight: "500",
  },
  deviceCard: {
    flexDirection: "row",
    backgroundColor: "white",
    marginHorizontal: 20,
    marginTop: 15,
    padding: 15,
    borderRadius: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  deviceIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#E3F2FD",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  deviceUid: {
    fontSize: 11,
    color: "#999",
    marginBottom: 6,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  deviceStatus: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    color: "#666",
  },
  deviceDetails: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 4,
  },
  detailText: {
    fontSize: 11,
    color: "#999",
  },
  deviceActions: {
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 15,
    flexDirection: "row",
  },
  editButton: {
    padding: 5,
  },
  removeButton: {
    padding: 5,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#333",
    marginTop: 20,
  },
  emptyStateText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginTop: 10,
    marginBottom: 20,
  },
  emptyAddButton: {
    backgroundColor: "#2196F3",
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 25,
  },
  emptyAddButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  infoSection: {
    backgroundColor: "white",
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 30,
    padding: 20,
    borderRadius: 15,
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
  infoItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 15,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: "#666",
    lineHeight: 18,
  },
});