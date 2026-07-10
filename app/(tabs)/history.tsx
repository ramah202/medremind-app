// app/(tabs)/history.tsx
import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { HistoryAPI } from "../../services/historyAPI";

interface MedicationHistoryItem {
  id: number;
  planned_datetime: string;
  confirmed_at?: string | null;
  dose_status: "TAKEN" | "MISSED" | "LATE" | "PENDING";

  schedule?: {
    medication?: {
      name: string;
      dosage_amount?: number;
      dosage_unit?: string;
      color?: string;
    };
  };
}

export default function HistoryScreen() {
  const [doseHistory, setDoseHistory] = useState<MedicationHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [selectedFilter, setSelectedFilter] = useState<
    "all" | "taken" | "missed" | "late"
  >("all");

  const loadData = useCallback(async () => {
    try {
      const history = await HistoryAPI.getMedicationHistory();
      setDoseHistory(history || []);
    } catch (error) {
      console.error("Error loading medication history:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case "TAKEN":
        return {
          text: "Taken",
          color: "#4CAF50",
          icon: "checkmark-circle",
        };
      case "LATE":
        return {
          text: "Late",
          color: "#FF9800",
          icon: "time",
        };
      case "MISSED":
        return {
          text: "Missed",
          color: "#F44336",
          icon: "close-circle",
        };
      default:
        return {
          text: "Pending",
          color: "#2196F3",
          icon: "time-outline",
        };
    }
  };

  const formatTime = (datetime: string) => {
    const date = new Date(datetime);
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };
  
// AFTER (Forces Gregorian calendar)
const formatDateTitle = (dateString: string) => {
  const date = new Date(dateString);
  // Use 'en-US' locale to force Gregorian calendar
  return date.toLocaleDateString("en-US", {  // ← 'en-US' forces Gregorian calendar
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};


  const filteredHistory = doseHistory.filter((dose) => {
    if (selectedFilter === "all") return true;
    if (selectedFilter === "taken") return dose.dose_status === "TAKEN";
    if (selectedFilter === "missed") return dose.dose_status === "MISSED";
    if (selectedFilter === "late") return dose.dose_status === "LATE";
    return true;
  });

  const groupedHistory = filteredHistory.reduce((groups, dose) => {
    const dateKey = new Date(dose.planned_datetime).toDateString();

    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }

    groups[dateKey].push(dose);
    return groups;
  }, {} as Record<string, MedicationHistoryItem[]>);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Loading history...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Medication History</Text>
        <Text style={styles.headerSubtitle}>Previous doses record</Text>
      </View>

      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[
            styles.filterButton,
            selectedFilter === "all" && styles.activeFilterButton,
          ]}
          onPress={() => setSelectedFilter("all")}
        >
          <Text
            style={[
              styles.filterText,
              selectedFilter === "all" && styles.activeFilterText,
            ]}
          >
            All
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterButton,
            selectedFilter === "taken" && styles.activeFilterButton,
          ]}
          onPress={() => setSelectedFilter("taken")}
        >
          <Text
            style={[
              styles.filterText,
              selectedFilter === "taken" && styles.activeFilterText,
            ]}
          >
            Taken
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterButton,
            selectedFilter === "late" && styles.activeFilterButton,
          ]}
          onPress={() => setSelectedFilter("late")}
        >
          <Text
            style={[
              styles.filterText,
              selectedFilter === "late" && styles.activeFilterText,
            ]}
          >
            Late
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterButton,
            selectedFilter === "missed" && styles.activeFilterButton,
          ]}
          onPress={() => setSelectedFilter("missed")}
        >
          <Text
            style={[
              styles.filterText,
              selectedFilter === "missed" && styles.activeFilterText,
            ]}
          >
            Missed
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredHistory.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={60} color="#BDBDBD" />
            <Text style={styles.emptyTitle}>No history found</Text>
            <Text style={styles.emptyText}>
              Your previous medication doses will appear here.
            </Text>
          </View>
        ) : (
          Object.keys(groupedHistory).map((dateKey) => (
            <View key={dateKey} style={styles.dateGroup}>
              <Text style={styles.dateTitle}>{formatDateTitle(dateKey)}</Text>

              {groupedHistory[dateKey].map((dose) => {
                const medication = dose.schedule?.medication;
                const statusInfo = getStatusInfo(dose.dose_status);

                return (
                  <View key={dose.id} style={styles.historyCard}>
                    <View
                      style={[
                        styles.medicationIcon,
                        {
                          backgroundColor: `${
                            medication?.color || statusInfo.color
                          }20`,
                        },
                      ]}
                    >
                      <Ionicons
                        name="medical"
                        size={24}
                        color={medication?.color || statusInfo.color}
                      />
                    </View>

                    <View style={styles.historyInfo}>
                      <Text style={styles.medicationName}>
                        {medication?.name || "Unknown Medication"}
                      </Text>

                      <Text style={styles.dosageText}>
                        {medication?.dosage_amount || ""}{" "}
                        {medication?.dosage_unit || ""}
                      </Text>

                      <View style={styles.timeRow}>
                        <Ionicons name="time-outline" size={15} color="#666" />
                        <Text style={styles.timeText}>
                          Planned: {formatTime(dose.planned_datetime)}
                        </Text>
                      </View>

                      {dose.confirmed_at && (
                        <View style={styles.timeRow}>
                          <Ionicons
                            name="checkmark-outline"
                            size={15}
                            color="#666"
                          />
                          <Text style={styles.timeText}>
                            Confirmed: {formatTime(dose.confirmed_at)}
                          </Text>
                        </View>
                      )}
                    </View>

                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: `${statusInfo.color}15` },
                      ]}
                    >
                      <Ionicons
                        name={statusInfo.icon as any}
                        size={16}
                        color={statusInfo.color}
                      />
                      <Text
                        style={[
                          styles.statusText,
                          { color: statusInfo.color },
                        ]}
                      >
                        {statusInfo.text}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },

  header: {
    backgroundColor: "#2196F3",
    paddingTop: 55,
    paddingBottom: 25,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },

  headerTitle: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#FFFFFF",
  },

  headerSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.85)",
    marginTop: 5,
  },

  filterContainer: {
    flexDirection: "row",
    paddingHorizontal: 15,
    paddingVertical: 15,
    gap: 8,
  },

  filterButton: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingVertical: 10,
    borderRadius: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },

  activeFilterButton: {
    backgroundColor: "#2196F3",
    borderColor: "#2196F3",
  },

  filterText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#666",
  },

  activeFilterText: {
    color: "#FFFFFF",
  },

  content: {
    flex: 1,
    paddingHorizontal: 15,
  },

  dateGroup: {
    marginBottom: 20,
  },

  dateTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
    marginBottom: 10,
    marginLeft: 5,
  },

  historyCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },

  medicationIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  historyInfo: {
    flex: 1,
  },

  medicationName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
    marginBottom: 3,
  },

  dosageText: {
    fontSize: 13,
    color: "#666",
    marginBottom: 5,
  },

  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },

  timeText: {
    fontSize: 12,
    color: "#666",
    marginLeft: 5,
  },

  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    gap: 4,
  },

  statusText: {
    fontSize: 12,
    fontWeight: "700",
  },

  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 90,
    paddingHorizontal: 25,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    marginTop: 15,
  },

  emptyText: {
    fontSize: 14,
    color: "#777",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
  },

  loadingText: {
    marginTop: 10,
    color: "#666",
    fontSize: 14,
  },
});