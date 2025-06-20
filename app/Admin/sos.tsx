"use client"

import { ThemedText } from "@/components/ThemedText"
import { ThemedView } from "@/components/ThemedView"
import { IconSymbol } from "@/components/ui/IconSymbol"
import { Colors } from "@/constants/Colors"
import { useColorScheme } from "@/hooks/useColorScheme"
import { useState } from "react"
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native"

// Mock alert types
const ALERT_TYPES = ["General", "Medical", "Fire", "Accident", "Police", "Other"]

export default function AdminSOSScreen() {
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [message, setMessage] = useState("")
  const [imageUri, setImageUri] = useState<string | null>(null)
  const [isSending, setIsSending] = useState(false)
  const [sent, setSent] = useState(false)

  const colorScheme = useColorScheme() ?? "light"
  const s = styles(colorScheme)

  const handlePickImage = async () => {
    Alert.alert("Image Picker", "Image picker UI would open here.")
  }

  const handleSend = () => {
    if (!selectedType || !message.trim()) {
      Alert.alert("Missing Information", "Please select an alert type and enter a message.")
      return
    }
    setIsSending(true)
    setTimeout(() => {
      setIsSending(false)
      setSent(true)
      // Here you would send to backend
    }, 1800)
  }

  const handleReset = () => {
    setSelectedType(null)
    setMessage("")
    setImageUri(null)
    setSent(false)
  }

  if (sent) {
    return (
      <ThemedView style={s.container}>
        <View style={s.confirmationContainer}>
          <IconSymbol name="checkmark.circle.fill" size={80} color={Colors.light.tint} />
          <ThemedText style={s.confirmationTitle}>Alert Sent!</ThemedText>
          <ThemedText style={s.confirmationMessage}>
            Your alert has been broadcast to all users.
          </ThemedText>
          <TouchableOpacity style={s.actionButton} onPress={handleReset}>
            <ThemedText style={s.actionButtonText}>Send Another Alert</ThemedText>
          </TouchableOpacity>
        </View>
      </ThemedView>
    )
  }

  return (
    <ThemedView style={s.container}>
      <ScrollView contentContainerStyle={s.scrollContentContainer} keyboardShouldPersistTaps="handled">
        <ThemedText style={s.headerTitle}>Broadcast Emergency Alert</ThemedText>

        <ThemedText style={s.sectionTitle}>1. Select Alert Type</ThemedText>
        <View style={s.emergencyTypeContainer}>
          {ALERT_TYPES.map((type) => (
            <TouchableOpacity
              key={type}
              style={[s.emergencyTypeButton, selectedType === type && s.emergencyTypeButtonSelected]}
              onPress={() => setSelectedType(type)}
            >
              <ThemedText
                style={[s.emergencyTypeButtonText, selectedType === type && s.emergencyTypeButtonTextSelected]}
              >
                {type}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </View>

        <ThemedText style={s.sectionTitle}>2. Alert Message</ThemedText>
        <TextInput
          style={s.descriptionInput}
          placeholder="Describe the emergency or instructions for users..."
          placeholderTextColor={Colors[colorScheme].textMuted}
          value={message}
          onChangeText={setMessage}
          multiline
          numberOfLines={4}
        />

        <ThemedText style={s.sectionTitle}>3. Add Image (Optional)</ThemedText>
        <TouchableOpacity style={s.imagePickerButton} onPress={handlePickImage}>
          <IconSymbol name="camera.fill" size={24} color={Colors[colorScheme].tint} />
          <ThemedText style={s.imagePickerButtonText}>{imageUri ? "Change Image" : "Attach Image"}</ThemedText>
        </TouchableOpacity>
        {imageUri && (
          <View style={s.imagePreviewContainer}>
            <Image source={{ uri: imageUri }} style={s.imagePreview} />
            <TouchableOpacity onPress={() => setImageUri(null)} style={s.removeImageButton}>
              <IconSymbol name="xmark.circle.fill" size={20} color={Colors.dark.text} />
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity style={s.sendButton} onPress={handleSend} disabled={isSending}>
          {isSending ? (
            <ActivityIndicator size="small" color={Colors.dark.text} />
          ) : (
            <ThemedText style={s.sendButtonText}>SEND ALERT</ThemedText>
          )}
        </TouchableOpacity>
      </ScrollView>
    </ThemedView>
  )
}

const styles = (colorScheme: "light" | "dark" = "light") =>
  StyleSheet.create({
    container: {
      flex: 1,
      paddingTop: Platform.OS === "android" ? 25 : 0,
    },
    scrollContentContainer: {
      padding: 20,
      paddingBottom: 50,
    },
    headerTitle: {
      fontSize: 26,
      fontWeight: "bold",
      textAlign: "center",
      marginBottom: 25,
      color: Colors[colorScheme].text,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "600",
      marginTop: 20,
      marginBottom: 10,
      color: Colors[colorScheme].text,
    },
    emergencyTypeContainer: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
    },
    emergencyTypeButton: {
      backgroundColor: Colors[colorScheme].inputBackground,
      paddingVertical: 12,
      paddingHorizontal: 10,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: Colors[colorScheme].border,
      marginBottom: 10,
      width: "48%",
      alignItems: "center",
    },
    emergencyTypeButtonSelected: {
      backgroundColor: Colors[colorScheme].tint,
      borderColor: Colors[colorScheme].tint,
    },
    emergencyTypeButtonText: {
      color: Colors[colorScheme].text,
      fontSize: 14,
      fontWeight: "500",
    },
    emergencyTypeButtonTextSelected: {
      color: Colors.dark.text,
    },
    descriptionInput: {
      backgroundColor: Colors[colorScheme].inputBackground,
      borderColor: Colors[colorScheme].border,
      borderWidth: 1,
      borderRadius: 8,
      padding: 15,
      fontSize: 16,
      color: Colors[colorScheme].text,
      minHeight: 100,
      textAlignVertical: "top",
    },
    imagePickerButton: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: Colors[colorScheme].inputBackground,
      padding: 15,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: Colors[colorScheme].border,
      justifyContent: "center",
    },
    imagePickerButtonText: {
      marginLeft: 10,
      fontSize: 16,
      color: Colors[colorScheme].tint,
      fontWeight: "500",
    },
    imagePreviewContainer: {
      marginTop: 10,
      alignItems: "center",
      position: "relative",
    },
    imagePreview: {
      width: 150,
      height: 150,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: Colors[colorScheme].border,
    },
    removeImageButton: {
      position: "absolute",
      top: 5,
      right: 5,
      backgroundColor: "rgba(0,0,0,0.5)",
      borderRadius: 15,
      padding: 2,
    },
    sendButton: {
      backgroundColor: "#FF3B30",
      paddingVertical: 18,
      borderRadius: 8,
      alignItems: "center",
      marginTop: 30,
    },
    sendButtonText: {
      color: "#FFFFFF",
      fontSize: 18,
      fontWeight: "bold",
    },
    confirmationContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 20,
      backgroundColor: Colors[colorScheme].background,
    },
    confirmationTitle: {
      fontSize: 28,
      fontWeight: "bold",
      marginTop: 20,
      marginBottom: 10,
      textAlign: "center",
      color: Colors[colorScheme].text,
    },
    confirmationMessage: {
      fontSize: 16,
      textAlign: "center",
      marginBottom: 30,
      color: Colors[colorScheme].textMuted,
      paddingHorizontal: 10,
    },
    actionButton: {
      backgroundColor: Colors[colorScheme].tint,
      paddingVertical: 15,
      paddingHorizontal: 40,
      borderRadius: 8,
      marginTop: 20,
    },
    actionButtonText: {
      color: Colors.dark.text,
      fontSize: 16,
      fontWeight: "bold",
    },
  })