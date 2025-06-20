import SOSRequestCard, { type SOSRequest } from "@/components/SOSRequestCard"
import { Colors } from "@/constants/Colors"
import { useColorScheme } from "@/hooks/useColorScheme"
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import React, { useState } from "react"
import {
  Alert,
  Dimensions,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

const { width } = Dimensions.get("window")
const isTablet = width >= 768

// Mock Data
const MOCK_SOS_REQUESTS: SOSRequest[] = [
  {
    id: "1",
    senderName: "Jane Doe",
    emergencyType: "Medical Assistance",
    distance: "0.5 km",
    urgency: "High",
    timestamp: "2 mins ago",
    description: "Elderly person collapsed, difficulty breathing. Needs immediate help.",
  },
  {
    id: "2",
    emergencyType: "Minor Accident",
    distance: "1.2 km",
    urgency: "Medium",
    timestamp: "15 mins ago",
    description: "Fender bender, no injuries reported but road is partially blocked.",
  },
  {
    id: "3",
    senderName: "Anonymous",
    emergencyType: "Suspicious Activity",
    distance: "0.8 km",
    urgency: "Low",
    timestamp: "30 mins ago",
  },
  {
    id: "4",
    emergencyType: "Fire Alarm",
    distance: "2.1 km",
    urgency: "High",
    timestamp: "5 mins ago",
    description: "Smoke detected in apartment building, alarm sounding.",
  },
]

const DISTANCE_OPTIONS = ["Any", "< 1 km", "< 5 km", "< 10 km"]
const URGENCY_OPTIONS = ["Any", "High", "Medium", "Low"]
const TYPE_OPTIONS = ["Any", "Medical", "Fire", "Accident", "Police", "Other"]

function WeatherCard({ theme }: { theme: "light" | "dark" }) {
  const severeAlert = true
  return (
    <View
      style={[
        stylesWeather.card,
        {
          backgroundColor: theme === "dark" ? "#23272e" : "#fffbe6",
          borderColor: theme === "dark" ? "#444" : "#fbbf24",
        },
      ]}
      accessible
      accessibilityLabel="Weather card"
    >
      <View style={stylesWeather.left}>
        <Ionicons name="sunny" size={40} color={theme === "dark" ? "#ffd700" : "#fbbf24"} />
      </View>
      <View style={stylesWeather.center}>
        <Text style={[stylesWeather.temp, { color: theme === "dark" ? "#ffd700" : "#f59e42" }]}>32°C</Text>
        <Text style={[stylesWeather.desc, { color: theme === "dark" ? "#fff" : "#b08900" }]}>Sunny, Delhi</Text>
        <Text style={[stylesWeather.sub, { color: theme === "dark" ? "#bbb" : "#b08900" }]}>Humidity: 38%  |  Wind: 12km/h</Text>
      </View>
      {severeAlert && (
        <View style={stylesWeather.badge}>
          <Text style={stylesWeather.badgeText}>⚠️ Storm Warning</Text>
        </View>
      )}
    </View>
  )
}
const stylesWeather = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    position: "relative",
    minHeight: 70,
  },
  left: { marginRight: 14 },
  center: { flex: 1 },
  temp: { fontSize: isTablet ? 32 : 22, fontWeight: "bold" },
  desc: { fontSize: isTablet ? 18 : 15, marginTop: 2 },
  sub: { fontSize: isTablet ? 15 : 12, marginTop: 2 },
  badge: {
    backgroundColor: "#ff5252",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    position: "absolute",
    top: 10,
    right: 10,
  },
  badgeText: { color: "#fff", fontWeight: "bold", fontSize: isTablet ? 15 : 12 },
})

