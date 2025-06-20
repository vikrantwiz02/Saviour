import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import React, { useState } from "react";
import {
    Alert,
    Dimensions,
    Image,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");
const isTablet = width >= 768;

const OUTCOMES = ["Resolved", "No One Found", "Escalated"];
const MODERATION_REASONS = [
  "False Alert",
  "Inappropriate Behavior",
  "Suspicious Activity",
  "Other",
];

// Mock report history
const MOCK_HISTORY = [
  {
    id: "rpt-1001",
    sosId: "sos-1001",
    outcome: "Resolved",
    desc: "Patient stabilized and handed over to ambulance.",
    time: "2025-06-20 10:05",
    status: "Reviewed",
  },
  {
    id: "rpt-1002",
    sosId: "sos-1002",
    outcome: "No One Found",
    desc: "No person found at reported location.",
    time: "2025-06-19 18:30",
    status: "Pending",
  },
];

export default function IncidentReportScreen() {
  const colorScheme = useColorScheme() ?? "light";
  const [desc, setDesc] = useState("");
  const [outcome, setOutcome] = useState(OUTCOMES[0]);
  const [photo, setPhoto] = useState<string | null>(null);
  const [modModal, setModModal] = useState(false);
  const [modReason, setModReason] = useState("");
  const [modNotes, setModNotes] = useState("");
  const [modPhoto, setModPhoto] = useState<string | null>(null);
  const [history, setHistory] = useState(MOCK_HISTORY);
  const [submitted, setSubmitted] = useState(false);

  // Pick image for main report
  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });
    if (!result.canceled && result.assets.length > 0) {
      setPhoto(result.assets[0].uri);
    }
  };

  // Pick image for moderation
  const pickModImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });
    if (!result.canceled && result.assets.length > 0) {
      setModPhoto(result.assets[0].uri);
    }
  };

  // Submit incident report
  const handleSubmit = () => {
    if (!desc.trim()) {
      Alert.alert("Description required", "Please describe the response.");
      return;
    }
    setHistory([
      {
        id: "rpt-" + (Date.now() % 10000),
        sosId: "sos-xxxx",
        outcome,
        desc,
        time: new Date().toISOString().slice(0, 16).replace("T", " "),
        status: "Pending",
      },
      ...history,
    ]);
    setDesc("");
    setPhoto(null);
    setOutcome(OUTCOMES[0]);
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 2000);
  };

  // Submit moderation report
  const handleModSubmit = () => {
    if (!modReason) {
      Alert.alert("Reason required", "Please select a reason for flagging.");
      return;
    }
    Alert.alert("Flag Submitted", "Your moderation report has been submitted (frontend only).");
    setModModal(false);
    setModReason("");
    setModNotes("");
    setModPhoto(null);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors[colorScheme].background }}>
      <ScrollView contentContainerStyle={{ padding: isTablet ? 32 : 16, paddingBottom: 40 }}>
        <Text style={styles.header}>Incident Report</Text>
        <Text style={styles.sectionTitle}>Describe Your Response</Text>
        <TextInput
          style={styles.input}
          value={desc}
          onChangeText={setDesc}
          placeholder="Describe what happened, actions taken, etc."
          placeholderTextColor={Colors[colorScheme].textMuted}
          multiline
          numberOfLines={4}
        />
        <Text style={styles.sectionTitle}>Outcome</Text>
        <View style={styles.row}>
          {OUTCOMES.map((o) => (
            <TouchableOpacity
              key={o}
              style={[styles.chip, outcome === o && styles.chipActive]}
              onPress={() => setOutcome(o)}
            >
              <Text style={{ color: outcome === o ? "#fff" : "#222" }}>{o}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.sectionTitle}>Attach Photo (optional)</Text>
        <TouchableOpacity style={styles.imageBtn} onPress={pickImage}>
          <Ionicons name="camera" size={20} color={Colors[colorScheme].tint} />
          <Text style={styles.imageBtnText}>{photo ? "Change Photo" : "Upload Photo"}</Text>
        </TouchableOpacity>
        {photo && (
          <Image source={{ uri: photo }} style={styles.photoPreview} />
        )}
        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
          <Ionicons name="checkmark-circle" size={20} color="#fff" />
          <Text style={styles.submitBtnText}>Submit Report</Text>
        </TouchableOpacity>
        {submitted && (
          <Text style={{ color: "#22c55e", marginTop: 8, fontWeight: "bold" }}>
            Report submitted!
          </Text>
        )}

        {/* Moderation Tools */}
        <View style={styles.modSection}>
          <Text style={styles.sectionTitle}>Flag Requester</Text>
          <TouchableOpacity
            style={styles.flagBtn}
            onPress={() => setModModal(true)}
          >
            <MaterialCommunityIcons name="flag" size={20} color="#ef4444" />
            <Text style={styles.flagBtnText}>Flag for Misuse or Suspicious Behavior</Text>
          </TouchableOpacity>
        </View>

        {/* Report History */}
        <Text style={styles.header}>Report History</Text>
        <View style={isTablet ? styles.historyRowTablet : {}}>
          {history.length === 0 && (
            <Text style={{ color: "#888", marginTop: 10 }}>No reports submitted yet.</Text>
          )}
          {history.map((h) => (
            <View key={h.id} style={styles.historyCard}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Ionicons
                  name={
                    h.outcome === "Resolved"
                      ? "checkmark-circle"
                      : h.outcome === "No One Found"
                      ? "help-circle"
                      : "alert-circle"
                  }
                  size={20}
                  color={
                    h.outcome === "Resolved"
                      ? "#22c55e"
                      : h.outcome === "No One Found"
                      ? "#fbbf24"
                      : "#ef4444"
                  }
                />
                <Text style={styles.historyOutcome}>{h.outcome}</Text>
                <Text style={styles.historyStatus}>{h.status}</Text>
              </View>
              <Text style={styles.historyDesc}>{h.desc}</Text>
              <Text style={styles.historyTime}>{h.time}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Moderation Modal */}
      <Modal visible={modModal} transparent animationType="slide" onRequestClose={() => setModModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={{ fontWeight: "bold", fontSize: 18, marginBottom: 10 }}>
              Flag Requester
            </Text>
            <Text style={{ marginBottom: 10 }}>
              Select a reason and add notes or evidence if needed.
            </Text>
            {MODERATION_REASONS.map((r) => (
              <TouchableOpacity
                key={r}
                style={[styles.chip, modReason === r && styles.chipActive]}
                onPress={() => setModReason(r)}
              >
                <Text style={{ color: modReason === r ? "#fff" : "#222" }}>{r}</Text>
              </TouchableOpacity>
            ))}
            <TextInput
              style={[styles.input, { marginTop: 10 }]}
              value={modNotes}
              onChangeText={setModNotes}
              placeholder="Add notes (optional)"
              placeholderTextColor="#aaa"
              multiline
            />
            <TouchableOpacity style={styles.imageBtn} onPress={pickModImage}>
              <Ionicons name="camera" size={20} color={Colors[colorScheme].tint} />
              <Text style={styles.imageBtnText}>{modPhoto ? "Change Photo" : "Upload Evidence"}</Text>
            </TouchableOpacity>
            {modPhoto && (
              <Image source={{ uri: modPhoto }} style={styles.photoPreview} />
            )}
            <View style={{ flexDirection: "row", justifyContent: "flex-end", marginTop: 18 }}>
              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: "#eee" }]}
                onPress={() => setModModal(false)}
              >
                <Text style={{ color: "#222" }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleModSubmit}
              >
                <Text style={{ color: "#fff", fontWeight: "bold" }}>Submit Flag</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    fontSize: isTablet ? 22 : 18,
    fontWeight: "bold",
    color: "#2563eb",
    marginTop: 18,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    marginTop: 18,
    marginBottom: 8,
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
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  chip: {
    backgroundColor: "#f1f5f9",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginRight: 8,
    marginBottom: 8,
  },
  chipActive: {
    backgroundColor: "#2563eb",
  },
  imageBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    borderRadius: 8,
    padding: 10,
    marginTop: 6,
    marginBottom: 6,
    alignSelf: "flex-start",
  },
  imageBtnText: {
    marginLeft: 8,
    color: "#2563eb",
    fontWeight: "500",
  },
  photoPreview: {
    width: 140,
    height: 100,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 8,
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2563eb",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 18,
    marginTop: 12,
    alignSelf: "flex-start",
    marginRight: 10,
  },
  submitBtnText: {
    color: "#fff",
    fontWeight: "bold",
    marginLeft: 8,
    fontSize: 15,
  },
  modSection: {
    marginTop: 24,
    marginBottom: 12,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    paddingTop: 12,
  },
  flagBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fee2e2",
    borderRadius: 8,
    padding: 10,
    marginTop: 6,
    alignSelf: "flex-start",
  },
  flagBtnText: {
    marginLeft: 8,
    color: "#ef4444",
    fontWeight: "bold",
  },
  historyRowTablet: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  historyCard: {
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    minWidth: isTablet ? 260 : undefined,
    maxWidth: isTablet ? 340 : undefined,
    flex: 1,
    marginRight: isTablet ? 10 : 0,
  },
  historyOutcome: {
    fontWeight: "bold",
    fontSize: 14,
    marginLeft: 8,
    marginRight: 8,
    color: "#2563eb",
  },
  historyStatus: {
    backgroundColor: "#dbeafe",
    color: "#2563eb",
    fontWeight: "bold",
    fontSize: 12,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
  },
  historyDesc: {
    color: "#222",
    fontSize: 13,
    marginTop: 2,
    marginBottom: 2,
  },
  historyTime: {
    color: "#888",
    fontSize: 12,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.18)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: isTablet ? 420 : "90%",
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 22,
    elevation: 6,
  },
});