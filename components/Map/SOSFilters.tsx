import React from "react";
import { View, Text, Modal, TouchableOpacity, StyleSheet } from "react-native";
import { MapFilter } from "./types";

interface SOSFiltersProps {
  visible: boolean;
  onApply: (filters: MapFilter) => void;
  onClose: () => void;
  initialFilters: MapFilter;
}

export const SOSFilters: React.FC<SOSFiltersProps> = ({
  visible,
  onApply,
  onClose,
  initialFilters,
}) => {
  // Minimal placeholder for modal
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modal}>
        <Text style={styles.title}>SOS Filters (Placeholder)</Text>
        <TouchableOpacity onPress={() => onApply(initialFilters)} style={styles.button}>
          <Text style={styles.buttonText}>Apply</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onClose} style={styles.button}>
          <Text style={styles.buttonText}>Close</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modal: {
    flex: 1,
    backgroundColor: "#0008",
    justifyContent: "center",
    alignItems: "center",
  },
  title: { fontSize: 18, fontWeight: "bold", marginBottom: 20, color: "#fff" },
  button: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
    minWidth: 120,
    alignItems: "center",
  },
  buttonText: { color: "#007AFF", fontWeight: "bold" },
});