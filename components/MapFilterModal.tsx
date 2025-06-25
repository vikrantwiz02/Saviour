import React, { useState } from "react";
import { Modal, View, Text, TouchableOpacity, ScrollView } from "react-native";

const URGENCY_OPTIONS = ["High", "Medium", "Low"];
const TYPE_OPTIONS = ["Medical", "Fire", "Accident", "Police Assistance", "Other"];

export type MapFilterModalProps = {
  isVisible: boolean;
  onClose: () => void;
  onApplyFilters: (filters: { urgency?: string[]; type?: string[] }) => void;
  filters: { urgency?: string[]; type?: string[] };
};

export default function MapFilterModal({ isVisible, onClose, onApplyFilters, filters }: MapFilterModalProps) {
  const [urgency, setUrgency] = useState<string[]>(filters.urgency || []);
  const [type, setType] = useState<string[]>(filters.type || []);

  const toggle = (arr: string[], value: string) =>
    arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value];

  const handleApply = () => {
    onApplyFilters({ urgency, type });
  };

  return (
    <Modal visible={isVisible} transparent animationType="slide">
      <View style={{ flex: 1, backgroundColor: "#0008", justifyContent: "center", alignItems: "center" }}>
        <View style={{ backgroundColor: "#fff", padding: 24, borderRadius: 16, width: 320 }}>
          <Text style={{ fontWeight: "bold", fontSize: 18, marginBottom: 12 }}>Filter SOS</Text>
          <ScrollView>
            <Text style={{ fontWeight: "bold", marginBottom: 6 }}>Urgency</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 12 }}>
              {URGENCY_OPTIONS.map(opt => (
                <TouchableOpacity
                  key={opt}
                  style={{
                    backgroundColor: urgency.includes(opt) ? "#007AFF" : "#f3f4f6",
                    padding: 8,
                    borderRadius: 8,
                    marginRight: 8,
                    marginBottom: 8,
                  }}
                  onPress={() => setUrgency(toggle(urgency, opt))}
                >
                  <Text style={{ color: urgency.includes(opt) ? "#fff" : "#222" }}>{opt}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={{ fontWeight: "bold", marginBottom: 6 }}>Type</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 12 }}>
              {TYPE_OPTIONS.map(opt => (
                <TouchableOpacity
                  key={opt}
                  style={{
                    backgroundColor: type.includes(opt) ? "#007AFF" : "#f3f4f6",
                    padding: 8,
                    borderRadius: 8,
                    marginRight: 8,
                    marginBottom: 8,
                  }}
                  onPress={() => setType(toggle(type, opt))}
                >
                  <Text style={{ color: type.includes(opt) ? "#fff" : "#222" }}>{opt}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
          <TouchableOpacity onPress={handleApply} style={{ marginTop: 12, backgroundColor: "#007AFF", borderRadius: 8, padding: 12 }}>
            <Text style={{ color: "#fff", fontWeight: "bold", textAlign: "center" }}>Apply Filters</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} style={{ marginTop: 10 }}>
            <Text style={{ color: "#007AFF", fontWeight: "bold", textAlign: "center" }}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}