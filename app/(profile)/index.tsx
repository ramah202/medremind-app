import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  StatusBar,
  ActivityIndicator,
  Modal,
  TextInput,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { API } from "../../services/api";

interface UserProfile {
  username: string;
  full_name: string;
  email: string;
  phone: string;
  gender: string;
  date_of_birth: string;
  is_active: boolean;
}
interface MenuItem {
  icon: string;
  label: string;
  route: string;
  color: string;
  isInfo?: boolean;
}

interface MenuSection {
  title: string;
  items: MenuItem[];
}

export default function ProfileScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  // Load profile every time screen is focused
  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [])
  );

  const loadProfile = async () => {
    try {
      setIsLoading(true);
      // First check if we have cached user data
      const cachedUser = await API.getStoredUser();
      
      if (cachedUser) {
        setProfile(cachedUser);
      }
      
      // Then fetch fresh data from backend
      const freshUserData = await API.getCurrentUser();
      setProfile(freshUserData);
      
    } catch (error: any) {
      console.error("Error loading profile:", error);
      
      // If unauthorized, redirect to login
      if (error.message === "No authentication token found" || 
          error.message?.includes("401") ||
          error.message?.includes("Unauthorized")) {
        Alert.alert(
          "Session Expired", 
          "Please login again to continue.",
          [{ text: "OK", onPress: () => router.replace("/(auth)/sign-in") }]
        );
      } else {
        Alert.alert("Error", "Failed to load profile. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      "Log Out", 
      "Are you sure you want to log out?", 
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Log Out",
          style: "destructive",
          onPress: async () => {
            try {
              
              await API.logout();
              router.replace("/(auth)/sign-in");
            } catch (error) {
              console.error("Logout error:", error);
              Alert.alert("Error", "Failed to logout. Please try again.");
            }
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    setConfirmText("");
    setShowDeleteModal(true);
  };

  const confirmDeleteAccount = async () => {
    if (confirmText !== "DELETE") {
      Alert.alert("Error", 'Please type "DELETE" to confirm account deletion');
      return;
    }

    setIsDeleting(true);
    try {
      
      await API.deactivateUser();
      Alert.alert(
        "Account Deleted",
        "Your account has been successfully deactivated. We're sorry to see you go!",
        [
          {
            text: "OK",
            onPress: async () => {
              await API.logout();
              router.replace("/(auth)/sign-in");
            },
          },
        ]
      );
    } catch (error: any) {
      console.error("Error deleting account:", error);
      Alert.alert(
        "Error",
        error.message || "Failed to delete account. Please try again."
      );
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
      setConfirmText("");
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "Not set";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Dismiss keyboard function
  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  const menuSections: MenuSection[] = [
    {
      title: "Personal Information",
      items: [
        {
          icon: "call-outline",
          label: `Phone: ${profile?.phone || "Not set"}`,
          route: "/(profile)/edit-profile",
          color: "#4CAF50",
          isInfo: true,
        },
        {
          icon: "calendar-outline",
          label: `Birthday: ${formatDate(profile?.date_of_birth || "")}`,
          route: "/(profile)/edit-profile",
          color: "#9C27B0",
          isInfo: true,
        },
        {
          icon: "transgender-outline",
          label: `Gender: ${profile?.gender || "Not set"}`,
          route: "/(profile)/edit-profile",
          color: "#FF5722",
          isInfo: true,
        },
      ],
    },
    {
      title: "Account",
      items: [
        {
          icon: "person-outline",
          label: "Edit Profile",
          route: "/(profile)/edit-profile",
          color: "#2196F3",
        },
        {
          icon: "lock-closed-outline",
          label: "Change Password",
          route: "/(profile)/change-password",
          color: "#FF9800",
        },
      ],
    },
    {
      title: "Devices",
      items: [
        {
          icon: "hardware-chip-outline",
          label: "Connected Devices",
          route: "/(profile)/devices",
          color: "#00BCD4",
        },
      ],
    },
  ];

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <LinearGradient
          colors={["#2196F3", "#1976D2"]}
          style={StyleSheet.absoluteFill}
        />
        <ActivityIndicator size="large" color="white" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.loadingContainer}>
        <LinearGradient
          colors={["#2196F3", "#1976D2"]}
          style={StyleSheet.absoluteFill}
        />
        <Text style={styles.loadingText}>Unable to load profile</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={loadProfile}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
   
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />

        <LinearGradient
          colors={["#2196F3", "#1976D2"]}
          style={styles.headerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        />

        <ScrollView 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
        >
          {/* Profile Header */}
          <View style={styles.profileHeader}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>

            <View style={styles.avatarContainer}>
              <Ionicons name="person-circle" size={100} color="white" />
            </View>

            <Text style={styles.profileName}>{profile.full_name}</Text>
            <Text style={styles.profileEmail}>@{profile.username}</Text>
            <Text style={styles.profileEmail}>{profile.email}</Text>
          </View>

          {/* Menu */}
          <View style={styles.menuContainer}>
            {menuSections.map((section, sectionIndex) => (
              <View key={section.title} style={styles.section}>
                <Text style={styles.sectionTitle}>{section.title}</Text>

                {section.items.map((item) => (
                  <TouchableOpacity
                    key={`${section.title}-${item.label}`}
                    style={styles.menuItem}
                    onPress={() => {
                      if (!item.isInfo) {
                        router.push(item.route as any);
                      }
                    }}
                    disabled={item.isInfo}
                  >
                    <View
                      style={[
                        styles.menuIcon,
                        { backgroundColor: `${item.color}15` },
                      ]}
                    >
                      <Ionicons
                        name={item.icon as any}
                        size={22}
                        color={item.color}
                      />
                    </View>

                    <Text style={[
                      styles.menuLabel,
                      item.isInfo && styles.infoText
                    ]}>
                      {item.label}
                    </Text>

                    {!item.isInfo && (
                      <Ionicons name="chevron-forward" size={20} color="#ccc" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            ))}

            {/* Account Status */}
            <View style={styles.statusContainer}>
              <Text style={styles.statusLabel}>Account Status:</Text>
              <View style={[
                styles.statusBadge,
                profile.is_active ? styles.activeBadge : styles.inactiveBadge
              ]}>
                <Text style={styles.statusText}>
                  {profile.is_active ? "Active" : "Inactive"}
                </Text>
              </View>
            </View>
            
            {/* Logout */}
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleLogout}
            >
              <View
                style={[
                  styles.menuIcon,
                  { backgroundColor: "#FF525215" },
                ]}
              >
                <Ionicons
                  name="log-out-outline"
                  size={22}
                  color="#FF5252"
                />
              </View>
              <Text style={[styles.menuLabel, styles.logoutText]}>
                Log Out
              </Text>
            </TouchableOpacity>

            {/* Delete Account Button */}
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={handleDeleteAccount}
            >
              <View
                style={[
                  styles.menuIcon,
                  { backgroundColor: "#FF525215" },
                ]}
              >
                <Ionicons
                  name="trash-outline"
                  size={22}
                  color="#FF5252"
                />
              </View>
              <Text style={[styles.menuLabel, styles.deleteText]}>
                Delete Account
              </Text>
              <Ionicons name="chevron-forward" size={20} color="#ccc" />
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Delete Account Confirmation Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={showDeleteModal}
          onRequestClose={() => setShowDeleteModal(false)}
        >
          
            <View style={styles.modalOverlay}>
              <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={styles.modalKeyboardView}
              >
                <View style={styles.modalContainer}>
                  <View style={styles.modalHeader}>
                    <Ionicons name="warning" size={40} color="#FF5252" />
                    <Text style={styles.modalTitle}>Delete Account</Text>
                    <Text style={styles.modalSubtitle}>
                      This action cannot be undone
                    </Text>
                  </View>

                  <ScrollView 
                    style={styles.modalScrollView}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                  >
                    <View style={styles.modalContent}>
                      <Text style={styles.warningText}>
                        Are you sure you want to delete your account? This will permanently:
                      </Text>
                      <View style={styles.warningList}>
                        <View style={styles.warningItem}>
                          <Ionicons name="close-circle" size={20} color="#FF5252" />
                          <Text style={styles.warningItemText}>Remove all your personal data</Text>
                        </View>
                        <View style={styles.warningItem}>
                          <Ionicons name="close-circle" size={20} color="#FF5252" />
                          <Text style={styles.warningItemText}>Delete your medication history</Text>
                        </View>
                        <View style={styles.warningItem}>
                          <Ionicons name="close-circle" size={20} color="#FF5252" />
                          <Text style={styles.warningItemText}>Deactivate your account access</Text>
                        </View>
                      </View>

                      <Text style={styles.confirmText}>
                        Type <Text style={styles.confirmHighlight}>DELETE</Text> to confirm
                      </Text>
                      
                      <TextInput
                        style={styles.confirmInput}
                        value={confirmText}
                        onChangeText={setConfirmText}
                        placeholder="Type DELETE here"
                        placeholderTextColor="#999"
                        autoCapitalize="characters"
                        editable={!isDeleting}
                        returnKeyType="done"
                        onSubmitEditing={dismissKeyboard}
                      />

                      <View style={styles.modalButtons}>
                        <TouchableOpacity
                          style={[styles.modalButton, styles.cancelButton]}
                          onPress={() => {
                            setShowDeleteModal(false);
                            setConfirmText("");
                            dismissKeyboard();
                          }}
                          disabled={isDeleting}
                        >
                          <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity
                          style={[
                            styles.modalButton,
                            styles.deleteConfirmButton,
                            (confirmText !== "DELETE" || isDeleting) && styles.disabledButton
                          ]}
                          onPress={confirmDeleteAccount}
                          disabled={confirmText !== "DELETE" || isDeleting}
                        >
                          <Text style={styles.deleteConfirmButtonText}>
                            {isDeleting ? "Deleting..." : "Delete Account"}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </ScrollView>
                </View>
              </KeyboardAvoidingView>
            </View>
         
        </Modal>
      </SafeAreaView>
    
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  scrollContent: {
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "white",
    fontSize: 16,
    marginTop: 10,
  },
  retryButton: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 20,
  },
  retryButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  headerGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 320,
  },
  backButton: {
    position: "absolute",
    top: 50,
    left: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profileHeader: {
    alignItems: "center",
    paddingTop: 80,
    paddingBottom: 30,
  },
  avatarContainer: {
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  profileName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
    marginBottom: 5,
    textShadowColor: "rgba(0, 0, 0, 0.1)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  profileEmail: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.9)",
    textShadowColor: "rgba(0, 0, 0, 0.05)",
    textShadowOffset: { width: 0.5, height: 0.5 },
    textShadowRadius: 2,
    marginBottom: 2,
  },
  menuContainer: {
    backgroundColor: "white",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 20,
    marginTop: 0,
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
    marginBottom: 15,
    marginLeft: 5,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  menuLabel: {
    flex: 1,
    fontSize: 16,
    color: "#333",
  },
  infoText: {
    color: "#666",
  },
  statusContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 15,
    marginTop: 10,
    paddingHorizontal: 5,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    backgroundColor: "#f8f9fa",
    borderRadius: 10,
    marginBottom: 10,
  },
  statusLabel: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeBadge: {
    backgroundColor: "#4CAF50",
  },
  inactiveBadge: {
    backgroundColor: "#FF5252",
  },
  statusText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    marginBottom: 10,
  },
  deleteText: {
    color: "#FF5252",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  logoutText: {
    color: "#FF5252",
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalKeyboardView: {
    width: "100%",
    alignItems: "center",
  },
  modalContainer: {
    backgroundColor: "white",
    borderRadius: 20,
    width: "90%",
    maxWidth: 400,
    maxHeight: "80%",
    overflow: "hidden",
  },
  modalScrollView: {
    maxHeight: "70%",
  },
  modalHeader: {
    backgroundColor: "#FFF3F3",
    padding: 20,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#FFE0E0",
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#FF5252",
    marginTop: 10,
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#666",
    marginTop: 5,
  },
  modalContent: {
    padding: 20,
  },
  warningText: {
    fontSize: 14,
    color: "#333",
    marginBottom: 15,
    fontWeight: "500",
  },
  warningList: {
    marginBottom: 20,
  },
  warningItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 10,
  },
  warningItemText: {
    flex: 1,
    fontSize: 14,
    color: "#666",
  },
  confirmText: {
    fontSize: 14,
    color: "#333",
    marginBottom: 10,
    textAlign: "center",
  },
  confirmHighlight: {
    fontWeight: "bold",
    color: "#FF5252",
  },
  confirmInput: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
    backgroundColor: "#f8f9fa",
  },
  modalButtons: {
    flexDirection: "row",
    gap: 10,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#f5f5f5",
  },
  cancelButtonText: {
    color: "#666",
    fontSize: 16,
    fontWeight: "500",
  },
  deleteConfirmButton: {
    backgroundColor: "#FF5252",
  },
  deleteConfirmButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  disabledButton: {
    opacity: 0.6,
  },
});