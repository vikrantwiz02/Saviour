import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const MOCK_LOGS = [
  { id: "1", action: "User Suspension", detail: "Suspended Carol Lee", time: "2025-06-18 10:15" },
  { id: "2", action: "Broadcast Sent", detail: "Sent alert to all users", time: "2025-06-17 09:00" },
  { id: "3", action: "Settings Changed", detail: "Updated emergency types", time: "2025-06-16 14:00" },
  { id: "4", action: "Warning Issued", detail: "Warned Bob Singh", time: "2025-06-15 11:30" },
];

const FILTERS = ["All", "User Suspension", "Broadcast Sent", "Settings Changed", "Warning Issued"];

export default function AuditLogScreen() {
  const colorScheme = useColorScheme() ?? "light";
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const logs = MOCK_LOGS.filter(
    log =>
      (filter === "All" || log.action === filter) &&
      (log.action.toLowerCase().includes(search.toLowerCase()) ||
        log.detail.toLowerCase().includes(search.toLowerCase()) ||
        log.time.includes(search))
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors[colorScheme].background }}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text style={s.header}>Audit Log</Text>
        <View style={s.filterRow}>
          {FILTERS.map(f => (
            <TouchableOpacity
              key={f}
              style={[s.filterBtn, filter === f && s.filterBtnActive]}
              onPress={() => setFilter(f)}
            >
              <Text style={{ color: filter === f ? "#2563eb" : "#222" }}>{f}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TextInput
          style={s.input}
          value={search}
          onChangeText={setSearch}
          placeholder="Search logs"
          placeholderTextColor="#aaa"
        />
        {logs.length === 0 && <Text style={{ color: "#888", marginTop: 20 }}>No logs found.</Text>}
        {logs.map(log => (
          <View key={log.id} style={s.logItem}>
            <MaterialCommunityIcons name="file-document" size={22} color="#2563eb" />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={{ fontWeight: "bold", color: "#222" }}>{log.action}</Text>
              <Text style={{ color: "#555", fontSize: 13 }}>{log.detail}</Text>
              <Text style={{ color: "#888", fontSize: 12 }}>{log.time}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header: { fontSize: 26, fontWeight: "bold", marginBottom: 18, color: "#2563eb" },
  filterRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  filterBtn: { backgroundColor: "#f1f5f9", borderRadius: 16, paddingHorizontal: 14, paddingVertical: 7, marginRight: 8, marginBottom: 8 },
  filterBtnActive: { backgroundColor: "#dbeafe" },
  input: { borderWidth: 1, borderColor: "#eee", borderRadius: 8, paddingHorizontal: 12, paddingVertical: Platform.OS === "ios" ? 12 : 8, fontSize: 15, color: "#222", backgroundColor: "#f8fafc", marginBottom: 8 },
  logItem: { flexDirection: "row", alignItems: "center", backgroundColor: "#f8fafc", borderRadius: 8, padding: 12, marginBottom: 10 },
});