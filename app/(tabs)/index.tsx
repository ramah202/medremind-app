
// app/(tabs)/index.tsx
import { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Animated,
  Alert,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle } from "react-native-svg";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { CaregiverAPI } from "../../services/caregiverAPI";
import { NotificationAPI } from "../../services/notificationAPI";
import * as Notifications from "expo-notifications";

const { width } = Dimensions.get("window");
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface CircularProgressProps {
  progress: number;
  totalDoses: number;
  completedDoses: number;
}

interface NotificationLog {
  id: number;
  patient_id: number;
  schedule_id: number;
  planned_datetime: string;
  sent_at: string | null;
  sent_status: "PENDING" | "SENT" | "FAILED";
  dose_status: "PENDING" | "TAKEN" | "MISSED" | "LATE";
  confirmed_at: string | null;
  reminder_sent_at: string | null;
  caregiver_notified_at: string | null;
  schedule: {
    id: number;
    frequency_type: string;
    medication: {
      id: number;
      name: string;
      dosage_amount: number;
      dosage_unit: string;
      color?: string;
    };
  };
}

function CircularProgress({
  progress,
  totalDoses,
  completedDoses,
}: CircularProgressProps) {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const size = width * 0.3;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: progress,
      duration: 1500,
      useNativeDriver: true,
    }).start();
  }, [progress, animatedValue]);

  const strokeDashoffset = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  });

  return (
    <View style={styles.progressContainer}>
      <Svg width={size} height={size} style={styles.progressRing}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(33, 150, 243, 0.2)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#2196F3"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>

      <View style={styles.progressTextContainer}>
        <Text style={styles.progressText}>
          {completedDoses}/{totalDoses}
        </Text>
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const router = useRouter();

  const [refreshing, setRefreshing] = useState(false);
  const [showAllToday, setShowAllToday] = useState(false);
  const [userName, setUserName] = useState("User");
  const [greeting, setGreeting] = useState("");




  const [notificationLogs, setNotificationLogs] = useState<NotificationLog[]>([]);
  const [todaysLogs, setTodaysLogs] = useState<NotificationLog[]>([]);
  const [completedDoses, setCompletedDoses] = useState(0);
  const [nextMedications, setNextMedications] = useState<NotificationLog[]>([]);

  const [pendingCaregiverRequests, setPendingCaregiverRequests] = useState<any[]>([]);
  const [showRequests, setShowRequests] = useState(true);

  // Timer for auto-refresh every minute
const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    loadUserProfile();

    const hour = new Date().getHours();
    if (hour < 12) {
      setGreeting("Good morning");
    } else if (hour < 17) {
      setGreeting("Good afternoon");
    } else {
      setGreeting("Good evening");
    }
  }, []);

  // Set up auto-refresh every minute to update next medication
  useEffect(() => {
    startAutoRefresh();
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const startAutoRefresh = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    // Refresh every minute to check for next medication
    timerRef.current = setInterval(() => {
      updateNextMedication();
    }, 60000);
  };

  const updateNextMedication = () => {
    // Recalculate next medication without full reload
    if (todaysLogs.length > 0) {
      calculateNextMedication(todaysLogs);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadTodayNotifications();
      loadPendingCaregiverRequests();
      loadUserProfile();
    }, [])
  );

  const loadUserProfile = async () => {
    try {
      const userDataStr = await AsyncStorage.getItem("userData");
      if (userDataStr) {
        const userData = JSON.parse(userDataStr);
        setUserName(userData.full_name || userData.name || "User");
      }
    } catch (error) {
      console.error("Error loading user profile:", error);
    }
  };

  const loadTodayNotifications = async () => {
    try {
      const logs: NotificationLog[] = await NotificationAPI.getMyLogs();
      setNotificationLogs(logs);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todayLogs = logs
        .filter((log) => {
          const plannedDate = new Date(log.planned_datetime);
          plannedDate.setHours(0, 0, 0, 0);
          return plannedDate.getTime() === today.getTime();
        })
        .sort(
          (a, b) =>
            new Date(a.planned_datetime).getTime() -
            new Date(b.planned_datetime).getTime()
        );

      setTodaysLogs(todayLogs);

      const completed = todayLogs.filter(
        (log) => log.dose_status === "TAKEN" || log.dose_status === "LATE"
      ).length;

      setCompletedDoses(completed);

      calculateNextMedication(todayLogs);
    } catch (error) {
      console.error("Error loading notifications:", error);
    }
  };

 /*const calculateNextMedication = (logs: NotificationLog[]) => {
  const now = new Date();

  // Only pending medications
  const pendingDoses = logs.filter(
    (log) => log.dose_status === "PENDING"
  );

  // Future doses only
  const futureDoses = pendingDoses.filter(
    (log) => new Date(log.planned_datetime).getTime() > now.getTime()
  );

  if (futureDoses.length === 0) {
    setNextMedications([]);
    return;
  }

  // Find nearest upcoming time
  const nextTime = Math.min(
    ...futureDoses.map((log) =>
      new Date(log.planned_datetime).getTime()
    )
  );

  // Get all meds at same next time
  const nearestDoses = futureDoses.filter(
    (log) =>
      new Date(log.planned_datetime).getTime() === nextTime
  );

  setNextMedications(nearestDoses);
};*/


