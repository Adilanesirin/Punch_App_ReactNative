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

export default function Target() {
  const router = useRouter();
  
  // Animation values
  const pulseValue = new Animated.Value(1);
  const growValue = new Animated.Value(0);
  const arrowValue = new Animated.Value(0);

  // Grow animation
  React.useEffect(() => {
    const growAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(growValue, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(growValue, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    // Pulse animation
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseValue, {
          toValue: 1.2,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseValue, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    // Arrow animation
    const arrowAnimation = Animated.loop(
      Animated.timing(arrowValue, {
        toValue: 1,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    growAnimation.start();
    pulseAnimation.start();
    arrowAnimation.start();

    return () => {
      growAnimation.stop();
      pulseAnimation.stop();
      arrowAnimation.stop();
    };
  }, []);

  // Interpolate animations
  const grow = growValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 1.2],
  });

  const pulse = pulseValue;
  
  const arrowMove = arrowValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 20],
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
        <Text style={styles.headerTitle}>Target Tracking</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {/* Animated Target Icon */}
        <Animated.View 
          style={[
            styles.iconContainer,
            { 
              transform: [
                { scale: grow },
                { scale: pulse }
              ] 
            }
          ]}
        >
          <Ionicons name="trending-up" size={80} color="#009688" />
        </Animated.View>

        {/* Arrow Animation */}
        <View style={styles.arrowContainer}>
          <Animated.View 
            style={[
              styles.arrow,
              { 
                transform: [
                  { translateY: arrowMove }
                ] 
              }
            ]}
          >
            <Ionicons name="arrow-up" size={40} color="#4CAF50" />
          </Animated.View>
        </View>

        {/* Work in Progress Text */}
        <Animated.View 
          style={[
            styles.textContainer,
            { transform: [{ scale: pulse }] }
          ]}
        >
          <Text style={styles.title}>Target Dashboard Coming Soon</Text>
          <Text style={styles.subtitle}>
            Aiming for your success!
          </Text>
          <Text style={styles.description}>
            Our target tracking system is currently in development. 
            Soon you'll be able to set goals, track progress, 
            visualize achievements, and optimize your performance strategies.
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
                      translateX: arrowValue.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-100, width - 100],
                      }) 
                    }
                  ] 
                }
              ]} 
            />
          </View>
          <Text style={styles.progressText}>Raising the bar...</Text>
        </View>

        {/* Back to Home Button */}
        <TouchableOpacity 
          style={[styles.homeButton, { backgroundColor: '#009688' }]}
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
  arrowContainer: {
    position: 'relative',
    marginBottom: 40,
    alignItems: 'center',
    justifyContent: 'center',
    height: 60,
  },
  arrow: {
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
    color: '#009688',
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
    backgroundColor: '#009688',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
  },
  homeButton: {
    flexDirection: 'row',
    backgroundColor: '#009688',
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