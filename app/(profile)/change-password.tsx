
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  StatusBar,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { KeyboardAvoidingView, Platform } from "react-native";
import { Keyboard, TouchableWithoutFeedback } from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { API } from "../../services/api";

export default function ChangePasswordScreen() {
  const router = useRouter();
  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleChangePassword = async () => {
    // Validate all fields are filled
    if (!form.currentPassword || !form.newPassword || !form.confirmPassword) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    // Validate new password length
    if (form.newPassword.length < 6) {
      Alert.alert("Error", "New password must be at least 6 characters long");
      return;
    }

    // Validate passwords match
    if (form.newPassword !== form.confirmPassword) {
      Alert.alert("Error", "New passwords do not match");
      return;
    }

    // Validate new password is different from current
    if (form.newPassword === form.currentPassword) {
      Alert.alert("Error", "New password must be different from current password");
      return;
    }

    setIsLoading(true);
    
    try {
   
      const updateData = {
        password: form.newPassword,
        password_confirmation: form.confirmPassword,
      };
      
      const updatedUser = await API.updateUser(updateData);
      
      Alert.alert(
        "Success", 
        "Your password has been changed successfully!",
        [
          { 
            text: "OK", 
            onPress: () => {
              // Clear the form and go back
              setForm({
                currentPassword: "",
                newPassword: "",
                confirmPassword: "",
              });
              router.back();
            } 
          }
        ]
      );
    } catch (error: any) {
      console.error("Error changing password:", error);
      
      // Handle specific error messages from backend
      if (error.message?.includes("password") || error.message?.includes("Password")) {
        Alert.alert("Error", error.message || "Failed to change password. Please check your input.");
      } else if (error.message?.includes("authentication") || error.message?.includes("token")) {
        Alert.alert(
          "Session Expired", 
          "Your session has expired. Please login again.",
          [{ text: "OK", onPress: () => router.replace("/(auth)/sign-in") }]
        );
      } else {
        Alert.alert("Error", "Failed to change password. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Password strength indicator
  const getPasswordStrength = () => {
    const password = form.newPassword;
    if (!password) return null;
    
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.match(/[a-z]/) && password.match(/[A-Z]/)) strength++;
    if (password.match(/[0-9]/)) strength++;
    if (password.match(/[^a-zA-Z0-9]/)) strength++;
    
    if (strength <= 1) return { text: "Weak", color: "#FF5252" };
    if (strength <= 2) return { text: "Fair", color: "#FF9800" };
    if (strength <= 3) return { text: "Good", color: "#4CAF50" };
    return { text: "Strong", color: "#2196F3" };
  };

  const passwordStrength = getPasswordStrength();
  const doPasswordsMatch = form.newPassword && form.confirmPassword && form.newPassword === form.confirmPassword;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={{ flex: 1 }}>
  

            <ScrollView 
              style={styles.scrollView}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              <View style={styles.formContainer}>
                {/* Info Card */}
                <View style={styles.infoCard}>
                  <Ionicons name="information-circle-outline" size={24} color="#2196F3" />
                  <Text style={styles.infoText}>
                    Password must be at least 6 characters long and should be different from your current password.
                  </Text>
                </View>

                {/* Current Password */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Current Password</Text>
                  <View style={styles.inputContainer}>
                    <Ionicons name="lock-closed-outline" size={20} color="#666" />
                    <TextInput
                      style={styles.input}
                      placeholder="Enter your current password"
                      placeholderTextColor="#999"
                      secureTextEntry={!showCurrent}
                      value={form.currentPassword}
                      onChangeText={(text) =>
                        setForm({ ...form, currentPassword: text })
                      }
                      editable={!isLoading}
                    />
                    <TouchableOpacity onPress={() => setShowCurrent(!showCurrent)} disabled={isLoading}>
                      <Ionicons
                        name={showCurrent ? "eye-off-outline" : "eye-outline"}
                        size={20}
                        color="#666"
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* New Password */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>New Password</Text>
                  <View style={styles.inputContainer}>
                    <Ionicons name="lock-closed-outline" size={20} color="#666" />
                    <TextInput
                      style={styles.input}
                      placeholder="Enter new password (min 6 characters)"
                      placeholderTextColor="#999"
                      secureTextEntry={!showNew}
                      value={form.newPassword}
                      onChangeText={(text) => setForm({ ...form, newPassword: text })}
                      editable={!isLoading}
                    />
                    <TouchableOpacity onPress={() => setShowNew(!showNew)} disabled={isLoading}>
                      <Ionicons
                        name={showNew ? "eye-off-outline" : "eye-outline"}
                        size={20}
                        color="#666"
                      />
                    </TouchableOpacity>
                  </View>
                  
                  {/* Password Strength Indicator */}
                  {form.newPassword.length > 0 && (
                    <View style={styles.strengthContainer}>
                      <View style={styles.strengthBar}>
                        <View 
                          style={[
                            styles.strengthFill, 
                            { 
                              width: passwordStrength ? 
                                (passwordStrength.text === "Weak" ? "25%" :
                                 passwordStrength.text === "Fair" ? "50%" :
                                 passwordStrength.text === "Good" ? "75%" : "100%") : "0%",
                              backgroundColor: passwordStrength?.color 
                            }
                          ]} 
                        />
                      </View>
                      <Text style={[styles.strengthText, { color: passwordStrength?.color }]}>
                        Password Strength: {passwordStrength?.text}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Confirm New Password */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Confirm New Password</Text>
                  <View style={[
                    styles.inputContainer,
                    form.confirmPassword.length > 0 && !doPasswordsMatch && styles.errorBorder
                  ]}>
                    <Ionicons name="lock-closed-outline" size={20} color="#666" />
                    <TextInput
                      style={styles.input}
                      placeholder="Confirm your new password"
                      placeholderTextColor="#999"
                      secureTextEntry={!showConfirm}
                      value={form.confirmPassword}
                      onChangeText={(text) =>
                        setForm({ ...form, confirmPassword: text })
                      }
                      editable={!isLoading}
                    />
                    <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)} disabled={isLoading}>
                      <Ionicons
                        name={showConfirm ? "eye-off-outline" : "eye-outline"}
                        size={20}
                        color="#666"
                      />
                    </TouchableOpacity>
                  </View>
                  
                  {/* Password Match Indicator */}
                  {form.confirmPassword.length > 0 && (
                    <View style={styles.matchContainer}>
                      <Ionicons 
                        name={doPasswordsMatch ? "checkmark-circle" : "close-circle"} 
                        size={16} 
                        color={doPasswordsMatch ? "#4CAF50" : "#FF5252"} 
                      />
                      <Text style={[
                        styles.matchText,
                        doPasswordsMatch ? styles.matchSuccess : styles.matchError
                      ]}>
                        {doPasswordsMatch ? "Passwords match" : "Passwords do not match"}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Requirements List */}
                <View style={styles.requirementsContainer}>
                  <Text style={styles.requirementsTitle}>Password Requirements:</Text>
                  <View style={styles.requirementItem}>
                    <Ionicons 
                      name={form.newPassword.length >= 6 ? "checkmark-circle" : "ellipse-outline"} 
                      size={16} 
                      color={form.newPassword.length >= 6 ? "#4CAF50" : "#999"} 
                    />
                    <Text style={styles.requirementText}>At least 6 characters long</Text>
                  </View>
                  <View style={styles.requirementItem}>
                    <Ionicons 
                      name={form.newPassword !== form.currentPassword && form.newPassword.length > 0 ? "checkmark-circle" : "ellipse-outline"} 
                      size={16} 
                      color={form.newPassword !== form.currentPassword && form.newPassword.length > 0 ? "#4CAF50" : "#999"} 
                    />
                    <Text style={styles.requirementText}>Different from current password</Text>
                  </View>
                  <View style={styles.requirementItem}>
                    <Ionicons 
                      name={doPasswordsMatch && form.confirmPassword.length > 0 ? "checkmark-circle" : "ellipse-outline"} 
                      size={16} 
                      color={doPasswordsMatch && form.confirmPassword.length > 0 ? "#4CAF50" : "#999"} 
                    />
                    <Text style={styles.requirementText}>Passwords match</Text>
                  </View>
                </View>

                {/* Change Password Button */}
                <TouchableOpacity
                  style={[
                    styles.changeButton,
                    (isLoading || !form.currentPassword || !form.newPassword || !form.confirmPassword || !doPasswordsMatch) && styles.disabledButton
                  ]}
                  onPress={handleChangePassword}
                  disabled={isLoading || !form.currentPassword || !form.newPassword || !form.confirmPassword || !doPasswordsMatch}
                >
                  <Text style={styles.changeButtonText}>
                    {isLoading ? "Changing Password..." : "Change Password"}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 15,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#333",
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  formContainer: {
    padding: 20,
  },
  infoCard: {
    flexDirection: "row",
    backgroundColor: "#E3F2FD",
    padding: 15,
    borderRadius: 12,
    marginBottom: 25,
    alignItems: "center",
  },
  infoText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 13,
    color: "#1976D2",
    lineHeight: 18,
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
    backgroundColor: "white",
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
  errorBorder: {
    borderColor: "#FF5252",
  },
  strengthContainer: {
    marginTop: 8,
  },
  strengthBar: {
    height: 4,
    backgroundColor: "#e0e0e0",
    borderRadius: 2,
    overflow: "hidden",
  },
  strengthFill: {
    height: "100%",
    borderRadius: 2,
  },
  strengthText: {
    fontSize: 12,
    marginTop: 5,
  },
  matchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    gap: 5,
  },
  matchText: {
    fontSize: 12,
  },
  matchSuccess: {
    color: "#4CAF50",
  },
  matchError: {
    color: "#FF5252",
  },
  requirementsContainer: {
    backgroundColor: "#f5f5f5",
    padding: 15,
    borderRadius: 12,
    marginTop: 10,
    marginBottom: 20,
  },
  requirementsTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#666",
    marginBottom: 8,
  },
  requirementItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 5,
  },
  requirementText: {
    fontSize: 12,
    color: "#666",
  },
  changeButton: {
    backgroundColor: "#2196F3",
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 20,
  },
  changeButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  disabledButton: {
    opacity: 0.6,
  },
});