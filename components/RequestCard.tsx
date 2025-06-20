import { Colors } from "@/constants/Colors"
import { useColorScheme } from "@/hooks/useColorScheme"
import { StyleSheet, TouchableOpacity, View } from "react-native"
import { ThemedText } from "./ThemedText"
import { ThemedView } from "./ThemedView"
import { IconSymbol } from "./ui/IconSymbol"

type TimelineAction = {
  action: string
  time: Date
}

export type UserRequest = {
  id: string
  type: "SOS Sent" | "Responded To"
  emergencyType: string
  timestamp: Date
  status: "Pending" | "Responder En Route" | "Assistance Provided" | "Completed" | "Cancelled"
  timeline: TimelineAction[]
  otherPartyName?: string
  chatId: string
}

type RequestCardProps = {
  request: UserRequest
  onOpenChat: (chatId: string) => void
}

const getStatusColor = (status: UserRequest["status"]) => {
  switch (status) {
    case "Pending":
      return "orange"
    case "Responder En Route":
      return "blue"
    case "Assistance Provided":
      return "green"
    case "Completed":
      return "gray"
    case "Cancelled":
      return "red"
    default:
      return "gray"
  }
}

export default function RequestCard({ request, onOpenChat }: RequestCardProps) {
  const colorScheme = useColorScheme() ?? "light"
  const s = styles(colorScheme)

  return (
    <ThemedView style={s.card}>
      <View style={s.header}>
        <View>
          <ThemedText style={s.emergencyType}>
            {request.emergencyType} ({request.type})
          </ThemedText>
          <ThemedText style={s.timestamp}>
            {request.timestamp.toLocaleDateString()} - {request.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </ThemedText>
        </View>
        <View style={[s.statusBadge, { backgroundColor: getStatusColor(request.status) }]}>
          {request.status === "Responder En Route" && <View style={s.animatedDot} />}
          <ThemedText style={s.statusText}>{request.status}</ThemedText>
        </View>
      </View>

      {request.otherPartyName && (
        <ThemedText style={s.otherParty}>
          {request.type === "SOS Sent" ? "Responder: " : "Sender: "}
          {request.otherPartyName}
        </ThemedText>
      )}

      <View style={s.timelineContainer}>
        <ThemedText style={s.timelineTitle}>Timeline:</ThemedText>
        {request.timeline.slice(0, 2).map((action, index) => (
          <View key={index} style={s.timelineItem}>
            <IconSymbol name="circle.fill" size={8} color={Colors[colorScheme].icon} style={s.timelineDot} />
            <ThemedText style={s.timelineAction}>{action.action}</ThemedText>
            <ThemedText style={s.timelineTime}>
              {action.time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </ThemedText>
          </View>
        ))}
        {request.timeline.length > 2 && <ThemedText style={s.timelineMore}>...and more</ThemedText>}
      </View>

      <TouchableOpacity style={s.chatButton} onPress={() => onOpenChat(request.chatId)} activeOpacity={0.85}>
        <IconSymbol name="message.fill" size={18} color="#fff" />
        <ThemedText style={s.chatButtonText}>Open Chat</ThemedText>
      </TouchableOpacity>
    </ThemedView>
  )
}

const styles = (colorScheme: "light" | "dark") =>
  StyleSheet.create({
    card: {
      borderRadius: 12,
      padding: 15,
      marginBottom: 15,
      backgroundColor: Colors[colorScheme].inputBackground,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 2,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: 10,
    },
    emergencyType: {
      fontSize: 17,
      fontWeight: "bold",
    },
    timestamp: {
      fontSize: 12,
      color: Colors[colorScheme].textMuted,
      marginTop: 2,
    },
    statusBadge: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 15,
      flexDirection: "row",
      alignItems: "center",
    },
    statusText: {
      color: "#FFFFFF",
      fontSize: 12,
      fontWeight: "bold",
    },
    animatedDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: "white",
      marginRight: 5,
      opacity: 0.7,
    },
    otherParty: {
      fontSize: 14,
      color: Colors[colorScheme].text,
      marginBottom: 10,
      fontWeight: "500",
    },
    timelineContainer: {
      marginTop: 5,
      marginBottom: 15,
      borderTopWidth: 1,
      borderTopColor: Colors[colorScheme].border,
      paddingTop: 10,
    },
    timelineTitle: {
      fontSize: 14,
      fontWeight: "600",
      marginBottom: 5,
    },
    timelineItem: {
      flexDirection: "row",
      alignItems: "center",
      marginLeft: 5,
      marginBottom: 3,
    },
    timelineDot: {
      marginRight: 8,
    },
    timelineAction: {
      fontSize: 13,
      color: Colors[colorScheme].text,
      flex: 1,
    },
    timelineTime: {
      fontSize: 12,
      color: Colors[colorScheme].textMuted,
    },
    timelineMore: {
      fontSize: 12,
      color: Colors[colorScheme].textMuted,
      marginLeft: 20,
      fontStyle: "italic",
    },
    chatButton: {
      flexDirection: "row",
      backgroundColor: Colors[colorScheme].tint,
      paddingVertical: 12,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 5,
    },
    chatButtonText: {
      color: "#fff",
      fontSize: 16,
      fontWeight: "bold",
      marginLeft: 8,
    },
  })