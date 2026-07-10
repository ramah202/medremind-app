import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Keyboard, KeyboardAvoidingView, Modal, Platform, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { API } from '../../services/api';
import { CaregiverAPI } from '../../services/caregiverAPI';

interface Patient {
  id: number;
  full_name: string;
  email: string;
  username: string;
  phone: string;
  // adherence?: number;
  lastDose?: string;
  lastDoseStatus?: 'taken' | 'missed' | 'late';
  nextDose?: string;
}

interface CaregiverLink {
  id: number;
  caregiver_id: number;
  patient_id: number;
  patient: Patient;
  createdAt: string;
}

interface PendingRequest {
  id: number;
  caregiver_id: number;
  patient_id: number;
  requested_by: number;
  status: string;
  caregiver?: {
    id: number;
    full_name: string;
    email: string;
    username?: string;
  };
  patient?: {
    id: number;
    full_name: string;
    email: string;
    username?: string;
  };
  requester?: {
    id: number;
    full_name: string;
    email: string;
    username?: string;
  };
  createdAt: string;
}

interface SearchUser {
  id: number;
  username: string;
  full_name: string;
  email?: string;
}
// Add this interface after existing interfaces
interface Caregiver {
  id: number;
  full_name: string;
  email: string;
  username: string;
  phone: string;
  createdAt: string;
}

interface CaregiverLink {
  id: number;
  caregiver_id: number;
  patient_id: number;
  caregiver: Caregiver;
  createdAt: string;
}





