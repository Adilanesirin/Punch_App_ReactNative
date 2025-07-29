/* eslint-disable prettier/prettier */
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const Request = () => {
  const router = useRouter();
  const [loadingTab, setLoadingTab] = useState<string | null>(null);
  const [loadingRequest, setLoadingRequest] = useState<string | null>(null);

  const handleTabNavigation = async (route: string) => {
    if (loadingTab) return;
    setLoadingTab(route);
    await new Promise((res) => setTimeout(res, 300));
    router.push(`/${route}`);
    setLoadingTab(null);
  };

  const handleRequestNavigation = async (requestType: string) => {
    if (loadingRequest) return;
    setLoadingRequest(requestType);
    await new Promise((res) => setTimeout(res, 300));
    switch (requestType) {
      case 'leave':
        router.push('/leave-request');
        break;
      case 'late':
        router.push('/late-request');
        break;
      case 'early':
        router.push('/early-request');
        break;
    }
    setLoadingRequest(null);
  };

  const handleViewRequests = async (requestType: string) => {
    if (loadingRequest) return;
    setLoadingRequest(`view-${requestType}`);
    await new Promise((res) => setTimeout(res, 300));
    switch (requestType) {
      case 'leave':
        router.push('/view-leave-requests');
        break;
      case 'late':
        router.push('/view-late-requests');
        break;
      case 'early':
        router.push('/view-early-requests');
        break;
    }
    setLoadingRequest(null);
  };

  return (
    <View style={styles.container}>
      {(loadingTab || loadingRequest) && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingOverlayTxt}>Loading…</Text>
        </View>
      )}

      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <Text style={styles.pageTitle}>REQUEST</Text>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Leave Row */}
        <View style={styles.requestRow}>
          <TouchableOpacity style={styles.requestButton} onPress={() => handleRequestNavigation('leave')} disabled={loadingRequest !== null}>
            <LinearGradient colors={['#3a7bd5', '#00d2ff']} style={styles.gradientButton}>
              {loadingRequest === 'leave' ? (
                <ActivityIndicator size="large" color="#fff" />
              ) : (
                <>
                  <Text style={styles.requestButtonText}>Leave</Text>
                  <Text style={styles.requestButtonText}>Request</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.requestButton} onPress={() => handleViewRequests('leave')} disabled={loadingRequest !== null}>
            <LinearGradient colors={['#ffffff', '#74ebd5']} style={styles.gradientButton}>
              {loadingRequest === 'view-leave' ? (
                <ActivityIndicator size="large" color="#000" />
              ) : (
                <View style={styles.viewButtonContent}>
                  <Ionicons name="menu" size={24} color="#000" style={styles.menuIcon} />
                  <Text style={styles.viewButtonText}>View My Leave</Text>
                  <Text style={styles.viewButtonText}>Requests</Text>
                </View>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Late Row */}
        <View style={styles.requestRow}>
          <TouchableOpacity style={styles.requestButton} onPress={() => handleRequestNavigation('late')} disabled={loadingRequest !== null}>
            <LinearGradient colors={['#3a7bd5', '#00d2ff']} style={styles.gradientButton}>
              {loadingRequest === 'late' ? (
                <ActivityIndicator size="large" color="#fff" />
              ) : (
                <>
                  <Text style={styles.requestButtonText}>Late</Text>
                  <Text style={styles.requestButtonText}>Request</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.requestButton} onPress={() => handleViewRequests('late')} disabled={loadingRequest !== null}>
            <LinearGradient colors={['#ffffff', '#74ebd5']} style={styles.gradientButton}>
              {loadingRequest === 'view-late' ? (
                <ActivityIndicator size="large" color="#000" />
              ) : (
                <View style={styles.viewButtonContent}>
                  <Ionicons name="menu" size={24} color="#000" style={styles.menuIcon} />
                  <Text style={styles.viewButtonText}>View My Late</Text>
                  <Text style={styles.viewButtonText}>Requests</Text>
                </View>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Early Row */}
        <View style={styles.requestRow}>
          <TouchableOpacity style={styles.requestButton} onPress={() => handleRequestNavigation('early')} disabled={loadingRequest !== null}>
            <LinearGradient colors={['#3a7bd5', '#00d2ff']} style={styles.gradientButton}>
              {loadingRequest === 'early' ? (
                <ActivityIndicator size="large" color="#fff" />
              ) : (
                <>
                  <Text style={styles.requestButtonText}>Early</Text>
                  <Text style={styles.requestButtonText}>Request</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.requestButton} onPress={() => handleViewRequests('early')} disabled={loadingRequest !== null}>
            <LinearGradient colors={['#ffffff', '#74ebd5']} style={styles.gradientButton}>
              {loadingRequest === 'view-early' ? (
                <ActivityIndicator size="large" color="#000" />
              ) : (
                <View style={styles.viewButtonContent}>
                  <Ionicons name="menu" size={24} color="#000" style={styles.menuIcon} />
                  <Text style={styles.viewButtonText}>View My Early</Text>
                  <Text style={styles.viewButtonText}>Requests</Text>
                </View>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>

      
    </View>
  );
};

export default Request;

const styles = StyleSheet.create({
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#15285cff',
    zIndex: 999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingOverlayTxt: {
    color: '#fff',
    marginTop: 8,
  },
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
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
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: 100,
  },
  requestRow: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 15,
  },
  requestButton: {
    flex: 1,
    height: 120,
    borderRadius: 25,
    overflow: 'hidden',
    elevation: 3,
  },
  gradientButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 25,
    padding: 10,
  },
  requestButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  viewButtonContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuIcon: {
    marginBottom: 5,
  },
  viewButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    textAlign: 'center',
  },
 
});
