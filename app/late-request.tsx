/* eslint-disable prettier/prettier */
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

interface LateRequestData {
  userid: string;
  password: string;
  date: string;
  delay_time: string;
  reason: string;
}

interface UserCredentials {
  userid: string;
  password: string;
}

const LateRequest = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  // Form state
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [delayTime, setDelayTime] = useState('');
  const [reason, setReason] = useState('');
  
  // UI state
  const [showDatePicker, setShowDatePicker] = useState(false);
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

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatDateForAPI = (date: Date) => {
    return date.toISOString().split('T')[0]; // Format: YYYY-MM-DD
  };

  // Enhanced date change handlers with better iOS handling
  const handleDateChange = (event: any, selectedDate?: Date) => {
    console.log('Date event:', event.type, 'Platform:', Platform.OS);
    
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
      
      if (event.type === 'set' && selectedDate) {
        setSelectedDate(selectedDate);
      }
    } else {
      // iOS - only update date, don't close picker immediately
      if (selectedDate) {
        setSelectedDate(selectedDate);
      }
    }
  };

  // Enhanced date picker with better error handling
  const renderDatePicker = () => {
    if (!showDatePicker) return null;

    if (Platform.OS === 'android') {
      return (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="default"
          onChange={handleDateChange}
          minimumDate={new Date()}
        />
      );
    } else {
      return (
        <Modal
          visible={showDatePicker}
          transparent
          animationType="slide"
          onRequestClose={() => setShowDatePicker(false)}
        >
          <View style={styles.datePickerModalOverlay}>
            <View style={styles.datePickerModalContent}>
              <View style={styles.datePickerHeader}>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Text style={styles.datePickerCancelText}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.datePickerTitle}>Select Date</Text>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Text style={styles.datePickerDoneText}>Done</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.datePickerContainer}>
                <DateTimePicker
                  value={selectedDate}
                  mode="date"
                  display="spinner"
                  onChange={handleDateChange}
                  minimumDate={new Date()}
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

    if (!delayTime.trim()) {
      Alert.alert('Validation Error', 'Please enter delay time');
      return false;
    }
    
    if (!reason.trim()) {
      Alert.alert('Validation Error', 'Please enter reason for late arrival');
      return false;
    }

    if (reason.trim().length < 0) {
      Alert.alert('Validation Error', 'Please provide a more detailed reason (at least 10 characters)');
      return false;
    }
    
    return true;
  };

  // Updated API call with dynamic user credentials
  const submitLateRequest = async () => {
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    
    const requestData: LateRequestData = {
      userid: userCredentials.userid, // Now uses actual user credentials
      password: userCredentials.password, // Now uses actual user credentials
      date: formatDateForAPI(selectedDate),
      delay_time: delayTime.trim(),
      reason: reason.trim(),
    };

    // Create timeout promise
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout')), API_CONFIG.timeout)
    );

    try {
      console.log('Submitting late request for user:', userCredentials.userid);
      console.log('Request data:', { ...requestData, password: '[HIDDEN]' }); // Hide password in logs
      
      const fetchPromise = fetch(`${API_CONFIG.baseUrl}/flutter/late/create/`, {
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
          result.message || 'Late request submitted successfully!',
          [{ 
            text: 'OK', 
            onPress: () => {
              // Reset form
              setSelectedDate(new Date());
              setDelayTime('');
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
      console.error('Error submitting late request:', error);
      
      let errorMessage = 'An unexpected error occurred. Please try again.';
      
      if (error instanceof Error) {
        if (error.message === 'Request timeout') {
          errorMessage = 'Request timed out. Please check your internet connection and try again.';
        } else if (error.message.includes('Network request failed')) {
          errorMessage = 'Network connection failed. Please check your internet connection and try again.';
        } else if (error.message.includes('HTTP 401')) {
          errorMessage = 'Authentication failed. Please check your credentials and login again.';
        } else if (error.message.includes('HTTP 403')) {
          errorMessage = 'Access denied. You may not have permission to submit late requests.';
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
          { text: 'Retry', onPress: submitLateRequest },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // For testing purposes - simulate successful submission
  const submitLateRequestMock = async () => {
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setIsSubmitting(false);
    
    Alert.alert(
      'Success (Mock)',
      `Late request submitted successfully for user: ${userCredentials.userid}! (This is a mock submission for testing)`,
      [{ 
        text: 'OK', 
        onPress: () => {
          setSelectedDate(new Date());
          setDelayTime('');
          setReason('');
          router.back();
        }
      }]
    );
  };

  const handleClose = () => {
    const hasChanges = reason.trim() !== '' || 
                      delayTime.trim() !== '' ||
                      selectedDate.toDateString() !== new Date().toDateString();

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
          Please login to submit late requests.
        </Text>
        <TouchableOpacity style={styles.errorButton} onPress={() => router.back()}>
          <Text style={styles.errorButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleClose}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <Text style={styles.pageTitle}>LATE REQUEST</Text>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.form}>
          {/* Date Field */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Date *</Text>
            <TouchableOpacity
              style={styles.dateInput}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.dateText}>
                {formatDate(selectedDate)}
              </Text>
              <Ionicons name="calendar-outline" size={20} color="#007AFF" />
            </TouchableOpacity>
          </View>

          {/* Delay Time Field */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Delay Time *</Text>
            <TextInput
              style={styles.textInput}
              value={delayTime}
              onChangeText={setDelayTime}
              placeholder="e.g., 10 minutes, 1 hour"
              placeholderTextColor="#999"
              maxLength={50}
            />
          </View>

          {/* Reason Field */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Reason *</Text>
            <TextInput
              style={styles.reasonInput}
              multiline
              numberOfLines={4}
              placeholder="Enter reason for late arrival ..."
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
              onPress={submitLateRequest} // Using real API - change to submitLateRequestMock for testing
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

      {/* Date Picker */}
      {renderDatePicker()}
    </View>
  );
};

export default LateRequest;

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
  scrollView: {
    flex: 1,
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
  textInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
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
  actionContainer: {
    flexDirection: 'row',
    marginTop: 10,
    gap: 15,
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