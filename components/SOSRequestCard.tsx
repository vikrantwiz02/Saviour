import { ThemedText } from "@/components/ThemedText"
import { ThemedView } from "@/components/ThemedView"
import { Colors } from "@/constants/Colors"
import { useColorScheme } from "@/hooks/useColorScheme"
import { StyleSheet, TouchableOpacity, View } from "react-native"
import { IconSymbol } from "./ui/IconSymbol"

export type SOSRequest = {
  id: string
  senderName?: string
  emergencyType: string
  distance: string
  urgency: "High" | "Medium" | "Low"
  timestamp: string // For display
  description?: string
}

type SOSRequestCardProps = {
  request: SOSRequest
  onRespond: (id: string) => void
}

const urgencyColors = {
  High: "#FF3B30", // Red
  Medium: "#FF9500", // Orange
  Low: "#34C759", // Green
}

export default function SOSRequestCard({ request, onRespond }: SOSRequestCardProps) {
  const colorScheme = useColorScheme() ?? "light"
  const s = styles(colorScheme)

  return (
    <ThemedView style={s.card}>
      <View style={s.header}>
        <View style={s.headerTextContainer}>
          <ThemedText style={s.emergencyType}>{request.emergencyType}</ThemedText>
          {request.senderName && <ThemedText style={s.senderName}>From: {request.senderName}</ThemedText>}
        </View>
        <View style={[s.urgencyIndicator, { backgroundColor: urgencyColors[request.urgency] }]}>
          <ThemedText style={s.urgencyText}>{request.urgency}</ThemedText>
        </View>
      </View>

      {request.description && (
        <ThemedText style={s.description} numberOfLines={2}>
          {request.description}
        </ThemedText>
      )}

      <View style={s.footer}>
        <View style={s.infoItem}>
          <IconSymbol name="location.fill" size={16} color={Colors[colorScheme].icon} />
          <ThemedText style={s.infoText}>{request.distance}</ThemedText>
        </View>
        <View style={s.infoItem}>
          <IconSymbol name="clock.fill" size={16} color={Colors[colorScheme].icon} />
          <ThemedText style={s.infoText}>{request.timestamp}</ThemedText>
        </View>
      </View>

      <TouchableOpacity style={s.respondButton} onPress={() => onRespond(request.id)}>
        <IconSymbol name="hand.raised.fill" size={18} color={Colors.dark.text} />
        <ThemedText style={s.respondButtonText}>Respond</ThemedText>
      </TouchableOpacity>
    </ThemedView>
  )
}

const styles = (colorScheme: "light" | "dark" = "light") =>
  StyleSheet.create({
    card: {
      borderRadius: 12,
      padding: 15,
      marginBottom: 15,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
      backgroundColor: Colors[colorScheme].inputBackground, // Slightly different from main background
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: 10,
    },
    headerTextContainer: {
      flex: 1,
    },
    emergencyType: {
      fontSize: 18,
      fontWeight: "bold",
      color: Colors[colorScheme].text,
    },
    senderName: {
      fontSize: 13,
      color: Colors[colorScheme].textMuted,
      marginTop: 2,
    },
    urgencyIndicator: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 15, // Pill shape
      marginLeft: 10,
    },
    urgencyText: {
      color: "#FFFFFF",
      fontSize: 12,
      fontWeight: "bold",
    },
    description: {
      fontSize: 14,
      color: Colors[colorScheme].text,
      marginBottom: 12,
      lineHeight: 20,
    },
    footer: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      borderTopWidth: 1,
      borderTopColor: Colors[colorScheme].border,
      paddingTop: 10,
      marginTop: 5,
    },
    infoItem: {
      flexDirection: "row",
      alignItems: "center",
    },
    infoText: {
      fontSize: 13,
      color: Colors[colorScheme].textMuted,
      marginLeft: 5,
    },
    respondButton: {
      flexDirection: "row",
      backgroundColor: Colors[colorScheme].tint,
      paddingVertical: 12,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 15,
    },
    respondButtonText: {
      color: Colors.dark.text, // Assuming dark text on tint background
      fontSize: 16,
      fontWeight: "bold",
      marginLeft: 8,
    },
  })
