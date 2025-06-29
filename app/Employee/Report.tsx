import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
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
  Text,
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
  addDoc,
  query,
  getDocs,
  orderBy,
  Timestamp,
  doc,
  getDoc,
} from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db } from "../../lib/firebase";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";

const { width } = Dimensions.get("window");
const isTablet = width >= 768;

const OUTCOMES = ["Resolved", "No One Found", "Escalated"];
const MODERATION_REASONS = [
  "False Alert",
  "Inappropriate Behavior",
  "Suspicious Activity",
  "Other",
];

export default function IncidentReportScreen() {
  const colorScheme = useColorScheme() ?? "light";
  const theme = colorScheme;
  const s = styles(theme);
  const [desc, setDesc] = useState("");
  const [outcome, setOutcome] = useState(OUTCOMES[0]);
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [modModal, setModModal] = useState(false);
  const [modReason, setModReason] = useState("");
  const [modNotes, setModNotes] = useState("");
  const [modPhoto, setModPhoto] = useState<string | null>(null);
  const [modPhotoUploading, setModPhotoUploading] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [userMap, setUserMap] = useState<{ [uid: string]: string }>({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);

  // Animation values
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(300))[0];
  const chipScale = useState(new Animated.Value(1))[0];

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
    if (modModal) {
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
  }, [modModal]);

  // Fetch all incident reports and user names
  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      try {
        // Fetch all incident reports, newest first
        const q = query(
          collection(db, "incident_reports"),
          orderBy("createdAt", "desc")
        );
        const snap = await getDocs(q);
        const reports = snap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Get unique employeeIds
        const employeeIds = Array.from(
          new Set(reports.map((r: any) => r.employeeId).filter(Boolean))
        );

        // Fetch user names for each employeeId (cache in userMap)
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
        setHistory(reports);
      } catch (e) {
        setHistory([]);
      }
      setLoading(false);
    };
    fetchHistory();
    // eslint-disable-next-line
  }, [submitted]);

  // Pick image for main report and upload to storage
  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });
    if (!result.canceled && result.assets.length > 0) {
      setPhotoUploading(true);
      try {
        const uri = result.assets[0].uri;
        const storage = getStorage();
        const ext = uri.split(".").pop() || "jpg";
        const refPath = `incident_photos/${user?.uid}_${Date.now()}.${ext}`;
        const storageRef = ref(storage, refPath);
        const response = await fetch(uri);
        const blob = await response.blob();
        await uploadBytes(storageRef, blob);
        const downloadUrl = await getDownloadURL(storageRef);
        setPhoto(downloadUrl);
      } catch (e) {
        Alert.alert("Upload Error", "Failed to upload photo.");
      }
      setPhotoUploading(false);
    }
  };

  // Pick image for moderation and upload to storage
  const pickModImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });
    if (!result.canceled && result.assets.length > 0) {
      setModPhotoUploading(true);
      try {
        const uri = result.assets[0].uri;
        const storage = getStorage();
        const ext = uri.split(".").pop() || "jpg";
        const refPath = `moderation_photos/${user?.uid}_${Date.now()}.${ext}`;
        const storageRef = ref(storage, refPath);
        const response = await fetch(uri);
        const blob = await response.blob();
        await uploadBytes(storageRef, blob);
        const downloadUrl = await getDownloadURL(storageRef);
        setModPhoto(downloadUrl);
      } catch (e) {
        Alert.alert("Upload Error", "Failed to upload evidence photo.");
      }
      setModPhotoUploading(false);
    }
  };

  // Submit incident report to Firestore
  const handleSubmit = async () => {
    if (!desc.trim()) {
      Alert.alert("Description required", "Please describe the response.");
      return;
    }
    if (!user) {
      Alert.alert("Not logged in", "Please log in to submit a report.");
      return;
    }
    try {
      await addDoc(collection(db, "incident_reports"), {
        employeeId: user.uid,
        outcome,
        desc,
        photoUrl: photo || null,
        createdAt: Timestamp.now(),
        status: "Pending Review from Head",
      });
      setDesc("");
      setPhoto(null);
      setOutcome(OUTCOMES[0]);
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 2000);
    } catch (e) {
      console.log("Incident report error:", e);
      Alert.alert("Error", "Failed to submit report.");
    }
  };

  // Submit moderation report to Firestore
  const handleModSubmit = async () => {
    if (!modReason) {
      Alert.alert("Reason required", "Please select a reason for flagging.");
      return;
    }
    if (!user) {
      Alert.alert("Not logged in", "Please log in to flag.");
      return;
    }
    try {
      await addDoc(collection(db, "moderation_flags"), {
        employeeId: user.uid,
        reason: modReason,
        notes: modNotes,
        photoUrl: modPhoto || null,
        createdAt: Timestamp.now(),
        status: "Pending Review from Head",
      });
      Alert.alert("Flag Submitted", "Your moderation report has been submitted.");
      setModModal(false);
      setModReason("");
      setModNotes("");
      setModPhoto(null);
    } catch (e) {
      console.log("Moderation flag error:", e);
      Alert.alert("Error", "Failed to submit moderation flag.");
    }
  };

  // Toggle outcome with animation
  const toggleOutcome = (selectedOutcome: string) => {
    Animated.sequence([
      Animated.timing(chipScale, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(chipScale, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
    setOutcome(selectedOutcome);
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={s.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <ThemedView style={s.container}>
          {/* Header */}
          <ThemedText style={s.headerTitle}>Incident Report</ThemedText>

          {/* Report Form */}
          <ThemedText style={s.sectionTitle}>Describe Your Response</ThemedText>
          <TextInput
            style={s.input}
            value={desc}
            onChangeText={setDesc}
            placeholder="Describe what happened, actions taken, etc."
            placeholderTextColor={Colors[theme].textMuted}
            multiline
            numberOfLines={4}
          />

          <ThemedText style={s.sectionTitle}>Outcome</ThemedText>
          <View style={s.row}>
            {OUTCOMES.map((o) => (
              <Animated.View key={o} style={{ transform: [{ scale: chipScale }] }}>
                <TouchableOpacity
                  style={[s.chip, outcome === o && s.chipActive]}
                  onPress={() => toggleOutcome(o)}
                >
                  <ThemedText
                    style={[
                      s.chipText,
                      outcome === o && s.chipTextActive,
                    ]}
                  >
                    {o}
                  </ThemedText>
                </TouchableOpacity>
              </Animated.View>
            ))}
          </View>

          <ThemedText style={s.sectionTitle}>Attach Photo (optional)</ThemedText>
          <TouchableOpacity style={s.imageBtn} onPress={pickImage}>
            <Ionicons
              name="camera"
              size={20}
              color={Colors[theme].tint}
            />
            <ThemedText style={s.imageBtnText}>
              {photo ? "Change Photo" : "Upload Photo"}
            </ThemedText>
          </TouchableOpacity>
          {photoUploading && (
            <ActivityIndicator
              size="small"
              color={Colors[theme].tint}
              style={{ marginTop: 8 }}
            />
          )}
          {photo && (
            <Image source={{ uri: photo }} style={s.photoPreview} />
          )}

          <TouchableOpacity
            style={s.submitBtn}
            onPress={handleSubmit}
            activeOpacity={0.7}
          >
            <Ionicons name="checkmark-circle" size={20} color="#fff" />
            <ThemedText style={s.submitBtnText}>Submit Report</ThemedText>
          </TouchableOpacity>
          {submitted && (
            <ThemedText
              style={{ color: "#22c55e", marginTop: 8, fontWeight: "bold" }}
            >
              Report submitted!
            </ThemedText>
          )}

          {/* Moderation Tools */}
          <View style={s.modSection}>
            <ThemedText style={s.sectionTitle}>Flag Requester</ThemedText>
            <TouchableOpacity
              style={s.flagBtn}
              onPress={() => setModModal(true)}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="flag" size={20} color="#ef4444" />
              <ThemedText style={s.flagBtnText}>
                Flag for Misuse or Suspicious Behavior
              </ThemedText>
            </TouchableOpacity>
          </View>

          {/* Report History */}
          <ThemedText style={s.header}>All Incident Reports</ThemedText>
          {loading ? (
            <ActivityIndicator
              size="large"
              color={Colors[theme].tint}
              style={{ marginTop: 20 }}
            />
          ) : (
            <View style={isTablet ? s.historyRowTablet : {}}>
              {history.length === 0 && (
                <ThemedText style={{ color: Colors[theme].textMuted, marginTop: 10 }}>
                  No reports submitted yet.
                </ThemedText>
              )}
              {history.map((h) => (
                <View
                  key={h.id}
                  style={[
                    s.historyCard,
                    h.employeeId === user?.uid && {
                      borderColor: Colors[theme].tint,
                      borderWidth: 2,
                    },
                  ]}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginBottom: 2,
                    }}
                  >
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
                    <ThemedText style={s.historyOutcome}>
                      {h.outcome}
                    </ThemedText>
                    <ThemedText style={s.historyStatus}>
                      {h.status}
                    </ThemedText>
                  </View>
                  <ThemedText style={s.historyUser}>
                    {userMap[h.employeeId] || "Unknown"}
                    {h.employeeId === user?.uid && " (You)"}
                  </ThemedText>
                  <ThemedText style={s.historyDesc}>{h.desc}</ThemedText>
                  {h.photoUrl && (
                    <Image
                      source={{ uri: h.photoUrl }}
                      style={s.photoPreview}
                    />
                  )}
                  <ThemedText style={s.historyTime}>
                    {h.createdAt?.toDate
                      ? h.createdAt.toDate().toLocaleString()
                      : h.time || ""}
                  </ThemedText>
                </View>
              ))}
            </View>
          )}
        </ThemedView>
      </ScrollView>

      {/* Moderation Modal */}
      <Modal
        visible={modModal}
        transparent
        animationType="none"
        onRequestClose={() => setModModal(false)}
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
              { transform: [{ translateY: slideAnim }] },
            ]}
          >
            <ThemedText
              style={{ fontWeight: "bold", fontSize: 18, marginBottom: 10 }}
            >
              Flag Requester
            </ThemedText>
            <ThemedText style={{ marginBottom: 10 }}>
              Select a reason and add notes or evidence if needed.
            </ThemedText>
            {MODERATION_REASONS.map((r) => (
              <TouchableOpacity
                key={r}
                style={[s.chip, modReason === r && s.chipActive]}
                onPress={() => setModReason(r)}
              >
                <ThemedText
                  style={[
                    s.chipText,
                    modReason === r && s.chipTextActive,
                  ]}
                >
                  {r}
                </ThemedText>
              </TouchableOpacity>
            ))}
            <TextInput
              style={[s.input, { marginTop: 10 }]}
              value={modNotes}
              onChangeText={setModNotes}
              placeholder="Add notes (optional)"
              placeholderTextColor={Colors[theme].textMuted}
              multiline
            />
            <TouchableOpacity style={s.imageBtn} onPress={pickModImage}>
              <Ionicons
                name="camera"
                size={20}
                color={Colors[theme].tint}
              />
              <ThemedText style={s.imageBtnText}>
                {modPhoto ? "Change Photo" : "Upload Evidence"}
              </ThemedText>
            </TouchableOpacity>
            {modPhotoUploading && (
              <ActivityIndicator
                size="small"
                color={Colors[theme].tint}
                style={{ marginTop: 8 }}
              />
            )}
            {modPhoto && (
              <Image source={{ uri: modPhoto }} style={s.photoPreview} />
            )}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "flex-end",
                marginTop: 18,
                gap: 12,
              }}
            >
              <Pressable
                style={({ pressed }) => [
                  s.modalBtn,
                  s.modalCancelBtn,
                  { opacity: pressed ? 0.6 : 1 },
                ]}
                onPress={() => setModModal(false)}
              >
                <ThemedText style={s.modalBtnText}>Cancel</ThemedText>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  s.modalBtn,
                  s.modalSubmitBtn,
                  { opacity: pressed ? 0.6 : 1 },
                ]}
                onPress={handleModSubmit}
              >
                <ThemedText
                  style={[s.modalBtnText, { color: Colors[theme].background }]}
                >
                  Submit Flag
                </ThemedText>
              </Pressable>
            </View>
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
      marginBottom: 12,
      marginTop: 4,
    },
    header: {
      fontSize: isTablet ? 22 : 18,
      fontWeight: "bold",
      color: Colors[theme].tint,
      marginTop: 18,
      marginBottom: 8,
    },
    sectionTitle: {
      fontSize: 15,
      fontWeight: "600",
      marginTop: 18,
      marginBottom: 8,
      color: Colors[theme].text,
    },
    input: {
      borderWidth: 1,
      borderColor: Colors[theme].border,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: Platform.OS === "ios" ? 12 : 8,
      fontSize: 15,
      color: Colors[theme].text,
      backgroundColor:
        theme === "dark" ? Colors.dark.card : Colors.light.inputBackground,
      marginBottom: 8,
    },
    row: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginBottom: 8,
    },
    chip: {
      backgroundColor:
        theme === "dark" ? Colors.dark.card : Colors.light.inputBackground,
      borderRadius: 16,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderWidth: 1,
      borderColor: Colors[theme].border,
    },
    chipActive: {
      backgroundColor: Colors[theme].tint,
      borderColor: Colors[theme].tint,
    },
    chipText: {
      fontSize: 14,
      color: Colors[theme].text,
    },
    chipTextActive: {
      color: "#fff",
    },
    imageBtn: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor:
        theme === "dark" ? Colors.dark.card : Colors.light.inputBackground,
      borderRadius: 8,
      padding: 10,
      marginTop: 6,
      marginBottom: 6,
      alignSelf: "flex-start",
    },
    imageBtnText: {
      marginLeft: 8,
      color: Colors[theme].tint,
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
      backgroundColor: Colors[theme].tint,
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
      borderTopColor: Colors[theme].border,
      paddingTop: 12,
    },
    flagBtn: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme === "dark" ? "#2D1C1C" : "#fee2e2",
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
      backgroundColor:
        theme === "dark" ? Colors.dark.card : Colors.light.inputBackground,
      borderRadius: 10,
      padding: 14,
      marginBottom: 10,
      minWidth: isTablet ? 260 : undefined,
      maxWidth: isTablet ? 340 : undefined,
      flex: 1,
      marginRight: isTablet ? 10 : 0,
      marginTop: 8,
    },
    historyOutcome: {
      fontWeight: "bold",
      fontSize: 14,
      marginLeft: 8,
      marginRight: 8,
      color: Colors[theme].tint,
    },
    historyStatus: {
      backgroundColor: theme === "dark" ? "#1e3a8a" : "#dbeafe",
      color: Colors[theme].tint,
      fontWeight: "bold",
      fontSize: 12,
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 2,
      marginLeft: 8,
    },
    historyUser: {
      color: Colors[theme].tint,
      fontWeight: "bold",
      fontSize: 13,
      marginBottom: 2,
      marginTop: 2,
    },
    historyDesc: {
      color: Colors[theme].text,
      fontSize: 13,
      marginTop: 2,
      marginBottom: 2,
    },
    historyTime: {
      color: Colors[theme].textMuted,
      fontSize: 12,
      marginTop: 2,
    },
    modalContent: {
      width: isTablet ? 420 : "90%",
      backgroundColor: Colors[theme].background,
      borderRadius: 18,
      padding: 22,
      elevation: 6,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
    },
    modalBtn: {
      borderRadius: 8,
      paddingVertical: 10,
      paddingHorizontal: 16,
      justifyContent: "center",
      alignItems: "center",
    },
    modalCancelBtn: {
      backgroundColor:
        theme === "dark" ? Colors.dark.card : Colors.light.inputBackground,
    },
    modalSubmitBtn: {
      backgroundColor: Colors[theme].tint,
    },
    modalBtnText: {
      fontWeight: "bold",
      fontSize: 15,
    },
  });