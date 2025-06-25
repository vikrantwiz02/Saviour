import React from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { IconSymbol } from "./IconSymbol";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { EmergencyType } from "../Map/types";

interface EmergencyTypePickerProps {
  selectedType: EmergencyType;
  onSelect: (type: EmergencyType) => void;
}

const emergencyTypes: EmergencyType[] = [
  "Medical Emergency",
  "Fire Outbreak",
  "Armed Robbery",
  "Car Accident",
  "Domestic Violence",
  "Natural Disaster",
  "Missing Person",
  "Public Disturbance",
  "Other",
];

const getIconForType = (type: EmergencyType) => {
  switch (type) {
    case "Medical Emergency":
      return "stethoscope";
    case "Fire Outbreak":
      return "flame.fill";
    case "Armed Robbery":
      return "shield.lefthalf.filled";
    case "Car Accident":
      return "car.fill";
    case "Domestic Violence":
      return "person.2.slash.fill";
    case "Natural Disaster":
      return "tornado";
    case "Missing Person":
      return "person.fill.questionmark";
    case "Public Disturbance":
      return "megaphone.fill";
    default:
      return "exclamationmark.triangle.fill";
  }
};

export const EmergencyTypePicker: React.FC<EmergencyTypePickerProps> = ({
  selectedType,
  onSelect,
}) => {
  const colorScheme = useColorScheme() ?? "light";
  const s = styles(colorScheme);

  return (
    <View style={s.container}>
      <ThemedText style={s.label}>Emergency Type:</ThemedText>
      <View style={s.optionsGrid}>
        {emergencyTypes.map((type) => (
          <TouchableOpacity
            key={type}
            style={[
              s.optionButton,
              selectedType === type && s.selectedOption,
            ]}
            onPress={() => onSelect(type)}
          >
            <IconSymbol
              name={getIconForType(type)}
              size={20}
              color={selectedType === type ? "#fff" : Colors[colorScheme].text}
            />
            <ThemedText
              style={[
                s.optionText,
                selectedType === type && s.selectedOptionText,
              ]}
              numberOfLines={2}
            >
              {type}
            </ThemedText>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = (colorScheme: "light" | "dark") =>
  StyleSheet.create({
    container: {
      marginBottom: 20,
    },
    label: {
      fontSize: 16,
      marginBottom: 8,
      color: Colors[colorScheme].textMuted,
    },
    optionsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
    },
    optionButton: {
      width: "30%",
      padding: 10,
      marginBottom: 10,
      borderRadius: 8,
      alignItems: "center",
      borderWidth: 1,
      borderColor: Colors[colorScheme].border,
    },
    selectedOption: {
      backgroundColor: "#007AFF",
      borderColor: "#007AFF",
    },
    optionText: {
      marginTop: 6,
      fontSize: 12,
      textAlign: "center",
    },
    selectedOptionText: {
      color: "#fff",
    },
  });