function NotificationIcon({
  unseenCount = 2,
  onPress,
  theme,
}: {
  unseenCount?: number
  onPress: () => void
  theme: "light" | "dark"
}) {
  return (
    <TouchableOpacity style={stylesNotif.iconWrap} onPress={onPress} accessibilityLabel="Notifications">
      <Ionicons name="notifications" size={isTablet ? 32 : 26} color={theme === "dark" ? "#fff" : "#222"} />
      {unseenCount > 0 && (
        <View style={stylesNotif.badge}>
          <Text style={stylesNotif.badgeText}>{unseenCount}</Text>
        </View>
      )}
    </TouchableOpacity>
  )
}
const stylesNotif = StyleSheet.create({
  iconWrap: { position: "relative", padding: 6 },
  badge: {
    position: "absolute",
    top: 2,
    right: 2,
    backgroundColor: "#ff5252",
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeText: { color: "#fff", fontWeight: "bold", fontSize: 11 },
})

function OfflineBanner({ theme }: { theme: "light" | "dark" }) {
  return (
    <View style={[stylesOffline.banner, { backgroundColor: theme === "dark" ? "#ffb300" : "#fff3cd" }]}>
      <MaterialCommunityIcons name="wifi-off" size={18} color="#b08900" />
      <Text style={stylesOffline.text}>
        You are offline. Some features may not work.
      </Text>
    </View>
  )
}
const stylesOffline = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    borderRadius: 8,
    marginBottom: 10,
    marginHorizontal: 4,
    justifyContent: "center",
  },
  text: { color: "#b08900", marginLeft: 8, fontSize: 13, fontWeight: "500" },
})

function Greeting({ name, theme }: { name: string; theme: "light" | "dark" }) {
  return (
    <Text
      style={{
        fontSize: isTablet ? 28 : 20,
        fontWeight: "bold",
        marginBottom: 10,
        color: theme === "dark" ? "#fff" : "#222",
      }}
      accessibilityRole="header"
    >
      Welcome back, {name}
    </Text>
  )
}

function MyActivitySummary({ helped, active, theme }: { helped: number; active: number; theme: "light" | "dark" }) {
  return (
    <View
      style={[
        stylesActivity.container,
        { backgroundColor: theme === "dark" ? "#23272e" : "#f8fafc" },
      ]}
      accessible
      accessibilityLabel="My Activity"
    >
      <View style={stylesActivity.stat}>
        <Ionicons name="hand-left" size={22} color="#22c55e" />
        <Text style={[stylesActivity.value, { color: theme === "dark" ? "#fff" : "#222" }]}>{helped}</Text>
        <Text style={stylesActivity.label}>People Helped</Text>
      </View>
      <View style={stylesActivity.stat}>
        <Ionicons name="alert-circle" size={22} color="#f59e42" />
        <Text style={[stylesActivity.value, { color: theme === "dark" ? "#fff" : "#222" }]}>{active}</Text>
        <Text style={stylesActivity.label}>Active Requests</Text>
      </View>
    </View>
  )
}
const stylesActivity = StyleSheet.create({
  container: {
    flexDirection: "row",
    borderRadius: 16,
    padding: 12,
    marginBottom: 14,
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  stat: { alignItems: "center", flex: 1 },
  value: { fontSize: isTablet ? 22 : 16, fontWeight: "bold", marginTop: 2 },
  label: { fontSize: isTablet ? 14 : 11, color: "#666", marginTop: 1 },
})

function SOSButton({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity
      style={stylesSOS.fab}
      onPress={onPress}
      accessibilityLabel="Trigger SOS"
      activeOpacity={0.85}
    >
      <Ionicons name="add" size={isTablet ? 40 : 28} color="#fff" />
      <Text style={stylesSOS.text}>SOS</Text>
    </TouchableOpacity>
  )
}
const stylesSOS = StyleSheet.create({
  fab: {
    position: "absolute",
    bottom: isTablet ? 40 : 24,
    alignSelf: "center",
    backgroundColor: "#ff3b30",
    borderRadius: 40,
    width: isTablet ? 90 : 64,
    height: isTablet ? 90 : 64,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "column",
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    zIndex: 10,
  },
  text: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: isTablet ? 18 : 13,
    marginTop: 2,
    letterSpacing: 1,
  },
})

