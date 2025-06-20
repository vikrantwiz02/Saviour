import { Colors } from "@/constants/Colors"
import { useColorScheme } from "@/hooks/useColorScheme"
import { Alert, Linking, Modal, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native"
import { ThemedText } from "./ThemedText"
import { ThemedView } from "./ThemedView"
import { IconSymbol } from "./ui/IconSymbol"

type SOSDetailModalProps = {
  isVisible: boolean
  sosAlert: any // Replace 'any' with a proper SOSAlert type
  onClose: () => void
  onAccept: (sosId: string) => void
}

export default function SOSDetailModal({ isVisible, sosAlert, onClose, onAccept }: SOSDetailModalProps) {
  const colorScheme = useColorScheme() ?? "light"
  const s = styles(colorScheme)

  if (!sosAlert) return null

  const handleCall = () => {
    if (sosAlert.senderContact) {
      Linking.openURL(`tel:${sosAlert.senderContact}`).catch(() => Alert.alert("Error", "Could not make the call."))
    } else {
      Alert.alert("No Contact", "Sender contact information is not available.")
    }
  }

  return (
    <Modal animationType="slide" transparent={true} visible={isVisible} onRequestClose={onClose}>
      <View style={s.modalOverlay}>
        <ThemedView style={s.modalContent}>
          <View style={s.modalHeader}>
            <ThemedText style={s.modalTitleText}>SOS Alert Details</ThemedText>
            <TouchableOpacity onPress={onClose}>
              <IconSymbol name="xmark" size={24} color={Colors[colorScheme].text} />
            </TouchableOpacity>
          </View>
          <ScrollView>
            <View style={s.detailItem}>
              <IconSymbol name="exclamationmark.triangle.fill" size={20} color={Colors[colorScheme].icon} />
              <ThemedText style={s.detailLabel}>Type:</ThemedText>
              <ThemedText style={s.detailValue}>{sosAlert.emergencyType}</ThemedText>
            </View>
            <View style={s.detailItem}>
              <IconSymbol name="text.bubble.fill" size={20} color={Colors[colorScheme].icon} />
              <ThemedText style={s.detailLabel}>Description:</ThemedText>
              <ThemedText style={s.detailValue}>{sosAlert.description || "No description provided."}</ThemedText>
            </View>
            {sosAlert.senderName && (
              <View style={s.detailItem}>
                <IconSymbol name="person.fill" size={20} color={Colors[colorScheme].icon} />
                <ThemedText style={s.detailLabel}>Sender:</ThemedText>
                <ThemedText style={s.detailValue}>{sosAlert.senderName}</ThemedText>
              </View>
            )}
            <View style={s.detailItem}>
              <IconSymbol name="clock.fill" size={20} color={Colors[colorScheme].icon} />
              <ThemedText style={s.detailLabel}>Time:</ThemedText>
              <ThemedText style={s.detailValue}>{new Date(sosAlert.timestamp).toLocaleTimeString()}</ThemedText>
            </View>
            <View style={s.detailItem}>
              <IconSymbol name="bolt.horizontal.circle.fill" size={20} color={Colors[colorScheme].icon} />
              <ThemedText style={s.detailLabel}>Urgency:</ThemedText>
              <ThemedText
                style={[
                  s.detailValue,
                  { color: sosAlert.urgency === "High" ? "red" : sosAlert.urgency === "Medium" ? "orange" : "green" },
                ]}
              >
                {sosAlert.urgency}
              </ThemedText>
            </View>
          </ScrollView>

          <View style={s.actionsContainer}>
            {sosAlert.senderContact && (
              <TouchableOpacity style={[s.actionButton, s.callButton]} onPress={handleCall}>
                <IconSymbol name="phone.fill" size={18} color={Colors.dark.text} />
                <ThemedText style={s.actionButtonText}>Call Sender</ThemedText>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[s.actionButton, s.acceptButton]} onPress={() => onAccept(sosAlert.id)}>
              <IconSymbol name="hand.raised.fill" size={18} color={Colors.dark.text} />
              <ThemedText style={s.actionButtonText}>Accept & Respond</ThemedText>
            </TouchableOpacity>
          </View>
        </ThemedView>
      </View>
    </Modal>
  )
}

const styles = (colorScheme: "light" | "dark") =>
  StyleSheet.create({
    modalOverlay: {
      flex: 1,
      justifyContent: "flex-end",
      backgroundColor: "rgba(0,0,0,0.5)",
    },
    modalContent: {
      backgroundColor: Colors[colorScheme].background,
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 30,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: "60%",
    },
    modalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 20,
    },
    modalTitleText: {
      fontSize: 20,
      fontWeight: "bold",
    },
    detailItem: {
      flexDirection: "row",
      alignItems: "flex-start", // Align items to start for multiline descriptions
      marginBottom: 15,
      paddingVertical: 5,
    },
    detailLabel: {
      fontSize: 16,
      fontWeight: "600",
      marginLeft: 10,
      marginRight: 5,
      color: Colors[colorScheme].text,
    },
    detailValue: {
      fontSize: 16,
      flex: 1, // Allow text to wrap
      color: Colors[colorScheme].textMuted,
    },
    actionsContainer: {
      marginTop: 20,
      flexDirection: "column",
      gap: 10,
    },
    actionButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 15,
      borderRadius: 8,
    },
    callButton: {
      backgroundColor: Colors[colorScheme].tint, // Or a specific call color like green
    },
    acceptButton: {
      backgroundColor: "#FF3B30", // SOS Red
    },
    actionButtonText: {
      color: Colors.dark.text,
      fontSize: 16,
      fontWeight: "bold",
      marginLeft: 8,
    },
  })
