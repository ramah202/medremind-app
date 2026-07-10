// app/(tabs)/schedule.tsx
import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { NotificationAPI } from "../../services/notificationAPI";
import { MedicationAPI } from "../../services/medicationAPI";
import { ScheduleAPI } from "../../services/scheduleAPI";

const { width } = Dimensions.get("window");
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_SIZE = (width - 60) / 7;

interface DoseEvent {
  id: string;
  medicationId: number;
  medicationName: string;
  dosage: string;
  scheduledTime: string;
  scheduledDate: Date;
  channel: 'MOBILE' | 'IOT';
  status: 'PENDING' | 'TAKEN' | 'MISSED' | 'LATE';
}

interface Medication {
  id: number;
  name: string;
  dosage_amount: number | null;
  dosage_unit: string | null;
  notes: string | null;
  box_number: string | null;
  is_active: boolean;
  created_at: string;
}

interface Schedule {
  id: number;
  medication_id: number;
  start_date: string;
  end_date: string | null;
  frequency_type: 'DAILY' | 'WEEKLY' | 'MANUAL';
  days_of_week: number[] | null;
  dose_times: string[] | null;
  manual_doses: string[] | null;
}

interface NotificationLog {
  id: number;
  patient_id: number;
  schedule_id: number;
  planned_datetime: string;
  channel: 'MOBILE' | 'IOT';
  sent_at: string | null;
  sent_status: 'PENDING' | 'SENT' | 'FAILED';
  dose_status: 'PENDING' | 'TAKEN' | 'MISSED' | 'LATE';
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
export default function ScheduleScreen() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [doseEvents, setDoseEvents] = useState<DoseEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

const loadData = useCallback(async () => {
  try {
    setIsLoading(true);
    
    // Get all medications (both active and inactive? or just active)
    const allMeds = await MedicationAPI.getAll();
    const activeMeds = allMeds.filter((med: Medication) => med.is_active === true);
    
    const allEvents: DoseEvent[] = [];
    
    // For each medication, get its schedule and generate events
    for (const med of activeMeds) {
      try {
        const schedules = await ScheduleAPI.getByMedication(med.id);
        if (!schedules || schedules.length === 0) continue;
        
        const schedule = schedules[0];
        const dosage = `${med.dosage_amount || ''} ${med.dosage_unit || ''}`.trim() || "Take as directed";
        
        // Generate events (this now includes past events)
        const events = await generateEventsFromSchedule(med, schedule, dosage);
        allEvents.push(...events);
      } catch (scheduleError) {
        console.error(`Error loading schedule for medication ${med.id}:`, scheduleError);
      }
    }
    
    // Get notification logs to update statuses
    let logs: NotificationLog[] = [];
    try {
      logs = await NotificationAPI.getMyLogs();
    } catch (logError) {
      console.error("Error loading notification logs:", logError);
    }
    
    // Merge statuses from logs into events
    for (const event of allEvents) {
      const matchingLog = logs.find((log: NotificationLog) => {
        if (!log?.schedule?.medication) return false;
        
        const logDate = new Date(log.planned_datetime);
        const logTime = logDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
        
        return log.schedule.medication.id === event.medicationId &&
               logDate.toDateString() === event.scheduledDate.toDateString() &&
               logTime === event.scheduledTime;
      });
      
      if (matchingLog) {
        event.status = matchingLog.dose_status as 'PENDING' | 'TAKEN' | 'MISSED' | 'LATE';
      }
    }
    
    setDoseEvents(allEvents);
    
  } catch (error) {
    console.error("Error loading calendar data:", error);
  } finally {
    setIsLoading(false);
  }
}, []);


// Helper function to generate events from a schedule
const generateEventsFromSchedule = async (med: Medication, schedule: Schedule, dosage: string): Promise<DoseEvent[]> => {
  const events: DoseEvent[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Generate events for 90 days in the past and 90 days in the future
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 90); // 90 days future
  
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90); // 90 days past
  
  const scheduleStartDate = new Date(schedule.start_date);
  const scheduleEndDate = schedule.end_date ? new Date(schedule.end_date) : endDate;
  
  // For past dates, start from the later of: schedule start date OR 90 days ago
  const effectiveStartDate = scheduleStartDate > ninetyDaysAgo ? scheduleStartDate : ninetyDaysAgo;
  const effectiveEndDate = scheduleEndDate < endDate ? scheduleEndDate : endDate;
  
