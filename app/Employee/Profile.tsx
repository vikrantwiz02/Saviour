import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import React, { useState } from "react";
import {
    Alert,
    Dimensions,
    Image,
    Platform,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");
const isTablet = width >= 768;

const MOCK_PROFILE = {
  name: "Bob Singh",
  phone: "+91 9000000002",
  photo: null as string | null,
  verified: true,
  onDuty: true,
  notificationRadius: "3",
  preferredTypes: ["Medical", "Fire"],
  shift: "08:00 - 16:00",
  emergenciesHandled: 42,
  avgResponse: "6m 30s",
  contribution: 68, // percent
};

const EMERGENCY_TYPES = ["Medical", "Fire", "Police", "Other"];

export default function ProfileScreen() {
  const colorScheme = useColorScheme() ?? "light";
  const [name, setName] = useState(MOCK_PROFILE.name);
  const [phone, setPhone] = useState(MOCK_PROFILE.phone);
  const [photo, setPhoto] = useState<string | null>(MOCK_PROFILE.photo);
  const [onDuty, setOnDuty] = useState(MOCK_PROFILE.onDuty);
  const [notificationRadius, setNotificationRadius] = useState(MOCK_PROFILE.notificationRadius);
  const [preferredTypes, setPreferredTypes] = useState<string[]>(MOCK_PROFILE.preferredTypes);
  const [shift, setShift] = useState(MOCK_PROFILE.shift);

  // Pick profile photo
  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets.length > 0) {
      setPhoto(result.assets[0].uri);
    }
  };

  // Toggle preferred emergency type
  const toggleType = (type: string) => {
    setPreferredTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  // Save handler (frontend only)
  const handleSave = () => {
    Alert.alert("Profile Saved", "Your profile and preferences have been updated.");
  };

  // Logout handler (frontend only)
  const handleLogout = () => {
    Alert.alert("Logged Out", "You have been logged out. (UI only)");
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors[colorScheme].background }}>
      <ScrollView contentContainerStyle={{ padding: isTablet ? 32 : 16, paddingBottom: 40 }}>
        {/* Profile Photo & Badge */}
        <View style={styles.photoRow}>
          <TouchableOpacity onPress={pickImage} style={styles.photoContainer} activeOpacity={0.7}>
            {photo ? (
              <Image source={{ uri: photo }} style={styles.photo} />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Ionicons name="person-circle" size={isTablet ? 110 : 80} color={Colors[colorScheme].icon} />
                <Text style={styles.editPhotoText}>Edit</Text>
              </View>
            )}
          </TouchableOpacity>
          <View style={styles.badgeCol}>
            <View style={styles.verifiedBadge}>
              <MaterialCommunityIcons name="shield-check" size={22} color="#22c55e" />
              <Text style={styles.verifiedText}>Verified Responder</Text>
            </View>
            <View style={styles.dutyRow}>
              <Text style={{ color: onDuty ? "#22c55e" : "#ef4444", fontWeight: "bold", marginRight: 8 }}>
                {onDuty ? "On Duty" : "Off Duty"}
              </Text>
              <Switch
                value={onDuty}
                onValueChange={setOnDuty}
                thumbColor={onDuty ? "#22c55e" : "#ccc"}
                trackColor={{ false: "#ccc", true: "#bbf7d0" }}
              />
            </View>
          </View>
        </View>

        {/* Editable Info */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Responder Name"
            placeholderTextColor={Colors[colorScheme].textMuted}
          />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Contact</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="Phone Number"
            keyboardType="phone-pad"
            placeholderTextColor={Colors[colorScheme].textMuted}
          />
        </View>

        {/* Preferences */}
        <Text style={styles.sectionTitle}>Preferences</Text>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Notification Radius (km)</Text>
          <TextInput
            style={styles.input}
            value={notificationRadius}
            onChangeText={setNotificationRadius}
            keyboardType="numeric"
            placeholder="Radius in km"
            placeholderTextColor={Colors[colorScheme].textMuted}
          />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Preferred Emergency Types</Text>
          <View style={styles.typeRow}>
            {EMERGENCY_TYPES.map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.typeChip,
                  preferredTypes.includes(type) && styles.typeChipActive,
                ]}
                onPress={() => toggleType(type)}
              >
                <Text style={{ color: preferredTypes.includes(type) ? "#fff" : "#222" }}>{type}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Shift Schedule</Text>
          <TextInput
            style={styles.input}
            value={shift}
            onChangeText={setShift}
            placeholder="e.g. 08:00 - 16:00"
            placeholderTextColor={Colors[colorScheme].textMuted}
          />
        </View>

        {/* Impact Metrics */}
        <Text style={styles.sectionTitle}>Impact Metrics</Text>
        <View style={styles.metricsRow}>
          <View style={styles.metricCard}>
            <Ionicons name="checkmark-circle" size={22} color="#22c55e" />
            <Text style={styles.metricValue}>{MOCK_PROFILE.emergenciesHandled}</Text>
            <Text style={styles.metricLabel}>Handled</Text>
          </View>
          <View style={styles.metricCard}>
            <Ionicons name="timer" size={22} color="#3b82f6" />
            <Text style={styles.metricValue}>{MOCK_PROFILE.avgResponse}</Text>
            <Text style={styles.metricLabel}>Avg. Response</Text>
          </View>
        </View>
        <View style={styles.progressBarRow}>
          <Text style={styles.progressLabel}>Community Contribution</Text>
          <View style={styles.progressBarBg}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${MOCK_PROFILE.contribution}%` },
              ]}
            />
          </View>
          <Text style={styles.progressValue}>{MOCK_PROFILE.contribution}%</Text>
        </View>

        {/* Save & Logout */}
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
          <Ionicons name="save" size={20} color="#fff" />
          <Text style={styles.saveBtnText}>Save Changes</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out" size={20} color="#ef4444" />
          <Text style={styles.logoutBtnText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  photoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
    gap: 18,
  },
  photoContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  photo: {
    width: isTablet ? 110 : 80,
    height: isTablet ? 110 : 80,
    borderRadius: isTablet ? 55 : 40,
    borderWidth: 2,
    borderColor: "#2563eb",
  },
  photoPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  editPhotoText: {
    fontSize: 13,
    color: "#2563eb",
    marginTop: -8,
  },
  badgeCol: {
    flex: 1,
    alignItems: "flex-start",
    gap: 10,
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#d1fae5",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 4,
    marginTop: 2,
  },
  verifiedText: {
    color: "#22c55e",
    fontWeight: "bold",
    marginLeft: 6,
    fontSize: 14,
  },
  dutyRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 4,
  },
  inputGroup: {
    marginBottom: 12,
  },
  label: {
    fontSize: 15,
    fontWeight: "500",
    marginBottom: 4,
    color: "#222",
  },
  input: {
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 12 : 8,
    fontSize: 15,
    color: "#222",
    backgroundColor: "#f8fafc",
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "600",
    marginTop: 18,
    marginBottom: 8,
    color: "#2563eb",
  },
  typeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  typeChip: {
    backgroundColor: "#f1f5f9",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginRight: 8,
    marginBottom: 8,
  },
  typeChipActive: {
    backgroundColor: "#2563eb",
  },
  metricsRow: {
    flexDirection: "row",
    gap: 18,
    marginBottom: 10,
  },
  metricCard: {
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    borderRadius: 10,
    padding: 12,
    minWidth: 90,
    flex: 1,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2563eb",
    marginTop: 4,
  },
  metricLabel: {
    fontSize: 13,
    color: "#888",
    marginTop: 2,
    fontWeight: "500",
    textAlign: "center",
  },
  progressBarRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
    gap: 8,
  },
  progressLabel: {
    fontSize: 13,
    color: "#888",
    flex: 1,
  },
  progressBarBg: {
    flex: 3,
    height: 12,
    backgroundColor: "#e5e7eb",
    borderRadius: 8,
    overflow: "hidden",
    marginHorizontal: 6,
  },
  progressBarFill: {
    height: 12,
    backgroundColor: "#22c55e",
    borderRadius: 8,
  },
  progressValue: {
    fontSize: 13,
    color: "#22c55e",
    fontWeight: "bold",
    minWidth: 36,
    textAlign: "right",
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2563eb",
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 18,
    marginTop: 18,
    alignSelf: "flex-start",
  },
  saveBtnText: {
    color: "#fff",
    fontWeight: "bold",
    marginLeft: 8,
    fontSize: 15,
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fee2e2",
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 18,
    marginTop: 14,
    alignSelf: "flex-start",
  },
  logoutBtnText: {
    color: "#ef4444",
    fontWeight: "bold",
    marginLeft: 8,
    fontSize: 15,
  },
});