import { Colors } from "@/constants/Colors"
import { useColorScheme } from "@/hooks/useColorScheme"
import { Alert, Linking, Modal, ScrollView, StyleSheet, TouchableOpacity, View, ActivityIndicator } from "react-native"
import { ThemedText } from "@/components/ThemedText"
import { ThemedView } from "@/components/ThemedView"
import { IconSymbol } from "@/components/ui/IconSymbol"
import { getAuth } from "firebase/auth"
import { db } from "@/lib/firebase"
import { doc, updateDoc, getDoc, serverTimestamp, addDoc, collection } from "firebase/firestore"
import React, { useState } from "react"

type SOSDetailModalProps = {
  isVisible: boolean
  sosAlert: any // Replace 'any' with a proper SOSAlert type
  onClose: () => void
  onAccept: (sosId: string) => void
}

export default function SOSDetailModal({ isVisible, sosAlert, onClose, onAccept }: SOSDetailModalProps) {
  const colorScheme = useColorScheme() ?? "light"
  const s = styles(colorScheme)
  const [loading, setLoading] = useState(false)

  if (!sosAlert) return null

  // Get current user UID
  const currentUser = getAuth().currentUser
  const currentUid = currentUser?.uid

  const handleCall = () => {
    if (sosAlert.senderContact) {
      Linking.openURL(`tel:${sosAlert.senderContact}`).catch(() => Alert.alert("Error", "Could not make the call."))
    } else {
      Alert.alert("No Contact", "Sender contact information is not available.")
    }
  }

  // Only show Accept & Respond if current user is NOT the sender
  const showAcceptButton = sosAlert.userId && currentUid && sosAlert.userId !== currentUid

  // Accept & Respond logic
  const handleAcceptRespond = async () => {
  if (loading) return;
  setLoading(true);
  try {
    console.log("Attempting to respond to SOS:", sosAlert.id);

    if (!currentUser) {
      Alert.alert("Error", "You must be logged in to respond.");
      setLoading(false);
      return;
    }

    // Check if SOS document exists
    const sosDocRef = doc(db, "sos_requests", sosAlert.id);
    console.log("Getting SOS doc ref:", sosDocRef.path);
    const sosDocSnap = await getDoc(sosDocRef);
    if (!sosDocSnap.exists()) {
      Alert.alert("Error", "SOS request not found.");
      setLoading(false);
      return;
    }
    console.log("SOS doc exists, proceeding to update...");

    // Fetch responder profile
    const userDoc = await getDoc(doc(db, "users", currentUser.uid));
    const userData = userDoc.exists() ? userDoc.data() : {};
    const responderName = userData.fullName || userData.name || currentUser.displayName || currentUser.email || "Unknown";
    const responderRole = userData.role || "user";

    // Update SOS with responder info
    await updateDoc(sosDocRef, {
      status: "responded",
      responderId: currentUser.uid,
      responderName,
      responderRole,
      respondedAt: serverTimestamp(),
    });
    console.log("SOS document updated in Firestore!");

    // Add notification (optional)
    await addDoc(collection(db, "notifications"), {
      toUserId: sosAlert.userId,
      sosId: sosAlert.id,
      type: "sos_responded",
      message: `Your SOS has been accepted and responded, help is on the way by ${responderName} (${responderRole === "employee" ? "Helper" : responderRole === "responder" ? "Rescuer" : "User"}).`,
      responderId: currentUser.uid,
      responderName,
      responderRole,
      createdAt: serverTimestamp(),
      read: false,
    });
    console.log("Notification added!");

    Alert.alert("Accepted", "You have accepted and responded to this SOS.");
    onAccept(sosAlert.id);
    onClose();
  } catch (e: any) {
    console.error("Error in handleAcceptRespond:", e);
    Alert.alert("Error", "Failed to accept and respond. " + (e?.message || ""));
  } finally {
    setLoading(false);
  }
};

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
              <ThemedText style={s.detailValue}>{sosAlert.timestamp ? new Date(sosAlert.timestamp).toLocaleTimeString() : ""}</ThemedText>
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
            {sosAlert.responderName && (
              <View style={s.detailItem}>
                <IconSymbol name="person.fill" size={20} color={Colors[colorScheme].icon} />
                <ThemedText style={s.detailLabel}>Responder:</ThemedText>
                <ThemedText style={s.detailValue}>
                  {sosAlert.responderName} ({sosAlert.responderRole === "employee" ? "Helper" : sosAlert.responderRole === "responder" ? "Rescuer" : "User"})
                </ThemedText>
              </View>
            )}
          </ScrollView>

          <View style={s.actionsContainer}>
            {sosAlert.senderContact && (
              <TouchableOpacity style={[s.actionButton, s.callButton]} onPress={handleCall}>
                <IconSymbol name="phone.fill" size={18} color={Colors.dark.text} />
                <ThemedText style={s.actionButtonText}>Call Sender</ThemedText>
              </TouchableOpacity>
            )}
            {showAcceptButton && sosAlert.status !== "responded" && (
              <TouchableOpacity
                style={[s.actionButton, s.acceptButton]}
                onPress={handleAcceptRespond}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <IconSymbol name="hand.raised.fill" size={18} color={Colors.dark.text} />
                    <ThemedText style={s.actionButtonText}>Accept & Respond</ThemedText>
                  </>
                )}
              </TouchableOpacity>
            )}
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
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "center",
      alignItems: "center",
    },
    modalContent: {
      width: "90%",
      borderRadius: 20,
      padding: 24,
      backgroundColor: Colors[colorScheme].background,
      maxHeight: "85%",
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
      alignItems: "center",
      marginBottom: 12,
      gap: 8,
    },
    detailLabel: {
      fontWeight: "bold",
      marginRight: 4,
      color: Colors[colorScheme].text,
    },
    detailValue: {
      color: Colors[colorScheme].text,
      flexShrink: 1,
    },
    actionsContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: 24,
      gap: 12,
    },
    actionButton: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      padding: 14,
      borderRadius: 12,
      marginHorizontal: 4,
    },
    callButton: {
      backgroundColor: "#f1c40f",
    },
    acceptButton: {
      backgroundColor: "#FF3B30",
    },
    actionButtonText: {
      color: "#fff",
      fontWeight: "bold",
      marginLeft: 8,
    },
  });