function FilterControls({
  filterDistance,
  filterUrgency,
  filterType,
  onDistance,
  onUrgency,
  onType,
  theme,
  viewMode,
  onToggleView,
}: {
  filterDistance: string
  filterUrgency: string
  filterType: string
  onDistance: () => void
  onUrgency: () => void
  onType: () => void
  theme: "light" | "dark"
  viewMode: "list" | "map"
  onToggleView: () => void
}) {
  return (
    <View style={stylesFilter.container}>
      <TouchableOpacity style={[stylesFilter.button, { borderColor: Colors[theme].tint }]} onPress={onDistance}>
        <Text style={[stylesFilter.buttonText, { color: Colors[theme].tint }]}>Dist: {filterDistance}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[stylesFilter.button, { borderColor: Colors[theme].tint }]} onPress={onUrgency}>
        <Text style={[stylesFilter.buttonText, { color: Colors[theme].tint }]}>Urgency: {filterUrgency}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[stylesFilter.button, { borderColor: Colors[theme].tint }]} onPress={onType}>
        <Text style={[stylesFilter.buttonText, { color: Colors[theme].tint }]}>Type: {filterType}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={stylesFilter.toggle} onPress={onToggleView} accessibilityLabel="Toggle map/list view">
        <Ionicons name={viewMode === "list" ? "map" : "list"} size={22} color={Colors[theme].tint} />
      </TouchableOpacity>
    </View>
  )
}
const stylesFilter = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    marginTop: 2,
    justifyContent: "space-between",
    paddingHorizontal: 2,
  },
  button: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: isTablet ? 18 : 10,
    paddingVertical: isTablet ? 10 : 7,
    marginRight: 6,
    backgroundColor: "transparent",
  },
  buttonText: { fontSize: isTablet ? 15 : 12, fontWeight: "500" },
  toggle: {
    marginLeft: 6,
    padding: 7,
    borderRadius: 20,
    backgroundColor: "#e0e7ef",
  },
})

