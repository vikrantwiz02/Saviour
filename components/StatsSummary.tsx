import { Ionicons } from "@expo/vector-icons"
import React from "react"
import { StyleSheet, Text, View } from "react-native"

export default function StatsSummary() {
  const helped = 7
  const rescued = 3
  const progress = helped / 10 // Example: 10 is next badge

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your Impact</Text>
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Ionicons name="hand-left" size={28} color="#007AFF" />
          <Text style={styles.statNum}>{helped}</Text>
          <Text style={styles.statLabel}>Times Helped</Text>
        </View>
        <View style={styles.statBox}>
          <Ionicons name="medal" size={28} color="#4caf50" />
          <Text style={styles.statNum}>{rescued}</Text>
          <Text style={styles.statLabel}>Times Rescued</Text>
        </View>
      </View>
      <View style={styles.progressBarBg}>
        <View style={[styles.progressBar, { width: `${progress * 100}%` }]} />
      </View>
      <Text style={styles.progressText}>
        {10 - helped} more to next badge!
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: "#fff", borderRadius: 12, margin: 12 },
  title: { fontWeight: "bold", fontSize: 18, marginBottom: 10 },
  statsRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16 },
  statBox: { alignItems: "center", flex: 1 },
  statNum: { fontWeight: "bold", fontSize: 22, marginTop: 4 },
  statLabel: { color: "#888", fontSize: 13 },
  progressBarBg: { height: 10, backgroundColor: "#eee", borderRadius: 5, overflow: "hidden", marginVertical: 8 },
  progressBar: { height: 10, backgroundColor: "#007AFF" },
  progressText: { textAlign: "center", color: "#888", fontSize: 13 },
})