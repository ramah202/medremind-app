import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import DateTimePicker from "@react-native-community/datetimepicker";
import { MedicationAPI } from "../../services/medicationAPI";
import { ScheduleAPI } from "../../services/scheduleAPI";

const { width } = require("react-native").Dimensions.get("window");

// Days of week for weekly schedule
const DAYS_OF_WEEK = [
  { id: 1, label: "Mon", short: "M" },
  { id: 2, label: "Tue", short: "T" },
  { id: 3, label: "Wed", short: "W" },
  { id: 4, label: "Thu", short: "T" },
  { id: 5, label: "Fri", short: "F" },
  { id: 6, label: "Sat", short: "S" },
  { id: 7, label: "Sun", short: "S" },
];

// Available boxes
const BOXES = [
  { number: 1, status: "available" },
  { number: 2, status: "available" },
  { number: 3, status: "available" },
  { number: 4, status: "available" },
];

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

// Backend compatible frequency types
const FREQUENCIES = [
  {
    id: "DAILY",
    label: "Daily",
    icon: "sunny-outline" as const,
    defaultTimes: ["09:00"],
  },
  {
    id: "WEEKLY",
    label: "Weekly",
    icon: "calendar-outline" as const,
    defaultTimes: ["09:00"],
  },
  {
    id: "MANUAL",
    label: "Manual",
    icon: "time-outline" as const,
    defaultTimes: [],
  },
];

