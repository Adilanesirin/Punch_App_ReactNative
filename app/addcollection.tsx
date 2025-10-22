/* eslint-disable prettier/prettier */
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

interface UserCredentials {
  userId: string;
  password: string;
}

interface Customer {
  id: string;
  name: string;
  place?: string;
  isManual?: boolean;
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
  customerPlace?: string;
  branchId: string;
  branchName: string;
  amount: string;
  notes?: string;
  screenshot: string | null;
  createdAt: string;
  paymentMethod?: 'UPI' | 'cash' | 'cheque' | 'neft';
}

type PaymentMethod = 'UPI' | 'cash' | 'cheque' | 'neft';

const API_BASE_URL = 'https://myimc.in/app4/api';
const { height: screenHeight, width: screenWidth } = Dimensions.get('window');

const HARDCODED_BRANCHES: Branch[] = [
  { id: '1', name: 'IMC MUKKAM' },
  { id: '2', name: 'IMCB HO' },
  { id: '3', name: 'IMCB DEV' },
  { id: '4', name: 'Sysmac Info System' },
  { id: '5', name: 'Sysmac Computers'},
  { id: '6', name: 'DQ Technologies' },
];

const PAYMENT_METHODS = [
  { id: 'UPI', label: 'UPI', icon: 'logo-google' },
  { id: 'cash', label: 'Cash', icon: 'cash-outline' },
  { id: 'cheque', label: 'Cheque', icon: 'document-text-outline' },
  { id: 'neft', label: 'NEFT', icon: 'card-outline' },
];

