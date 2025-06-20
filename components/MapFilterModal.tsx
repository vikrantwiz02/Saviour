"use client"

import { Colors } from "@/constants/Colors"
import { useColorScheme } from "@/hooks/useColorScheme"
import { useState } from "react"
import { Modal, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native"
import { ThemedText } from "./ThemedText"
import { ThemedView } from "./ThemedView"
import { IconSymbol } from "./ui/IconSymbol"

const EMERGENCY_TYPES = ["Any", "Medical", "Fire", "Accident", "Police"]
const PROXIMITY_OPTIONS = ["Any", "< 1km", "< 5km", "< 10km"]

type MapFilterModalProps = {
  isVisible: boolean
  onClose: () => void
  onApplyFilters: (filters: { emergencyType: string; proximity: string }) => void
}

export default function MapFilterModal({ isVisible, onClose, onApplyFilters }: MapFilterModalProps) {
  const colorScheme = useColorScheme() ?? "light"
  const s = styles(colorScheme)

  const [selectedType, setSelectedType] = useState("Any")
  const [selectedProximity, setSelectedProximity] = useState("Any")

  const handleApply = () => {
    onApplyFilters({ emergencyType: selectedType, proximity: selectedProximity })
  }

  const FilterSection = ({ title, options, selectedValue, onSelect }: any) => (
    <View style={s.filterSection}>
      <ThemedText style={s.filterTitle}>{title}</ThemedText>
      <View style={s.optionsContainer}>
        {options.map((option: string) => (
          <TouchableOpacity
            key={option}
            style={[s.optionButton, selectedValue === option && s.optionButtonSelected]}
            onPress={() => onSelect(option)}
          >
            <ThemedText style={[s.optionText, selectedValue === option && s.optionTextSelected]}>{option}</ThemedText>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )

  return (
    <Modal animationType="slide" transparent={true} visible={isVisible} onRequestClose={onClose}>
      <View style={s.modalOverlay}>
        <ThemedView style={s.modalContent}>
          <View style={s.modalHeader}>
            <ThemedText style={s.modalTitleText}>Filter Alerts & Responders</ThemedText>
            <TouchableOpacity onPress={onClose}>
              <IconSymbol name="xmark" size={24} color={Colors[colorScheme].text} />
            </TouchableOpacity>
          </View>
          <ScrollView>
            <FilterSection
              title="Emergency Type"
              options={EMERGENCY_TYPES}
              selectedValue={selectedType}
              onSelect={setSelectedType}
            />
            <FilterSection
              title="Proximity"
              options={PROXIMITY_OPTIONS}
              selectedValue={selectedProximity}
              onSelect={setSelectedProximity}
            />
          </ScrollView>
          <TouchableOpacity style={s.applyButton} onPress={handleApply}>
            <ThemedText style={s.applyButtonText}>Apply Filters</ThemedText>
          </TouchableOpacity>
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
      maxHeight: "70%",
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
    filterSection: {
      marginBottom: 20,
    },
    filterTitle: {
      fontSize: 16,
      fontWeight: "600",
      marginBottom: 10,
    },
    optionsContainer: {
      flexDirection: "row",
      flexWrap: "wrap",
    },
    optionButton: {
      backgroundColor: Colors[colorScheme].inputBackground,
      paddingHorizontal: 15,
      paddingVertical: 10,
      borderRadius: 20,
      marginRight: 10,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: Colors[colorScheme].border,
    },
    optionButtonSelected: {
      backgroundColor: Colors[colorScheme].tint,
      borderColor: Colors[colorScheme].tint,
    },
    optionText: {
      fontSize: 14,
    },
    optionTextSelected: {
      color: Colors.dark.text, // Assuming dark text on tint background
      fontWeight: "500",
    },
    applyButton: {
      backgroundColor: Colors[colorScheme].tint,
      paddingVertical: 15,
      borderRadius: 8,
      alignItems: "center",
      marginTop: 10,
    },
    applyButtonText: {
      color: Colors.dark.text,
      fontSize: 16,
      fontWeight: "bold",
    },
  })
