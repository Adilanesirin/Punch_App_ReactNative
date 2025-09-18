/* eslint-disable prettier/prettier */
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlurView } from 'expo-blur';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

interface UserCredentials {
  userId: string;
  password: string;
}

interface Customer {
  id: string;
  name: string;
  code?: string;
}

interface Branch {
  id: string;
  name: string;
  code?: string;
}

interface CollectionEntry {
  id: string;
  customerId: string;
  customerName: string;
  branchId: string;
  branchName: string;
  amount: string;
  screenshot: string | null;
  createdAt: string;
  status: 'draft' | 'submitted';
}

export default function Collection() {
  const router = useRouter();

  // State management
  const [isInitializing, setIsInitializing] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userCredentials, setUserCredentials] = useState<UserCredentials | null>(null);
  
  // Data states
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [collections, setCollections] = useState<CollectionEntry[]>([]);
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  // Form states
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [screenshot, setScreenshot] = useState<string | null>(null);
  
  // Dropdown states
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [showBranchDropdown, setShowBranchDropdown] = useState(false);

  // Initialize user credentials
  const initializeUser = async () => {
    try {
      const [userId, password] = await Promise.all([
        SecureStore.getItemAsync('userId'),
        SecureStore.getItemAsync('password'),
      ]);

      if (userId && password) {
        setUserCredentials({ userId, password });
        return true;
      } else {
        router.replace('/login');
        return false;
      }
    } catch (error) {
      console.error('Error initializing user:', error);
      router.replace('/login');
      return false;
    }
  };

  // Fetch customers from API (mock data for now)
  const fetchCustomers = async () => {
    try {
      // Replace this with actual API call
      const mockCustomers: Customer[] = [
        { id: '1', name: 'John Doe', code: 'C001' },
        { id: '2', name: 'Jane Smith', code: 'C002' },
        { id: '3', name: 'Bob Johnson', code: 'C003' },
        { id: '4', name: 'Alice Brown', code: 'C004' },
        { id: '5', name: 'Charlie Wilson', code: 'C005' },
      ];
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setCustomers(mockCustomers);
      
      // Cache the data
      await AsyncStorage.setItem('cached_customers', JSON.stringify(mockCustomers));
    } catch (error) {
      console.error('Error fetching customers:', error);
      // Try to load cached data
      try {
        const cachedCustomers = await AsyncStorage.getItem('cached_customers');
        if (cachedCustomers) {
          setCustomers(JSON.parse(cachedCustomers));
        }
      } catch (cacheError) {
        console.error('Error loading cached customers:', cacheError);
      }
    }
  };

  // Fetch branches from API (mock data for now)
  const fetchBranches = async () => {
    try {
      // Replace this with actual API call
      const mockBranches: Branch[] = [
        { id: '1', name: 'Main Branch', code: 'B001' },
        { id: '2', name: 'Downtown Branch', code: 'B002' },
        { id: '3', name: 'North Branch', code: 'B003' },
        { id: '4', name: 'South Branch', code: 'B004' },
        { id: '5', name: 'East Branch', code: 'B005' },
      ];
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setBranches(mockBranches);
      
      // Cache the data
      await AsyncStorage.setItem('cached_branches', JSON.stringify(mockBranches));
    } catch (error) {
      console.error('Error fetching branches:', error);
      // Try to load cached data
      try {
        const cachedBranches = await AsyncStorage.getItem('cached_branches');
        if (cachedBranches) {
          setBranches(JSON.parse(cachedBranches));
        }
      } catch (cacheError) {
        console.error('Error loading cached branches:', cacheError);
      }
    }
  };

  // Load collections from storage
  const loadCollections = async () => {
    try {
      if (!userCredentials?.userId) return;
      
      const storageKey = `collections_${userCredentials.userId}`;
      const storedCollections = await AsyncStorage.getItem(storageKey);
      
      if (storedCollections) {
        setCollections(JSON.parse(storedCollections));
      }
    } catch (error) {
      console.error('Error loading collections:', error);
    }
  };

  // Save collections to storage
  const saveCollections = async (newCollections: CollectionEntry[]) => {
    try {
      if (!userCredentials?.userId) return;
      
      const storageKey = `collections_${userCredentials.userId}`;
      await AsyncStorage.setItem(storageKey, JSON.stringify(newCollections));
      setCollections(newCollections);
    } catch (error) {
      console.error('Error saving collections:', error);
    }
  };

  // Handle image picker
  const pickImage = async () => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Sorry, we need camera roll permissions to select images.'
        );
        return;
      }

      // Pick image
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
        base64: false,
      });

      if (!result.canceled && result.assets[0]) {
        setScreenshot(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  // Reset form
  const resetForm = () => {
    setSelectedCustomerId('');
    setSelectedBranchId('');
    setAmount('');
    setScreenshot(null);
    setShowCustomerDropdown(false);
    setShowBranchDropdown(false);
  };

  // Handle form submission
  const handleSubmit = async () => {
    // Validation
    if (!selectedCustomerId) {
      Alert.alert('Validation Error', 'Please select a customer.');
      return;
    }
    
    if (!selectedBranchId) {
      Alert.alert('Validation Error', 'Please select a branch.');
      return;
    }
    
    if (!amount.trim()) {
      Alert.alert('Validation Error', 'Please enter an amount.');
      return;
    }
    
    if (!screenshot) {
      Alert.alert('Validation Error', 'Please add a screenshot.');
      return;
    }

    try {
      const selectedCustomer = customers.find(c => c.id === selectedCustomerId);
      const selectedBranch = branches.find(b => b.id === selectedBranchId);
      
      if (!selectedCustomer || !selectedBranch) {
        Alert.alert('Error', 'Selected customer or branch not found.');
        return;
      }

      const newEntry: CollectionEntry = {
        id: Date.now().toString(),
        customerId: selectedCustomerId,
        customerName: selectedCustomer.name,
        branchId: selectedBranchId,
        branchName: selectedBranch.name,
        amount: amount.trim(),
        screenshot,
        createdAt: new Date().toISOString(),
        status: 'draft',
      };

      const updatedCollections = [newEntry, ...collections];
      await saveCollections(updatedCollections);
      
      resetForm();
      setShowAddModal(false);
      
      Alert.alert('Success', 'Collection entry added successfully!');
    } catch (error) {
      console.error('Error submitting form:', error);
      Alert.alert('Error', 'Failed to add collection entry. Please try again.');
    }
  };

  // Handle refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      fetchCustomers(),
      fetchBranches(),
      loadCollections(),
    ]);
    setRefreshing(false);
  }, [userCredentials]);

  // Initialize
  useEffect(() => {
    const init = async () => {
      const hasCredentials = await initializeUser();
      setIsInitializing(false);
    };
    init();
  }, []);

  // Load data when credentials are available
  useEffect(() => {
    if (userCredentials && !isInitializing) {
      Promise.all([
        fetchCustomers(),
        fetchBranches(),
        loadCollections(),
      ]);
    }
  }, [userCredentials, isInitializing]);

  // Render customer dropdown item
  const renderCustomerItem = (customer: Customer) => (
    <TouchableOpacity
      key={customer.id}
      style={styles.dropdownItem}
      onPress={() => {
        setSelectedCustomerId(customer.id);
        setShowCustomerDropdown(false);
      }}
    >
      <Text style={styles.dropdownItemText}>
        {customer.name} {customer.code ? `(${customer.code})` : ''}
      </Text>
    </TouchableOpacity>
  );

  // Render branch dropdown item
  const renderBranchItem = (branch: Branch) => (
    <TouchableOpacity
      key={branch.id}
      style={styles.dropdownItem}
      onPress={() => {
        setSelectedBranchId(branch.id);
        setShowBranchDropdown(false);
      }}
    >
      <Text style={styles.dropdownItemText}>
        {branch.name} {branch.code ? `(${branch.code})` : ''}
      </Text>
    </TouchableOpacity>
  );

  // Render collection item
  const renderCollectionItem = ({ item, index }: { item: CollectionEntry; index: number }) => (
    <View style={[styles.tableRow, index % 2 === 1 && styles.tableRowAlternate]}>
      <View style={styles.tableCell}>
        <Text style={styles.tableCellText} numberOfLines={2}>
          {item.customerName}
        </Text>
      </View>
      <View style={styles.tableCell}>
        <Text style={styles.tableCellText} numberOfLines={2}>
          {item.branchName}
        </Text>
      </View>
      <View style={styles.tableCell}>
        <TouchableOpacity
          onPress={() => {
            setSelectedImage(item.screenshot);
            setShowImageModal(true);
          }}
        >
          {item.screenshot ? (
            <Image source={{ uri: item.screenshot }} style={styles.thumbnailImage} />
          ) : (
            <View style={styles.noImageContainer}>
              <Text style={styles.noImageText}>No Image</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
      <View style={styles.tableCell}>
        <Text style={styles.tableCellText}>₹{item.amount}</Text>
      </View>
    </View>
  );

  // Show loading screen during initialization
  if (isInitializing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ffffff" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // Get selected customer and branch names for display
  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);
  const selectedBranch = branches.find(b => b.id === selectedBranchId);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>COLLECTIONS</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
        >
          <Ionicons name="add" size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* Table Header */}
      <View style={styles.tableHeader}>
        <View style={styles.tableHeaderCell}>
          <Text style={styles.tableHeaderText}>Customer</Text>
        </View>
        <View style={styles.tableHeaderCell}>
          <Text style={styles.tableHeaderText}>Branch</Text>
        </View>
        <View style={styles.tableHeaderCell}>
          <Text style={styles.tableHeaderText}>Screenshot</Text>
        </View>
        <View style={styles.tableHeaderCell}>
          <Text style={styles.tableHeaderText}>Amount</Text>
        </View>
      </View>

      {/* Table Content */}
      <FlatList
        data={collections}
        renderItem={renderCollectionItem}
        keyExtractor={item => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#ffffff"
          />
        }
        contentContainerStyle={styles.tableContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="folder-open-outline" size={48} color="#666" />
            <Text style={styles.emptyText}>No collections yet</Text>
            <Text style={styles.emptySubText}>Tap + to add your first collection entry</Text>
          </View>
        }
      />

      {/* Add Collection Modal */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <KeyboardAvoidingView 
          style={styles.keyboardAvoidingView} 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <View style={styles.modalOverlay}>
            <BlurView intensity={90} style={styles.modalContainer}>
              <ScrollView 
                style={styles.scrollView}
                contentContainerStyle={styles.scrollViewContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.modalContent}>
                  {/* Modal Header */}
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Add Collection</Text>
                    <TouchableOpacity
                      onPress={() => {
                        resetForm();
                        setShowAddModal(false);
                      }}
                    >
                      <Ionicons name="close" size={24} color="#333" />
                    </TouchableOpacity>
                  </View>

                  {/* Customer Selection */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Customer *</Text>
                    <TouchableOpacity
                      style={styles.dropdownButton}
                      onPress={() => setShowCustomerDropdown(!showCustomerDropdown)}
                    >
                      <Text style={[styles.dropdownButtonText, !selectedCustomer && styles.placeholderText]}>
                        {selectedCustomer ? `${selectedCustomer.name} ${selectedCustomer.code ? `(${selectedCustomer.code})` : ''}` : 'Select Customer'}
                      </Text>
                      <Ionicons name="chevron-down" size={20} color="#666" />
                    </TouchableOpacity>
                    
                    {showCustomerDropdown && (
                      <View style={styles.dropdown}>
                        {customers.map(renderCustomerItem)}
                      </View>
                    )}
                  </View>

                  {/* Branch Selection */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Branch *</Text>
                    <TouchableOpacity
                      style={styles.dropdownButton}
                      onPress={() => setShowBranchDropdown(!showBranchDropdown)}
                    >
                      <Text style={[styles.dropdownButtonText, !selectedBranch && styles.placeholderText]}>
                        {selectedBranch ? `${selectedBranch.name} ${selectedBranch.code ? `(${selectedBranch.code})` : ''}` : 'Select Branch'}
                      </Text>
                      <Ionicons name="chevron-down" size={20} color="#666" />
                    </TouchableOpacity>
                    
                    {showBranchDropdown && (
                      <View style={styles.dropdown}>
                        {branches.map(renderBranchItem)}
                      </View>
                    )}
                  </View>

                  {/* Amount Input */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Amount *</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="Enter amount"
                      value={amount}
                      onChangeText={setAmount}
                      keyboardType="numeric"
                      placeholderTextColor="#999"
                    />
                  </View>

                  {/* Screenshot Selection */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Screenshot *</Text>
                    <TouchableOpacity style={styles.imageButton} onPress={pickImage}>
                      {screenshot ? (
                        <Image source={{ uri: screenshot }} style={styles.previewImage} />
                      ) : (
                        <View style={styles.imageButtonContent}>
                          <Ionicons name="camera-outline" size={32} color="#666" />
                          <Text style={styles.imageButtonText}>Add Screenshot</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  </View>

                  {/* Submit Button */}
                  <TouchableOpacity
                    style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                    onPress={handleSubmit}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Text style={styles.submitButtonText}>Add Collection</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </BlurView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Image View Modal */}
      <Modal
        visible={showImageModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowImageModal(false)}
      >
        <TouchableOpacity
          style={styles.imageModalOverlay}
          onPress={() => setShowImageModal(false)}
        >
          <View style={styles.imageModalContent}>
            {selectedImage && (
              <Image source={{ uri: selectedImage }} style={styles.fullImage} />
            )}
            <TouchableOpacity
              style={styles.closeImageButton}
              onPress={() => setShowImageModal(false)}
            >
              <Ionicons name="close" size={24} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
  },
  loadingText: {
    color: '#ffffff',
    marginTop: 10,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: 'transparent',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
   backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
 tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#fffffff8', // White background
    borderTopLeftRadius: 15, // Curved top corners
    borderTopRightRadius: 15,
    marginHorizontal: 10, // Add margin for better appearance
    marginTop: 10,
    elevation: 2, // Android shadow
    shadowColor: '#000', // iOS shadow
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderBottomWidth: 2,
    borderBottomColor: '#0a064ada',
  },
   tableHeaderCell: {
    flex: 1,
    paddingVertical: 15,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  tableHeaderText: {
    color: '#19086dff', // Dark text for contrast
    fontWeight: 'bold',
    fontSize: 14,
    textAlign: 'center',
  },
   tableContent: {
    flexGrow: 1,
    marginHorizontal: 10, // Match header margin
    backgroundColor: '#fffffff5', // White background
    borderBottomLeftRadius: 15, // Curved bottom corners
    borderBottomRightRadius: 15,
    elevation: 2, // Android shadow
    shadowColor: '#000', // iOS shadow
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    overflow: 'hidden', // Ensure content respects border radius
  },
 tableRow: {
    flexDirection: 'row',
    backgroundColor: '#fffffff5', // Default white background
    borderBottomWidth: 1,
    borderBottomColor: '#dbdddfff', // Light gray border
    minHeight: 70,
  },
   tableRowAlternate: {
    backgroundColor: '#f1f5f9ff', // Very light gray for alternating rows
  },
 tableCell: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
 tableCellText: {
    color: '#0b088fff', // Dark text for readability
    fontSize: 13,
    textAlign: 'center',
  },

   thumbnailImage: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0', // Light border for definition
  },
  noImageContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#f0f0f0', // Light gray background
    borderWidth: 1,
    borderColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noImageText: {
    color: '#666666',
    fontSize: 8,
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    backgroundColor: '#ffffffff', 
  },
  emptyText: {
    color: '#666666',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubText: {
    color: '#999999',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
    maxHeight: '85%',
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
  },
  modalContent: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 20,
    paddingBottom: 30,
    minHeight: '100%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  inputGroup: {
    marginTop: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  dropdownButtonText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  placeholderText: {
    color: '#999',
  },
  dropdown: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginTop: 5,
    maxHeight: 200,
    zIndex: 1000,
    elevation: 5,
  },
  dropdownItem: {
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#333',
  },
  textInput: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    fontSize: 16,
    color: '#333',
  },
  imageButton: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    minHeight: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageButtonContent: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  imageButtonText: {
    color: '#666',
    fontSize: 16,
    marginTop: 8,
  },
  previewImage: {
    width: '100%',
    height: 100,
    borderRadius: 8,
  },
  submitButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 30,
  },
  submitButtonDisabled: {
    backgroundColor: '#999',
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  imageModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageModalContent: {
    width: '90%',
    height: '70%',
    position: 'relative',
  },
  fullImage: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
  closeImageButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});