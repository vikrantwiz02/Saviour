import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const DEFAULT_TYPES = ["Medical", "Fire", "Accident", "Police", "Other"];
const ROLES = [
  { name: "User", canView: true, canReport: true, canRespond: false },
  { name: "Employee", canView: true, canReport: true, canRespond: true },
  { name: "Admin", canView: true, canReport: true, canRespond: true },
];

export default function AdminSettingsScreen() {
  const colorScheme = useColorScheme() ?? "light";
  const [radius, setRadius] = useState("5");
  const [emergencyTypes, setEmergencyTypes] = useState(DEFAULT_TYPES);
  const [newType, setNewType] = useState("");
  const s = styles(colorScheme);

  const addType = () => {
    if (newType.trim() && !emergencyTypes.includes(newType.trim())) {
      setEmergencyTypes([...emergencyTypes, newType.trim()]);
      setNewType("");
    }
  };
  const removeType = (type: string) => {
    setEmergencyTypes(emergencyTypes.filter(t => t !== type));
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors[colorScheme].background }}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text style={s.header}>System Settings</Text>
        <Text style={s.sectionTitle}>Default Emergency Types</Text>
        <View style={s.typeList}>
          {emergencyTypes.map(type => (
            <View key={type} style={s.typeItem}>
              <Text style={s.typeText}>{type}</Text>
              {DEFAULT_TYPES.includes(type) ? null : (
                <TouchableOpacity onPress={() => removeType(type)}>
                  <Ionicons name="close-circle" size={20} color="#ef4444" />
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>
        <View style={s.addTypeRow}>
          <TextInput
            style={s.input}
            value={newType}
            onChangeText={setNewType}
            placeholder="Add new type"
            placeholderTextColor={Colors[colorScheme].textMuted}
          />
          <TouchableOpacity style={s.addBtn} onPress={addType}>
            <Ionicons name="add-circle" size={24} color={Colors[colorScheme].tint} />
          </TouchableOpacity>
        </View>

        <Text style={s.sectionTitle}>SOS Detection Radius (km)</Text>
        <TextInput
          style={s.input}
          value={radius}
          onChangeText={setRadius}
          keyboardType="numeric"
          placeholder="Radius in km"
          placeholderTextColor={Colors[colorScheme].textMuted}
        />

        <Text style={s.sectionTitle}>User Role Permissions</Text>
        <View style={s.roleTable}>
          <View style={s.roleRow}>
            <Text style={[s.roleCell, { fontWeight: "bold" }]}>Role</Text>
            <Text style={[s.roleCell, { fontWeight: "bold" }]}>View</Text>
            <Text style={[s.roleCell, { fontWeight: "bold" }]}>Report</Text>
            <Text style={[s.roleCell, { fontWeight: "bold" }]}>Respond</Text>
          </View>
          {ROLES.map(role => (
            <View key={role.name} style={s.roleRow}>
              <Text style={s.roleCell}>{role.name}</Text>
              <Ionicons name={role.canView ? "checkmark" : "close"} size={18} color={role.canView ? "#22c55e" : "#ef4444"} style={s.roleCell} />
              <Ionicons name={role.canReport ? "checkmark" : "close"} size={18} color={role.canReport ? "#22c55e" : "#ef4444"} style={s.roleCell} />
              <Ionicons name={role.canRespond ? "checkmark" : "close"} size={18} color={role.canRespond ? "#22c55e" : "#ef4444"} style={s.roleCell} />
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = (colorScheme: "light" | "dark") =>
  StyleSheet.create({
    header: { fontSize: 26, fontWeight: "bold", marginBottom: 18, color: Colors[colorScheme].tint },
    sectionTitle: { fontSize: 17, fontWeight: "600", marginTop: 18, marginBottom: 8, color: Colors[colorScheme].text },
    typeList: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    typeItem: { flexDirection: "row", alignItems: "center", backgroundColor: "#f1f5f9", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, marginRight: 8, marginBottom: 8 },
    typeText: { fontSize: 15, color: "#222", marginRight: 4 },
    addTypeRow: { flexDirection: "row", alignItems: "center", marginTop: 8, marginBottom: 8 },
    input: { flex: 1, borderWidth: 1, borderColor: Colors[colorScheme].border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: Platform.OS === "ios" ? 12 : 8, fontSize: 15, color: Colors[colorScheme].text, backgroundColor: Colors[colorScheme].inputBackground, marginRight: 8 },
    addBtn: { padding: 2 },
    roleTable: { marginTop: 10, borderWidth: 1, borderColor: "#eee", borderRadius: 8 },
    roleRow: { flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: "#eee" },
    roleCell: { flex: 1, textAlign: "center", padding: 8, fontSize: 14 },
  });