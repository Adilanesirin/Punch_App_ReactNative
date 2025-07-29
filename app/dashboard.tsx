/* eslint-disable prettier/prettier */
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
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

interface AttendanceOption {
  id: string;
  title: string;
  description: string;
  icon: string;
  route: string;
  color: string;
}

export default function Attendance() {
  const router = useRouter();
  const [loadingTab, setLoadingTab] = useState<string | null>(null);

  // Attendance options configuration
  const attendanceOptions: AttendanceOption[] = [
    {
      id: '1',
      title: 'PUNCH',
      description: 'Punch in/out attendance',
      icon: 'finger-print',
      route: 'punch',
      color: '#4CAF50'
    },
    {
      id: '2',
      title: 'REQUEST',
      description: 'Submit requests',
      icon: 'document-text',
      route: 'request',
      color: '#2196F3'
    }
  ];

  /* ---------- Navigation handlers ---------- */
  const handleOptionPress = async (route: string) => {
    if (loadingTab) return;
    setLoadingTab(route);
    await new Promise((res) => setTimeout(res, 300)); // mimic loading
    router.push(`/${route}`);
    setLoadingTab(null);
  };

  const handleBackPress = () => {
    router.back();
  };

  // Render attendance option
  const renderAttendanceOption = (option: AttendanceOption) => (
    <TouchableOpacity
      key={option.id}
      style={attendanceStyles.optionItem}
      onPress={() => handleOptionPress(option.route)}
      activeOpacity={0.8}
    >
      <BlurView intensity={80} tint="light" style={attendanceStyles.optionItemBlur}>
        <View style={attendanceStyles.optionItemContent}>
          <View style={[attendanceStyles.optionIconContainer, { backgroundColor: `${option.color}20` }]}>
            <Ionicons name={option.icon as any} size={36} color={option.color} />
          </View>
          <Text style={attendanceStyles.optionItemTitle}>{option.title}</Text>
          <Text style={attendanceStyles.optionItemDescription}>{option.description}</Text>
        </View>
      </BlurView>
    </TouchableOpacity>
  );

  return (
    <View style={[attendanceStyles.container, { backgroundColor: '#1a1a2e' }]}>
      {/* ---------- loading overlay ---------- */}
      {loadingTab && (
        <View style={attendanceStyles.loadingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={attendanceStyles.loadingOverlayTxt}>Loading…</Text>
        </View>
      )}

      <View style={attendanceStyles.overlay}>
        {/* Header */}
        <View style={attendanceStyles.header}>
          <TouchableOpacity
            style={attendanceStyles.backButton}
            onPress={handleBackPress}
          >
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={attendanceStyles.headerTitle}>Attendance</Text>
          <View style={attendanceStyles.placeholder} />
        </View>

        <ScrollView
          contentContainerStyle={attendanceStyles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Title Section */}
          <View style={attendanceStyles.titleSection}>
            <Text style={attendanceStyles.pageTitle}>Choose an option</Text>
            <Text style={attendanceStyles.pageSubtitle}>
              Select what you'd like to do with your attendance
            </Text>
          </View>

          {/* Options Container */}
          <View style={attendanceStyles.optionsContainer}>
            {attendanceOptions.map(renderAttendanceOption)}
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

const attendanceStyles = StyleSheet.create({
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
    zIndex: 999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingOverlayTxt: { 
    color: '#fff', 
    marginTop: 8 
  },
  container: { 
    flex: 1, 
    width: '100%', 
    height: '100%' 
  },
  overlay: { 
    flex: 1, 
    backgroundColor: 'transparent' 
  },
  
  // Header Styles
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    paddingTop: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.01)',
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  placeholder: {
    width: 40, // Same width as back button for centering
  },
  
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 30,
  },

  // Title Section Styles
  titleSection: {
    alignItems: 'center',
    marginBottom: 40,
    paddingVertical: 20,
  },
  pageTitle: {
    fontSize: 26,
    color: '#ffffff',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  pageSubtitle: {
    fontSize: 16,
    color: '#cccccc',
    textAlign: 'center',
    lineHeight: 22,
  },

  // Options Styles
 optionsContainer: {
    alignItems: 'center', // Center the items
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  optionItem: {
    width: '85%', // Consistent width for all items
    maxWidth: 320, // Maximum width to prevent items from being too wide
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  optionItemBlur: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  optionItemContent: {
    paddingVertical: 35,
    paddingHorizontal: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    alignItems: 'center',
    minHeight: 180,
    maxHeight: 180,
    justifyContent: 'center',
  },
  optionIconContainer: {
    width: 75,
    height: 75,
    borderRadius: 37.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  optionItemTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginBottom: 8,
    textAlign: 'center',
  },
  optionItemDescription: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 18,
  },
});