/* eslint-disable prettier/prettier */
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
    Animated,
    Dimensions,
    Easing,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

const { width, height } = Dimensions.get('window');

export default function Fuel() {
  const router = useRouter();
  
  // Animation values
  const flameValue = new Animated.Value(0);
  const pulseValue = new Animated.Value(1);
  const waveValue = new Animated.Value(0);

  // Flame animation
  React.useEffect(() => {
    const flameAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(flameValue, {
          toValue: 1,
          duration: 500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(flameValue, {
          toValue: 0,
          duration: 500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    // Pulse animation
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseValue, {
          toValue: 1.1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseValue, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    // Wave animation
    const waveAnimation = Animated.loop(
      Animated.timing(waveValue, {
        toValue: 1,
        duration: 2000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    flameAnimation.start();
    pulseAnimation.start();
    waveAnimation.start();

    return () => {
      flameAnimation.stop();
      pulseAnimation.stop();
      waveAnimation.stop();
    };
  }, []);

  // Interpolate animations
  const flameScale = flameValue.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.2],
  });

  const flameOpacity = flameValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.7, 1],
  });

  const pulse = pulseValue;
  
  const wave = waveValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Fuel Management</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {/* Animated Flame Icon */}
        <Animated.View 
          style={[
            styles.iconContainer,
            { 
              transform: [
                { scale: flameScale },
                { scale: pulse }
              ],
              opacity: flameOpacity
            }
          ]}
        >
          <Ionicons name="flame" size={80} color="#FF5722" />
        </Animated.View>

        {/* Wave Animation */}
        <View style={styles.waveContainer}>
          <Animated.View 
            style={[
              styles.wave,
              { 
                transform: [{ rotate: wave }],
              }
            ]}
          >
            <Ionicons name="water" size={50} color="#2196F3" />
          </Animated.View>
        </View>

        {/* Work in Progress Text */}
        <Animated.View 
          style={[
            styles.textContainer,
            { transform: [{ scale: pulse }] }
          ]}
        >
          <Text style={styles.title}>Fuel Station Coming Soon</Text>
          <Text style={styles.subtitle}>
            We're fueling up something great for you!
          </Text>
          <Text style={styles.description}>
            Our fuel management system is currently in development. 
            Soon you'll be able to track fuel consumption, 
            manage expenses, and optimize usage efficiently.
          </Text>
        </Animated.View>

        {/* Progress Animation */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBackground}>
            <Animated.View 
              style={[
                styles.progressBar,
                { 
                  transform: [
                    { 
                      translateX: waveValue.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-100, width - 100],
                      }) 
                    }
                  ] 
                }
              ]} 
            />
          </View>
          <Text style={styles.progressText}>Refueling our development tanks...</Text>
        </View>

        {/* Back to Home Button */}
        <TouchableOpacity 
          style={[styles.homeButton, { backgroundColor: '#FF5722' }]}
          onPress={() => router.push('/')}
        >
          <Ionicons name="home" size={20} color="#fff" style={styles.homeIcon} />
          <Text style={styles.homeButtonText}>Back to Home</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    paddingTop: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerPlaceholder: {
    width: 40,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  iconContainer: {
    marginBottom: 30,
    alignItems: 'center',
  },
  waveContainer: {
    position: 'relative',
    marginBottom: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wave: {
    position: 'absolute',
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: '#FF5722',
    textAlign: 'center',
    marginBottom: 15,
    fontWeight: '500',
  },
  description: {
    fontSize: 14,
    color: '#ccc',
    textAlign: 'center',
    lineHeight: 20,
  },
  progressContainer: {
    width: '100%',
    marginBottom: 40,
    alignItems: 'center',
  },
  progressBackground: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressBar: {
    width: 100,
    height: 6,
    backgroundColor: '#FF5722',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
  },
  homeButton: {
    flexDirection: 'row',
    backgroundColor: '#FF5722',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 160,
  },
  homeIcon: {
    marginRight: 8,
  },
  homeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});