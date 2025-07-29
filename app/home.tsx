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
  Image,
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

interface UserProfile {
  userid: string;
  name: string;
  status: string;
  image: string;
  image_url: string;
}

interface GridItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  route: string;
  color: string;
}

export default function Home() {
  const router = useRouter();
  const { username: paramUsername } = useLocalSearchParams<{ username: string }>();

  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showProfileCard, setShowProfileCard] = useState(false);
  const [userCredentials, setUserCredentials] = useState<UserCredentials | null>(null);
  const [username, setUsername] = useState<string>('User');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [imageLoadError, setImageLoadError] = useState(false);
  const [imageLoadAttempts, setImageLoadAttempts] = useState(0);
  const [profileImageUri, setProfileImageUri] = useState<string | null>(null);

  /* ---------- loading overlay states ---------- */
  const [loadingTab, setLoadingTab] = useState<string | null>(null);

  // Grid items configuration - Updated to single Attendance item
  const gridItems: GridItem[] = [
    {
      id: '1',
      title: 'ATTENDANCE',
      description: 'Manage attendance & requests',
      icon: 'calendar',
      route: 'dashboard',
      color: '#4CAF50'
    }
  ];

  const getUserSpecificKey = (baseKey: string) => {
    return userCredentials?.userId ? `${baseKey}_${userCredentials.userId}` : baseKey;
  };

// Enhanced image URL validation and processing
const processImageUrl = (imageUrl: string): string | null => {
  if (!imageUrl) return null;
  
  const cleanUrl = imageUrl.trim();
  
  // If it's already a complete URL, use it
  if (cleanUrl.startsWith('http')) {
    return cleanUrl;
  }
  
  // If it's a relative path, make it absolute
  if (cleanUrl.startsWith('/')) {
    return `https://myimc.in${cleanUrl}`;
  }
  
  // Otherwise, assume it needs the base URL
  return `https://myimc.in/${cleanUrl}`;
};

  // Function to fetch user profile from API
  const fetchUserProfile = async () => {
    if (!userCredentials?.userId) return;
    
    try {
      console.log('Fetching user profile for userId:', userCredentials.userId);
      
      const response = await fetch('https://myimc.in/flutter/users/', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'YourAppName/1.0',
          'Accept': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('API Response received, users count:', data.length);
        
        // Find the current user's profile
        const currentUserProfile = data.find((user: UserProfile) => 
          user.userid === userCredentials.userId
        );
        
        if (currentUserProfile) {
          console.log('User profile found:', {
            name: currentUserProfile.name,
            image: currentUserProfile.image,
            image_url: currentUserProfile.image_url
          });
          
          setUserProfile(currentUserProfile);
          setUsername(currentUserProfile.name);
          
          // Process and set the image URL
          const imageUrl = currentUserProfile.image_url || currentUserProfile.image;
          const processedImageUrl = processImageUrl(imageUrl);
          
          console.log('Original image URL:', imageUrl);
          console.log('Processed image URL:', processedImageUrl);
          
          setProfileImageUri(processedImageUrl);
          setImageLoadError(false);
          setImageLoadAttempts(0);
          
          // Store the profile data locally for offline access
          const profileKey = getUserSpecificKey('user_profile');
          await AsyncStorage.setItem(profileKey, JSON.stringify(currentUserProfile));
        } else {
          console.log('User profile not found for userId:', userCredentials.userId);
        }
      } else {
        console.error('Failed to fetch user profile:', response.status, response.statusText);
        // Load from local storage if API fails
        await loadStoredUserProfile();
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      // Load from local storage if API fails
      await loadStoredUserProfile();
    }
  };

  // Function to load stored user profile
  const loadStoredUserProfile = async () => {
    if (!userCredentials?.userId) return;
    
    try {
      const profileKey = getUserSpecificKey('user_profile');
      const storedProfile = await AsyncStorage.getItem(profileKey);
      if (storedProfile) {
        const parsedProfile = JSON.parse(storedProfile);
        console.log('Loaded stored profile:', parsedProfile.name);
        
        setUserProfile(parsedProfile);
        setUsername(parsedProfile.name);
        
        // Process stored image URL
        const imageUrl = parsedProfile.image_url || parsedProfile.image;
        const processedImageUrl = processImageUrl(imageUrl);
        setProfileImageUri(processedImageUrl);
        setImageLoadError(false);
      }
    } catch (error) {
      console.error('Error loading stored user profile:', error);
    }
  };

  // Function to get stored username (fallback)
  const getStoredUsername = async () => {
    try {
      const storedUsername = await SecureStore.getItemAsync('username');
      if (storedUsername && !userProfile) {
        setUsername(storedUsername);
      }
    } catch (error) {
      console.error('Error getting stored username:', error);
    }
  };

  // Function to store username
  const storeUsername = async (name: string) => {
    try {
      await SecureStore.setItemAsync('username', name);
      setUsername(name);
    } catch (error) {
      console.error('Error storing username:', error);
    }
  };

  // Enhanced function to check login status more reliably
  const checkLoginStatus = async () => {
    try {
      const userId = await SecureStore.getItemAsync('userId');
      const password = await SecureStore.getItemAsync('password');
      
      // If both credentials exist, user should stay logged in
      if (userId && password) {
        setUserCredentials({ userId, password });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error checking login status:', error);
      // On error, assume user should stay logged in if we have any indication
      return userCredentials !== null;
    }
  };

  // Enhanced getUserCredentials with better error handling
  const getUserCredentials = async () => {
    try {
      const [uid, pwd] = await Promise.all([
        SecureStore.getItemAsync('userId'),
        SecureStore.getItemAsync('password'),
      ]);
      
      if (uid && pwd) {
        setUserCredentials({ userId: uid, password: pwd });
        // Don't redirect to login if credentials exist - stay logged in
      } else {
        // Only redirect to login if no credentials are stored at all
        router.replace('/login');
      }
    } catch (error) {
      console.error('Error getting user credentials:', error);
      // Don't redirect on error - give user benefit of doubt
      // Only redirect if we're absolutely sure there are no credentials
      try {
        const fallbackUid = await SecureStore.getItemAsync('userId');
        if (!fallbackUid) {
          router.replace('/login');
        }
      } catch (fallbackError) {
        console.error('Fallback credential check failed:', fallbackError);
      }
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // Reset image state on refresh
    setImageLoadError(false);
    setImageLoadAttempts(0);
    setProfileImageUri(null);
    fetchUserProfile().finally(() => setRefreshing(false));
  }, [userCredentials]);

  // Enhanced logout function - only logout when user explicitly chooses to
  const handleLogout = async () => {
    Alert.alert(
      'Logout', 
      'Are you sure you want to logout? You will need to enter your credentials again.', 
      [
        { 
          text: 'Cancel', 
          style: 'cancel' 
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              // Clear ALL stored credentials and data
              await Promise.all([
                SecureStore.deleteItemAsync('userId'),
                SecureStore.deleteItemAsync('password'),
                SecureStore.deleteItemAsync('username')
              ]);
              
              // Clear user profile data if exists
              if (userCredentials?.userId) {
                const profileKey = getUserSpecificKey('user_profile');
                await AsyncStorage.removeItem(profileKey);
              }
              
              // Clear any other user-specific stored data
              try {
                await AsyncStorage.multiRemove([
                  'user_profile',
                  'cached_attendance',
                  'last_sync_time'
                ]);
              } catch (clearError) {
                console.log('Some cached data could not be cleared:', clearError);
              }
              
              // Reset all state variables
              setUserCredentials(null);
              setUsername('User');
              setUserProfile(null);
              setShowProfileCard(false);
              setImageLoadError(false);
              setProfileImageUri(null);
              setImageLoadAttempts(0);
              
              // Navigate to login screen
              router.replace('/login');
              
            } catch (logoutError) {
              console.error('Error during logout:', logoutError);
              Alert.alert('Logout Error', 'There was an issue logging out. Please try again.');
            }
          },
        },
      ]
    );
  };

  /* ---------- Navigation handlers ---------- */
  const handleGridItemPress = async (route: string) => {
    if (loadingTab) return;
    setLoadingTab(route);
    await new Promise((res) => setTimeout(res, 300)); // mimic loading
    router.push(`/${route}`);
    setLoadingTab(null);
  };

  // Enhanced image error handling with retry mechanism