  // Helper to convert JS day (0-6) to custom day (Saturday=1, Sunday=2...)
  const getCustomDayNumber = (date: Date): number => {
    const jsDay = date.getDay();
    const map: { [key: number]: number } = {
      6: 1, // Saturday
      0: 2, // Sunday
      1: 3, // Monday
      2: 4, // Tuesday
      3: 5, // Wednesday
      4: 6, // Thursday
      5: 7, // Friday
    };
    return map[jsDay];
  };
  
  // Handle MANUAL schedule
  if (schedule.frequency_type === 'MANUAL' && schedule.manual_doses) {
    for (const manualDose of schedule.manual_doses) {
      const doseDate = new Date(manualDose);
      if (doseDate >= effectiveStartDate && doseDate <= effectiveEndDate) {
        events.push({
          id: `${med.id}_manual_${manualDose}`,
          medicationId: med.id,
          medicationName: med.name,
          dosage: dosage,
          scheduledTime: doseDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
          scheduledDate: doseDate,
          channel: med.box_number ? 'IOT' : 'MOBILE',
          status: 'PENDING',
        });
      }
    }
    return events;
  }
  
  // Handle DAILY schedule
  if (schedule.frequency_type === 'DAILY' && schedule.dose_times) {
    let currentDate = new Date(effectiveStartDate);
    
    while (currentDate <= effectiveEndDate) {
      for (const time of schedule.dose_times) {
        const [hours, minutes] = time.split(':').map(Number);
        const doseDateTime = new Date(currentDate);
        doseDateTime.setHours(hours, minutes, 0, 0);
        
        events.push({
          id: `${med.id}_daily_${currentDate.toISOString().split('T')[0]}_${time}`,
          medicationId: med.id,
          medicationName: med.name,
          dosage: dosage,
          scheduledTime: time,
          scheduledDate: new Date(doseDateTime),
          channel: med.box_number ? 'IOT' : 'MOBILE',
          status: 'PENDING',
        });
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    return events;
  }
  
  // Handle WEEKLY schedule
  if (schedule.frequency_type === 'WEEKLY' && schedule.days_of_week && schedule.dose_times) {
    let currentDate = new Date(effectiveStartDate);
    
    while (currentDate <= effectiveEndDate) {
      const customDay = getCustomDayNumber(currentDate);
      
      if (schedule.days_of_week.includes(customDay)) {
        for (const time of schedule.dose_times) {
          const [hours, minutes] = time.split(':').map(Number);
          const doseDateTime = new Date(currentDate);
          doseDateTime.setHours(hours, minutes, 0, 0);
          
          events.push({
            id: `${med.id}_weekly_${currentDate.toISOString().split('T')[0]}_${time}`,
            medicationId: med.id,
            medicationName: med.name,
            dosage: dosage,
            scheduledTime: time,
            scheduledDate: new Date(doseDateTime),
            channel: med.box_number ? 'IOT' : 'MOBILE',
            status: 'PENDING',
          });
        }
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    return events;
  }
  
  return events;
};

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // Set initial selected date when component mounts
  useEffect(() => {
    const today = new Date();
    setCurrentMonth(today);
    setSelectedDate(today);
  }, []);

  // When month changes, select appropriate default date
  useEffect(() => {
    const today = new Date();
    const isCurrentMonth = today.getMonth() === currentMonth.getMonth() && 
                           today.getFullYear() === currentMonth.getFullYear();
    
    if (isCurrentMonth) {
      setSelectedDate(today);
    } else {
      const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      setSelectedDate(firstDayOfMonth);
    }
  }, [currentMonth]);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const days = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    return { days, firstDay };
  };

  const { days, firstDay } = getDaysInMonth(currentMonth);

  // Get events for a specific date
  const getEventsForDate = (date: Date) => {
    return doseEvents.filter(event => {
      return event.scheduledDate.toDateString() === date.toDateString();
    });
  };

  const changeMonth = (increment: number) => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(currentMonth.getMonth() + increment);
    setCurrentMonth(newMonth);
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentMonth(today);
    setSelectedDate(today);
  };

  const renderCalendar = () => {
    const totalCells = 42;
    const calendarDays = [];
    
    for (let i = 0; i < firstDay; i++) {
      calendarDays.push(null);
    }
    
    for (let day = 1; day <= days; day++) {
      const date = new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth(),
        day
      );
      calendarDays.push({
        day,
        date,
        isCurrentMonth: true,
      });
    }
    
    const remainingCells = totalCells - calendarDays.length;
    for (let i = 0; i < remainingCells; i++) {
      calendarDays.push(null);
    }
    
    const weeks = [];
    for (let i = 0; i < calendarDays.length; i += 7) {
      weeks.push(calendarDays.slice(i, i + 7));
    }
    
    return weeks.map((week, weekIndex) => (
      <View key={weekIndex} style={styles.calendarWeek}>
        {week.map((dayData, dayIndex) => {
          if (!dayData) {
            return <View key={`empty-${weekIndex}-${dayIndex}`} style={styles.calendarDay} />;
          }
          
          const { day, date } = dayData;
          const isToday = new Date().toDateString() === date.toDateString();
          const isSelected = selectedDate.toDateString() === date.toDateString();
          const hasEvents = getEventsForDate(date).length > 0;
          
          return (
            <TouchableOpacity
              key={`day-${weekIndex}-${dayIndex}`}
              style={[
                styles.calendarDay,
                isToday && styles.today,
                isSelected && styles.selectedDay,
                hasEvents && styles.hasEvents,
              ]}
              onPress={() => setSelectedDate(date)}
            >
              <Text style={[
                styles.dayText,
                isToday && styles.todayText,
                isSelected && styles.selectedDayText,
              ]}>
                {day}
              </Text>
              {hasEvents && (
                <View style={[
                  styles.eventDot,
                  isSelected && styles.selectedEventDot,
                ]} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    ));
  };

  const formatTime = (time: string) => {
    return time;
  };

  const renderMedicationsForDate = () => {
    const eventsForDate = getEventsForDate(selectedDate);

    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loadingText}>Loading schedule...</Text>
        </View>
      );
    }

    if (eventsForDate.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="calendar-outline" size={48} color="#ccc" />
          <Text style={styles.emptyStateText}>No medications scheduled for this day</Text>
        </View>
      );
    }

    const sortedEvents = [...eventsForDate].sort((a, b) => 
      a.scheduledDate.getTime() - b.scheduledDate.getTime()
    );

    const getTimePeriod = (timeValue: number) => {
      if (timeValue < 12 * 60) return "Morning";
      if (timeValue < 17 * 60) return "Afternoon";
      return "Evening";
    };

    const getStatusInfo = (status: string) => {
      switch (status) {
        case 'TAKEN':
          return { text: 'Taken', color: '#4CAF50', icon: 'checkmark-circle' };
        case 'LATE':
          return { text: 'Late', color: '#FF9800', icon: 'time' };
        case 'MISSED':
          return { text: 'Missed', color: '#f44336', icon: 'close-circle' };
        default:
          return { text: 'Pending', color: '#2196F3', icon: 'time-outline' };
      }
    };

    const getChannelIcon = (channel: string) => {
      return channel === 'IOT' ? 'hardware-chip-outline' : 'phone-portrait-outline';
    };

    let currentPeriod = "";
    
    return (
      <>
        {sortedEvents.map((event) => {
          const [hours, minutes] = event.scheduledTime.split(':').map(Number);
          const timeValue = hours * 60 + minutes;
          const period = getTimePeriod(timeValue);
          const showPeriodHeader = period !== currentPeriod;
          currentPeriod = period;
          const statusInfo = getStatusInfo(event.status);
          
          return (
            <View key={event.id}>
              {showPeriodHeader && (
                <View style={styles.periodHeader}>
                  <Ionicons 
                    name={period === "Morning" ? "sunny" : period === "Afternoon" ? "sunny-outline" : "moon"} 
                    size={16} 
                    color="#2196F3" 
                  />
                  <Text style={styles.periodText}>{period}</Text>
                </View>
              )}
              
              <View style={styles.doseCard}>
                <View style={[styles.medicationColor, { backgroundColor: statusInfo.color }]} />
                <View style={styles.doseInfo}>
                  <Text style={styles.doseTime}>{event.scheduledTime}</Text>
                  <Text style={styles.medicationName}>{event.medicationName}</Text>
                  <Text style={styles.medicationDosage}>{event.dosage}</Text>
                  <View style={styles.channelContainer}>
                    <Ionicons name={getChannelIcon(event.channel)} size={12} color="#999" />
                    <Text style={styles.channelText}>
                      {event.channel === 'IOT' ? 'Device will dispense' : 'Mobile reminder'}
                    </Text>
                  </View>
                </View>
                <View style={styles.statusContainer}>
                  <View style={[styles.statusBadge, { backgroundColor: statusInfo.color + '15' }]}>
                    <Ionicons name={statusInfo.icon as any} size={16} color={statusInfo.color} />
                    <Text style={[styles.statusText, { color: statusInfo.color }]}>{statusInfo.text}</Text>
                  </View>
                </View>
              </View>
            </View>
          );
        })}
      </>
    );
  };

  const isSelectedDateInCurrentMonth = () => {
    return selectedDate.getMonth() === currentMonth.getMonth() && 
           selectedDate.getFullYear() === currentMonth.getFullYear();
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#2196F3", "#1976D2"]}
        style={styles.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      />

      <SafeAreaView style={styles.headerContainer} edges={["top"]}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Schedule</Text>
          <TouchableOpacity onPress={goToToday} style={styles.headerIcon}>
            <Ionicons name="today-outline" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView 
        style={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContentContainer}
      >
        <View style={styles.calendarContainer}>
          <View style={styles.monthHeader}>
            <TouchableOpacity onPress={() => changeMonth(-1)}>
              <Ionicons name="chevron-back" size={24} color="#333" />
            </TouchableOpacity>
            <TouchableOpacity onPress={goToToday}>
              <Text style={styles.monthText}>
                {currentMonth.toLocaleString("en-US", {
                  month: "long",
                  year: "numeric",
                })}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => changeMonth(1)}>
              <Ionicons name="chevron-forward" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <View style={styles.weekdayHeader}>
            {WEEKDAYS.map((day, index) => (
              <Text key={index} style={styles.weekdayText}>
                {day}
              </Text>
            ))}
          </View>

          <View style={styles.calendarGrid}>
            {renderCalendar()}
          </View>
        </View>

        <View style={styles.scheduleContainer}>
          <View style={styles.scheduleHeader}>
            <Text style={styles.scheduleTitle}>
              {selectedDate.toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </Text>
            {!isSelectedDateInCurrentMonth() && (
              <TouchableOpacity onPress={goToToday} style={styles.todayButton}>
                <Text style={styles.todayButtonText}>Go to Today</Text>
              </TouchableOpacity>
            )}
          </View>

          {renderMedicationsForDate()}
        </View>
      </ScrollView>
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
  headerContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 10 : 40,
    paddingBottom: 15,
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: "700",
    color: "white",
  },
  headerIcon: {
    padding: 8,
  },
  scrollContent: {
    flex: 1,
    marginTop: Platform.OS === "ios" ? 100 : 90,
  },
  scrollContentContainer: {
    paddingBottom: 30,
  },
  calendarContainer: {
    backgroundColor: "white",
    borderRadius: 16,
    margin: 20,
    padding: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  monthHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
    paddingHorizontal: 10,
  },
  monthText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  weekdayHeader: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  weekdayText: {
    width: DAY_SIZE,
    textAlign: "center",
    color: "#666",
    fontWeight: "500",
    fontSize: 13,
  },
  calendarGrid: {
    marginTop: 5,
  },
  calendarWeek: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 6,
  },
  calendarDay: {
    width: DAY_SIZE,
    height: DAY_SIZE,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: DAY_SIZE / 2,
  },
  dayText: {
    fontSize: 15,
    color: "#333",
    fontWeight: "500",
  },
  today: {
    backgroundColor: "#2196F315",
  },
  todayText: {
    color: "#2196F3",
    fontWeight: "600",
  },
  selectedDay: {
    backgroundColor: "#2196F3",
  },
  selectedDayText: {
    color: "white",
    fontWeight: "600",
  },
  hasEvents: {
    position: "relative",
  },
  eventDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "#2196F3",
    position: "absolute",
    bottom: 4,
  },
  selectedEventDot: {
    backgroundColor: "white",
  },
  scheduleContainer: {
    flex: 1,
    backgroundColor: "white",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  scheduleHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  scheduleTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333",
    flex: 1,
  },
  todayButton: {
    backgroundColor: "#E3F2FD",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  todayButtonText: {
    color: "#2196F3",
    fontSize: 12,
    fontWeight: "600",
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 14,
    color: "#666",
    marginTop: 10,
  },
  medicationColor: {
    width: 8,
    height: 40,
    borderRadius: 4,
    marginRight: 12,
  },
  medicationName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 2,
  },
  medicationDosage: {
    fontSize: 13,
    color: "#666",
  },
  channelContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  channelText: {
    fontSize: 10,
    color: "#999",
  },
  periodHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  periodText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2196F3",
    marginLeft: 6,
  },
  doseCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#f0f0f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  doseInfo: {
    flex: 1,
    marginLeft: 12,
  },
  doseTime: {
    fontSize: 15,
    fontWeight: "700",
    color: "#2196F3",
    marginBottom: 4,
  },
  statusContainer: {
    minWidth: 90,
    alignItems: "flex-end",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontWeight: "600",
    fontSize: 12,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: "#999",
    marginTop: 12,
    textAlign: "center",
  },
});