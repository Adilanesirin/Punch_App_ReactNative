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

export default function Leads() {
  const router = useRouter();
  
  // Animation values
  const pulseValue = new Animated.Value(1);
  const bounceValue = new Animated.Value(0);
  const peopleValue = new Animated.Value(0);

  // Bounce animation
  React.useEffect(() => {
    const bounceAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(bounceValue, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(bounceValue, {
          toValue: 0,
          duration: 1000,
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

    // People animation
    const peopleAnimation = Animated.loop(
      Animated.timing(peopleValue, {
        toValue: 1,
        duration: 3000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    bounceAnimation.start();
    pulseAnimation.start();
    peopleAnimation.start();

    return () => {
      bounceAnimation.stop();
      pulseAnimation.stop();
      peopleAnimation.stop();
    };
  }, []);

  // Interpolate animations
  const bounce = bounceValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -20],
  });

  const pulse = pulseValue;
  
  const peopleScale = peopleValue.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 1.2, 1],
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
        <Text style={styles.headerTitle}>Leads Management</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {/* Animated People Icons */}
        <View style={styles.peopleContainer}>
          <Animated.View 
            style={[
              styles.person,
              { 
                transform: [
                  { translateY: bounce },
                  { scale: peopleScale }
                ] 
              }
            ]}
          >
            <Ionicons name="person" size={40} color="#9C27B0" />
          </Animated.View>
          
          <Animated.View 
            style={[
              styles.person,
              styles.personRight,
              { 
                transform: [
                  { 
                    translateY: bounceValue.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -15],
                    }) 
                  },
                  { scale: pulse }
                ] 
              }
            ]}
          >
            <Ionicons name="person" size={35} color="#E91E63" />
          </Animated.View>
          
          <Animated.View 
            style={[
              styles.person,
              styles.personLeft,
              { 
                transform: [
                  { 
                    translateY: bounceValue.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -10],
                    }) 
                  },
                  { scale: pulse }
                ] 
              }
            ]}
          >
            <Ionicons name="person" size={30} color="#673AB7" />
          </Animated.View>
        </View>

        {/* Work in Progress Text */}
        <Animated.View 
          style={[
            styles.textContainer,
            { transform: [{ scale: pulse }] }
          ]}
        >
          <Text style={styles.title}>Leads Hub Coming Soon</Text>
          <Text style={styles.subtitle}>
            Building connections that matter!
          </Text>
          <Text style={styles.description}>
            Our comprehensive leads management system is under development. 
            Soon you'll be able to track potential customers, 
            manage follow-ups, and convert leads into successful partnerships.
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
                      translateX: peopleValue.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-100, width - 100],
                      }) 
                    }
                  ] 
                }
              ]} 
            />
          </View>
          <Text style={styles.progressText}>Connecting the dots...</Text>
        </View>

        {/* Back to Home Button */}
        <TouchableOpacity 
          style={[styles.homeButton, { backgroundColor: '#9C27B0' }]}
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
  peopleContainer: {
    position: 'relative',
    marginBottom: 50,
    alignItems: 'center',
    justifyContent: 'center',
    height: 100,
  },
  person: {
    position: 'absolute',
  },
  personRight: {
    right: -40,
  },
  personLeft: {
    left: -40,
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
    color: '#9C27B0',
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
    backgroundColor: '#9C27B0',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
  },
  homeButton: {
    flexDirection: 'row',
    backgroundColor: '#9C27B0',
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