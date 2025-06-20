import React from "react"
import { FlatList, StyleSheet, Text, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

const notifications = [
  { id: "1", message: "SOS request resolved.", time: "2 min ago" },
  { id: "2", message: "New emergency nearby.", time: "10 min ago" },
]

export default function NotificationCenter() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <Text style={styles.title}>Notifications</Text>
      <FlatList
        data={notifications}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <Text style={styles.message}>{item.message}</Text>
            <Text style={styles.time}>{item.time}</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No notifications</Text>}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff", padding: 24 },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 20 },
  item: { marginBottom: 16 },
  message: { fontSize: 16 },
  time: { fontSize: 12, color: "#888" },
  empty: { color: "#888", textAlign: "center", marginTop: 40 },
})