export default function CaregiverScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [myPatients, setMyPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [myCaregivers, setMyCaregivers] = useState<Caregiver[]>([]);

  // Role selection for each search result
  const [selectedRoleUser, setSelectedRoleUser] = useState<SearchUser | null>(null);
  const [selectedRole, setSelectedRole] = useState<'PATIENT' | 'CAREGIVER' | null>(null);
  const [showRoleConfirmation, setShowRoleConfirmation] = useState(false);




  // Load data on focus
  useFocusEffect(
    useCallback(() => {
      loadAllData();
    }, [])
  );

  // Update loadAllData to include caregivers
  const loadAllData = async () => {
    await Promise.all([
      loadMyPatients(),
      loadMyCaregivers(),
      loadPendingRequests()
    ]);
  };

  const loadMyPatients = async () => {
    try {
      setIsLoading(true);
      const links = await CaregiverAPI.getMyPatients();
      const patientsList = links.map((link: CaregiverLink) => ({
        id: link.patient.id,
        full_name: link.patient.full_name,
        email: link.patient.email,
        username: link.patient.username,
        phone: link.patient.phone,
        // adherence: Math.floor(Math.random() * 20) + 75,
        lastDose: 'Today, 9:00 AM',
        lastDoseStatus: 'taken' as const,
      }));
      setMyPatients(patientsList);
    } catch (error) {
      console.error('Error loading my patients:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Add this function with other load functions
  const loadMyCaregivers = async () => {
    try {
      const links = await CaregiverAPI.getMyCaregivers();
      const caregiversList = links.map((link: any) => ({
        id: link.caregiver.id,
        full_name: link.caregiver.full_name,
        email: link.caregiver.email,
        username: link.caregiver.username,
        phone: link.caregiver.phone,
        createdAt: link.createdAt,
      }));
      setMyCaregivers(caregiversList);
    } catch (error) {
      console.error('Error loading my caregivers:', error);
    }
  };

  // Add this function to remove caregiver
  const removeCaregiver = async (caregiverId: number) => {
    Alert.alert(
      'Remove Caregiver',
      'Are you sure you want to remove this caregiver? They will no longer have access to your health data.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const links = await CaregiverAPI.getMyCaregivers();
              const link = links.find((l: any) => l.caregiver.id === caregiverId);
              if (link) {
                await CaregiverAPI.revokeAccess(link.id);
                setMyCaregivers(myCaregivers.filter(c => c.id !== caregiverId));
                Alert.alert('Success', 'Caregiver removed successfully');
              }
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to remove caregiver');
            }
          }
        }
      ]
    );
  };

  const loadPendingRequests = async () => {
    try {
      const requests = await CaregiverAPI.getPendingRequests();
      setPendingRequests(requests);
    } catch (error) {
      console.error('Error loading pending requests:', error);
    }
  };

  // Search for users
  const handleSearch = async () => {
    const query = searchQuery.trim();

    if (query.length < 2) {
      Alert.alert('Info', 'Please enter at least 2 characters to search');
      return;
    }

    setSearching(true);
    setHasSearched(true);

    try {
      const results = await API.searchByUsername(query);

      // Get current user ID
      const userDataStr = await AsyncStorage.getItem('userData');
      let currentUserId = null;
      if (userDataStr) {
        const userData = JSON.parse(userDataStr);
        currentUserId = userData.id;
      }


      const patientIds = myPatients.map((p) => p.id);
      const caregiverIds = myCaregivers.map((c) => c.id);

      const pendingIds = pendingRequests.map((request) => {
        if (String(request.requested_by) === String(request.patient_id)) {
          return request.caregiver_id;
        }

        return request.patient_id;
      });

      const filteredResults = results.filter((user: SearchUser) => {
        if (currentUserId && user.id === currentUserId) return false;

        const isAlreadyPatient = patientIds.includes(user.id);
        const isAlreadyCaregiver = caregiverIds.includes(user.id);
        const hasPendingRequest = pendingIds.includes(user.id);

        if (hasPendingRequest) return false;

        if (selectedRole === "PATIENT" && isAlreadyCaregiver) return false;

        if (selectedRole === "CAREGIVER" && isAlreadyPatient) return false;

        return true;
      });

      setSearchResults(filteredResults);

      if (filteredResults.length === 0) {
        Alert.alert('No Results', 'No users found matching your search.');
      }
    } catch (error) {
      console.error('Error searching users:', error);
      Alert.alert('Error', 'Failed to search. Please try again.');
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  // Send request with selected role
  const sendRequest = async (user: SearchUser, myRole: 'PATIENT' | 'CAREGIVER') => {
    console.log('Sending request:', { user, myRole });

    try {
      await CaregiverAPI.sendRequest(user.id, myRole);

      const roleText = myRole === 'PATIENT'
        ? `${user.full_name || user.username} will be your caregiver`
        : `You will monitor ${user.full_name || user.username}'s health`;

      Alert.alert('Request Sent', `Your request has been sent successfully.\n\n${roleText}`);

      // Refresh data
      loadPendingRequests();
      handleSearch(); // Refresh search results
    } catch (error: any) {
      console.error('Send request error:', error);
      Alert.alert('Error', error.message || 'Failed to send request');
    }
  };

  // Direct request without confirmation (for single action)
  const requestAsCaregiver = (user: SearchUser) => {
    Alert.alert(
      'Confirm Request',
      `Do you want to monitor ${user.full_name || user.username}'s health?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes',
          onPress: () => sendRequest(user, 'CAREGIVER')
        }
      ]
    );
  };

  const requestAsPatient = (user: SearchUser) => {
    Alert.alert(
      'Confirm Request',
      `Would you like ${user.full_name || user.username} to monitor your health?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes',
          onPress: () => sendRequest(user, 'PATIENT')
        }
      ]
    );
  };

  const handleApproveRequest = async (requestId: number) => {
    try {
      await CaregiverAPI.approveRequest(requestId);
      setPendingRequests(pendingRequests.filter((r) => r.id !== requestId));
      await loadAllData();
      Alert.alert("Success", "Request accepted successfully.");
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to accept request");
    }
  };

  const handleRejectRequest = async (requestId: number) => {
    Alert.alert(
      "Reject Request",
      "Are you sure you want to reject this request?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reject",
          style: "destructive",
          onPress: async () => {
            try {
              await CaregiverAPI.rejectRequest(requestId);
              setPendingRequests(pendingRequests.filter((r) => r.id !== requestId));
              Alert.alert("Rejected", "Request rejected successfully.");
            } catch (error: any) {
              Alert.alert("Error", error.message || "Failed to reject request");
            }
          },
        },
      ]
    );
  };

  const removePatient = async (patientId: number) => {
    Alert.alert(
      'Remove Patient',
      'Are you sure you want to stop following this patient?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          style: 'destructive',
          onPress: async () => {
            try {
              const links = await CaregiverAPI.getMyPatients();
              const link = links.find((l: CaregiverLink) => l.patient.id === patientId);
              if (link) {
                await CaregiverAPI.revokeAccess(link.id);
                setMyPatients(myPatients.filter(p => p.id !== patientId));
                Alert.alert('Patient Removed', 'You are no longer following this patient.');
              }
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to remove patient');
            }
          }
        }
      ]
    );
  };

  const closeModal = () => {
    Keyboard.dismiss();
    setShowSearchModal(false);
    setSearchQuery('');
    setSearchResults([]);
    setHasSearched(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAllData();
    setRefreshing(false);
  };

  const viewPatientDetails = (patient: Patient) => {
    router.push({
      pathname: "/caregiver/patient-details",
      params: {
        id: patient.id.toString(),
        name: patient.full_name,
        // adherence: patient.adherence?.toString()
      }
    });
  };

  return (

    <View style={styles.container}>
      <LinearGradient
        colors={["#2196F3", "#1976D2"]}
        style={styles.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      />

      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Care Connect</Text>
            <TouchableOpacity
              style={styles.searchButton}
              onPress={() => setShowSearchModal(true)}
            >
              <Ionicons name="person-add-outline" size={24} color="white" />
            </TouchableOpacity>
          </View>

          {/* Search Bar (Inline) */}
          <TouchableOpacity
            style={styles.searchBar}
            onPress={() => setShowSearchModal(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="search-outline" size={20} color="#999" />
            <Text style={styles.searchPlaceholder}>Search for caregivers or patients...</Text>
          </TouchableOpacity>

          {pendingRequests.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Pending Requests</Text>

              {pendingRequests.map((request) => {
                const sender = request.requester || request.patient || request.caregiver;

                const senderIsPatient =
                  String(request.requested_by) === String(request.patient_id);

                const requestTypeText = senderIsPatient
                  ? "This person wants you to be their caregiver"
                  : "This person wants to be your caregiver";

                return (
                  <View key={request.id} style={styles.requestCard}>
                    <View style={styles.requestInfo}>
                      <View style={styles.avatarContainer}>
                        <Ionicons name="person-outline" size={24} color="#2196F3" />
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text style={styles.requestName}>
                          {sender?.full_name || sender?.username || "Unknown User"}
                        </Text>

                        <Text style={styles.requestEmail}>
                          {sender?.email || ""}
                        </Text>

                        <Text style={styles.requestStatus}>
                          {requestTypeText}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.requestActions}>
                      <TouchableOpacity
                        style={styles.acceptButton}
                        onPress={() => handleApproveRequest(request.id)}
                      >
                        <Text style={styles.acceptButtonText}>Accept</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.rejectButton}
                        onPress={() => handleRejectRequest(request.id)}
                      >
                        <Text style={styles.rejectButtonText}>Reject</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          )}


          {/* My Patients Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>My Patients</Text>
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#2196F3" />
                <Text style={styles.loadingText}>Loading patients...</Text>
              </View>
            ) : myPatients.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={48} color="#ccc" />
                <Text style={styles.emptyStateText}>No patients yet</Text>
                <Text style={styles.emptyStateSubtext}>
                  Search and connect with patients to track their progress
                </Text>
              </View>
            ) : (
              myPatients.map((patient) => (
                <View key={patient.id} style={styles.patientCard}>
                  <View style={styles.patientHeader}>
                    <View style={styles.patientInfo}>
                      <View style={styles.patientAvatar}>
                        <Ionicons name="person" size={24} color="white" />
                      </View>
                      <View>
                        <Text style={styles.patientName}>{patient.full_name}</Text>
                        <Text style={styles.patientUsername}>@{patient.username}</Text>
                  
                      </View>
                    </View>
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => removePatient(patient.id)}
                    >
                      <Ionicons name="trash-outline" size={20} color="#f44336" />
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    style={styles.viewButton}
                    onPress={() => viewPatientDetails(patient)}
                  >
                    <Text style={styles.viewButtonText}>View Details</Text>
                    <Ionicons name="chevron-forward" size={18} color="#2196F3" />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>

          {/* Add this section in the UI after "My Patients" section*/}
          {/* My Caregivers Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>My Caregivers</Text>
            {myCaregivers.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={48} color="#ccc" />
                <Text style={styles.emptyStateText}>No caregivers yet</Text>
                <Text style={styles.emptyStateSubtext}>
                  When someone requests to monitor your health, they'll appear here
                </Text>
              </View>
            ) : (
              myCaregivers.map((caregiver) => (
                <View key={caregiver.id} style={styles.caregiverCard}>
                  <View style={styles.caregiverHeader}>
                    <View style={styles.caregiverInfo}>
                      <View style={styles.caregiverAvatar}>
                        <Ionicons name="medkit" size={24} color="white" />
                      </View>
                      <View>
                        <Text style={styles.caregiverName}>{caregiver.full_name}</Text>
                        <Text style={styles.caregiverUsername}>@{caregiver.username}</Text>
                        <Text style={styles.caregiverEmail}>{caregiver.email}</Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={styles.removeCaregiverButton}
                      onPress={() => removeCaregiver(caregiver.id)}
                    >
                      <Ionicons name="trash-outline" size={20} color="#f44336" />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.caregiverFooter}>
                    <Ionicons name="calendar-outline" size={12} color="#999" />
                    <Text style={styles.caregiverDate}>
                      Connected: {new Date(caregiver.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      </SafeAreaView>


      {/* Search Modal with Role Selection Buttons */}
      <Modal
        visible={showSearchModal}
        animationType="slide"
        transparent={true}
        onRequestClose={closeModal}
      >

        <View style={styles.modalOverlay}>

          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.modalContent}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Find User</Text>
              <TouchableOpacity onPress={closeModal}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalSearchBar}>
              <Ionicons name="search-outline" size={20} color="#999" />
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Search by username or name (min 2 characters)"
                placeholderTextColor="#999"
                value={searchQuery}
                onChangeText={(text) => {
                  setSearchQuery(text);
                  if (hasSearched) {
                    setSearchResults([]);
                    setHasSearched(false);
                  }
                }}
                autoFocus={true}
                returnKeyType="search"
                onSubmitEditing={handleSearch}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => {
                  setSearchQuery('');
                  setSearchResults([]);
                  setHasSearched(false);
                }}>
                  <Ionicons name="close-circle" size={20} color="#999" />
                </TouchableOpacity>
              )}
            </View>

            {/* Search Button */}
            <TouchableOpacity
              style={styles.executeSearchButton}
              onPress={handleSearch}
              disabled={searching}
            >
              {searching ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <Ionicons name="search" size={20} color="white" />
                  <Text style={styles.executeSearchButtonText}>Search</Text>
                </>
              )}
            </TouchableOpacity>

            <ScrollView
              style={styles.searchResults}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {!searching && searchResults.length > 0 && (
                <Text style={styles.resultsCount}>
                  Found {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
                </Text>
              )}

              {searchResults.map((user) => (
                <View key={user.id} style={styles.searchResultItem}>
                  <View style={styles.resultAvatar}>
                    <Ionicons name="person-outline" size={24} color="#2196F3" />
                  </View>
                  <View style={styles.resultInfo}>
                    <Text style={styles.resultName}>{user.full_name || user.username}</Text>
                    <Text style={styles.resultUsername}>@{user.username}</Text>
                    {user.email && (
                      <Text style={styles.resultEmail}>{user.email}</Text>
                    )}
                  </View>
                  <View style={styles.resultActions}>
                    <TouchableOpacity
                      style={[styles.roleActionButton, styles.caregiverActionButton]}
                      onPress={() => requestAsCaregiver(user)}
                    >
                      <Ionicons name="eye-outline" size={16} color="#2196F3" />
                      <Text style={styles.caregiverActionText}>Monitor</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.roleActionButton, styles.patientActionButton]}
                      onPress={() => requestAsPatient(user)}
                    >
                      <Ionicons name="heart-outline" size={16} color="#4CAF50" />
                      <Text style={styles.patientActionText}>Get Care</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={styles.doneButton}
              onPress={closeModal}
            >
              <Text style={styles.doneButtonText}>Close</Text>
            </TouchableOpacity>
          </KeyboardAvoidingView>

        </View>

      </Modal>
    </View>

  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: '700',
    color: 'white',
  },
  searchButton: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginVertical: 15,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchPlaceholder: {
    fontSize: 16,
    color: '#999',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginHorizontal: 20,
    marginBottom: 12,
  },
  requestCard: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  requestInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  requestName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  requestStatus: {
    fontSize: 12,
    color: '#FF9800',
    marginTop: 2,
  },
  cancelButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FFEBEE',
    borderRadius: 20,
  },
  cancelButtonText: {
    color: '#f44336',
    fontSize: 12,
    fontWeight: '500',
  },
  patientCard: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  patientHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  patientInfo: {
    flexDirection: 'row',
    gap: 12,
    flex: 1,
  },
  patientAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  patientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  patientUsername: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  adherenceContainer: {
    marginTop: 4,
  },
  adherenceText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  adherenceBarBackground: {
    height: 4,
    backgroundColor: '#f0f0f0',
    borderRadius: 2,
    overflow: 'hidden',
    width: 100,
  },
  adherenceBar: {
    height: '100%',
    borderRadius: 2,
  },
  removeButton: {
    padding: 8,
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 12,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    gap: 8,
  },
  viewButtonText: {
    color: '#2196F3',
    fontWeight: '600',
    fontSize: 14,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    backgroundColor: 'white',
    marginHorizontal: 20,
    borderRadius: 16,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
    marginTop: 10,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    marginHorizontal: 20,
    backgroundColor: 'white',
    borderRadius: 16,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#999',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#bbb',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  modalSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginBottom: 15,
    gap: 10,
  },
  modalSearchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    padding: 0,
  },
  executeSearchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2196F3',
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 20,
    gap: 8,
  },
  executeSearchButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  searchResults: {
    maxHeight: 500,
  },
  resultsCount: {
    fontSize: 12,
    color: '#666',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    gap: 12,
  },
  resultAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultInfo: {
    flex: 2,
  },
  resultName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  resultUsername: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  resultEmail: {
    fontSize: 12,
    color: '#2196F3',
    marginTop: 2,
  },
  resultActions: {
    flexDirection: 'row',
    gap: 8,
  },
  roleActionButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  caregiverActionButton: {
    backgroundColor: '#E3F2FD',
  },
  caregiverActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2196F3',
  },
  patientActionButton: {
    backgroundColor: '#E8F5E9',
  },
  patientActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4CAF50',
  },
  addButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#2196F3',
    borderRadius: 20,
  },
  addButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  doneButton: {
    marginTop: 16,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  // Add these styles to your StyleSheet
  caregiverCard: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  caregiverHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  caregiverInfo: {
    flexDirection: 'row',
    gap: 12,
    flex: 1,
  },
  caregiverAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  caregiverName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  caregiverUsername: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  caregiverEmail: {
    fontSize: 12,
    color: '#999',
  },
  removeCaregiverButton: {
    padding: 8,
  },
  caregiverFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 62,
    gap: 6,
  },
  caregiverDate: {
    fontSize: 11,
    color: '#999',
  },
  requestEmail: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },

  requestActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },

  acceptButton: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: "#E8F5E9",
    borderRadius: 20,
  },

  acceptButtonText: {
    color: "#4CAF50",
    fontSize: 12,
    fontWeight: "600",
  },

  rejectButton: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: "#FFEBEE",
    borderRadius: 20,
  },

  rejectButtonText: {
    color: "#f44336",
    fontSize: 12,
    fontWeight: "600",
  },
});