
/* eslint-disable prettier/prettier */
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const ViewEarlyRequests = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  // State management
  const [loadingTab, setLoadingTab] = useState(null);
  const [earlyRequests, setEarlyRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [userCredentials, setUserCredentials] = useState({
    userid: '',
    password: ''
  });
  const [credentialsLoaded, setCredentialsLoaded] = useState(false);
  const itemsPerPage = 10;

  interface UserCredentials {
    userid: string;
    password: string;
  }

  // Filter options
  const filterOptions = ['All', 'Pending', 'Approved', 'Rejected'];

  // API configuration
  const API_CONFIG = {
    baseUrl: 'https://myimc.in',
    timeout: 15000,
  };

  // Load stored credentials
  const loadCredentials = async () => {
    try {
      console.log('Loading credentials from SecureStore...');
      const userId = await SecureStore.getItemAsync('userId');
      const password = await SecureStore.getItemAsync('password');
      
      console.log('Loaded userId:', userId);
      console.log('Loaded password:', password ? '***' : 'null');
      
      if (userId && password) {
        setUserCredentials({ userid: userId, password: password });
        setCredentialsLoaded(true);
        console.log('Credentials loaded successfully');
      } else {
        console.log('No credentials found in SecureStore');
        Alert.alert(
          'Authentication Error',
          'No saved credentials found. Please login again.',
          [
            { text: 'OK', onPress: () => router.replace('/login') }
          ]
        );
      }
    } catch (error) {
      console.error('Error loading credentials:', error);
      Alert.alert(
        'Error',
        'Failed to load credentials. Please login again.',
        [
          { text: 'OK', onPress: () => router.replace('/login') }
        ]
      );
    }
  };

  // Fetch early requests from API with status filter
  const fetchEarlyRequests = async (showLoader = true, statusFilter = null) => {
    // Don't make API call if credentials aren't loaded yet
    if (!credentialsLoaded || !userCredentials.userid || !userCredentials.password) {
      console.log('Credentials not ready, skipping API call');
      return;
    }

    try {
      if (showLoader) {
        setLoading(true);
      }
      
      console.log('Fetching early requests for user:', userCredentials.userid);
      
      // Create timeout promise
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), API_CONFIG.timeout)
      );

      // Build URL with loaded credentials
      let url = `${API_CONFIG.baseUrl}/flutter/early/list/?userid=${userCredentials.userid}&password=${userCredentials.password}`;
      
      // Add status filter if specified and not 'All'
      if (statusFilter && statusFilter !== 'All') {
        url += `&status=${statusFilter.toLowerCase()}`;
      }
      
      console.log('API URL:', url);

      const fetchPromise = fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'EarlyRequestApp/1.0',
        },
      });

      const response = await Promise.race([fetchPromise, timeoutPromise]);

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.log('Error response:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText || 'Failed to fetch early requests'}`);
      }

      const data = await response.json();
      console.log('Raw API Response:', JSON.stringify(data, null, 2));
      
      // Handle different response formats based on your API structure
      let requestsArray = [];
      
      if (Array.isArray(data)) {
        // If the response is directly an array
        requestsArray = data;
      } else if (data.success && data.data && Array.isArray(data.data)) {
        // If response has success flag and data array
        requestsArray = data.data;
      } else if (data.requests && Array.isArray(data.requests)) {
        // If response has requests array
        requestsArray = data.requests;
      } else if (data.early_requests && Array.isArray(data.early_requests)) {
        // If response has early_requests array
        requestsArray = data.early_requests;
      } else if (data.result && Array.isArray(data.result)) {
        // If response has result array
        requestsArray = data.result;
      } else if (data.status === 'success' && data.data) {
        // Alternative success response format
        requestsArray = Array.isArray(data.data) ? data.data : [data.data];
      } else {
        console.warn('Unexpected API response format:', data);
        // If no data found, set empty array
        requestsArray = [];
      }

      console.log('Extracted requests array:', requestsArray);

      // Format the data to match our component structure
      const formattedData = requestsArray.map((request, index) => {
        // Handle different field naming conventions from your API
        const id = request.id || request.request_id || request.early_id || request.ID || index;
        const date = request.date || request.early_date || request.request_date || request.Date;
        const earlyTime = request.early_time || request.time || request.requested_time || request.Time || request.early_Time;
        const reason = request.reason || request.comments || request.description || request.Reason || 'No reason provided';
        const status = (request.status || request.approval_status || request.Status || 'pending').toLowerCase();
        const requestedOn = request.created_date || request.created_at || request.requestedOn || request.submitted_date || request.CreatedDate || new Date().toISOString().split('T')[0];
        const userId = request.user_id || request.userid || request.employee_id || request.UserID;

        return {
          id,
          date,
          earlyTime,
          reason,
          status,
          requestedOn,
          userId,
          // Include original request data for debugging and potential operations
          originalData: request,
        };
      });

      console.log('Formatted data:', formattedData);
      setEarlyRequests(formattedData);

      // Show success message if this is a manual refresh
      if (!showLoader && formattedData.length > 0) {
        // Optional: Show a subtle success indicator
        console.log(`Successfully loaded ${formattedData.length} early requests`);
      }

    } catch (error) {
      console.error('Error fetching early requests:', error);
      
      let errorMessage = 'Failed to fetch early requests. Please try again.';
      
      if (error instanceof Error) {
        if (error.message === 'Request timeout') {
          errorMessage = 'Request timed out. Please check your internet connection and try again.';
        } else if (error.message.includes('Network request failed')) {
          errorMessage = 'Network connection failed. Please check your internet connection and try again.';
        } else if (error.message.includes('HTTP 401')) {
          errorMessage = 'Authentication failed. Please login again.';
          // Redirect to login on auth failure
          router.replace('/login');
          return;
        } else if (error.message.includes('HTTP 403')) {
          errorMessage = 'Access denied. You may not have permission to view early requests.';
        } else if (error.message.includes('HTTP 404')) {
          errorMessage = 'API endpoint not found. Please contact support.';
        } else if (error.message.includes('HTTP 5')) {
          errorMessage = 'Server error. Please try again later.';
        } else if (error.message.includes('JSON')) {
          errorMessage = 'Invalid response format from server. Please try again.';
        }
      }
      
      Alert.alert(
        'Error',
        errorMessage,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Retry', onPress: () => fetchEarlyRequests(showLoader, statusFilter) },
        ]
      );
      
      // Set empty array on error to show empty state
      setEarlyRequests([]);
    } finally {
      if (showLoader) {
        setLoading(false);
      }
      setRefreshing(false);
    }
  };

  // Load credentials on component mount
  useEffect(() => {
    loadCredentials();
  }, []);

  // Fetch data once credentials are loaded
  useEffect(() => {
    if (credentialsLoaded && userCredentials.userid && userCredentials.password) {
      console.log('Credentials loaded, fetching early requests...');
      fetchEarlyRequests();
    }
  }, [credentialsLoaded, userCredentials]);

  // Handle filter change - fetch data with status filter
  const handleFilterChange = (filter) => {
    setActiveFilter(filter);
    setCurrentPage(1);
    // Fetch data with the new filter
    if (credentialsLoaded) {
      fetchEarlyRequests(true, filter);
    }
  };

  // Handle refresh
  const onRefresh = async () => {
    setRefreshing(true);
    if (credentialsLoaded) {
      await fetchEarlyRequests(false, activeFilter);
    } else {
      setRefreshing(false);
    }
  };

  // Filter requests based on status (client-side filtering as fallback)
  const getFilteredRequests = () => {
    if (activeFilter === 'All') {
      return earlyRequests;
    }
    return earlyRequests.filter(request => 
      request.status.toLowerCase() === activeFilter.toLowerCase()
    );
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'approved':
        return '#28a745';
      case 'rejected':
        return '#dc3545';
      case 'pending':
        return '#ffc107';
      default:
        return '#6c757d';
    }
  };

  // Handle tab navigation
  const handleTabNavigation = async (route) => {
    if (loadingTab) return;
    setLoadingTab(route);
    await new Promise((res) => setTimeout(res, 300));
    router.push(`/${route}`);
    setLoadingTab(null);
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      // Check if date is valid
      if (isNaN(date.getTime())) {
        // Try parsing different date formats
        const parsedDate = new Date(dateString.replace(/[-\/]/g, '/'));
        if (!isNaN(parsedDate.getTime())) {
          return parsedDate.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          });
        }
        return 'Invalid Date';
      }
      
      return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'N/A';
    }
  };

  // Format time for display
  const formatTime = (timeString) => {
    if (!timeString) return 'N/A';
    
    try {
      // Handle different time formats
      if (timeString.includes(':')) {
        return timeString;
      }
      // If it's a number, convert to HH:MM format
      const timeNum = parseInt(timeString);
      if (!isNaN(timeNum)) {
        const hours = Math.floor(timeNum / 100);
        const minutes = timeNum % 100;
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      }
      return timeString;
    } catch (error) {
      console.error('Error formatting time:', error);
      return 'N/A';
    }
  };

  // Get request count for each status
  const getStatusCount = (status) => {
    if (status === 'All') {
      return earlyRequests.length;
    }
    return earlyRequests.filter(request => 
      request.status.toLowerCase() === status.toLowerCase()
    ).length;
  };

  const filteredRequests = getFilteredRequests();
  const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentRequests = filteredRequests.slice(startIndex, endIndex);

  // Show loading if credentials aren't loaded yet
  if (!credentialsLoaded) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading credentials...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Loading Overlay */}
      {loadingTab && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingOverlayTxt}>Loading…</Text>
        </View>
      )}

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Early Requests</Text>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
          <Ionicons name="refresh" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Filter Tabs with Counts */}
      <View style={styles.filterContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScrollContent}
        >
          {filterOptions.map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[
                styles.filterTab,
                activeFilter === filter && styles.activeFilterTab,
              ]}
              onPress={() => handleFilterChange(filter)}
            >
              <Text
                style={[
                  styles.filterTabText,
                  activeFilter === filter && styles.activeFilterTabText,
                ]}
              >
                {filter}
              </Text>
              {/* Show count badge */}
              <View style={[
                styles.countBadge,
                activeFilter === filter && styles.activeCountBadge,
              ]}>
                <Text style={[
                  styles.countText,
                  activeFilter === filter && styles.activeCountText,
                ]}>
                  {getStatusCount(filter)}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Pagination Info */}
      
      {/* Content */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#007AFF"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Loading early requests...</Text>
          </View>
        ) : currentRequests.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="time-outline" size={64} color="#fff" />
            <Text style={styles.emptyText}>No early requests found</Text>
            <Text style={styles.emptySubText}>
              {activeFilter === 'All' 
                ? 'You haven\'t submitted any early requests yet.'
                : `No ${activeFilter.toLowerCase()} early requests found.`
              }
            </Text>
            <TouchableOpacity
              style={styles.addEarlyButton}
              onPress={() => router.push('/early-request')}
            >
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.addEarlyButtonText}>Request Early</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.requestsList}>
            {/* Table Header */}
            <View style={styles.tableHeader}>
              <Text style={[styles.headerCell, styles.dateColumn]}>Date</Text>
              <Text style={[styles.headerCell, styles.timeColumn]}>Early Time</Text>
              <Text style={[styles.headerCell, styles.reasonColumn]}>Reason</Text>
              <Text style={[styles.headerCell, styles.statusColumn]}>Status</Text>
              <Text style={[styles.headerCell, styles.requestedColumn]}>Requested On</Text>
            </View>

            {/* Table Rows */}
            {currentRequests.map((request, index) => (
              <View key={request.id || index} style={styles.tableRow}>
                <Text style={[styles.cell, styles.dateColumn]}>
                  {formatDate(request.date)}
                </Text>
                <Text style={[styles.cell, styles.timeColumn]}>
                  {formatTime(request.earlyTime)}
                </Text>
                <Text 
                  style={[styles.cell, styles.reasonColumn]} 
                  numberOfLines={2}
                  ellipsizeMode="tail"
                >
                  {request.reason}
                </Text>
                <View style={[styles.cell, styles.statusColumn]}>
                  <View 
                    style={[
                      styles.statusBadge, 
                      { backgroundColor: getStatusColor(request.status) }
                    ]}
                  >
                    <Text style={styles.statusText}>
                      {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.cell, styles.requestedColumn]}>
                  {formatDate(request.requestedOn)}
                </Text>
                
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Debug Info - Remove in production */}
      {/* {__DEV__ && earlyRequests.length > 0 && (
        <View style={styles.debugInfo}>
          <Text style={styles.debugText}>
            Debug: Loaded {earlyRequests.length} requests from API
          </Text>
        </View>
      )} */}

      
    </View>
  );
};

