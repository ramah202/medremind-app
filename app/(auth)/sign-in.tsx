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
} from "react-native";
import { useRouter, Link } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { API } from "../../services/api";
import { PushTokenAPI } from '../../services/pushTokenAPI';
import { MedicationAPI } from '../../services/medicationAPI';
import { ScheduleAPI } from '../../services/scheduleAPI';
import AsyncStorage from "@react-native-async-storage/async-storage";



const { width } = Dimensions.get("window");

export default function SignInScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Helper function to reschedule notifications for a user's medications
  const rescheduleUserNotifications = async (userId: number) => {
    try {
      // Get all medications for the user
      const medications = await MedicationAPI.getAll();
      const activeMeds = medications.filter((med: any) => med.is_active === true);
      
      for (const med of activeMeds) {
        // Get schedules for each medication
        const schedules = await ScheduleAPI.getByMedication(med.id);
        if (schedules && schedules.length > 0) {
          const schedule = schedules[0];
          if (schedule.dose_times && schedule.dose_times.length > 0) {
            for (let i = 0; i < schedule.dose_times.length; i++) {
              const time = schedule.dose_times[i];
              const dosage = `${med.dosage_amount || ''} ${med.dosage_unit || ''}`.trim() || "Take as directed";
        
            }
          }
        }
      }
      console.log(`✅ Rescheduled notifications for user ${userId} (${activeMeds.length} medications)`);
    } catch (error) {
      console.error("Error rescheduling user notifications:", error);
    }
  };

  const handleSignIn = async () => {
    // Basic validation
    if (!email || !password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    if (!isValidEmail(email)) {
      Alert.alert("Error", "Please enter a valid email address");
      return;
    }

    setIsLoading(true);

    try {
      const userData = await API.login(email.trim(), password);
      console.log("Login successful:", userData);
      
      
      // Save user data
      await AsyncStorage.setItem('userToken', userData.token);
      await AsyncStorage.setItem('userData', JSON.stringify(userData.user));
      await AsyncStorage.setItem('userId', userData.user.id.toString());
      
      // Reschedule notifications for the logged-in user
      await rescheduleUserNotifications(userData.user.id);
      
      // Register push token (after user is logged in)
      await PushTokenAPI.registerAndSaveToken();
      
      router.replace("/(tabs)");
    } catch (error: any) {
      Alert.alert(
        "Login Failed",
        error?.message || "Unable to login. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
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
            <View style={styles.iconContainer}>
              <Ionicons name="fitness" size={100} color="white" />
            </View>

            <Text style={styles.title}>MedRemind</Text>
            <Text style={styles.subtitle}>Your Personal Medication Assistant</Text>

            <View style={styles.card}>
              <Text style={styles.welcomeText}>Welcome Back!</Text>
              
              <View style={styles.formContainer}>
                
                <View style={styles.inputContainer}>
                  <Ionicons name="mail-outline" size={20} color="#666" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Email"
                    placeholderTextColor="#999"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    editable={!isLoading}
                  />
                </View>

              
                <View style={styles.inputContainer}>
                  <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    placeholder="Password"
                    placeholderTextColor="#999"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoComplete="password"
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

             

           
                <TouchableOpacity
                  style={[styles.signInButton, isLoading && styles.buttonDisabled]}
                  onPress={handleSignIn}
                  disabled={isLoading}
                >
                  <Text style={styles.signInButtonText}>
                    {isLoading ? "Signing In..." : "Sign In"}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.footer}>
                <Text style={styles.footerText}>Don't have an account? </Text>
                <Link href="/(auth)/sign-up" asChild>
                  <TouchableOpacity disabled={isLoading}>
                    <Text style={styles.signUpText}>Sign Up</Text>
                  </TouchableOpacity>
                </Link>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  },
  iconContainer: {
    width: 120,
    height: 120,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 36,
    fontWeight: "bold",
    color: "white",
    marginBottom: 10,
    textShadowColor: "rgba(0, 0, 0, 0.2)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  subtitle: {
    fontSize: 18,
    color: "rgba(255, 255, 255, 0.9)",
    marginBottom: 40,
    textAlign: "center",
  },
  card: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 30,
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
  welcomeText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 30,
  },
  formContainer: {
    width: "100%",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    paddingHorizontal: 15,
    marginBottom: 15,
    backgroundColor: "#f8f8f8",
    height: 55,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#333",
    height: "100%",
  },
  forgotPassword: {
    alignSelf: "flex-end",
    marginBottom: 25,
  },
  forgotPasswordText: {
    color: "#2196F3",
    fontSize: 14,
    fontWeight: "500",
  },
  signInButton: {
    backgroundColor: "#2196F3",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#2196F3",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  signInButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  footer: {
    flexDirection: "row",
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  footerText: {
    color: "#666",
    fontSize: 14,
  },
  signUpText: {
    color: "#2196F3",
    fontSize: 14,
    fontWeight: "600",
  },
});