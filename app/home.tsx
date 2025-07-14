// Home.tsx  – compact, centered Today’s Status card
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export default function Home() {
  const router = useRouter();
  const { username } = useLocalSearchParams<{ username: string }>();

  const [todayStatus, setTodayStatus] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  /* ---------- life-cycle ---------- */
  useEffect(() => {
    loadTodayStatus();
    const interval = setInterval(loadTodayStatus, 30_000);

    const listener = setInterval(async () => {
      const ts = await AsyncStorage.getItem('force_home_refresh');
      if (ts) {
        await AsyncStorage.removeItem('force_home_refresh');
        loadTodayStatus();
      }
    }, 1_000);

    return () => {
      clearInterval(interval);
      clearInterval(listener);
    };
  }, []);

  const getTodayDateString = () => new Date().toISOString().split('T')[0];

  const loadTodayStatus = async () => {
    try {
      const todayKey = `punch_data_${getTodayDateString()}`;
      const raw = await AsyncStorage.getItem(todayKey);
      if (raw) {
        setTodayStatus(JSON.parse(raw));
      } else {
        await fetchTodayStatusFromAPI();
      }
    } catch (e) {
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
    setTodayStatus({
      date: getTodayDateString(),
      punchIn: null,
      punchOut: null,
      totalHours: '0h 0m',
    });
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    loadTodayStatus().finally(() => setRefreshing(false));
  }, []);

  /* ---------- formatters ---------- */
  const formatTime = (timeString?: string) => {
    if (!timeString) return 'Not recorded';
    return new Date(timeString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
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
      case 'Currently working':
        return '#28a745';
      case 'Work completed':
        return '#007bff';
      default:
        return '#6c757d';
    }
  };

  /* ---------- navigation ---------- */
  const handleLogout = () => router.replace('/login');
  const handlePunchTab = () => router.push('/punch');
  const handleRequestTab = () => router.push('/request');

  /* ---------- render ---------- */
  const renderTodayStatusCard = () => {
    if (isLoading) {
      return (
        <View style={styles.miniCard}>
          <ActivityIndicator size="large" color="#007bff" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      );
    }

    return (
      <View style={styles.miniCard}>
        <Text style={styles.miniTitle}>Today’s Status</Text>
        <Text style={styles.miniDate}>
          {new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          })}
        </Text>

        {/* Punch In */}
        <View style={styles.miniRow}>
          <Ionicons name="log-in-outline" size={22} color="#28a745" />
          <View style={styles.miniCol}>
            <Text style={styles.miniLabel}>Punch In</Text>
            <Text style={styles.miniTime}>{formatTime(todayStatus?.punchIn?.time)}</Text>
            <Text style={styles.miniLoc}>{formatLocation(todayStatus?.punchIn?.location)}</Text>
          </View>
        </View>

        <View style={styles.miniDivider} />

        {/* Punch Out */}
        <View style={styles.miniRow}>
          <Ionicons name="log-out-outline" size={22} color="#dc3545" />
          <View style={styles.miniCol}>
            <Text style={styles.miniLabel}>Punch Out</Text>
            <Text style={styles.miniTime}>{formatTime(todayStatus?.punchOut?.time)}</Text>
            <Text style={styles.miniLoc}>{formatLocation(todayStatus?.punchOut?.location)}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.cardWrapper}
      >
        {renderTodayStatusCard()}
      </ScrollView>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

      {/* Bottom Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity onPress={handlePunchTab}>
          <Ionicons name="finger-print" size={28} color="#888" />
          <Text style={styles.tabLabel}>Punch</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => {}}>
          <Ionicons name="home" size={28} color="#007bff" />
          <Text style={[styles.tabLabel, styles.activeTabLabel]}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleRequestTab}>
          <Ionicons name="document-text" size={28} color="#888" />
          <Text style={styles.tabLabel}>Request</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/* ---------- styles ---------- */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9f9f9' },

  /* center the card */
  scrollView: { flex: 1 },
  cardWrapper: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },

  /* compact card */
  miniCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 90,
    paddingHorizontal: 40,
    elevation: 3,
    shadowColor: '#00f',
    shadowOpacity: 0.20,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  miniTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', textAlign: 'center', marginBottom: 4 },
  miniDate: { fontSize: 12, color: '#666', textAlign: 'center', marginBottom: 16 },

  miniRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  miniCol: { marginLeft: 12, flexShrink: 1 },
  miniLabel: { fontSize: 14, fontWeight: '600', color: '#333' },
  miniTime: { fontSize: 13, color: '#555' },
  miniLoc: { fontSize: 11, color: '#888' },

  miniDivider: { height: 1, backgroundColor: '#eee', marginVertical: 8 },
  loadingText: { fontSize: 14, color: '#666', textAlign: 'center', marginTop: 6 },

  logoutButton: {
    backgroundColor: '#ff4444',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 6,
    alignSelf: 'center',
    marginBottom: 10,
  },
  logoutText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },

  tabBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    backgroundColor: '#f8f8f8',
  },
  tabLabel: { fontSize: 12, color: '#888', marginTop: 2, textAlign: 'center' },
  activeTabLabel: { color: '#007bff', fontWeight: 'bold' },
});