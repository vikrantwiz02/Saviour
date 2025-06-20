import { Colors } from "@/constants/Colors"
import { useColorScheme } from "@/hooks/useColorScheme"
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons"
import React, { useState } from "react"
import { Dimensions, FlatList, Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native"
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps"
import { SafeAreaView } from "react-native-safe-area-context"

const { width } = Dimensions.get("window")
const isTablet = width >= 768

const EMERGENCY_TYPES = [
  { type: "Fire", color: "#ef4444", icon: "fire" },
  { type: "Medical", color: "#22c55e", icon: "medical-bag" },
  { type: "Disaster", color: "#3b82f6", icon: "earth" },
]

const STATUS_OPTIONS = ["All", "Pending", "Resolved"]
const TYPE_OPTIONS = ["All", ...EMERGENCY_TYPES.map(e => e.type)]
const REGION_OPTIONS = ["All", "North", "South", "East", "West"]

// Mock SOS data
const MOCK_ALERTS = [
  {
    id: "1",
    type: "Fire",
    status: "Pending",
    region: "North",
    raisedBy: "Alice",
    assigned: "Responder 1",
    time: "2025-06-19 10:15",
    lat: 28.6139,
    lng: 77.2090,
    location: "Connaught Place, Delhi",
  },
  {
    id: "2",
    type: "Medical",
    status: "Resolved",
    region: "East",
    raisedBy: "Bob",
    assigned: "Responder 2",
    time: "2025-06-19 09:50",
    lat: 28.7041,
    lng: 77.1025,
    location: "Laxmi Nagar, Delhi",
  },
  {
    id: "3",
    type: "Disaster",
    status: "Pending",
    region: "South",
    raisedBy: "Charlie",
    assigned: null,
    time: "2025-06-19 08:30",
    lat: 28.4089,
    lng: 77.3178,
    location: "Faridabad",
  },
]

function getTypeMeta(type: string) {
  return EMERGENCY_TYPES.find(e => e.type === type) || { color: "#888", icon: "alert" }
}

function FilterBar({
  status,
  type,
  region,
  setStatus,
  setType,
  setRegion,
  theme,
}: {
  status: string
  type: string
  region: string
  setStatus: (v: string) => void
  setType: (v: string) => void
  setRegion: (v: string) => void
  theme: "light" | "dark"
}) {
  return (
    <View style={styles.filterBar}>
      <FilterDropdown label="Status" value={status} options={STATUS_OPTIONS} onChange={setStatus} theme={theme} />
      <FilterDropdown label="Type" value={type} options={TYPE_OPTIONS} onChange={setType} theme={theme} />
      <FilterDropdown label="Region" value={region} options={REGION_OPTIONS} onChange={setRegion} theme={theme} />
    </View>
  )
}

function FilterDropdown({
  label,
  value,
  options,
  onChange,
  theme,
}: {
  label: string
  value: string
  options: string[]
  onChange: (v: string) => void
  theme: "light" | "dark"
}) {
  const [open, setOpen] = useState(false)
  return (
    <View style={styles.filterDropdown}>
      <TouchableOpacity
        style={[styles.filterBtn, { borderColor: Colors[theme].tint }]}
        onPress={() => setOpen(true)}
      >
        <Text style={{ color: Colors[theme].tint, fontWeight: "bold" }}>{label}: {value}</Text>
        <Ionicons name="chevron-down" size={16} color={Colors[theme].tint} />
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setOpen(false)}>
          <View style={[styles.modalContent, { backgroundColor: Colors[theme].background }]}>
            {options.map((opt: string) => (
              <TouchableOpacity key={opt} style={styles.modalOption} onPress={() => { onChange(opt); setOpen(false) }}>
                <Text style={{ color: value === opt ? Colors[theme].tint : Colors[theme].text, fontWeight: value === opt ? "bold" : "normal" }}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  )
}

function AlertDetailsModal({
  visible,
  alert,
  onClose,
  theme,
}: {
  visible: boolean
  alert: any
  onClose: () => void
  theme: "light" | "dark"
}) {
  if (!alert) return null
  const meta = getTypeMeta(alert.type)
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.detailsModal, { backgroundColor: Colors[theme].background }]}>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
            <MaterialCommunityIcons name={meta.icon as any}size={28} color={meta.color} />
            <Text style={{ fontWeight: "bold", fontSize: 20, marginLeft: 10, color: Colors[theme].text }}>{alert.type}</Text>
            <View style={[styles.statusTag, { backgroundColor: alert.status === "Pending" ? "#fde047" : "#bbf7d0" }]}>
              <Text style={{ color: alert.status === "Pending" ? "#b45309" : "#15803d", fontWeight: "bold" }}>{alert.status}</Text>
            </View>
          </View>
          <Text style={{ color: Colors[theme].text, marginBottom: 4 }}>Location: <Text style={{ fontWeight: "bold" }}>{alert.location}</Text></Text>
          <Text style={{ color: Colors[theme].text, marginBottom: 4 }}>Raised By: <Text style={{ fontWeight: "bold" }}>{alert.raisedBy}</Text></Text>
          <Text style={{ color: Colors[theme].text, marginBottom: 4 }}>Time: <Text style={{ fontWeight: "bold" }}>{alert.time}</Text></Text>
          <Text style={{ color: Colors[theme].text, marginBottom: 4 }}>Responder: <Text style={{ fontWeight: "bold" }}>{alert.assigned || "Unassigned"}</Text></Text>
          <TouchableOpacity style={[styles.closeBtn, { backgroundColor: Colors[theme].tint }]} onPress={onClose}>
            <Text style={{ color: "#fff", fontWeight: "bold" }}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

export default function LiveMonitorScreen() {
  const colorScheme = useColorScheme() ?? "light"
  const [status, setStatus] = useState("All")
  const [type, setType] = useState("All")
  const [region, setRegion] = useState("All")
  const [selectedAlert, setSelectedAlert] = useState<any>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [view, setView] = useState<"map" | "list">(isTablet ? "map" : "map")

  // Filtered alerts
  const filteredAlerts = MOCK_ALERTS.filter(a =>
    (status === "All" || a.status === status) &&
    (type === "All" || a.type === type) &&
    (region === "All" || a.region === region)
  )

  const handleSelectAlert = (alert: any) => {
    setSelectedAlert(alert)
    setShowDetails(true)
  }

  // Map region (centered on Delhi)
  const mapRegion = {
    latitude: 28.6139,
    longitude: 77.2090,
    latitudeDelta: 0.3,
    longitudeDelta: 0.3,
  }

  // Layout
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors[colorScheme].background }}>
      <View style={{ flexDirection: isTablet ? "row" : "column", flex: 1 }}>
        {/* Left: Map (or full width on phone if view === "map") */}
        {(isTablet || view === "map") && (
          <View style={[styles.mapPane, isTablet && { width: "60%" }]}>
            <FilterBar
              status={status}
              type={type}
              region={region}
              setStatus={setStatus}
              setType={setType}
              setRegion={setRegion}
              theme={colorScheme}
            />
            <View style={styles.mapWrapper}>
              <MapView
                provider={PROVIDER_GOOGLE}
                style={styles.map}
                initialRegion={mapRegion}
                customMapStyle={colorScheme === "dark" ? darkMapStyle : []}
              >
                {filteredAlerts.map(alert => {
                  const meta = getTypeMeta(alert.type)
                  return (
                    <Marker
                      key={alert.id}
                      coordinate={{ latitude: alert.lat, longitude: alert.lng }}
                      pinColor={meta.color}
                      onPress={() => handleSelectAlert(alert)}
                    >
                      <MaterialCommunityIcons name={meta.icon as any}size={28} color={meta.color} />
                    </Marker>
                  )
                })}
              </MapView>
              {filteredAlerts.length === 0 && (
                <View style={styles.noDataOverlay}>
                  <MaterialCommunityIcons name="map-search" size={48} color={Colors[colorScheme].icon} />
                  <Text style={{ color: Colors[colorScheme].text, fontWeight: "bold", marginTop: 10 }}>
                    No SOS alerts found for selected filters.
                  </Text>
                </View>
              )}
            </View>
            {!isTablet && (
              <View style={styles.toggleBar}>
                <TouchableOpacity style={[styles.toggleBtn, view === "map" && styles.toggleBtnActive]} onPress={() => setView("map")}>
                  <Ionicons name="map" size={20} color={view === "map" ? Colors[colorScheme].tint : Colors[colorScheme].icon} />
                  <Text style={[styles.toggleBtnText, view === "map" && { color: Colors[colorScheme].tint }]}>Map</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.toggleBtn, view === "list" && styles.toggleBtnActive]} onPress={() => setView("list")}>
                  <Ionicons name="list" size={20} color={view === "list" ? Colors[colorScheme].tint : Colors[colorScheme].icon} />
                  <Text style={[styles.toggleBtnText, view === "list" && { color: Colors[colorScheme].tint }]}>List</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Right: List (or full width on phone if view === "list") */}
        {(isTablet || view === "list") && (
          <View style={[styles.listPane, isTablet && { width: "40%" }]}>
            {/* Add back arrow for mobile list view */}
            {!isTablet && (
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
                <TouchableOpacity onPress={() => setView("map")}>
                  <Ionicons name="arrow-back" size={24} color="#222" />
                </TouchableOpacity>
                <Text style={[styles.listTitle, { marginLeft: 10 }]}>SOS Alerts</Text>
              </View>
            )}
            {isTablet && (
              <Text style={styles.listTitle}>SOS Alerts</Text>
            )}
            {filteredAlerts.length === 0 ? (
              <View style={styles.noDataList}>
                <MaterialCommunityIcons name="alert-circle-outline" size={40} color={Colors[colorScheme].icon} />
                <Text style={{ color: Colors[colorScheme].text, marginTop: 10 }}>No alerts to display.</Text>
              </View>
            ) : (
              <FlatList
                data={filteredAlerts}
                keyExtractor={item => item.id}
                renderItem={({ item }) => {
                  const meta = getTypeMeta(item.type)
                  return (
                    <TouchableOpacity style={styles.listItem} onPress={() => handleSelectAlert(item)}>
                      <MaterialCommunityIcons name={meta.icon as any} size={28} color={meta.color} style={{ marginRight: 10 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontWeight: "bold", color: Colors[colorScheme].text }}>{item.type}</Text>
                        <Text style={{ color: Colors[colorScheme].textMuted, fontSize: 13 }}>{item.location}</Text>
                        <Text style={{ color: Colors[colorScheme].textMuted, fontSize: 12 }}>{item.time}</Text>
                        <Text style={{ color: "#f59e42", fontSize: 12 }}>Severity: {item.severity || "Normal"}</Text>
                      </View>
                      <View style={[
                        styles.statusTag,
                        { backgroundColor: item.status === "Pending" ? "#fde047" : "#bbf7d0" }
                      ]}>
                        <Text style={{ color: item.status === "Pending" ? "#b45309" : "#15803d", fontWeight: "bold", fontSize: 12 }}>
                          {item.status}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  )
                }}
                contentContainerStyle={{ paddingBottom: 40 }}
              />
            )}
          </View>
        )}

        {/* Details Modal */}
        <AlertDetailsModal visible={showDetails} alert={selectedAlert} onClose={() => setShowDetails(false)} theme={colorScheme} />
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  filterBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
    gap: 8,
    zIndex: 2,
  },
  filterDropdown: { flex: 1, marginHorizontal: 2 },
  filterBtn: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: Platform.OS === "ios" ? 8 : 5,
    backgroundColor: "transparent",
    justifyContent: "space-between",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.25)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: 220,
    borderRadius: 12,
    padding: 16,
    backgroundColor: "#fff",
    elevation: 4,
  },
  modalOption: {
    paddingVertical: 10,
  },
  detailsModal: {
    width: 320,
    maxWidth: "90%",
    alignSelf: "center",
    borderRadius: 16,
    padding: 22,
    marginTop: 100,
    elevation: 6,
  },
  closeBtn: {
    marginTop: 18,
    alignSelf: "center",
    paddingHorizontal: 28,
    paddingVertical: 10,
    borderRadius: 8,
  },
  statusTag: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    marginLeft: 10,
  },
  mapPane: {
    flex: 1,
    minHeight: 320,
    paddingRight: isTablet ? 18 : 0,
    paddingBottom: isTablet ? 0 : 10,
  },
  mapWrapper: {
    flex: 1,
    borderRadius: 18,
    overflow: "hidden",
    minHeight: 220,
    backgroundColor: "#e0e7ef",
    marginBottom: 8,
  },
  map: {
    flex: 1,
    minHeight: 220,
  },
  noDataOverlay: {
    position: "absolute",
    top: "35%",
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 10,
  },
  toggleBar: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 8,
    gap: 12,
  },
  toggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#f1f5f9",
    marginHorizontal: 4,
  },
  toggleBtnActive: {
    backgroundColor: "#dbeafe",
  },
  toggleBtnText: {
    marginLeft: 6,
    fontWeight: "bold",
    color: "#555",
  },
  listPane: {
    flex: 1,
    backgroundColor: "transparent",
    paddingLeft: isTablet ? 18 : 0,
    paddingTop: isTablet ? 0 : 10,
  },
  listTitle: {
    fontWeight: "bold",
    fontSize: 18,
    marginBottom: 10,
    color: "#222",
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    elevation: 1,
  },
  noDataList: {
    alignItems: "center",
    marginTop: 40,
  },
})

// Optional: dark map style
const darkMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
  {
    featureType: "administrative.locality",
    elementType: "labels.text.fill",
    stylers: [{ color: "#d59563" }],
  },
  {
    featureType: "poi",
    elementType: "labels.text.fill",
    stylers: [{ color: "#d59563" }],
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#263c3f" }],
  },
  {
    featureType: "poi.park",
    elementType: "labels.text.fill",
    stylers: [{ color: "#6b9a76" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#38414e" }],
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#212a37" }],
  },
  {
    featureType: "road",
    elementType: "labels.text.fill",
    stylers: [{ color: "#9ca5b3" }],
  },
  {
    featureType: "transit.station",
    elementType: "labels.text.fill",
    stylers: [{ color: "#d59563" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#17263c" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#515c6d" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.stroke",
    stylers: [{ color: "#17263c" }],
  },
]