export default ViewEarlyRequests;

const styles = StyleSheet.create({
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#15285cff',
    zIndex: 999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingOverlayTxt: { 
    color: '#fff', 
    marginTop: 8,
    fontSize: 16,
  },
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: '#1a1a2e',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
  },
  refreshButton: {
    padding: 5,
  },
  filterContainer: {
    backgroundColor: '#f3f4f723',
    paddingVertical: 0,
  },
  filterScrollContent: {
    paddingHorizontal: 0,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 15,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
    minWidth: 100,
    flexDirection: 'row',
  },
  activeFilterTab: {
    borderBottomColor: '#007AFF',
  },
  filterTabText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
    marginRight: 8,
  },
  activeFilterTabText: {
    color: '#007AFF',
    fontWeight: 'bold',
  },
  countBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  activeCountBadge: {
    backgroundColor: '#007AFF',
  },
  countText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: 'bold',
  },
  activeCountText: {
    color: '#fff',
  },
  paginationInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#f3f4f723',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  paginationText: {
    fontSize: 14,
    color: '#fff',
  },
  paginationButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  paginationButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  disabledButton: {
    opacity: 0.5,
  },
  paginationButtonText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
  content: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#fff',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 15,
    textAlign: 'center',
  },
  emptySubText: {
    fontSize: 14,
    color: '#fff',
    marginTop: 5,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  addEarlyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  addEarlyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  requestsList: {
    paddingBottom: 100,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f723',
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerCell: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    backgroundColor: '#f3f4f710',
  },
  cell: {
    fontSize: 13,
    color: '#fff',
    textAlign: 'center',
    alignSelf: 'center',
  },
  dateColumn: {
    flex: 1.2,
  },
  timeColumn: {
    flex: 1,
  },
  reasonColumn: {
    flex: 1.5,
  },
  statusColumn: {
    flex: 1,
    alignItems: 'center',
  },
  requestedColumn: {
    flex: 1.2,
  },
 
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 60,
    alignItems: 'center',
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  actionText: {
    fontSize: 13,
    color: '#888',
  },
  debugInfo: {
    position: 'absolute',
    top: 100,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 8,
    borderRadius: 4,
    zIndex: 100,
  },
  debugText: {
    color: '#fff',
    fontSize: 12,
  },
  
});