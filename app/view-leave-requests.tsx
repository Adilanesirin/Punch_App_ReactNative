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

const ViewLeaveRequests = () => {
  const router = useRouter();
  const params = useLocalSearchParams(); 
  
  // State management
  const [loadingTab, setLoadingTab] = useState(null);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  interface UserCredentials {
    userid: string;
    password: string;
  }

  // Filter options
  const filterOptions = ['All', 'Pending', 'Approved', 'Rejected'];
  
  // User credentials state
  const [userCredentials, setUserCredentials] = useState<UserCredentials>({
    userid: '',
    password: ''
  });
  const [isLoadingCredentials, setIsLoadingCredentials] = useState(true);

  // Load user credentials on component mount
  useEffect(() => {
    const loadUserCredentials = async () => {
      try {
        // Method 1: Try to get from route parameters first
        if (params.userid && params.password) {
          setUserCredentials({
            userid: params.userid as string,
            password: params.password as string
          });
          setIsLoadingCredentials(false);
          return;
        }

        // Method 2: Try to get from secure storage
        const storedUserid = await SecureStore.getItemAsync('userId');
        const storedPassword = await SecureStore.getItemAsync('password');
        
        if (storedUserid && storedPassword) {
          setUserCredentials({
            userid: storedUserid,
            password: storedPassword
          });
        } else {
          // Method 3: Fallback - show alert and go back
          Alert.alert(
            'Authentication Error',
            'User credentials not found. Please login again.',
            [
              {
                text: 'OK',
                onPress: () => router.replace('/login') // Navigate to login instead of back
              }
            ]
          );
          return;
        }
      } catch (error) {
        console.error('Error loading user credentials:', error);
        Alert.alert(
          'Error',
          'Failed to load user credentials. Please try again.',
          [
            {
              text: 'OK',
              onPress: () => router.replace('/login') // Navigate to login instead of back
            }
          ]
        );
        return;
      } finally {
        setIsLoadingCredentials(false);
      }
    };

    loadUserCredentials();
  }, [params.userid, params.password, router]);

  // Fetch leave requests from API with status filter
  const fetchLeaveRequests = async (showLoader = true, statusFilter = null) => {
    // Don't fetch if credentials are not loaded yet
    if (isLoadingCredentials || !userCredentials.userid || !userCredentials.password) {
      console.log('Credentials not ready yet, skipping fetch');
      return;
    }

    try {
      if (showLoader) {
        setLoading(true);
      }
      
      console.log('Fetching leave requests for user:', userCredentials.userid);
      
      // Create timeout promise
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), 15000)
      );

      // Build URL with user credentials
      let url = `https://myimc.in/flutter/leave/list/?userid=${userCredentials.userid}&password=${userCredentials.password}`;
      
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
        },
      });

      const response = await Promise.race([fetchPromise, timeoutPromise]);

      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.log('Error response:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText || 'Failed to fetch leave requests'}`);
      }

      const data = await response.json();
      console.log('API Response:', data);
      
      // Handle different response formats
      let requestsArray = [];
      
      if (Array.isArray(data)) {
        requestsArray = data;
      } else if (data.success && data.data && Array.isArray(data.data)) {
        requestsArray = data.data;
      } else if (data.requests && Array.isArray(data.requests)) {
        requestsArray = data.requests;
      } else if (data.leaves && Array.isArray(data.leaves)) {
        requestsArray = data.leaves;
      } else if (data.leave_requests && Array.isArray(data.leave_requests)) {
        requestsArray = data.leave_requests;
      } else if (data.success && Array.isArray(data.result)) {
        requestsArray = data.result;
      } else {
        console.warn('Unexpected API response format:', data);
        requestsArray = [];
      }

      // Format the data to match our component structure
      const formattedData = requestsArray.map((request, index) => {
        // Handle different field naming conventions
        const id = request.id || request.request_id || request.leave_id || index;
        const startDate = request.start_date || request.startDate || request.from_date;
        const endDate = request.end_date || request.endDate || request.to_date;
        const leaveType = request.leave_type || request.leaveType || request.type || 'Full Day';
        const reason = request.reason || request.comments || request.description || 'No reason provided';
        const status = (request.status || request.approval_status || 'pending').toLowerCase();
        const requestedOn = request.created_date || request.created_at || request.requestedOn || request.submitted_date || new Date().toISOString().split('T')[0];
        const userId = request.user_id || request.userid || request.employee_id;

        return {
          id,
          startDate,
          endDate,
          leaveType,
          reason,
          status,
          requestedOn,
          userId,
          originalData: request,
        };
      });

      console.log('Formatted data:', formattedData);
      setLeaveRequests(formattedData);

    } catch (error) {
      console.error('Error fetching leave requests:', error);
      
      let errorMessage = 'Failed to fetch leave requests. Please try again.';
      
      if (error instanceof Error) {
        if (error.message === 'Request timeout') {
          errorMessage = 'Request timed out. Please check your internet connection and try again.';
        } else if (error.message.includes('Network request failed')) {
          errorMessage = 'Network connection failed. Please check your internet connection and try again.';
        } else if (error.message.includes('HTTP 401')) {
          errorMessage = 'Authentication failed. Please check your credentials.';
        } else if (error.message.includes('HTTP 403')) {
          errorMessage = 'Access denied. You may not have permission to view leave requests.';
        } else if (error.message.includes('HTTP 404')) {
          errorMessage = 'API endpoint not found. Please contact support.';
        } else if (error.message.includes('HTTP 5')) {
          errorMessage = 'Server error. Please try again later.';
        }
      }
      
      Alert.alert(
        'Error',
        errorMessage,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Retry', onPress: () => fetchLeaveRequests(showLoader, statusFilter) },
        ]
      );
    } finally {
      if (showLoader) {
        setLoading(false);
      }
      setRefreshing(false);
    }
  };

  // Delete leave request
  const deleteLeaveRequest = async (requestId) => {
    // Don't delete if credentials are not loaded
    if (isLoadingCredentials || !userCredentials.userid || !userCredentials.password) {
      Alert.alert('Error', 'User credentials not available');
      return;
    }

    try {
      console.log('Deleting leave request:', requestId);
      
      const deleteData = {
        userid: userCredentials.userid,
        password: userCredentials.password,
        request_id: requestId,
      };

      // Create timeout promise
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), 15000)
      );

      const fetchPromise = fetch(`https://myimc.in/flutter/leave/delete/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(deleteData),
      });

      const response = await Promise.race([fetchPromise, timeoutPromise]);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText || 'Failed to delete leave request'}`);
      }

      const result = await response.json();
      console.log('Delete response:', result);

      // Check if deletion was successful
      if (result.success || result.status === 'success') {
        // Refresh the list after successful deletion
        await fetchLeaveRequests(false, activeFilter);
        Alert.alert('Success', result.message || 'Leave request deleted successfully');
      } else {
        throw new Error(result.message || 'Failed to delete leave request');
      }

    } catch (error) {
      console.error('Error deleting leave request:', error);
      let errorMessage = 'Failed to delete leave request. Please try again.';
      
      if (error instanceof Error) {
        if (error.message === 'Request timeout') {
          errorMessage = 'Request timed out. Please check your internet connection and try again.';
        } else if (error.message.includes('HTTP 401')) {
          errorMessage = 'Authentication failed. Please check your credentials.';
        } else if (error.message.includes('HTTP 403')) {
          errorMessage = 'Access denied. You may not have permission to delete this request.';
        } else {
          errorMessage = error.message;
        }
      }
      
      Alert.alert(
        'Error',
        errorMessage,
        [{ text: 'OK' }]
      );
    }
  };

  // Handle delete confirmation
  const handleDeleteRequest = (request) => {
    Alert.alert(
      'Delete Leave Request',
      `Are you sure you want to delete this leave request?\n\nDate: ${formatDate(request.startDate)} to ${formatDate(request.endDate)}\nReason: ${request.reason}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive', 
          onPress: () => deleteLeaveRequest(request.id) 
        },
      ]
    );
  };

  // Fetch data when credentials are loaded
  useEffect(() => {
    if (!isLoadingCredentials && userCredentials.userid && userCredentials.password) {
      fetchLeaveRequests();
    }
  }, [isLoadingCredentials, userCredentials.userid, userCredentials.password]);

  // Handle filter change - fetch data with status filter
  const handleFilterChange = (filter) => {
    setActiveFilter(filter);
    setCurrentPage(1);
    // Fetch data with the new filter
    fetchLeaveRequests(true, filter);
  };

  // Handle refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchLeaveRequests(false, activeFilter);
  };

  // Filter requests based on status (client-side filtering as fallback)
  const getFilteredRequests = () => {
    if (activeFilter === 'All') {
      return leaveRequests;
    }
    return leaveRequests.filter(request => 
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

  // Get leave type display name
  const getLeaveTypeDisplayName = (leaveType) => {
    const typeMap = {
      'full_day': 'Full Day',
      'half_day_morning': 'Half Day - Morning',
      'half_day_evening': 'Half Day - Evening',
      'hourly': 'Hourly',
    };
    
    return typeMap[leaveType] || leaveType || 'Full Day';
  };

  // Get request count for each status
  const getStatusCount = (status) => {
    if (status === 'All') {
      return leaveRequests.length;
    }
    return leaveRequests.filter(request => 
      request.status.toLowerCase() === status.toLowerCase()
    ).length;
  };

  // Show loading while credentials are being loaded
  if (isLoadingCredentials) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading user credentials...</Text>
        </View>
      </View>
    );
  }

  const filteredRequests = getFilteredRequests();
  const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentRequests = filteredRequests.slice(startIndex, endIndex);

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
        <Text style={styles.headerTitle}>Leave Requests</Text>
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

      {/* User Info Display */}
      <View style={styles.userInfo}>
        <Ionicons name="person" size={16} color="#fff" />
        <Text style={styles.userInfoText}>
          Logged in as: {userCredentials.userid}
        </Text>
      </View>

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
            <Text style={styles.loadingText}>Loading leave requests...</Text>
          </View>
        ) : currentRequests.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={64} color="#fff" />
            <Text style={styles.emptyText}>No leave requests found</Text>
            <Text style={styles.emptySubText}>
              {activeFilter === 'All' 
                ? 'You haven\'t submitted any leave requests yet.'
                : `No ${activeFilter.toLowerCase()} leave requests found.`
              }
            </Text>
            <TouchableOpacity
              style={styles.addLeaveButton}
              onPress={() => router.push('/request')}
            >
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.addLeaveButtonText}>Request Leave</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.requestsList}>
            {/* Table Header */}
            <View style={styles.tableHeader}>
              <Text style={[styles.headerCell, styles.dateColumn]}>Start Date</Text>
              <Text style={[styles.headerCell, styles.dateColumn]}>End Date</Text>
              <Text style={[styles.headerCell, styles.typeColumn]}>Leave Type</Text>
              <Text style={[styles.headerCell, styles.reasonColumn]}>Reason</Text>
              <Text style={[styles.headerCell, styles.statusColumn]}>Status</Text>
            </View>

            {/* Table Rows */}
            {currentRequests.map((request, index) => (
              <TouchableOpacity key={request.id || index} style={styles.tableRow}>
                <Text style={[styles.cell, styles.dateColumn]}>
                  {formatDate(request.startDate)}
                </Text>
                <Text style={[styles.cell, styles.dateColumn]}>
                  {formatDate(request.endDate)}
                </Text>
                <Text style={[styles.cell, styles.typeColumn]}>
                  {getLeaveTypeDisplayName(request.leaveType)}
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
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          onPress={() => handleTabNavigation('punch')}
          disabled={loadingTab !== null}
          style={styles.tabButton}
        >
          {loadingTab === 'punch' ? (
            <ActivityIndicator size="small" color="#888" />
          ) : (
            <>
              <Ionicons name="finger-print" size={35} color="#ffff" />
              <Text style={[styles.tabLabel, {color: '#ffff'}]}>Punch</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => handleTabNavigation('home')}
          disabled={loadingTab !== null}
          style={styles.tabButton}
        >
          {loadingTab === 'home' ? (
            <ActivityIndicator size="small" color="#ffff" />
          ) : (
            <>
              <Ionicons name="home" size={35} color="#ffff" />
              <Text style={[styles.tabLabel, {color: '#ffff'}]}>Home</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => handleTabNavigation('request')}
          disabled={loadingTab !== null}
          style={styles.tabButton}
        >
          {loadingTab === 'request' ? (
            <ActivityIndicator size="small" color="#00ddff" />
          ) : (
            <>
              <Ionicons name="document-text" size={35} color="#00ddff" />
              <Text style={[styles.tabLabel, styles.activeTabLabel, {color: '#00ddff'}]}>Request</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default ViewLeaveRequests;

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
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#f3f4f723',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  userInfoText: {
    fontSize: 14,
    color: '#fff',
    marginLeft: 8,
    fontStyle: 'italic',
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
  addLeaveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  addLeaveButtonText: {
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
  typeColumn: {
    flex: 1,
  },
  reasonColumn: {
    flex: 1.5,
  },
  statusColumn: {
    flex: 1,
    alignItems: 'center',
  },
  actionColumn: {
    flex: 0.8,
    alignItems: 'center',
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
  deleteButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 242, 242, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(254, 202, 202, 0.3)',
  },
  tabBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: '#16213e',
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 12,
    color: '#888',
    marginTop: 5,
    textAlign: 'center',
  },
  activeTabLabel: { 
    color: '#356effc8', 
    fontWeight: 'bold',
  },
});