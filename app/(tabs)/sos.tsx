"use client"

import { ThemedText } from "@/components/ThemedText"
import { ThemedView } from "@/components/ThemedView"
import { IconSymbol } from "@/components/ui/IconSymbol"
import { Colors } from "@/constants/Colors"
import { useColorScheme } from "@/hooks/useColorScheme"
import { useEffect, useState } from "react"
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
// For image picker (UI only for now)
// import * as ImagePicker from 'expo-image-picker';

// Mock data
const EMERGENCY_TYPES = ["Medical", "Fire", "Accident", "Police Assistance", "Other"]

export default function SOSScreen() {
  const [selectedEmergencyType, setSelectedEmergencyType] = useState<string | null>(null)
  const [description, setDescription] = useState("")
  const [imageUri, setImageUri] = useState<string | null>(null)
  const [userLocation, setUserLocation] = useState<string>("Fetching location...")
  const [isSending, setIsSending] = useState(false)
  const [sosSent, setSosSent] = useState(false)
  const [canCancel, setCanCancel] = useState(false)
  const [cancelCountdown, setCancelCountdown] = useState(5)

  const colorScheme = useColorScheme() ?? "light"
  const s = styles(colorScheme) // Defined s here

  // Simulate location fetching
  useEffect(() => {
    setTimeout(() => {
      setUserLocation("123 Main St, Anytown (Mock Location)")
    }, 1500)
  }, [])

  // Countdown timer for cancellation
  useEffect(() => {
    let timerId: ReturnType<typeof setTimeout> | undefined // Corrected type
    if (sosSent && canCancel) {
      if (cancelCountdown > 0) {
        timerId = setTimeout(() => setCancelCountdown(cancelCountdown - 1), 1000)
      } else {
        setCanCancel(false)
        Alert.alert("SOS Confirmed", "Your SOS alert has been fully dispatched.")
      }
    }
    return () => {
      if (timerId) clearTimeout(timerId) // Clear timeout using its ID
    }
  }, [sosSent, canCancel, cancelCountdown])

  const handleSelectEmergencyType = (type: string) => {
    setSelectedEmergencyType(type)
  }

  const handlePickImage = async () => {
    Alert.alert("Image Picker", "Image picker UI would open here.")
  }

  const handleSendSOS = () => {
    if (!selectedEmergencyType) {
      Alert.alert("Missing Information", "Please select an emergency type.")
      return
    }
    setIsSending(true)
    setTimeout(() => {
      setIsSending(false)
      setSosSent(true)
      setCanCancel(true)
      setCancelCountdown(5)
      console.log("SOS Sent:", { selectedEmergencyType, description, imageUri, userLocation })
    }, 2000)
  }

  const handleCancelSOS = () => {
    setSosSent(false)
    setCanCancel(false)
    setSelectedEmergencyType(null)
    setDescription("")
    setImageUri(null)
    Alert.alert("SOS Cancelled", "Your SOS alert has been cancelled.")
  }

  if (sosSent) {
    return (
      <ThemedView style={s.container}>
        <View style={s.confirmationContainer}>
          <IconSymbol name="checkmark.circle.fill" size={80} color={Colors.light.tint} />
          <ThemedText style={s.confirmationTitle}>SOS Sent!</ThemedText>
          <ThemedText style={s.confirmationMessage}>
            Help is on the way. Your location and emergency details have been dispatched.
          </ThemedText>
          {canCancel && (
            <View style={s.cancelContainer}>
              <TouchableOpacity style={s.cancelButton} onPress={handleCancelSOS}>
                <ThemedText style={s.cancelButtonText}>Cancel Alert ({cancelCountdown}s)</ThemedText>
              </TouchableOpacity>
              <ThemedText style={s.cancelNote}>You can cancel within the next few seconds.</ThemedText>
            </View>
          )}
          {!canCancel && (
            <TouchableOpacity style={s.actionButton} onPress={() => setSosSent(false) /* Reset UI */}>
              <ThemedText style={s.actionButtonText}>Back to SOS Form</ThemedText>
            </TouchableOpacity>
          )}
        </View>
      </ThemedView>
    )
  }

  return (
    <ThemedView style={s.container}>
      <ScrollView contentContainerStyle={s.scrollContentContainer} keyboardShouldPersistTaps="handled">
        <ThemedText style={s.headerTitle}>Initiate SOS Alert</ThemedText>

        <ThemedText style={s.sectionTitle}>1. Select Emergency Type</ThemedText>
        <View style={s.emergencyTypeContainer}>
          {EMERGENCY_TYPES.map((type) => (
            <TouchableOpacity
              key={type}
              style={[s.emergencyTypeButton, selectedEmergencyType === type && s.emergencyTypeButtonSelected]}
              onPress={() => handleSelectEmergencyType(type)}
            >
              <ThemedText
                style={[s.emergencyTypeButtonText, selectedEmergencyType === type && s.emergencyTypeButtonTextSelected]}
              >
                {type}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </View>

        <ThemedText style={s.sectionTitle}>2. Optional Description</ThemedText>
        <TextInput
          style={s.descriptionInput}
          placeholder="e.g., Person unconscious, heavy smoke..."
          placeholderTextColor={Colors[colorScheme].textMuted}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
        />

        <ThemedText style={s.sectionTitle}>3. Add Image (Optional)</ThemedText>
        <TouchableOpacity style={s.imagePickerButton} onPress={handlePickImage}>
          <IconSymbol name="camera.fill" size={24} color={Colors[colorScheme].tint} />
          <ThemedText style={s.imagePickerButtonText}>{imageUri ? "Change Image" : "Select Image"}</ThemedText>
        </TouchableOpacity>
        {imageUri && (
          <View style={s.imagePreviewContainer}>
            <Image source={{ uri: imageUri }} style={s.imagePreview} />
            <TouchableOpacity onPress={() => setImageUri(null)} style={s.removeImageButton}>
              <IconSymbol name="xmark.circle.fill" size={20} color={Colors.dark.text} />
            </TouchableOpacity>
          </View>
        )}

        <ThemedText style={s.sectionTitle}>4. Your Location</ThemedText>
        <View style={s.locationContainer}>
          <IconSymbol name="location.fill" size={20} color={Colors[colorScheme].icon} />
          <ThemedText style={s.locationText}>{userLocation}</ThemedText>
        </View>

        <TouchableOpacity style={s.sendButton} onPress={handleSendSOS} disabled={isSending}>
          {isSending ? (
            <ActivityIndicator size="small" color={Colors.dark.text} />
          ) : (
            <ThemedText style={s.sendButtonText}>SEND SOS NOW</ThemedText>
          )}
        </TouchableOpacity>
      </ScrollView>
    </ThemedView>
  )
}

// Styles function to accept colorScheme
const styles = (colorScheme: "light" | "dark" = "light") =>
  StyleSheet.create({
    container: {
      flex: 1,
      paddingTop: Platform.OS === "android" ? 25 : 0, // Status bar height for Android
    },
    scrollContentContainer: {
      padding: 20,
      paddingBottom: 50, // For scroll
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
      width: "48%", // Two buttons per row
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
      color: Colors.dark.text, // Text color for selected button
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
    locationContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: Colors[colorScheme].inputBackground,
      padding: 15,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: Colors[colorScheme].border,
    },
    locationText: {
      marginLeft: 10,
      fontSize: 16,
      color: Colors[colorScheme].textMuted,
      flex: 1,
    },
    sendButton: {
      backgroundColor: "#FF3B30", // Prominent SOS red
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
    // Confirmation Screen Styles
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
    cancelContainer: {
      alignItems: "center",
    },
    cancelButton: {
      backgroundColor: Colors[colorScheme].inputBackground,
      paddingVertical: 15,
      paddingHorizontal: 30,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: Colors[colorScheme].border,
    },
    cancelButtonText: {
      color: Colors[colorScheme].tint,
      fontSize: 16,
      fontWeight: "600",
    },
    cancelNote: {
      fontSize: 13,
      color: Colors[colorScheme].textMuted,
      marginTop: 10,
    },
    actionButton: {
      backgroundColor: Colors[colorScheme].tint,
      paddingVertical: 15,
      paddingHorizontal: 40,
      borderRadius: 8,
      marginTop: 20,
    },
    actionButtonText: {
      color: Colors.dark.text, // Assuming dark text on tint background
      fontSize: 16,
      fontWeight: "bold",
    },
  })