const calculateNextMedication = (logs: NotificationLog[]) => {
  const now = new Date();

  // Get only doses not taken yet
  const pendingDoses = logs.filter(
    (log) =>
      log.dose_status === "PENDING" ||
      log.dose_status === "MISSED"
  );

  if (pendingDoses.length === 0) {
    setNextMedications([]);
    return;
  }

  // Future doses
  const futureDoses = pendingDoses.filter(
    (log) =>
      new Date(log.planned_datetime).getTime() > now.getTime()
  );

  // If there are future doses → show nearest future dose
  if (futureDoses.length > 0) {
    const nextTime = Math.min(
      ...futureDoses.map((log) =>
        new Date(log.planned_datetime).getTime()
      )
    );

    const nearestDoses = futureDoses.filter(
      (log) =>
        new Date(log.planned_datetime).getTime() === nextTime
    );

    setNextMedications(nearestDoses);
    return;
  }

  // No future doses left today
  // Show the latest missed/pending dose
  const latestMissedTime = Math.max(
    ...pendingDoses.map((log) =>
      new Date(log.planned_datetime).getTime()
    )
  );

  const latestMissedDoses = pendingDoses.filter(
    (log) =>
      new Date(log.planned_datetime).getTime() === latestMissedTime
  );

  setNextMedications(latestMissedDoses);
};
  const loadPendingCaregiverRequests = async () => {
    try {
      const requests = await CaregiverAPI.getPendingRequests();
      setPendingCaregiverRequests(requests);
    } catch (error) {
      console.error("Error loading pending requests:", error);
    }
  };

  const handleConfirmDose = async (log: NotificationLog) => {
    const medicationName = log.schedule.medication.name;
    const actionText = log.dose_status === "MISSED" ? "take this dose late" : "take this dose";

    Alert.alert(
      "Confirm Dose",
      `Did you ${actionText} for ${medicationName}?`,
      [
        {
          text: "No",
          style: "cancel",
        },
        {
          text: "Yes",
          onPress: async () => {
            try {
              await NotificationAPI.confirmDose(log.id);
              await loadTodayNotifications();

              Alert.alert(
                "Success",
                log.dose_status === "MISSED"
                  ? `${medicationName} marked as late`
                  : `${medicationName} marked as taken`
              );
            } catch (error: any) {
              Alert.alert("Error", error.message || "Failed to confirm dose");
            }
          },
        },
      ]
    );
  };

  const handleApproveRequest = async (requestId: number) => {
    try {
      await CaregiverAPI.approveRequest(requestId);
      Alert.alert("Success", "Caregiver approved successfully");
      loadPendingCaregiverRequests();
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to approve request");
    }
  };

  const handleRejectRequest = async (requestId: number) => {
    Alert.alert(
      "Reject Request",
      "Are you sure you want to reject this caregiver request?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reject",
          style: "destructive",
          onPress: async () => {
            try {
              await CaregiverAPI.rejectRequest(requestId);
              Alert.alert("Success", "Request rejected");
              loadPendingCaregiverRequests();
            } catch (error: any) {
              Alert.alert("Error", error.message || "Failed to reject request");
            }
          },
        },
      ]
    );
  };

  const getDoseStatusInfo = (status: string) => {
    switch (status) {
      case "TAKEN":
        return { text: "Taken", color: "#4CAF50", icon: "checkmark-circle" };
      case "LATE":
        return { text: "Late", color: "#FF9800", icon: "time" };
      case "MISSED":
        return { text: "Missed", color: "#f44336", icon: "close-circle" };
      case "PENDING":
      default:
        return { text: "Pending", color: "#2196F3", icon: "time-outline" };
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      loadTodayNotifications(),
      loadPendingCaregiverRequests(),
    ]);
    setRefreshing(false);
  };

  const totalDoses = todaysLogs.length;
  const progress = totalDoses > 0 ? completedDoses / totalDoses : 0;

  const formatTime = (datetime: string) => {
    const date = new Date(datetime);
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  const isDoseTimeReached = (datetime: string) => {
    return new Date(datetime).getTime() <= Date.now();
  };

  const canConfirmDose = (log: NotificationLog) => {
    if (log.dose_status === "MISSED") return true;
    if (log.dose_status === "PENDING") {
      return isDoseTimeReached(log.planned_datetime);
    }
    return false;
  };

  const getNextDoseTimeDisplay = () => {
    if (nextMedications.length === 0) return null;
    
    const firstDose = nextMedications[0];
    const now = new Date();
    const doseTime = new Date(firstDose.planned_datetime);
    const isOverdue = doseTime.getTime() < now.getTime();
    
    if (nextMedications.length === 1) {
      if (isOverdue && firstDose.dose_status === "MISSED") {
        return `Overdue (was at ${formatTime(firstDose.planned_datetime)})`;
      } else if (isOverdue) {
        return `Due now (scheduled at ${formatTime(firstDose.planned_datetime)})`;
      }
      return `Next dose at ${formatTime(firstDose.planned_datetime)}`;
    }
    
    if (isOverdue) {
      return `${nextMedications.length} medications due now`;
    }
    return `${nextMedications.length} medications at ${formatTime(firstDose.planned_datetime)}`;
  };

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <LinearGradient colors={["#2196F3", "#1976D2"]} style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.greetingContainer}>
              <Text style={styles.greeting}>{greeting},</Text>
              <Text style={styles.userName}>{userName}</Text>
            </View>

            <TouchableOpacity
              style={styles.profileButton}
              onPress={() => router.push("../(profile)")}
            >
              <Ionicons name="person-circle-outline" size={32} color="white" />
            </TouchableOpacity>
          </View>


          {pendingCaregiverRequests.length > 0 && showRequests && (
            <View style={styles.pendingRequestsContainer}>
              <View style={styles.pendingRequestsHeader}>
                <View style={styles.pendingRequestsTitleContainer}>
                  <Ionicons name="people-outline" size={20} color="#FF9800" />
                  <Text style={styles.pendingRequestsTitle}>Caregiver Requests</Text>
                </View>

                <TouchableOpacity onPress={() => setShowRequests(false)}>
                  <Ionicons name="close" size={20} color="#999" />
                </TouchableOpacity>
              </View>

              {pendingCaregiverRequests.map((request) => {
                const sender = request.requester || request.patient || request.caregiver;

                const isPatientSender =
                  String(request.requested_by) === String(request.patient_id);

                const roleText = isPatientSender
                  ? "Wants you to be their caregiver"
                  : "Wants to monitor your health";

                return (
                  <View key={request.id} style={styles.pendingRequestItem}>
                    <View style={styles.pendingRequestInfo}>
                      <View style={styles.pendingRequestAvatar}>
                        <Ionicons name="person" size={20} color="#FF9800" />
                      </View>

                      <View>
                        <Text style={styles.pendingRequestName}>
                          {sender?.full_name || sender?.name || "User"}
                        </Text>

                        <Text style={styles.pendingRequestEmail}>
                          {sender?.email || ""}
                        </Text>

                        <Text style={styles.pendingRequestRole}>
                          {roleText}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.pendingRequestActions}>
                      <TouchableOpacity
                        style={[styles.pendingRequestButton, styles.approveButton]}
                        onPress={() => handleApproveRequest(request.id)}
                      >
                        <Text style={styles.approveButtonText}>Accept</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.pendingRequestButton, styles.rejectButton]}
                        onPress={() => handleRejectRequest(request.id)}
                      >
                        <Text style={styles.rejectButtonText}>Decline</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          <View style={styles.progressSummary}>
            <View style={styles.progressItem}>
              <Text style={styles.progressLabel}>Total Doses</Text>
              <Text style={styles.progressValue}>{totalDoses}</Text>
            </View>

            <View style={styles.progressItem}>
              <Text style={styles.progressLabel}>Taken</Text>
              <Text style={styles.progressValue}>{completedDoses}</Text>
            </View>

            <View style={styles.progressItem}>
              <Text style={styles.progressLabel}>Remaining</Text>
              <Text style={styles.progressValue}>
                {todaysLogs.filter((log) => log.dose_status === "PENDING" || log.dose_status === "MISSED").length}
              </Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.content}>
          <View style={styles.nextMedSection}>
            <Text style={styles.sectionTitle}>Next Medication</Text>

            {nextMedications.length > 0 ? (
              <View style={styles.nextMedCard}>
                <View style={styles.nextMedInfo}>
                  {nextMedications.map((med, index) => (
                    <View key={med.id} style={styles.nextMedItem}>
                      <View style={styles.nextMedHeader}>
                        <View
                          style={[
                            styles.nextMedColorDot,
                            { backgroundColor: getDoseStatusInfo(med.dose_status).color },
                          ]}
                        />
                        <Text style={styles.nextMedName}>
                          {med.schedule.medication.name}
                        </Text>
                      </View>
                      <Text style={styles.nextMedDosage}>
                        {med.schedule.medication.dosage_amount}{" "}
                        {med.schedule.medication.dosage_unit}
                      </Text>
                      {index < nextMedications.length - 1 && (
                        <View style={styles.nextMedDivider} />
                      )}
                    </View>
                  ))}

                  <View style={styles.nextMedTimeContainer}>
                    <Ionicons name="time-outline" size={16} color="#666" />
                    <Text style={styles.nextMedTime}>
                      {getNextDoseTimeDisplay()}
                    </Text>
                  </View>
                </View>

                {nextMedications.length === 1 ? (
                  <TouchableOpacity
                    disabled={!canConfirmDose(nextMedications[0])}
                    style={[
                      styles.nextMedButton,
                      {
                        backgroundColor: canConfirmDose(nextMedications[0])
                          ? getDoseStatusInfo(nextMedications[0].dose_status).color
                          : "#B0B0B0",
                      },
                      !canConfirmDose(nextMedications[0]) && styles.disabledDoseButton,
                    ]}
                    onPress={() => handleConfirmDose(nextMedications[0])}
                  >
                    <Text style={styles.nextMedButtonText}>
                      {nextMedications[0].dose_status === "MISSED"
                        ? "Take Late"
                        : canConfirmDose(nextMedications[0])
                          ? "Take Now"
                          : "Not Time Yet"}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.nextMedMultipleButtons}>
                    {nextMedications.map((med) => (
                      <TouchableOpacity
                        key={med.id}
                        disabled={!canConfirmDose(med)}
                        style={[
                          styles.nextMedSmallButton,
                          {
                            backgroundColor: canConfirmDose(med)
                              ? getDoseStatusInfo(med.dose_status).color
                              : "#B0B0B0",
                          },
                          !canConfirmDose(med) && styles.disabledDoseButton,
                        ]}
                        onPress={() => handleConfirmDose(med)}
                      >
                        <Text style={styles.nextMedSmallButtonText}>
                          {med.schedule.medication.name}
                        </Text>
                        <Text style={styles.nextMedSmallButtonSubtext}>
                          {med.dose_status === "MISSED"
                            ? "Take Late"
                            : canConfirmDose(med)
                              ? "Take Now"
                              : "Not Time"}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.noNextMedCard}>
                <Ionicons name="checkmark-done-circle" size={48} color="#4CAF50" />
                <Text style={styles.noNextMedText}>
                  {totalDoses > 0
                    ? "All medications taken for today! 🎉"
                    : "No medications scheduled today"}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.dailyProgressCard}>
            <View style={styles.dailyProgressHeader}>
              <Text style={styles.sectionTitle}>Daily Progress</Text>
              <CircularProgress
                progress={progress}
                totalDoses={totalDoses}
                completedDoses={completedDoses}
              />
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Today's Doses</Text>

              {totalDoses > 3 && (
                <TouchableOpacity onPress={() => setShowAllToday(!showAllToday)}>
                  <Text style={styles.seeAllButton}>
                    {showAllToday ? "Show Less" : `See All (${totalDoses})`}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {totalDoses === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="medical-outline" size={48} color="#ccc" />
                <Text style={styles.emptyStateText}>
                  No medications scheduled for today
                </Text>

                <TouchableOpacity
                  style={styles.addMedicationButton}
                  onPress={() => router.push("/medications/add")}
                >
                  <Text style={styles.addMedicationButtonText}>Add Medication</Text>
                </TouchableOpacity>
              </View>
            ) : (
              (showAllToday ? todaysLogs : todaysLogs.slice(0, 3)).map((log) => {
                const statusInfo = getDoseStatusInfo(log.dose_status);

                return (
                  <View key={log.id} style={styles.doseCard}>
                    <View
                      style={[
                        styles.doseBadge,
                        { backgroundColor: `${statusInfo.color}15` },
                      ]}
                    >
                      <Ionicons
                        name="medical"
                        size={24}
                        color={statusInfo.color}
                      />
                    </View>

                    <View style={styles.doseInfo}>
                      <Text style={styles.medicineName}>
                        {log.schedule.medication.name}
                      </Text>

                      <Text style={styles.dosageInfo}>
                        {log.schedule.medication.dosage_amount}{" "}
                        {log.schedule.medication.dosage_unit}
                      </Text>

                      <View style={styles.doseTime}>
                        <Ionicons name="time-outline" size={16} color="#666" />
                        <Text style={styles.timeText}>
                          {formatTime(log.planned_datetime)}
                        </Text>
                      </View>
                    </View>

                    {log.dose_status === "TAKEN" || log.dose_status === "LATE" ? (
                      <View
                        style={[
                          styles.takenBadge,
                          { backgroundColor: `${statusInfo.color}15` },
                        ]}
                      >
                        <Ionicons
                          name={statusInfo.icon as any}
                          size={16}
                          color={statusInfo.color}
                        />
                        <Text style={[styles.takenText, { color: statusInfo.color }]}>
                          {statusInfo.text}
                        </Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        disabled={!canConfirmDose(log)}
                        style={[
                          styles.takeDoseButton,
                          {
                            backgroundColor: canConfirmDose(log)
                              ? statusInfo.color
                              : "#B0B0B0",
                          },
                          !canConfirmDose(log) && styles.disabledDoseButton,
                        ]}
                        onPress={() => handleConfirmDose(log)}
                      >
                        <Text style={styles.takeDoseText}>
                          {log.dose_status === "MISSED"
                            ? "Take Late"
                            : canConfirmDose(log)
                              ? "Take"
                              : "Not Time"}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })
            )}
          </View>
        </View>
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push("/medications/add")}
      >
        <LinearGradient colors={["#2196F3", "#1976D2"]} style={styles.fabGradient}>
          <Ionicons name="add" size={24} color="white" />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa" },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  greetingContainer: { flex: 1 },
  greeting: { fontSize: 16, color: "rgba(255,255,255,0.9)" },
  userName: { fontSize: 24, fontWeight: "bold", color: "white" },
  profileButton: {
    padding: 8,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 12,
  },
  iotContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 15,
    borderRadius: 15,
  },
  iotLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  iotIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  iotInfo: { flex: 1 },
  iotTitle: { fontSize: 14, fontWeight: "600", color: "white", marginBottom: 4 },
  iotStatus: { flexDirection: "row", alignItems: "center" },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  iotStatusText: { fontSize: 12, color: "rgba(255,255,255,0.8)" },
  iotRight: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  batteryText: { color: "white", fontSize: 12, marginLeft: 5 },
  progressSummary: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: 20,
  },
  progressItem: { alignItems: "center" },
  progressLabel: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
    marginBottom: 4,
  },
  progressValue: { fontSize: 24, fontWeight: "bold", color: "white" },
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
  nextMedSection: { marginBottom: 20 },
  nextMedCard: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
    marginTop: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  nextMedInfo: { marginBottom: 15 },
  nextMedItem: { marginBottom: 12 },
  nextMedHeader: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  nextMedColorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  nextMedName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    flex: 1,
  },
  nextMedDosage: { fontSize: 13, color: "#666", marginLeft: 18 },
  nextMedDivider: {
    height: 1,
    backgroundColor: "#f0f0f0",
    marginTop: 12,
  },
  nextMedTimeContainer: { flexDirection: "row", alignItems: "center", marginTop: 8 },
  nextMedTime: { fontSize: 14, color: "#666", marginLeft: 6 },
  nextMedButton: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  nextMedButtonText: { color: "white", fontSize: 16, fontWeight: "600" },
  nextMedMultipleButtons: {
    flexDirection: "row",
    gap: 10,
  },
  nextMedSmallButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  nextMedSmallButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  nextMedSmallButtonSubtext: {
    color: "white",
    fontSize: 11,
    fontWeight: "400",
    marginTop: 2,
  },
  noNextMedCard: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 30,
    marginTop: 10,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  noNextMedText: {
    fontSize: 16,
    color: "#666",
    marginTop: 15,
    textAlign: "center",
  },
  dailyProgressCard: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  dailyProgressHeader: { alignItems: "center" },
  progressContainer: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 10,
  },
  progressTextContainer: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  progressText: { fontSize: 20, fontWeight: "bold", color: "#2196F3" },
  progressRing: { transform: [{ rotate: "-90deg" }] },
  section: { marginBottom: 30 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: "#333" },
  seeAllButton: { color: "#2196F3", fontWeight: "600" },
  doseCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  doseBadge: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  doseInfo: { flex: 1 },
  medicineName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 2,
  },
  dosageInfo: { fontSize: 12, color: "#666", marginBottom: 4 },
  doseTime: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  timeText: { marginLeft: 5, color: "#666", fontSize: 13 },
  takeDoseButton: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 15,
  },
  disabledDoseButton: {
    opacity: 0.6,
  },
  takeDoseText: { color: "white", fontWeight: "600", fontSize: 14 },
  takenBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  takenText: { fontWeight: "600", fontSize: 13 },
  addMedicationButton: {
    backgroundColor: "#2196F3",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  addMedicationButtonText: { color: "white", fontWeight: "600" },
  fab: {
    position: "absolute",
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: "hidden",
    shadowColor: "#2196F3",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  fabGradient: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  pendingRequestsContainer: {
    backgroundColor: "white",
    marginHorizontal: 20,
    marginBottom: 15,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: "#FF9800",
  },
  pendingRequestsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  pendingRequestsTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  pendingRequestsTitle: { fontSize: 16, fontWeight: "600", color: "#333" },
  pendingRequestItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  pendingRequestInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  pendingRequestAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFF3E0",
    justifyContent: "center",
    alignItems: "center",
  },
  pendingRequestName: { fontSize: 14, fontWeight: "600", color: "#333" },
  pendingRequestEmail: { fontSize: 12, color: "#666" },
  pendingRequestRole: {
    fontSize: 11,
    color: "#FF9800",
    marginTop: 2,
  },
  pendingRequestActions: { flexDirection: "row", gap: 8 },
  pendingRequestButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  approveButton: { backgroundColor: "#E8F5E9" },
  approveButtonText: { color: "#4CAF50", fontSize: 12, fontWeight: "600" },
  rejectButton: { backgroundColor: "#FFEBEE" },
  rejectButtonText: { color: "#f44336", fontSize: 12, fontWeight: "600" },
  emptyState: {
    alignItems: "center",
    padding: 30,
    backgroundColor: "white",
    borderRadius: 16,
    marginTop: 10,
  },
  emptyStateText: {
    fontSize: 16,
    color: "#666",
    marginTop: 10,
    marginBottom: 20,
    textAlign: "center",
  },
});