const handleImageError = () => {
  console.log('Image load error occurred, attempt:', imageLoadAttempts + 1);
  
  if (imageLoadAttempts < 1) { // Reduced retry attempts
    setImageLoadAttempts(prev => prev + 1);
    
    // Try alternative image URL
    if (userProfile) {
      const alternativeUrl = imageLoadAttempts === 0 
        ? userProfile.image_url || userProfile.image
        : userProfile.image || userProfile.image_url;
        
      if (alternativeUrl && alternativeUrl !== profileImageUri) {
        const processedUrl = processImageUrl(alternativeUrl);
        if (processedUrl) {
          console.log('Retrying with alternative URL:', processedUrl);
          setProfileImageUri(processedUrl);
          return;
        }
      }
    }
  }
  
  // If all retries failed, show fallback
  console.log('All image load attempts failed, showing fallback icon');
  setImageLoadError(true);
  setProfileImageUri(null);
};


const renderProfileImage = (size: number, containerStyle?: any) => {
  // Always show fallback if no URI or error occurred
  if (!profileImageUri || imageLoadError) {
    return (
      <View style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: '#e0e0e0',
          justifyContent: 'center',
          alignItems: 'center',
        },
        containerStyle
      ]}>
        <Ionicons 
          name="person-circle" 
          size={size * 0.9} 
          color="#666" 
        />
      </View>
    );
  }

  return (
    <View style={[{ width: size, height: size, borderRadius: size / 2 }, containerStyle]}>
      <Image
        source={{ uri: profileImageUri }}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
        }}
        onError={(error) => {
          console.log('Image failed to load:', error.nativeEvent?.error);
          setImageLoadError(true);
        }}
        onLoad={() => {
          console.log('Image loaded successfully');
          setImageLoadError(false);
        }}
        resizeMode="cover"
      />
    </View>
  );
};


  // Render grid item - Updated for single centered item
  const renderGridItem = (item: GridItem) => (
    <TouchableOpacity
      key={item.id}
      style={homeStyles.gridItem}
      onPress={() => handleGridItemPress(item.route)}
      activeOpacity={0.8}
    >
      <BlurView intensity={80} tint="light" style={homeStyles.gridItemBlur}>
        <View style={homeStyles.gridItemContent}>
          <View style={[homeStyles.gridIconContainer, { backgroundColor: `${item.color}20` }]}>
            <Ionicons name={item.icon as any} size={40} color={item.color} />
          </View>
          <Text style={homeStyles.gridItemTitle}>{item.title}</Text>
          <Text style={homeStyles.gridItemDescription}>{item.description}</Text>
        </View>
      </BlurView>
    </TouchableOpacity>
  );

  // Enhanced useEffect for initialization - ensuring persistent login
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // First check if we have stored credentials
        const hasCredentials = await checkLoginStatus();
        
        if (!hasCredentials) {
          // Only redirect to login if absolutely no credentials exist
          const finalCheck = await SecureStore.getItemAsync('userId');
          if (!finalCheck) {
            router.replace('/login');
          }
        }
        
        // Always try to get stored username
        await getStoredUsername();
        
        // If username is passed as parameter (from login), store it
        if (paramUsername) {
          await storeUsername(paramUsername);
        }
      } catch (error) {
        console.error('App initialization error:', error);
        // Don't redirect on initialization errors - let user stay logged in
      }
    };
    
    initializeApp();
  }, []);

  // Modified useEffect for user credentials - more persistent
  useEffect(() => {
    if (userCredentials?.userId) {
      // User has valid credentials, fetch profile and set loading to false
      fetchUserProfile();
      setIsLoading(false);
    } else {
      // Try to get credentials one more time before giving up
      getUserCredentials();
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
            {renderProfileImage(35)}
          </TouchableOpacity>
        </View>

        <ScrollView
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ffffff" />
          }
          contentContainerStyle={homeStyles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Welcome Section */}
          <View style={homeStyles.welcomeSection}>
            <Text style={homeStyles.welcomeTitle}>Welcome back,</Text>
            <Text style={homeStyles.welcomeName}>{username}</Text>
          </View>

          {/* Grid Container - Updated for single centered item */}
          <View style={homeStyles.gridContainer}>
            {gridItems.map(renderGridItem)}
          </View>
        </ScrollView>

        {/* Profile Modal */}
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
                    {profileImageUri && !imageLoadError ? (
                      <Image
                        source={{ 
                          uri: profileImageUri,
                          headers: {
                            'User-Agent': 'YourAppName/1.0',
                            'Accept': 'image/*',
                          }
                        }}
                        style={homeStyles.profileImage}
                        onError={handleImageError}
                        onLoad={() => console.log('Modal image loaded successfully')}
                        resizeMode="cover"
                      />
                    ) : (
                      <Ionicons name="person" size={40} color="#1a1a2e" />
                    )}
                  </View>
                  <Text style={homeStyles.profileName}>Hello, {username}</Text>
                </View>
                <TouchableOpacity style={homeStyles.logoutButton} onPress={handleLogout}>
                  <Ionicons name="log-out-outline" size={20} color="#fff" style={homeStyles.logoutIcon} />
                  <Text style={homeStyles.logoutText}>Logout</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            </BlurView>
          </TouchableOpacity>
        </Modal>
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
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
  },

  // Welcome Section Styles
  welcomeSection: {
    alignItems: 'center',
    marginBottom: 40,
    paddingVertical: 20,
  },
  welcomeTitle: {
    fontSize: 24,
    color: '#ffffff',
    fontWeight: '300',
    textAlign: 'center',
  },
  welcomeName: {
    fontSize: 28,
    color: '#00ddff',
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 8,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#cccccc',
    textAlign: 'center',
    marginTop: 10,
  },

  // Grid Styles - Updated for single centered item
  gridContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridItem: {
    width: '80%',
    maxWidth: 300,
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
  },
  gridItemBlur: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  gridItemContent: {
    paddingVertical: 40,
    paddingHorizontal: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    alignItems: 'center',
    minHeight: 180,
    justifyContent: 'center',
  },
  gridIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  gridItemTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginBottom: 8,
    textAlign: 'center',
  },
  gridItemDescription: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 18,
  },

  // Modal Styles
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
    overflow: 'hidden',
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
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
});