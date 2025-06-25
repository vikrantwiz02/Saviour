import React from "react";
import { Modal, StyleSheet, TouchableOpacity, View } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { SOSRequest } from "../Map/types";

interface SOSDetailModalProps {
  isVisible: boolean;
  sosAlert: SOSRequest;
  onClose: () => void;
  onAccept: () => void;
  onOpenChat: () => void;
  userRole?: "user" | "responder" | "admin";
}

export const SOSDetailModal: React.FC<SOSDetailModalProps> = ({
  isVisible,
  sosAlert,
  onClose,
  onAccept,
  onOpenChat,
  userRole = "user",
}) => {
  const colorScheme = useColorScheme() ?? "light";
  const s = styles(colorScheme);

  const getUrgencyColor = () => {
    switch (sosAlert.urgency) {
      case "High":
        return "#FF3B30";
      case "Medium":
        return "#FFD60A";
      case "Low":
        return "#10b981";
      default:
        return "#888";
    }
  };

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={s.modalContainer}>
        <ThemedView style={s.modalContent}>
          <View style={s.header}>
            <ThemedText style={s.title}>Emergency Alert</ThemedText>
            <TouchableOpacity onPress={onClose}>
              <IconSymbol name="xmark" size={24} color={Colors[colorScheme].text} />
            </TouchableOpacity>
          </View>

          <View style={s.section}>
            <ThemedText style={s.label}>Emergency Type:</ThemedText>
            <ThemedText style={s.value}>{sosAlert.emergencyType}</ThemedText>
          </View>

          <View style={s.section}>
            <ThemedText style={s.label}>Urgency:</ThemedText>
            <View style={[s.urgencyBadge, { backgroundColor: getUrgencyColor() }]}>
              <ThemedText style={s.urgencyText}>{sosAlert.urgency}</ThemedText>
            </View>
          </View>

          <View style={s.section}>
            <ThemedText style={s.label}>Description:</ThemedText>
            <ThemedText style={s.value}>{sosAlert.description}</ThemedText>
          </View>

          {sosAlert.senderName && (
            <View style={s.section}>
              <ThemedText style={s.label}>Sender:</ThemedText>
              <ThemedText style={s.value}>{sosAlert.senderName}</ThemedText>
            </View>
          )}

          {sosAlert.senderContact && (
            <View style={s.section}>
              <ThemedText style={s.label}>Contact:</ThemedText>
              <ThemedText style={s.value}>{sosAlert.senderContact}</ThemedText>
            </View>
          )}

          <View style={s.section}>
            <ThemedText style={s.label}>Time Reported:</ThemedText>
            <ThemedText style={s.value}>
              {sosAlert.createdAt?.toDate
                ? sosAlert.createdAt.toDate().toLocaleString()
                : "Unknown"}
            </ThemedText>
          </View>

          {(userRole === "responder" || userRole === "admin") && (
            <View style={s.buttonRow}>
              <TouchableOpacity style={s.cancelButton} onPress={onClose}>
                <ThemedText style={s.cancelButtonText}>Close</ThemedText>
              </TouchableOpacity>

              {sosAlert.status === "responded" && (
                <TouchableOpacity style={s.chatButton} onPress={onOpenChat}>
                  <IconSymbol name="bubble.left.fill" size={20} color="#fff" />
                  <ThemedText style={s.chatButtonText}>Chat</ThemedText>
                </TouchableOpacity>
              )}

              {sosAlert.status === "active" && (
                <TouchableOpacity style={s.acceptButton} onPress={onAccept}>
                  <ThemedText style={s.acceptButtonText}>Respond</ThemedText>
                </TouchableOpacity>
              )}
            </View>
          )}

          {userRole === "user" && (
            <TouchableOpacity style={s.closeButton} onPress={onClose}>
              <ThemedText style={s.closeButtonText}>Close</ThemedText>
            </TouchableOpacity>
          )}
        </ThemedView>
      </View>
    </Modal>
  );
};

const styles = (colorScheme: "light" | "dark") =>
  StyleSheet.create({
    modalContainer: {
      flex: 1,
      justifyContent: "flex-end",
      backgroundColor: "rgba(0,0,0,0.5)",
    },
    modalContent: {
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 24,
      paddingBottom: 32,
      backgroundColor: Colors[colorScheme].background,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 20,
    },
    title: {
      fontSize: 20,
      fontWeight: "bold",
    },
    section: {
      marginBottom: 16,
    },
    label: {
      fontSize: 14,
      color: "#666",
      marginBottom: 4,
    },
    value: {
      fontSize: 16,
    },
    urgencyBadge: {
      paddingVertical: 4,
      paddingHorizontal: 12,
      borderRadius: 12,
      alignSelf: "flex-start",
    },
    urgencyText: {
      color: "#fff",
      fontWeight: "bold",
    },
    buttonRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: 24,
      flexWrap: "wrap",
      gap: 8,
    },
    cancelButton: {
      flex: 1,
      padding: 16,
      backgroundColor: Colors[colorScheme].inputBackground,
      borderRadius: 12,
      marginRight: 8,
      alignItems: "center",
    },
    cancelButtonText: {
      fontWeight: "bold",
      color: Colors[colorScheme].text,
    },
    chatButton: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      padding: 16,
      backgroundColor: "#007AFF",
      borderRadius: 12,
      marginRight: 8,
    },
    chatButtonText: {
      color: "#fff",
      fontWeight: "bold",
      marginLeft: 8,
    },
    acceptButton: {
      flex: 1,
      padding: 16,
      backgroundColor: "#FF3B30",
      borderRadius: 12,
      alignItems: "center",
    },
    acceptButtonText: {
      color: "#fff",
      fontWeight: "bold",
    },
    closeButton: {
      padding: 16,
      backgroundColor: Colors[colorScheme].inputBackground,
      borderRadius: 12,
      marginTop: 24,
      alignItems: "center",
    },
    closeButtonText: {
      fontWeight: "bold",
      color: Colors[colorScheme].text,
    },
  });