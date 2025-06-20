import { Ionicons } from "@expo/vector-icons"
import React from "react"
import { StyleSheet, Text, View } from "react-native"

const mockHistory = [
  { id: "1", type: "Medical", status: "Resolved", timestamp: "2024-06-01 10:00" },
  { id: "2", type: "Fire", status: "Pending", timestamp: "2024-06-10 14:30" },
  { id: "3", type: "Accident", status: "Resolved", timestamp: "2024-06-15 09:20" },
]

export default function HelpHistory() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Help History</Text>
      {mockHistory.map(item => (
        <View style={styles.itemRow} key={item.id}>
          <Ionicons
            name={item.type === "Medical" ? "medkit" : item.type === "Fire" ? "flame" : "car"}
            size={22}
            color="#007AFF"
            style={{ marginRight: 10 }}
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.type}>{item.type}</Text>
            <Text style={styles.timestamp}>{item.timestamp}</Text>
          </View>
          <Text style={[styles.status, { color: item.status === "Resolved" ? "#4caf50" : "#ff9800" }]}>
            {item.status}
          </Text>
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: "#fff", borderRadius: 12, margin: 12 },
  title: { fontWeight: "bold", fontSize: 18, marginBottom: 10 },
  itemRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  type: { fontWeight: "bold", fontSize: 15 },
  timestamp: { color: "#888", fontSize: 12 },
  status: { fontWeight: "bold", marginLeft: 10 },
})