import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
    Dimensions,
    FlatList,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");
const isTablet = width >= 768;

// Mock emergency feed data
const EMERGENCIES = [
  {
    id: "sos-1001",
    type: "Medical",
    level: "Critical",
    user: "Alice Johnson",
    status: "Open",
    assigned: false,
    location: { latitude: 28.6139, longitude: 77.209 },
    address: "Sector 12, North",
    distance: 1.2,
    raised: "2025-06-20T09:30:00Z",
    timeAgo: "5 min ago",
  },
  {
    id: "sos-1002",
    type: "Fire",
    level: "High",
    user: "Carol Lee",
    status: "Assigned",
    assigned: true,
    location: { latitude: 28.6145, longitude: 77.215 },
    address: "Market Road, North",
    distance: 2.5,
    raised: "2025-06-20T08:55:00Z",
    timeAgo: "40 min ago",
  },
  {
    id: "sos-1003",
    type: "Police",
    level: "Moderate",
    user: "David Kumar",
    status: "Open",
    assigned: false,
    location: { latitude: 28.6100, longitude: 77.210 },
    address: "Main Square, North",
    distance: 0.8,
    raised: "2025-06-20T09:50:00Z",
    timeAgo: "2 min ago",
  },
];

const LEVEL_COLORS: Record<string, string> = {
  Critical: "#ef4444",
  High: "#fbbf24",
  Moderate: "#3b82f6",
};

const EMERGENCY_TYPES = ["All", "Medical", "Fire", "Police"];
const URGENCY_LEVELS = ["All", "Critical", "High", "Moderate"];
const DISTANCE_FILTERS = ["All", "< 1km", "< 2km", "< 5km"];

