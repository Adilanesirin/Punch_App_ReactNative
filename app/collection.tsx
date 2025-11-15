/* eslint-disable prettier/prettier */
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Modal,
  RefreshControl,
  StyleSheet,
  Text,
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
  userName?: string;
}

type PaymentMethod = 'UPI' | 'cash' | 'cheque' | 'neft';

const API_BASE_URL = 'https://myimc.in/app4/api';
const { height: screenHeight, width: screenWidth } = Dimensions.get('window');

const CARD_COLORS = [
  '#fbf8e7ff',
  '#fcd9e3ff',
];

export default function Collection() {
  const router = useRouter();

  const [isInitializing, setIsInitializing] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userCredentials, setUserCredentials] = useState<UserCredentials | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(false);
  
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [collections, setCollections] = useState<CollectionEntry[]>([]);
  
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const [isLoadingCollections, setIsLoadingCollections] = useState(true);

  // Initialize user credentials
  const initializeUser = async () => {
    try {
      const [userId, password] = await Promise.all([
        SecureStore.getItemAsync('userId'),
        SecureStore.getItemAsync('password'),
      ]);

      if (userId && password) {
        console.log('User credentials initialized:', userId);
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

  // API call helper with improved error handling
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
        credentials: 'include', // IMPORTANT: Include cookies
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

      console.log(`📡 Making API call to: ${API_BASE_URL}${endpoint}`);
      console.log(`📡 Method: ${method}`);
      console.log(`📡 Auth: ${userCredentials.userId}`);
      
      const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
      
      console.log(`📡 Response status: ${response.status}`);
      console.log(`📡 Response Content-Type:`, response.headers.get('content-type'));
      
      // Get raw response text first
      const responseText = await response.text();
      console.log(`📡 Raw response (first 500 chars):`, responseText.substring(0, 500));
      
      // Check if response is HTML (login page)
      if (responseText.trim().startsWith('<!DOCTYPE html') || responseText.trim().startsWith('<html')) {
        console.error('❌ Received HTML instead of JSON - Authentication failed or session expired');
        throw new Error('Authentication failed - received login page instead of data');
      }
      
      if (response.status === 404) {
        throw new Error(`Endpoint not found: ${endpoint}`);
      }
      
      if (!response.ok) {
        console.error(`❌ API Error Response: ${responseText}`);
        throw new Error(`HTTP error! status: ${response.status}, message: ${responseText}`);
      }

      // Try to parse JSON
      try {
        const result = JSON.parse(responseText);
        console.log(`✅ API Response received and parsed successfully`);
        return result;
      } catch (parseError) {
        console.error('❌ JSON Parse Error. Response was:', responseText.substring(0, 1000));
        throw new Error(`Invalid JSON response from server. Got: ${responseText.substring(0, 100)}`);
      }
    } catch (error: any) {
      console.error(`❌ API call failed for ${endpoint}:`, error);
      throw error;
    }
  };

  // Load manual customers from storage
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

  // Fetch customers
  const fetchCustomers = async () => {
    try {
      const response = await makeAPICall('/clients');
      
      if (response && Array.isArray(response)) {
        const formattedCustomers: Customer[] = response.map((customer: any, index: number) => ({
          id: customer.code || customer.id?.toString() || index.toString(),
          name: customer.name,
          place: customer.place || customer.location || customer.address || customer.address3 || '',
          isManual: false,
        }));
        
        const manualCustomers = await loadManualCustomers();
        const allCustomers = [...formattedCustomers, ...manualCustomers];
        
        setCustomers(prevCustomers => {
          if (JSON.stringify(prevCustomers) === JSON.stringify(allCustomers)) {
            return prevCustomers;
          }
          return allCustomers;
        });
        
        await AsyncStorage.setItem('cached_customers', JSON.stringify(formattedCustomers));
        return;
      }
    } catch (error) {
      console.log('Error fetching customers, using cache/mock:', error);
    }
    
    await loadCustomersFromCache();
  };

  // Load customers from cache
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

  // Fetch branches from API
  const fetchBranches = async () => {
    try {
      console.log('=== FETCHING BRANCHES ===');
      
      if (!userCredentials) {
        console.log('User credentials not available, using cache');
        await loadBranchesFromCache();
        return;
      }
      
      const response = await makeAPICall('/departments');
      
      // Handle response with data array
      let branchesData: any[] = [];
      
      if (response && response.data && Array.isArray(response.data)) {
        branchesData = response.data;
      } else if (response && Array.isArray(response)) {
        branchesData = response;
      }
      
      if (branchesData.length > 0) {
        console.log('Branches API response count:', branchesData.length);
        
        const formattedBranches: Branch[] = branchesData.map((branch: any, index: number) => ({
          id: branch.id?.toString() || index.toString(),
          name: branch.name || branch.department_name || branch.dept_name || 'Unknown Branch',
          code: branch.code || branch.dept_code || '',
        }));
        
        console.log('Formatted branches count:', formattedBranches.length);
        
        setBranches(formattedBranches);
        await AsyncStorage.setItem('cached_branches', JSON.stringify(formattedBranches));
        console.log('Branches saved to cache');
        return;
      }
    } catch (error) {
      console.log('Error fetching branches, using cache:', error);
    }
    
    await loadBranchesFromCache();
  };

  // Load branches from cache
  const loadBranchesFromCache = async () => {
    try {
      const cachedBranches = await AsyncStorage.getItem('cached_branches');
      
      if (cachedBranches) {
        const parsed = JSON.parse(cachedBranches);
        setBranches(parsed);
        console.log('Loaded branches from cache:', parsed.length);
        return;
      }
    } catch (cacheError) {
      console.log('No cached branches found');
    }
    
    // Fallback to empty array if no cache
    setBranches([]);
  };

  // Get payment method from local storage
  const getPaymentMethodFromLocalStorage = async (collectionId: string): Promise<PaymentMethod | null> => {
    try {
      if (!userCredentials?.userId) return null;
      
      const storageKey = `collection_payment_methods_${userCredentials.userId}`;
      const storedPaymentMethods = await AsyncStorage.getItem(storageKey);
      
      if (storedPaymentMethods) {
        const paymentMethods = JSON.parse(storedPaymentMethods);
        return paymentMethods[collectionId] || null;
      }
      return null;
    } catch (error) {
      console.error('Error getting payment method from local storage:', error);
      return null;
    }
  };

  // Helper function to normalize user ID for comparison
  const normalizeUserId = (userId: string | undefined | null): string => {
    if (!userId) return '';
    return userId.toString().toLowerCase().trim();
  };

  // Helper function to check if collection belongs to user
  const isUserCollection = (collection: any, currentUserId: string): boolean => {
    const normalizedCurrentUserId = normalizeUserId(currentUserId);
    
    // Check all possible user ID fields
    const possibleUserIds = [
      collection.user_id,
      collection.userId,
      collection.user,
      collection.user_email,
      collection.userEmail,
      collection.created_by,
      collection.createdBy,
    ];
    
    for (const possibleId of possibleUserIds) {
      if (possibleId) {
        const normalizedPossibleId = normalizeUserId(possibleId);
        if (normalizedPossibleId === normalizedCurrentUserId) {
          console.log(`Match found: ${possibleId} === ${currentUserId}`);
          return true;
        }
      }
    }
    
    console.log(`No match for collection ID ${collection.id}. created_by: ${collection.created_by}, current user: ${currentUserId}`);
    return false;
  };

  // Helper function to get branch name - THIS IS THE KEY FIX
  const getBranchName = (collection: any): string => {
    // First, try to get branch name from the API response (multiple possible field names)
    const apiBranchName = collection.department || 
                         collection.branch || 
                         collection.branch_name || 
                         collection.branchName ||
                         collection.department_name ||
                         collection.dept_name;
    
    if (apiBranchName && apiBranchName.trim() !== '') {
      console.log(`Found branch name from API: ${apiBranchName}`);
      return apiBranchName;
    }
    
    // If no branch name in API response, try to match by branch ID
    if (collection.branch_id || collection.branchId) {
      const branchId = (collection.branch_id || collection.branchId)?.toString();
      const matchedBranch = branches.find(b => b.id === branchId);
      
      if (matchedBranch) {
        console.log(`Found branch by ID ${branchId}: ${matchedBranch.name}`);
        return matchedBranch.name;
      }
    }
    
    console.log(`No branch name found for collection ${collection.id}`);
    return 'Unknown Branch';
  };

  // Fetch collections - UPDATED with branch name fix
  const fetchCollections = async () => {
    try {
      setIsLoadingCollections(true);
      
      if (customers.length === 0) {
        await fetchCustomers();
      }
      
      // Make sure branches are loaded
      if (branches.length === 0) {
        await fetchBranches();
      }
      
      // First, try to fetch from API
      let apiCollections: CollectionEntry[] = [];
      let apiSuccess = false;
      
      try {
        console.log('Fetching collections from API...');
        const response = await makeAPICall('/collections/');
        
        if (response && response.data && Array.isArray(response.data)) {
          console.log(`API returned ${response.data.length} total collections`);
          
          // Debug: Log first collection structure
          if (response.data.length > 0) {
            console.log('Sample collection fields:', Object.keys(response.data[0]));
            console.log('Sample collection data:', JSON.stringify(response.data[0], null, 2));
          }
          
          // Filter collections by logged-in user
          const userCollections = response.data.filter((collection: any) => {
            return isUserCollection(collection, userCredentials?.userId || '');
          });
          
          console.log(`Filtered ${userCollections.length} collections for user ${userCredentials?.userId}`);
          
          // Process each collection
          for (let index = 0; index < userCollections.length; index++) {
            const collection = userCollections[index];
            
            // Handle screenshot URL
            let screenshotUrl = collection.screenshot_url || collection.payment_screenshot || collection.screenshot;
            
            if (screenshotUrl && !screenshotUrl.startsWith('http') && !screenshotUrl.startsWith('data:') && !screenshotUrl.startsWith('file:')) {
              if (screenshotUrl.startsWith('/')) {
                screenshotUrl = `https://myimc.in${screenshotUrl}`;
              } else {
                screenshotUrl = `https://myimc.in/${screenshotUrl}`;
              }
            }
            
            // Handle notes - check paid_for field first
            const displayNotes = collection.paid_for || collection.notes || 'No notes';
            
            // Handle customer place
            let customerPlace = collection.client_place || 
                               collection.customer_place || 
                               collection.place || 
                               collection.location || 
                               collection.address || 
                               collection.client_address ||
                               collection.customer_address ||
                               '';
            
            if (!customerPlace || customerPlace.trim() === '') {
              const nameToMatch = collection.client_name || collection.customer_name || '';
              let matchedCustomer = null;
              
              if (nameToMatch) {
                matchedCustomer = customers.find(c => 
                  c.name.toLowerCase() === nameToMatch.toLowerCase()
                );
                if (matchedCustomer) {
                  customerPlace = matchedCustomer.place || '';
                }
              }
              
              if (!matchedCustomer && nameToMatch) {
                matchedCustomer = customers.find(c => 
                  c.name.toLowerCase().includes(nameToMatch.toLowerCase()) ||
                  nameToMatch.toLowerCase().includes(c.name.toLowerCase())
                );
                if (matchedCustomer) {
                  customerPlace = matchedCustomer.place || '';
                }
              }
              
              if (!matchedCustomer && (collection.customer_id || collection.client_id)) {
                const idToMatch = (collection.customer_id || collection.client_id)?.toString();
                matchedCustomer = customers.find(c => c.id === idToMatch);
                if (matchedCustomer) {
                  customerPlace = matchedCustomer.place || '';
                }
              }
            }
            
            const collectionId = collection.id?.toString() || index.toString();
            
            // Get payment method from local storage or API
            let paymentMethod: PaymentMethod = 'UPI';
            if (collectionId) {
              const storedPaymentMethod = await getPaymentMethodFromLocalStorage(collectionId);
              if (storedPaymentMethod) {
                paymentMethod = storedPaymentMethod;
              } else if (collection.payment_method || collection.paymentMethod) {
                const apiPaymentMethod = (collection.payment_method || collection.paymentMethod).toLowerCase();
                if (['upi', 'cash', 'cheque', 'neft'].includes(apiPaymentMethod)) {
                  paymentMethod = apiPaymentMethod as PaymentMethod;
                }
              }
            }
            
            // Extract user name from API response
            const userName = collection.user_name || collection.userName || collection.user || 'Unknown User';
            
            // GET BRANCH NAME - THIS IS THE FIX
            const branchName = getBranchName(collection);
            
            apiCollections.push({
              id: collectionId,
              customerId: collection.customer_id?.toString() || collection.client_id?.toString() || '',
              customerName: collection.client_name || collection.customer_name || 'Unknown Customer',
              customerPlace: customerPlace || '',
              branchId: collection.branch_id?.toString() || collection.branchId?.toString() || '',
              branchName: branchName,  // Use the helper function result
              amount: collection.amount?.toString() || '0',
              notes: displayNotes,
              screenshot: screenshotUrl,
              createdAt: collection.created_at || collection.createdAt || new Date().toISOString(),
              paymentMethod: paymentMethod,
              userName: userName,
            });
          }
          
          apiSuccess = true;
        }
      } catch (apiError) {
        console.error('Error fetching from API:', apiError);
      }
      
      // Load cached collections
      let cachedCollections: CollectionEntry[] = [];
      try {
        if (userCredentials?.userId) {
          const storageKey = `collections_${userCredentials.userId}`;
          const storedCollections = await AsyncStorage.getItem(storageKey);
          
          if (storedCollections) {
            cachedCollections = JSON.parse(storedCollections);
            console.log(`Loaded ${cachedCollections.length} cached collections`);
          }
        }
      } catch (cacheError) {
        console.error('Error loading cached collections:', cacheError);
      }
      
      // Merge API and cached collections, removing duplicates
      let mergedCollections: CollectionEntry[] = [];
      
      if (apiSuccess && apiCollections.length > 0) {
        mergedCollections = apiCollections;
        console.log(`Using ${apiCollections.length} collections from API`);
        
        const apiIds = new Set(apiCollections.map(c => c.id));
        const uniqueCachedCollections = cachedCollections.filter(c => !apiIds.has(c.id));
        
        if (uniqueCachedCollections.length > 0) {
          console.log(`Adding ${uniqueCachedCollections.length} unique cached collections`);
          mergedCollections = [...mergedCollections, ...uniqueCachedCollections];
        }
        
        if (userCredentials?.userId) {
          const storageKey = `collections_${userCredentials.userId}`;
          await AsyncStorage.setItem(storageKey, JSON.stringify(mergedCollections));
        }
      } else {
        console.log(`Using ${cachedCollections.length} cached collections only`);
        mergedCollections = cachedCollections;
      }
      
      // Fix customer places and branch names for all collections
      const fixedCollections = mergedCollections.map((collection) => {
        let customerPlace = collection.customerPlace;
        if (!customerPlace || customerPlace.trim() === '') {
          const customerData = customers.find(c => c.id === collection.customerId || c.name === collection.customerName);
          if (customerData && customerData.place) {
            customerPlace = customerData.place;
          }
        }
        
        // Fix branch name if it's "Unknown Branch"
        let branchName = collection.branchName;
        if (branchName === 'Unknown Branch' && collection.branchId) {
          const branchData = branches.find(b => b.id === collection.branchId);
          if (branchData) {
            branchName = branchData.name;
            console.log(`Fixed branch name for collection ${collection.id}: ${branchName}`);
          }
        }
        
        return {
          ...collection,
          customerPlace: customerPlace || '',
          branchName: branchName,
          notes: collection.notes && collection.notes.trim() !== '' && collection.notes !== 'Collection payment' 
            ? collection.notes 
            : 'No notes',
          paymentMethod: collection.paymentMethod || 'UPI',
          userName: collection.userName || 'Unknown User',
        };
      });
      
      // Sort by creation date (newest first)
      fixedCollections.sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return dateB - dateA;
      });
      
      console.log(`Setting ${fixedCollections.length} total collections`);
      setCollections(fixedCollections);
      
    } catch (error) {
      console.error('Error in fetchCollections:', error);
      await loadCachedCollections();
    } finally {
      setIsLoadingCollections(false);
    }
  };

  // Load cached collections
  const loadCachedCollections = async () => {
    try {
      if (!userCredentials?.userId) {
        return;
      }
      
      const storageKey = `collections_${userCredentials.userId}`;
      const storedCollections = await AsyncStorage.getItem(storageKey);
      
      if (storedCollections) {
        const collectionsData: CollectionEntry[] = JSON.parse(storedCollections);
        
        const fixedCollections = collectionsData.map((collection) => {
          let customerPlace = collection.customerPlace;
          if (!customerPlace || customerPlace.trim() === '') {
            const customerData = customers.find(c => c.id === collection.customerId || c.name === collection.customerName);
            if (customerData && customerData.place) {
              customerPlace = customerData.place;
            }
          }
          
          // Fix branch name
          let branchName = collection.branchName;
          if (branchName === 'Unknown Branch' && collection.branchId) {
            const branchData = branches.find(b => b.id === collection.branchId);
            if (branchData) {
              branchName = branchData.name;
            }
          }
          
          return {
            ...collection,
            customerPlace: customerPlace || '',
            branchName: branchName,
            notes: collection.notes && collection.notes.trim() !== '' && collection.notes !== 'Collection payment' 
              ? collection.notes 
              : 'No notes',
            screenshot: collection.screenshot,
            paymentMethod: collection.paymentMethod || 'UPI',
            userName: collection.userName || 'Unknown User',
          };
        });
        
        setCollections(fixedCollections);
        console.log(`Loaded ${fixedCollections.length} collections from cache`);
      }
    } catch (error) {
      console.error('Error loading cached collections:', error);
    }
  };

  // Handle image error
  const handleImageError = useCallback((imageUrl: string) => {
    setImageErrors(prev => new Set([...prev, imageUrl]));
  }, []);

  // Handle refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setImageErrors(new Set());
    setIsLoadingCollections(true);
    
    await fetchBranches(); // Make sure branches are loaded first
    await fetchCustomers();
    await fetchCollections();
    
    setRefreshing(false);
  }, [userCredentials]);

  // Handle edit collection
  const handleEditCollection = useCallback((collection: CollectionEntry) => {
    router.push({
      pathname: '/addcollection',
      params: {
        editData: JSON.stringify(collection)
      }
    });
  }, [router]);

  // Initialize
  useEffect(() => {
    const init = async () => {
      const hasCredentials = await initializeUser();
      setIsInitializing(false);
    };
    init();
  }, []);

  // Load data
  useEffect(() => {
    if (userCredentials && !isInitializing && !isLoadingData) {
      const loadData = async () => {
        setIsLoadingData(true);
        setIsLoadingCollections(true);
        try {
          await fetchBranches(); // Load branches first
          await fetchCustomers();
          await fetchCollections();
        } catch (error) {
          console.error('Error loading data:', error);
        } finally {
          setIsLoadingData(false);
        }
      };
      loadData();
    }
  }, [userCredentials, isInitializing]);

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Render thumbnail image
  const renderThumbnailImage = (item: CollectionEntry) => {
    const imageUrl = item.screenshot;
    const hasError = imageErrors.has(imageUrl || '');
    
    if (!imageUrl || hasError) {
      return (
        <View style={styles.thumbnailPlaceholder}>
          <Ionicons name="image-outline" size={32} color="#666" />
          <Text style={styles.noImageText}>No Image</Text>
        </View>
      );
    }

    return (
      <Image
        source={{ uri: imageUrl }}
        style={styles.thumbnailImage}
        onError={() => handleImageError(imageUrl)}
        resizeMode="cover"
      />
    );
  };

  // Render collection item
  const renderCollectionItem = useCallback(({ item, index }: { item: CollectionEntry; index: number }) => {
    const cardColor = CARD_COLORS[index % CARD_COLORS.length];
    
    const getDisplayPlace = () => {
      if (item.customerPlace && item.customerPlace.trim() !== '') {
        return item.customerPlace;
      }
      
      const customer = customers.find(c => 
        c.id === item.customerId || 
        c.name === item.customerName
      );
      
      return customer?.place || '';
    };

    const displayPlace = getDisplayPlace();
    const hasPlace = displayPlace.trim() !== '';

    const getPaymentMethodConfig = (method: PaymentMethod) => {
      switch (method) {
        case 'UPI':
          return { color: '#1f2221ff', bgColor: '#55b82eff', label: 'UPI'};
        case 'cash':
          return { color: '#302b28ff', bgColor: '#d9a925ff', label: 'Cash' };
        case 'cheque':
          return { color: '#efeef6ff', bgColor: '#b74ed4ff', label: 'Cheque' };
        case 'neft':
          return { color: '#2f0615ff', bgColor: '#fc6780ff', label: 'NEFT' };
        default:
          return { color: '#666', bgColor: '#F3F4F6', label: 'Payment' };
      }
    };

    const paymentConfig = getPaymentMethodConfig(item.paymentMethod || 'UPI');

    return (
      <View style={[styles.collectionCard, { backgroundColor: cardColor }]}>
        <View style={styles.cardTopSection}>
          <View style={[styles.paymentMethodTag, { backgroundColor: paymentConfig.bgColor }]}>
            <Text style={[styles.paymentMethodText, { color: paymentConfig.color }]}>
              {paymentConfig.label}
            </Text>
          </View>
        </View>

        <View style={styles.cardContent}>
          <View style={styles.screenshotSection}>
            <TouchableOpacity 
              style={styles.screenshotContainer}
              onPress={() => {
                if (item.screenshot && !imageErrors.has(item.screenshot)) {
                  setSelectedImage(item.screenshot);
                  setShowImageModal(true);
                }
              }}
              activeOpacity={0.8}
            >
              {renderThumbnailImage(item)}
            </TouchableOpacity>
            <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
          </View>

          <View style={styles.detailsContainer}>
            <Text style={styles.customerName} numberOfLines={1}>
              {item.customerName}
            </Text>

            {hasPlace && (
              <View style={styles.detailRow}>
                <Ionicons name="location-outline" size={16} color="#5d28d8ff" />
                <Text style={styles.placeText} numberOfLines={2}>
                  {displayPlace}
                </Text>
              </View>
            )}

            <View style={styles.detailRow}>
              <Ionicons name="business-outline" size={16} color="#dd2222ff" />
              <Text style={styles.branchText} numberOfLines={1}>
                {item.branchName}
              </Text>
            </View>

            <View style={styles.amountContainer}>
              <Text style={styles.amountText}>
                ₹{parseFloat(item.amount).toLocaleString('en-IN')}
              </Text>
            </View>

            <TouchableOpacity 
              style={styles.editButton}
              onPress={() => handleEditCollection(item)}
            >
              <Ionicons name="create-outline" size={18} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }, [handleEditCollection, imageErrors, handleImageError, customers]);

  // Show loading indicator
  if (isInitializing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ffffff" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
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
          onPress={() => router.push('/addcollection')}
        >
          <Ionicons name="add" size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>

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
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          isLoadingCollections ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#ffffff" />
              <Text style={styles.loadingText}>Loading collections...</Text>
            </View>
          ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="folder-open-outline" size={48} color="#666" />
            <Text style={styles.emptyText}>No collections yet</Text>
            <Text style={styles.emptySubText}>Tap + to add your first collection entry</Text>
          </View>
          )
        }
      />

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
              <Image 
                source={{ uri: selectedImage }} 
                style={styles.fullImage}
                onError={() => {
                  setShowImageModal(false);
                }}
                resizeMode="contain"
              />
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
    paddingVertical: 60,
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
  listContent: {
    padding: 16,
    paddingBottom: 20,
  },
  collectionCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cardTopSection: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 0,
  },
  paymentMethodTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  paymentMethodText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardContent: {
    flexDirection: 'row',
    height: 120,
    marginTop: -6,
  },
  screenshotSection: {
    marginRight: 16,
    width: 120,
    height: 280,
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: -19,
  },
  screenshotContainer: {
    width: 140,
    height: 151,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: -4,
    marginTop: -24,
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  thumbnailPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noImageText: {
    fontSize: 10,
    color: '#666',
    marginTop: 4,
  },
  dateText: {
    fontSize: 12,
    color: '#ffffffff',
    marginTop: 7,
    textAlign: 'center',
    backgroundColor:'#38368aff',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: '#d4d7e9ff',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  detailsContainer: {
    flex: 1,
    justifyContent: 'space-between',
    position: 'relative',
    height: 120,
  },
  customerName: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  placeText: {
    fontSize: 14,
    color: '#5d28d8ff',
    marginLeft: 6,
    flex: 1,
  },
  branchText: {
    fontSize: 14,
    color: '#b93942ff',
    marginLeft: 6,
    flex: 1,
  },
  amountContainer: {
    marginTop: 8,
  },
  amountText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#059669',
  },
  editButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
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
    paddingHorizontal: 40,
  },
  imageModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageModalContent: {
    width: screenWidth * 0.9,
    height: screenHeight * 0.8,
    position: 'relative',
    backgroundColor: 'transparent',
    borderRadius: 10,
    overflow: 'hidden',
  },
  fullImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
    backgroundColor: 'transparent',
  },
  closeImageButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});