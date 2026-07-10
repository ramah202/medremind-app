import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Platform,
  Alert,
  Modal,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { LinearGradient } from "expo-linear-gradient";
import { MedicationAPI } from "../../services/medicationAPI";
// import { scheduleMedicationNotification } from "../../services/localNotificationService";

const { width } = Dimensions.get("window");

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

export default function AddMedicationScreen() {
  const router = useRouter();
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
    dose_times: ["09:00"],
    manual_doses: [] as Date[],
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  
  // Unified modals
  const [showDatePickerModal, setShowDatePickerModal] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState<'start' | 'end'>('start');
  const [tempSelectedDate, setTempSelectedDate] = useState(new Date());
  
  const [showTimePickerModal, setShowTimePickerModal] = useState(false);
  const [tempSelectedTime, setTempSelectedTime] = useState(new Date());
  const [editingTimeIndex, setEditingTimeIndex] = useState(0);
  
  const [selectedFrequency, setSelectedFrequency] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Manual dose picker states
  const [selectedManualDoseIndex, setSelectedManualDoseIndex] = useState(-1);
  const [showManualDatePicker, setShowManualDatePicker] = useState(false);
  const [showManualTimePicker, setShowManualTimePicker] = useState(false);
  const [tempManualDate, setTempManualDate] = useState(new Date());
  
  const [boxes, setBoxes] = useState([
    { number: 1, status: "available" },
    { number: 2, status: "available" },
    { number: 3, status: "available" },
    { number: 4, status: "available" },
  ]);

  // Check if a box is selected
  const hasSelectedBox = form.box_number !== "";

  // Helper function to get date string for API
  const getDateStringForAPI = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Format time in 24-hour format
  const formatTime24 = (date: Date) => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  };

  // Format date to Gregorian calendar
  const formatGregorianDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Fetch box status from backend
  useEffect(() => {
    fetchBoxStatus();
  }, []);

  const fetchBoxStatus = async () => {
    try {
      const medications = await MedicationAPI.getAll();
      const usedBoxes = medications
        .filter((med: any) => med.is_active === true && med.box_number)
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

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!form.name.trim()) {
      newErrors.name = "Medication name is required";
    }

    if (hasSelectedBox) {
      if (!form.frequency_type) {
        newErrors.frequency = "Frequency is required when using a device box";
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const startDate = new Date(form.start_date);
      startDate.setHours(0, 0, 0, 0);
      
      if (startDate < today) {
        newErrors.start_date = "Start date cannot be in the past";
      }

      if (form.frequency_type === "DAILY") {
        if (form.dose_times.length === 0) {
          newErrors.dose_times = "At least one dose time is required";
        }
      }

      if (form.frequency_type === "WEEKLY") {
        if (form.days_of_week.length === 0) {
          newErrors.days_of_week = "At least one day is required";
        }
        if (form.dose_times.length === 0) {
          newErrors.dose_times = "At least one dose time is required";
        }
      }

      if (form.frequency_type === "MANUAL") {
        if (form.manual_doses.length === 0) {
          newErrors.manual_doses = "At least one manual dose is required";
        }
      }

      if (form.end_date) {
        const endDate = new Date(form.end_date);
        if (endDate < startDate) {
          newErrors.end_date = "End date must be after start date";
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
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
      if (errors.start_date) setErrors((prev) => ({ ...prev, start_date: "" }));
    } else {
      setForm({ ...form, end_date: tempSelectedDate });
      if (errors.end_date) setErrors((prev) => ({ ...prev, end_date: "" }));
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

  const handleSave = async () => {
    try {
      if (!validateForm()) {
        Alert.alert("Error", "Please fill in all required fields correctly");
        return;
      }

      if (isSubmitting) return;
      setIsSubmitting(true);

      const medicationData: any = {
        name: form.name,
      };

      if (form.dosage_amount) medicationData.dosage_amount = parseFloat(form.dosage_amount);
      if (form.dosage_unit) medicationData.dosage_unit = form.dosage_unit;
      if (form.notes) medicationData.notes = form.notes;
      if (form.box_number) medicationData.box_number = form.box_number;

      let savedMedication: any;

      if (hasSelectedBox) {
        const scheduleData: any = {
          start_date: getDateStringForAPI(form.start_date),
          frequency_type: form.frequency_type,
        };

        if (form.end_date) {
          scheduleData.end_date = getDateStringForAPI(form.end_date);
        }

        if (form.frequency_type === "DAILY") {
          scheduleData.dose_times = form.dose_times;
        }

        if (form.frequency_type === "WEEKLY") {
          scheduleData.days_of_week = form.days_of_week;
          scheduleData.dose_times = form.dose_times;
        }

        if (form.frequency_type === "MANUAL") {
          scheduleData.manual_doses = form.manual_doses.map(d => d.toISOString());
        }

        const response = await MedicationAPI.createWithSchedule(medicationData, scheduleData);
        savedMedication = response.medication;
      } else {
        const response = await MedicationAPI.create(medicationData);
        savedMedication = response;
      }
      
      // Schedule local notifications for this medication
      // if (form.dose_times && form.dose_times.length > 0) {
      //   for (let i = 0; i < form.dose_times.length; i++) {
      //     const time = form.dose_times[i];
      //     await scheduleMedicationNotification(
      //       form.name,
      //       `${form.dosage_amount || ''} ${form.dosage_unit || ''}`.trim() || "Take as directed",
      //       time,
      //       `${savedMedication?.id || Date.now()}_${i}`
      //     );
      //   }
      // }
      
      Alert.alert(
        "Success",
        hasSelectedBox ? "Medication added successfully with schedule" : "Medication added successfully",
        [{ text: "OK", onPress: () => router.back() }],
        { cancelable: false }
      );
    } catch (error: any) {
      console.error("Save error:", error);
      Alert.alert("Error", error.message || "Failed to save medication. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFrequencySelect = (freq: typeof FREQUENCIES[0]) => {
    setSelectedFrequency(freq.label);
    setForm((prev) => ({
      ...prev,
      frequency_type: freq.id,
      dose_times: freq.defaultTimes.length > 0 ? [...freq.defaultTimes] : prev.dose_times,
      days_of_week: [],
      manual_doses: [],
    }));
    if (errors.frequency) {
      setErrors((prev) => ({ ...prev, frequency: "" }));
    }
  };

  const handleBoxSelect = (boxNumber: number) => {
    const selectedBox = boxes.find(b => b.number === boxNumber);
    if (selectedBox?.status === 'used') {
      Alert.alert("Box Unavailable", `Box ${boxNumber} is already in use. Please select another box.`);
      return;
    }
    
    if (form.box_number === boxNumber.toString()) {
      setForm({ ...form, box_number: "" });
    } else {
      setForm({ ...form, box_number: boxNumber.toString() });
    }
    
    if (errors.box_number) {
      setErrors((prev) => ({ ...prev, box_number: "" }));
    }
  };

  const toggleDayOfWeek = (dayId: number) => {
    setForm((prev) => {
      const newDays = prev.days_of_week.includes(dayId)
        ? prev.days_of_week.filter(d => d !== dayId)
        : [...prev.days_of_week, dayId];
      return { ...prev, days_of_week: newDays };
    });
    if (errors.days_of_week) {
      setErrors((prev) => ({ ...prev, days_of_week: "" }));
    }
  };

  const addTimeSlot = () => {
    if (form.dose_times.length < 6) {
      setForm({ ...form, dose_times: [...form.dose_times, "12:00"] });
    } else {
      Alert.alert("Limit", "Maximum 6 time slots per medication");
    }
  };

  const removeTimeSlot = (index: number) => {
    if (form.dose_times.length > 1) {
      const newTimes = form.dose_times.filter((_, i) => i !== index);
      setForm({ ...form, dose_times: newTimes });
    } else {
      Alert.alert("Error", "At least one time slot is required");
    }
  };

  const addManualDose = () => {
    setForm({ ...form, manual_doses: [...form.manual_doses, new Date()] });
  };

  const removeManualDose = (index: number) => {
    const newDoses = form.manual_doses.filter((_, i) => i !== index);
    setForm({ ...form, manual_doses: newDoses });
  };

  const openManualDatePicker = (index: number) => {
    setSelectedManualDoseIndex(index);
    setTempManualDate(form.manual_doses[index]);
    setShowManualDatePicker(true);
  };

  const openManualTimePicker = (index: number) => {
    setSelectedManualDoseIndex(index);
    setTempManualDate(form.manual_doses[index]);
    setShowManualTimePicker(true);
  };

// Replace the existing updateManualDoseDate function with these:

// Open manual date picker (with modal that stays open)
const openManualDatePickerModal = (index: number) => {
  setSelectedManualDoseIndex(index);
  setTempManualDate(form.manual_doses[index]);
  setShowManualDatePicker(true);
};

// Confirm manual date selection
const confirmManualDateSelection = () => {
  if (selectedManualDoseIndex >= 0) {
    const newDoses = [...form.manual_doses];
    newDoses[selectedManualDoseIndex] = tempManualDate;
    setForm({ ...form, manual_doses: newDoses });
  }
  setShowManualDatePicker(false);
};

// Cancel manual date selection
const cancelManualDateSelection = () => {
  setShowManualDatePicker(false);
};

// Replace the existing updateManualDoseTime function with these:

// Open manual time picker (with modal that stays open)
const openManualTimePickerModal = (index: number) => {
  setSelectedManualDoseIndex(index);
  setTempManualDate(form.manual_doses[index]);
  setShowManualTimePicker(true);
};

// Confirm manual time selection
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

// Cancel manual time selection
const cancelManualTimeSelection = () => {
  setShowManualTimePicker(false);
};

  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  const renderFrequencyOptions = () => {
    return (
      <View style={styles.optionsGrid}>
        {FREQUENCIES.map((freq) => (
          <TouchableOpacity
            key={freq.id}
            style={[
              styles.optionCard,
              selectedFrequency === freq.label && styles.selectedOptionCard,
            ]}
            onPress={() => handleFrequencySelect(freq)}
          >
            <View
              style={[
                styles.optionIcon,
                selectedFrequency === freq.label && styles.selectedOptionIcon,
              ]}
            >
              <Ionicons
                name={freq.icon}
                size={24}
                color={selectedFrequency === freq.label ? "white" : "#666"}
              />
            </View>
            <Text
              style={[
                styles.optionLabel,
                selectedFrequency === freq.label && styles.selectedOptionLabel,
              ]}
            >
              {freq.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderBoxes = () => {
    return (
      <View style={styles.boxesContainer}>
        <Text style={styles.boxesTitle}>Select Device Box (Optional)</Text>
        <Text style={styles.boxesSubtitle}>
          Choose a box to automatically dispense medication. If no box is selected, the medication will be added without scheduling. Tap again to deselect.
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
                  isUsed && styles.boxCardUsed,
                  isUsed && !isSelected && styles.boxCardDisabled,
                ]}
                onPress={() => handleBoxSelect(box.number)}
                disabled={isUsed && !isSelected}
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
        {errors.box_number && <Text style={styles.errorText}>{errors.box_number}</Text>}
      </View>
    );
  };

const renderManualDoseItem = (dose: Date, index: number) => {
  return (
    <View key={index} style={styles.manualDoseContainer}>
      <View style={styles.manualDoseRow}>
        <TouchableOpacity
          style={styles.manualDoseDateButton}
          onPress={() => openManualDatePickerModal(index)}
        >
          <Ionicons name="calendar-outline" size={20} color="#2196F3" />
          <Text style={styles.manualDoseDateText}>
            {formatGregorianDate(dose)}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.manualDoseTimeButton}
          onPress={() => openManualTimePickerModal(index)}
        >
          <Ionicons name="time-outline" size={20} color="#2196F3" />
          <Text style={styles.manualDoseTimeText}>
            {dose.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => removeManualDose(index)}
          style={styles.removeManualDoseButton}
        >
          <Ionicons name="close-circle" size={24} color="#FF5252" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

  return (
   
      <View style={styles.container}>
        <LinearGradient
          colors={["#2196F3", "#1976D2"]}
          style={styles.headerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        />

        <View style={styles.content}>
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color="#2196F3" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Add Medication</Text>
            <View style={{ width: 40 }} />
          </View>

<ScrollView
  style={styles.formContainer}
  showsVerticalScrollIndicator={false}
  contentContainerStyle={styles.formContentContainer}
  keyboardShouldPersistTaps="handled"
  keyboardDismissMode="on-drag"
  automaticallyAdjustKeyboardInsets={true}
>
              {/* Basic Information */}
              <View style={styles.section}>
                <View style={styles.inputContainer}>
                  <Ionicons name="medical-outline" size={20} color="#2196F3" style={styles.inputIcon} />
                  <TextInput
                    style={[styles.mainInput, errors.name && styles.inputError]}
                    placeholder="Medication Name *"
                    placeholderTextColor="#999"
                    value={form.name}
                    onChangeText={(text) => {
                      setForm({ ...form, name: text });
                      if (errors.name) setErrors({ ...errors, name: "" });
                    }}
                  />
                </View>
                {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}

                <View style={styles.dosageRow}>
                  <View style={[styles.inputContainer, styles.dosageAmountContainer]}>
                    <TextInput
                      style={styles.mainInput}
                      placeholder="Dosage amount"
                      placeholderTextColor="#999"
                      value={form.dosage_amount}
                      onChangeText={(text) => setForm({ ...form, dosage_amount: text })}
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={[styles.inputContainer, styles.dosageUnitContainer]}>
                    <TextInput
                      style={styles.mainInput}
                      placeholder="Unit (mg, ml)"
                      placeholderTextColor="#999"
                      value={form.dosage_unit}
                      onChangeText={(text) => setForm({ ...form, dosage_unit: text })}
                    />
                  </View>
                </View>
              </View>

              {/* Box Selection */}
              {renderBoxes()}

              {/* Schedule Section - Only show if a box is selected */}
              {hasSelectedBox && (
                <>
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>How often? *</Text>
                    {errors.frequency && <Text style={styles.errorText}>{errors.frequency}</Text>}
                    {renderFrequencyOptions()}

                    {/* Weekly Days Selection */}
                    {form.frequency_type === "WEEKLY" && (
                      <View style={styles.daysContainer}>
                        <Text style={styles.daysLabel}>Select days *</Text>
                        <View style={styles.daysGrid}>
                          {DAYS_OF_WEEK.map((day) => (
                            <TouchableOpacity
                              key={day.id}
                              style={[
                                styles.dayButton,
                                form.days_of_week.includes(day.id) && styles.dayButtonActive,
                              ]}
                              onPress={() => toggleDayOfWeek(day.id)}
                            >
                              <Text
                                style={[
                                  styles.dayButtonText,
                                  form.days_of_week.includes(day.id) && styles.dayButtonTextActive,
                                ]}
                              >
                                {day.short}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                        {errors.days_of_week && <Text style={styles.errorText}>{errors.days_of_week}</Text>}
                      </View>
                    )}

                    {/* Start Date - Improved */}
                    <View style={styles.dateSection}>
                      <Text style={styles.dateLabel}>Start Date *</Text>
                      <TouchableOpacity
                        style={[styles.dateButton, errors.start_date && styles.inputError]}
                        onPress={() => openDatePicker('start')}
                      >
                        <View style={styles.dateIconContainer}>
                          <Ionicons name="calendar-outline" size={22} color="#2196F3" />
                        </View>
                        <Text style={styles.dateButtonText}>
                          {formatGregorianDate(form.start_date)}
                        </Text>
                        <Ionicons name="chevron-forward" size={20} color="#999" />
                      </TouchableOpacity>
                      {errors.start_date && <Text style={styles.errorText}>{errors.start_date}</Text>}
                    </View>

                    {/* End Date - Improved */}
                    <View style={styles.dateSection}>
                      <Text style={styles.dateLabel}>End Date (Optional)</Text>
                      <TouchableOpacity
                        style={[styles.dateButton, errors.end_date && styles.inputError]}
                        onPress={() => openDatePicker('end')}
                      >
                        <View style={styles.dateIconContainer}>
                          <Ionicons name="calendar-outline" size={22} color="#2196F3" />
                        </View>
                        <Text style={styles.dateButtonText}>
                          {form.end_date 
                            ? formatGregorianDate(form.end_date)
                            : "No end date"}
                        </Text>
                        {form.end_date && (
                          <TouchableOpacity
                            onPress={() => setForm({ ...form, end_date: null })}
                            style={styles.clearDateButton}
                          >
                            <Ionicons name="close-circle" size={20} color="#999" />
                          </TouchableOpacity>
                        )}
                        <Ionicons name="chevron-forward" size={20} color="#999" />
                      </TouchableOpacity>
                      {errors.end_date && <Text style={styles.errorText}>{errors.end_date}</Text>}
                    </View>

                    {/* Time Slots for DAILY/WEEKLY - Improved */}
                    {(form.frequency_type === "DAILY" || form.frequency_type === "WEEKLY") && (
                      <View style={styles.timesContainer}>
                        <View style={styles.timesHeader}>
                          <Text style={styles.timesTitle}>Dose Times *</Text>
                          <TouchableOpacity onPress={addTimeSlot} style={styles.addTimeSlotButton}>
                            <Ionicons name="add-circle" size={22} color="#2196F3" />
                            <Text style={styles.addTimeSlotText}>Add Time</Text>
                          </TouchableOpacity>
                        </View>
                        <Text style={styles.timesHint}>
                          Tap on any time to change it 
                        </Text>
                        {form.dose_times.map((time, index) => (
                          <View key={index} style={styles.timeSlotContainer}>
                            <TouchableOpacity
                              style={styles.timeButton}
                              onPress={() => openTimePicker(index)}
                            >
                              <View style={styles.timeIconContainer}>
                                <Ionicons name="time-outline" size={20} color="#2196F3" />
                              </View>
                              <Text style={styles.timeButtonText}>
                                Dose {index + 1}: {time}
                              </Text>
                              <Ionicons name="chevron-forward" size={20} color="#999" />
                            </TouchableOpacity>
                            {form.dose_times.length > 1 && (
                              <TouchableOpacity
                                onPress={() => removeTimeSlot(index)}
                                style={styles.removeTimeButton}
                              >
                                <Ionicons name="close-circle" size={24} color="#FF5252" />
                              </TouchableOpacity>
                            )}
                          </View>
                        ))}
                        {errors.dose_times && <Text style={styles.errorText}>{errors.dose_times}</Text>}
                      </View>
                    )}

                    {/* Manual Doses */}
                    {form.frequency_type === "MANUAL" && (
                      <View style={styles.timesContainer}>
                        <View style={styles.timesHeader}>
                          <Text style={styles.timesTitle}>Manual Doses *</Text>
                          <TouchableOpacity onPress={addManualDose} style={styles.addTimeSlotButton}>
                            <Ionicons name="add-circle" size={22} color="#2196F3" />
                            <Text style={styles.addTimeSlotText}>Add Dose</Text>
                          </TouchableOpacity>
                        </View>
                        <Text style={styles.timesHint}>
                          Tap on date or time to change them
                        </Text>
                        {form.manual_doses.map((dose, index) => renderManualDoseItem(dose, index))}
                        {errors.manual_doses && <Text style={styles.errorText}>{errors.manual_doses}</Text>}
                      </View>
                    )}
                  </View>

                  {/* Notes */}
                  <View style={styles.section}>
                    <View style={styles.textAreaContainer}>
                      <TextInput
                        style={styles.textArea}
                        placeholder="Add notes or special instructions..."
                        placeholderTextColor="#999"
                        value={form.notes}
                        onChangeText={(text) => setForm({ ...form, notes: text })}
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                      />
                    </View>
                  </View>
                </>
              )}

              {/* Notes for non-box medications */}
              {!hasSelectedBox && (
                <View style={styles.section}>
                  <View style={styles.textAreaContainer}>
                    <TextInput
                      style={styles.textArea}
                      placeholder="Add notes or special instructions..."
                      placeholderTextColor="#999"
                      value={form.notes}
                      onChangeText={(text) => setForm({ ...form, notes: text })}
                      multiline
                      numberOfLines={4}
                      textAlignVertical="top"
                    />
                  </View>
                </View>
              )}
            </ScrollView>
      

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.saveButton, isSubmitting && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={isSubmitting}
            >
              <LinearGradient
                colors={["#2196F3", "#1976D2"]}
                style={styles.saveButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.saveButtonText}>
                  {isSubmitting ? "Adding..." : "Add Medication"}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()} disabled={isSubmitting}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Unified Date Picker Modal */}
        <Modal
          visible={showDatePickerModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowDatePickerModal(false)}
        >
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

        {/* Unified Time Picker Modal with 24-hour format */}
        <Modal
          visible={showTimePickerModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowTimePickerModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Time </Text>
                <TouchableOpacity onPress={() => setShowTimePickerModal(false)}>
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>
              
           {/*  <DateTimePicker
                value={tempSelectedTime}
                mode="time"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={(event, date) => {
                  if (event.type === "set" && date) {
                    setTempSelectedTime(date);
                  }
                }}
                textColor="#2196F3"
                themeVariant="light"
                is24Hour={true}
              />*/} 

              <DateTimePicker
  value={tempSelectedTime}
  mode="time"
  display="spinner"
  onChange={(event, date) => {
    if (date) {
      setTempSelectedTime(date);
    }
  }}
  textColor="#2196F3"
  themeVariant="light"
  is24Hour={true}
  style={{ width: "100%", height: 180 }}
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

        {/* Manual Dose Date Picker */}
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
        <Text style={styles.modalTitle}>Select Date</Text>
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
        textColor="#2196F3"
        themeVariant="light"
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
          onPress={confirmManualDateSelection}
        >
          <Text style={styles.confirmModalButtonText}>Confirm</Text>
        </TouchableOpacity>
      </View>
    </View>
  </View>
</Modal>

        {/* Manual Dose Time Picker */}
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
        <Text style={styles.modalTitle}>Select Time (24-hour format)</Text>
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
        textColor="#2196F3"
        themeVariant="light"
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
  content: {
    flex: 1,
    paddingTop: Platform.OS === "ios" ? 50 : 30,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 20,
    zIndex: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "white",
  },
  formContainer: {
    flex: 1,
  },
  formContentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 15,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    paddingHorizontal: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  inputIcon: {
    marginRight: 10,
  },
  mainInput: {
    flex: 1,
    fontSize: 16,
    color: "#333",
    paddingVertical: 15,
  },
  dosageRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 8,
  },
  dosageAmountContainer: {
    flex: 1,
  },
  dosageUnitContainer: {
    flex: 1,
  },
  boxesContainer: {
    marginBottom: 25,
  },
  boxesTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 8,
  },
  boxesSubtitle: {
    fontSize: 13,
    color: "#666",
    marginBottom: 15,
    lineHeight: 18,
  },
  boxesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  boxCard: {
    width: (width - 60) / 4,
    backgroundColor: "white",
    borderRadius: 16,
    padding: 12,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#e0e0e0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  boxCardSelected: {
    borderColor: "#2196F3",
    backgroundColor: "#E3F2FD",
  },
  boxCardUsed: {
    borderColor: "#FFCDD2",
    backgroundColor: "#FFF5F5",
  },
  boxCardDisabled: {
    opacity: 0.6,
  },
  boxNumberContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  boxNumber: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#666",
  },
  boxNumberSelected: {
    color: "#2196F3",
  },
  boxNumberUsed: {
    color: "#FF5252",
  },
  boxStatus: {
    fontSize: 10,
    fontWeight: "500",
    color: "#666",
  },
  boxStatusSelected: {
    color: "#2196F3",
  },
  boxStatusUsed: {
    color: "#FF5252",
  },
  optionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -5,
  },
  optionCard: {
    width: (width - 70) / 2,
    backgroundColor: "white",
    borderRadius: 16,
    padding: 15,
    margin: 5,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  selectedOptionCard: {
    backgroundColor: "#2196F3",
    borderColor: "#2196F3",
  },
  optionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  selectedOptionIcon: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
  },
  selectedOptionLabel: {
    color: "white",
  },
  daysContainer: {
    marginTop: 15,
  },
  daysLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
    marginBottom: 10,
  },
  daysGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  dayButton: {
    width: 45,
    height: 45,
    borderRadius: 23,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  dayButtonActive: {
    backgroundColor: "#2196F3",
    borderColor: "#2196F3",
  },
  dayButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
  },
  dayButtonTextActive: {
    color: "white",
  },
  dateSection: {
    marginTop: 15,
  },
  dateLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
    marginBottom: 8,
  },
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 16,
    padding: 15,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  dateIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  dateButtonText: {
    flex: 1,
    fontSize: 14,
    color: "#333",
  },
  clearDateButton: {
    padding: 5,
  },
  timesContainer: {
    marginTop: 20,
  },
  timesHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  timesTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  addTimeSlotButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  addTimeSlotText: {
    fontSize: 14,
    color: "#2196F3",
    fontWeight: "500",
  },
  timesHint: {
    fontSize: 12,
    color: "#999",
    marginBottom: 12,
  },
  timeSlotContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  timeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  timeIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E3F2FD",
    justifyContent: "center",
    alignItems: "center",
  },
  timeButtonText: {
    flex: 1,
    fontSize: 15,
    color: "#333",
  },
  removeTimeButton: {
    marginLeft: 10,
    padding: 5,
  },
  manualDoseContainer: {
    marginBottom: 10,
  },
  manualDoseRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  manualDoseDateButton: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  manualDoseDateText: {
    flex: 1,
    fontSize: 14,
    color: "#333",
  },
  manualDoseTimeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  manualDoseTimeText: {
    flex: 1,
    fontSize: 14,
    color: "#333",
  },
  removeManualDoseButton: {
    padding: 5,
  },
  textAreaContainer: {
    backgroundColor: "white",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  textArea: {
    height: 100,
    padding: 15,
    fontSize: 16,
    color: "#333",
    textAlignVertical: "top",
  },
  footer: {
    padding: 20,
    backgroundColor: "white",
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  saveButton: {
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 12,
  },
  saveButtonGradient: {
    paddingVertical: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  saveButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  cancelButton: {
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "white",
  },
  cancelButtonText: {
    color: "#666",
    fontSize: 16,
    fontWeight: "600",
  },
  inputError: {
    borderColor: "#FF5252",
  },
  errorText: {
    color: "#FF5252",
    fontSize: 12,
    marginBottom: 8,
    marginLeft: 12,
  },
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