// Punch.tsx
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
  const [lastPunch, setLastPunch] = useState('Not recorded');
  const [todayHours, setTodayHours] = useState('0h 0m');
  const [currentLocation, setCurrentLocation] = useState<Location.LocationObject | null>(null);
  const [locationAddress, setLocationAddress] = useState<any>(null);
  const [userCredentials, setUserCredentials] = useState<{ userId: string; password: string } | null>(null);
  const [todayStatus, setTodayStatus] = useState<any>(null);
  const [attendanceId, setAttendanceId] = useState<string | null>(null);

  /* ---------- life-cycle ---------- */
  useEffect(() => {
    getCurrentLocation();
    getUserCredentials();
    loadTodayStatus();
  }, []);

  /* ---------- helpers ---------- */
  const getTodayDateString = () => new Date().toISOString().split('T')[0];

  const loadTodayStatus = async () => {
    try {
      const todayKey = `punch_data_${getTodayDateString()}`;
      const raw = await AsyncStorage.getItem(todayKey);
      const storedAttendanceId = await AsyncStorage.getItem('current_attendance_id');

      let record = raw ? JSON.parse(raw) : { date: getTodayDateString(), punchIn: null, punchOut: null, totalHours: '0h 0m' };

      setTodayStatus(record);
      setAttendanceId(storedAttendanceId);

      if (record.punchOut) {
        setLastPunch(`Punch Out at ${new Date(record.punchOut.time).toLocaleTimeString()}`);
      } else if (record.punchIn) {
        setLastPunch(`Punch In at ${new Date(record.punchIn.time).toLocaleTimeString()}`);
      }
      setTodayHours(record.totalHours || '0h 0m');
    } catch (e) {
      console.error('loadTodayStatus', e);
    }
  };

  const savePunchData = async (type: 'in' | 'out', data: any) => {
    try {
      const todayKey = `punch_data_${getTodayDateString()}`;
      let record = JSON.parse((await AsyncStorage.getItem(todayKey)) || '{}');

      record.date = getTodayDateString();
      if (type === 'in') {
        record.punchIn = { time: new Date().toISOString(), ...data };
        record.punchOut = null; // always clear
      } else {
        record.punchOut = { time: new Date().toISOString(), ...data };
      }

      if (record.punchIn && record.punchOut) {
        const ms = new Date(record.punchOut.time).getTime() - new Date(record.punchIn.time).getTime();
        const h = Math.floor(ms / (1000 * 60 * 60));
        const m = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
        record.totalHours = `${h}h ${m}m`;
      } else {
        record.totalHours = '0h 0m';
      }

      await AsyncStorage.setItem(todayKey, JSON.stringify(record));
      setTodayHours(record.totalHours);
      return record;
    } catch (e) {
      console.error('savePunchData', e);
      throw e;
    }
  };

  /* ---------- location ---------- */
  const getCurrentLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Location required');
      return;
    }
    const loc = await Location.getCurrentPositionAsync({});
    setCurrentLocation(loc);
    const [addr] = await Location.reverseGeocodeAsync(loc.coords);
    setLocationAddress({
      city: addr?.city || addr?.district || 'Unknown',
      fullAddress: `${addr?.street || ''} ${addr?.city || ''} ${addr?.region || ''}`.trim(),
      district: addr?.district || addr?.city,
      state: addr?.region || 'Kerala',
    });
  };

  const getUserCredentials = async () => {
    const [uid, pwd] = await Promise.all([
      SecureStore.getItemAsync('userId'),
      SecureStore.getItemAsync('password'),
    ]);
    if (!uid || !pwd) {
      Alert.alert('Authentication Required', 'Please log in again', [
        { text: 'OK', onPress: () => router.replace('/login') },
      ]);
      return;
    }
    setUserCredentials({ userId: uid, password: pwd });
  };

  /* ---------- api ---------- */
  const makeApiCall = async (endpoint: string, data: any) => {
    const body = JSON.stringify(data);
    console.log('POST', endpoint, body);
    let res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  };

  /* ---------- handlers ---------- */
  const handlePunchIn = async () => {
    if (!currentLocation || !userCredentials) return;
    setIsLoading(true);
    try {
      const payload = {
        userid: userCredentials.userId,
        password: userCredentials.password,
        location: locationAddress?.city || 'Current Location',
        latitude: currentLocation.coords.latitude.toString(),
        longitude: currentLocation.coords.longitude.toString(),
        enhanced_location: JSON.stringify({
          address: locationAddress?.fullAddress,
          city: locationAddress?.city,
          district: locationAddress?.district,
          state: locationAddress?.state,
          timezone: 'Asia/Kolkata',
        }),
      };

      const res = await makeApiCall('https://myimc.in/flutter/punch-in/', payload);
      const id = res.attendance?.id || res.attendance?.employee || res.id;
      if (id) {
        setAttendanceId(id.toString());
        await AsyncStorage.setItem('current_attendance_id', id.toString());
      }

      const updated = await savePunchData('in', payload);
      setTodayStatus(updated);
      setLastPunch(`Punch In at ${new Date().toLocaleTimeString()}`);
      Alert.alert('Punch In', 'Success!');
      // tell Home to refresh when user goes back
      await AsyncStorage.setItem('force_home_refresh', Date.now().toString());
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePunchOut = async () => {
    if (!currentLocation || !userCredentials) return;
    setIsLoading(true);
    try {
      const storedId = attendanceId || (await AsyncStorage.getItem('current_attendance_id'));
      const payload = {
        userid: userCredentials.userId,
        password: userCredentials.password,
        location: locationAddress?.city || 'Current Location',
        latitude: currentLocation.coords.latitude.toString(),
        longitude: currentLocation.coords.longitude.toString(),
        enhanced_location: JSON.stringify({
          address: locationAddress?.fullAddress,
          city: locationAddress?.city,
          district: locationAddress?.district,
          state: locationAddress?.state,
          timezone: 'Asia/Kolkata',
        }),
        ...(storedId && { attendance_id: storedId, employee: storedId, id: storedId }),
      };

      await makeApiCall('https://myimc.in/flutter/punch-out/', payload);
      await AsyncStorage.removeItem('current_attendance_id');
      setAttendanceId(null);

      const updated = await savePunchData('out', payload);
      setTodayStatus(updated);
      setLastPunch(`Punch Out at ${new Date().toLocaleTimeString()}`);
      Alert.alert('Punch Out', 'Success!');
      await AsyncStorage.setItem('force_home_refresh', Date.now().toString());
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setIsLoading(false);
    }
  };

  /* ---------- render helpers ---------- */
  const canPunchIn = () => !todayStatus?.punchIn || !!todayStatus?.punchOut;
  const canPunchOut = () => todayStatus?.punchIn && !todayStatus?.punchOut;

  /* ---------- render ---------- */
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Punch In/Out</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        
        {/* Buttons */}
        <View style={styles.btnRow}>
          <TouchableOpacity
            style={[styles.btn, styles.inBtn, !canPunchIn() && styles.disabled]}
            onPress={handlePunchIn}
            disabled={!canPunchIn() || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="log-in" size={24} color="#fff" />
                <Text style={styles.btnTxt}>Punch In</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btn, styles.outBtn, !canPunchOut() && styles.disabled]}
            onPress={handlePunchOut}
            disabled={!canPunchOut() || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="log-out" size={24} color="#fff" />
                <Text style={styles.btnTxt}>Punch Out</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Bottom Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity>
          <Ionicons name="finger-print" size={28} color="#007bff" />
          <Text style={[styles.tabLabel, styles.activeLabel]}>Punch</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('/home')}>
          <Ionicons name="home" size={28} color="#888" />
          <Text style={styles.tabLabel}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('/request')}>
          <Ionicons name="document-text" size={28} color="#888" />
          <Text style={styles.tabLabel}>Request</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

/* ---------- styles ---------- */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9f9f9' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 15,
    backgroundColor: '#fff',
    elevation: 3,
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  content: { flex: 1, padding: 20, justifyContent: 'center' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 15,
    elevation: 2,
  },
  cardTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 6 },
  status: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  hours: { fontSize: 14, color: '#666' },
  loc: { fontSize: 16, color: '#333' },
  locSub: { fontSize: 14, color: '#888' },
  btnRow: { flexDirection: 'row', gap: 16 },
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
  },
  inBtn: { backgroundColor: '#28a745' },
  outBtn: { backgroundColor: '#dc3545' },
  disabled: { backgroundColor: '#6c757d', opacity: 0.6 },
  btnTxt: { color: '#fff', fontWeight: 'bold', marginLeft: 8 },
  tabBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#f8f8f8',
  },
  tabLabel: { fontSize: 12, color: '#888', textAlign: 'center' },
  activeLabel: { color: '#007bff', fontWeight: 'bold' },
});

export default Punch;