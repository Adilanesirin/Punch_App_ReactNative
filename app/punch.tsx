/* eslint-disable prettier/prettier */
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { useFocusEffect, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const Punch = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isBreakLoading, setIsBreakLoading] = useState(false);
  const [todayStatus, setTodayStatus] = useState<any>(null);
  const [attendanceId, setAttendanceId] = useState<string | null>(null);
  const [currentLocation, setCurrentLocation] = useState<any>(null);
  const [locationAddress, setLocationAddress] = useState<any>(null);
  const [userCredentials, setUserCredentials] = useState<any>(null);

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

  const loadTodayStatus = async () => {
    if (!userCredentials?.userId) return;
    const key = getUserSpecificKey(`punch_data_${getTodayDateString()}`);
    const raw = await AsyncStorage.getItem(key);
    const data = raw ? JSON.parse(raw) : {};
    setTodayStatus(data);
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
    const existingIndex = history.findIndex(
      (item: any) => item.break_id === breakData.break_id
    );
    if (existingIndex >= 0) {
      history[existingIndex] = {
        ...history[existingIndex],
        ...breakData,
        timestamp: new Date().toISOString(),
      };
    } else {
      history.push({ ...breakData, timestamp: new Date().toISOString() });
    }
    history.sort(
      (a: any, b: any) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    await AsyncStorage.setItem(historyKey, JSON.stringify(history));
    setBreakHistory(history);
  };

  const fetchBreakStatusFromServer = async () => {
    if (!userCredentials?.userId || !userCredentials?.password) return;
    try {
      const response = await fetch('https://myimc.in/flutter/break-status/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userid: userCredentials.userId,
          password: userCredentials.password,
        }),
      });
      if (response.ok) {
        const data = await response.json();
        setBreakStatus(data);
        const breakStatusKey = getUserSpecificKey(`break_status_${getTodayDateString()}`);
        await AsyncStorage.setItem(breakStatusKey, JSON.stringify(data));
        const breakIdKey = getUserSpecificKey('current_break_id');
        if (data.break_id && data.break_id !== null) {
          await AsyncStorage.setItem(breakIdKey, data.break_id.toString());
          setCurrentBreakId(data.break_id.toString());
        } else {
          await AsyncStorage.removeItem(breakIdKey);
          setCurrentBreakId(null);
        }
        await saveBreakToHistory(data);
      }
    } catch (error) {
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
    const [uid, pwd] = await Promise.all([
      SecureStore.getItemAsync('userId'),
      SecureStore.getItemAsync('password'),
    ]);
    if (!uid || !pwd) return;
    setUserCredentials({ userId: uid, password: pwd });
  };

  const makeApiCall = async (url: string, data: any) => {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed');
    return res.json();
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

  const handlePunch = async (type: 'in' | 'out') => {
    if (!userCredentials || !currentLocation) return;
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
      const endpoint =
        type === 'in'
          ? 'https://myimc.in/flutter/punch-in/'
          : 'https://myimc.in/flutter/punch-out/';
      const res = await makeApiCall(endpoint, payload);
      if (res.attendance?.id) {
        setAttendanceId(res.attendance.id.toString());
        const attendanceKey = getUserSpecificKey('current_attendance_id');
        await AsyncStorage.setItem(attendanceKey, res.attendance.id.toString());
      } else if (type === 'out') {
        const attendanceKey = getUserSpecificKey('current_attendance_id');
        await AsyncStorage.removeItem(attendanceKey);
        setAttendanceId(null);
      }
      await savePunchData(type, payload);
      Alert.alert(`Punch ${type === 'in' ? 'In' : 'Out'} successful`);
      const refreshKey = getUserSpecificKey('force_home_refresh');
      await AsyncStorage.setItem(refreshKey, Date.now().toString());
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBreakPunch = async (type: 'in' | 'out') => {
    if (!userCredentials?.userId || !userCredentials?.password) {
      Alert.alert('Error', 'User credentials not found');
      return;
    }
    setIsBreakLoading(true);
    try {
      const payload = {
        userid: userCredentials.userId,
        password: userCredentials.password,
      };
      const endpoint =
        type === 'in'
          ? 'https://myimc.in/flutter/break-punch-in/'
          : 'https://myimc.in/flutter/break-punch-out/';
      const response = await makeApiCall(endpoint, payload);
      if (response) {
        setBreakStatus(response);
        const breakStatusKey = getUserSpecificKey(`break_status_${getTodayDateString()}`);
        await AsyncStorage.setItem(breakStatusKey, JSON.stringify(response));
        const breakIdKey = getUserSpecificKey('current_break_id');
        if (response.break_id) {
          await AsyncStorage.setItem(breakIdKey, response.break_id.toString());
          setCurrentBreakId(response.break_id.toString());
        } else if (type === 'out') {
          await AsyncStorage.removeItem(breakIdKey);
          setCurrentBreakId(null);
        }
        await saveBreakToHistory(response);
        const message =
          type === 'in'
            ? `Break started at ${response.break_punch_in || 'now'}`
            : `Break ended. Duration: ${response.duration || 'N/A'}`;
        Alert.alert('Success', message);
        setTimeout(async () => {
          await fetchBreakStatusFromServer();
        }, 1000);
        const refreshKey = getUserSpecificKey('force_home_refresh');
        await AsyncStorage.setItem(refreshKey, Date.now().toString());
      } else {
        throw new Error('No response received from server');
      }
    } catch (error: any) {
      console.error('Break punch error:', error);
      Alert.alert('Error', `Failed to record break punch: ${error.message}`);
    } finally {
      setIsBreakLoading(false);
    }
  };

  /* ---------- Instagram-style navigation ---------- */
  const handleTabNavigation = async (route: string) => {
    if (loadingTab) return;
    setLoadingTab(route);
    await new Promise((res) => setTimeout(res, 300));
    router.push(`/${route}`);
    setLoadingTab(null);
  };

  const formatTime = (timeString?: string) => {
    if (!timeString) return '--';
    if (timeString.includes(':') && timeString.length <= 8) return timeString;
    return new Date(timeString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getBreakStatusText = () => {
    if (!breakStatus) return 'Break not started';
    if (breakStatus.has_active_break) return 'Break in progress';
    if (breakStatus.total_breaks_today > 0)
      return `Break completed (${breakStatus.total_breaks_today} breaks today)`;
    return 'Break not started';
  };

  const isBreakInProgress = () => {
    if (!breakStatus) return false;
    return breakStatus.has_active_break === true;
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

      {/* Main Attendance Punch */}
      <View style={styles.card}>
        <View style={styles.mainButtonRow}>
          <TouchableOpacity
            style={[styles.mainBtn, styles.mainInBtn]}
            onPress={() => handlePunch('in')}
            disabled={isLoading || isBreakLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="log-in-outline" size={20} color="#fff" />
                <Text style={styles.btnText}>Punch In</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.mainBtn, styles.mainOutBtn]}
            onPress={() => handlePunch('out')}
            disabled={isLoading || isBreakLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="log-out-outline" size={20} color="#fff" />
                <Text style={styles.btnText}>Punch Out</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Break Punch Card with ScrollView */}
      <View style={styles.breakCard}>
        <Text style={styles.breakHeading}>BREAK PUNCH TIME</Text>
        <ScrollView
          style={styles.scrollViewContainer}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollViewContent}
        >
          <View style={styles.timeRow}>
            <Text style={styles.timeLabel}>In: {formatTime(breakStatus?.current_break_in)}</Text>
            <Text style={styles.timeLabel}>
              Out: {breakStatus?.has_active_break ? '--' : 'Completed'}
            </Text>
          </View>
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[
                styles.btn,
                styles.inBtn,
                isBreakInProgress() && styles.disabledBtn,
              ]}
              onPress={() => handleBreakPunch('in')}
              disabled={isBreakLoading || isBreakInProgress()}
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
          {breakStatus?.break_id && (
            <Text style={styles.breakId}>Break ID: {breakStatus.break_id}</Text>
          )}
          <TouchableOpacity
            style={styles.historyToggle}
            onPress={() => setShowBreakHistory(!showBreakHistory)}
          >
            <Text style={styles.historyToggleText}>
              {showBreakHistory ? 'Hide' : 'Show'} Break History
            </Text>
            <Ionicons
              name={showBreakHistory ? 'chevron-up' : 'chevron-down'}
              size={16}
              color="#007bff"
            />
          </TouchableOpacity>
          {showBreakHistory && (
            <View style={styles.historyContainer}>
              <Text style={styles.historyTitle}>Today's Break History</Text>
              {breakHistory.length === 0 ? (
                <Text style={styles.noHistoryText}>No breaks recorded today</Text>
              ) : (
                breakHistory.map((item, index) => (
                  <View key={`${item.break_id}-${index}`} style={styles.historyItem}>
                    <View style={styles.historyHeader}>
                      <Text style={styles.historyBreakId}>Break #{item.break_id}</Text>
                      <Text style={styles.historyDate}>{item.date}</Text>
                    </View>
                    <View style={styles.historyTimes}>
                      <Text style={styles.historyTime}>
                        <Text style={styles.historyLabel}>In: </Text>
                        {formatTime(item.break_punch_in)}
                      </Text>
                      <Text style={styles.historyTime}>
                        <Text style={styles.historyLabel}>Out: </Text>
                        {formatTime(item.break_punch_out)}
                      </Text>
                    </View>
                    {item.duration && (
                      <Text style={styles.historyDuration}>Duration: {item.duration}</Text>
                    )}
                    <View style={styles.historyStatus}>
                      <Text
                        style={[
                          styles.historyStatusText,
                          item.break_punch_out ? styles.completedStatus : styles.activeStatus,
                        ]}
                      >
                        {item.break_punch_out ? 'Completed' : 'In Progress'}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          )}
        </ScrollView>
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity onPress={() => { }} style={styles.tabButton}>
          <Ionicons name="finger-print" size={35} color="#00ddff" style={styles.tabIcon} />
          <Text style={[styles.tabLabel, styles.activeTabLabel, { color: '#00ddff' }]}>Punch</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => handleTabNavigation('home')} style={styles.tabButton}>
          <Ionicons name="home" size={35} color="#ffffff" style={styles.tabIcon} />
          <Text style={[styles.tabLabel,{color:"#ffff"}]}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => handleTabNavigation('request')} style={styles.tabButton}>
          <Ionicons name="document-text" size={35} color="#ffffff" style={styles.tabIcon} />
          <Text style={[styles.tabLabel,{color:"#fff"}]}>Request</Text>
        </TouchableOpacity>
    </View>


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
    marginBottom: 30,
  },
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
    flex: 1,
    marginBottom: 150,
  },
  breakHeading: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
    marginBottom: 15,
  },
  scrollViewContainer: { flex: 1 },
  scrollViewContent: { flexGrow: 1, paddingBottom: 20 },
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
  tabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: '#16213e',
    paddingVertical: 20,
    paddingHorizontal: 20,
    justifyContent: 'space-around',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#ffff',
  },
  tabButton: {
  alignItems: 'center',
  justifyContent: 'center',
  },
  tabIcon: {
  marginBottom: -8, 
  },
  tabLabel: { color: '#888', fontSize: 12, marginTop: 15, textAlign: 'center' },
  activeTabLabel: { color: '#356effc8' },
});

export default Punch;