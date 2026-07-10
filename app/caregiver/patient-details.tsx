
// app/patient-details.tsx
import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import API_BASE_URL from "../../services/apiConfig";

const { width } = Dimensions.get("window");

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
  schedule?: {
    id: number;
    frequency_type?: string;
    dose_times?: string;
    medication?: {
      id: number;
      name: string;
      dosage_amount?: number;
      dosage_unit?: string;
      color?: string;
    };
  };
}

export default function PatientDetailsScreen() {
  const { id, name } = useLocalSearchParams();
  const router = useRouter();

  const patientId = Array.isArray(id) ? id[0] : id;
  const patientName = Array.isArray(name) ? name[0] : name;

  const [activeTab, setActiveTab] = useState<"overview" | "medications" | "history">("overview");
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadPatientLogs = async () => {
    try {
      const token = await AsyncStorage.getItem("userToken");

      const response = await fetch(`${API_BASE_URL}/notification-logs/patient/${patientId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message?.join(", ") || "Failed to fetch patient logs");
      }

      setLogs(data.data || []);
    } catch (error) {
      console.error("Error loading patient logs:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadPatientLogs();
  }, [patientId]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPatientLogs();
  };

  const isToday = (datetime: string) => {
    const d = new Date(datetime);
    const today = new Date();
    return (
      d.getFullYear() === today.getFullYear() &&
      d.getMonth() === today.getMonth() &&
      d.getDate() === today.getDate()
    );
  };

  const formatTime = (datetime: string) => {
    return new Date(datetime).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };
  
const formatDate = (datetime: string) => {
  return new Date(datetime).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};


  const getStatusColor = (status: string) => {
    switch (status) {
      case "TAKEN":
        return "#4CAF50";
      case "LATE":
        return "#FF9800";
      case "MISSED":
        return "#f44336";
      default:
        return "#2196F3";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "TAKEN":
        return "checkmark-circle";
      case "LATE":
        return "time";
      case "MISSED":
        return "close-circle";
      default:
        return "time-outline";
    }
  };

  const getStatusText = (status: string) => {
    if (status === "TAKEN") return "Taken";
    if (status === "LATE") return "Late";
    if (status === "MISSED") return "Missed";
    return "Pending";
  };

  const getAdherenceColor = (value: number) => {
    if (value >= 80) return "#4CAF50";
    if (value >= 60) return "#FF9800";
    return "#f44336";
  };

  const todayLogs = useMemo(
    () =>
      logs
        .filter((log) => isToday(log.planned_datetime))
        .sort(
          (a, b) =>
            new Date(a.planned_datetime).getTime() -
            new Date(b.planned_datetime).getTime()
        ),
    [logs]
  );

  const takenCount = todayLogs.filter((l) => l.dose_status === "TAKEN").length;
  const lateCount = todayLogs.filter((l) => l.dose_status === "LATE").length;
  const missedCount = todayLogs.filter((l) => l.dose_status === "MISSED").length;

  const adherenceValue = useMemo(() => {
    if (logs.length === 0) return 0;
    const good = logs.filter((l) => l.dose_status === "TAKEN" || l.dose_status === "LATE").length;
    return Math.round((good / logs.length) * 100);
  }, [logs]);

  const medications = useMemo(() => {
    const map: Record<number, NotificationLog[]> = {};

    logs.forEach((log) => {
      const medId = log.schedule?.medication?.id;
      if (!medId) return;
      if (!map[medId]) map[medId] = [];
      map[medId].push(log);
    });

    return Object.keys(map).map((key) => {
      const medLogs = map[Number(key)].sort(
        (a, b) =>
          new Date(b.planned_datetime).getTime() -
          new Date(a.planned_datetime).getTime()
      );

      const latest = medLogs[0];
      const medication = latest.schedule?.medication;

      return {
        id: Number(key),
        name: medication?.name || "Unknown Medication",
        dosage: `${medication?.dosage_amount || ""} ${medication?.dosage_unit || ""}`.trim(),
        color: medication?.color || getStatusColor(latest.dose_status),
        latestStatus: latest.dose_status,
        times: medLogs
          .filter((log) => isToday(log.planned_datetime))
          .map((log) => formatTime(log.planned_datetime)),
      };
    });
  }, [logs]);

  const historyGroups = useMemo(() => {
    const grouped: Record<string, NotificationLog[]> = {};

    logs.forEach((log) => {
      const key = new Date(log.planned_datetime).toDateString();
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(log);
    });

    Object.keys(grouped).forEach((key) => {
      grouped[key].sort(
        (a, b) =>
          new Date(b.planned_datetime).getTime() -
          new Date(a.planned_datetime).getTime()
      );
    });

    return grouped;
  }, [logs]);

  const sortedDates = Object.keys(historyGroups).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Loading patient data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#2196F3", "#1976D2"]} style={styles.headerGradient} />

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Patient Details</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <View style={styles.patientCard}>
            <View style={styles.patientAvatar}>
              <Ionicons name="person" size={50} color="white" />
            </View>

            <Text style={styles.patientName}>{patientName || "Patient"}</Text>
            {/* <Text style={styles.patientId}>ID: {patientId}</Text> */}

            <View style={styles.adherenceContainer}>
              <Text style={styles.adherenceTitle}>Adherence Rate</Text>
              <Text style={[styles.adherenceScore, { color: getAdherenceColor(adherenceValue) }]}>
                {adherenceValue}%
              </Text>

              <View style={styles.adherenceBarBackground}>
                <View
                  style={[
                    styles.adherenceBar,
                    {
                      width: `${adherenceValue}%`,
                      backgroundColor: getAdherenceColor(adherenceValue),
                    },
                  ]}
                />
              </View>
            </View>
          </View>

          <View style={styles.tabContainer}>
            {["overview", "medications", "history"].map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[styles.tab, activeTab === tab && styles.activeTab]}
                onPress={() => setActiveTab(tab as any)}
              >
                <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {activeTab === "overview" && (
            <View style={styles.tabContent}>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryTitle}>Today's Summary</Text>

                <View style={styles.summaryStats}>
                  <View style={styles.summaryStat}>
                    <Text style={[styles.summaryStatNumber, { color: "#4CAF50" }]}>
                      {takenCount}
                    </Text>
                    <Text style={styles.summaryStatLabel}>Taken</Text>
                  </View>

                  <View style={styles.summaryStat}>
                    <Text style={[styles.summaryStatNumber, { color: "#FF9800" }]}>
                      {lateCount}
                    </Text>
                    <Text style={styles.summaryStatLabel}>Late</Text>
                  </View>

                  <View style={styles.summaryStat}>
                    <Text style={[styles.summaryStatNumber, { color: "#f44336" }]}>
                      {missedCount}
                    </Text>
                    <Text style={styles.summaryStatLabel}>Missed</Text>
                  </View>
                </View>
              </View>

              <View style={styles.activityCard}>
                <Text style={styles.sectionTitle}>Recent Activity</Text>

                {logs.slice(0, 5).map((log) => {
                  const medication = log.schedule?.medication;
                  const color = getStatusColor(log.dose_status);

                  return (
                    <View key={log.id} style={styles.activityItem}>
                      <View style={[styles.activityIcon, { backgroundColor: `${color}20` }]}>
                        <Ionicons
                          name={getStatusIcon(log.dose_status) as any}
                          size={20}
                          color={color}
                        />
                      </View>

                      <View style={styles.activityInfo}>
                        <Text style={styles.activityTitle}>
                          {medication?.name || "Unknown Medication"}
                        </Text>
                        <Text style={styles.activitySubtitle}>
                          {formatDate(log.planned_datetime)} at {formatTime(log.planned_datetime)}
                        </Text>
                      </View>

                      <Text style={[styles.activityStatus, { color }]}>
                        {getStatusText(log.dose_status)}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {activeTab === "medications" && (
            <View style={styles.tabContent}>
              {medications.length === 0 ? (
                <Text style={styles.emptyText}>No medications found.</Text>
              ) : (
                medications.map((med) => (
                  <View key={med.id} style={styles.medicationCard}>
                    <View style={[styles.medicationColor, { backgroundColor: med.color }]} />

                    <View style={styles.medicationInfo}>
                      <Text style={styles.medicationName}>{med.name}</Text>
                      <Text style={styles.medicationDosage}>{med.dosage || "No dosage"}</Text>

                      <View style={styles.timeChips}>
                        {(med.times.length > 0 ? med.times : ["No dose today"]).map((time, idx) => (
                          <View key={idx} style={styles.timeChip}>
                            <Ionicons name="time-outline" size={12} color="#666" />
                            <Text style={styles.timeChipText}>{time}</Text>
                          </View>
                        ))}
                      </View>
                    </View>

                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: `${getStatusColor(med.latestStatus)}20` },
                      ]}
                    >
                      <Ionicons
                        name={getStatusIcon(med.latestStatus) as any}
                        size={16}
                        color={getStatusColor(med.latestStatus)}
                      />
                      <Text style={[styles.statusText, { color: getStatusColor(med.latestStatus) }]}>
                        {getStatusText(med.latestStatus)}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          )}

          {activeTab === "history" && (
            <View style={styles.tabContent}>
              {sortedDates.length === 0 ? (
                <Text style={styles.emptyText}>No history found.</Text>
              ) : (
                sortedDates.map((dateKey) => (
                  <View key={dateKey} style={styles.dateSection}>
                    <Text style={styles.dateHeader}>{formatDate(dateKey)}</Text>

                    {historyGroups[dateKey].map((log) => {
                      const medication = log.schedule?.medication;
                      const color = getStatusColor(log.dose_status);

                      return (
                        <View key={log.id} style={styles.historyItemCard}>
                          <View style={[styles.historyColorBar, { backgroundColor: color }]} />

                          <View style={styles.historyInfo}>
                            <Text style={styles.historyMedName}>
                              {medication?.name || "Unknown Medication"}
                            </Text>

                            <Text style={styles.historyDoseTime}>
                              Planned: {formatTime(log.planned_datetime)}
                            </Text>

                            {log.confirmed_at && (
                              <Text style={styles.historyDoseTime}>
                                Confirmed: {formatTime(log.confirmed_at)}
                              </Text>
                            )}
                          </View>

                          <View style={[styles.statusBadge, { backgroundColor: `${color}20` }]}>
                            <Ionicons
                              name={getStatusIcon(log.dose_status) as any}
                              size={16}
                              color={color}
                            />
                            <Text style={[styles.statusText, { color }]}>
                              {getStatusText(log.dose_status)}
                            </Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                ))
              )}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa" },
  safeArea: { flex: 1 },
  headerGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 180,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
  },
  loadingText: { marginTop: 10, color: "#666" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: { color: "white", fontSize: 20, fontWeight: "700" },
  patientCard: {
    backgroundColor: "white",
    margin: 20,
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    elevation: 4,
  },
  patientAvatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#2196F3",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  patientName: { fontSize: 22, fontWeight: "700", color: "#333" },
  patientId: { fontSize: 13, color: "#777", marginTop: 4 },
  adherenceContainer: { width: "100%", alignItems: "center", marginTop: 20 },
  adherenceTitle: { color: "#666", fontSize: 14 },
  adherenceScore: { fontSize: 34, fontWeight: "800", marginVertical: 8 },
  adherenceBarBackground: {
    width: "100%",
    height: 8,
    borderRadius: 4,
    backgroundColor: "#eee",
    overflow: "hidden",
  },
  adherenceBar: { height: "100%" },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "white",
    marginHorizontal: 20,
    borderRadius: 14,
    padding: 4,
    marginBottom: 15,
  },
  tab: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 10 },
  activeTab: { backgroundColor: "#2196F3" },
  tabText: { color: "#666", fontWeight: "600" },
  activeTabText: { color: "white" },
  tabContent: { paddingHorizontal: 20, paddingBottom: 30 },
  summaryCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 18,
    marginBottom: 15,
    elevation: 2,
  },
  summaryTitle: { fontSize: 18, fontWeight: "700", color: "#333", marginBottom: 15 },
  summaryStats: { flexDirection: "row", justifyContent: "space-around" },
  summaryStat: { alignItems: "center" },
  summaryStatNumber: { fontSize: 26, fontWeight: "800" },
  summaryStatLabel: { color: "#666", fontSize: 13, marginTop: 4 },
  activityCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 18,
    elevation: 2,
  },
  sectionTitle: { fontSize: 18, fontWeight: "700", marginBottom: 12, color: "#333" },
  activityItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#f1f1f1",
  },
  activityIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  activityInfo: { flex: 1 },
  activityTitle: { fontWeight: "700", color: "#333" },
  activitySubtitle: { color: "#777", fontSize: 12, marginTop: 2 },
  activityStatus: { fontWeight: "700", fontSize: 12 },
  medicationCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    elevation: 2,
  },
  medicationColor: { width: 5, height: 52, borderRadius: 3, marginRight: 12 },
  medicationInfo: { flex: 1 },
  medicationName: { fontSize: 16, fontWeight: "700", color: "#333" },
  medicationDosage: { color: "#666", fontSize: 13, marginTop: 2 },
  timeChips: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  timeChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f2f2f2",
    borderRadius: 14,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  timeChipText: { fontSize: 12, color: "#666", marginLeft: 4 },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  statusText: { fontSize: 12, fontWeight: "700" },
  dateSection: { marginBottom: 18 },
  dateHeader: { fontSize: 16, fontWeight: "700", color: "#333", marginBottom: 10 },
  historyItemCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    elevation: 2,
  },
  historyColorBar: { width: 4, height: 42, borderRadius: 2, marginRight: 12 },
  historyInfo: { flex: 1 },
  historyMedName: { fontWeight: "700", color: "#333", marginBottom: 4 },
  historyDoseTime: { color: "#777", fontSize: 12, marginTop: 2 },
  emptyText: {
    textAlign: "center",
    color: "#777",
    fontSize: 15,
    marginTop: 30,
  },
});