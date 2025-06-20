import { Ionicons } from "@expo/vector-icons"
import React from "react"
import { StyleSheet, Text, View } from "react-native"

export default function OfflineBanner() {
  return (
    <View style={styles.banner} accessibilityLiveRegion="polite">
      <Ionicons name="cloud-offline" size={20} color="#fff" accessibilityLabel="Offline" />
      <Text style={styles.text}>No internet connection. Some actions are disabled.</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FF3B30",
    padding: 10,
    justifyContent: "center",
  },
  text: { color: "#fff", marginLeft: 10, fontSize: 15 },
})