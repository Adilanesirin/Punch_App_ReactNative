import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
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

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter both userid and password.");
      return;
    }

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
          router.replace({ pathname: "/home", params: { username: name } }); // ✅ Goes to tabbed screen after login
        } else {
          Alert.alert("Login Failed", "Your account is not active.");
        }
      } else {
        Alert.alert("Login Failed", "Invalid credentials.");
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Network or server issue.");
    }
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
        >
          <View style={styles.card}>
            <Image source={logoImage} style={styles.logo} />
            <Text style={styles.title}>Welcome Back</Text>

            <TextInput
              placeholder="User ID"
              placeholderTextColor="#999"
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
            />

            <View style={styles.passwordContainer}>
              <TextInput
                placeholder="Password"
                placeholderTextColor="#999"
                style={styles.passwordInput}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons
                  name={showPassword ? "eye" : "eye-off"}
                  size={24}
                  color="#555"
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.button} onPress={handleLogin}>
              <Text style={styles.buttonText}>Login</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </ImageBackground>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  background: { flex: 1, justifyContent: "center" },
  scrollContainer: { flexGrow: 1, justifyContent: "center", padding: 30 },
  card: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 6,
  },
  logo: {
    width: 170,
    height: 100,
    resizeMode: "contain",
    alignSelf: "center",
    marginBottom: 10,
  },
  title: {
    fontSize: 25,
    textAlign: "center",
    fontWeight: "600",
    marginBottom: 40,
    color: "#333",
  },
  input: {
    backgroundColor: "#f4f6f8",
    padding: 14,
    borderRadius: 10,
    marginBottom: 20,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#ccf",
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f4f6f8",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ccf",
    paddingHorizontal: 14,
    marginBottom: 20,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
  },
  button: {
    backgroundColor: "#007bff",
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
});
