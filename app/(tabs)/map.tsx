import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";
import { getFirestore, collection, onSnapshot, Timestamp, doc, updateDoc, getDoc, addDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const { width } = Dimensions.get("window");
const isTablet = width >= 768;

const EMERGENCY_TYPES = [
  "All",
  "Medical Emergency",
  "Fire Outbreak",
  "Armed Robbery",
  "Car Accident",
  "Domestic Violence",
  "Natural Disaster",
  "Missing Person",
  "Public Disturbance",
  "Other",
];

const TYPE_ICONS: Record<string, any> = {
  "Medical Emergency": "medical-bag",
  "Fire Outbreak": "fire",
  "Armed Robbery": "pistol",
  "Car Accident": "car-crash",
  "Domestic Violence": "account-group",
  "Natural Disaster": "weather-hurricane",
  "Missing Person": "account-search",
  "Public Disturbance": "account-alert",
  "Other": "alert-circle",
};

const LEVEL_COLORS: Record<string, string> = {
  High: "#ef4444",
  Medium: "#fbbf24",
  Low: "#3b82f6",
};

function timeAgo(date: Date) {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

type SOSRequest = {
  id: string;
  userId: string;
  latitude: number;
  longitude: number;
  emergencyType: string;
  description: string;
  urgency: "High" | "Medium" | "Low";
  createdAt: Timestamp;
  isPublic: boolean;
  senderName?: string;
  senderContact?: string;
  status?: string;
  responderId?: string;
  responderName?: string;
  responderRole?: string;
  address?: string;
};

export default function EmergencyFeedScreen() {
  const colorScheme = useColorScheme() ?? "light";
  const [view, setView] = useState<"list" | "map">(isTablet ? "list" : "list");
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [sosRequests, setSosRequests] = useState<SOSRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSOS, setSelectedSOS] = useState<SOSRequest | null>(null);
  const [typeFilter, setTypeFilter] = useState("All");
  const mapRef = useRef<MapView>(null);

  // --- Fetch User Location ---
  useEffect(() => {
    (async () => {
      let { status } = await import("expo-location").then((m) => m.requestForegroundPermissionsAsync());
      if (status !== "granted") {
        setLoading(false);
        return;
      }
      let location = await import("expo-location").then((m) => m.getCurrentPositionAsync({}));
      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
      setLoading(false);
    })();
  }, []);

  // --- Firestore Listener for SOS Requests ---
  useEffect(() => {
    const db = getFirestore();
    const q = collection(db, "sos_requests");
    const unsub = onSnapshot(q, (snapshot) => {
      const allSOS: SOSRequest[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        allSOS.push({
          id: docSnap.id,
          userId: data.userId,
          latitude: data.latitude,
          longitude: data.longitude,
          emergencyType: data.emergencyType,
          description: data.description,
          urgency: data.urgency,
          createdAt: data.createdAt,
          isPublic: data.isPublic,
          senderName: data.senderName,
          senderContact: data.senderContact,
          status: data.status,
          responderId: data.responderId,
          responderName: data.responderName,
          responderRole: data.responderRole,
          address: data.address,
        });
      });
      setSosRequests(allSOS);
    });
    return () => unsub();
  }, []);

  // --- Filtering ---
  const filteredSOS = sosRequests.filter((sos) =>
    typeFilter === "All" ? true : sos.emergencyType === typeFilter
  );

  // --- Map Region ---
  const initialRegion =
    userLocation
      ? {
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          latitudeDelta: 0.04,
          longitudeDelta: 0.04,
        }
      : {
          latitude: 28.6139,
          longitude: 77.209,
          latitudeDelta: 0.04,
          longitudeDelta: 0.04,
        };

  // --- Marker Press ---
  const handleMarkerPress = (sos: SOSRequest) => {
    setSelectedSOS(sos);
  };

  // --- Respond Action ---
  const handleRespond = async (sos: SOSRequest) => {
    const auth = getAuth();
    const currentUser = auth.currentUser;
    if (!currentUser) {
      alert("You must be logged in to respond.");
      return;
    }
    try {
      const db = getFirestore();
      // Fetch employee profile
      const userDoc = await getDoc(doc(db, "users", currentUser.uid));
      const userData = userDoc.exists() ? userDoc.data() : {};
      const responderName =
        userData.fullName ||
        userData.name ||
        currentUser.displayName ||
        currentUser.email ||
        "Unknown";
      const responderRole = userData.role || "employee";

      // Update SOS with responder info
      await updateDoc(doc(db, "sos_requests", sos.id), {
        status: "responded",
        responderId: currentUser.uid,
        responderName,
        responderRole,
        respondedAt: Timestamp.now(),
      });

      // Add notification (optional)
      await addDoc(collection(db, "notifications"), {
        toUserId: sos.userId,
        sosId: sos.id,
        type: "sos_responded",
        message: `Your SOS has been accepted and responded, help is on the way by ${responderName} (${responderRole}).`,
        responderId: currentUser.uid,
        responderName,
        responderRole,
        createdAt: Timestamp.now(),
        read: false,
      });

      alert("You have accepted and responded to this SOS.");
      setSelectedSOS(null);
    } catch (e: any) {
      alert("Failed to accept and respond. " + (e?.message || ""));
    }
  };

  // --- UI ---
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors[colorScheme].background }}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Emergency Feed</Text>
        <View style={styles.headerTabs}>
          <TouchableOpacity
            style={[styles.tabBtn, view === "list" && styles.tabBtnActive]}
            onPress={() => setView("list")}
          >
            <Ionicons name="list" size={20} color={view === "list" ? "#2563eb" : "#888"} />
            <Text style={[styles.tabBtnText, view === "list" && styles.tabBtnTextActive]}>List</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, view === "map" && styles.tabBtnActive]}
            onPress={() => setView("map")}
          >
            <Ionicons name="map" size={20} color={view === "map" ? "#2563eb" : "#888"} />
            <Text style={[styles.tabBtnText, view === "map" && styles.tabBtnTextActive]}>Map</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Filters with vertical text */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
        {EMERGENCY_TYPES.map((type) => (
          <TouchableOpacity
            key={type}
            style={[styles.filterChip, typeFilter === type && styles.filterChipActive]}
            onPress={() => setTypeFilter(type)}
          >
            <Text
              style={[
                styles.verticalRotatedText,
                { color: typeFilter === type ? "#fff" : "#222" },
              ]}
              numberOfLines={1}
            >
              {type}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* List View */}
      {view === "list" && (
        <FlatList
          data={filteredSOS.sort((a, b) =>
            b.createdAt?.toMillis?.() - a.createdAt?.toMillis?.()
          )}
          keyExtractor={(item) => item.id}
          style={{ flex: 1, paddingHorizontal: 12 }}
          contentContainerStyle={{ paddingBottom: 24 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.emergencyCard,
                { borderLeftColor: LEVEL_COLORS[item.urgency] || "#2563eb" },
              ]}
              onPress={() => handleMarkerPress(item)}
              activeOpacity={0.85}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <MaterialCommunityIcons
                  name={TYPE_ICONS[item.emergencyType] || "alert-circle"}
                  size={22}
                  color={LEVEL_COLORS[item.urgency] || "#2563eb"}
                />
                <Text style={styles.emergencyType}>{item.emergencyType}</Text>
                <Text style={[styles.levelTag, { color: LEVEL_COLORS[item.urgency] || "#2563eb" }]}>
                  {item.urgency}
                </Text>
                <Text style={styles.statusTag}>{item.status || "Open"}</Text>
              </View>
              <Text style={styles.emergencyUser}>
                <Ionicons name="person" size={14} color="#888" /> {item.senderName || "Unknown"}
              </Text>
              {item.address && (
                <Text style={styles.emergencyAddress}>
                  <Ionicons name="location" size={14} color="#3b82f6" /> {item.address}
                </Text>
              )}
              <Text style={styles.emergencyDesc}>{item.description}</Text>
              <Text style={styles.emergencyTime}>
                <Ionicons name="time" size={14} color="#888" />{" "}
                {item.createdAt?.toDate ? timeAgo(item.createdAt.toDate()) : ""}
              </Text>
              {/* Controls */}
              {(!item.responderId || item.status !== "responded") && (
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: "#22c55e22" }]}
                    onPress={() => handleRespond(item)}
                  >
                    <Ionicons name="checkmark" size={18} color="#22c55e" />
                    <Text style={[styles.actionText, { color: "#22c55e" }]}>Accept & Respond</Text>
                  </TouchableOpacity>
                </View>
              )}
              {item.responderId && item.status === "responded" && (
                <Text style={{ color: "#22c55e", fontWeight: "bold", marginTop: 6 }}>
                  Responded by {item.responderName || "Employee"}
                </Text>
              )}
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <Text style={{ color: "#888", textAlign: "center", marginTop: 40 }}>
              No emergencies found.
            </Text>
          }
        />
      )}

      {/* Map View */}
      {view === "map" && (
        <View style={styles.mapContainer}>
          {loading || !userLocation ? (
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
              <ActivityIndicator size="large" color={Colors[colorScheme].tint} />
              <Text>Loading map...</Text>
            </View>
          ) : (
            <MapView
              ref={mapRef}
              style={{ flex: 1, borderRadius: 16 }}
              initialRegion={initialRegion}
              showsUserLocation
              showsMyLocationButton
            >
              {filteredSOS.map((item) => (
                <Marker
                  key={item.id}
                  coordinate={{ latitude: item.latitude, longitude: item.longitude }}
                  pinColor={LEVEL_COLORS[item.urgency]}
                  onPress={() => handleMarkerPress(item)}
                >
                  <View style={styles.markerPin}>
                    <MaterialCommunityIcons
                      name={TYPE_ICONS[item.emergencyType] || "alert-circle"}
                      size={22}
                      color="#fff"
                    />
                  </View>
                </Marker>
              ))}
            </MapView>
          )}
        </View>
      )}

      {/* Emergency Detail Modal */}
      <Modal
        visible={!!selectedSOS}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedSOS(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              onPress={() => setSelectedSOS(null)}
              style={{ position: "absolute", right: 10, top: 10, zIndex: 10 }}
            >
              <Ionicons name="close" size={28} color="#888" />
            </TouchableOpacity>
            {selectedSOS && (
              <>
                <Text style={styles.modalTitle}>{selectedSOS.emergencyType}</Text>
                <Text style={styles.modalLevel}>
                  <Text style={{ color: LEVEL_COLORS[selectedSOS.urgency], fontWeight: "bold" }}>
                    {selectedSOS.urgency}
                  </Text>{" "}
                  · {selectedSOS.status || "Open"}
                </Text>
                <Text style={styles.modalUser}>
                  <Ionicons name="person" size={16} color="#888" /> {selectedSOS.senderName || "Unknown"}
                </Text>
                {selectedSOS.address && (
                  <Text style={styles.modalAddress}>
                    <Ionicons name="location" size={16} color="#3b82f6" /> {selectedSOS.address}
                  </Text>
                )}
                <Text style={styles.modalDesc}>{selectedSOS.description}</Text>
                <Text style={styles.modalTime}>
                  <Ionicons name="time" size={16} color="#888" />{" "}
                  {selectedSOS.createdAt?.toDate ? timeAgo(selectedSOS.createdAt.toDate()) : ""}
                </Text>
                {(!selectedSOS.responderId || selectedSOS.status !== "responded") && (
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: "#22c55e22", marginTop: 18 }]}
                    onPress={() => handleRespond(selectedSOS)}
                  >
                    <Ionicons name="checkmark" size={18} color="#22c55e" />
                    <Text style={[styles.actionText, { color: "#22c55e" }]}>Accept & Respond</Text>
                  </TouchableOpacity>
                )}
                {selectedSOS.responderId && selectedSOS.status === "responded" && (
                  <Text style={{ color: "#22c55e", fontWeight: "bold", marginTop: 18 }}>
                    Responded by {selectedSOS.responderName || "Employee"}
                  </Text>
                )}
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  verticalRotatedText: {
    transform: [{ rotate: "-90deg" }],
    fontSize: 13,
    lineHeight: 15,
    textAlign: "center",
    minWidth: 30,
    fontWeight: "bold",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    paddingBottom: 0,
  },
  headerTitle: {
    fontSize: isTablet ? 28 : 20,
    fontWeight: "bold",
    color: "#2563eb",
  },
  headerTabs: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  tabBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
    marginLeft: 8,
  },
  tabBtnActive: {
    backgroundColor: "#dbeafe",
  },
  tabBtnText: {
    marginLeft: 4,
    color: "#888",
    fontWeight: "bold",
  },
  tabBtnTextActive: {
    color: "#2563eb",
  },
  filterRow: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  filterChip: {
    backgroundColor: "#f1f5f9",
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 7,
    marginRight: 8,
    marginBottom: 8,
    minWidth: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  filterChipActive: {
    backgroundColor: "#2563eb",
  },
  verticalTextContainer: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 60,
  },
  verticalText: {
    fontSize: 13,
    lineHeight: 15,
    textAlign: "center",
  },
  emergencyCard: {
    borderRadius: 14,
    borderLeftWidth: 6,
    backgroundColor: "#fff",
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  emergencyType: {
    fontWeight: "bold",
    fontSize: 15,
    marginLeft: 8,
    marginRight: 8,
    color: "#222",
  },
  levelTag: {
    fontWeight: "bold",
    fontSize: 13,
    marginRight: 8,
  },
  statusTag: {
    backgroundColor: "#f1f5f9",
    color: "#2563eb",
    fontWeight: "bold",
    fontSize: 12,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
  },
  emergencyUser: {
    color: "#888",
    fontSize: 13,
    marginTop: 2,
  },
  emergencyAddress: {
    color: "#3b82f6",
    fontSize: 13,
    marginTop: 2,
  },
  emergencyDesc: {
    color: "#222",
    fontSize: 13,
    marginTop: 2,
  },
  emergencyTime: {
    color: "#888",
    fontSize: 13,
    marginTop: 2,
  },
  actionRow: {
    flexDirection: "row",
    marginTop: 10,
    gap: 10,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 8,
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
  mapContainer: {
    flex: 1,
    margin: 12,
    borderRadius: 16,
    overflow: "hidden",
    minHeight: 320,
    backgroundColor: "#eee",
  },
  markerPin: {
    backgroundColor: "#2563eb",
    borderRadius: 16,
    padding: 4,
    borderWidth: 2,
    borderColor: "#fff",
    elevation: 2,
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
    alignItems: "flex-start",
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#2563eb",
    marginBottom: 6,
  },
  modalLevel: {
    fontSize: 16,
    marginBottom: 6,
  },
  modalUser: {
    color: "#888",
    fontSize: 15,
    marginBottom: 2,
  },
  modalAddress: {
    color: "#3b82f6",
    fontSize: 15,
    marginBottom: 2,
  },
  modalDesc: {
    color: "#222",
    fontSize: 15,
    marginBottom: 2,
  },
  modalTime: {
    color: "#888",
    fontSize: 15,
    marginBottom: 12,
  },
});