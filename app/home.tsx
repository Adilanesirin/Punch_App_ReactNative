import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function Home() {
  const router = useRouter();
  const { username } = useLocalSearchParams<{ username: string }>();
  const [activeTab, setActiveTab] = useState<"home" | "punch" | "request">("home");

  const handleLogout = () => {
    router.replace("/login");
  };

  const renderContent = () => {
    switch (activeTab) {
      case "punch":
        return <Text style={styles.tabContent}>👊 Punch Screen</Text>;
      case "request":
        return <Text style={styles.tabContent}>📥 Request Screen</Text>;
      case "home":
      default:
        return <Text style={styles.tabContent}>🏠 Welcome {username}</Text>;
    }
  };

  return (
    <View style={styles.container}>
      {/* Main Content */}
      <View style={styles.contentContainer}>{renderContent()}</View>

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

      {/* Bottom Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity onPress={() => setActiveTab("punch")}>
          <Ionicons
            name="finger-print"
            size={28}
            color={activeTab === "punch" ? "#007bff" : "#888"}
          />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setActiveTab("home")}>
          <Ionicons
            name="home"
            size={28}
            color={activeTab === "home" ? "#007bff" : "#888"}
          />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setActiveTab("request")}>
          <Ionicons
            name="document-text"
            size={28}
            color={activeTab === "request" ? "#007bff" : "#888"}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },

  contentContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },

  tabContent: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
    textAlign: "center",
  },

  logoutButton: {
    backgroundColor: "#ff4444",
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 6,
    alignSelf: "center",
    marginBottom: 10,
  },

  logoutText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },

  tabBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#ddd",
    backgroundColor: "#f8f8f8",
  },
});
