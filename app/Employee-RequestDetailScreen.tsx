import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
    Alert,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Mock request data (replace with navigation param in real app)
const MOCK_REQUEST = {
  id: "sos-1001",
  type: "Medical",
  level: "Critical",
  user: "Alice Johnson",
  phone: "+91 9000000001",
  status: "En route",
  address: "Sector 12, North",
  location: { latitude: 28.6139, longitude: 77.209 },
  raised: "2025-06-20T09:30:00Z",
  timeAgo: "5 min ago",
  notes: "Patient is diabetic and unconscious.",
  image: null, // or require("@/assets/images/sample.jpg")
  medicalInfo: "Diabetes, Allergic to penicillin",
  timeline: [
    { status: "Accepted", time: "09:31" },
    { status: "En route", time: "09:32" },
    // { status: "Arrived", time: "09:35" },
    // { status: "Resolved", time: "09:50" },
  ],
  eta: "3 min",
};

const STATUS_STEPS = [
  "Accepted",
  "En route",
  "Arrived",
  "Resolved",
  "Escalated",
];

export default function RequestDetailScreen({ route, navigation }: any) {
  const colorScheme = useColorScheme() ?? "light";
  // In real app, get request from navigation params
  const [request, setRequest] = useState(MOCK_REQUEST);
  const [currentStep, setCurrentStep] = useState(
    STATUS_STEPS.findIndex((s) => s === request.status)
  );
  const [timeline, setTimeline] = useState(request.timeline);
  const [escalated, setEscalated] = useState(false);

  // Status update handler
  const handleStatusUpdate = (stepIdx: number) => {
    if (stepIdx <= currentStep) return;
    const newStatus = STATUS_STEPS[stepIdx];
    const now = new Date();
    const time = now.toTimeString().slice(0, 5);
    setCurrentStep(stepIdx);
    setTimeline([...timeline, { status: newStatus, time }]);
    setRequest({ ...request, status: newStatus });
    if (newStatus === "Escalated") setEscalated(true);
  };

  // Escalate handler
  const handleEscalate = () => {
    Alert.alert(
      "Escalate Emergency",
      "Are you sure you want to escalate this emergency to admin?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Escalate",
          style: "destructive",
          onPress: () => handleStatusUpdate(STATUS_STEPS.length - 1),
        },
      ]
    );
  };

  // In-app chat (frontend only)
  const handleChat = () => {
    Alert.alert("In-App Chat", "Chat UI would open here (frontend only).");
  };

  // Call requester (frontend only)
  const handleCall = () => {
    Alert.alert("Call Requester", `Calling ${request.user} at ${request.phone}... (frontend only)`);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors[colorScheme].background }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        {/* Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation?.goBack?.()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={Colors[colorScheme].tint} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{request.type} Emergency</Text>
          <View style={{ width: 32 }} />
        </View>

        {/* Status Stepper */}
        <View style={styles.stepperRow}>
          {STATUS_STEPS.map((step, idx) => (
            <React.Fragment key={step}>
              <View style={styles.stepperItem}>
                <View
                  style={[
                    styles.stepCircle,
                    idx <= currentStep && { backgroundColor: "#2563eb" },
                    idx === STATUS_STEPS.length - 1 && escalated && { backgroundColor: "#ef4444" },
                  ]}
                >
                  <Ionicons
                    name={
                      step === "Accepted"
                        ? "checkmark"
                        : step === "En route"
                        ? "car"
                        : step === "Arrived"
                        ? "flag"
                        : step === "Resolved"
                        ? "checkmark-done"
                        : "alert"
                    }
                    size={16}
                    color={idx <= currentStep ? "#fff" : "#888"}
                  />
                </View>
                <Text
                  style={[
                    styles.stepLabel,
                    idx <= currentStep && { color: "#2563eb", fontWeight: "bold" },
                    idx === STATUS_STEPS.length - 1 && escalated && { color: "#ef4444", fontWeight: "bold" },
                  ]}
                >
                  {step}
                </Text>
                {/* Timestamp */}
                {timeline.find((t) => t.status === step) && (
                  <Text style={styles.stepTime}>
                    {timeline.find((t) => t.status === step)?.time}
                  </Text>
                )}
              </View>
              {idx < STATUS_STEPS.length - 1 && (
                <View
                  style={[
                    styles.stepLine,
                    idx < currentStep && { backgroundColor: "#2563eb" },
                    idx === STATUS_STEPS.length - 2 && escalated && { backgroundColor: "#ef4444" },
                  ]}
                />
              )}
            </React.Fragment>
          ))}
        </View>

        {/* Status Buttons */}
        <View style={styles.statusBtnRow}>
          {STATUS_STEPS.slice(1, -1).map((step, idx) => (
            <TouchableOpacity
              key={step}
              style={[
                styles.statusBtn,
                currentStep === idx + 1 && { backgroundColor: "#2563eb" },
                currentStep > idx + 1 && { backgroundColor: "#22c55e" },
              ]}
              disabled={currentStep >= idx + 1 || escalated}
              onPress={() => handleStatusUpdate(idx + 1)}
            >
              <Text
                style={[
                  styles.statusBtnText,
                  (currentStep === idx + 1 || currentStep > idx + 1) && { color: "#fff" },
                ]}
              >
                {step}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={[
              styles.statusBtn,
              escalated && { backgroundColor: "#ef4444" },
            ]}
            disabled={escalated}
            onPress={handleEscalate}
          >
            <Text
              style={[
                styles.statusBtnText,
                escalated && { color: "#fff" },
              ]}
            >
              Escalate
            </Text>
          </TouchableOpacity>
        </View>

        {/* Emergency Details */}
        <View style={styles.detailCard}>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
            <MaterialCommunityIcons
              name={
                request.type === "Medical"
                  ? "medical-bag"
                  : request.type === "Fire"
                  ? "fire"
                  : "police-badge"
              }
              size={22}
              color={Colors[colorScheme].tint}
            />
            <Text style={styles.detailType}>{request.type}</Text>
            <Text style={[styles.levelTag, { color: "#ef4444" }]}>
              {request.level === "Critical" ? "🔴" : request.level === "High" ? "🟠" : "🔵"} {request.level}
            </Text>
          </View>
          <Text style={styles.detailLabel}>
            <Ionicons name="person" size={16} color="#888" /> {request.user}
          </Text>
          <Text style={styles.detailLabel}>
            <Ionicons name="location" size={16} color="#3b82f6" /> {request.address}
          </Text>
          <Text style={styles.detailLabel}>
            <Ionicons name="time" size={16} color="#888" /> {request.timeAgo}
          </Text>
          {request.notes && (
            <Text style={styles.detailNotes}>
              <Ionicons name="document-text" size={16} color="#fbbf24" /> {request.notes}
            </Text>
          )}
          {request.medicalInfo && (
            <Text style={styles.detailNotes}>
              <MaterialCommunityIcons name="medical-bag" size={16} color="#3b82f6" /> {request.medicalInfo}
            </Text>
          )}
          {request.image && (
            <Image
              source={request.image}
              style={{ width: "100%", height: 180, borderRadius: 12, marginTop: 10 }}
              resizeMode="cover"
            />
          )}
        </View>

        {/* ETA, Chat, Call */}
        <View style={styles.commsRow}>
          <View style={styles.etaBox}>
            <Ionicons name="time" size={18} color="#2563eb" />
            <Text style={styles.etaText}>ETA: {request.eta}</Text>
          </View>
          <TouchableOpacity style={styles.commsBtn} onPress={handleChat}>
            <Ionicons name="chatbubble-ellipses" size={22} color="#2563eb" />
            <Text style={styles.commsBtnText}>Chat</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.commsBtn} onPress={handleCall}>
            <Ionicons name="call" size={22} color="#22c55e" />
            <Text style={styles.commsBtnText}>Call</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },
  backBtn: {
    padding: 4,
    marginRight: 10,
  },
  headerTitle: {
    flex: 1,
    fontSize: 22,
    fontWeight: "bold",
    color: "#2563eb",
    textAlign: "center",
  },
  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
    marginTop: 4,
    justifyContent: "center",
  },
  stepperItem: {
    alignItems: "center",
    width: 60,
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#e5e7eb",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  stepLabel: {
    fontSize: 12,
    color: "#888",
    textAlign: "center",
  },
  stepTime: {
    fontSize: 11,
    color: "#888",
    marginTop: 2,
  },
  stepLine: {
    width: 24,
    height: 3,
    backgroundColor: "#e5e7eb",
    marginBottom: 18,
  },
  statusBtnRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 18,
    gap: 8,
  },
  statusBtn: {
    flex: 1,
    backgroundColor: "#f1f5f9",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
    marginHorizontal: 2,
  },
  statusBtnText: {
    color: "#2563eb",
    fontWeight: "bold",
    fontSize: 13,
  },
  detailCard: {
    borderRadius: 14,
    backgroundColor: "#f8fafc",
    padding: 16,
    marginBottom: 18,
    elevation: 1,
  },
  detailType: {
    fontWeight: "bold",
    fontSize: 16,
    marginLeft: 8,
    marginRight: 8,
    color: "#222",
  },
  levelTag: {
    fontWeight: "bold",
    fontSize: 13,
    marginRight: 8,
  },
  detailLabel: {
    color: "#555",
    fontSize: 14,
    marginTop: 2,
  },
  detailNotes: {
    color: "#fbbf24",
    fontSize: 13,
    marginTop: 6,
    fontStyle: "italic",
  },
  commsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
    gap: 10,
  },
  etaBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#dbeafe",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  etaText: {
    color: "#2563eb",
    fontWeight: "bold",
    marginLeft: 6,
    fontSize: 14,
  },
  commsBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  commsBtnText: {
    color: "#2563eb",
    fontWeight: "bold",
    marginLeft: 6,
    fontSize: 14,
  },
});