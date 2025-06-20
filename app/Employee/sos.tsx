import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import React, { useState } from "react";
import {
  ActivityIndicator,
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
import MapView, { Marker } from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");
const isTablet = width >= 768;

const EMERGENCY_TYPES = [
  { label: "Medical", icon: "medical-bag", color: "#22c55e" },
  { label: "Fire", icon: "fire", color: "#ef4444" },
  { label: "Natural Disaster", icon: "weather-hurricane", color: "#fbbf24" },
  { label: "Police", icon: "police-badge", color: "#3b82f6" },
  { label: "Other", icon: "alert-circle", color: "#a21caf" },
];

export default function EmployeeSOSScreen() {
  const colorScheme = useColorScheme() ?? "light";
  const [type, setType] = useState<string | null>(null);
  const [desc, setDesc] = useState("");
  const [media, setMedia] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<"image" | "audio" | null>(null);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [loadingLoc, setLoadingLoc] = useState(false);
  const [verified, setVerified] = useState(true);
  const [broadcast, setBroadcast] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [canEdit, setCanEdit] = useState(true);

  // Pick image or audio
  const pickMedia = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });
    if (!result.canceled && result.assets.length > 0) {
      setMedia(result.assets[0].uri);
      setMediaType(result.assets[0].type === "video" ? "audio" : "image");
    }
  };

  // Get location
  const getLocation = async () => {
    setLoadingLoc(true);
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Denied", "Location permission is required to tag your SOS.");
      setLoadingLoc(false);
      return;
    }
    let loc = await Location.getCurrentPositionAsync({});
    setLocation(loc);
    setLoadingLoc(false);
  };

  // Form validation
  const validate = () => {
    if (!type) {
      Alert.alert("Select Emergency Type", "Please select the type of emergency.");
      return false;
    }
    if (!desc.trim()) {
      Alert.alert("Description Required", "Please enter a description.");
      return false;
    }
    if (!location) {
      Alert.alert("Location Required", "Please tag your current location.");
      return false;
    }
    return true;
  };

  // Submit SOS
  const handleSubmit = () => {
    if (!validate()) return;
    setSubmitted(true);
    setCanEdit(false);
    setTimeout(() => {
      Alert.alert(
        "SOS Raised",
        "Your alert has been submitted with elevated priority and will appear in the emergency feed."
      );
    }, 800);
  };

  // Cancel SOS (before responders act)
  const handleCancel = () => {
    Alert.alert("Cancel SOS", "Are you sure you want to cancel this SOS?", [
      { text: "No", style: "cancel" },
      {
        text: "Yes",
        style: "destructive",
        onPress: () => {
          setType(null);
          setDesc("");
          setMedia(null);
          setMediaType(null);
          setLocation(null);
          setVerified(true);
          setBroadcast(false);
          setSubmitted(false);
          setCanEdit(true);
        },
      },
    ]);
  };

  // Update SOS (before responders act)
  const handleUpdate = () => {
    setCanEdit(true);
    setSubmitted(false);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors[colorScheme].background }}>
      <ScrollView contentContainerStyle={{ padding: isTablet ? 32 : 16, paddingBottom: 40 }}>
        <Text style={styles.header}>Raise SOS Alert</Text>
        <Text style={styles.sectionTitle}>Emergency Type</Text>
        <View style={styles.typeRow}>
          {EMERGENCY_TYPES.map((t) => (
            <TouchableOpacity
              key={t.label}
              style={[
                styles.typeChip,
                type === t.label && { backgroundColor: t.color },
                !canEdit && { opacity: 0.5 },
              ]}
              onPress={() => canEdit && setType(t.label)}
              disabled={!canEdit}
            >
              <MaterialCommunityIcons name={t.icon as any} size={22} color={type === t.label ? "#fff" : t.color} />
              <Text style={{ color: type === t.label ? "#fff" : "#222", marginLeft: 6 }}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.sectionTitle}>Description</Text>
        <TextInput
          style={[styles.input, !canEdit && { backgroundColor: "#f1f5f9", color: "#888" }]}
          value={desc}
          onChangeText={setDesc}
          placeholder="Describe the emergency in detail"
          placeholderTextColor={Colors[colorScheme].textMuted}
          editable={canEdit}
          multiline
        />
        <Text style={styles.sectionTitle}>Attach Media (optional)</Text>
        <TouchableOpacity
          style={[styles.mediaBtn, !canEdit && { opacity: 0.5 }]}
          onPress={pickMedia}
          disabled={!canEdit}
        >
          <Ionicons name="camera" size={20} color={Colors[colorScheme].tint} />
          <Text style={styles.mediaBtnText}>{media ? "Change Media" : "Upload Photo/Audio"}</Text>
        </TouchableOpacity>
        {media && mediaType === "image" && (
          <Image source={{ uri: media }} style={styles.mediaPreview} />
        )}
        {/* Audio preview can be added here if needed */}

        <Text style={styles.sectionTitle}>Location</Text>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
          <TouchableOpacity
            style={[styles.locBtn, !canEdit && { opacity: 0.5 }]}
            onPress={getLocation}
            disabled={!canEdit}
          >
            <Ionicons name="locate" size={18} color="#2563eb" />
            <Text style={styles.locBtnText}>
              {location ? "Update Location" : "Tag Current Location"}
            </Text>
          </TouchableOpacity>
          {loadingLoc && <ActivityIndicator size="small" color="#2563eb" style={{ marginLeft: 10 }} />}
        </View>
        {location && (
          <MapView
            style={styles.map}
            region={{
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
              latitudeDelta: 0.005,
              longitudeDelta: 0.005,
            }}
            pointerEvents="none"
          >
            <Marker
              coordinate={{
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
              }}
              pinColor="#ef4444"
            />
          </MapView>
        )}

        {/* Elevated Controls */}
        <View style={styles.toggleRow}>
          <View style={styles.toggleItem}>
            <Text style={styles.toggleLabel}>Mark as Verified Alert</Text>
            <Switch
              value={verified}
              onValueChange={setVerified}
              thumbColor={verified ? "#22c55e" : "#ccc"}
              trackColor={{ false: "#ccc", true: "#bbf7d0" }}
              disabled={!canEdit}
            />
          </View>
          <View style={styles.toggleItem}>
            <Text style={styles.toggleLabel}>Needs Immediate Broadcast</Text>
            <Switch
              value={broadcast}
              onValueChange={setBroadcast}
              thumbColor={broadcast ? "#ef4444" : "#ccc"}
              trackColor={{ false: "#ccc", true: "#fee2e2" }}
              disabled={!canEdit}
            />
          </View>
        </View>

        {/* Action Buttons */}
        {!submitted && (
          <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={!canEdit}>
            <Ionicons name="alert-circle" size={20} color="#fff" />
            <Text style={styles.submitBtnText}>Raise SOS</Text>
          </TouchableOpacity>
        )}
        {submitted && (
          <View style={{ marginTop: 18 }}>
            <Text style={{ color: "#22c55e", fontWeight: "bold", fontSize: 16 }}>
              SOS Raised! (Priority: Verified Responder)
            </Text>
            <View style={{ flexDirection: "row", marginTop: 10 }}>
              <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
                <Ionicons name="close-circle" size={18} color="#ef4444" />
                <Text style={styles.cancelBtnText}>Cancel SOS</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.updateBtn} onPress={handleUpdate}>
                <Ionicons name="create" size={18} color="#2563eb" />
                <Text style={styles.updateBtnText}>Update SOS</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    fontSize: isTablet ? 24 : 18,
    fontWeight: "bold",
    color: "#ef4444",
    marginBottom: 10,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    marginTop: 18,
    marginBottom: 8,
    color: "#222",
  },
  typeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  typeChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginRight: 8,
    marginBottom: 8,
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
    marginBottom: 8,
  },
  mediaBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    borderRadius: 8,
    padding: 10,
    marginTop: 6,
    marginBottom: 6,
    alignSelf: "flex-start",
  },
  mediaBtnText: {
    marginLeft: 8,
    color: "#2563eb",
    fontWeight: "500",
  },
  mediaPreview: {
    width: 140,
    height: 100,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 8,
  },
  locBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    borderRadius: 8,
    padding: 10,
    marginRight: 10,
  },
  locBtnText: {
    marginLeft: 8,
    color: "#2563eb",
    fontWeight: "500",
  },
  map: {
    width: "100%",
    height: isTablet ? 220 : 160,
    borderRadius: 12,
    marginBottom: 8,
  },
  toggleRow: {
    flexDirection: isTablet ? "row" : "column",
    gap: 18,
    marginTop: 12,
    marginBottom: 8,
  },
  toggleItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flex: 1,
    marginBottom: isTablet ? 0 : 8,
  },
  toggleLabel: {
    fontSize: 14,
    color: "#222",
    fontWeight: "500",
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ef4444",
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 18,
    marginTop: 18,
    alignSelf: "flex-start",
  },
  submitBtnText: {
    color: "#fff",
    fontWeight: "bold",
    marginLeft: 8,
    fontSize: 15,
  },
  cancelBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fee2e2",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginRight: 10,
  },
  cancelBtnText: {
    color: "#ef4444",
    fontWeight: "bold",
    marginLeft: 6,
    fontSize: 14,
  },
  updateBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#dbeafe",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  updateBtnText: {
    color: "#2563eb",
    fontWeight: "bold",
    marginLeft: 6,
    fontSize: 14,
  },
});