function FilterPickerModal({
  visible,
  onClose,
  options,
  selectedValue,
  onValueChange,
  title,
  theme,
}: {
  visible: boolean
  onClose: () => void
  options: string[]
  selectedValue: string
  onValueChange: (value: any) => void
  title: string
  theme: "light" | "dark"
}) {
  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={modalStyles.overlay}>
        <View style={[modalStyles.content, { backgroundColor: Colors[theme].background }]}>
          <Text style={[modalStyles.title, { color: Colors[theme].text }]}>{title}</Text>
          {options.map((option) => (
            <TouchableOpacity
              key={option}
              style={modalStyles.option}
              onPress={() => {
                onValueChange(option)
                onClose()
              }}
            >
              <Text style={selectedValue === option ? modalStyles.optionSelected : modalStyles.optionText}>
                {option}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={modalStyles.closeButton} onPress={onClose}>
            <Text style={modalStyles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}
const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  content: {
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "50%",
  },
  title: { fontSize: 18, fontWeight: "bold", marginBottom: 15, textAlign: "center" },
  option: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: "#eee" },
  optionText: { fontSize: 16, textAlign: "center", color: "#444" },
  optionSelected: { fontSize: 16, textAlign: "center", color: "#0a7ea4", fontWeight: "bold" },
  closeButton: {
    marginTop: 20,
    paddingVertical: 15,
    backgroundColor: "#0a7ea4",
    borderRadius: 8,
    alignItems: "center",
  },
  closeButtonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
})

export default function HomeScreen() {
  const colorScheme = useColorScheme() ?? "light"
  const [sosRequests] = useState<SOSRequest[]>(MOCK_SOS_REQUESTS)
  const [filterDistance, setFilterDistance] = useState("Any")
  const [filterUrgency, setFilterUrgency] = useState<"Any" | "High" | "Medium" | "Low">("Any")
  const [filterType, setFilterType] = useState("Any")
  const [activePicker, setActivePicker] = useState<"distance" | "urgency" | "type" | null>(null)
  const [viewMode, setViewMode] = useState<"list" | "map">("list")
  const [offline, setOffline] = useState(false) // Replace with real NetInfo
  const [notifCount, setNotifCount] = useState(2)

  const router = useRouter()

  const filteredRequests = sosRequests.filter((req) => {
    const distanceMatch =
      filterDistance === "Any" ||
      (filterDistance === "< 1 km" && Number.parseFloat(req.distance) < 1) ||
      (filterDistance === "< 5 km" && Number.parseFloat(req.distance) < 5) ||
      (filterDistance === "< 10 km" && Number.parseFloat(req.distance) < 10)
    const urgencyMatch = filterUrgency === "Any" || req.urgency === filterUrgency
    const typeMatch = filterType === "Any" || req.emergencyType.includes(filterType)
    return distanceMatch && urgencyMatch && typeMatch
  })

  const handleRespond = (id: string) => {
    Alert.alert("Respond to SOS", `Responding to SOS ID: ${id}. (UI Only)`)
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors[colorScheme].background }}>
      <View style={{ flex: 1, paddingHorizontal: isTablet ? 40 : 16 }}>
        {/* Offline Banner */}
        {offline && <OfflineBanner theme={colorScheme} />}

        {/* Top Row: Weather + Notification */}
        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 6, marginBottom: 2 }}>
          <View style={{ flex: 1 }}>
            <WeatherCard theme={colorScheme} />
          </View>
          <NotificationIcon
            unseenCount={notifCount}
            onPress={() => router.push("/notifications" as any)}
            theme={colorScheme}
          />
        </View>

        {/* Greeting */}
        <Greeting name="Vikrant" theme={colorScheme} />

        {/* My Activity */}
        <MyActivitySummary helped={5} active={1} theme={colorScheme} />

        {/* Filters and View Toggle */}
        <FilterControls
          filterDistance={filterDistance}
          filterUrgency={filterUrgency}
          filterType={filterType}
          onDistance={() => setActivePicker("distance")}
          onUrgency={() => setActivePicker("urgency")}
          onType={() => setActivePicker("type")}
          theme={colorScheme}
          viewMode={viewMode}
          onToggleView={() => setViewMode(viewMode === "list" ? "map" : "list")}
        />

        {/* Filter Picker Modals */}
        {activePicker === "distance" && (
          <FilterPickerModal
            title="Filter by Distance"
            visible={true}
            onClose={() => setActivePicker(null)}
            options={DISTANCE_OPTIONS}
            selectedValue={filterDistance}
            onValueChange={setFilterDistance}
            theme={colorScheme}
          />
        )}
        {activePicker === "urgency" && (
          <FilterPickerModal
            title="Filter by Urgency"
            visible={true}
            onClose={() => setActivePicker(null)}
            options={URGENCY_OPTIONS}
            selectedValue={filterUrgency}
            onValueChange={setFilterUrgency}
            theme={colorScheme}
          />
        )}
        {activePicker === "type" && (
          <FilterPickerModal
            title="Filter by Type"
            visible={true}
            onClose={() => setActivePicker(null)}
            options={TYPE_OPTIONS}
            selectedValue={filterType}
            onValueChange={setFilterType}
            theme={colorScheme}
          />
        )}

        {/* SOS Feed or Map */}
        <View style={{ flex: 1, marginTop: 2 }}>
          {viewMode === "list" ? (
            <FlatList
              data={filteredRequests}
              renderItem={({ item }) => (
                <SOSRequestCard request={item} onRespond={handleRespond} />
              )}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingBottom: 120 }}
              ListEmptyComponent={
                <View style={{ alignItems: "center", marginTop: 40 }}>
                  <MaterialCommunityIcons name="shield-off" size={60} color={Colors[colorScheme].icon} />
                  <Text style={{ fontSize: 18, fontWeight: "600", marginTop: 15, color: Colors[colorScheme].text, textAlign: "center" }}>
                    No SOS requests matching your filters.
                  </Text>
                  <Text style={{ fontSize: 14, color: Colors[colorScheme].textMuted, textAlign: "center", marginTop: 5 }}>
                    Try adjusting your filters or check back later.
                  </Text>
                </View>
              }
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <View style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: colorScheme === "dark" ? "#23272e" : "#e0e7ef",
              borderRadius: 16,
              marginVertical: 10,
            }}>
              <MaterialCommunityIcons name="map-marker-radius" size={isTablet ? 80 : 48} color={Colors[colorScheme].tint} />
              <Text style={{ color: Colors[colorScheme].text, fontSize: isTablet ? 22 : 16, fontWeight: "bold", marginTop: 10 }}>
                Map View Coming Soon
              </Text>
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  )
}