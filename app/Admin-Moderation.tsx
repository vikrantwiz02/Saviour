import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Mock moderation reports
type ReportStatus = "Pending" | "Reviewed" | "Resolved";
interface Report {
  id: string;
  sender: string;
  target: string;
  requestId: string;
  reason: string;
  description: string;
  timestamp: string;
  status: ReportStatus;
  log: string[];
}

const MOCK_REPORTS: Report[] = [
  {
    id: "r1",
    sender: "Alice Johnson",
    target: "Bob Singh",
    requestId: "SOS-1023",
    reason: "Inappropriate Behavior",
    description: "Used abusive language during SOS response.",
    timestamp: "2025-06-19 10:15",
    status: "Pending",
    log: [],
  },
  {
    id: "r2",
    sender: "Carol Lee",
    target: "David Kumar",
    requestId: "SOS-1018",
    reason: "False Alert",
    description: "Raised a false emergency alert.",
    timestamp: "2025-06-18 17:42",
    status: "Pending",
    log: [],
  },
  {
    id: "r3",
    sender: "System",
    target: "Carol Lee",
    requestId: "SOS-1009",
    reason: "Safety Risk",
    description: "Multiple users flagged this account for suspicious activity.",
    timestamp: "2025-06-17 09:30",
    status: "Reviewed",
    log: ["Reviewed by Admin User on 2025-06-18"],
  },
];

const ACTIONS = [
  { label: "Dismiss", icon: "close-circle", color: "#888" },
  { label: "Warn", icon: "alert-circle", color: "#fbbf24" },
  { label: "Escalate", icon: "arrow-up-circle", color: "#3b82f6" },
  { label: "Disable Account", icon: "remove-circle", color: "#ef4444" },
];

function StatusTag({ status }: { status: ReportStatus }) {
  let color = "#fbbf24";
  if (status === "Reviewed") color = "#3b82f6";
  if (status === "Resolved") color = "#22c55e";
  if (status === "Pending") color = "#ef4444";
  return (
    <View style={{ backgroundColor: color + "22", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3, alignSelf: "flex-start" }}>
      <Text style={{ color, fontWeight: "bold", fontSize: 12 }}>{status}</Text>
    </View>
  );
}