export default function EmergencyFeedScreen() {
  const colorScheme = useColorScheme() ?? "light";
  const [view, setView] = useState<"list" | "map" | "dual">(isTablet ? "dual" : "list");
  const [selectedEmergency, setSelectedEmergency] = useState<any | null>(null);
  const [typeFilter, setTypeFilter] = useState("All");
  const [urgencyFilter, setUrgencyFilter] = useState("All");
  const [distanceFilter, setDistanceFilter] = useState("All");

  // Filtering logic
  const filteredEmergencies = EMERGENCIES.filter((e) => {
    if (typeFilter !== "All" && e.type !== typeFilter) return false;
    if (urgencyFilter !== "All" && e.level !== urgencyFilter) return false;
    if (distanceFilter === "< 1km" && e.distance >= 1) return false;
    if (distanceFilter === "< 2km" && e.distance >= 2) return false;
    if (distanceFilter === "< 5km" && e.distance >= 5) return false;
    return true;
  });

  // Accept/Reject/Arrived actions (frontend only)
  const handleAction = (emergency: any, action: string) => {
    setSelectedEmergency(null);
    // UI feedback only
    alert(`"${action}" for ${emergency.id} (${emergency.type})`);
  };

  // Map region (centered on first emergency or fallback)
  const initialRegion = {
    latitude: filteredEmergencies[0]?.location.latitude ?? 28.6139,
    longitude: filteredEmergencies[0]?.location.longitude ?? 77.209,
    latitudeDelta: 0.02,
    longitudeDelta: 0.02,
  };

  // Dual-pane for tablets
  const dualPane = isTablet && view === "dual";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors[colorScheme].background }}>
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Emergency Feed</Text>
        <View style={styles.headerTabs}>
          <TouchableOpacity
            style={[styles.tabBtn, (view === "list" || dualPane) && styles.tabBtnActive]}
            onPress={() => setView(isTablet ? "dual" : "list")}
          >
            <Ionicons name="list" size={20} color={view === "list" || dualPane ? "#2563eb" : "#888"} />
            <Text style={[styles.tabBtnText, (view === "list" || dualPane) && styles.tabBtnTextActive]}>List</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, view === "map" && !dualPane && styles.tabBtnActive]}
            onPress={() => setView("map")}
          >
            <Ionicons name="map" size={20} color={view === "map" && !dualPane ? "#2563eb" : "#888"} />
            <Text style={[styles.tabBtnText, view === "map" && !dualPane && styles.tabBtnTextActive]}>Map</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
        {EMERGENCY_TYPES.map((type) => (
          <TouchableOpacity
            key={type}
            style={[styles.filterChip, typeFilter === type && styles.filterChipActive]}
            onPress={() => setTypeFilter(type)}
          >
            <Text style={{ color: typeFilter === type ? "#fff" : "#222" }}>{type}</Text>
          </TouchableOpacity>
        ))}
        {URGENCY_LEVELS.map((level) => (
          <TouchableOpacity
            key={level}
            style={[styles.filterChip, urgencyFilter === level && styles.filterChipActive]}
            onPress={() => setUrgencyFilter(level)}
          >
            <Text style={{ color: urgencyFilter === level ? "#fff" : "#222" }}>{level}</Text>
          </TouchableOpacity>
        ))}
        {DISTANCE_FILTERS.map((dist) => (
          <TouchableOpacity
            key={dist}
            style={[styles.filterChip, distanceFilter === dist && styles.filterChipActive]}
            onPress={() => setDistanceFilter(dist)}
          >
            <Text style={{ color: distanceFilter === dist ? "#fff" : "#222" }}>{dist}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={{ flex: 1, flexDirection: dualPane ? "row" : "column" }}>
        {/* List View */}
        {(view === "list" || dualPane) && (
          <FlatList
            data={filteredEmergencies}
            keyExtractor={(item) => item.id}
            style={[dualPane && { flex: 1 }]}
            contentContainerStyle={{ padding: 12 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.emergencyCard,
                  { borderLeftColor: LEVEL_COLORS[item.level] },
                  dualPane && { marginRight: 12 },
                ]}
                onPress={() => setSelectedEmergency(item)}
                activeOpacity={0.85}
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <MaterialCommunityIcons
                    name={
                      item.type === "Medical"
                        ? "medical-bag"
                        : item.type === "Fire"
                        ? "fire"
                        : "police-badge"
                    }
                    size={22}
                    color={LEVEL_COLORS[item.level]}
                  />
                  <Text style={styles.emergencyType}>{item.type}</Text>
                  <Text style={[styles.levelTag, { color: LEVEL_COLORS[item.level] }]}>
                    {item.level === "Critical" ? "🔴" : item.level === "High" ? "🟠" : "🔵"} {item.level}
                  </Text>
                  <Text style={styles.statusTag}>{item.status}</Text>
                </View>
                <Text style={styles.emergencyUser}>
                  <Ionicons name="person" size={14} color="#888" /> {item.user}
                </Text>
                <Text style={styles.emergencyAddress}>
                  <Ionicons name="location" size={14} color="#3b82f6" /> {item.address}
                </Text>
                <View style={{ flexDirection: "row", alignItems: "center", marginTop: 2 }}>
                  <MaterialCommunityIcons name="map-marker-distance" size={16} color="#fbbf24" />
                  <Text style={styles.emergencyProximity}>{item.distance} km</Text>
                  <Ionicons name="time" size={14} color="#888" style={{ marginLeft: 10 }} />
                  <Text style={styles.emergencyTime}>{item.timeAgo}</Text>
                </View>
                {/* Controls */}
                <View style={styles.actionRow}>
                  {!item.assigned && (
                    <>
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: "#22c55e22" }]}
                        onPress={() => handleAction(item, "Accept")}
                      >
                        <Ionicons name="checkmark" size={18} color="#22c55e" />
                        <Text style={[styles.actionText, { color: "#22c55e" }]}>Accept</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: "#ef444422" }]}
                        onPress={() => handleAction(item, "Reject")}
                      >
                        <Ionicons name="close" size={18} color="#ef4444" />
                        <Text style={[styles.actionText, { color: "#ef4444" }]}>Reject</Text>
                      </TouchableOpacity>
                    </>
                  )}
                  {item.assigned && (
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: "#3b82f622" }]}
                      onPress={() => handleAction(item, "Mark as Arrived")}
                    >
                      <Ionicons name="flag" size={18} color="#3b82f6" />
                      <Text style={[styles.actionText, { color: "#3b82f6" }]}>Mark as Arrived</Text>
                    </TouchableOpacity>
                  )}
                </View>
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
        {(view === "map" || dualPane) && (
          <View style={[styles.mapContainer, dualPane && { flex: 1 }]}>
            <MapView
              style={{ flex: 1, borderRadius: 16 }}
              initialRegion={initialRegion}
              showsUserLocation
              showsMyLocationButton
            >
              {filteredEmergencies.map((item) => (
                <Marker
                  key={item.id}
                  coordinate={item.location}
                  pinColor={LEVEL_COLORS[item.level]}
                  onPress={() => setSelectedEmergency(item)}
                >
                  <View style={styles.markerPin}>
                    <MaterialCommunityIcons
                      name={
                        item.type === "Medical"
                          ? "medical-bag"
                          : item.type === "Fire"
                          ? "fire"
                          : "police-badge"
                      }
                      size={22}
                      color="#fff"
                    />
                  </View>
                </Marker>
              ))}
              {/* Example: route guidance (frontend only, mock polyline) */}
              {selectedEmergency && (
                <Polyline
                  coordinates={[
                    { latitude: 28.6139, longitude: 77.209 }, // Mock responder location
                    selectedEmergency.location,
                  ]}
                  strokeColor="#2563eb"
                  strokeWidth={4}
                />
              )}
            </MapView>
          </View>
        )}
      </View>

      {/* Emergency Detail Modal */}
      <Modal
        visible={!!selectedEmergency}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedEmergency(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              onPress={() => setSelectedEmergency(null)}
              style={{ position: "absolute", right: 10, top: 10, zIndex: 10 }}
            >
              <Ionicons name="close" size={28} color="#888" />
            </TouchableOpacity>
            {selectedEmergency && (
              <>
                <Text style={styles.modalTitle}>{selectedEmergency.type} Emergency</Text>
                <Text style={styles.modalLevel}>
                  <Text style={{ color: LEVEL_COLORS[selectedEmergency.level], fontWeight: "bold" }}>
                    {selectedEmergency.level}
                  </Text>{" "}
                  · {selectedEmergency.status}
                </Text>
                <Text style={styles.modalUser}>
                  <Ionicons name="person" size={16} color="#888" /> {selectedEmergency.user}
                </Text>
                <Text style={styles.modalAddress}>
                  <Ionicons name="location" size={16} color="#3b82f6" /> {selectedEmergency.address}
                </Text>
                <Text style={styles.modalTime}>
                  <Ionicons name="time" size={16} color="#888" /> {selectedEmergency.timeAgo}
                </Text>
                <View style={{ flexDirection: "row", marginTop: 18 }}>
                  {!selectedEmergency.assigned && (
                    <>
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: "#22c55e22" }]}
                        onPress={() => handleAction(selectedEmergency, "Accept")}
                      >
                        <Ionicons name="checkmark" size={18} color="#22c55e" />
                        <Text style={[styles.actionText, { color: "#22c55e" }]}>Accept</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: "#ef444422" }]}
                        onPress={() => handleAction(selectedEmergency, "Reject")}
                      >
                        <Ionicons name="close" size={18} color="#ef4444" />
                        <Text style={[styles.actionText, { color: "#ef4444" }]}>Reject</Text>
                      </TouchableOpacity>
                    </>
                  )}
                  {selectedEmergency.assigned && (
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: "#3b82f622" }]}
                      onPress={() => handleAction(selectedEmergency, "Mark as Arrived")}
                    >
                      <Ionicons name="flag" size={18} color="#3b82f6" />
                      <Text style={[styles.actionText, { color: "#3b82f6" }]}>Mark as Arrived</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginRight: 8,
    marginBottom: 8,
  },
  filterChipActive: {
    backgroundColor: "#2563eb",
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
  emergencyProximity: {
    color: "#fbbf24",
    fontSize: 13,
    marginLeft: 4,
  },
  emergencyTime: {
    color: "#888",
    fontSize: 13,
    marginLeft: 4,
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
  modalTime: {
    color: "#888",
    fontSize: 15,
    marginBottom: 12,
  },
});