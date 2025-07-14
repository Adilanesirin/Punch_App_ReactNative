import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";

export default function Request() {
  const router = useRouter();
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const handleBack = () => {
    router.back();
  };

  const handleSubmitRequest = () => {
    if (!selectedRequest) {
      Alert.alert("Error", "Please select a request type");
      return;
    }
    if (!reason.trim()) {
      Alert.alert("Error", "Please provide a reason for your request");
      return;
    }

    Alert.alert(
      "Request Submitted",
      `Your ${selectedRequest} request has been submitted successfully!`,
      [{ text: "OK", onPress: () => {
        setSelectedRequest(null);
        setReason("");
      }}]
    );
  };

  const requestTypes = [
    { id: "leave", title: "Leave Request", icon: "calendar-outline", color: "#007bff" },
    { id: "overtime", title: "Overtime Request", icon: "time-outline", color: "#28a745" },
    { id: "permission", title: "Permission Request", icon: "checkmark-circle-outline", color: "#ffc107" },
    { id: "other", title: "Other Request", icon: "help-circle-outline", color: "#6c757d" },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#007bff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Submit Request</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Main Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.contentContainer}>
          <Text style={styles.title}>📥 Request Management</Text>
          <Text style={styles.subtitle}>Submit your workplace requests</Text>

          {/* Request Types */}
          <View style={styles.requestTypesContainer}>
            <Text style={styles.sectionTitle}>Select Request Type</Text>
            {requestTypes.map((type) => (
              <TouchableOpacity
                key={type.id}
                style={[
                  styles.requestTypeButton,
                  selectedRequest === type.id && styles.selectedRequestType
                ]}
                onPress={() => setSelectedRequest(type.id)}
              >
                <Ionicons 
                  name={type.icon as any} 
                  size={24} 
                  color={selectedRequest === type.id ? "#fff" : type.color} 
                />
                <Text style={[
                  styles.requestTypeText,
                  selectedRequest === type.id && styles.selectedRequestTypeText
                ]}>
                  {type.title}
                </Text>
                {selectedRequest === type.id && (
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Reason Input */}
          <View style={styles.reasonContainer}>
            <Text style={styles.sectionTitle}>Reason</Text>
            <TextInput
              style={styles.reasonInput}
              placeholder="Please provide a detailed reason for your request..."
              placeholderTextColor="#999"
              multiline
              numberOfLines={4}
              value={reason}
              onChangeText={setReason}
              textAlignVertical="top"
            />
          </View>

          {/* Submit Button */}
          <TouchableOpacity 
            style={[
              styles.submitButton,
              (!selectedRequest || !reason.trim()) && styles.submitButtonDisabled
            ]}
            onPress={handleSubmitRequest}
            disabled={!selectedRequest || !reason.trim()}
          >
            <Ionicons name="paper-plane-outline" size={20} color="#fff" />
            <Text style={styles.submitButtonText}>Submit Request</Text>
          </TouchableOpacity>

          {/* Recent Requests */}
          <View style={styles.recentRequestsContainer}>
            <Text style={styles.sectionTitle}>Recent Requests</Text>
            <View style={styles.recentRequestItem}>
              <Text style={styles.recentRequestText}>No recent requests</Text>
              <Text style={styles.recentRequestDate}>Submit your first request above</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9f9f9",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    marginBottom: 30,
    textAlign: "center",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 15,
  },
  requestTypesContainer: {
    marginBottom: 30,
  },
  requestTypeButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
  },
  selectedRequestType: {
    backgroundColor: "#007bff",
  },
  requestTypeText: {
    fontSize: 16,
    color: "#333",
    marginLeft: 12,
    flex: 1,
  },
  selectedRequestTypeText: {
    color: "#fff",
  },
  reasonContainer: {
    marginBottom: 30,
  },
  reasonInput: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: "#333",
    minHeight: 100,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#28a745",
    padding: 16,
    borderRadius: 12,
    marginBottom: 30,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 3 },
  },
  submitButtonDisabled: {
    backgroundColor: "#ccc",
    elevation: 0,
    shadowOpacity: 0,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 8,
  },
  recentRequestsContainer: {
    marginBottom: 20,
  },
  recentRequestItem: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
  },
  recentRequestText: {
    fontSize: 16,
    color: "#666",
    marginBottom: 4,
  },
  recentRequestDate: {
    fontSize: 12,
    color: "#999",
  },
});