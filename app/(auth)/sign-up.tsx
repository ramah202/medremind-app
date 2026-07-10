import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Modal,
} from "react-native";
import { useRouter, Link } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import DateTimePicker from '@react-native-community/datetimepicker';
import { API } from "../../services/api";

const { width } = Dimensions.get("window");

export default function SignUpScreen() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    username: "",
    full_name: "",
    email: "",
    password: "",
    password_confirmation: "",
    phone: "",
    gender: "",
    date_of_birth: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Improved date picker modal
  const [showDatePickerModal, setShowDatePickerModal] = useState(false);
  const [tempSelectedDate, setTempSelectedDate] = useState(new Date());

  const handleSignUp = async () => {
    // Basic validation
    if (!formData.username || !formData.full_name || !formData.email || 
        !formData.password || !formData.password_confirmation || !formData.phone || 
        !formData.gender || !formData.date_of_birth) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    if (!isValidEmail(formData.email)) {
      Alert.alert("Error", "Please enter a valid email address");
      return;
    }

    if (formData.password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters long");
      return;
    }

    if (formData.password !== formData.password_confirmation) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    if (!isValidPhone(formData.phone)) {
      Alert.alert("Error", "Please enter a valid phone number (numbers only, + optional)");
      return;
    }

    if (!['MALE', 'FEMALE'].includes(formData.gender)) {
      Alert.alert("Error", "Gender must be MALE or FEMALE");
      return;
    }

    setIsLoading(true);

    try {
      // Prepare data for backend
      const userData = {
        username: formData.username,
        full_name: formData.full_name,
        email: formData.email,
        password: formData.password,
        password_confirmation: formData.password_confirmation,
        phone: formData.phone,
        gender: formData.gender,
        date_of_birth: formData.date_of_birth,
      };

      const response = await API.register(userData);
      
      console.log("Registration successful:", response);
      
      Alert.alert(
        "Success", 
        "Account created successfully! Please sign in.",
        [{ text: "OK", onPress: () => router.push("/(auth)/sign-in") }]
      );
    } catch (error: any) {
      console.error("Sign up error:", error);
      Alert.alert(
        "Registration Failed",
        error?.message || "Failed to create account. Please try again."
      );
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

  // Open date picker modal
  const openDatePicker = () => {
    setTempSelectedDate(new Date());
    setShowDatePickerModal(true);
  };

  // Confirm date selection
  const confirmDateSelection = () => {
    const year = tempSelectedDate.getFullYear();
    const month = String(tempSelectedDate.getMonth() + 1).padStart(2, '0');
    const day = String(tempSelectedDate.getDate()).padStart(2, '0');
    const formattedDate = `${year}-${month}-${day}`;
    setFormData({ ...formData, date_of_birth: formattedDate });
    setShowDatePickerModal(false);
  };

  return (
    <LinearGradient colors={["#2196F3", "#1976D2"]} style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>

            <View style={styles.iconContainer}>
              <Ionicons name="medical" size={60} color="white" />
            </View>

            <Text style={styles.title}>Create an Account</Text>
            <Text style={styles.subtitle}>Join us to get started!</Text>

            <View style={styles.card}>
              {/* Username Input */}
              <View style={styles.inputContainer}>
                <Ionicons name="person-outline" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Username"
                  placeholderTextColor="#999"
                  value={formData.username}
                  onChangeText={(text) => setFormData({ ...formData, username: text })}
                  autoCapitalize="none"
                  editable={!isLoading}
                />
              </View>

              {/* Full Name Input */}
              <View style={styles.inputContainer}>
                <Ionicons name="people-outline" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Full Name"
                  placeholderTextColor="#999"
                  value={formData.full_name}
                  onChangeText={(text) => setFormData({ ...formData, full_name: text })}
                  editable={!isLoading}
                />
              </View>

              {/* Email Input */}
              <View style={styles.inputContainer}>
                <Ionicons name="mail-outline" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  placeholderTextColor="#999"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={formData.email}
                  onChangeText={(text) => setFormData({ ...formData, email: text })}
                  editable={!isLoading}
                />
              </View>

              {/* Phone Input */}
              <View style={styles.inputContainer}>
                <Ionicons name="call-outline" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Phone Number (e.g., +1234567890)"
                  placeholderTextColor="#999"
                  keyboardType="phone-pad"
                  value={formData.phone}
                  onChangeText={(text) => setFormData({ ...formData, phone: text })}
                  editable={!isLoading}
                />
              </View>

              {/* Gender Selection */}
              <View style={styles.genderContainer}>
                <Text style={styles.genderLabel}>Gender:</Text>
                <View style={styles.genderButtons}>
                  <TouchableOpacity
                    style={[
                      styles.genderButton,
                      formData.gender === 'MALE' && styles.genderButtonActive
                    ]}
                    onPress={() => setFormData({ ...formData, gender: 'MALE' })}
                    disabled={isLoading}
                  >
                    <Text style={[
                      styles.genderButtonText,
                      formData.gender === 'MALE' && styles.genderButtonTextActive
                    ]}>Male</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.genderButton,
                      formData.gender === 'FEMALE' && styles.genderButtonActive
                    ]}
                    onPress={() => setFormData({ ...formData, gender: 'FEMALE' })}
                    disabled={isLoading}
                  >
                    <Text style={[
                      styles.genderButtonText,
                      formData.gender === 'FEMALE' && styles.genderButtonTextActive
                    ]}>Female</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Date of Birth Picker - Improved */}
              <TouchableOpacity
                style={styles.inputContainer}
                onPress={openDatePicker}
                disabled={isLoading}
              >
                <Ionicons name="calendar-outline" size={20} color="#666" style={styles.inputIcon} />
                <Text style={[
                  styles.dateText,
                  !formData.date_of_birth && styles.placeholderText
                ]}>
                  {formData.date_of_birth || "Date of Birth (YYYY-MM-DD)"}
                </Text>
              </TouchableOpacity>

              {/* Password Input */}
              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Password (min 6 characters)"
                  placeholderTextColor="#999"
                  value={formData.password}
                  onChangeText={(text) => setFormData({ ...formData, password: text })}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  editable={!isLoading}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} disabled={isLoading}>
                  <Ionicons 
                    name={showPassword ? "eye-off-outline" : "eye-outline"} 
                    size={20} 
                    color="#666" 
                  />
                </TouchableOpacity>
              </View>

              {/* Confirm Password Input */}
              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Confirm Password"
                  placeholderTextColor="#999"
                  value={formData.password_confirmation}
                  onChangeText={(text) => setFormData({ ...formData, password_confirmation: text })}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  editable={!isLoading}
                />
                <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} disabled={isLoading}>
                  <Ionicons 
                    name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} 
                    size={20} 
                    color="#666" 
                  />
                </TouchableOpacity>
              </View>

              {/* Password Requirements */}
              <View style={styles.passwordRequirements}>
                <Text style={styles.requirementText}>
                  ✓ Password must be at least 6 characters long
                </Text>
                <Text style={styles.requirementText}>
                  ✓ Phone number: numbers only (optional + at start)
                </Text>
              </View>

              {/* Sign Up Button */}
              <TouchableOpacity
                style={[styles.signUpButton, isLoading && styles.buttonDisabled]}
                onPress={handleSignUp}
                disabled={isLoading}
              >
                <Text style={styles.signUpButtonText}>
                  {isLoading ? "Creating Account..." : "Create Account"}
                </Text>
              </TouchableOpacity>

              {/* Sign In Link */}
              <View style={styles.footer}>
                <Text style={styles.footerText}>Already have an account? </Text>
                <TouchableOpacity onPress={() => router.push("/(auth)/sign-in")} disabled={isLoading}>
                  <Text style={styles.signInText}>Sign In</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Improved Date Picker Modal */}
      <Modal
        visible={showDatePickerModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDatePickerModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Date of Birth</Text>
              <TouchableOpacity onPress={() => setShowDatePickerModal(false)}>
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
                onPress={() => setShowDatePickerModal(false)}
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
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
    alignItems: "center",
    minHeight: Dimensions.get("window").height,
    position: "relative",
  },
  backButton: {
    position: "absolute",
    top: 60,
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
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  iconContainer: {
    width: 100,
    height: 100,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    marginTop: 40,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "white",
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.9)",
    marginBottom: 30,
  },
  card: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 25,
    width: width - 40,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    height: 50,
    backgroundColor: "#f5f5f5",
    borderRadius: 10,
    marginBottom: 15,
    paddingHorizontal: 15,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: "100%",
    color: "#333",
    fontSize: 16,
  },
  genderContainer: {
    width: "100%",
    marginBottom: 15,
  },
  genderLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
    fontWeight: "500",
  },
  genderButtons: {
    flexDirection: "row",
    gap: 10,
  },
  genderButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#f5f5f5",
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
  dateText: {
    flex: 1,
    fontSize: 16,
    color: "#333",
  },
  placeholderText: {
    color: "#999",
  },
  passwordRequirements: {
    width: "100%",
    marginBottom: 20,
    paddingHorizontal: 5,
  },
  requirementText: {
    fontSize: 12,
    color: "#666",
    fontStyle: "italic",
    marginBottom: 3,
  },
  signUpButton: {
    backgroundColor: "#2196F3",
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
    marginBottom: 15,
    shadowColor: "#2196F3",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  signUpButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  footer: {
    flexDirection: "row",
    marginTop: 10,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  footerText: {
    color: "#666",
    fontSize: 14,
  },
  signInText: {
    color: "#2196F3",
    fontSize: 14,
    fontWeight: "600",
  },
  // Modal Styles
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