/* eslint-disable prettier/prettier */
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlurView } from 'expo-blur';
import * as Location from 'expo-location';
import { useFocusEffect, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useCallback, useEffect, useState } from 'react';
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

interface AttendanceRecord {
  date: string;
  date_formatted: string;
  day: number;
  day_name: string;
  status: string;
  punch_in: string | null;
  punch_out: string | null;
  punch_in_time: string | null;
  punch_out_time: string | null;
  punch_in_location: string | null;
  punch_out_location: string | null;
  working_hours: string | null;
  verified: boolean;
  note: string;
  has_record: boolean;
}

interface MonthlyAttendanceResponse {
  success: boolean;
  employee_name: string;
  month: number;
  year: number;
  month_name: string;
  summary: {
    total_days_in_month: number;
    total_attendance_records: number;
    present_days: number;
    full_days: number;
    half_days: number;
    leave_days: number;
    absent_days: number;
    no_record_days: number;
    total_working_hours: string;
    attendance_percentage: number;
  };
  attendance_records: AttendanceRecord[];
}

interface TodayStatus {
  date: string;
  punchIn: {
    time: string;
    location: string;
  } | null;
  punchOut: {
    time: string;
    location: string;
  } | null;
  totalHours: string;
  status: string;
  verified: boolean;
}

