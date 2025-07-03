import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Dimensions,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Animated,
  Easing,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getAuth, onAuthStateChanged, User } from "firebase/auth";
import {
  collection,
  query,
  getDocs,
  orderBy,
  doc,
  getDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";

const { width } = Dimensions.get("window");
const isTablet = width >= 768;

const STATUS_OPTIONS = [
  "Pending Review from Head",
  "Approved",
  "Rejected",
  "Needs Follow Up",
];

export default function AdminIncidentReportsScreen() {
  const colorScheme = useColorScheme() ?? "light";
  const theme = colorScheme;
  const s = styles(theme);
  const [reports, setReports] = useState<any[]>([]);
  const [userMap, setUserMap] = useState<{ [uid: string]: string }>({});
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [status, setStatus] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [filter, setFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  // Animation values
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(300))[0];
  const scaleAnim = useState(new Animated.Value(0.9))[0];

  // Auth state
  const [user, setUser] = useState<User | null>(null);
  useEffect(() => {
    const auth = getAuth();
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
    });
    return unsub;
  }, []);

  // Modal animations
  useEffect(() => {
    if (modalVisible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          easing: Easing.out(Easing.back(1.2)),
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 300,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [modalVisible]);

  // Fetch all incident reports and user names
  useEffect(() => {
    const fetchReports = async () => {
      setLoading(true);
      try {
        // Build query based on filter
        let q;
        if (filter === "All") {
          q = query(
            collection(db, "incident_reports"),
            orderBy("createdAt", "desc")
          );
        } else {
          q = query(
            collection(db, "incident_reports"),
            where("status", "==", filter),
            orderBy("createdAt", "desc")
          );
        }

        const snap = await getDocs(q);
        const reportsData = snap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Get unique employeeIds
        const employeeIds = Array.from(
          new Set(reportsData.map((r: any) => r.employeeId).filter(Boolean))
        );

        // Fetch user names for each employeeId
        const userMapTemp: { [uid: string]: string } = { ...userMap };
        await Promise.all(
          employeeIds.map(async (uid) => {
            if (!userMapTemp[uid]) {
              try {
                const userDoc = await getDoc(doc(db, "users", uid));
                userMapTemp[uid] =
                  userDoc.exists() && userDoc.data().fullName
                    ? userDoc.data().fullName
                    : "Unknown";
              } catch {
                userMapTemp[uid] = "Unknown";
              }
            }
          })
        );
        setUserMap(userMapTemp);
        setReports(reportsData);
      } catch (e) {
        console.error("Error fetching reports:", e);
        setReports([]);
      }
      setLoading(false);
    };
    fetchReports();
  }, [filter]);

  // Open report detail modal
  const openReport = (report: any) => {
    setSelectedReport(report);
    setStatus(report.status);
    setAdminNotes(report.adminNotes || "");
    setModalVisible(true);
  };

  // Update report status
  const handleStatusUpdate = async () => {
    if (!selectedReport || !status) return;
    
    try {
      await updateDoc(doc(db, "incident_reports", selectedReport.id), {
        status,
        adminNotes,
        reviewedAt: new Date(),
        reviewedBy: user?.uid,
      });
      Alert.alert("Success", "Report status updated successfully");
      setModalVisible(false);
      // Refresh reports
      setFilter(filter); // This will trigger useEffect to reload data
    } catch (e) {
      console.error("Error updating report:", e);
      Alert.alert("Error", "Failed to update report status");
    }
  };

  // Filter reports based on search query
  const filteredReports = reports.filter((report) => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    const user = userMap[report.employeeId] || "";
    return (
      user.toLowerCase().includes(searchLower) ||
      report.desc.toLowerCase().includes(searchLower) ||
      report.outcome.toLowerCase().includes(searchLower) ||
      report.status.toLowerCase().includes(searchLower)
    );
  });

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={s.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <ThemedView style={s.container}>
          {/* Header */}
          <ThemedText style={s.headerTitle}>Incident Reports</ThemedText>
          <ThemedText style={s.subtitle}>
            Review and manage all incident reports
          </ThemedText>

          {/* Filters */}
          <View style={s.filterRow}>
            <TouchableOpacity
              style={[s.filterBtn, filter === "All" && s.filterBtnActive]}
              onPress={() => setFilter("All")}
            >
              <ThemedText
                style={[
                  s.filterBtnText,
                  filter === "All" && s.filterBtnTextActive,
                ]}
              >
                All
              </ThemedText>
            </TouchableOpacity>
            {STATUS_OPTIONS.map((status) => (
              <TouchableOpacity
                key={status}
                style={[s.filterBtn, filter === status && s.filterBtnActive]}
                onPress={() => setFilter(status)}
              >
                <ThemedText
                  style={[
                    s.filterBtnText,
                    filter === status && s.filterBtnTextActive,
                  ]}
                >
                  {status.split(" ")[0]}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>

          {/* Search */}
          <View style={s.searchContainer}>
            <Ionicons
              name="search"
              size={18}
              color={Colors[theme].textMuted}
              style={s.searchIcon}
            />
            <TextInput
              style={s.searchInput}
              placeholder="Search reports..."
              placeholderTextColor={Colors[theme].textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {/* Reports List */}
          {loading ? (
            <ActivityIndicator
              size="large"
              color={Colors[theme].tint}
              style={{ marginTop: 40 }}
            />
          ) : (
            <View style={isTablet ? s.reportsGrid : {}}>
              {filteredReports.length === 0 && (
                <ThemedText style={{ color: Colors[theme].textMuted, marginTop: 20 }}>
                  {filter === "All"
                    ? "No reports found"
                    : `No ${filter.toLowerCase()} reports`}
                </ThemedText>
              )}
              {filteredReports.map((report) => (
                <TouchableOpacity
                  key={report.id}
                  style={[
                    s.reportCard,
                    report.status === "Rejected" && s.rejectedCard,
                    report.status === "Approved" && s.approvedCard,
                    report.status === "Needs Follow Up" && s.followUpCard,
                  ]}
                  onPress={() => openReport(report)}
                >
                  <View style={s.cardHeader}>
                    <ThemedText style={s.cardUser}>
                      {userMap[report.employeeId] || "Unknown"}
                    </ThemedText>
                    <ThemedText style={s.cardTime}>
                      {report.createdAt?.toDate
                        ? report.createdAt.toDate().toLocaleString()
                        : report.time || ""}
                    </ThemedText>
                  </View>
                  <ThemedText style={s.cardOutcome}>
                    Outcome: {report.outcome}
                  </ThemedText>
                  <ThemedText style={s.cardDesc} numberOfLines={2}>
                    {report.desc}
                  </ThemedText>
                  <View style={s.cardFooter}>
                    <View
                      style={[
                        s.statusBadge,
                        report.status === "Approved" && s.statusApproved,
                        report.status === "Rejected" && s.statusRejected,
                        report.status === "Needs Follow Up" && s.statusFollowUp,
                      ]}
                    >
                      <ThemedText style={s.statusText}>
                        {report.status}
                      </ThemedText>
                    </View>
                    {report.photoUrl && (
                      <Ionicons
                        name="image"
                        size={18}
                        color={Colors[theme].textMuted}
                      />
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ThemedView>
      </ScrollView>

      {/* Report Detail Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="none"
        onRequestClose={() => setModalVisible(false)}
      >
        <Animated.View
          style={{
            flex: 1,
            backgroundColor: `rgba(0,0,0,${theme === "dark" ? 0.7 : 0.5})`,
            justifyContent: "center",
            alignItems: "center",
            opacity: fadeAnim,
          }}
        >
          <Animated.View
            style={[
              s.modalContent,
              { transform: [{ translateY: slideAnim }, { scale: scaleAnim }] },
            ]}
          >
            {selectedReport && (
              <>
                <ThemedText style={s.modalTitle}>Report Details</ThemedText>

                <View style={s.modalSection}>
                  <ThemedText style={s.modalLabel}>Employee:</ThemedText>
                  <ThemedText style={s.modalValue}>
                    {userMap[selectedReport.employeeId] || "Unknown"}
                  </ThemedText>
                </View>

                <View style={s.modalSection}>
                  <ThemedText style={s.modalLabel}>Submitted:</ThemedText>
                  <ThemedText style={s.modalValue}>
                    {selectedReport.createdAt?.toDate
                      ? selectedReport.createdAt.toDate().toLocaleString()
                      : selectedReport.time || ""}
                  </ThemedText>
                </View>

                <View style={s.modalSection}>
                  <ThemedText style={s.modalLabel}>Outcome:</ThemedText>
                  <ThemedText style={s.modalValue}>
                    {selectedReport.outcome}
                  </ThemedText>
                </View>

                <View style={s.modalSection}>
                  <ThemedText style={s.modalLabel}>Description:</ThemedText>
                  <ThemedText style={s.modalValue}>
                    {selectedReport.desc}
                  </ThemedText>
                </View>

                {selectedReport.photoUrl && (
                  <View style={s.modalSection}>
                    <ThemedText style={s.modalLabel}>Photo:</ThemedText>
                    <Image
                      source={{ uri: selectedReport.photoUrl }}
                      style={s.modalPhoto}
                    />
                  </View>
                )}

                <View style={s.modalSection}>
                  <ThemedText style={s.modalLabel}>Current Status:</ThemedText>
                  <View style={s.statusRow}>
                    {STATUS_OPTIONS.map((option) => (
                      <TouchableOpacity
                        key={option}
                        style={[
                          s.statusOption,
                          status === option && s.statusOptionActive,
                        ]}
                        onPress={() => setStatus(option)}
                      >
                        <ThemedText
                          style={[
                            s.statusOptionText,
                            status === option && s.statusOptionTextActive,
                          ]}
                        >
                          {option}
                        </ThemedText>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={s.modalSection}>
                  <ThemedText style={s.modalLabel}>Admin Notes:</ThemedText>
                  <TextInput
                    style={s.modalInput}
                    value={adminNotes}
                    onChangeText={setAdminNotes}
                    placeholder="Add notes for the employee..."
                    placeholderTextColor={Colors[theme].textMuted}
                    multiline
                  />
                </View>

                <View style={s.modalButtons}>
                  <Pressable
                    style={({ pressed }) => [
                      s.modalButton,
                      s.modalCancelButton,
                      { opacity: pressed ? 0.6 : 1 },
                    ]}
                    onPress={() => setModalVisible(false)}
                  >
                    <ThemedText style={s.modalButtonText}>Cancel</ThemedText>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [
                      s.modalButton,
                      s.modalSubmitButton,
                      { opacity: pressed ? 0.6 : 1 },
                    ]}
                    onPress={handleStatusUpdate}
                  >
                    <ThemedText
                      style={[
                        s.modalButtonText,
                        { color: Colors[theme].background },
                      ]}
                    >
                      Update Status
                    </ThemedText>
                  </Pressable>
                </View>
              </>
            )}
          </Animated.View>
        </Animated.View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = (theme: "light" | "dark") =>
  StyleSheet.create({
    scrollContainer: {
      flexGrow: 1,
      paddingBottom: 40,
    },
    container: {
      flex: 1,
      padding: isTablet ? 24 : 16,
    },
    headerTitle: {
      fontSize: isTablet ? 26 : 22,
      fontWeight: "bold",
      color: Colors[theme].tint,
      marginBottom: 4,
    },
    subtitle: {
      fontSize: 15,
      color: Colors[theme].textMuted,
      marginBottom: 16,
    },
    filterRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginBottom: 16,
    },
    filterBtn: {
      backgroundColor:
        theme === "dark" ? Colors.dark.card : Colors.light.inputBackground,
      borderRadius: 16,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderWidth: 1,
      borderColor: Colors[theme].border,
    },
    filterBtnActive: {
      backgroundColor: Colors[theme].tint,
      borderColor: Colors[theme].tint,
    },
    filterBtnText: {
      fontSize: 14,
      color: Colors[theme].text,
    },
    filterBtnTextActive: {
      color: "#fff",
    },
    searchContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor:
        theme === "dark" ? Colors.dark.card : Colors.light.inputBackground,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      marginBottom: 16,
    },
    searchIcon: {
      marginRight: 8,
    },
    searchInput: {
      flex: 1,
      fontSize: 15,
      color: Colors[theme].text,
    },
    reportsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 16,
    },
    reportCard: {
      backgroundColor:
        theme === "dark" ? Colors.dark.card : Colors.light.inputBackground,
      borderRadius: 10,
      padding: 16,
      marginBottom: 12,
      minWidth: isTablet ? 280 : undefined,
      maxWidth: isTablet ? 360 : undefined,
      flex: isTablet ? undefined : 1,
    },
    approvedCard: {
      borderLeftWidth: 4,
      borderLeftColor: "#22c55e",
    },
    rejectedCard: {
      borderLeftWidth: 4,
      borderLeftColor: "#ef4444",
    },
    followUpCard: {
      borderLeftWidth: 4,
      borderLeftColor: "#f59e0b",
    },
    cardHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 8,
    },
    cardUser: {
      fontWeight: "bold",
      color: Colors[theme].tint,
      fontSize: 15,
    },
    cardTime: {
      color: Colors[theme].textMuted,
      fontSize: 12,
    },
    cardOutcome: {
      color: Colors[theme].text,
      fontSize: 14,
      marginBottom: 4,
    },
    cardDesc: {
      color: Colors[theme].text,
      fontSize: 13,
      marginBottom: 8,
    },
    cardFooter: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    statusBadge: {
      backgroundColor: theme === "dark" ? "#1e3a8a" : "#dbeafe",
      borderRadius: 12,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    statusApproved: {
      backgroundColor: theme === "dark" ? "#14532d" : "#dcfce7",
    },
    statusRejected: {
      backgroundColor: theme === "dark" ? "#7f1d1d" : "#fee2e2",
    },
    statusFollowUp: {
      backgroundColor: theme === "dark" ? "#713f12" : "#fef3c7",
    },
    statusText: {
      fontSize: 12,
      fontWeight: "bold",
      color: theme === "dark" ? "#fff" : Colors[theme].text,
    },
    modalContent: {
      width: isTablet ? 600 : "90%",
      maxHeight: "80%",
      backgroundColor: Colors[theme].background,
      borderRadius: 18,
      padding: 24,
      elevation: 6,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
    },
    modalTitle: {
      fontSize: isTablet ? 22 : 18,
      fontWeight: "bold",
      color: Colors[theme].tint,
      marginBottom: 16,
    },
    modalSection: {
      marginBottom: 16,
    },
    modalLabel: {
      fontSize: 14,
      fontWeight: "bold",
      color: Colors[theme].tint,
      marginBottom: 4,
    },
    modalValue: {
      fontSize: 15,
      color: Colors[theme].text,
    },
    modalPhoto: {
      width: "100%",
      height: 200,
      borderRadius: 8,
      marginTop: 8,
    },
    statusRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginTop: 8,
    },
    statusOption: {
      backgroundColor:
        theme === "dark" ? Colors.dark.card : Colors.light.inputBackground,
      borderRadius: 8,
      padding: 8,
      borderWidth: 1,
      borderColor: Colors[theme].border,
    },
    statusOptionActive: {
      backgroundColor: Colors[theme].tint,
      borderColor: Colors[theme].tint,
    },
    statusOptionText: {
      fontSize: 13,
      color: Colors[theme].text,
    },
    statusOptionTextActive: {
      color: "#fff",
    },
    modalInput: {
      borderWidth: 1,
      borderColor: Colors[theme].border,
      borderRadius: 8,
      padding: 12,
      fontSize: 15,
      color: Colors[theme].text,
      backgroundColor:
        theme === "dark" ? Colors.dark.card : Colors.light.inputBackground,
      marginTop: 8,
      minHeight: 80,
    },
    modalButtons: {
      flexDirection: "row",
      justifyContent: "flex-end",
      marginTop: 16,
      gap: 12,
    },
    modalButton: {
      borderRadius: 8,
      paddingVertical: 10,
      paddingHorizontal: 16,
      justifyContent: "center",
      alignItems: "center",
    },
    modalCancelButton: {
      backgroundColor:
        theme === "dark" ? Colors.dark.card : Colors.light.inputBackground,
    },
    modalSubmitButton: {
      backgroundColor: Colors[theme].tint,
    },
    modalButtonText: {
      fontWeight: "bold",
      fontSize: 15,
    },
  });