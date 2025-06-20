import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Alert, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const MOCK_HISTORY = [
  { id: "1", message: "System maintenance at 10PM", target: "All", time: "2025-06-18 18:00" },
  { id: "2", message: "Fire drill in North region", target: "North", time: "2025-06-17 09:00" },
  { id: "3", message: "Employee meeting at 3PM", target: "Employees", time: "2025-06-16 14:00" },
];

const REGIONS = ["All", "North", "South", "East", "West"];
const ROLES = ["All", "Employees", "Users"];

export default function AdminNotificationsScreen() {
  const colorScheme = useColorScheme() ?? "light";
  const [message, setMessage] = useState("");
  const [targetRegion, setTargetRegion] = useState("All");
  const [targetRole, setTargetRole] = useState("All");
  const [schedule, setSchedule] = useState("");
  const [history, setHistory] = useState(MOCK_HISTORY);

  const sendNotification = () => {
    if (!message.trim()) {
      Alert.alert("Message required", "Please enter a notification message.");
      return;
    }
    setHistory([
      { id: Date.now().toString(), message, target: targetRegion === "All" ? targetRole : targetRegion, time: new Date().toISOString().slice(0, 16).replace("T", " ") },
      ...history,
    ]);
    setMessage("");
    setSchedule("");
    Alert.alert("Notification Sent", "Your notification has been sent (frontend only).");
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors[colorScheme].background }}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text style={s.header}>Push Notifications</Text>
        <Text style={s.sectionTitle}>Compose Notification</Text>
        <TextInput
          style={s.input}
          value={message}
          onChangeText={setMessage}
          placeholder="Enter notification message"
          placeholderTextColor={Colors[colorScheme].textMuted}
          multiline
        />
        <Text style={s.sectionTitle}>Target Region</Text>
        <View style={s.row}>
          {REGIONS.map(region => (
            <TouchableOpacity
              key={region}
              style={[s.chip, targetRegion === region && s.chipActive]}
              onPress={() => setTargetRegion(region)}
            >
              <Text style={{ color: targetRegion === region ? "#fff" : "#222" }}>{region}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={s.sectionTitle}>Target Role</Text>
        <View style={s.row}>
          {ROLES.map(role => (
            <TouchableOpacity
              key={role}
              style={[s.chip, targetRole === role && s.chipActive]}
              onPress={() => setTargetRole(role)}
            >
              <Text style={{ color: targetRole === role ? "#fff" : "#222" }}>{role}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={s.sectionTitle}>Schedule (optional)</Text>
        <TextInput
          style={s.input}
          value={schedule}
          onChangeText={setSchedule}
          placeholder="YYYY-MM-DD HH:MM"
          placeholderTextColor={Colors[colorScheme].textMuted}
        />
        <TouchableOpacity style={s.sendBtn} onPress={sendNotification}>
          <Ionicons name="send" size={20} color="#fff" />
          <Text style={s.sendBtnText}>Send Notification</Text>
        </TouchableOpacity>
        <Text style={s.sectionTitle}>History</Text>
        {history.length === 0 && <Text style={{ color: "#888" }}>No notifications sent yet.</Text>}
        {history.map(item => (
          <View key={item.id} style={s.historyItem}>
            <MaterialCommunityIcons name="bell" size={20} color={Colors[colorScheme].tint} />
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={{ fontWeight: "bold", color: Colors[colorScheme].text }}>{item.message}</Text>
              <Text style={{ color: "#888", fontSize: 12 }}>
                To: {item.target} | {item.time}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header: { fontSize: 26, fontWeight: "bold", marginBottom: 18, color: "#2563eb" },
  sectionTitle: { fontSize: 17, fontWeight: "600", marginTop: 18, marginBottom: 8, color: "#222" },
  input: { borderWidth: 1, borderColor: "#eee", borderRadius: 8, paddingHorizontal: 12, paddingVertical: Platform.OS === "ios" ? 12 : 8, fontSize: 15, color: "#222", backgroundColor: "#f8fafc", marginBottom: 8 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  chip: { backgroundColor: "#f1f5f9", borderRadius: 16, paddingHorizontal: 14, paddingVertical: 7, marginRight: 8, marginBottom: 8 },
  chipActive: { backgroundColor: "#2563eb" },
  sendBtn: { flexDirection: "row", alignItems: "center", backgroundColor: "#2563eb", borderRadius: 8, paddingVertical: 12, paddingHorizontal: 18, marginTop: 12, alignSelf: "flex-start" },
  sendBtnText: { color: "#fff", fontWeight: "bold", marginLeft: 8, fontSize: 15 },
  historyItem: { flexDirection: "row", alignItems: "center", backgroundColor: "#f1f5f9", borderRadius: 8, padding: 10, marginBottom: 8 },
});