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

export default function Feeder() {
  const router = useRouter();
  
  // Animation values
  const spinValue = new Animated.Value(0);
  const pulseValue = new Animated.Value(1);
  const floatValue = new Animated.Value(0);

  // Spin animation
  React.useEffect(() => {
    const spinAnimation = Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 3000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
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

    // Float animation
    const floatAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(floatValue, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(floatValue, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    spinAnimation.start();
    pulseAnimation.start();
    floatAnimation.start();

    return () => {
      spinAnimation.stop();
      pulseAnimation.stop();
      floatAnimation.stop();
    };
  }, []);

  // Interpolate animations - FIXED: rotation values must be strings
  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'], // Must be strings with 'deg'
  });

  const pulse = pulseValue;
  
  const float = floatValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -10],
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
        <Text style={styles.headerTitle}>Feeder Management</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {/* Animated Construction Icon */}
        <Animated.View 
          style={[
            styles.iconContainer,
            { 
              transform: [
                { translateY: float },
                { scale: pulse }
              ] 
            }
          ]}
        >
          <Ionicons name="construct" size={80} color="#FF9800" />
        </Animated.View>

        {/* Spinning Gears */}
        <View style={styles.gearsContainer}>
          <Animated.View 
            style={[
              styles.gear,
              { transform: [{ rotate: spin }] }
            ]}
          >
            <Ionicons name="cog" size={40} color="#666" />
          </Animated.View>
          
          <Animated.View 
            style={[
              styles.gear,
              styles.gearSmall,
              { 
                transform: [
                  { rotate: spin },
                  { scale: 0.7 }
                ] 
              }
            ]}
          >
            <Ionicons name="cog" size={30} color="#888" />
          </Animated.View>
        </View>

        {/* Work in Progress Text */}
        <Animated.View 
          style={[
            styles.textContainer,
            { transform: [{ scale: pulse }] }
          ]}
        >
          <Text style={styles.title}>Work in Progress</Text>
          <Text style={styles.subtitle}>
            We're building something amazing for feeder management!
          </Text>
          <Text style={styles.description}>
            This feature is currently under development. 
            We're working hard to bring you the best feeder 
            management experience.
          </Text>
        </Animated.View>

        {/* Progress Bar Animation */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBackground}>
            <Animated.View 
              style={[
                styles.progressBar,
                { 
                  transform: [
                    { 
                      translateX: floatValue.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-100, width - 100],
                      }) 
                    }
                  ] 
                }
              ]} 
            />
          </View>
          <Text style={styles.progressText}>Development in progress...</Text>
        </View>

        {/* Back to Home Button */}
        <TouchableOpacity 
          style={styles.homeButton}
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
  gearsContainer: {
    position: 'relative',
    marginBottom: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gear: {
    position: 'absolute',
  },
  gearSmall: {
    top: -20,
    right: -30,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: '#00ddff',
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
    backgroundColor: '#00ddff',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
  },
  homeButton: {
    flexDirection: 'row',
    backgroundColor: '#4CAF50',
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