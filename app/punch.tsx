import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function Punch() {
  const handlePunchIn = () => {
    console.log("Punch In pressed");
  };

  const handlePunchOut = () => {
    console.log("Punch Out pressed");
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={[styles.button, styles.buttonIn]} onPress={handlePunchIn}>
        <Ionicons name="log-in-outline" size={22} color="#fff" style={styles.icon} />
        <Text style={styles.buttonText}>Punch In</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.button, styles.buttonOut]} onPress={handlePunchOut}>
        <Ionicons name="log-out-outline" size={22} color="#fff" style={styles.icon} />
        <Text style={styles.buttonText}>Punch Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  button: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 10,
    marginBottom: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 3 },
  },
  buttonIn: {
    backgroundColor: "#28a745",
  },
  buttonOut: {
    backgroundColor: "#dc3545",
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  icon: {
    marginRight: 10,
  },
});
