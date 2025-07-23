/* eslint-disable prettier/prettier */
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlurView } from 'expo-blur';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface UserCredentials {
  userId: string;
  password: string;
}

interface PunchData {
  time: string;
  location: any;
}

interface TodayStatus {
  date: string;
  punchIn: PunchData | null;
  punchOut: PunchData | null;
  totalHours: string;
}

export default function Home() {
  const router = useRouter();
  const { username } = useLocalSearchParams<{ username: string }>();

  const [todayStatus, setTodayStatus] = useState<TodayStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showProfileCard, setShowProfileCard] = useState(false);
  const [userCredentials, setUserCredentials] = useState<UserCredentials | null>(null);

  /* ---------- loading overlay states ---------- */
  const [loadingTab, setLoadingTab] = useState<string | null>(null);

  const getTodayDateString = () => new Date().toISOString().split('T')[0];

  const getUserSpecificKey = (baseKey: string) => {
    return userCredentials?.userId ? `${baseKey}_${userCredentials.userId}` : baseKey;
  };

  const getUserCredentials = async () => {
    try {
      const [uid, pwd] = await Promise.all([
        SecureStore.getItemAsync('userId'),
        SecureStore.getItemAsync('password'),
      ]);
      if (uid && pwd) {
        setUserCredentials({ userId: uid, password: pwd });
      } else {
        router.replace('/login');
      }
    } catch (error) {
      console.error('Error getting user credentials:', error);
      router.replace('/login');
    }
  };

  const loadTodayStatus = async () => {
    if (!userCredentials?.userId) return;
    try {
      const todayKey = getUserSpecificKey(`punch_data_${getTodayDateString()}`);
      const raw = await AsyncStorage.getItem(todayKey);
      if (raw) {
        const parsedData = JSON.parse(raw);
        setTodayStatus(parsedData);
      } else {
        await fetchTodayStatusFromAPI();
      }
    } catch (error) {
      console.error('Error loading today status:', error);
      setTodayStatus({
        date: getTodayDateString(),
        punchIn: null,
        punchOut: null,
        totalHours: '0h 0m',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTodayStatusFromAPI = async () => {
    const defaultStatus: TodayStatus = {
      date: getTodayDateString(),
      punchIn: null,
      punchOut: null,
      totalHours: '0h 0m',
    };
    setTodayStatus(defaultStatus);
    if (userCredentials?.userId) {
      const todayKey = getUserSpecificKey(`punch_data_${getTodayDateString()}`);
      await AsyncStorage.setItem(todayKey, JSON.stringify(defaultStatus));
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadTodayStatus().finally(() => setRefreshing(false));
  }, [userCredentials]);

  const formatTime = (timeString?: string) => {
    if (!timeString) return 'Not recorded';
    try {
      return new Date(timeString).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return 'Invalid time';
    }
  };

  const formatLocation = (loc: any): string => {
    if (!loc) return 'N/A';
    if (typeof loc === 'string') {
      try {
        const parsed = JSON.parse(loc);
        return parsed.city || parsed.address || loc;
      } catch {
        return loc;
      }
    }
    return loc.city || loc.address || 'N/A';
  };

  const getWorkingStatus = () => {
    if (!todayStatus) return 'No data';
    if (todayStatus.punchIn && !todayStatus.punchOut) return 'Currently working';
    if (todayStatus.punchIn && todayStatus.punchOut) return 'Work completed';
    return 'Not started';
  };

  const getStatusColor = () => {
    switch (getWorkingStatus()) {
      case 'Currently working': return '#28a745';
      case 'Work completed': return '#007bff';
      default: return '#6c757d';
    }
  };

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await SecureStore.deleteItemAsync('userId');
          await SecureStore.deleteItemAsync('password');
          setUserCredentials(null);
          setTodayStatus(null);
          setShowProfileCard(false);
          router.replace('/login');
        },
      },
    ]);
  };

  /* ---------- Instagram-style navigation ---------- */
  const handleTabNavigation = async (route: string) => {
    if (loadingTab) return;
    setLoadingTab(route);
    await new Promise((res) => setTimeout(res, 300)); // mimic loading
    router.push(`/${route}`);
    setLoadingTab(null);
  };

  useEffect(() => {
    getUserCredentials();
  }, []);

  useEffect(() => {
    if (userCredentials?.userId) {
      loadTodayStatus();
      const statusInterval = setInterval(loadTodayStatus, 30000);
      const refreshListener = setInterval(async () => {
        try {
          const refreshKey = getUserSpecificKey('force_home_refresh');
          const ts = await AsyncStorage.getItem(refreshKey);
          if (ts) {
            await AsyncStorage.removeItem(refreshKey);
            loadTodayStatus();
          }
        } catch (error) {
          console.error('Error in refresh listener:', error);
        }
      }, 1000);
      return () => {
        clearInterval(statusInterval);
        clearInterval(refreshListener);
      };
    }
  }, [userCredentials]);

  /* ---------- UI ---------- */
  if (isLoading && !userCredentials) {
    return (
      <View style={[homeStyles.container, homeStyles.loadingContainer]}>
        <ActivityIndicator size="large" color="#ffffff" />
        <Text style={homeStyles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={[homeStyles.container, { backgroundColor: '#1a1a2e' }]}>
      {/* ---------- loading overlay ---------- */}
      {loadingTab && (
        <View style={homeStyles.loadingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={homeStyles.loadingOverlayTxt}>Loading…</Text>
        </View>
      )}

      <View style={homeStyles.overlay}>
        <View style={homeStyles.header}>
          <TouchableOpacity
            style={homeStyles.profileIconButton}
            onPress={() => setShowProfileCard(true)}
          >
            <Ionicons name="person-circle" size={35} color="#ffffffff" />
          </TouchableOpacity>
        </View>

        <ScrollView
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ffffff" />
          }
          contentContainerStyle={homeStyles.cardWrapper}
        >
          <BlurView intensity={90} tint="light" style={homeStyles.miniCard}>
            <View style={homeStyles.transparentCardContent}>
              <View style={homeStyles.cardHeader}>
                <Text style={homeStyles.miniTitle}>Today's Status</Text>
                <TouchableOpacity style={homeStyles.statusIndicator} onPress={onRefresh}>
                  <Ionicons name="refresh-circle" size={24} color="#4CAF50" />
                </TouchableOpacity>
              </View>
              <Text style={homeStyles.miniDate}>
                {new Date().toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })}
              </Text>
              <View style={homeStyles.statusContainer}>
                <View style={homeStyles.statusRow}>
                  <View style={homeStyles.statusLeft}>
                    <Ionicons name="log-in" size={16} color="#4CAF50" />
                    <Text style={homeStyles.statusLabel}>Punch In:</Text>
                  </View>
                  <Text style={homeStyles.statusValue}>
                    {todayStatus?.punchIn ? formatTime(todayStatus.punchIn.time) : 'Not recorded'}
                  </Text>
                </View>
                <View style={homeStyles.statusRow}>
                  <View style={homeStyles.statusLeft}>
                    <Ionicons name="location" size={16} color="#4CAF50" />
                    <Text style={homeStyles.statusLabel}>Punch In Location:</Text>
                  </View>
                  <Text style={[homeStyles.statusValue, homeStyles.locationValue]}>
                    {todayStatus?.punchIn ? formatLocation(todayStatus.punchIn.location) : 'N/A'}
                  </Text>
                </View>
                <View style={homeStyles.divider} />
                <View style={homeStyles.statusRow}>
                  <View style={homeStyles.statusLeft}>
                    <Ionicons name="log-out" size={16} color="#F44336" />
                    <Text style={homeStyles.statusLabel}>Punch Out:</Text>
                  </View>
                  <Text style={homeStyles.statusValue}>
                    {todayStatus?.punchOut ? formatTime(todayStatus.punchOut.time) : 'Not punched out yet'}
                  </Text>
                </View>
                <View style={homeStyles.statusRow}>
                  <View style={homeStyles.statusLeft}>
                    <Ionicons name="location" size={16} color="#F44336" />
                    <Text style={homeStyles.statusLabel}>Punch Out Location:</Text>
                  </View>
                  <Text style={[homeStyles.statusValue, homeStyles.locationValue]}>
                    {todayStatus?.punchOut ? formatLocation(todayStatus.punchOut.location) : 'Not punched out yet'}
                  </Text>
                </View>
                <View style={homeStyles.workingStatusContainer}>
                  <View style={[homeStyles.statusDot, { backgroundColor: getStatusColor() }]} />
                  <Text style={[homeStyles.workingStatus, { color: getStatusColor() }]}>
                    {getWorkingStatus()}
                  </Text>
                </View>
              </View>
            </View>
          </BlurView>
        </ScrollView>

        <Modal
          visible={showProfileCard}
          transparent
          animationType="fade"
          onRequestClose={() => setShowProfileCard(false)}
        >
          <TouchableOpacity
            style={homeStyles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowProfileCard(false)}
          >
            <BlurView intensity={90} style={homeStyles.profileCard}>
              <TouchableOpacity activeOpacity={1} style={homeStyles.profileContent}>
                <View style={homeStyles.profileHeader}>
                  <View style={homeStyles.profileIconContainer}>
                    <Ionicons name="person" size={40} color="#1a1a2e" />
                  </View>
                  <Text style={homeStyles.profileName}>Hello, {username || 'User'}</Text>
                </View>
                <TouchableOpacity style={homeStyles.logoutButton} onPress={handleLogout}>
                  <Ionicons name="log-out-outline" size={20} color="#fff" style={homeStyles.logoutIcon} />
                  <Text style={homeStyles.logoutText}>Logout</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            </BlurView>
          </TouchableOpacity>
        </Modal>

        <View style={homeStyles.tabBar}>
          <TouchableOpacity onPress={() => handleTabNavigation('punch')} style={homeStyles.tabButton}>
            <Ionicons name="finger-print" size={35} color="#fff" />
          <Text style={[homeStyles.tabLabel,{color:"#fff"}]}>Punch</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => { }} style={homeStyles.tabButton}>
            <Ionicons name="home" size={35} color="#00ddff" />
              <Text style={[homeStyles.tabLabel, homeStyles.activeTabLabel,{color: '#00ddff'}]}>Home</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => handleTabNavigation('request')} style={homeStyles.tabButton}>
            <Ionicons name="document-text" size={35} color="#fff" />
            <Text style={[homeStyles.tabLabel,{color:"#fff"}]}>Request</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const homeStyles = StyleSheet.create({
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
    zIndex: 999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingOverlayTxt: { color: '#fff', marginTop: 8 },
  container: { flex: 1, width: '100%', height: '100%' },
  overlay: { flex: 1, backgroundColor: 'transparent' },
  loadingContainer: { justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a1a2e' },
  loadingText: { color: '#ffffff', marginTop: 10, fontSize: 16 },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 7,
    paddingTop: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.01)',
  },
  profileIconButton: { padding: 5 },
  cardWrapper: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  miniCard: {
    width: '100%',
    maxWidth: 380,
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
  miniTitle: { fontSize: 22, fontWeight: 'bold', color: '#1a1a1a' },
  statusIndicator: { padding: 4 },
  miniDate: { fontSize: 14, color: '#666', marginBottom: 20, fontWeight: '500' },
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileCard: {
    borderRadius: 20,
    width: '80%',
    maxWidth: 300,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 8 },
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderWidth: 1,
    borderColor: 'rgba(10, 23, 95, 0.36)',
  },
  profileContent: {
    padding: 30,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  profileHeader: { alignItems: 'center', marginBottom: 30 },
  profileIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  profileName: { fontSize: 18, fontWeight: '600', color: '#333', textAlign: 'center' },
  logoutButton: {
    backgroundColor: '#ff4444',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 120,
  },
  logoutIcon: { marginRight: 8 },
  logoutText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  tabBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: '#16213e',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    
  },
  tabButton: { alignItems: 'center', justifyContent: 'center', paddingVertical: 0, paddingHorizontal: 10,marginTop: -5, },
  tabLabel: { fontSize: 12, color: '#888', marginTop: 8, textAlign: 'center' },
  activeTabLabel: { color: '#000607ff', fontWeight: 'bold' },
});