/* eslint-disable prettier/prettier */
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

interface LeaveRequestData {
  userid: string;
  password: string;
  start_date: string;
  end_date: string;
  leave_type: string;
  reason: string;
}

interface UserCredentials {
  userid: string;
  password: string;
}

const LeaveRequest = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  // Form state
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [leaveType, setLeaveType] = useState('full_day');
  const [reason, setReason] = useState('');
  
  // UI state
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showLeaveTypeModal, setShowLeaveTypeModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
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
                onPress: () => router.back()
              }
            ]
          );
        }
      } catch (error) {
        console.error('Error loading user credentials:', error);
        Alert.alert(
          'Error',
          'Failed to load user credentials. Please try again.',
          [
            {
              text: 'OK',
              onPress: () => router.back()
            }
          ]
        );
      } finally {
        setIsLoadingCredentials(false);
      }
    };

    loadUserCredentials();
  }, [params.userid, params.password, router]);

  // API Configuration
  const API_CONFIG = {
    baseUrl: 'https://myimc.in',
    timeout: 15000,
  };

  // Leave type options
  const leaveTypeOptions = [
    { label: 'Full Day', value: 'full_day' },
    { label: 'Half Day - Morning', value: 'half_day_morning' },
    { label: 'Half Day - Evening', value: 'half_day_evening' },
    { label: 'Hourly', value: 'hourly' },
  ];

  const formatDate = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  const formatDisplayDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Enhanced date change handlers with better iOS handling
  const handleStartDateChange = (event: any, selectedDate?: Date) => {
    console.log('Start date event:', event.type, 'Platform:', Platform.OS);
    
    if (Platform.OS === 'android') {
      setShowStartDatePicker(false);
      
      if (event.type === 'set' && selectedDate) {
        setStartDate(selectedDate);
        if (selectedDate > endDate) {
          setEndDate(selectedDate);
        }
      }
    } else {
      // iOS - only update date, don't close picker immediately
      if (selectedDate) {
        setStartDate(selectedDate);
        if (selectedDate > endDate) {
          setEndDate(selectedDate);
        }
      }
    }
  };

  const handleEndDateChange = (event: any, selectedDate?: Date) => {
    console.log('End date event:', event.type, 'Platform:', Platform.OS);
    
    if (Platform.OS === 'android') {
      setShowEndDatePicker(false);
      
      if (event.type === 'set' && selectedDate) {
        if (selectedDate >= startDate) {
          setEndDate(selectedDate);
        } else {
          Alert.alert('Invalid Date', 'End date cannot be before start date');
        }
      }
    } else {
      if (selectedDate) {
        if (selectedDate >= startDate) {
          setEndDate(selectedDate);
        } else {
          Alert.alert('Invalid Date', 'End date cannot be before start date');
        }
      }
    }
  };

  // Enhanced date picker with better error handling
  const renderDatePicker = (
    isVisible: boolean,
    value: Date,
    onChange: (event: any, date?: Date) => void,
    minimumDate: Date,
    title: string,
    onClose: () => void
  ) => {
    if (!isVisible) return null;

    if (Platform.OS === 'android') {
      return (
        <DateTimePicker
          value={value}
          mode="date"
          display="default"
          onChange={onChange}
          minimumDate={minimumDate}
        />
      );
    } else {
      return (
        <Modal
          visible={isVisible}
          transparent
          animationType="slide"
          onRequestClose={onClose}
        >
          <View style={styles.datePickerModalOverlay}>
            <View style={styles.datePickerModalContent}>
              <View style={styles.datePickerHeader}>
                <TouchableOpacity onPress={onClose}>
                </TouchableOpacity>
                <Text style={styles.datePickerTitle}>{title}</Text>
                <TouchableOpacity onPress={onClose}>
                  <Text style={styles.datePickerDoneText}>Done</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.datePickerContainer}>
                <DateTimePicker
                  value={value}
                  mode="date"
                  display="spinner"
                  onChange={onChange}
                  minimumDate={minimumDate}
                  textColor="#fff"
                  themeVariant="dark"
                />
              </View>
            </View>
          </View>
        </Modal>
      );
    }
  };

  const validateForm = (): boolean => {
    if (!userCredentials.userid || !userCredentials.password) {
      Alert.alert('Authentication Error', 'User credentials not available. Please login again.');
      return false;
    }

    if (startDate > endDate) {
      Alert.alert('Validation Error', 'End date must be after or equal to start date');
      return false;
    }
    
    if (!reason.trim()) {
      Alert.alert('Validation Error', 'Please provide a reason for leave');
      return false;
    }

    if (reason.trim().length < 10) {
      Alert.alert('Validation Error', 'Please provide a more detailed reason (at least 10 characters)');
      return false;
    }
    
    return true;
  };

  // Updated API call with dynamic user credentials
  const submitLeaveRequest = async () => {
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    
    const requestData: LeaveRequestData = {
      userid: userCredentials.userid, // Now uses actual user credentials
      password: userCredentials.password, // Now uses actual user credentials
      start_date: formatDate(startDate),
      end_date: formatDate(endDate),
      leave_type: leaveType,
      reason: reason.trim(),
    };

    // Create timeout promise
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout')), API_CONFIG.timeout)
    );

    try {
      console.log('Submitting leave request for user:', userCredentials.userid);
      console.log('Request data:', { ...requestData, password: '[HIDDEN]' }); // Hide password in logs
      
      const fetchPromise = fetch(`${API_CONFIG.baseUrl}/flutter/leave/create/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      // Race between fetch and timeout
      const response = await Promise.race([fetchPromise, timeoutPromise]) as Response;

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);

      // Check if response is ok
      if (!response.ok) {
        const errorText = await response.text();
        console.log('Error response:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText || 'Unknown error'}`);
      }

      // Parse JSON response
      const result = await response.json();
      console.log('Success response:', result);

      // Handle your API's response format
      if (result.success) {
        Alert.alert(
          'Success',
          result.message || 'Leave request submitted successfully!',
          [{ 
            text: 'OK', 
            onPress: () => {
              // Reset form
              setStartDate(new Date());
              setEndDate(new Date());
              setLeaveType('full_day');
              setReason('');
              router.back();
            }
          }]
        );
      } else {
        // Handle API error response
        throw new Error(result.message || 'Request failed');
      }

    } catch (error) {
      console.error('Error submitting leave request:', error);
      
      let errorMessage = 'An unexpected error occurred. Please try again.';
      
      if (error instanceof Error) {
        if (error.message === 'Request timeout') {
          errorMessage = 'Request timed out. Please check your internet connection and try again.';
        } else if (error.message.includes('Network request failed')) {
          errorMessage = 'Network connection failed. Please check your internet connection and try again.';
        } else if (error.message.includes('HTTP 401')) {
          errorMessage = 'Authentication failed. Please check your credentials and login again.';
        } else if (error.message.includes('HTTP 403')) {
          errorMessage = 'Access denied. You may not have permission to submit leave requests.';
        } else if (error.message.includes('HTTP 4')) {
          errorMessage = 'Invalid request. Please check your details and try again.';
        } else if (error.message.includes('HTTP 5')) {
          errorMessage = 'Server error. Please try again later.';
        } else {
          errorMessage = error.message;
        }
      }
      
      Alert.alert(
        'Submission Failed',
        errorMessage,
        [
          { text: 'Retry', onPress: submitLeaveRequest },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // For testing purposes - simulate successful submission
  const submitLeaveRequestMock = async () => {
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setIsSubmitting(false);
    
    Alert.alert(
      'Success (Mock)',
      `Leave request submitted successfully for user: ${userCredentials.userid}! (This is a mock submission for testing)`,
      [{ 
        text: 'OK', 
        onPress: () => {
          setStartDate(new Date());
          setEndDate(new Date());
          setLeaveType('full_day');
          setReason('');
          router.back();
        }
      }]
    );
  };

  const handleClose = () => {
    const hasChanges = reason.trim() !== '' || 
                      startDate.toDateString() !== new Date().toDateString() ||
                      endDate.toDateString() !== new Date().toDateString() ||
                      leaveType !== 'full_day';

    if (hasChanges) {
      Alert.alert(
        'Discard Changes',
        'You have unsaved changes. Are you sure you want to close?',
        [
          { text: 'Continue Editing', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: () => router.back() },
        ]
      );
    } else {
      router.back();
    }
  };

  // Show loading screen while credentials are being loaded
  if (isLoadingCredentials) {
    return (
      <View style={[styles.container, styles.loadingScreen]}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // Show error if no credentials available
  if (!userCredentials.userid || !userCredentials.password) {
    return (
      <View style={[styles.container, styles.errorScreen]}>
        <Ionicons name="warning-outline" size={48} color="#ff6b6b" />
        <Text style={styles.errorTitle}>Authentication Required</Text>
        <Text style={styles.errorMessage}>
          Please login to submit leave requests.
        </Text>
        <TouchableOpacity style={styles.errorButton} onPress={() => router.back()}>
          <Text style={styles.errorButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <Text style={styles.pageTitle}>LEAVE REQUEST</Text>
      
      {/* User Info Display */}
      

      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollViewContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.form}>
          {/* Start Date */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Start Date *</Text>
            <TouchableOpacity
              style={styles.dateInput}
              onPress={() => setShowStartDatePicker(true)}
            >
              <Text style={styles.dateText}>
                {formatDisplayDate(startDate)}
              </Text>
              <Ionicons name="calendar-outline" size={20} color="#007AFF" />
            </TouchableOpacity>
          </View>

          {/* End Date */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>End Date *</Text>
            <TouchableOpacity
              style={styles.dateInput}
              onPress={() => setShowEndDatePicker(true)}
            >
              <Text style={styles.dateText}>
                {formatDisplayDate(endDate)}
              </Text>
              <Ionicons name="calendar-outline" size={20} color="#007AFF" />
            </TouchableOpacity>
          </View>

          {/* Leave Duration Info */}
          <View style={styles.infoContainer}>
            <Ionicons name="information-circle-outline" size={16} color="#fff" />
            <Text style={styles.infoText}>
              Duration: {Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1} day(s)
            </Text>
          </View>

          {/* Leave Type */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Leave Type *</Text>
            <TouchableOpacity
              style={styles.dropdownInput}
              onPress={() => setShowLeaveTypeModal(true)}
            >
              <Text style={styles.dropdownText}>
                {leaveTypeOptions.find(option => option.value === leaveType)?.label}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#007AFF" />
            </TouchableOpacity>
          </View>

          {/* Reason */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Reason *</Text>
            <TextInput
              style={styles.reasonInput}
              multiline
              numberOfLines={4}
              placeholder="Enter reason for leave ..."
              placeholderTextColor="#999"
              value={reason}
              onChangeText={setReason}
              textAlignVertical="top"
              maxLength={500}
            />
            <Text style={styles.characterCount}>
              {reason.length}/500 characters
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionContainer}>
            <TouchableOpacity
              style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
              onPress={submitLeaveRequest} // Using real API - change to submitLeaveRequestMock for testing
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={styles.loadingText}>Submitting...</Text>
                </View>
              ) : (
                <Text style={styles.submitButtonText}>Submit Request</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Date Pickers */}
      {renderDatePicker(
        showStartDatePicker,
        startDate,
        handleStartDateChange,
        new Date(),
        "Select Start Date",
        () => setShowStartDatePicker(false)
      )}

      {renderDatePicker(
        showEndDatePicker,
        endDate,
        handleEndDateChange,
        startDate,
        "Select End Date", 
        () => setShowEndDatePicker(false)
      )}

      {/* Leave Type Modal */}
      <Modal
        visible={showLeaveTypeModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLeaveTypeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Leave Type</Text>
            {leaveTypeOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.modalOption,
                  leaveType === option.value && styles.modalOptionSelected,
                ]}
                onPress={() => {
                  setLeaveType(option.value);
                  setShowLeaveTypeModal(false);
                }}
              >
                <Text
                  style={[
                    styles.modalOptionText,
                    leaveType === option.value && styles.modalOptionTextSelected,
                  ]}
                >
                  {option.label}
                </Text>
                {leaveType === option.value && (
                  <Ionicons name="checkmark" size={20} color="#007AFF" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

export default LeaveRequest;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  loadingScreen: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 10,
  },
  errorScreen: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
  },
  errorMessage: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  errorButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
  },
  errorButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    paddingTop: 50,
    paddingHorizontal: 20,
  },
  pageTitle: {
    textAlign: 'center',
    fontSize: 24,
    fontWeight: 'bold',
    marginVertical: 20,
    color: '#fff',
  },
  userInfoContainer: {
    backgroundColor: 'rgba(0, 122, 255, 0.2)',
    marginHorizontal: 20,
    marginBottom: 10,
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  userInfoText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  form: {
    backgroundColor: '#f3f4f723',
    borderRadius: 15,
    padding: 20,
    margin: 20,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  dateInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  dateText: {
    fontSize: 16,
    color: '#333',
  },
  dropdownInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  dropdownText: {
    fontSize: 16,
    color: '#333',
  },
  reasonInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
    minHeight: 100,
  },
  characterCount: {
    fontSize: 12,
    color: '#fff',
    marginTop: 5,
    textAlign: 'right',
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(212, 228, 229, 0.42)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  infoText: {
    fontSize: 14,
    color: '#fff',
    marginLeft: 8,
  },
  actionContainer: {
    flexDirection: 'row',
    marginTop: 10,
    gap: 15,
  },
  closeActionButton: {
    flex: 1,
    backgroundColor: '#b9c2ca96',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 20,
    margin: 20,
    minWidth: 280,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 15,
    textAlign: 'center',
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  modalOptionSelected: {
    backgroundColor: 'rgba(0, 122, 255, 0.2)',
  },
  modalOptionText: {
    fontSize: 16,
    color: '#fff',
  },
  modalOptionTextSelected: {
    color: '#007AFF',
    fontWeight: '500',
  },
  datePickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  datePickerModalContent: {
    backgroundColor: '#1a1a2e',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 30 : 20,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    backgroundColor: '#1a1a2e',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  datePickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  datePickerCancelText: {
    fontSize: 16,
    color: '#fff',
  },
  datePickerDoneText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  datePickerContainer: {
    backgroundColor: '#1a1a2e',
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderRadius: 12,
    margin: 15,
  },
});