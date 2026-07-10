import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState, useCallback } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { MedicationAPI } from '../../services/medicationAPI';

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

export default function MedsScreen() {
  const router = useRouter();
  const [medications, setMedications] = useState<Medication[]>([]);
  const [filteredMedications, setFilteredMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const loadMedications = useCallback(async () => {
    try {
      setLoading(true);
      const meds = await MedicationAPI.getAll();
      
      let activeMeds = meds.filter((med: Medication) => med.is_active === true);
      
      activeMeds.sort((a: Medication, b: Medication) => {
        if (a.box_number && !b.box_number) return -1;
        if (!a.box_number && b.box_number) return 1;
        
        if (a.box_number && b.box_number) {
          return parseInt(a.box_number) - parseInt(b.box_number);
        }
        
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
      
      setMedications(activeMeds);
      setFilteredMedications(activeMeds);
    } catch (error: any) {
      console.error('Error loading medications:', error);
      if (error.message?.includes('401')) {
        router.replace('/(auth)/sign-in');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadMedications();
    }, [loadMedications])
  );

  // Search functionality
  const handleSearch = (text: string) => {
    setSearchQuery(text);
    if (text.trim() === '') {
      setFilteredMedications(medications);
    } else {
      const filtered = medications.filter(med => 
        med.name.toLowerCase().includes(text.toLowerCase()) ||
        (med.notes && med.notes.toLowerCase().includes(text.toLowerCase())) ||
        (med.dosage_amount && med.dosage_amount.toString().includes(text))
      );
      setFilteredMedications(filtered);
    }
  };

  // Split medications into two groups based on search results
  const medicationsWithBox = filteredMedications.filter(med => med.box_number);
  const medicationsWithoutBox = filteredMedications.filter(med => !med.box_number);

  const getActiveCount = () => {
    return medications.length;
  };

  const getWithBoxCount = () => {
    return medications.filter(med => med.box_number).length;
  };

  const getWithoutBoxCount = () => {
    return medications.filter(med => !med.box_number).length;
  };

  const getSearchResultCount = () => {
    return filteredMedications.length;
  };

  const navigateToAddMed = () => {
    router.push('/medications/add');
  };

  const navigateToMedDetails = (medication: Medication) => {
    router.push({
      pathname: '/medications/[id]',
      params: { id: medication.id.toString() }
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loadingText}>Loading medications...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Medications</Text>
          <TouchableOpacity 
            style={styles.addMedButton}
            onPress={navigateToAddMed}
          >
            <Ionicons name="add-circle" size={30} color="#2196F3" />
          </TouchableOpacity>
        </View>

        {/* Search Bar - Now Functional */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search medications by name, dosage, or notes..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={handleSearch}
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => handleSearch('')}>
              <Ionicons name="close-circle" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>

        {/* Search Results Info */}
        {searchQuery !== '' && (
          <View style={styles.searchResultInfo}>
            <Text style={styles.searchResultText}>
              Found {getSearchResultCount()} result{getSearchResultCount() !== 1 ? 's' : ''} for "{searchQuery}"
            </Text>
          </View>
        )}

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{getActiveCount()}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{getWithBoxCount()}</Text>
            <Text style={styles.statLabel}>Assigned</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{getWithoutBoxCount()}</Text>
            <Text style={styles.statLabel}>Available</Text>
          </View>
        </View>

        {/* Medications List */}
        <View style={styles.medListContainer}>
          
          {/* Assigned Medications (with boxes) */}
          {medicationsWithBox.length > 0 && (
            <>
              <View style={styles.sectionHeader}>
                <Ionicons name="cube-outline" size={20} color="#4CAF50" />
                <Text style={styles.sectionTitle}>Assigned to Device</Text>
              </View>
              {medicationsWithBox.map((med) => {
                const cardColor = '#4CAF50';
                
                return (
                  <TouchableOpacity 
                    key={med.id} 
                    style={styles.medCard}
                    onPress={() => navigateToMedDetails(med)}
                  >
                    <View style={[styles.medImagePlaceholder, { backgroundColor: cardColor + '20' }]}>
                      <Ionicons name="medical" size={30} color={cardColor} />
                    </View>
                    
                    <View style={styles.medInfo}>
                      <View style={styles.medHeader}>
                        <Text style={styles.medName}>{med.name}</Text>
                        <View style={[styles.boxBadge, { backgroundColor: cardColor + '20' }]}>
                          <Text style={[styles.boxText, { color: cardColor }]}>
                            Box {med.box_number}
                          </Text>
                        </View>
                      </View>
                      
                      {med.dosage_amount && med.dosage_unit && (
                        <Text style={styles.medDetails}>
                          {med.dosage_amount} {med.dosage_unit}
                        </Text>
                      )}
                      
                      {med.dosage_amount && !med.dosage_unit && (
                        <Text style={styles.medDetails}>
                          Dosage: {med.dosage_amount}
                        </Text>
                      )}
                      
                      {med.notes && (
                        <View style={styles.notesPreview}>
                          <Ionicons name="document-text-outline" size={14} color="#666" />
                          <Text style={styles.notesPreviewText} numberOfLines={1}>
                            {med.notes}
                          </Text>
                        </View>
                      )}
                    </View>
                    
                    <Ionicons name="chevron-forward" size={24} color="#ccc" />
                  </TouchableOpacity>
                );
              })}
            </>
          )}

          {/* Available Medications (without boxes) */}
          {medicationsWithoutBox.length > 0 && (
            <>
              <View style={[styles.sectionHeader, { marginTop: medicationsWithBox.length > 0 ? 20 : 0 }]}>
                <Ionicons name="add-circle-outline" size={20} color="#2196F3" />
                <Text style={styles.sectionTitle}>Available to Assign</Text>
              </View>
              {medicationsWithoutBox.map((med) => {
                const cardColor = '#2196F3';
                
                return (
                  <TouchableOpacity 
                    key={med.id} 
                    style={styles.medCard}
                    onPress={() => navigateToMedDetails(med)}
                  >
                    <View style={[styles.medImagePlaceholder, { backgroundColor: cardColor + '20' }]}>
                      <Ionicons name="medical" size={30} color={cardColor} />
                    </View>
                    
                    <View style={styles.medInfo}>
                      <View style={styles.medHeader}>
                        <Text style={styles.medName}>{med.name}</Text>
                        <View style={[styles.availableBadge, { backgroundColor: cardColor + '20' }]}>
                          <Text style={[styles.availableText, { color: cardColor }]}>
                            Ready
                          </Text>
                        </View>
                      </View>
                      
                      {med.dosage_amount && med.dosage_unit && (
                        <Text style={styles.medDetails}>
                          {med.dosage_amount} {med.dosage_unit}
                        </Text>
                      )}
                      
                      {med.dosage_amount && !med.dosage_unit && (
                        <Text style={styles.medDetails}>
                          Dosage: {med.dosage_amount}
                        </Text>
                      )}
                      
                      {med.notes && (
                        <View style={styles.notesPreview}>
                          <Ionicons name="document-text-outline" size={14} color="#666" />
                          <Text style={styles.notesPreviewText} numberOfLines={1}>
                            {med.notes}
                          </Text>
                        </View>
                      )}
                      
                      <View style={styles.assignHint}>
                        <Ionicons name="cube-outline" size={12} color="#2196F3" />
                        <Text style={styles.assignHintText}>
                          Tap to assign to a device box
                        </Text>
                      </View>
                    </View>
                    
                    <Ionicons name="chevron-forward" size={24} color="#ccc" />
                  </TouchableOpacity>
                );
              })}
            </>
          )}

          {/* No Search Results */}
          {searchQuery !== '' && filteredMedications.length === 0 && (
            <View style={styles.emptyContainer}>
              <Ionicons name="search-outline" size={60} color="#ccc" />
              <Text style={styles.emptyText}>No medications found</Text>
              <Text style={styles.emptySubText}>
                Try searching with a different keyword
              </Text>
            </View>
          )}

          {/* Empty State - No Medications at all */}
          {searchQuery === '' && medications.length === 0 && (
            <View style={styles.emptyContainer}>
              <Ionicons name="medical-outline" size={60} color="#ccc" />
              <Text style={styles.emptyText}>No active medications</Text>
              <TouchableOpacity 
                style={styles.emptyButton}
                onPress={navigateToAddMed}
              >
                <Text style={styles.emptyButtonText}>Add Your First Medication</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
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
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  addMedButton: {
    padding: 5,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginVertical: 15,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: '#333',
    padding: 0,
  },
  searchResultInfo: {
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  searchResultText: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  statCard: {
    backgroundColor: '#fff',
    flex: 1,
    marginHorizontal: 5,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  medListContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  medCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  medImagePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  medInfo: {
    flex: 1,
    marginLeft: 15,
  },
  medHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
    flexWrap: 'wrap',
    gap: 8,
  },
  medName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  boxBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  boxText: {
    fontSize: 10,
    fontWeight: '600',
  },
  availableBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  availableText: {
    fontSize: 10,
    fontWeight: '600',
  },
  medDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  notesPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  notesPreviewText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 5,
    flex: 1,
  },
  assignHint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 4,
  },
  assignHintText: {
    fontSize: 10,
    color: '#2196F3',
    fontStyle: 'italic',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 10,
    marginBottom: 20,
  },
  emptySubText: {
    fontSize: 14,
    color: '#999',
    marginTop: 5,
  },
  emptyButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});