// Format time in 24-hour format
const formatTime24 = (date: Date) => {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

export default function MedicationDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [medication, setMedication] = useState<Medication | null>(null);
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [boxes, setBoxes] = useState(BOXES);
  
  // Unified modals for date and time pickers
  const [showDatePickerModal, setShowDatePickerModal] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState<'start' | 'end'>('start');
  const [tempSelectedDate, setTempSelectedDate] = useState(new Date());
  
  const [showTimePickerModal, setShowTimePickerModal] = useState(false);
  const [tempSelectedTime, setTempSelectedTime] = useState(new Date());
  const [editingTimeIndex, setEditingTimeIndex] = useState(0);
  
  // Manual dose picker states
  const [selectedManualDoseIndex, setSelectedManualDoseIndex] = useState(-1);
  const [showManualDatePicker, setShowManualDatePicker] = useState(false);
  const [showManualTimePicker, setShowManualTimePicker] = useState(false);
  const [tempManualDate, setTempManualDate] = useState(new Date());
  
  // Form state for editing
  const [form, setForm] = useState({
    name: "",
    dosage_amount: "",
    dosage_unit: "",
    notes: "",
    box_number: "",
    start_date: new Date(),
    end_date: null as Date | null,
    frequency_type: "",
    days_of_week: [] as number[],
    dose_times: [] as string[],
    manual_doses: [] as Date[],
  });

  // Store original form data for cancel functionality
  const [originalForm, setOriginalForm] = useState({
    name: "",
    dosage_amount: "",
    dosage_unit: "",
    notes: "",
    box_number: "",
    start_date: new Date(),
    end_date: null as Date | null,
    frequency_type: "",
    days_of_week: [] as number[],
    dose_times: [] as string[],
    manual_doses: [] as Date[],
  });

  useEffect(() => {
    loadMedicationDetails();
    fetchBoxStatus();
  }, [id]);

  const fetchBoxStatus = async () => {
    try {
      const medications = await MedicationAPI.getAll();
      const usedBoxes = medications
        .filter((med: any) => med.is_active === true && med.box_number && med.id !== Number(id))
        .map((med: any) => parseInt(med.box_number));
      
      const updatedBoxes = [1, 2, 3, 4].map(boxNum => ({
        number: boxNum,
        status: usedBoxes.includes(boxNum) ? "used" : "available"
      }));
      
      setBoxes(updatedBoxes);
    } catch (error) {
      console.error("Error fetching box status:", error);
    }
  };

  const safeParseDate = (dateValue: string | null | undefined): Date | null => {
    if (!dateValue) return null;
    
    try {
      if (typeof dateValue === 'string' && dateValue.match(/^\d{4}-\d{2}-\d{2}/)) {
        const parts = dateValue.split('T')[0].split('-');
        return new Date(Date.UTC(
          parseInt(parts[0]), 
          parseInt(parts[1]) - 1, 
          parseInt(parts[2]), 
          12, 0, 0
        ));
      }
      const parsed = new Date(dateValue);
      return isNaN(parsed.getTime()) ? null : parsed;
    } catch (error) {
      return null;
    }
  };

  const formatGregorianDate = (date: any) => {
    if (!date) return "Not set";
    
    let dateObj = date;
    if (typeof date === 'string') {
      dateObj = safeParseDate(date);
    }
    if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) {
      return "Invalid date";
    }
    
    return dateObj.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getDateStringForAPI = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Open date picker for start or end date
  const openDatePicker = (mode: 'start' | 'end') => {
    setDatePickerMode(mode);
    setTempSelectedDate(mode === 'start' ? form.start_date : (form.end_date || new Date()));
    setShowDatePickerModal(true);
  };

  // Confirm date selection
  const confirmDateSelection = () => {
    if (datePickerMode === 'start') {
      setForm({ ...form, start_date: tempSelectedDate });
    } else {
      setForm({ ...form, end_date: tempSelectedDate });
    }
    setShowDatePickerModal(false);
  };

  // Open time picker for dose times
  const openTimePicker = (index: number) => {
    setEditingTimeIndex(index);
    const [hours, minutes] = form.dose_times[index].split(":").map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    setTempSelectedTime(date);
    setShowTimePickerModal(true);
  };

  // Confirm time selection
  const confirmTimeSelection = () => {
    const newTime = formatTime24(tempSelectedTime);
    const newTimes = [...form.dose_times];
    newTimes[editingTimeIndex] = newTime;
    setForm({ ...form, dose_times: newTimes });
    setShowTimePickerModal(false);
  };

  // Manual dose picker functions
  const openManualDatePickerModal = (index: number) => {
    setSelectedManualDoseIndex(index);
    setTempManualDate(form.manual_doses[index]);
    setShowManualDatePicker(true);
  };

  const confirmManualDateSelection = () => {
    if (selectedManualDoseIndex >= 0) {
      const newDoses = [...form.manual_doses];
      newDoses[selectedManualDoseIndex] = tempManualDate;
      setForm({ ...form, manual_doses: newDoses });
    }
    setShowManualDatePicker(false);
  };

  const cancelManualDateSelection = () => {
    setShowManualDatePicker(false);
  };
  const editManualDose = (index: number) => {
  setSelectedManualDoseIndex(index);
  setTempManualDate(form.manual_doses[index]);
  setShowManualDatePicker(true);
};

  const openManualTimePickerModal = (index: number) => {
    setSelectedManualDoseIndex(index);
    setTempManualDate(form.manual_doses[index]);
    setShowManualTimePicker(true);
  };

  const confirmManualTimeSelection = () => {
    if (selectedManualDoseIndex >= 0) {
      const newDoses = [...form.manual_doses];
      const currentDate = newDoses[selectedManualDoseIndex];
      currentDate.setHours(tempManualDate.getHours(), tempManualDate.getMinutes());
      newDoses[selectedManualDoseIndex] = currentDate;
      setForm({ ...form, manual_doses: newDoses });
    }
    setShowManualTimePicker(false);
  };

  const cancelManualTimeSelection = () => {
    setShowManualTimePicker(false);
  };

const addManualDose = () => {
  setSelectedManualDoseIndex(-1); // -1 indicates this is a NEW dose
  setTempManualDate(new Date());
  setShowManualDatePicker(true);
};
// Add a new confirm function for adding manual doses
const confirmAddManualDose = () => {
  setForm({ ...form, manual_doses: [...form.manual_doses, tempManualDate] });
  setShowManualDatePicker(false);
  setSelectedManualDoseIndex(-1);
};

  const removeManualDose = (index: number) => {
    const newDoses = form.manual_doses.filter((_, i) => i !== index);
    setForm({ ...form, manual_doses: newDoses });
  };

  const loadMedicationDetails = async () => {
    try {
      setIsLoading(true);
      const med = await MedicationAPI.getById(Number(id));
      setMedication(med);
      
      const schedules = await ScheduleAPI.getByMedication(Number(id));
      if (schedules && schedules.length > 0) {
        const currentSchedule = schedules[0];
        setSchedule(currentSchedule);
        
        const parsedStartDate = safeParseDate(currentSchedule.start_date);
        const parsedEndDate = safeParseDate(currentSchedule.end_date);
        
        const newForm = {
          name: med.name,
          dosage_amount: med.dosage_amount?.toString() || "",
          dosage_unit: med.dosage_unit || "",
          notes: med.notes || "",
          box_number: med.box_number || "",
          start_date: parsedStartDate || new Date(),
          end_date: parsedEndDate,
          frequency_type: currentSchedule.frequency_type,
          days_of_week: currentSchedule.days_of_week || [],
          dose_times: currentSchedule.dose_times || [],
          manual_doses: currentSchedule.manual_doses && Array.isArray(currentSchedule.manual_doses)
            ? (currentSchedule.manual_doses as string[]).map(d => safeParseDate(d)).filter(d => d !== null) as Date[]
            : [],
        };
        setForm(newForm);
        
        const originalCopy = {
          ...newForm,
          start_date: newForm.start_date ? new Date(newForm.start_date) : new Date(),
          end_date: newForm.end_date ? new Date(newForm.end_date) : null,
          manual_doses: newForm.manual_doses.map(d => new Date(d)),
        };
        setOriginalForm(originalCopy);
      } else {
        const newForm = {
          name: med.name,
          dosage_amount: med.dosage_amount?.toString() || "",
          dosage_unit: med.dosage_unit || "",
          notes: med.notes || "",
          box_number: med.box_number || "",
          start_date: new Date(),
          end_date: null,
          frequency_type: "",
          days_of_week: [],
          dose_times: [],
          manual_doses: [],
        };
        setForm(newForm);
        const originalCopy = {
          ...newForm,
          start_date: new Date(newForm.start_date),
          end_date: null,
          manual_doses: [],
        };
        setOriginalForm(originalCopy);
      }
    } catch (error: any) {
      console.error("Error loading medication details:", error);
      Alert.alert("Error", error.message || "Failed to load medication details");
      router.back();
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setForm({
      ...originalForm,
      start_date: originalForm.start_date ? new Date(originalForm.start_date) : new Date(),
      end_date: originalForm.end_date ? new Date(originalForm.end_date) : null,
      manual_doses: originalForm.manual_doses.map(d => new Date(d)),
    });
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!form.name) {
      Alert.alert("Error", "Medication name is required");
      return;
    }

    setIsLoading(true);
    try {
      const medicationUpdate: any = { name: form.name };
      if (form.dosage_amount) medicationUpdate.dosage_amount = parseFloat(form.dosage_amount);
      if (form.dosage_unit) medicationUpdate.dosage_unit = form.dosage_unit;
      if (form.notes) medicationUpdate.notes = form.notes;
      if (form.box_number) medicationUpdate.box_number = form.box_number;
      else medicationUpdate.box_number = null;
      
      await MedicationAPI.update(Number(id), medicationUpdate);
      
      let updatedSchedule: Schedule | null = null;
      
      if (form.box_number && form.frequency_type) {
        const scheduleUpdate: any = {
          start_date: getDateStringForAPI(form.start_date),
          frequency_type: form.frequency_type,
        };
        
        if (form.end_date) {
          scheduleUpdate.end_date = getDateStringForAPI(form.end_date);
        }
        
        if (form.frequency_type === 'DAILY') {
          scheduleUpdate.dose_times = form.dose_times;
          scheduleUpdate.days_of_week = null;
          scheduleUpdate.manual_doses = null;
        } else if (form.frequency_type === 'WEEKLY') {
          scheduleUpdate.days_of_week = form.days_of_week;
          scheduleUpdate.dose_times = form.dose_times;
          scheduleUpdate.manual_doses = null;
        } else if (form.frequency_type === 'MANUAL') {
          scheduleUpdate.manual_doses = form.manual_doses.map(d => d.toISOString());
          scheduleUpdate.days_of_week = null;
          scheduleUpdate.dose_times = null;
        }
        
        if (schedule) {
          updatedSchedule = await ScheduleAPI.update(schedule.id, scheduleUpdate);
        } else {
          updatedSchedule = await ScheduleAPI.create({
            medication_id: Number(id),
            ...scheduleUpdate
          });
        }
      } else if (schedule && !form.box_number) {
        await ScheduleAPI.delete(schedule.id);
      }
      
      Alert.alert("Success", "Medication updated successfully", [
        { text: "OK", onPress: () => router.replace("/(tabs)/meds") }
      ]);
      
      setIsEditing(false);
      await loadMedicationDetails();
      await fetchBoxStatus();
    } catch (error: any) {
      console.error("Error saving medication:", error);
      Alert.alert("Error", error.message || "Failed to update medication");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Medication",
      `Are you sure you want to delete ${medication?.name}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setIsLoading(true);
            try {
              await MedicationAPI.deactivate(Number(id));
              Alert.alert("Success", "Medication deleted successfully", [
                { text: "OK", onPress: () => router.replace("/(tabs)/meds") },
              ]);
            } catch (error: any) {
              Alert.alert("Error", error.message || "Failed to delete medication");
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleBoxSelect = (boxNumber: number) => {
    const selectedBox = boxes.find(b => b.number === boxNumber);
    if (selectedBox?.status === 'used' && form.box_number !== boxNumber.toString()) {
      Alert.alert("Box Unavailable", `Box ${boxNumber} is already in use.`);
      return;
    }
    
    if (form.box_number === boxNumber.toString()) {
      setForm({ ...form, box_number: "", frequency_type: "", dose_times: [], manual_doses: [] });
    } else {
      setForm({ ...form, box_number: boxNumber.toString() });
    }
  };

  const handleFrequencySelect = (freq: typeof FREQUENCIES[0]) => {
    setForm({
      ...form,
      frequency_type: freq.id,
      dose_times: freq.defaultTimes.length > 0 ? [...freq.defaultTimes] : [],
      days_of_week: [],
      manual_doses: [],
    });
  };

  const toggleDayOfWeek = (dayId: number) => {
    const newDays = form.days_of_week.includes(dayId)
      ? form.days_of_week.filter(d => d !== dayId)
      : [...form.days_of_week, dayId];
    setForm({ ...form, days_of_week: newDays });
  };

  const addTimeSlot = () => {
    if (form.dose_times.length < 6) {
      setForm({ ...form, dose_times: [...form.dose_times, "12:00"] });
    } else {
      Alert.alert("Limit", "Maximum 6 time slots");
    }
  };

  const removeTimeSlot = (index: number) => {
    if (form.dose_times.length > 1) {
      const newTimes = form.dose_times.filter((_, i) => i !== index);
      setForm({ ...form, dose_times: newTimes });
    } else {
      Alert.alert("Error", "At least one time slot required");
    }
  };

  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  const renderBoxes = () => {
    return (
      <View style={styles.boxesContainer}>
        <Text style={styles.boxesTitle}>Device Box Assignment</Text>
        <Text style={styles.boxesSubtitle}>
          Select a box to assign this medication. Tap again to remove assignment.
        </Text>
        <View style={styles.boxesGrid}>
          {boxes.map((box) => {
            const isSelected = form.box_number === box.number.toString();
            const isUsed = box.status === 'used';
            
            return (
              <TouchableOpacity
                key={box.number}
                style={[
                  styles.boxCard,
                  isSelected && styles.boxCardSelected,
                  isUsed && !isSelected && styles.boxCardUsed,
                ]}
                onPress={() => isEditing && handleBoxSelect(box.number)}
                disabled={!isEditing}
              >
                <View style={styles.boxNumberContainer}>
                  <Text style={[
                    styles.boxNumber,
                    isSelected && styles.boxNumberSelected,
                    isUsed && !isSelected && styles.boxNumberUsed,
                  ]}>
                    {box.number}
                  </Text>
                </View>
                <Text style={[
                  styles.boxStatus,
                  isSelected && styles.boxStatusSelected,
                  isUsed && !isSelected && styles.boxStatusUsed,
                ]}>
                  {isSelected ? "Selected" : isUsed ? "In Use" : "Available"}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  const renderFrequencyOptions = () => {
    return (
      <View style={styles.optionsGrid}>
        {FREQUENCIES.map((freq) => (
          <TouchableOpacity
            key={freq.id}
            style={[
              styles.optionCard,
              form.frequency_type === freq.id && styles.selectedOptionCard,
            ]}
            onPress={() => isEditing && handleFrequencySelect(freq)}
            disabled={!isEditing}
          >
            <View style={[
              styles.optionIcon,
              form.frequency_type === freq.id && styles.selectedOptionIcon,
            ]}>
              <Ionicons
                name={freq.icon}
                size={24}
                color={form.frequency_type === freq.id ? "white" : "#666"}
              />
            </View>
            <Text style={[
              styles.optionLabel,
              form.frequency_type === freq.id && styles.selectedOptionLabel,
            ]}>
              {freq.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderManualDoseItem = (dose: Date, index: number) => {
    return (
      <View key={index} style={styles.manualDoseContainer}>
        <View style={styles.manualDoseRow}>
          <TouchableOpacity
            style={styles.manualDoseDateButton}
            onPress={() => isEditing && openManualDatePickerModal(index)}
            disabled={!isEditing}
          >
            <Ionicons name="calendar-outline" size={20} color="#2196F3" />
            <Text style={styles.manualDoseDateText}>
              {formatGregorianDate(dose)}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.manualDoseTimeButton}
            onPress={() => isEditing && openManualTimePickerModal(index)}
            disabled={!isEditing}
          >
            <Ionicons name="time-outline" size={20} color="#2196F3" />
            <Text style={styles.manualDoseTimeText}>
              {formatTime24(dose)}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => isEditing && removeManualDose(index)}
            disabled={!isEditing}
            style={styles.removeManualDoseButton}
          >
            <Ionicons name="close-circle" size={24} color="#FF5252" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const hasSelectedBox = form.box_number !== "";

  if (isLoading && !medication) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!medication) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Medication not found</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: isEditing ? "Edit Medication" : "Medication Details",
          headerStyle: { backgroundColor: "#2196F3" },
          headerTintColor: "white",
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <View style={styles.headerButtons}>
              {!isEditing ? (
                <>
                  <TouchableOpacity onPress={() => setIsEditing(true)} style={styles.headerButton}>
                    <Ionicons name="create-outline" size={22} color="white" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleDelete} style={styles.headerButton}>
                    <Ionicons name="trash-outline" size={22} color="white" />
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TouchableOpacity onPress={handleSave} style={styles.headerButton}>
                    <Text style={styles.headerSaveText}>Save</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleCancel} style={styles.headerButton}>
                    <Text style={styles.headerCancelText}>Cancel</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          ),
        }}
      />

      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
      >
        <ScrollView 
          style={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <LinearGradient
            colors={["#2196F3", "#1976D2"]}
            style={styles.headerGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <View style={styles.medicationHeader}>
              <View style={styles.medicationIcon}>
                <Ionicons name="medical" size={50} color="white" />
              </View>
              <Text style={styles.medicationName}>
                {isEditing ? form.name : medication.name}
              </Text>
              {medication.dosage_amount && medication.dosage_unit && (
                <Text style={styles.medicationDosage}>
                  {medication.dosage_amount} {medication.dosage_unit}
                </Text>
              )}
            </View>
          </LinearGradient>

          <View style={styles.content}>
            {/* Basic Info Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                <Ionicons name="medical-outline" size={20} color="#2196F3" /> Medication Info
              </Text>
              {isEditing ? (
                <>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Name *</Text>
                    <TextInput
                      style={styles.input}
                      value={form.name}
                      onChangeText={(text) => setForm({ ...form, name: text })}
                    />
                  </View>
                  <View style={styles.rowInputs}>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                      <Text style={styles.inputLabel}>Dosage</Text>
                      <TextInput
                        style={styles.input}
                        value={form.dosage_amount}
                        onChangeText={(text) => setForm({ ...form, dosage_amount: text })}
                        keyboardType="numeric"
                      />
                    </View>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                      <Text style={styles.inputLabel}>Unit</Text>
                      <TextInput
                        style={styles.input}
                        value={form.dosage_unit}
                        onChangeText={(text) => setForm({ ...form, dosage_unit: text })}
                      />
                    </View>
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Name:</Text>
                    <Text style={styles.infoValue}>{medication.name}</Text>
                  </View>
                  {medication.dosage_amount && (
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Dosage:</Text>
                      <Text style={styles.infoValue}>
                        {medication.dosage_amount} {medication.dosage_unit || ''}
                      </Text>
                    </View>
                  )}
                </>
              )}
            </View>

            {/* Box Selection */}
            {renderBoxes()}

            {/* Schedule Section - Only show if box is selected */}
            {hasSelectedBox && (
              <>
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>
                    <Ionicons name="calendar-outline" size={20} color="#2196F3" /> Schedule
                  </Text>
                  
                  {renderFrequencyOptions()}

                  {form.frequency_type === "WEEKLY" && (
                    <View style={styles.daysContainer}>
                      <Text style={styles.daysLabel}>Select Days</Text>
                      <View style={styles.daysGrid}>
                        {DAYS_OF_WEEK.map((day) => (
                          <TouchableOpacity
                            key={day.id}
                            style={[
                              styles.dayButton,
                              form.days_of_week.includes(day.id) && styles.dayButtonActive,
                            ]}
                            onPress={() => isEditing && toggleDayOfWeek(day.id)}
                            disabled={!isEditing}
                          >
                            <Text style={[
                              styles.dayButtonText,
                              form.days_of_week.includes(day.id) && styles.dayButtonTextActive,
                            ]}>
                              {day.short}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* Start Date */}
                  <View style={styles.dateSection}>
                    <Text style={styles.dateLabel}>Start Date</Text>
                    <TouchableOpacity
                      style={styles.dateButton}
                      onPress={() => {
                        if (isEditing) {
                          openDatePicker('start');
                        }
                      }}
                      disabled={!isEditing}
                    >
                      <View style={styles.dateIconContainer}>
                        <Ionicons name="calendar-outline" size={22} color="#2196F3" />
                      </View>
                      <Text style={styles.dateButtonText}>
                        {formatGregorianDate(form.start_date)}
                      </Text>
                      <Ionicons name="chevron-forward" size={20} color="#999" />
                    </TouchableOpacity>
                  </View>

                  {/* End Date */}
                  <View style={styles.dateSection}>
                    <Text style={styles.dateLabel}>End Date (Optional)</Text>
                    <TouchableOpacity
                      style={styles.dateButton}
                      onPress={() => {
                        if (isEditing) {
                          openDatePicker('end');
                        }
                      }}
                      disabled={!isEditing}
                    >
                      <View style={styles.dateIconContainer}>
                        <Ionicons name="calendar-outline" size={22} color="#2196F3" />
                      </View>
                      <Text style={styles.dateButtonText}>
                        {form.end_date ? formatGregorianDate(form.end_date) : "No end date"}
                      </Text>
                      {form.end_date && isEditing && (
                        <TouchableOpacity
                          onPress={() => setForm({ ...form, end_date: null })}
                          style={styles.clearDateButton}
                        >
                          <Ionicons name="close-circle" size={20} color="#999" />
                        </TouchableOpacity>
                      )}
                      <Ionicons name="chevron-forward" size={20} color="#999" />
                    </TouchableOpacity>
                  </View>

                  {/* Dose Times */}
                  {(form.frequency_type === "DAILY" || form.frequency_type === "WEEKLY") && (
                    <View style={styles.timesContainer}>
                      <View style={styles.timesHeader}>
                        <Text style={styles.timesTitle}>Dose Times</Text>
                        {isEditing && (
                          <TouchableOpacity onPress={addTimeSlot} style={styles.addTimeSlotButton}>
                            <Ionicons name="add-circle" size={22} color="#2196F3" />
                            <Text style={styles.addTimeSlotText}>Add Time</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                      {form.dose_times.map((time, index) => (
                        <View key={index} style={styles.timeSlotContainer}>
                          <TouchableOpacity
                            style={styles.timeButton}
                            onPress={() => isEditing && openTimePicker(index)}
                            disabled={!isEditing}
                          >
                            <View style={styles.timeIconContainer}>
                              <Ionicons name="time-outline" size={20} color="#2196F3" />
                            </View>
                            <Text style={styles.timeButtonText}>Dose {index + 1}: {time}</Text>
                            <Ionicons name="chevron-forward" size={20} color="#999" />
                          </TouchableOpacity>
                          {form.dose_times.length > 1 && isEditing && (
                            <TouchableOpacity onPress={() => removeTimeSlot(index)} style={styles.removeTimeButton}>
                              <Ionicons name="close-circle" size={24} color="#FF5252" />
                            </TouchableOpacity>
                          )}
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Manual Doses */}
                  {form.frequency_type === "MANUAL" && (
                    <View style={styles.timesContainer}>
                      <View style={styles.timesHeader}>
                        <Text style={styles.timesTitle}>Manual Doses</Text>
                        {isEditing && (
                          <TouchableOpacity onPress={addManualDose} style={styles.addTimeSlotButton}>
                            <Ionicons name="add-circle" size={22} color="#2196F3" />
                            <Text style={styles.addTimeSlotText}>Add Dose</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                      {form.manual_doses.map((dose, index) => renderManualDoseItem(dose, index))}
                    </View>
                  )}
                </View>
              </>
            )}

            {/* Notes Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                <Ionicons name="document-text-outline" size={20} color="#2196F3" /> Notes
              </Text>
              {isEditing ? (
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={form.notes}
                  onChangeText={(text) => setForm({ ...form, notes: text })}
                  placeholder="Additional notes"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              ) : (
                <Text style={styles.notesText}>{medication.notes || "No notes"}</Text>
              )}
            </View>

            {!isEditing && (
              <TouchableOpacity style={styles.editButton} onPress={() => setIsEditing(true)}>
                <Ionicons name="create-outline" size={20} color="white" />
                <Text style={styles.actionButtonText}>Edit Medication</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Unified Date Picker Modal */}
      <Modal visible={showDatePickerModal} transparent animationType="slide" onRequestClose={() => setShowDatePickerModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {datePickerMode === 'start' ? 'Select Start Date' : 'Select End Date'}
              </Text>
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
              minimumDate={datePickerMode === 'start' ? new Date() : form.start_date}
              textColor="#000000"
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

      {/* Unified Time Picker Modal */}
      <Modal visible={showTimePickerModal} transparent animationType="slide" onRequestClose={() => setShowTimePickerModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Time (24-hour format)</Text>
              <TouchableOpacity onPress={() => setShowTimePickerModal(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <DateTimePicker
              value={tempSelectedTime}
              mode="time"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={(event, date) => {
                if (event.type === "set" && date) {
                  setTempSelectedTime(date);
                }
              }}
              textColor="#000000"
              is24Hour={true}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelModalButton]}
                onPress={() => setShowTimePickerModal(false)}
              >
                <Text style={styles.cancelModalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmModalButton]}
                onPress={confirmTimeSelection}
              >
                <Text style={styles.confirmModalButtonText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

   {/* Manual Dose Date Picker - With Confirm/Cancel buttons */}
<Modal
  visible={showManualDatePicker}
  transparent={true}
  animationType="slide"
  onRequestClose={cancelManualDateSelection}
>
  <View style={styles.modalOverlay}>
    <View style={styles.modalContent}>
      <View style={styles.modalHeader}>
        <Text style={styles.modalTitle}>
          {selectedManualDoseIndex >= 0 ? "Select Date" : "Add Manual Dose"}
        </Text>
        <TouchableOpacity onPress={cancelManualDateSelection}>
          <Ionicons name="close" size={24} color="#666" />
        </TouchableOpacity>
      </View>
      
      <DateTimePicker
        value={tempManualDate}
        mode="date"
        display={Platform.OS === "ios" ? "spinner" : "calendar"}
        onChange={(event, date) => {
          if (event.type === "set" && date) {
            setTempManualDate(date);
          }
        }}
        minimumDate={new Date()}
        textColor="#000000"
      />
      
      <View style={styles.modalButtons}>
        <TouchableOpacity
          style={[styles.modalButton, styles.cancelModalButton]}
          onPress={cancelManualDateSelection}
        >
          <Text style={styles.cancelModalButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modalButton, styles.confirmModalButton]}
          onPress={selectedManualDoseIndex >= 0 ? confirmManualDateSelection : confirmAddManualDose}
        >
          <Text style={styles.confirmModalButtonText}>Confirm</Text>
        </TouchableOpacity>
      </View>
    </View>
  </View>
</Modal>

   {/* Manual Dose Time Picker - With Confirm/Cancel buttons */}
<Modal
  visible={showManualTimePicker}
  transparent={true}
  animationType="slide"
  onRequestClose={cancelManualTimeSelection}
>
  <View style={styles.modalOverlay}>
    <View style={styles.modalContent}>
      <View style={styles.modalHeader}>
        <Text style={styles.modalTitle}>
          {selectedManualDoseIndex >= 0 ? "Select Time" : "Add Manual Dose Time"}
        </Text>
        <TouchableOpacity onPress={cancelManualTimeSelection}>
          <Ionicons name="close" size={24} color="#666" />
        </TouchableOpacity>
      </View>
      
      <DateTimePicker
        value={tempManualDate}
        mode="time"
        display={Platform.OS === "ios" ? "spinner" : "default"}
        onChange={(event, date) => {
          if (event.type === "set" && date) {
            setTempManualDate(date);
          }
        }}
        textColor="#000000"
        is24Hour={true}
      />
      
      <View style={styles.modalButtons}>
        <TouchableOpacity
          style={[styles.modalButton, styles.cancelModalButton]}
          onPress={cancelManualTimeSelection}
        >
          <Text style={styles.cancelModalButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modalButton, styles.confirmModalButton]}
          onPress={confirmManualTimeSelection}
        >
          <Text style={styles.confirmModalButtonText}>Confirm</Text>
        </TouchableOpacity>
      </View>
    </View>
  </View>
</Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 10, fontSize: 16, color: "#666" },
  backButton: { marginLeft: 10 },
  headerButtons: { flexDirection: "row", gap: 15, marginRight: 10 },
  headerButton: { marginLeft: 15 },
  headerSaveText: { color: "white", fontSize: 16, fontWeight: "600" },
  headerCancelText: { color: "#FFB6C1", fontSize: 16 },
  headerGradient: { paddingTop: 40, paddingBottom: 30 },
  medicationHeader: { alignItems: "center" },
  medicationIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
  },
  medicationName: { fontSize: 24, fontWeight: "bold", color: "white", marginBottom: 5 },
  medicationDosage: { fontSize: 16, color: "rgba(255,255,255,0.9)" },
  content: { padding: 20 },
  section: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: { fontSize: 18, fontWeight: "600", color: "#333", marginBottom: 15 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#f0f0f0" },
  infoLabel: { fontSize: 14, color: "#666" },
  infoValue: { fontSize: 14, color: "#333", fontWeight: "500" },
  boxesContainer: { marginBottom: 20 },
  boxesTitle: { fontSize: 16, fontWeight: "600", color: "#333", marginBottom: 8 },
  boxesSubtitle: { fontSize: 12, color: "#666", marginBottom: 15 },
  boxesGrid: { flexDirection: "row", justifyContent: "space-between" },
  boxCard: {
    width: (width - 60) / 4,
    backgroundColor: "white",
    borderRadius: 12,
    padding: 10,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#e0e0e0",
  },
  boxCardSelected: { borderColor: "#2196F3", backgroundColor: "#E3F2FD" },
  boxCardUsed: { borderColor: "#FFCDD2", backgroundColor: "#FFF5F5", opacity: 0.7 },
  boxNumberContainer: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#f5f5f5", justifyContent: "center", alignItems: "center", marginBottom: 5 },
  boxNumber: { fontSize: 18, fontWeight: "bold", color: "#666" },
  boxNumberSelected: { color: "#2196F3" },
  boxNumberUsed: { color: "#FF5252" },
  boxStatus: { fontSize: 9, fontWeight: "500", color: "#666" },
  boxStatusSelected: { color: "#2196F3" },
  boxStatusUsed: { color: "#FF5252" },
  optionsGrid: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -5 },
  optionCard: {
    width: (width - 70) / 2,
    backgroundColor: "white",
    borderRadius: 16,
    padding: 12,
    margin: 5,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  selectedOptionCard: { backgroundColor: "#2196F3", borderColor: "#2196F3" },
  optionIcon: { width: 45, height: 45, borderRadius: 23, backgroundColor: "#f5f5f5", justifyContent: "center", alignItems: "center", marginBottom: 8 },
  selectedOptionIcon: { backgroundColor: "rgba(255,255,255,0.2)" },
  optionLabel: { fontSize: 13, fontWeight: "600", color: "#333" },
  selectedOptionLabel: { color: "white" },
  daysContainer: { marginTop: 15 },
  daysLabel: { fontSize: 14, fontWeight: "500", color: "#333", marginBottom: 10 },
  daysGrid: { flexDirection: "row", justifyContent: "space-between" },
  dayButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#f5f5f5", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "#e0e0e0" },
  dayButtonActive: { backgroundColor: "#2196F3", borderColor: "#2196F3" },
  dayButtonText: { fontSize: 14, fontWeight: "600", color: "#666" },
  dayButtonTextActive: { color: "white" },
  dateSection: { marginTop: 15 },
  dateLabel: { fontSize: 14, fontWeight: "500", color: "#333", marginBottom: 8 },
  dateButton: { flexDirection: "row", alignItems: "center", backgroundColor: "white", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "#e0e0e0" },
  dateIconContainer: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#f5f5f5", justifyContent: "center", alignItems: "center", marginRight: 10 },
  dateButtonText: { flex: 1, fontSize: 14, color: "#333" },
  clearDateButton: { padding: 5 },
  timesContainer: { marginTop: 20 },
  timesHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  timesTitle: { fontSize: 16, fontWeight: "600", color: "#333" },
  addTimeSlotButton: { flexDirection: "row", alignItems: "center", gap: 4 },
  addTimeSlotText: { fontSize: 13, color: "#2196F3", fontWeight: "500" },
  timeSlotContainer: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  timeButton: { flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: "#f5f5f5", borderRadius: 10, padding: 10, gap: 8 },
  timeIconContainer: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#E3F2FD", justifyContent: "center", alignItems: "center" },
  timeButtonText: { flex: 1, fontSize: 14, color: "#333" },
  removeTimeButton: { marginLeft: 8, padding: 4 },
  manualDoseContainer: { marginBottom: 8 },
  manualDoseRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  manualDoseDateButton: { flex: 2, flexDirection: "row", alignItems: "center", backgroundColor: "#f5f5f5", borderRadius: 10, padding: 10, gap: 8 },
  manualDoseDateText: { flex: 1, fontSize: 13, color: "#333" },
  manualDoseTimeButton: { flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: "#f5f5f5", borderRadius: 10, padding: 10, gap: 8 },
  manualDoseTimeText: { flex: 1, fontSize: 13, color: "#333" },
  removeManualDoseButton: { padding: 4 },
  inputGroup: { marginBottom: 15 },
  inputLabel: { fontSize: 14, fontWeight: "500", color: "#333", marginBottom: 5 },
  input: { backgroundColor: "#f5f5f5", borderRadius: 10, padding: 12, fontSize: 16, color: "#333", borderWidth: 1, borderColor: "#e0e0e0" },
  textArea: { height: 100, textAlignVertical: "top" },
  notesText: { fontSize: 14, color: "#666", lineHeight: 20 },
  editButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#2196F3", borderRadius: 12, padding: 16, gap: 8, marginBottom: 30 },
  actionButtonText: { color: "white", fontSize: 16, fontWeight: "600" },
  rowInputs: { flexDirection: "row", gap: 10 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  modalContent: { backgroundColor: "white", borderRadius: 20, padding: 20, width: width - 40 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: "600", color: "#333" },
  modalButtons: { flexDirection: "row", gap: 10, marginTop: 20 },
  modalButton: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: "center" },
  cancelModalButton: { backgroundColor: "#f5f5f5" },
  cancelModalButtonText: { color: "#666", fontSize: 16, fontWeight: "500" },
  confirmModalButton: { backgroundColor: "#2196F3" },
  confirmModalButtonText: { color: "white", fontSize: 16, fontWeight: "600" },
});