export default function ModerationPanel() {
  const colorScheme = useColorScheme() ?? "light";
  const [reports, setReports] = useState<Report[]>(MOCK_REPORTS);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [modal, setModal] = useState<{ report: Report; action: string } | null>(null);

  // Handle action on report
  const handleAction = (report: Report, action: string) => {
    let newStatus: ReportStatus = report.status;
    let logMsg = "";
    if (action === "Dismiss") {
      newStatus = "Resolved";
      logMsg = `Dismissed by Admin on ${new Date().toISOString().slice(0, 10)}`;
    } else if (action === "Warn") {
      newStatus = "Reviewed";
      logMsg = `Warning issued by Admin on ${new Date().toISOString().slice(0, 10)}`;
    } else if (action === "Escalate") {
      newStatus = "Reviewed";
      logMsg = `Escalated by Admin on ${new Date().toISOString().slice(0, 10)}`;
    } else if (action === "Disable Account") {
      newStatus = "Resolved";
      logMsg = `Account disabled by Admin on ${new Date().toISOString().slice(0, 10)}`;
    }
    setReports((prev) =>
      prev.map((r) =>
        r.id === report.id
          ? {
              ...r,
              status: newStatus,
              log: [...r.log, logMsg],
            }
          : r
      )
    );
    setModal(null);
    Alert.alert("Action Complete", `Action "${action}" has been applied.`);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors[colorScheme].background }}>
      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 40 }}>
        <Text style={{
          fontSize: 24,
          fontWeight: "bold",
          color: Colors[colorScheme].tint,
          marginBottom: 18,
        }}>
          Moderation Panel
        </Text>
        {reports.length === 0 && (
          <View style={{ alignItems: "center", marginTop: 40 }}>
            <MaterialCommunityIcons name="shield-alert" size={48} color="#ccc" />
            <Text style={{ color: "#888", marginTop: 10 }}>No reports to review.</Text>
          </View>
        )}
        {reports.map((report) => (
          <View
            key={report.id}
            style={[
              styles.reportCard,
              { borderColor: report.status === "Pending" ? "#ef4444" : "#3b82f6" },
            ]}
          >
            <TouchableOpacity
              onPress={() => setExpanded(expanded === report.id ? null : report.id)}
              style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
              accessibilityRole="button"
              accessibilityLabel={`Expand report from ${report.sender} about ${report.target}`}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.reportReason}>{report.reason}</Text>
                <Text style={styles.reportMeta}>
                  <Ionicons name="person" size={14} color="#888" /> {report.sender} {" "}
                  <Ionicons name="arrow-forward" size={12} color="#888" /> {report.target}
                </Text>
                <Text style={styles.reportMeta}>
                  <MaterialCommunityIcons name="identifier" size={14} color="#888" /> {report.requestId}
                  {"  "}
                  <Ionicons name="time" size={14} color="#888" /> {report.timestamp}
                </Text>
              </View>
              <StatusTag status={report.status} />
              <Ionicons
                name={expanded === report.id ? "chevron-up" : "chevron-down"}
                size={22}
                color={Colors[colorScheme].tint}
                style={{ marginLeft: 8 }}
              />
            </TouchableOpacity>
            {expanded === report.id && (
              <View style={styles.reportDetails}>
                <Text style={styles.reportDesc}>{report.description}</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 10 }}>
                  {ACTIONS.map((action) => (
                    <TouchableOpacity
                      key={action.label}
                      style={[
                        styles.actionBtn,
                        { backgroundColor: action.color + "22", borderColor: action.color },
                        report.status !== "Pending" && { opacity: 0.5 },
                      ]}
                      onPress={() => setModal({ report, action: action.label })}
                      disabled={report.status !== "Pending"}
                      accessibilityRole="button"
                      accessibilityLabel={`Action: ${action.label}`}
                    >
                      <Ionicons name={action.icon as any} size={18} color={action.color} />
                      <Text style={[styles.actionText, { color: action.color }]}>{action.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {/* Decision log */}
                {report.log.length > 0 && (
                  <View style={{ marginTop: 10 }}>
                    <Text style={{ fontWeight: "bold", fontSize: 13, marginBottom: 2 }}>Decision Log:</Text>
                    {report.log.map((entry, idx) => (
                      <Text key={idx} style={{ color: "#888", fontSize: 12, marginLeft: 8 }}>
                        • {entry}
                      </Text>
                    ))}
                  </View>
                )}
              </View>
            )}
          </View>
        ))}
      </ScrollView>
      {/* Action Modal */}
      <Modal visible={!!modal} transparent animationType="fade" onRequestClose={() => setModal(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={{ fontWeight: "bold", fontSize: 18, marginBottom: 10 }}>
              Confirm Action
            </Text>
            <Text style={{ marginBottom: 16 }}>
              Are you sure you want to <Text style={{ fontWeight: "bold" }}>{modal?.action}</Text> this report?
            </Text>
            <View style={{ flexDirection: "row", justifyContent: "flex-end" }}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: "#eee" }]}
                onPress={() => setModal(null)}
              >
                <Text style={{ color: "#222" }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: Colors.light.tint }]}
                onPress={() => modal && handleAction(modal.report, modal.action)}
              >
                <Text style={{ color: "#fff", fontWeight: "bold" }}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  reportCard: {
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 16,
    marginBottom: 18,
    backgroundColor: "#fff",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  reportReason: {
    fontWeight: "bold",
    fontSize: 16,
    color: "#222",
    marginBottom: 2,
  },
  reportMeta: {
    color: "#888",
    fontSize: 12,
    marginBottom: 1,
  },
  reportDetails: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    paddingTop: 10,
  },
  reportDesc: {
    color: "#333",
    fontSize: 14,
    marginBottom: 2,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 10,
    marginBottom: 8,
  },
  actionText: {
    fontWeight: "bold",
    marginLeft: 6,
    fontSize: 13,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.18)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: 320,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 22,
    elevation: 6,
  },
  modalBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
    marginLeft: 10,
    marginTop: 8,
  },
});