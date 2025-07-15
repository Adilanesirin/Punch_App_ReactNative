import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlurView } from 'expo-blur';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Modal,
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
  const [showProfileCard, setShowProfileCard] = useState(false);

  useEffect(() => {
    loadTodayStatus();
    const interval = setInterval(loadTodayStatus, 30000);

    const listener = setInterval(async () => {
      const ts = await AsyncStorage.getItem('force_home_refresh');
      if (ts) {
        await AsyncStorage.removeItem('force_home_refresh');
        loadTodayStatus();
      }
    }, 1000);

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

  const handleLogout = () => {
    setShowProfileCard(false);
    router.replace('/login');
  };
  const handlePunchTab = () => router.push('/punch');
  const handleRequestTab = () => router.push('/request');

  const renderPunchSection = (type: 'in' | 'out', data: any) => (
    <View style={styles.punchSection}>
      <View
        style={[
          styles.punchIconContainer,
          { backgroundColor: type === 'in' ? '#d0f0d3' : '#fddada' },
        ]}
      >
        <Ionicons
          name={type === 'in' ? 'log-in-outline' : 'log-out-outline'}
          size={24}
          color={type === 'in' ? '#4CAF50' : '#F44336'}
        />
      </View>
      <View style={styles.punchContent}>
        <Text style={[styles.punchLabel, { color: type === 'in' ? '#4CAF50' : '#F44336' }]}>
          {type === 'in' ? 'Punch In' : 'Punch Out'}
        </Text>
        <Text style={styles.punchTime}>{formatTime(data?.time)}</Text>
        <Text style={styles.punchLocation}>{formatLocation(data?.location)}</Text>
      </View>
    </View>
  );

  const renderTodayStatusCard = () => (
    <BlurView intensity={90} tint="light" style={styles.miniCard}>
      <View style={styles.transparentCardContent}>
        <Text style={styles.miniTitle}>Today's Status</Text>
        <Text style={styles.miniDate}>
          {new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          })}
        </Text>
        <View style={styles.rowContainer}>
          {renderPunchSection('in', todayStatus?.punchIn)}
          <View style={styles.rowSeparator} />
          {renderPunchSection('out', todayStatus?.punchOut)}
        </View>
      </View>
    </BlurView>
  );

  const renderProfileCard = () => (
    <Modal
      visible={showProfileCard}
      transparent
      animationType="fade"
      onRequestClose={() => setShowProfileCard(false)}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setShowProfileCard(false)}
      >
        <BlurView intensity={90} style={styles.profileCard}>
          <View style={styles.profileContent}>
            <View style={styles.profileHeader}>
              <View style={styles.profileIconContainer}>
                <Ionicons name="person" size={40} color="#1f2184ff" />
              </View>
              <Text style={styles.profileName}>Hello, {username || 'ADILA NESIRIN'}</Text>
            </View>
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={20} color="#fff" style={styles.logoutIcon} />
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </BlurView>
      </TouchableOpacity>
    </Modal>
  );

  return (
    <View style={[styles.container, { backgroundColor: '#1f2184ff' }]}>
      <View style={styles.overlay}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.profileIconButton}
            onPress={() => setShowProfileCard(true)}
          >
            <Ionicons name="person-circle" size={35} color="#ffffffff" />
          </TouchableOpacity>
        </View>

        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={styles.cardWrapper}
        >
          {renderTodayStatusCard()}
        </ScrollView>

        {renderProfileCard()}

        <View style={styles.tabBar}>
          <TouchableOpacity onPress={handlePunchTab}>
            <Ionicons name="finger-print" size={28} color="#888" />
            <Text style={styles.tabLabel}>Punch</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => {}}>
            <Ionicons name="home" size={28} color="#356effc8" />
            <Text style={[styles.tabLabel, styles.activeTabLabel]}>Home</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleRequestTab}>
            <Ionicons name="document-text" size={28} color="#888" />
            <Text style={styles.tabLabel}>Request</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent', // ✅ No white opacity
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 7,
    paddingTop: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.01)',
    borderBottomWidth: 0,
    borderBottomColor: 'rgba(233, 234, 238, 0.82)',
  },
  profileIconButton: { padding: 5 },
  cardWrapper: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  miniCard: {
    width: '100%',
    maxWidth: 350,
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
    paddingVertical: 35,
    paddingHorizontal: 30,
    backgroundColor: 'rgba(250, 250, 250, 0.9)',
    borderRadius: 20,
  },
  miniTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000', // ✅ Changed to black
    textAlign: 'center',
    marginBottom: 8,
  },
  miniDate: {
    fontSize: 14,
    color: '#000', // ✅ Changed to black
    textAlign: 'center',
    marginBottom: 30,
    fontWeight: '500',
  },
  rowContainer: {
    flexDirection: 'column',
    backgroundColor: 'rgba(249, 253, 253, 0.95)',
    borderRadius: 16,
    padding: 25,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    borderWidth: 1,
    borderColor: 'rgba(15, 5, 1, 0.65)',
  },
  punchSection: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  rowSeparator: {
    height: 1,
    width: '100%',
    backgroundColor: 'rgba(11, 9, 8, 0.59)',
    marginVertical: 20,
  },
  punchIconContainer: {
    width: 55,
    height: 55,
    borderRadius: 27.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  punchContent: {
    alignItems: 'center',
    width: '100%',
  },
  punchLabel: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  punchTime: {
    fontSize: 14,
    color: '#555',
    fontWeight: '600',
    marginBottom: 6,
    textAlign: 'center',
  },
  punchLocation: {
    fontSize: 12,
    color: '#777',
    textAlign: 'center',
    lineHeight: 16,
  },
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
  profileHeader: {
    alignItems: 'center',
    marginBottom: 30,
  },
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
  profileName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
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
  logoutIcon: {
    marginRight: 8,
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  tabBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  tabLabel: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
    textAlign: 'center',
  },
  activeTabLabel: {
    color: '#000607ff',
    fontWeight: 'bold',
  },
});
