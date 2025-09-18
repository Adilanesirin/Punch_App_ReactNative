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

    interface EarlyDepartureRequestData {
      userid: string;
      password: string;
      date: string;
      early_time: string;
      reason: string;
    }

    interface UserCredentials {
      userid: string;
      password: string;
    }

    const REASON_OPTIONS = [
      'Health Emergency',
      'Medical Appointment',
      'Dependent Care',
      'Bereavement',
      'Transportation Issues',
      'Accident',
      
    ];

    const EarlyDepartureRequest = () => {
      const router = useRouter();
      const params = useLocalSearchParams();
      
      // Form state
      const [selectedDate, setSelectedDate] = useState(new Date());
      const [departureTime, setDepartureTime] = useState('');
      const [selectedReason, setSelectedReason] = useState('');
      
      // UI state
      const [showDatePicker, setShowDatePicker] = useState(false);
      const [showReasonPicker, setShowReasonPicker] = useState(false);
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
        // Format date as YYYY-MM-DD for API
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      const convertTimeTo24Hour = (time12h: string) => {
        // Convert time like "4:00 PM" to "16:00" format
        const [time, modifier] = time12h.split(' ');
        let [hours, minutes] = time.split(':');
        
        if (hours === '12') {
          hours = '00';
        }
        
        if (modifier === 'PM' || modifier === 'pm') {
          hours = String(parseInt(hours, 10) + 12);
        }
        
        return `${String(hours).padStart(2, '0')}:${minutes}`;
      };

      const validateTimeFormat = (timeStr: string) => {
        // Check if time is in format like "4:00 PM" or "16:00"
        const time12hPattern = /^(0?[1-9]|1[0-2]):[0-5][0-9]\s?(AM|PM|am|pm)$/;
        const time24hPattern = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
        
        return time12hPattern.test(timeStr) || time24hPattern.test(timeStr);
      };

      const handleDateChange = (event: any, date?: Date) => {
        console.log('Date event:', event.type, 'Platform:', Platform.OS);
        
        if (Platform.OS === 'android') {
          setShowDatePicker(false);
          
          if (event.type === 'set' && date) {
            setSelectedDate(date);
          }
        } else {
          // iOS - only update date, don't close picker immediately
          if (date) {
            setSelectedDate(date);
          }
        }
      };

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
                      <Text style={styles.datePickerCancelText}>Cancel</Text>
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

      // Reason picker modal
      const renderReasonPicker = () => {
        return (
          <Modal
            visible={showReasonPicker}
            transparent
            animationType="slide"
            onRequestClose={() => setShowReasonPicker(false)}
          >
            <View style={styles.reasonPickerModalOverlay}>
              <View style={styles.reasonPickerModalContent}>
                <View style={styles.reasonPickerHeader}>
                  <TouchableOpacity onPress={() => setShowReasonPicker(false)}>
                    <Text style={styles.datePickerCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <Text style={styles.datePickerTitle}>Select Reason</Text>
                  <TouchableOpacity onPress={() => setShowReasonPicker(false)}>
                    <Text style={styles.datePickerDoneText}>Done</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView style={styles.reasonOptionsContainer}>
                  {REASON_OPTIONS.map((reason, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.reasonOption,
                        selectedReason === reason && styles.selectedReasonOption
                      ]}
                      onPress={() => {
                        setSelectedReason(reason);
                        setShowReasonPicker(false);
                      }}
                    >
                      <Text style={[
                        styles.reasonOptionText,
                        selectedReason === reason && styles.selectedReasonOptionText
                      ]}>
                        {reason}
                      </Text>
                      {selectedReason === reason && (
                        <Ionicons name="checkmark" size={20} color="#007AFF" />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          </Modal>
        );
      };

      const validateForm = (): boolean => {
        if (!userCredentials.userid || !userCredentials.password) {
          Alert.alert('Authentication Error', 'User credentials not available. Please login again.');
          return false;
        }

        if (!departureTime.trim()) {
          Alert.alert('Validation Error', 'Please enter departure time');
          return false;
        }
        
        if (!validateTimeFormat(departureTime.trim())) {
          Alert.alert('Validation Error', 'Please enter time in correct format (e.g., 4:00 PM or 16:00)');
          return false;
        }
        
        if (!selectedReason) {
          Alert.alert('Validation Error', 'Please select a reason for early departure');
          return false;
        }
        
        return true;
      };

      const submitEarlyDepartureRequest = async () => {
        if (!validateForm()) return;
        
        setIsSubmitting(true);
        
        try {
          // Convert time to 24-hour format if needed
          let formattedTime = departureTime.trim();
          if (formattedTime.includes('AM') || formattedTime.includes('PM') || 
              formattedTime.includes('am') || formattedTime.includes('pm')) {
            formattedTime = convertTimeTo24Hour(formattedTime);
          }

          const requestData: EarlyDepartureRequestData = {
            userid: userCredentials.userid, // Now uses actual user credentials
            password: userCredentials.password, // Now uses actual user credentials
            date: formatDateForAPI(selectedDate),
            early_time: formattedTime,
            reason: selectedReason
          };

          // Create timeout promise
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Request timeout')), API_CONFIG.timeout)
          );

          console.log('Submitting early departure request for user:', userCredentials.userid);
          console.log('Request data:', { ...requestData, password: '[HIDDEN]' }); // Hide password in logs
          
          const fetchPromise = fetch(`${API_CONFIG.baseUrl}/flutter/early/create/`, {
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
              result.message || 'Early departure request submitted successfully!',
              [{ 
                text: 'OK', 
                onPress: () => {
                  // Reset form
                  setSelectedDate(new Date());
                  setDepartureTime('');
                  setSelectedReason('');
                  router.back();
                }
              }]
            );
          } else {
            // Handle API error response
            throw new Error(result.message || 'Request failed');
          }

        } catch (error) {
          console.error('Error submitting early departure request:', error);
          
          let errorMessage = 'An unexpected error occurred. Please try again.';
          
          if (error instanceof Error) {
            if (error.message === 'Request timeout') {
              errorMessage = 'Request timed out. Please check your internet connection and try again.';
            } else if (error.message.includes('Network request failed')) {
              errorMessage = 'Network connection failed. Please check your internet connection and try again.';
            } else if (error.message.includes('HTTP 401')) {
              errorMessage = 'Authentication failed. Please check your credentials and login again.';
            } else if (error.message.includes('HTTP 403')) {
              errorMessage = 'Access denied. You may not have permission to submit early departure requests.';
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
              { text: 'Retry', onPress: submitEarlyDepartureRequest },
              { text: 'Cancel', style: 'cancel' },
            ]
          );
        } finally {
          setIsSubmitting(false);
        }
      };

      // For testing purposes - simulate successful submission
      const submitEarlyDepartureRequestMock = async () => {
        if (!validateForm()) return;
        
        setIsSubmitting(true);
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        setIsSubmitting(false);
        
        Alert.alert(
          'Success (Mock)',
          `Early departure request submitted successfully for user: ${userCredentials.userid}! (This is a mock submission for testing)`,
          [{ 
            text: 'OK', 
            onPress: () => {
              setSelectedDate(new Date());
              setDepartureTime('');
              setSelectedReason('');
              router.back();
            }
          }]
        );
      };

      const handleClose = () => {
        const hasChanges = selectedReason !== '' || 
                          departureTime.trim() !== '' ||
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
              Please login to submit early departure requests.
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

          <Text style={styles.pageTitle}>EARLY REQUEST</Text>

          <ScrollView 
            style={styles.scrollView} 
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.form}>
              {/* Date Field */}
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Date *</Text>
                <TouchableOpacity 
                  style={styles.dateInput}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text style={styles.dateText}>{formatDate(selectedDate)}</Text>
                  <Ionicons name="calendar-outline" size={20} color="#007AFF" />
                </TouchableOpacity>
              </View>

              {/* Early Departure Time Field */}
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Early Departure Time *</Text>
                <TextInput
                  style={styles.textInput}
                  value={departureTime}
                  onChangeText={setDepartureTime}
                  placeholder="e.g., 4:00 PM or 16:00"
                  placeholderTextColor="#999"
                />
                <Text style={styles.helperText}>
                  Enter time in 12-hour format (4:00 PM) or 24-hour format (16:00)
                </Text>
              </View>

              {/* Reason Field */}
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Reason *</Text>
                <TouchableOpacity
                  style={styles.dropdownInput}
                  onPress={() => setShowReasonPicker(true)}
                >
                  <Text style={[styles.dropdownText, !selectedReason && styles.placeholderText]}>
                    {selectedReason || 'Select reason for early departure'}
                  </Text>
                  <Ionicons name="chevron-down-outline" size={20} color="#007AFF" />
                </TouchableOpacity>
              </View>

              {/* Action Buttons */}
              <View style={styles.actionContainer}>
                <TouchableOpacity
                  style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
                  onPress={submitEarlyDepartureRequest} // Using real API - change to submitEarlyDepartureRequestMock for testing
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
          {renderDatePicker(
            showDatePicker,
            selectedDate,
            handleDateChange,
            new Date(),
            "Select Date",
            () => setShowDatePicker(false)
          )}
          
          {/* Reason Picker */}
          {renderReasonPicker()}
        </View>
      );
    };

    export default EarlyDepartureRequest;

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
      helperText: {
        fontSize: 12,
        color: '#ccc',
        marginTop: 5,
        fontStyle: 'italic',
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
      placeholderText: {
        color: '#999',
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
      // Date Picker Modal Styles
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
      reasonPickerModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
      },
      reasonPickerModalContent: {
        backgroundColor: '#1a1a2e',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '70%',
        paddingBottom: Platform.OS === 'ios' ? 30 : 20,
      },
      reasonPickerHeader: {
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
      reasonOptionsContainer: {
        paddingHorizontal: 20,
        paddingTop: 10,
      },
      reasonOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 15,
        paddingHorizontal: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
      },
      selectedReasonOption: {
        backgroundColor: '#007AFF20',
      },
      reasonOptionText: {
        fontSize: 16,
        color: '#fff',
      },
      selectedReasonOptionText: {
        color: '#007AFF',
        fontWeight: '600',
      },
    });