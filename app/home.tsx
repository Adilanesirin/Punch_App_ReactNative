/* eslint-disable prettier/prettier */
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
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

  const [isInitializing, setIsInitializing] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showProfileCard, setShowProfileCard] = useState(false);
  const [userCredentials, setUserCredentials] = useState<UserCredentials | null>(null);
  const [username, setUsername] = useState<string>('User');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [imageLoadError, setImageLoadError] = useState(false);
  const [profileImageUri, setProfileImageUri] = useState<string | null>(null);
  const [loadingTab, setLoadingTab] = useState<string | null>(null);
  const [isImageLoading, setIsImageLoading] = useState(false);

  // Grid items configuration
  const gridItems: GridItem[] = [
    {
      id: '1',
      title: 'ATTENDANCE',
      description: 'Manage attendance & requests',
      icon: 'calendar',
      route: 'dashboard',
      color: '#4CAF50'
    },
    {
      id: '2',
      title: 'COLLECTION',
      description:'Manage your collections',
      icon:'cash',
      route:'collection',
      color: '#FF9800'
    },
    {
      id: '3',
      title: 'FEEDER',
      description: 'Manage feeder operations',
      icon: 'flash',
      route: 'feeder',
      color: '#2196F3'
    },
    {
      id: '4',
      title: 'FUEL',
      description: 'Fuel management & tracking',
      icon: 'flame',
      route: 'fuel',
      color: '#FF5722'
    },
    {
      id: '5',
      title: 'LEADS',
      description: 'Manage customer leads',
      icon: 'people',
      route: 'leads',
      color: '#9C27B0'
    },
    {
      id: '6',
      title: 'TARGET',
      description: 'Track targets & goals',
      icon: 'trending-up',
      route: 'target',
      color: '#009688'
    },
  ];

  const getUserSpecificKey = (baseKey: string) => {
    return userCredentials?.userId ? `${baseKey}_${userCredentials.userId}` : baseKey;
  };

  // Enhanced image URL validation and processing
  const processImageUrl = (imageUrl: string): string | null => {
    if (!imageUrl) return null;
    
    const cleanUrl = imageUrl.trim();
    
    if (cleanUrl.startsWith('http')) {
      return cleanUrl;
    }
    
    if (cleanUrl.startsWith('/')) {
      return `https://myimc.in${cleanUrl}`;
    }
    
    return `https://myimc.in/${cleanUrl}`;
  };

  // Function to handle profile image loading
  const handleProfileImageLoading = async (userProfile: UserProfile) => {
    if (!userCredentials?.userId) return;

    const imageUrl = userProfile.image_url || userProfile.image;
    const processedImageUrl = processImageUrl(imageUrl);
    
    if (processedImageUrl) {
      console.log('Setting profile image URL:', processedImageUrl);
      setProfileImageUri(processedImageUrl);
      setImageLoadError(false);
    } else {
      console.log('No valid image URL found');
      setImageLoadError(true);
      setProfileImageUri(null);
    }
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
          
          await handleProfileImageLoading(currentUserProfile);
          
          const profileKey = getUserSpecificKey('user_profile');
          await AsyncStorage.setItem(profileKey, JSON.stringify(currentUserProfile));
        } else {
          console.log('User profile not found for userId:', userCredentials.userId);
          await loadStoredUserProfile();
        }
      } else {
        console.error('Failed to fetch user profile:', response.status, response.statusText);
        await loadStoredUserProfile();
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
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
        
        await loadCachedImage(userCredentials.userId);
      }
    } catch (error) {
      console.error('Error loading stored user profile:', error);
    }
  };

  // Enhanced function to check login status and get credentials
  const initializeUser = async () => {
    try {
      const [userId, password, storedUsername] = await Promise.all([
        SecureStore.getItemAsync('userId'),
        SecureStore.getItemAsync('password'),
        SecureStore.getItemAsync('username')
      ]);
      console.log(userId, password, storedUsername)
      if (userId && password) {
        setUserCredentials({ userId, password });
        if (storedUsername) {
          setUsername(storedUsername);
        }
        return true;
      } else {
        console.log('No credentials found, redirecting to login');
        router.replace('/login');
        return false;
      }
    } catch (error) {
      console.error('Error initializing user:', error);
      router.replace('/login');
      return false;
    }
  };

  // Function to clear cached image
  const clearCachedImage = async (userId: string) => {
    try {
      const imageMetadataKey = `profile_image_metadata_${userId}`;
      await AsyncStorage.removeItem(imageMetadataKey);
      console.log('Cached image metadata cleared');
    } catch (error) {
      console.error('Error clearing cached image metadata:', error);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setImageLoadError(false);
    setProfileImageUri(null);
    
    if (userCredentials?.userId) {
      await clearCachedImage(userCredentials.userId);
    }
    
    fetchUserProfile().finally(() => setRefreshing(false));
  }, [userCredentials]);

  // Enhanced logout function
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
              if (userCredentials?.userId) {
                await clearCachedImage(userCredentials.userId);
              }
              
              await Promise.all([
                SecureStore.deleteItemAsync('userId'),
                SecureStore.deleteItemAsync('password'),
                SecureStore.deleteItemAsync('username')
              ]);
              
              if (userCredentials?.userId) {
                const profileKey = getUserSpecificKey('user_profile');
                await AsyncStorage.removeItem(profileKey);
              }
              
              try {
                await AsyncStorage.multiRemove([
                  'user_profile',
                  'cached_attendance',
                  'last_sync_time'
                ]);
              } catch (clearError) {
                console.log('Some cached data could not be cleared:', clearError);
              }
              
              setUserCredentials(null);
              setUsername('User');
              setUserProfile(null);
              setShowProfileCard(false);
              setImageLoadError(false);
              setProfileImageUri(null);
              setIsImageLoading(false);
              
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

  // Navigation handlers
  const handleGridItemPress = async (route: string) => {
    if (loadingTab) return;
    setLoadingTab(route);
    await new Promise((res) => setTimeout(res, 300));
    router.push(`/${route}`);
    setLoadingTab(null);
  };

  const renderProfileImage = (size: number, containerStyle?: any) => {
    if (isImageLoading) {
      return (
        <View style={[{
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: '#e0e0e0',
            justifyContent: 'center',
            alignItems: 'center',
          },
          containerStyle
        ]}>
          <ActivityIndicator size="small" color="#666" />
        </View>
      );
    }

    if (!profileImageUri || imageLoadError) {
      return (
        <View style={[{
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

  // Render grid item
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
            <Ionicons name={item.icon as any} size={26} color={item.color} />
          </View>
          <Text style={homeStyles.gridItemTitle}>{item.title}</Text>
          <Text style={homeStyles.gridItemDescription}>{item.description}</Text>
        </View>
      </BlurView>
    </TouchableOpacity>
  );

  // MAIN INITIALIZATION EFFECT
  useEffect(() => {
    const init = async () => {
      const hasCredentials = await initializeUser();
      setIsInitializing(false);
    };
    
    init();
  }, []);

  // FETCH PROFILE EFFECT
  useEffect(() => {
    if (userCredentials?.userId && !isInitializing) {
      fetchUserProfile();
    }
  }, [userCredentials, isInitializing]);

  if (isInitializing) {
    return (
      <View style={[homeStyles.container, homeStyles.loadingContainer]}>
        <ActivityIndicator size="large" color="#ffffff" />
        <Text style={homeStyles.loadingText}>Initializing...</Text>
      </View>
    );
  }

  if (!userCredentials) {
    return (
      <View style={[homeStyles.container, homeStyles.loadingContainer]}>
        <ActivityIndicator size="large" color="#ffffff" />
        <Text style={homeStyles.loadingText}>Redirecting to login...</Text>
      </View>
    );
  }

  return (
    <View style={[homeStyles.container, { backgroundColor: '#1a1a2e' }]}>
      {/* Loading overlay */}
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

          {/* Grid Container */}
          <View style={homeStyles.gridContainer}>
            <View style={homeStyles.gridRow}>
              {gridItems.slice(0, 2).map(renderGridItem)}
            </View>
            <View style={homeStyles.gridRow}>
              {gridItems.slice(2, 4).map(renderGridItem)}
            </View>
            <View style={homeStyles.gridRow}>
              {gridItems.slice(4, 6).map(renderGridItem)}
            </View>
          </View>

          {/* Footer */}
          <View style={homeStyles.footer}>
            <Text style={homeStyles.footerText}>Powered by IMC Business Solutions</Text>
            <Text style={homeStyles.footerVersion}>v3.1</Text>
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
                    {renderProfileImage(80)}
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
    paddingHorizontal: 12,
    paddingTop: 20,
    paddingBottom: 30,
  },

  // Welcome Section Styles
  welcomeSection: {
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 10,
  },
  welcomeTitle: {
    fontSize: 20,
    color: '#ffffff',
    fontWeight: '300',
    textAlign: 'center',
  },
  welcomeName: {
    fontSize: 22,
    color: '#00ddff',
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 4,
  },

  // Grid Styles
  gridContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 8,
  },
  gridItem: {
    width: '48%',
    height: 150,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: 'rgba(13, 193, 233, 0.93)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  gridItemBlur: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    flex: 1,
  },
  gridItemContent: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  gridIconContainer: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  gridItemTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginBottom: 3,
    textAlign: 'center',
  },
  gridItemDescription: {
    fontSize: 10,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 12,
  },

  // Footer Styles
  footer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingTop: 30,
    marginTop: 10,
  },
  footerText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    fontWeight: '400',
  },
  footerVersion: {
    fontSize: 17,
    color: 'rgba(255, 255, 255, 0.4)',
    textAlign: 'center',
    marginTop: 4,
    fontWeight: '300',
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