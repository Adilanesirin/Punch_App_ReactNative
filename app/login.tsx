// app/login.tsx (Fixed version with credential storage)
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as SecureStore from 'expo-secure-store';
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import logoImage from "../assets/images/imclogo.png";
import bgImage from "../assets/images/login_bg.jpg";

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter both userid and password.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("https://myimc.in/flutter/login/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userid: email, password }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.status === "active") {
          const name = data.name || "User";
          
          // Store credentials in SecureStore after successful login
          try {
            await SecureStore.setItemAsync('userId', email);
            await SecureStore.setItemAsync('password', password);
            console.log('Credentials saved successfully');
          } catch (error) {
            console.error('Error saving credentials:', error);
            Alert.alert('Warning', 'Login successful but failed to save credentials locally');
          }
          
          // Navigate to home screen (no tabs) and pass username
          router.replace({ 
            pathname: "/home", 
            params: { username: name } 
          });
        } else {
          Alert.alert("Login Failed", "Your account is not active.");
        }
      } else {
        Alert.alert("Login Failed", "Invalid credentials.");
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Network or server issue.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    Alert.alert(
      "Forgot Password",
      "Please contact your administrator to reset your password.",
      [{ text: "OK", style: "default" }]
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.select({ ios: "padding", android: undefined })}
    >
      <ImageBackground source={bgImage} style={styles.background} resizeMode="cover">
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <Image source={logoImage} style={styles.logo} />
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in to your account</Text>

            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                placeholder="User ID"
                placeholderTextColor="#999"
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                editable={!isLoading}
                returnKeyType="next"
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                placeholder="Password"
                placeholderTextColor="#999"
                style={styles.passwordInput}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                editable={!isLoading}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />
              <TouchableOpacity 
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeIcon}
              >
                <Ionicons
                  name={showPassword ? "eye" : "eye-off"}
                  size={20}
                  color="#666"
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={styles.forgotPasswordButton}
              onPress={handleForgotPassword}
            >
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.loginButton, isLoading && styles.loginButtonDisabled]} 
              onPress={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Text style={styles.loginButtonText}>Login</Text>
                  <Ionicons name="arrow-forward" size={20} color="#fff" style={styles.loginIcon} />
                </>
              )}
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={styles.footerText}>
                Secure login powered by IMC
              </Text>
            </View>
          </View>
        </ScrollView>
      </ImageBackground>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1 
  },
  background: { 
    flex: 1, 
    justifyContent: "center" 
  },
  scrollContainer: { 
    flexGrow: 1, 
    justifyContent: "center", 
    padding: 20 
  },
  card: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 20,
    padding: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 8,
    marginHorizontal: 5,
  },
  logo: {
    width: 180,
    height: 110,
    resizeMode: "contain",
    alignSelf: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    textAlign: "center",
    fontWeight: "700",
    marginBottom: 8,
    color: "#2c3e50",
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    color: "#7f8c8d",
    marginBottom: 32,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e9ecef",
    paddingHorizontal: 16,
    marginBottom: 16,
    height: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#2c3e50",
  },
  passwordInput: {
    flex: 1,
    fontSize: 16,
    color: "#2c3e50",
  },
  eyeIcon: {
    padding: 4,
  },
  forgotPasswordButton: {
    alignSelf: "flex-end",
    marginBottom: 24,
  },
  forgotPasswordText: {
    color: "#007bff",
    fontSize: 14,
    fontWeight: "600",
  },
  loginButton: {
    backgroundColor: "#007bff",
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    shadowColor: "#007bff",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  loginButtonDisabled: {
    backgroundColor: "#adb5bd",
    shadowOpacity: 0,
    elevation: 0,
  },
  loginButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    marginRight: 8,
  },
  loginIcon: {
    marginLeft: 4,
  },
  footer: {
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#e9ecef",
  },
  footerText: {
    textAlign: "center",
    color: "#6c757d",
    fontSize: 12,
    fontWeight: "500",
  },
});