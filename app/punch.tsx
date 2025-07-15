import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const Punch = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [todayStatus, setTodayStatus] = useState<any>(null);
  const [attendanceId, setAttendanceId] = useState<string | null>(null);
  const [currentLocation, setCurrentLocation] = useState<any>(null);
  const [locationAddress, setLocationAddress] = useState<any>(null);
  const [userCredentials, setUserCredentials] = useState<any>(null);

  // Break punch state
  const [breakIn, setBreakIn] = useState<string | null>(null);
  const [breakOut, setBreakOut] = useState<string | null>(null);

  useEffect(() => {
    getCurrentLocation();
    getUserCredentials();
    loadTodayStatus();
    loadBreakStatus();
  }, []);

  const getTodayDateString = () => new Date().toISOString().split('T')[0];

  const loadTodayStatus = async () => {
    const key = `punch_data_${getTodayDateString()}`;
    const raw = await AsyncStorage.getItem(key);
    const data = raw ? JSON.parse(raw) : {};
    setTodayStatus(data);
    setAttendanceId(await AsyncStorage.getItem('current_attendance_id'));
  };

  const loadBreakStatus = async () => {
    const breakInTime = await AsyncStorage.getItem('break_in');
    const breakOutTime = await AsyncStorage.getItem('break_out');
    setBreakIn(breakInTime);
    setBreakOut(breakOutTime);
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
    const key = `punch_data_${getTodayDateString()}`;
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

      const endpoint = type === 'in'
        ? 'https://myimc.in/flutter/punch-in/'
        : 'https://myimc.in/flutter/punch-out/';
      const res = await makeApiCall(endpoint, payload);
      if (res.attendance?.id) {
        setAttendanceId(res.attendance.id.toString());
        await AsyncStorage.setItem('current_attendance_id', res.attendance.id.toString());
      } else if (type === 'out') {
        await AsyncStorage.removeItem('current_attendance_id');
        setAttendanceId(null);
      }

      await savePunchData(type, payload);
      Alert.alert(`Punch ${type === 'in' ? 'In' : 'Out'} successful`);
      await AsyncStorage.setItem('force_home_refresh', Date.now().toString());
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBreakPunch = async (type: 'in' | 'out') => {
    const now = new Date().toISOString();
    if (type === 'in') {
      await AsyncStorage.setItem('break_in', now);
      setBreakIn(now);
    } else {
      await AsyncStorage.setItem('break_out', now);
      setBreakOut(now);
    }
  };

  const formatTime = (ts?: string) =>
    ts ? new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '--';

  return (
    <View style={styles.container}>
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
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.btn, styles.inBtn]}
            onPress={() => handlePunch('in')}
            disabled={isLoading}
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
            style={[styles.btn, styles.outBtn]}
            onPress={() => handlePunch('out')}
            disabled={isLoading}
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

      {/* Break Punch Card */}
      <View style={styles.breakCard}>
        <Text style={styles.breakHeading}>BREAK PUNCH TIME</Text>

        {/* Time Row */}
        <View style={styles.timeRow}>
          <Text style={styles.timeLabel}>In: {formatTime(breakIn)}</Text>
          <Text style={styles.timeLabel}>Out: {formatTime(breakOut)}</Text>
        </View>

        {/* Buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity style={[styles.btn, styles.inBtn]} onPress={() => handleBreakPunch('in')}>
            <Ionicons name="log-in-outline" size={20} color="#fff" />
            <Text style={styles.btnText}>Break In</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, styles.outBtn]} onPress={() => handleBreakPunch('out')}>
            <Ionicons name="log-out-outline" size={20} color="#fff" />
            <Text style={styles.btnText}>Break Out</Text>
          </TouchableOpacity>
        </View>
        
        {/* Status */}
        <Text style={styles.breakStatus}>
          {breakIn && !breakOut
            ? 'Break in progress'
            : breakIn && breakOut
            ? 'Break completed'
            : 'Break not started'}
        </Text>
      </View>
    </View>
  );
};

export default Punch;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor:"#1f2184ff"},
  topBar: {
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
  card: {
    backgroundColor: '#fff',
    margin: 20,
    padding: 25,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 20,
  },
  btn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  inBtn: { backgroundColor: '#28a745' },
  outBtn: { backgroundColor: '#dc3545' },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  breakCard: {
    marginHorizontal: 20,
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    marginBottom: 30,
  },
  breakHeading: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
    color: '#222',
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  timeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  breakStatus: {
    fontSize: 16,
    fontStyle: 'italic',
    textAlign: 'center',
    color: '#555',
    marginTop: 15,
  },
});