export default function AddCollection() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const editData = params.editData ? JSON.parse(params.editData as string) as CollectionEntry : null;

  const [showSuccessCard, setShowSuccessCard] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userCredentials, setUserCredentials] = useState<UserCredentials | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isInitializing, setIsInitializing] = useState(true);
  
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [branches, setBranches] = useState<Branch[]>(HARDCODED_BRANCHES);
  
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [showBranchDropdown, setShowBranchDropdown] = useState(false);
  
  const [customerSearchText, setCustomerSearchText] = useState('');
  const [branchSearchText, setBranchSearchText] = useState('');

  const [isManualCustomerMode, setIsManualCustomerMode] = useState(false);
  const [manualCustomerName, setManualCustomerName] = useState('');
  const [manualCustomerPlace, setManualCustomerPlace] = useState('');

  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(editData?.customerId || '');
  const [selectedCustomerPlace, setSelectedCustomerPlace] = useState<string>(editData?.customerPlace || '');
  const [selectedBranchId, setSelectedBranchId] = useState<string>(editData?.branchId || '');
  const [amount, setAmount] = useState<string>(editData?.amount || '');
  const [notes, setNotes] = useState<string>(editData?.notes || '');
  const [screenshot, setScreenshot] = useState<string | null>(editData?.screenshot || null);
  const [screenshotBase64, setScreenshotBase64] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(editData?.paymentMethod || 'UPI');

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardDidHideListener.remove();
      keyboardDidShowListener.remove();
    };
  }, []);

  const filteredCustomers = useMemo(() => {
    let filtered = customers;
    
    // Apply search filter
    if (customerSearchText.trim()) {
      filtered = customers.filter(customer =>
        customer.name.toLowerCase().includes(customerSearchText.toLowerCase()) ||
        (customer.place && customer.place.toLowerCase().includes(customerSearchText.toLowerCase()))
      );
    }
    
    // Sort alphabetically by name
    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }, [customers, customerSearchText]);

  const filteredBranches = useMemo(() => {
    if (!branchSearchText.trim()) return branches;
    
    return branches.filter(branch =>
      branch.name.toLowerCase().includes(branchSearchText.toLowerCase()) ||
      (branch.code && branch.code.toLowerCase().includes(branchSearchText.toLowerCase()))
    );
  }, [branches, branchSearchText]);

  const selectedCustomer = useMemo(() => 
    customers.find(c => c.id === selectedCustomerId), 
    [customers, selectedCustomerId]
  );

  const selectedBranch = useMemo(() => 
    branches.find(b => b.id === selectedBranchId), 
    [branches, selectedBranchId]
  );

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

  const makeAPICall = async (endpoint: string, method: string = 'GET', body: any = null, isFormData: boolean = false) => {
    try {
      if (!userCredentials) {
        throw new Error('User credentials not available');
      }

      const config: RequestInit = {
        method,
        headers: {
          'Authorization': `Basic ${btoa(`${userCredentials.userId}:${userCredentials.password}`)}`,
        },
      };

      if (body && method !== 'GET') {
        if (isFormData) {
          config.body = body;
        } else {
          config.headers = {
            ...config.headers,
            'Content-Type': 'application/json',
          };
          config.body = JSON.stringify(body);
        }
      }

      if (endpoint.includes('add') || endpoint.includes('submit')) {
        console.log(`Making API call to: ${API_BASE_URL}${endpoint}`);
      }
      
      const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
      
      if (response.status === 404) {
        throw new Error(`Endpoint not found: ${endpoint}`);
      }
      
      if (!response.ok) {
        const errorText = await response.text();
        if (endpoint.includes('add') || endpoint.includes('submit')) {
          console.error(`API Error Response: ${errorText}`);
        }
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const result = await response.json();
      
      if (endpoint.includes('add') || endpoint.includes('submit')) {
        console.log(`API Response for ${endpoint}:`, result);
      }
      
      return result;
    } catch (error) {
      if (endpoint.includes('add') || endpoint.includes('submit') || endpoint === '/collections') {
        console.error(`API call failed for ${endpoint}:`, error);
      }
      throw error;
    }
  };

  const loadManualCustomers = async () => {
    try {
      if (!userCredentials?.userId) return [];
      
      const storageKey = `manual_customers_${userCredentials.userId}`;
      const storedManualCustomers = await AsyncStorage.getItem(storageKey);
      
      if (storedManualCustomers) {
        return JSON.parse(storedManualCustomers);
      }
      return [];
    } catch (error) {
      console.error('Error loading manual customers:', error);
      return [];
    }
  };

  const fetchCustomers = async () => {
    try {
      console.log('=== FETCHING CUSTOMERS ===');
      const response = await makeAPICall('/clients');
      
      if (response && Array.isArray(response)) {
        console.log('Customers API response count:', response.length);
        
        const formattedCustomers: Customer[] = response.map((customer: any, index: number) => ({
          id: customer.code || customer.id?.toString() || index.toString(),
          name: customer.name,
          place: customer.place || customer.location || customer.address || customer.address3 || '',
          isManual: false,
        }));
        
        console.log('Formatted customers count:', formattedCustomers.length);
        
        const manualCustomers = await loadManualCustomers();
        const allCustomers = [...formattedCustomers, ...manualCustomers];
        
        setCustomers(prevCustomers => {
          if (JSON.stringify(prevCustomers) === JSON.stringify(allCustomers)) {
            return prevCustomers;
          }
          return allCustomers;
        });
        
        await AsyncStorage.setItem('cached_customers', JSON.stringify(formattedCustomers));
        console.log('Customers saved to cache');
        return;
      }
    } catch (error) {
      console.log('Error fetching customers, using cache/mock:', error);
    }
    
    await loadCustomersFromCache();
  };

  const loadCustomersFromCache = async () => {
    try {
      const cachedCustomers = await AsyncStorage.getItem('cached_customers');
      const manualCustomers = await loadManualCustomers();
      
      if (cachedCustomers) {
        const parsed = JSON.parse(cachedCustomers);
        setCustomers([...parsed, ...manualCustomers]);
        return;
      }
    } catch (cacheError) {
      console.log('No cached customers found');
    }
    
    const mockCustomers: Customer[] = [
      { id: 'IN', name: 'ICON RESIDENCY', place: 'OOTY ROAD MEPPADI', isManual: false },
      { id: 'IM128', name: 'INDO SPICES & PULSES', place: 'HUNSOOR (RITS Wayanad)', isManual: false },
      { id: 'IM131', name: 'HITLER MENS WEAR', place: 'SULTHAN BATHERY', isManual: false },
      { id: 'IM132', name: 'HIGHNESS GRILLS RESTAURANT', place: 'KALPETTA', isManual: false },
      { id: 'IM133', name: 'FAMILY HYPERMART MUKKAM', place: 'MUKKAM', isManual: false },
      { id: 'IM134', name: 'LOYAL ENTERPRISES', place: 'KOZHIKODE', isManual: false },
      { id: 'IM135', name: 'CV SUPERMARKET', place: 'WAYANAD', isManual: false },
    ];
    
    const manualCustomers = await loadManualCustomers();
    setCustomers([...mockCustomers, ...manualCustomers]);
    await AsyncStorage.setItem('cached_customers', JSON.stringify(mockCustomers));
  };

  const initializeBranches = async () => {
    setBranches(HARDCODED_BRANCHES);
    await AsyncStorage.setItem('cached_branches', JSON.stringify(HARDCODED_BRANCHES));
  };

  const handleAddManualCustomer = async () => {
    if (!manualCustomerName.trim()) {
      Alert.alert('Validation Error', 'Please enter customer name.');
      return;
    }

    try {
      const manualId = `MANUAL_${Date.now()}`;
      
      const newCustomer: Customer = {
        id: manualId,
        name: manualCustomerName.trim(),
        place: manualCustomerPlace.trim(),
        isManual: true,
      };

      const manualCustomers = await loadManualCustomers();
      const updatedManualCustomers = [...manualCustomers, newCustomer];
      
      await saveManualCustomers(updatedManualCustomers);

      setCustomers(prev => [...prev, newCustomer]);

      setSelectedCustomerId(manualId);
      setSelectedCustomerPlace(manualCustomerPlace.trim());

      setIsManualCustomerMode(false);
      setManualCustomerName('');
      setManualCustomerPlace('');
      setShowCustomerDropdown(false);

      Alert.alert('Success', 'Customer added successfully!');
    } catch (error) {
      console.error('Error adding manual customer:', error);
      Alert.alert('Error', 'Failed to add customer. Please try again.');
    }
  };

  const saveManualCustomers = async (manualCustomers: Customer[]) => {
    try {
      if (!userCredentials?.userId) return;
      
      const storageKey = `manual_customers_${userCredentials.userId}`;
      await AsyncStorage.setItem(storageKey, JSON.stringify(manualCustomers));
    } catch (error) {
      console.error('Error saving manual customers:', error);
    }
  };

  const toggleManualCustomerMode = () => {
    setIsManualCustomerMode(!isManualCustomerMode);
    setManualCustomerName('');
    setManualCustomerPlace('');
    setCustomerSearchText('');
  };

  const formatImageUrl = (imageUrl: string | null): string | null => {
    if (!imageUrl) return null;
    
    if (imageUrl.startsWith('http') || imageUrl.startsWith('data:') || imageUrl.startsWith('file:')) {
      return imageUrl;
    }
    
    if (imageUrl.startsWith('/')) {
      return `https://myimc.in${imageUrl}`;
    }
    
    return `https://myimc.in/${imageUrl}`;
  };

  const savePaymentMethodToLocalStorage = async (collectionId: string, paymentMethod: PaymentMethod) => {
    try {
      if (!userCredentials?.userId) return;
      
      const storageKey = `collection_payment_methods_${userCredentials.userId}`;
      const storedPaymentMethods = await AsyncStorage.getItem(storageKey);
      const paymentMethods = storedPaymentMethods ? JSON.parse(storedPaymentMethods) : {};
      
      paymentMethods[collectionId] = paymentMethod;
      
      await AsyncStorage.setItem(storageKey, JSON.stringify(paymentMethods));
      console.log('✅ SUCCESS: Saved payment method to local storage:', { collectionId, paymentMethod });
      
      const verify = await AsyncStorage.getItem(storageKey);
      console.log('✅ Verification - Current payment methods in storage:', verify);
    } catch (error) {
      console.error('❌ ERROR saving payment method to local storage:', error);
    }
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Sorry, we need camera roll permissions to select images.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setScreenshot(asset.uri);
        
        if (asset.base64) {
          setScreenshotBase64(asset.base64);
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Sorry, we need camera permissions to take photos.'
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setScreenshot(asset.uri);
        
        if (asset.base64) {
          setScreenshotBase64(asset.base64);
        }
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  const resetForm = useCallback(() => {
    setSelectedCustomerId('');
    setSelectedCustomerPlace('');
    setSelectedBranchId('');
    setAmount('');
    setNotes('');
    setScreenshot(null);
    setScreenshotBase64(null);
    setPaymentMethod('UPI');
    setShowCustomerDropdown(false);
    setShowBranchDropdown(false);
    setCustomerSearchText('');
    setBranchSearchText('');
    setIsManualCustomerMode(false);
    setManualCustomerName('');
    setManualCustomerPlace('');
  }, []);

  const handleCustomerSelect = useCallback((customerId: string) => {
    const selectedCustomerData = customers.find(c => c.id === customerId);
    
    setSelectedCustomerId(customerId);
    setSelectedCustomerPlace(selectedCustomerData?.place || '');
    setShowCustomerDropdown(false);
    setCustomerSearchText('');
  }, [customers]);

  const handleBranchSelect = useCallback((branchId: string) => {
    setSelectedBranchId(branchId);
    setShowBranchDropdown(false);
    setBranchSearchText('');
  }, []);

  const handlePaymentMethodChange = useCallback((method: PaymentMethod) => {
    setPaymentMethod(method);
    // Clear screenshot when switching to cash
    if (method === 'cash') {
      setScreenshot(null);
      setScreenshotBase64(null);
    }
  }, []);

  const handleSubmit = async () => {
    let customerName = '';
    let customerPlace = '';

    if (isManualCustomerMode) {
      if (!manualCustomerName.trim()) {
        Alert.alert('Validation Error', 'Please enter customer name.');
        return;
      }
      customerName = manualCustomerName.trim();
      customerPlace = manualCustomerPlace.trim();
    } else {
      if (!selectedCustomerId) {
        Alert.alert('Validation Error', 'Please select a customer.');
        return;
      }
      if (!selectedCustomer) {
        Alert.alert('Error', 'Selected customer not found.');
        return;
      }
      customerName = selectedCustomer.name;
      customerPlace = selectedCustomerPlace;
    }
    
    if (!selectedBranchId) {
      Alert.alert('Validation Error', 'Please select a branch.');
      return;
    }
    
    if (!amount.trim()) {
      Alert.alert('Validation Error', 'Please enter an amount.');
      return;
    }
    
    // Only require screenshot for non-cash payments
    if (paymentMethod !== 'cash' && (!screenshot || !screenshotBase64)) {
      Alert.alert('Validation Error', 'Please add a payment screenshot/photo.');
      return;
    }

    try {
      setLoading(true);
      
      if (!selectedBranch) {
        Alert.alert('Error', 'Selected branch not found.');
        return;
      }

      const formData = new FormData();

      if (userCredentials?.userId) {
        formData.append('user_id', userCredentials.userId);
        formData.append('created_by', userCredentials.userId);
      }
            
      formData.append('client_name', customerName);
      formData.append('client_place', customerPlace);
      formData.append('branch', selectedBranch.name);
      formData.append('amount', amount.trim());
      formData.append('payment_method', paymentMethod);
      
      const notesToSend = notes.trim() || '';
      formData.append('notes', notesToSend);
      formData.append('paid_for', notesToSend || 'No notes');
      
      formData.append('customer_id', selectedCustomerId || 'manual');
      formData.append('branch_id', selectedBranchId);
      
      console.log('🚀 Submitting with payment method:', paymentMethod);
      
      // Only append screenshot for non-cash payments
      if (paymentMethod !== 'cash' && screenshot && screenshotBase64) {
        const imageUri = screenshot;
        const filename = imageUri.split('/').pop() || `screenshot_${Date.now()}.jpg`;
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';
        
        const imageFile = {
          uri: Platform.OS === 'android' ? imageUri : imageUri.replace('file://', ''),
          name: filename,
          type: type,
        };
        
        formData.append('payment_screenshot', imageFile as any);
      }

      const endpoint = editData ? `/collections/edit/${editData.id}` : '/collections/add/';
      const method = editData ? 'PUT' : 'POST';
      
      const response = await makeAPICall(endpoint, method, formData, true);
      
      console.log('📦 Submission response:', response);
      
      if (response && (response.success !== false)) {
        let collectionId: string;
        
        if (editData) {
          collectionId = editData.id;
        } else {
          collectionId = response.id?.toString() || response.data?.id?.toString() || Date.now().toString();
          
          if (!response.id && !response.data?.id) {
            collectionId = `temp_${Date.now()}`;
            console.log('⚠️ Using temporary collection ID:', collectionId);
          }
        }
        
        console.log('💾 Saving payment method for collection:', { collectionId, paymentMethod });
        
        await savePaymentMethodToLocalStorage(collectionId, paymentMethod);
        
        resetForm();
        setShowSuccessCard(true);
        setTimeout(() => {
          setShowSuccessCard(false);
          router.back();
        }, 3000);
        
      } else {
        throw new Error(response?.error || response?.message || 'Failed to add collection');
      }
      
    } catch (error) {
      console.error('❌ Error submitting form:', error);
      
      let errorMessage = 'Failed to add collection entry. Please try again.';
      
      if (error.message.includes('404')) {
        errorMessage = 'API endpoint not found. Please check with your administrator.';
      } else if (error.message.includes('401') || error.message.includes('403')) {
        errorMessage = 'Authentication failed. Please login again.';
      } else if (error.message.includes('network')) {
        errorMessage = 'Network error. Please check your internet connection.';
      } else if (error.message.includes('required')) {
        errorMessage = 'All required fields must be filled. Please check your inputs.';
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      const hasCredentials = await initializeUser();
      if (hasCredentials) {
        await fetchCustomers();
        await initializeBranches();
      }
      setIsInitializing(false);
    };
    init();
  }, []);

  const renderCustomerItem = useCallback(({ item }: { item: Customer }) => (
    <TouchableOpacity
      style={styles.dropdownItem}
      onPress={() => handleCustomerSelect(item.id)}
      activeOpacity={0.7}
    >
      <View style={styles.customerItemContainer}>
        <View style={styles.customerNameRow}>
          <Text style={styles.customerNameText} numberOfLines={1}>
            {item.name}
          </Text>
          {item.isManual && (
            <View style={styles.manualBadge}>
              <Text style={styles.manualBadgeText}>Manual</Text>
            </View>
          )}
        </View>
        {item.place && (
          <Text style={styles.customerPlaceText} numberOfLines={1}>
            {item.place}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  ), [handleCustomerSelect]);

  const renderBranchItem = useCallback(({ item }: { item: Branch }) => (
    <TouchableOpacity
      style={styles.dropdownItem}
      onPress={() => handleBranchSelect(item.id)}
      activeOpacity={0.7}
    >
      <Text style={styles.dropdownItemText} numberOfLines={2}>
        {item.name} {item.code ? `(${item.code})` : ''}
      </Text>
    </TouchableOpacity>
  ), [handleBranchSelect]);

  const customerKeyExtractor = useCallback((item: Customer) => item.id, []);
  const branchKeyExtractor = useCallback((item: Branch) => item.id, []);

  if (isInitializing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ffffff" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.fullPageModal}>
      <View style={styles.fullPageHeader}>
        <TouchableOpacity
          onPress={() => {
            resetForm();
            router.back();
          }}
          style={styles.modalCloseButton}
        >
          <Ionicons name="close" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.fullPageTitle}>
          {editData ? 'Edit Collection' : 'Add Collection'}
        </Text>
        <View style={styles.modalCloseButton} />
      </View>

      <KeyboardAvoidingView 
        style={styles.fullPageContent}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <FlatList
          data={[
            {
              id: 'customer',
              type: 'dropdown',
              label: 'Customer *',
              placeholder: 'Select Customer',
              value: isManualCustomerMode 
                ? (manualCustomerName || '')
                : (selectedCustomer ? `${selectedCustomer.name}` : ''),
              onPress: () => setShowCustomerDropdown(true),
            },
            {
              id: 'place',
              type: 'input',
              label: 'Place',
              placeholder: 'Customer place',
              value: isManualCustomerMode ? manualCustomerPlace : selectedCustomerPlace,
              onChangeText: isManualCustomerMode ? setManualCustomerPlace : setSelectedCustomerPlace,
              editable: true,
            },
            {
              id: 'branch',
              type: 'dropdown',
              label: 'Branch *',
              placeholder: 'Select Branch',
              value: selectedBranch ? `${selectedBranch.name}` : '',
              onPress: () => setShowBranchDropdown(true),
            },
            {
              id: 'paymentMethod',
              type: 'paymentMethod',
              label: 'Payment Method *',
            },
            {
              id: 'amount',
              type: 'input',
              label: 'Amount *',
              placeholder: 'Enter amount',
              value: amount,
              onChangeText: setAmount,
              keyboardType: 'numeric',
            },
            {
              id: 'notes',
              type: 'textarea',
              label: 'Notes',
              placeholder: 'Enter notes (optional)',
              value: notes,
              onChangeText: setNotes,
            },
          ].concat(
            paymentMethod === 'UPI' ? [{
              id: 'screenshot',
              type: 'image',
              label: 'UPI Screenshot *',
              value: screenshot,
              onPress: pickImage,
            }] : 
            paymentMethod === 'cheque' ? [{
              id: 'chequePhoto',
              type: 'camera',
              label: 'Cheque Photo *',
              value: screenshot,
              onPress: takePhoto,
            }] : 
            paymentMethod === 'neft' ? [{
              id: 'neftScreenshot',
              type: 'image',
              label: 'NEFT Screenshot *',
              value: screenshot,
              onPress: pickImage,
            }] : []
          )}
          keyExtractor={(item) => item.id}
          style={styles.formList}
          contentContainerStyle={styles.formContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => {
            switch (item.type) {
              case 'dropdown':
                return (
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>{item.label}</Text>
                    <TouchableOpacity
                      style={styles.dropdownButton}
                      onPress={item.onPress}
                    >
                      <Text style={[styles.dropdownButtonText, !item.value && styles.placeholderText]}>
                        {item.value || item.placeholder}
                      </Text>
                      <Ionicons name="chevron-down" size={20} color="#666" />
                    </TouchableOpacity>
                  </View>
                );
              case 'paymentMethod':
                return (
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>{item.label}</Text>
                    <View style={styles.paymentMethodContainer}>
                      {PAYMENT_METHODS.map((method) => (
                        <TouchableOpacity
                          key={method.id}
                          style={[
                            styles.paymentMethodButton,
                            paymentMethod === method.id && styles.paymentMethodButtonActive
                          ]}
                          onPress={() => handlePaymentMethodChange(method.id as PaymentMethod)}
                          activeOpacity={0.7}
                        >
                          <Ionicons 
                            name={method.icon as any} 
                            size={24} 
                            color={paymentMethod === method.id ? '#4CAF50' : '#666'} 
                          />
                          <Text style={[
                            styles.paymentMethodText,
                            paymentMethod === method.id && styles.paymentMethodTextActive
                          ]}>
                            {method.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                );
              case 'input':
                return (
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>{item.label}</Text>
                    <TextInput
                      style={[
                        item.id === 'amount' ? styles.amountInput : styles.textInput,
                         item.id === 'place' && styles.placeInput
                    ]}
                      placeholder={item.placeholder}
                      value={item.value}
                      onChangeText={item.onChangeText}
                      keyboardType={item.keyboardType}
                      placeholderTextColor="#5659b5ff"
                      editable={item.editable !== false}
                    />
                  </View>
                );
              case 'textarea':
                return (
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>{item.label}</Text>
                    <TextInput
                      style={[styles.textInput, styles.notesInput]}
                      placeholder={item.placeholder}
                      value={item.value}
                      onChangeText={item.onChangeText}
                      multiline
                      numberOfLines={3}
                      placeholderTextColor="#35810fff"
                      textAlignVertical="top"
                    />
                  </View>
                );
              case 'image':
                return (
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>{item.label}</Text>
                    <TouchableOpacity style={styles.imageButton} onPress={item.onPress}>
                      {item.value ? (
                        <Image source={{ uri: item.value }} style={styles.previewImage} />
                      ) : (
                        <View style={styles.imageButtonContent}>
                          <Ionicons name="images-outline" size={32} color="#254892ff" />
                          <Text style={styles.imageButtonText}>
                            {paymentMethod === 'neft'
                              ? 'Select NEFT Screenshot from Gallery'
                              : 'Select Screenshot from Gallery'
                            }
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  </View>
                );
              case 'camera':
                return (
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>{item.label}</Text>
                    <TouchableOpacity style={styles.imageButton} onPress={item.onPress}>
                      {item.value ? (
                        <Image source={{ uri: item.value }} style={styles.previewImage} />
                      ) : (
                        <View style={styles.imageButtonContent}>
                          <Ionicons name="camera-outline" size={32} color="#666" />
                          <Text style={styles.imageButtonText}>
                            Take Photo of Cheque
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  </View>
                );
              default:
                return null;
            }
          }}
          ListFooterComponent={() => (
            <View style={styles.submitButtonContainer}>
              <TouchableOpacity
                style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.submitButtonText}>
                    {editData ? 'Update Collection' : 'Add Collection'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        />
      </KeyboardAvoidingView>

      <Modal
        visible={showCustomerDropdown}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <SafeAreaView style={styles.fullScreenDropdownModal}>
          <View style={styles.fullScreenDropdownHeader}>
            <TouchableOpacity 
              onPress={() => {
                setShowCustomerDropdown(false);
                setIsManualCustomerMode(false);
                setManualCustomerName('');
                setManualCustomerPlace('');
              }}
              style={styles.fullScreenBackButton}
            >
              <Ionicons name="arrow-back" size={24} color="#c63030ff" />
            </TouchableOpacity>
            <Text style={styles.fullScreenDropdownTitle}>
              {isManualCustomerMode ? 'Add New Customer' : 'Select Customer'}
            </Text>
            <TouchableOpacity
              onPress={toggleManualCustomerMode}
              style={styles.fullScreenBackButton}
            >
              <Ionicons 
                name={isManualCustomerMode ? "list" : "person-add"} 
                size={24} 
                color="#4CAF50" 
              />
            </TouchableOpacity>
          </View>

          {isManualCustomerMode ? (
            <View style={styles.manualCustomerForm}>
              <View style={styles.manualInputGroup}>
                <Text style={styles.manualInputLabel}>Customer Name *</Text>
                <TextInput
                  style={styles.manualTextInput}
                  placeholder="Enter customer name"
                  value={manualCustomerName}
                  onChangeText={setManualCustomerName}
                  placeholderTextColor="#999"
                  autoFocus
                />
              </View>

              <View style={styles.manualInputGroup}>
                <Text style={styles.manualInputLabel}>Place</Text>
                <TextInput
                  style={styles.manualTextInput}
                  placeholder="Enter place (optional)"
                  value={manualCustomerPlace}
                  onChangeText={setManualCustomerPlace}
                  placeholderTextColor="#999"
                />
              </View>

              <TouchableOpacity
                style={styles.manualAddButton}
                onPress={handleAddManualCustomer}
              >
                <Ionicons name="add-circle" size={24} color="#ffffff" />
                <Text style={styles.manualAddButtonText}>Add Customer</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={styles.fullScreenSearchContainer}>
                <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
                <TextInput
                  style={styles.fullScreenSearchInput}
                  placeholder="Search customers..."
                  value={customerSearchText}
                  onChangeText={setCustomerSearchText}
                  placeholderTextColor="#999"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoFocus
                />
              </View>

              <FlatList
                data={filteredCustomers}
                renderItem={renderCustomerItem}
                keyExtractor={customerKeyExtractor}
                style={styles.fullScreenDropdownList}
                contentContainerStyle={styles.fullScreenDropdownContent}
                showsVerticalScrollIndicator={true}
                keyboardShouldPersistTaps="handled"
                removeClippedSubviews={true}
                maxToRenderPerBatch={10}
                windowSize={5}
                initialNumToRender={8}
                ListEmptyComponent={
                  <View style={styles.emptySearchContainer}>
                    <Ionicons name="search-outline" size={48} color="#ccc" />
                    <Text style={styles.emptySearchText}>No customers found</Text>
                  </View>
                }
              />
            </>
          )}
        </SafeAreaView>
      </Modal>

      <Modal
        visible={showBranchDropdown}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <SafeAreaView style={styles.fullScreenDropdownModal}>
          <View style={styles.fullScreenDropdownHeader}>
            <TouchableOpacity 
              onPress={() => setShowBranchDropdown(false)}
              style={styles.fullScreenBackButton}
            >
              <Ionicons name="arrow-back" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.fullScreenDropdownTitle}>Select Branch</Text>
            <View style={styles.fullScreenBackButton} />
          </View>

          <View style={styles.fullScreenSearchContainer}>
            <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
            <TextInput
              style={styles.fullScreenSearchInput}
              placeholder="Search branches..."
              value={branchSearchText}
              onChangeText={setBranchSearchText}
              placeholderTextColor="#999"
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
            />
          </View>

          <FlatList
            data={filteredBranches}
            renderItem={renderBranchItem}
            keyExtractor={branchKeyExtractor}
            style={styles.fullScreenDropdownList}
            contentContainerStyle={styles.fullScreenDropdownContent}
            showsVerticalScrollIndicator={true}
            keyboardShouldPersistTaps="handled"
            removeClippedSubviews={true}
            maxToRenderPerBatch={10}
            windowSize={5}
            initialNumToRender={8}
            ListEmptyComponent={
              <View style={styles.emptySearchContainer}>
                <Ionicons name="search-outline" size={48} color="#ccc" />
                <Text style={styles.emptySearchText}>No branches found</Text>
              </View>
            }
          />
        </SafeAreaView>
      </Modal>

      {showSuccessCard && (
        <View style={styles.successCard}>
          <View style={styles.successCardContent}>
            <Ionicons name="checkmark-circle" size={24} color="#f1f5f1ff" />
            <Text style={styles.successCardText}>
              Collection {editData ? 'updated' : 'added'} successfully!
            </Text>
            <TouchableOpacity 
              onPress={() => setShowSuccessCard(false)}
              style={styles.successCardClose}
            >
              <Ionicons name="close" size={20} color="#f9f6f6ff" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {loading && (
        <View style={styles.centeredLoader}>
          <View style={styles.loaderBackground}>
            <ActivityIndicator size="large" color="#4CAF50" />
            <Text style={styles.loaderText}>Processing...</Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fullPageModal: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  fullPageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#f8f9fa',
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullPageTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
  },
  fullPageContent: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  formList: {
    flex: 1,
  },
  formContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#5165c8ff',
    marginBottom: 8,
  },
  paymentMethodContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  paymentMethodButton: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderWidth: 2,
    borderColor: '#d0d7de',
    borderRadius: 12,
    backgroundColor: '#ffffff',
    gap: 8,
  },
  paymentMethodButtonActive: {
    borderColor: '#4CAF50',
    backgroundColor: '#f1f8f4',
  },
  paymentMethodText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666ff',
  },
  paymentMethodTextActive: {
    color: '#4CAF50',
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e9931aff',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fbefefe3',
  },
  dropdownButtonText: {
    fontSize: 17,
    color: '#333333',
    flex: 1,
  },
  placeholderText: {
    color: '#f6660cff',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#d0d7de',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#333333',
    backgroundColor: '#ffffff',
  },
  notesInput: {
    minHeight: 80,
    textAlignVertical: 'top',
    borderColor: '#1baa2cff',
    backgroundColor: '#e6f4ea',
  },
  placeInput: {
    backgroundColor: '#e6eff8ff',
    borderWidth: 1,
    borderColor: '#7aaed4ff',
    color: '#c83030ff',
  },
  customerItemContainer: {
    flex: 1,
  },
  customerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  customerNameText: {
    fontSize: 16,
    color: '#ca2323ff',
    fontWeight: '500',
    flex: 1,
  },
  manualBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  manualBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600',
  },
  customerPlaceText: {
    fontSize: 14,
    color: '#666666',
    marginTop: 2,
    fontStyle: 'italic',
  },
  amountInput: {
    borderWidth: 1,
    borderColor: '#d0d7de',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#333333',
    backgroundColor: '#c3d2fd61',
  },
  imageButton: {
    borderWidth: 2,
    borderColor: '#1b69b7ff',
    borderStyle: 'dashed',
    borderRadius: 8,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  imageButtonContent: {
    alignItems: 'center',
    gap: 8,
  },
  imageButtonText: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    borderRadius: 6,
  },
  submitButtonContainer: {
    marginTop: 20,
  },
  submitButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  manualCustomerForm: {
    padding: 20,
  },
  manualInputGroup: {
    marginBottom: 20,
  },
  manualInputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
  },
  manualTextInput: {
    borderWidth: 1,
    borderColor: '#d0d7de',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#333333',
    backgroundColor: '#ffffff',
  },
  manualAddButton: {
    flexDirection: 'row',
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 10,
  },
  manualAddButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  fullScreenDropdownModal: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  fullScreenDropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#c22f2fff',
    backgroundColor: '#f8f9fa',
  },
  fullScreenBackButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenDropdownTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
  },
  fullScreenSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f89494ff',
  },
  searchIcon: {
    marginRight: 10,
  },
  fullScreenSearchInput: {
    flex: 1,
    fontSize: 16,
    color: '#131212ff',
    padding: 0,
  },
  fullScreenDropdownList: {
    flex: 1,
  },
  fullScreenDropdownContent: {
    paddingBottom: 20,
  },
  emptySearchContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptySearchText: {
    fontSize: 16,
    color: '#999',
    marginTop: 12,
  },
  dropdownItem: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#333333',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    backgroundColor: '#1a1a2e',
  },
  loadingText: {
    color: '#ffffff',
    marginTop: 10,
    fontSize: 16,
  },
  centeredLoader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    zIndex: 9999,
  },
  loaderBackground: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 140,
    minHeight: 140,
  },
  loaderText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  successCard: {
    position: 'absolute',
    top: '50%',
    left: 20,
    right: 20,
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    padding: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    zIndex: 9999,
    transform: [{ translateY: -50 }],
  },
  successCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  successCardText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    fontWeight: '600',
    color: '#fbf9f9ff',
  },
  successCardClose: {
    padding: 4,
  },
});