import React, { useState } from "react";
import { View, StyleSheet, TouchableOpacity, TextInput, Alert, TextStyle, ViewStyle } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { EmergencyType, UrgencyLevel } from "./types";
import { EmergencyTypePicker } from "@/components/ui/EmergencyTypePicker";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import * as Location from "expo-location";
import { auth, db } from "@/lib/firebase";

interface SOSCreationProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentLocation?: { latitude: number; longitude: number };
}

interface Styles {
  container: ViewStyle;
  header: ViewStyle;
  title: TextStyle;
  urgencyContainer: ViewStyle;
  label: TextStyle;
  urgencyOptions: ViewStyle;
  urgencyButton: ViewStyle;
  highUrgency: ViewStyle;
  mediumUrgency: ViewStyle;
  lowUrgency: ViewStyle;
  urgencyText: TextStyle;
  selectedUrgencyText: TextStyle;
  inputContainer: ViewStyle;
  input: TextStyle & ViewStyle;
  privacyContainer: ViewStyle;
  privacyOption: ViewStyle;
  privacyText: TextStyle;
  submitButton: ViewStyle;
  submitButtonText: TextStyle;
}

const urgencyStyleMap: Record<UrgencyLevel, "highUrgency" | "mediumUrgency" | "lowUrgency"> = {
  High: "highUrgency",
  Medium: "mediumUrgency",
  Low: "lowUrgency",
};

export const SOSCreation: React.FC<SOSCreationProps> = ({
  visible,
  onClose,
  onSuccess,
  currentLocation,
}) => {
  const colorScheme = useColorScheme() ?? "light";
  const s = styles(colorScheme);

  const [emergencyType, setEmergencyType] = useState<EmergencyType>("Medical Emergency");
  const [urgency, setUrgency] = useState<UrgencyLevel>("Medium");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!description.trim()) {
      Alert.alert("Error", "Please enter a description of the emergency");
      return;
    }

    setIsSubmitting(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Not authenticated");

      const location = currentLocation || await getCurrentLocation();

      await addDoc(collection(db, "sos_requests"), {
        userId: user.uid,
        location,
        emergencyType,
        description: description.trim(),
        urgency,
        isPublic,
        status: "active",
        senderName: user.displayName || "Anonymous",
        senderContact: user.phoneNumber || user.email || "Unknown",
        createdAt: serverTimestamp(),
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error creating SOS:", error);
      Alert.alert("Error", "Failed to create SOS request");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCurrentLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      throw new Error("Location permission denied");
    }

    const location = await Location.getCurrentPositionAsync({});
    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };
  };

  if (!visible) return null;

  return (
    <ThemedView style={s.container}>
      <View style={s.header}>
        <ThemedText style={s.title}>Create Emergency Alert</ThemedText>
        <TouchableOpacity onPress={onClose}>
          <IconSymbol name="xmark" size={24} color={Colors[colorScheme].text} />
        </TouchableOpacity>
      </View>

      <EmergencyTypePicker
        selectedType={emergencyType}
        onSelect={setEmergencyType}
      />

      <View style={s.urgencyContainer}>
        <ThemedText style={s.label}>Urgency:</ThemedText>
        <View style={s.urgencyOptions}>
          {(["High", "Medium", "Low"] as UrgencyLevel[]).map((level) => (
            <TouchableOpacity
                key={level}
                style={[
                    s.urgencyButton,
                    urgency === level ? s[urgencyStyleMap[level]] : undefined,
                ]}
                onPress={() => setUrgency(level)}
                >
                <ThemedText
                    style={[
                    s.urgencyText,
                    urgency === level ? s.selectedUrgencyText : undefined,
                    ]}
                >
                    {level}
                </ThemedText>
                </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={s.inputContainer}>
        <ThemedText style={s.label}>Description:</ThemedText>
        <TextInput
          style={s.input}
          placeholder="Describe the emergency situation..."
          placeholderTextColor={Colors[colorScheme].textMuted}
          multiline
          numberOfLines={4}
          value={description}
          onChangeText={setDescription}
        />
      </View>

      <View style={s.privacyContainer}>
        <ThemedText style={s.label}>Privacy:</ThemedText>
        <TouchableOpacity
          style={s.privacyOption}
          onPress={() => setIsPublic(true)}
        >
          <IconSymbol
            name={isPublic ? "checkmark.circle.fill" : "circle"}
            size={24}
            color={isPublic ? "#007AFF" : Colors[colorScheme].textMuted}
          />
          <ThemedText style={s.privacyText}>Public (visible to all users)</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={s.privacyOption}
          onPress={() => setIsPublic(false)}
        >
          <IconSymbol
            name={!isPublic ? "checkmark.circle.fill" : "circle"}
            size={24}
            color={!isPublic ? "#007AFF" : Colors[colorScheme].textMuted}
          />
          <ThemedText style={s.privacyText}>
            Private (visible only to responders)
          </ThemedText>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={s.submitButton}
        onPress={handleSubmit}
        disabled={isSubmitting}
      >
        <ThemedText style={s.submitButtonText}>
          {isSubmitting ? "Sending..." : "Send Emergency Alert"}
        </ThemedText>
      </TouchableOpacity>
    </ThemedView>
  );
};

const styles = (colorScheme: "light" | "dark") =>
  StyleSheet.create<Styles>({
    container: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      padding: 24,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      zIndex: 100,
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
    urgencyContainer: {
      marginBottom: 20,
    },
    label: {
      fontSize: 16,
      marginBottom: 8,
      color: Colors[colorScheme].textMuted,
    },
    urgencyOptions: {
      flexDirection: "row",
      justifyContent: "space-between",
    },
    urgencyButton: {
      flex: 1,
      padding: 10,
      marginHorizontal: 4,
      borderRadius: 8,
      alignItems: "center",
      borderWidth: 1,
      borderColor: Colors[colorScheme].border,
    },
    highUrgency: {
      backgroundColor: "#FF3B30",
      borderColor: "#FF3B30",
    },
    mediumUrgency: {
      backgroundColor: "#FFD60A",
      borderColor: "#FFD60A",
    },
    lowUrgency: {
      backgroundColor: "#10b981",
      borderColor: "#10b981",
    },
    urgencyText: {
      fontSize: 14,
      fontWeight: "500",
    },
    selectedUrgencyText: {
      color: "#fff",
    },
    inputContainer: {
      marginBottom: 20,
    },
    input: {
      borderWidth: 1,
      borderColor: Colors[colorScheme].border,
      borderRadius: 8,
      padding: 12,
      minHeight: 100,
      color: Colors[colorScheme].text,
      backgroundColor: Colors[colorScheme].inputBackground,
    },
    privacyContainer: {
      marginBottom: 24,
    },
    privacyOption: {
      flexDirection: "row",
      alignItems: "center",
      marginVertical: 8,
    },
    privacyText: {
      marginLeft: 8,
      fontSize: 14,
    },
    submitButton: {
      backgroundColor: "#FF3B30",
      padding: 16,
      borderRadius: 8,
      alignItems: "center",
    },
    submitButtonText: {
      color: "#fff",
      fontSize: 16,
      fontWeight: "bold",
    },
  });