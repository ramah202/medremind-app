import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  StatusBar,
  ActivityIndicator,
  Modal,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAvoidingView, Platform } from "react-native";
import DateTimePicker from '@react-native-community/datetimepicker';
import { API } from "../../services/api";

const { width } = Dimensions.get("window");

export default function EditProfileScreen() {
  const router = useRouter();
  const [form, setForm] = useState({
    full_name: "",
    username: "",
    email: "",
    phone: "",
    gender: "",
    date_of_birth: "",
  });
  const [originalForm, setOriginalForm] = useState({
    full_name: "",
    username: "",
    email: "",
    phone: "",
    gender: "",
    date_of_birth: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  
  // Date picker modal state
  const [showDatePickerModal, setShowDatePickerModal] = useState(false);
  const [tempSelectedDate, setTempSelectedDate] = useState(new Date());

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setIsFetching(true);
      // First get cached user data
      const cachedUser = await API.getStoredUser();
      
      if (cachedUser) {
        const userData = {
          full_name: cachedUser.full_name || "",
          username: cachedUser.username || "",
          email: cachedUser.email || "",
          phone: cachedUser.phone || "",
          gender: cachedUser.gender || "",
          date_of_birth: cachedUser.date_of_birth || "",
        };
        setForm(userData);
        setOriginalForm(userData);
        
        if (cachedUser.date_of_birth) {
          setTempSelectedDate(new Date(cachedUser.date_of_birth));
        }
      }
      
      // Fetch fresh data from backend
      const freshUser = await API.getCurrentUser();
      const userData = {
        full_name: freshUser.full_name || "",
        username: freshUser.username || "",
        email: freshUser.email || "",
        phone: freshUser.phone || "",
        gender: freshUser.gender || "",
        date_of_birth: freshUser.date_of_birth || "",
      };
      setForm(userData);
      setOriginalForm(userData);
      
      if (freshUser.date_of_birth) {
        setTempSelectedDate(new Date(freshUser.date_of_birth));
      }
    } catch (error: any) {
      console.error("Error loading profile:", error);
      Alert.alert("Error", "Failed to load profile data");
      
      // If unauthorized, redirect to login
      if (error.message === "No authentication token found" || 
          error.message?.includes("401")) {
        Alert.alert(
          "Session Expired", 
          "Please login again to continue.",
          [{ text: "OK", onPress: () => router.replace("/(auth)/sign-in") }]
        );
      }
    } finally {
      setIsFetching(false);
    }
  };

  const handleSave = async () => {
    // Prepare only changed fields
    const updatedData: any = {};
    
    if (form.full_name !== originalForm.full_name && form.full_name) {
      updatedData.full_name = form.full_name;
    }
    if (form.username !== originalForm.username && form.username) {
      updatedData.username = form.username;
    }
    if (form.email !== originalForm.email && form.email) {
      if (!isValidEmail(form.email)) {
        Alert.alert("Error", "Please enter a valid email address");
        return;
      }
      updatedData.email = form.email;
    }
    if (form.phone !== originalForm.phone && form.phone) {
      if (!isValidPhone(form.phone)) {
        Alert.alert("Error", "Please enter a valid phone number (numbers only, + optional)");
        return;
      }
      updatedData.phone = form.phone;
    }
    if (form.gender !== originalForm.gender && form.gender) {
      if (!['MALE', 'FEMALE'].includes(form.gender)) {
        Alert.alert("Error", "Gender must be MALE or FEMALE");
        return;
      }
      updatedData.gender = form.gender;
    }
    if (form.date_of_birth !== originalForm.date_of_birth && form.date_of_birth) {
      updatedData.date_of_birth = form.date_of_birth;
    }

    if (Object.keys(updatedData).length === 0) {
      Alert.alert("Info", "No changes to save");
      return;
    }

    setIsLoading(true);
    try {
      const updatedUser = await API.updateUser(updatedData);
      Alert.alert("Success", "Profile updated successfully", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error: any) {
      console.error("Error updating profile:", error);
      Alert.alert("Error", error.message || "Failed to update profile");
    } finally {
      setIsLoading(false);
    }
  };

  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const isValidPhone = (phone: string) => {
    const phoneRegex = /^[\+]?[0-9]+$/;
    return phoneRegex.test(phone);
  };

  const formatDateForDisplay = (dateString: string) => {
    if (!dateString) return "Select your date of birth";
    const parts = dateString.split('-');
    if (parts.length === 3) {
      const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    }
    return dateString;
  };

  // Open date picker modal
  const openDatePicker = () => {
    setTempSelectedDate(form.date_of_birth ? new Date(form.date_of_birth) : new Date());
    setShowDatePickerModal(true);
  };

  // Confirm date selection
  const confirmDateSelection = () => {
    const year = tempSelectedDate.getFullYear();
    const month = String(tempSelectedDate.getMonth() + 1).padStart(2, '0');
    const day = String(tempSelectedDate.getDate()).padStart(2, '0');
    const formattedDate = `${year}-${month}-${day}`;
    setForm({ ...form, date_of_birth: formattedDate });
    setShowDatePickerModal(false);
  };

  // Cancel date selection
  const cancelDateSelection = () => {
    setShowDatePickerModal(false);
  };

  const hasChanges = () => {
    return form.full_name !== originalForm.full_name ||
           form.username !== originalForm.username ||
           form.email !== originalForm.email ||
           form.phone !== originalForm.phone ||
           form.gender !== originalForm.gender ||
           form.date_of_birth !== originalForm.date_of_birth;
  };

  if (isFetching) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView
        style={{ flex: 1}}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Current Info Card */}
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Current Information</Text>
            <View style={styles.infoRow}>
              <Ionicons name="person-outline" size={20} color="#2196F3" />
              <Text style={styles.infoLabel}>Full Name:</Text>
              <Text style={styles.infoValue}>{originalForm.full_name || "Not set"}</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="at-outline" size={20} color="#2196F3" />
              <Text style={styles.infoLabel}>Username:</Text>
              <Text style={styles.infoValue}>{originalForm.username || "Not set"}</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="mail-outline" size={20} color="#2196F3" />
              <Text style={styles.infoLabel}>Email:</Text>
              <Text style={styles.infoValue}>{originalForm.email || "Not set"}</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="call-outline" size={20} color="#2196F3" />
              <Text style={styles.infoLabel}>Phone:</Text>
              <Text style={styles.infoValue}>{originalForm.phone || "Not set"}</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="transgender-outline" size={20} color="#2196F3" />
              <Text style={styles.infoLabel}>Gender:</Text>
              <Text style={styles.infoValue}>{originalForm.gender || "Not set"}</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="calendar-outline" size={20} color="#2196F3" />
              <Text style={styles.infoLabel}>Birthday:</Text>
              <Text style={styles.infoValue}>{formatDateForDisplay(originalForm.date_of_birth)}</Text>
            </View>
          </View>

          {/* Edit Form */}
          <View style={styles.formContainer}>
            <Text style={styles.editTitle}>Edit Information</Text>
            <Text style={styles.editSubtitle}>Update the fields you want to change</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Name</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="person-outline" size={20} color="#666" />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your full name"
                  placeholderTextColor="#999"
                  value={form.full_name}
                  onChangeText={(text) => setForm({ ...form, full_name: text })}
                  editable={!isLoading}
                />
                {form.full_name !== originalForm.full_name && originalForm.full_name && (
                  <View style={styles.changedBadge}>
                    <Text style={styles.changedText}>Changed</Text>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Username</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="at-outline" size={20} color="#666" />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your username"
                  placeholderTextColor="#999"
                  autoCapitalize="none"
                  value={form.username}
                  onChangeText={(text) => setForm({ ...form, username: text })}
                  editable={!isLoading}
                />
                {form.username !== originalForm.username && originalForm.username && (
                  <View style={styles.changedBadge}>
                    <Text style={styles.changedText}>Changed</Text>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="mail-outline" size={20} color="#666" />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your email"
                  placeholderTextColor="#999"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={form.email}
                  onChangeText={(text) => setForm({ ...form, email: text })}
                  editable={!isLoading}
                />
                {form.email !== originalForm.email && originalForm.email && (
                  <View style={styles.changedBadge}>
                    <Text style={styles.changedText}>Changed</Text>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone Number</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="call-outline" size={20} color="#666" />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your phone number"
                  placeholderTextColor="#999"
                  keyboardType="phone-pad"
                  value={form.phone}
                  onChangeText={(text) => setForm({ ...form, phone: text })}
                  editable={!isLoading}
                />
                {form.phone !== originalForm.phone && originalForm.phone && (
                  <View style={styles.changedBadge}>
                    <Text style={styles.changedText}>Changed</Text>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Gender</Text>
              <View style={styles.genderContainer}>
                <TouchableOpacity
                  style={[
                    styles.genderButton,
                    form.gender === 'MALE' && styles.genderButtonActive
                  ]}
                  onPress={() => setForm({ ...form, gender: 'MALE' })}
                  disabled={isLoading}
                >
                  <Text style={[
                    styles.genderButtonText,
                    form.gender === 'MALE' && styles.genderButtonTextActive
                  ]}>Male</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.genderButton,
                    form.gender === 'FEMALE' && styles.genderButtonActive
                  ]}
                  onPress={() => setForm({ ...form, gender: 'FEMALE' })}
                  disabled={isLoading}
                >
                  <Text style={[
                    styles.genderButtonText,
                    form.gender === 'FEMALE' && styles.genderButtonTextActive
                  ]}>Female</Text>
                </TouchableOpacity>
              </View>
              {form.gender !== originalForm.gender && originalForm.gender && (
                <View style={styles.changedBadgeInline}>
                  <Text style={styles.changedText}>Changed</Text>
                </View>
              )}
            </View>

            {/* Date of Birth Picker - Improved with Modal */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Date of Birth</Text>
              <TouchableOpacity
                style={styles.inputContainer}
                onPress={openDatePicker}
                disabled={isLoading}
              >
                <Ionicons name="calendar-outline" size={20} color="#666" />
                <Text style={[
                  styles.dateText,
                  !form.date_of_birth && styles.placeholderText
                ]}>
                  {formatDateForDisplay(form.date_of_birth)}
                </Text>
                <Ionicons name="chevron-forward" size={20} color="#999" />
              </TouchableOpacity>
              {form.date_of_birth !== originalForm.date_of_birth && originalForm.date_of_birth && (
                <View style={styles.changedBadgeInline}>
                  <Text style={styles.changedText}>Changed</Text>
                </View>
              )}
            </View>

            {/* Save Button */}
            <TouchableOpacity
              style={[
                styles.saveButton,
                (!hasChanges() || isLoading) && styles.disabledButton,
              ]}
              onPress={handleSave}
              disabled={!hasChanges() || isLoading}
            >
              <Text style={styles.saveButtonText}>
                {isLoading ? "Saving..." : hasChanges() ? "Save Changes" : "No Changes"}
              </Text>
            </TouchableOpacity>

            {/* Reset Button */}
            {hasChanges() && (
              <TouchableOpacity
                style={styles.resetButton}
                onPress={() => {
                  setForm({
                    full_name: originalForm.full_name,
                    username: originalForm.username,
                    email: originalForm.email,
                    phone: originalForm.phone,
                    gender: originalForm.gender,
                    date_of_birth: originalForm.date_of_birth,
                  });
                  if (originalForm.date_of_birth) {
                    setTempSelectedDate(new Date(originalForm.date_of_birth));
                  }
                }}
                disabled={isLoading}
              >
                <Text style={styles.resetButtonText}>Reset Changes</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Date Picker Modal - Same as Sign Up page */}
      <Modal
        visible={showDatePickerModal}
        transparent={true}
        animationType="slide"
        onRequestClose={cancelDateSelection}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Date of Birth</Text>
              <TouchableOpacity onPress={cancelDateSelection}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <DateTimePicker
              value={tempSelectedDate}
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "calendar"}
              onChange={(event, date) => {
                if (event.type === "set" && date) {
                  setTempSelectedDate(date);
                }
              }}
              maximumDate={new Date()}
              textColor="#2196F3"
              themeVariant="light"
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelModalButton]}
                onPress={cancelDateSelection}
              >
                <Text style={styles.cancelModalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmModalButton]}
                onPress={confirmDateSelection}
              >
                <Text style={styles.confirmModalButtonText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  infoCard: {
    backgroundColor: "white",
    margin: 20,
    marginBottom: 0,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
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
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#666",
    marginLeft: 10,
    width: 80,
  },
  infoValue: {
    flex: 1,
    fontSize: 14,
    color: "#333",
    marginLeft: 5,
  },
  formContainer: {
    backgroundColor: "white",
    margin: 20,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  editTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 5,
  },
  editSubtitle: {
    fontSize: 13,
    color: "#666",
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    paddingHorizontal: 15,
    height: 50,
  },
  input: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: "#333",
  },
  dateText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: "#333",
  },
  placeholderText: {
    color: "#999",
  },
  changedBadge: {
    backgroundColor: "#2196F315",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  changedBadgeInline: {
    backgroundColor: "#2196F315",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 8,
    alignSelf: "flex-start",
  },
  changedText: {
    fontSize: 10,
    color: "#2196F3",
    fontWeight: "500",
  },
  genderContainer: {
    flexDirection: "row",
    gap: 10,
  },
  genderButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#f8f9fa",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  genderButtonActive: {
    backgroundColor: "#2196F3",
    borderColor: "#2196F3",
  },
  genderButtonText: {
    fontSize: 16,
    color: "#666",
    fontWeight: "500",
  },
  genderButtonTextActive: {
    color: "white",
  },
  saveButton: {
    backgroundColor: "#2196F3",
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
  },
  saveButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  resetButton: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
    backgroundColor: "#f5f5f5",
  },
  resetButtonText: {
    color: "#666",
    fontSize: 14,
    fontWeight: "500",
  },
  disabledButton: {
    opacity: 0.6,
  },
  // Modal Styles (same as Sign Up page)
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
    width: width - 40,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  modalButtons: {
    flexDirection: "row",
    gap: 10,
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  cancelModalButton: {
    backgroundColor: "#f5f5f5",
  },
  cancelModalButtonText: {
    color: "#666",
    fontSize: 16,
    fontWeight: "500",
  },
  confirmModalButton: {
    backgroundColor: "#2196F3",
  },
  confirmModalButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});