const Punch = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isBreakLoading, setIsBreakLoading] = useState(false);
  const [todayStatus, setTodayStatus] = useState<TodayStatus | null>(null);
  const [attendanceId, setAttendanceId] = useState<string | null>(null);
  const [currentLocation, setCurrentLocation] = useState<any>(null);
  const [locationAddress, setLocationAddress] = useState<any>(null);
  const [userCredentials, setUserCredentials] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Break punch state
  const [breakStatus, setBreakStatus] = useState<any>(null);
  const [currentBreakId, setCurrentBreakId] = useState<string | null>(null);
  const [breakHistory, setBreakHistory] = useState<any[]>([]);
  const [showBreakHistory, setShowBreakHistory] = useState(false);

  /* ---------- loading overlay states ---------- */
  const [loadingTab, setLoadingTab] = useState<string | null>(null);

  useEffect(() => {
    getCurrentLocation();
    getUserCredentials();
  }, []);

  useEffect(() => {
    if (userCredentials?.userId) {
      loadTodayStatus();
      loadBreakStatus();
      loadBreakHistory();
      const interval = setInterval(refreshBreakStatus, 30000);
      return () => clearInterval(interval);
    }
  }, [userCredentials]);

  useFocusEffect(
    useCallback(() => {
      if (userCredentials?.userId) refreshBreakStatus();
    }, [userCredentials])
  );

  const getTodayDateString = () => new Date().toISOString().split('T')[0];
  const getUserSpecificKey = (baseKey: string) =>
    userCredentials?.userId ? `${baseKey}_${userCredentials.userId}` : baseKey;

  const fetchTodayStatusFromAPI = async () => {
    if (!userCredentials?.userId || !userCredentials?.password) return null;
    
    try {
      const currentDate = new Date();
      const month = currentDate.getMonth() + 1;
      const year = currentDate.getFullYear();
      const todayDateString = getTodayDateString();

      const response = await fetch(
        `https://myimc.in/flutter/attendance/monthly/?userid=${userCredentials.userId}&password=${userCredentials.password}&month=${month}&year=${year}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        const data: MonthlyAttendanceResponse = await response.json();
        
        if (data.success) {
          const todayRecord = data.attendance_records.find(
            record => record.date === todayDateString
          );

          if (todayRecord) {
            // Map the attendance record to TodayStatus format
            const todayData: TodayStatus = {
              date: todayRecord.date,
              punchIn: todayRecord.punch_in ? {
                time: todayRecord.punch_in,
                location: todayRecord.punch_in_location || 'N/A'
              } : null,
              punchOut: todayRecord.punch_out ? {
                time: todayRecord.punch_out,
                location: todayRecord.punch_out_location || 'N/A'
              } : null,
              totalHours: todayRecord.working_hours || '0h 0m',
              status: todayRecord.status,
              verified: todayRecord.verified
            };
            
            return todayData;
          } else {
            // No record for today - set default status
            return {
              date: todayDateString,
              punchIn: null,
              punchOut: null,
              totalHours: '0h 0m',
              status: 'no_record',
              verified: false
            };
          }
        }
      }
    } catch (error) {
      console.error('Error fetching today status from API:', error);
    }
    
    return null;
  };

  const loadTodayStatus = async () => {
    if (!userCredentials?.userId) return;
    
    // Load local data first
    const key = getUserSpecificKey(`punch_data_${getTodayDateString()}`);
    const raw = await AsyncStorage.getItem(key);
    const localData = raw ? JSON.parse(raw) : {};
    
    // Fetch API data
    const apiData = await fetchTodayStatusFromAPI();
    
    // Merge local and API data, giving priority to API data
    let mergedData = { ...localData };
    
    if (apiData) {
      if (apiData.punchIn && !mergedData.punchIn) {
        mergedData.punchIn = apiData.punchIn;
      }
      if (apiData.punchOut && !mergedData.punchOut) {
        mergedData.punchOut = apiData.punchOut;
      }
      // Set other properties from API
      mergedData.totalHours = apiData.totalHours;
      mergedData.status = apiData.status;
      mergedData.verified = apiData.verified;
      mergedData.date = apiData.date;
    }
    
    console.log('Merged Today Status:', mergedData);
    setTodayStatus(mergedData);
    
    const attendanceKey = getUserSpecificKey('current_attendance_id');
    setAttendanceId(await AsyncStorage.getItem(attendanceKey));
  };

  const loadBreakStatus = async () => {
    if (!userCredentials?.userId) return;
    await fetchBreakStatusFromServer();
  };

  const loadBreakHistory = async () => {
    if (!userCredentials?.userId) return;
    const historyKey = getUserSpecificKey(`break_history_${getTodayDateString()}`);
    const storedHistory = await AsyncStorage.getItem(historyKey);
    if (storedHistory) setBreakHistory(JSON.parse(storedHistory));
  };

  const saveBreakToHistory = async (breakData: any) => {
    if (!userCredentials?.userId) return;
    const historyKey = getUserSpecificKey(`break_history_${getTodayDateString()}`);
    const currentHistory = await AsyncStorage.getItem(historyKey);
    let history = currentHistory ? JSON.parse(currentHistory) : [];
    
    // Only save breaks that have valid break_id and are completed (have break_punch_out)
    if (breakData.break_id && breakData.break_punch_out) {
      const existingIndex = history.findIndex(
        (item: any) => item.break_id === breakData.break_id
      );
      
      if (existingIndex >= 0) {
        // Update existing break record
        history[existingIndex] = {
          ...history[existingIndex],
          ...breakData,
          timestamp: new Date().toISOString(),
        };
      } else {
        // Add new completed break record
        history.push({ 
          ...breakData, 
          timestamp: new Date().toISOString() 
        });
      }
      
      // Sort by timestamp (newest first)
      history.sort(
        (a: any, b: any) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      
      await AsyncStorage.setItem(historyKey, JSON.stringify(history));
      setBreakHistory(history);
    }
  };

  const fetchBreakStatusFromServer = async () => {
    if (!userCredentials?.userId || !userCredentials?.password) {
      console.log('Cannot fetch break status: Missing credentials');
      return;
    }
    
    console.log('=== FETCHING BREAK STATUS FROM SERVER ===');
    console.log('User ID:', userCredentials.userId);
    
    try {
      const response = await fetch('https://myimc.in/flutter/break-status/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userid: userCredentials.userId,
          password: userCredentials.password,
        }),
      });
      
      console.log('Break status API response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('=== BREAK STATUS API RESPONSE ===');
        console.log('Full break status data:', JSON.stringify(data, null, 2));
        console.log('Break ID:', data.break_id);
        console.log('Has active break:', data.has_active_break);
        console.log('Break punch in:', data.break_punch_in);
        console.log('Break punch out:', data.break_punch_out);
        console.log('Current break in:', data.current_break_in);
        console.log('Total breaks today:', data.total_breaks_today);
        
        // Enhanced debugging for break status
        if (data.has_active_break && !data.break_punch_in && !data.current_break_in) {
          console.warn('WARNING: has_active_break is true but no punch in time found');
        }
        
        if (data.has_active_break && data.break_punch_out) {
          console.warn('WARNING: has_active_break is true but break_punch_out exists');
        }
        
        setBreakStatus(data);
        const breakStatusKey = getUserSpecificKey(`break_status_${getTodayDateString()}`);
        await AsyncStorage.setItem(breakStatusKey, JSON.stringify(data));
        console.log('Saved break status to AsyncStorage');
        
        const breakIdKey = getUserSpecificKey('current_break_id');
        
        // More accurate break ID management
        const hasRealActiveBreak = data.has_active_break && 
                                  (data.break_punch_in || data.current_break_in) && 
                                  !data.break_punch_out;
        
        if (data.break_id && hasRealActiveBreak) {
          // Only set break ID if break is truly active
          await AsyncStorage.setItem(breakIdKey, data.break_id.toString());
          setCurrentBreakId(data.break_id.toString());
          console.log('Set active break ID:', data.break_id);
        } else {
          // Clear break ID if no active break
          await AsyncStorage.removeItem(breakIdKey);
          setCurrentBreakId(null);
          console.log('Cleared break ID - no active break');
        }
        
        // Only save to history if break is completed (has break_punch_out)
        if (data.break_punch_out) {
          console.log('Saving completed break to history');
          await saveBreakToHistory(data);
        } else {
          console.log('Break not completed yet, not saving to history');
        }
      } else {
        console.error('Break status API failed with status:', response.status);
        const errorText = await response.text();
        console.error('Error response:', errorText);
      }
    } catch (error) {
      console.error('=== BREAK STATUS FETCH ERROR ===');
      console.error('Error fetching break status:', error);
    }
  };

  const refreshBreakStatus = async () => {
    if (userCredentials?.userId && userCredentials?.password) {
      await fetchBreakStatusFromServer();
    }
  };

  const getCurrentLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return;
    const loc = await Location.getCurrentPositionAsync({});
    setCurrentLocation(loc);
    const [addr] = await Location.reverseGeocodeAsync(loc.coords);
    setLocationAddress({
      city: addr?.city || '',
      fullAddress: `${addr?.street || ''}, ${addr?.city || ''}`,
      state: addr?.region || '',
    });
  };

  const getUserCredentials = async () => {
    try {
      const [uid, pwd] = await Promise.all([
        SecureStore.getItemAsync('userId'),
        SecureStore.getItemAsync('password'),
      ]);
      
      console.log('=== PUNCH CREDENTIAL CHECK ===');
      console.log('UserID:', uid);
      console.log('Password length:', pwd ? pwd.length : 'null');
      console.log('===============================');
      
      if (uid && pwd) {
        setUserCredentials({ userId: uid, password: pwd });
        console.log('Credentials set successfully in punch component');
      } else {
        console.log('No credentials found, redirecting to login');
        Alert.alert(
          'Authentication Required',
          'Please login to continue',
          [
            {
              text: 'OK',
              onPress: () => router.replace('/login')
            }
          ]
        );
      }
    } catch (error) {
      console.error('Error getting user credentials:', error);
      Alert.alert(
        'Error',
        'Unable to retrieve login credentials. Please login again.',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/login')
          }
        ]
      );
    }
  };

  const makeApiCall = async (url: string, data: any) => {
    console.log('Making API call to:', url);
    console.log('With data:', { ...data, password: '[PASSWORD]' });
    
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      console.log('API Response Status:', res.status);
      
      if (res.status === 401) {
        console.error('Authentication failed - 401 error');
        Alert.alert(
          'Authentication Error', 
          'Your login session has expired. Please login again.',
          [
            {
              text: 'OK',
              onPress: async () => {
                // Clear invalid credentials
                await SecureStore.deleteItemAsync('userId');
                await SecureStore.deleteItemAsync('password');
                router.replace('/login');
              }
            }
          ]
        );
        throw new Error('Authentication failed');
      }
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error('API Error:', res.status, errorText);
        throw new Error(`API Error: ${res.status} - ${errorText}`);
      }
      
      const result = await res.json();
      console.log('API call successful');
      return result;
    } catch (error) {
      console.error('API call failed:', error);
      throw error;
    }
  };

  const savePunchData = async (type: 'in' | 'out', data: any) => {
    if (!userCredentials?.userId) return;
    const key = getUserSpecificKey(`punch_data_${getTodayDateString()}`);
    let record = JSON.parse((await AsyncStorage.getItem(key)) || '{}');
    const now = new Date().toISOString();
    if (type === 'in') record.punchIn = { time: now, ...data };
    else record.punchOut = { time: now, ...data };
    await AsyncStorage.setItem(key, JSON.stringify(record));
    setTodayStatus(record);
    return record;
  };

  // Updated handlePunch with confirmation dialog
  const handlePunch = async (type: 'in' | 'out') => {
    if (!userCredentials || !currentLocation) return;
    
    // Show confirmation dialog
    const confirmationTitle = type === 'in' ? 'Punch In Confirmation' : 'Punch Out Confirmation';
    const confirmationMessage = type === 'in' 
      ? 'Are you sure you want to punch in for today?' 
      : 'Are you sure you want to punch out for today?';
    
    Alert.alert(
      confirmationTitle,
      confirmationMessage,
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => {
            console.log(`${type === 'in' ? 'Punch In' : 'Punch Out'} cancelled`);
          }
        },
        {
          text: 'Confirm',
          style: 'default',
          onPress: () => {
            performPunch(type);
          }
        }
      ],
      { cancelable: true }
    );
  };

  // Separate function to perform the actual punch operation
  const performPunch = async (type: 'in' | 'out') => {
    if (!userCredentials) {
      Alert.alert('Error', 'User credentials not found. Please login again.');
      return;
    }
    
    if (!currentLocation) {
      Alert.alert('Error', 'Location not available. Please enable location services.');
      return;
    }
    
    console.log(`Starting ${type} punch operation`);
    setIsLoading(true);
    
    try {
      const payload = {
        userid: userCredentials.userId,
        password: userCredentials.password,
        location: locationAddress?.city || '',
        latitude: currentLocation.coords.latitude.toString(),
        longitude: currentLocation.coords.longitude.toString(),
        enhanced_location: JSON.stringify(locationAddress),
      };
      
      console.log(`Punch ${type} payload:`, { 
        ...payload, 
        password: '[PASSWORD]' 
      });
      
      const endpoint = type === 'in'
        ? 'https://myimc.in/flutter/punch-in/'
        : 'https://myimc.in/flutter/punch-out/';
      
      const res = await makeApiCall(endpoint, payload);
      console.log(`Punch ${type} response:`, res);
      
      // Handle attendance ID
      if (res.attendance?.id) {
        setAttendanceId(res.attendance.id.toString());
        const attendanceKey = getUserSpecificKey('current_attendance_id');
        await AsyncStorage.setItem(attendanceKey, res.attendance.id.toString());
        console.log('Attendance ID saved:', res.attendance.id);
      } else if (type === 'out') {
        const attendanceKey = getUserSpecificKey('current_attendance_id');
        await AsyncStorage.removeItem(attendanceKey);
        setAttendanceId(null);
        console.log('Attendance ID cleared for punch out');
      }
      
      // Save punch data locally
      await savePunchData(type, payload);
      
      Alert.alert('Success', `Punch ${type === 'in' ? 'In' : 'Out'} successful!`);
      
      // Force refresh home screen
      const refreshKey = getUserSpecificKey('force_home_refresh');
      await AsyncStorage.setItem(refreshKey, Date.now().toString());
      
      console.log(`Punch ${type} completed successfully`);
      
    } catch (error: any) {
      console.error(`Punch ${type} error:`, error);
      Alert.alert('Error', `Failed to punch ${type}: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }

  // FIXED: More accurate function to check if user can start a break
  const canStartBreak = () => {
    console.log('Checking break eligibility:', {
      hasPunchIn: !!todayStatus?.punchIn,
      hasPunchOut: !!todayStatus?.punchOut,
      status: todayStatus?.status,
      hasActiveBreak: breakStatus?.has_active_break,
      currentBreakId: currentBreakId,
      breakPunchIn: breakStatus?.break_punch_in,
      breakPunchOut: breakStatus?.break_punch_out,
      currentBreakIn: breakStatus?.current_break_in
    });

    // Must have punched in at least once
    if (!todayStatus?.punchIn) {
      console.log('Cannot start break: No punch in recorded');
      return false;
    }
    
    // Check if there's truly an active break:
    // An active break means:
    // 1. has_active_break is true AND
    // 2. there's a break_punch_in or current_break_in time AND 
    // 3. there's NO break_punch_out time
    const hasRealActiveBreak = breakStatus?.has_active_break && 
                              (breakStatus?.break_punch_in || breakStatus?.current_break_in) && 
                              !breakStatus?.break_punch_out;
    
    if (hasRealActiveBreak || currentBreakId) {
      console.log('Cannot start break: Already have an active break');
      return false;
    }
    
    console.log('Break is allowed');
    return true;
  };

  // Updated handleBreakPunch function with enhanced debugging
  const handleBreakPunch = async (type: 'in' | 'out') => {
    console.log(`=== BREAK ${type.toUpperCase()} ATTEMPT ===`);
    console.log('User credentials:', { 
      userId: userCredentials?.userId, 
      hasPassword: !!userCredentials?.password 
    });
    console.log('Current break status:', breakStatus);
    console.log('Current break ID:', currentBreakId);
    console.log('Can start break:', canStartBreak());
    
    if (!userCredentials?.userId || !userCredentials?.password) {
      console.log('ERROR: Missing credentials');
      Alert.alert('Error', 'User credentials not found');
      return;
    }

    // Additional validation for break in
    if (type === 'in' && !canStartBreak()) {
      const message = !todayStatus?.punchIn 
        ? 'Please punch in first before starting a break'
        : (breakStatus?.has_active_break && (breakStatus?.break_punch_in || breakStatus?.current_break_in) && !breakStatus?.break_punch_out) || currentBreakId
        ? 'You already have an active break'
        : 'Break is not available at this time';
      
      console.log('ERROR: Break validation failed:', message);
      Alert.alert('Break Not Available', message);
      return;
    }

    setIsBreakLoading(true);
    
    try {
      const payload = {
        userid: userCredentials.userId,
        password: userCredentials.password,
      };
      
      console.log(`Starting break ${type} operation with payload:`, {
        userid: payload.userid,
        password: '[HIDDEN]'
      });
      
      const endpoint = type === 'in'
        ? 'https://myimc.in/flutter/break-punch-in/'
        : 'https://myimc.in/flutter/break-punch-out/';
        
      console.log('Making API call to:', endpoint);
      
      const response = await makeApiCall(endpoint, payload);
      
      console.log(`=== BREAK ${type.toUpperCase()} API RESPONSE ===`);
      console.log('Full response:', JSON.stringify(response, null, 2));
      console.log('Response type:', typeof response);
      console.log('Response keys:', response ? Object.keys(response) : 'null');
      
      if (response) {
        // Update break status immediately
        console.log('Updating break status with response');
        setBreakStatus(response);
        
        const breakStatusKey = getUserSpecificKey(`break_status_${getTodayDateString()}`);
        await AsyncStorage.setItem(breakStatusKey, JSON.stringify(response));
        console.log('Saved break status to AsyncStorage');
        
        const breakIdKey = getUserSpecificKey('current_break_id');
        
        if (type === 'in') {
          console.log('Processing break IN response');
          console.log('Response break_id:', response.break_id);
          console.log('Response break_punch_in:', response.break_punch_in);
          console.log('Response current_break_in:', response.current_break_in);
          console.log('Response has_active_break:', response.has_active_break);
          
          // Break punch in success
          if (response.break_id) {
            await AsyncStorage.setItem(breakIdKey, response.break_id.toString());
            setCurrentBreakId(response.break_id.toString());
            console.log('Set current break ID:', response.break_id);
            
            // Check multiple possible time fields
            const breakTime = response.break_punch_in || response.current_break_in || response.break_in_time;
            console.log('Break time found:', breakTime);
            
            const message = breakTime 
              ? `Break started at ${formatTime(breakTime)}`
              : 'Break started successfully';
            Alert.alert('Success', message);
          } else {
            console.log('ERROR: No break ID in response');
            console.log('Response structure:', response);
            throw new Error('No break ID received from server');
          }
        } else {
          console.log('Processing break OUT response');
          // Break punch out success
          await AsyncStorage.removeItem(breakIdKey);
          setCurrentBreakId(null);
          console.log('Cleared break ID');
          
          const message = response.duration 
            ? `Break ended. Duration: ${response.duration}`
            : 'Break ended successfully';
          Alert.alert('Success', message);
          
          // Save completed break to history
          if (response.break_punch_out) {
            console.log('Saving break to history');
            await saveBreakToHistory(response);
          }
        }
        
        // Refresh break status after a short delay
        console.log('Scheduling break status refresh');
        setTimeout(async () => {
          console.log('Refreshing break status from server');
          await fetchBreakStatusFromServer();
        }, 1000);
        
        // Force refresh home screen
        const refreshKey = getUserSpecificKey('force_home_refresh');
        await AsyncStorage.setItem(refreshKey, Date.now().toString());
        console.log('Set home refresh flag');
        
      } else {
        console.log('ERROR: Empty response from server');
        throw new Error('No response received from server');
      }
    } catch (error: any) {
      console.error(`=== BREAK ${type.toUpperCase()} ERROR ===`);
      console.error('Error details:', error);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      
      // Provide more specific error messages
      let errorMessage = `Failed to record break ${type}`;
      
      if (error.message.includes('401')) {
        errorMessage = 'Session expired. Please login again.';
      } else if (error.message.includes('Network')) {
        errorMessage = 'Network error. Please check your connection.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      console.log(`Break ${type} operation finished, stopping loading`);
      setIsBreakLoading(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Promise.all([
      loadTodayStatus(),
      refreshBreakStatus()
    ]).finally(() => setRefreshing(false));
  }, [userCredentials]);

  /* ---------- Instagram-style navigation ---------- */
  const handleTabNavigation = async (route: string) => {
    if (loadingTab) return;
    setLoadingTab(route);
    await new Promise((res) => setTimeout(res, 300));
    router.push(`/${route}`);
    setLoadingTab(null);
  };

  // FIXED formatTime function to handle different time formats
  const formatTime = (timeString?: string) => {
    if (!timeString) return 'Not recorded';
    
    try {
      // Handle different time formats
      let date;
      
      // If it's just a time string like "11:37:08"
      if (/^\d{2}:\d{2}:\d{2}$/.test(timeString)) {
        const today = new Date().toISOString().split('T')[0];
        date = new Date(`${today}T${timeString}`);
      } 
      // If it's already a full ISO string
      else if (timeString.includes('T') || timeString.includes('Z')) {
        date = new Date(timeString);
      }
      // If it's a date string
      else {
        date = new Date(timeString);
      }
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return timeString; // Return original if can't parse
      }
      
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch (error) {
      console.error('Error formatting time:', error);
      return timeString; // Return original if error
    }
  };

  const formatLocation = (location: string | null): string => {
    if (!location) return 'N/A';
    return location;
  };

  const getWorkingStatus = () => {
    if (!todayStatus) return 'No data';
    
    switch (todayStatus.status) {
      case 'verified_full':
        return 'Work completed (Full day)';
      case 'verified_half':
        return 'Work completed (Half day)';
      case 'present':
        if (todayStatus.punchIn && !todayStatus.punchOut) {
          return 'Currently working';
        }
        return 'Present';
      case 'absent':
        return 'Absent';
      case 'leave':
        return 'On leave';
      case 'no_record':
        return 'No record';
      default:
        if (todayStatus.punchIn && !todayStatus.punchOut) {
          return 'Currently working';
        } else if (todayStatus.punchIn && todayStatus.punchOut) {
          return 'Work completed';
        }
        return 'Not started';
    }
  };

  const getStatusColor = () => {
    if (!todayStatus) return '#6c757d';
    
    switch (todayStatus.status) {
      case 'verified_full':
        return '#28a745';
      case 'verified_half':
        return '#ffc107';
      case 'present':
        return todayStatus.punchOut ? '#007bff' : '#28a745';
      case 'absent':
        return '#dc3545';
      case 'leave':
        return '#17a2b8';
      case 'no_record':
        return '#6c757d';
      default:
        if (todayStatus.punchIn && !todayStatus.punchOut) {
          return '#28a745';
        } else if (todayStatus.punchIn && todayStatus.punchOut) {
          return '#007bff';
        }
        return '#6c757d';
    }
  };

  // FIXED: Better break status text with accurate timing
  const getBreakStatusText = () => {
    if (!breakStatus) return 'Break not started';
    
    // Check if truly in progress
    const isReallyActive = breakStatus.has_active_break && 
                          (breakStatus.break_punch_in || breakStatus.current_break_in) && 
                          !breakStatus.break_punch_out;
    
    if (isReallyActive) {
      const startTime = formatTime(breakStatus.break_punch_in || breakStatus.current_break_in);
      return `Break in progress since ${startTime}`;
    }
    
    if (breakStatus.total_breaks_today > 0) {
      return `Break completed (${breakStatus.total_breaks_today} breaks today)`;
    }
    
    return 'Break not started';
  };

  // FIXED: More accurate break progress detection
  const isBreakInProgress = () => {
    if (!breakStatus) return false;
    
    // A break is truly in progress if:
    // 1. has_active_break is true AND
    // 2. there's a break_punch_in or current_break_in time AND 
    // 3. there's NO break_punch_out time
    const inProgress = breakStatus.has_active_break === true && 
                       (breakStatus.break_punch_in || breakStatus.current_break_in) && 
                       !breakStatus.break_punch_out;
    
    console.log('Break in progress check:', {
      hasActive: breakStatus.has_active_break,
      hasPunchIn: !!(breakStatus.break_punch_in || breakStatus.current_break_in),
      hasPunchOut: !!breakStatus.break_punch_out,
      result: inProgress
    });
    
    return inProgress;
  };

  const isPunchedIn = () => {
    const hasPunchIn = !!(todayStatus?.punchIn);
    const hasPunchOut = !!(todayStatus?.punchOut);
    
    console.log('Checking punch in status:', {
      todayStatus,
      hasPunchIn,
      hasPunchOut,
      result: hasPunchIn && !hasPunchOut
    });
    
    return hasPunchIn && !hasPunchOut;
  };

  const isPunchedOut = () => {
    console.log('Checking punch out status:', {
      todayStatus,
      hasPunchIn: !!todayStatus?.punchIn,
      hasPunchOut: !!todayStatus?.punchOut
    });
    return todayStatus?.punchIn && todayStatus?.punchOut;
  };

  return (
    <View style={styles.container}>
      {/* ---------- loading overlay ---------- */}
      {loadingTab && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingOverlayTxt}>Loading…</Text>
        </View>
      )}

      {/* Back Icon */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Center Title */}
      <Text style={styles.pageTitle}>ATTENDANCE</Text>

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ffffff" />
        }
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Today's Status Card */}
        <BlurView intensity={90} tint="light" style={styles.todayStatusCard}>
          <View style={styles.transparentCardContent}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Today's Status</Text>
              <TouchableOpacity style={styles.statusIndicator} onPress={onRefresh}>
                <Ionicons name="refresh-circle" size={24} color="#4CAF50" />
              </TouchableOpacity>
            </View>
            <Text style={styles.dateText}>
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </Text>
            <View style={styles.statusContainer}>
              <View style={styles.statusRow}>
                <View style={styles.statusLeft}>
                  <Ionicons name="log-in" size={16} color="#4CAF50" />
                  <Text style={styles.statusLabel}>Punch In:</Text>
                </View>
                <Text style={styles.statusValue}>
                  {todayStatus?.punchIn ? formatTime(todayStatus.punchIn.time) : 'Not recorded'}
                </Text>
              </View>
              <View style={styles.statusRow}>
                <View style={styles.statusLeft}>
                  <Ionicons name="location" size={16} color="#4CAF50" />
                  <Text style={styles.statusLabel}>Punch In Location:</Text>
                </View>
                <Text style={[styles.statusValue, styles.locationValue]}>
                  {todayStatus?.punchIn ? formatLocation(todayStatus.punchIn.location) : 'N/A'}
                </Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.statusRow}>
                <View style={styles.statusLeft}>
                  <Ionicons name="log-out" size={16} color="#F44336" />
                  <Text style={styles.statusLabel}>Punch Out:</Text>
                </View>
                <Text style={styles.statusValue}>
                  {todayStatus?.punchOut ? formatTime(todayStatus.punchOut.time) : 'Not punched out yet'}
                </Text>
              </View>
              <View style={styles.statusRow}>
                <View style={styles.statusLeft}>
                  <Ionicons name="location" size={16} color="#F44336" />
                  <Text style={styles.statusLabel}>Punch Out Location:</Text>
                </View>
                <Text style={[styles.statusValue, styles.locationValue]}>
                  {todayStatus?.punchOut ? formatLocation(todayStatus.punchOut.location) : 'Not punched out yet'}
                </Text>
              </View>
              
              {/* Verification Status */}
              {todayStatus?.verified && (
                <View style={styles.statusRow}>
                  <View style={styles.statusLeft}>
                    <Ionicons name="checkmark-circle" size={16} color="#28a745" />
                    <Text style={styles.statusLabel}>Verified:</Text>
                  </View>
                  <Text style={[styles.statusValue, { color: '#28a745', fontWeight: 'bold' }]}>
                    Yes
                  </Text>
                </View>
              )}
              
              <View style={styles.workingStatusContainer}>
                <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
                <Text style={[styles.workingStatus, { color: getStatusColor() }]}>
                  {getWorkingStatus()}
                </Text>
              </View>
            </View>
          </View>
        </BlurView>

        {/* Main Attendance Punch */}
        <View style={styles.card}>
          <View style={styles.mainButtonRow}>
            <TouchableOpacity
              style={[
                styles.mainBtn, 
                styles.mainInBtn,
                isPunchedIn() && styles.disabledMainBtn
              ]}
              onPress={() => handlePunch('in')}
              disabled={isLoading || isBreakLoading || isPunchedIn()}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons 
                    name="log-in-outline" 
                    size={20} 
                    color={isPunchedIn() ? "#999" : "#fff"} 
                  />
                  <Text style={[
                    styles.btnText,
                    isPunchedIn() && styles.disabledBtnText
                  ]}>
                    Punch In
                  </Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.mainBtn, 
                styles.mainOutBtn,
                (!isPunchedIn() || isPunchedOut()) && styles.disabledMainBtn
              ]}
              onPress={() => handlePunch('out')}
              disabled={isLoading || isBreakLoading || !isPunchedIn() || isPunchedOut()}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons 
                    name="log-out-outline" 
                    size={20} 
                    color={(!isPunchedIn() || isPunchedOut()) ? "#999" : "#fff"} 
                  />
                  <Text style={[
                    styles.btnText,
                    (!isPunchedIn() || isPunchedOut()) && styles.disabledBtnText
                  ]}>
                    Punch Out
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Break Punch Card - FIXED Logic */}
        <View style={styles.breakCard}>
          <Text style={styles.breakHeading}>BREAK PUNCH TIME</Text>
          
          {/* UPDATED Break Time Row to show proper times */}
          <View style={styles.timeRow}>
            <Text style={styles.timeLabel}>
              In: {(() => {
                // Check for break times from the API data
                if (breakStatus?.breaks_today?.length > 0) {
                  const activeBreak = breakStatus.breaks_today.find((b: any) => b.is_active);
                  if (activeBreak?.punch_in) {
                    return formatTime(activeBreak.punch_in);
                  }
                }
                
                // Fallback to current break data
                const breakInTime = breakStatus?.break_punch_in || breakStatus?.current_break_in;
                return breakInTime ? formatTime(breakInTime) : 'Not started';
              })()}
            </Text>
            <Text style={styles.timeLabel}>
              Out: {(() => {
                // Check for break times from the API data
                if (breakStatus?.breaks_today?.length > 0) {
                  const activeBreak = breakStatus.breaks_today.find((b: any) => b.is_active);
                  if (activeBreak?.punch_out) {
                    return formatTime(activeBreak.punch_out);
                  }
                  if (activeBreak?.is_active) {
                    return 'In progress...';
                  }
                }
                
                // Fallback to current break data
                if (breakStatus?.break_punch_out) {
                  return formatTime(breakStatus.break_punch_out);
                }
                
                return isBreakInProgress() ? 'In progress...' : 'Not started';
              })()}
            </Text>
          </View>
          
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[
                styles.btn,
                styles.inBtn,
                (isBreakInProgress() || !canStartBreak()) && styles.disabledBtn,
              ]}
              onPress={() => handleBreakPunch('in')}
              disabled={isBreakLoading || isBreakInProgress() || !canStartBreak()}
            >
              {isBreakLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="log-in-outline" size={20} color="#fff" />
                  <Text style={styles.btnText}>Break In</Text>
                </>
              )}
            </TouchableOpacity>
            <View style={styles.buttonSeparator} />
            <TouchableOpacity
              style={[
                styles.btn,
                styles.outBtn,
                !isBreakInProgress() && styles.disabledBtn,
              ]}
              onPress={() => handleBreakPunch('out')}
              disabled={isBreakLoading || !isBreakInProgress()}
            >
              {isBreakLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="log-out-outline" size={20} color="#fff" />
                  <Text style={styles.btnText}>Break Out</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
          <Text style={styles.breakStatus}>{getBreakStatusText()}</Text>
          {!canStartBreak() && (
            <Text style={styles.breakWarning}>
              {!todayStatus?.punchIn ? 'Please punch in first to start break' : 
               (breakStatus?.has_active_break && (breakStatus?.break_punch_in || breakStatus?.current_break_in) && !breakStatus?.break_punch_out) || currentBreakId ? 'You already have an active break' : 
               'Break not available'}
            </Text>
          )}
          
          {/* Break History Toggle */}
          <TouchableOpacity
            style={styles.historyToggle}
            onPress={() => setShowBreakHistory(!showBreakHistory)}
          >
            <Text style={styles.historyToggleText}>
              {showBreakHistory ? 'Hide Break History' : 'Show Break History'}
            </Text>
            <Ionicons
              name={showBreakHistory ? 'chevron-up' : 'chevron-down'}
              size={16}
              color="#007bff"
            />
          </TouchableOpacity>
          
          {/* UPDATED Break History Item Component */}
          {showBreakHistory && (
            <View style={styles.historyContainer}>
              <Text style={styles.historyTitle}>Today's Break History</Text>
              {(breakStatus?.breaks_today?.length > 0 ? breakStatus.breaks_today : breakHistory).length === 0 ? (
                <Text style={styles.noHistoryText}>No break history for today</Text>
              ) : (
                (breakStatus?.breaks_today || breakHistory).map((breakItem: any, index: number) => (
                  <View key={breakItem.break_id || index} style={styles.historyItem}>
                    <View style={styles.historyHeader}>
                      <Text style={styles.historyBreakId}>Break #{breakItem.break_id}</Text>
                      <Text style={styles.historyDate}>
                        {new Date().toLocaleDateString()}
                      </Text>
                    </View>
                    <View style={styles.historyTimes}>
                      <Text style={styles.historyTime}>
                        <Text style={styles.historyLabel}>In:</Text> {formatTime(breakItem.punch_in)}
                      </Text>
                      <Text style={styles.historyTime}>
                        <Text style={styles.historyLabel}>Out:</Text> {formatTime(breakItem.punch_out)}
                      </Text>
                    </View>
                    {breakItem.duration && (
                      <Text style={styles.historyDuration}>Duration: {breakItem.duration}</Text>
                    )}
                    <View style={styles.historyStatus}>
                      <Text
                        style={[
                          styles.historyStatusText,
                          breakItem.punch_out || !breakItem.is_active
                            ? styles.completedStatus
                            : styles.activeStatus,
                        ]}
                      >
                        {breakItem.punch_out || !breakItem.is_active ? 'Completed' : 'Active'}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          )}
        </View>
      </ScrollView>

      
    </View>
  );
};

const styles = StyleSheet.create({
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
    zIndex: 999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingOverlayTxt: { color: '#fff', marginTop: 8 },
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    paddingTop: 50,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 20,
  },
  scrollContainer: {
    paddingBottom: 150,
  },
  // Today's Status Card Styles
  todayStatusCard: {
    margin: 20,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  transparentCardContent: {
    paddingVertical: 25,
    paddingHorizontal: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: { fontSize: 22, fontWeight: 'bold', color: '#1a1a1a' },
  statusIndicator: { padding: 4 },
  dateText: { fontSize: 14, color: '#666', marginBottom: 20, fontWeight: '500' },
  statusContainer: {
    backgroundColor: 'rgba(248, 250, 252, 0.8)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.8)',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    minHeight: 32,
  },
  statusLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  statusLabel: { fontSize: 14, color: '#374151', fontWeight: '500', marginLeft: 8 },
  statusValue: { fontSize: 14, color: '#1f2937', fontWeight: '600', textAlign: 'right', flex: 1 },
  locationValue: { fontSize: 12, color: '#6b7280', textDecorationLine: 'underline' },
  divider: { height: 1, backgroundColor: 'rgba(229, 231, 235, 0.8)', marginVertical: 12 },
  workingStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: 'rgba(229, 231, 235, 0.6)',
  },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  workingStatus: { fontSize: 14, fontWeight: '600' },
  
  // Main Punch Card Styles
  card: {
    backgroundColor: '#f5f0f0ff',
    margin: 20,
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  mainButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 15,
  },
  mainBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 10,
    gap: 8,
  },
  mainInBtn: { backgroundColor: '#4CAF50' },
  mainOutBtn: { backgroundColor: '#f44336' },
  disabledMainBtn: { 
    backgroundColor: '#ccc', 
    opacity: 0.6 
  },
  disabledBtnText: { 
    color: '#999' 
  },
  
  // Break Card Styles
  breakCard: {
    backgroundColor: '#f4f0f0ff',
    margin: 20,
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    marginBottom: 20,
  },
  breakHeading: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
    marginBottom: 15,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  timeLabel: { color: '#333', fontSize: 14, fontWeight: '500' },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  inBtn: { backgroundColor: '#4CAF50' },
  outBtn: { backgroundColor: '#f44336' },
  disabledBtn: { backgroundColor: '#ccc', opacity: 0.6 },
  buttonSeparator: { width: 15 },
  btnText: { color: '#fff', fontSize: 14, fontWeight: '500' },
  breakStatus: {
    textAlign: 'center',
    color: '#666',
    fontSize: 12,
    fontStyle: 'italic',
    marginBottom: 5,
  },
  breakId: {
    textAlign: 'center',
    color: '#999',
    fontSize: 10,
    fontStyle: 'italic',
    marginBottom: 10,
  },
  historyToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    marginTop: 10,
  },
  historyToggleText: { color: '#007bff', fontSize: 14, fontWeight: '500', marginRight: 5 },
  historyContainer: {
    marginTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 15,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 15,
  },
  noHistoryText: {
    textAlign: 'center',
    color: '#888',
    fontSize: 12,
    fontStyle: 'italic',
    paddingVertical: 20,
  },
  historyItem: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#007bff',
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  historyBreakId: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  historyDate: { fontSize: 12, color: '#666' },
  historyTimes: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  historyTime: { fontSize: 12, color: '#333' },
  historyLabel: { fontWeight: 'bold', color: '#555' },
  historyDuration: {
    fontSize: 12,
    color: '#007bff',
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 8,
  },
  historyStatus: { alignItems: 'center' },
  historyStatusText: {
    fontSize: 11,
    fontWeight: '500',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    textAlign: 'center',
    minWidth: 80,
  },
  completedStatus: { backgroundColor: '#d4edda', color: '#155724' },
  activeStatus: { backgroundColor: '#fff3cd', color: '#856404' },
  breakWarning: {
    textAlign: 'center',
    color: '#dc3545',
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 5,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(220, 53, 69, 0.1)',
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(220, 53, 69, 0.2)',
  }, 
  

});

export default Punch;