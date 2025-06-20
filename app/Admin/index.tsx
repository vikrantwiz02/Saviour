import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { FontAwesome5, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");
const isTablet = width >= 768;

// Mock weather/disaster widget data
const weather = {
  region: "Central HQ",
  temp: 32,
  condition: "Sunny",
  wind: 18,
  alert: "Storm Watch: North Zone",
  icon: "weather-sunny",
  risk: "Moderate",
  riskColor: "#fbbf24",
};

// Mock stats
const stats = [
  {
    label: "Active SOS",
    value: 12,
    icon: "alert-circle",
    color: "#ff5252",
    tag: "High",
    trend: [2, 4, 3, 5, 6, 8, 12],
  },
  {
    label: "Resolved Today",
    value: 21,
    icon: "checkmark-circle",
    color: "#22c55e",
    tag: "Safe",
    trend: [1, 2, 3, 4, 6, 10, 21],
  },
  {
    label: "Online Responders",
    value: 34,
    icon: "people",
    color: "#3b82f6",
    tag: "Online",
    trend: [10, 12, 18, 22, 28, 32, 34],
  },
  {
    label: "Flagged Reports",
    value: 3,
    icon: "flag",
    color: "#fbbf24",
    tag: "Review",
    trend: [1, 1, 2, 2, 3, 3, 3],
  },
];

// Mock responder status by region
const responderStatus = [
  { region: "North", online: 8, offline: 2 },
  { region: "South", online: 6, offline: 3 },
  { region: "East", online: 7, offline: 1 },
  { region: "West", online: 5, offline: 4 },
];

// Mock regional breakdown
const regionalCases = [
  { region: "North", active: 4, resolved: 12 },
  { region: "South", active: 2, resolved: 8 },
  { region: "East", active: 3, resolved: 10 },
  { region: "West", active: 3, resolved: 9 },
];

// Mock admin actions
const adminActions = [
  { id: 1, action: "Suspended user Carol Lee", time: "2025-06-19 10:15" },
  { id: 2, action: "Broadcasted alert to all users", time: "2025-06-19 09:50" },
  { id: 3, action: "Promoted Bob Singh to Employee", time: "2025-06-18 18:30" },
];

// Mock notification summary
const notifications = [
  { id: 1, type: "Moderation", message: "2 unresolved reports", critical: true },
  { id: 2, type: "System", message: "Pending system update", critical: false },
  { id: 3, type: "SOS", message: "1 critical SOS unresolved", critical: true },
];

// Quick actions
const quickActions = [
  {
    label: "Broadcast Alert",
    icon: "bullhorn",
    color: "#ef4444",
    route: "/Admin/notifications",
  },
  {
    label: "Manage Types",
    icon: "layers",
    color: "#3b82f6",
    route: "/Admin/settings",
  },
  {
    label: "Flagged Users",
    icon: "flag",
    color: "#fbbf24",
    route: "/Admin/management",
  },
  {
    label: "Moderation",
    icon: "shield-alert",
    color: "#a21caf",
    route: "/Admin/moderation",
  },
];

function MiniTrend({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data, 1);
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", height: 24 }}>
      {data.map((v, i) => (
        <View
          key={i}
          style={{
            width: 4,
            height: `${(v / max) * 100}%`,
            backgroundColor: color,
            borderRadius: 2,
            marginRight: 2,
            opacity: 0.7,
          }}
        />
      ))}
    </View>
  );
}

export default function AdminDashboard() {
  const colorScheme = useColorScheme() ?? "light";
  const router = useRouter();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors[colorScheme].background }}>
      <ScrollView contentContainerStyle={{ padding: isTablet ? 32 : 16, paddingBottom: 40 }}>
        {/* Top Bar with Settings & Notifications */}
        <View style={styles.topBar}>
          <Text style={styles.title}>Admin Dashboard</Text>
          <View style={styles.topIcons}>
            <TouchableOpacity
              onPress={() => router.push("/Admin-Notifications")}
              style={styles.iconBtn}
              accessibilityLabel="Push Notifications"
            >
              <Ionicons name="notifications" size={26} color={Colors[colorScheme].tint} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push("/Admin-Settings")}
              style={styles.iconBtn}
              accessibilityLabel="Settings"
            >
              <Ionicons name="settings" size={26} color={Colors[colorScheme].tint} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Weather & Disaster Risk Widget */}
        <View style={[
          styles.weatherWidget,
          { backgroundColor: colorScheme === "dark" ? "#23272e" : "#fff" },
        ]}>
          <MaterialCommunityIcons name={weather.icon as any} size={isTablet ? 48 : 32} color="#fbbf24" />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.weatherRegion}>{weather.region}</Text>
            <Text style={styles.weatherTemp}>{weather.temp}°C · {weather.condition}</Text>
            <Text style={styles.weatherWind}>Wind: {weather.wind} km/h</Text>
            <View style={[styles.riskTag, { backgroundColor: weather.riskColor + "22" }]}>
              <Text style={[styles.riskTagText, { color: weather.riskColor }]}>Risk: {weather.risk}</Text>
            </View>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <MaterialCommunityIcons name="alert" size={22} color="#ef4444" />
            <Text style={styles.weatherAlert}>{weather.alert}</Text>
          </View>
        </View>

        {/* Stats Cards */}
        <View style={[
          styles.grid,
          isTablet && { flexDirection: "row", flexWrap: "wrap", gap: 24 },
        ]}>
          {stats.map((stat, i) => (
            <View
              key={stat.label}
              style={[
                isTablet
                  ? { width: "47%", marginBottom: 24 }
                  : { width: "100%", marginBottom: 16 },
              ]}
            >
              <View style={[
                styles.card,
                {
                  backgroundColor: colorScheme === "dark" ? "#23272e" : "#fff",
                  shadowColor: colorScheme === "dark" ? "#000" : "#aaa",
                }
              ]}>
                <View style={styles.cardRow}>
                  <Ionicons name={stat.icon as any} size={isTablet ? 38 : 28} color={stat.color} style={{ marginRight: 10 }} />
                  <View>
                    <Text style={[styles.cardValue, { color: stat.color }]}>{stat.value}</Text>
                    <Text style={[styles.cardLabel, { color: colorScheme === "dark" ? "#fff" : "#222" }]}>{stat.label}</Text>
                  </View>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8 }}>
                  <MiniTrend data={stat.trend} color={stat.color} />
                  <View style={[styles.tag, { backgroundColor: stat.color + "22" }]}>
                    <Text style={[styles.tagText, { color: stat.color }]}>{stat.tag}</Text>
                  </View>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Responder Status Overview */}
        <View style={[
          styles.sectionCard,
          { backgroundColor: colorScheme === "dark" ? "#23272e" : "#fff" },
        ]}>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
            <FontAwesome5 name="user-shield" size={18} color="#3b82f6" />
            <Text style={styles.sectionTitle}>Responder Status by Region</Text>
          </View>
          <View style={styles.responderTable}>
            <View style={styles.responderRowHeader}>
              <Text style={styles.responderCellHeader}>Region</Text>
              <Text style={styles.responderCellHeader}>Online</Text>
              <Text style={styles.responderCellHeader}>Offline</Text>
            </View>
            {responderStatus.map((r) => (
              <View key={r.region} style={styles.responderRow}>
                <Text style={styles.responderCell}>{r.region}</Text>
                <Text style={[styles.responderCell, { color: "#22c55e" }]}>{r.online}</Text>
                <Text style={[styles.responderCell, { color: "#ef4444" }]}>{r.offline}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Regional Breakdown */}
        <View style={[
          styles.sectionCard,
          { backgroundColor: colorScheme === "dark" ? "#23272e" : "#fff" },
        ]}>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
            <MaterialCommunityIcons name="map-marker-radius" size={20} color="#fbbf24" />
            <Text style={styles.sectionTitle}>Regional Breakdown</Text>
          </View>
          <View style={isTablet ? styles.regionGridTablet : {}}>
            {regionalCases.map((zone) => (
              <TouchableOpacity
                key={zone.region}
                style={[
                  styles.regionCard,
                  { backgroundColor: "#f8fafc", borderColor: "#eee" },
                  isTablet && { minWidth: 180, maxWidth: 220 },
                ]}
                onPress={() => router.push(`/Admin/management?region=${zone.region}`)}
                activeOpacity={0.8}
              >
                <Text style={styles.regionName}>{zone.region}</Text>
                <View style={{ flexDirection: "row", alignItems: "center", marginTop: 6 }}>
                  <Ionicons name="alert-circle" size={18} color="#ef4444" />
                  <Text style={styles.regionStat}>Active: {zone.active}</Text>
                  <Ionicons name="checkmark-circle" size={18} color="#22c55e" style={{ marginLeft: 10 }} />
                  <Text style={styles.regionStat}>Resolved: {zone.resolved}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Recent Admin Actions */}
        <View style={[
          styles.sectionCard,
          { backgroundColor: colorScheme === "dark" ? "#23272e" : "#fff" },
        ]}>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
            <MaterialCommunityIcons name="history" size={20} color="#2563eb" />
            <Text style={styles.sectionTitle}>Recent Admin Actions</Text>
          </View>
          {adminActions.map((a) => (
            <View key={a.id} style={styles.actionRow}>
              <Ionicons name="checkmark-done-circle" size={18} color="#2563eb" />
              <Text style={styles.actionText}>{a.action}</Text>
              <Text style={styles.actionTime}>{a.time}</Text>
            </View>
          ))}
        </View>

        {/* Quick Actions */}
        <View style={[
          styles.sectionCard,
          { backgroundColor: colorScheme === "dark" ? "#23272e" : "#fff" },
        ]}>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
            <MaterialCommunityIcons name="lightning-bolt" size={20} color="#ef4444" />
            <Text style={styles.sectionTitle}>Quick Actions</Text>
          </View>
          <View style={isTablet ? styles.quickGridTablet : styles.quickGrid}>
            {quickActions.map((q) => (
              <TouchableOpacity
                key={q.label}
                style={[styles.quickBtn, { backgroundColor: q.color + "22" }]}
                onPress={() => router.push(q.route as any)}
                activeOpacity={0.85}
              >
                <MaterialCommunityIcons name={q.icon as any} size={28} color={q.color} />
                <Text style={[styles.quickLabel, { color: q.color }]}>{q.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Notification Summary */}
        <View style={[
          styles.sectionCard,
          { backgroundColor: colorScheme === "dark" ? "#23272e" : "#fff" },
        ]}>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
            <Ionicons name="notifications" size={20} color="#ef4444" />
            <Text style={styles.sectionTitle}>Notification Summary</Text>
          </View>
          {notifications.map((n) => (
            <TouchableOpacity
              key={n.id}
              style={[
                styles.notificationRow,
                n.critical && { borderLeftColor: "#ef4444", borderLeftWidth: 4 },
              ]}
              onPress={() => {
                if (n.type === "Moderation") router.push("/Admin-Moderation");
                if (n.type === "SOS") router.push("/Admin/sos");
              }}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons
                name={
                  n.type === "Moderation"
                    ? "shield-alert"
                    : n.type === "System"
                    ? "server"
                    : "alert-circle"
                }
                size={22}
                color={n.critical ? "#ef4444" : "#2563eb"}
                style={{ marginRight: 10 }}
              />
              <Text style={styles.notificationText}>{n.message}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  title: {
    fontSize: isTablet ? 32 : 22,
    fontWeight: "bold",
    color: "#2563eb",
    flex: 1,
  },
  topIcons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconBtn: {
    marginLeft: 12,
    padding: 6,
    borderRadius: 20,
    backgroundColor: "#f1f5f9",
  },
  weatherWidget: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 18,
    padding: isTablet ? 28 : 16,
    marginBottom: isTablet ? 28 : 16,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  weatherRegion: {
    fontWeight: "bold",
    fontSize: isTablet ? 18 : 14,
    color: "#2563eb",
  },
  weatherTemp: {
    fontSize: isTablet ? 22 : 16,
    fontWeight: "bold",
    color: "#222",
  },
  weatherWind: {
    fontSize: isTablet ? 14 : 12,
    color: "#888",
    marginBottom: 2,
  },
  riskTag: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 4,
  },
  riskTagText: {
    fontWeight: "bold",
    fontSize: 13,
    letterSpacing: 1,
  },
  weatherAlert: {
    color: "#ef4444",
    fontWeight: "bold",
    fontSize: isTablet ? 14 : 11,
    marginTop: 2,
    maxWidth: 120,
    textAlign: "right",
  },
  grid: {
    flexDirection: "column",
    width: "100%",
  },
  card: {
    borderRadius: 16,
    padding: isTablet ? 28 : 18,
    marginBottom: 0,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    justifyContent: "space-between",
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  cardValue: {
    fontSize: isTablet ? 32 : 22,
    fontWeight: "bold",
  },
  cardLabel: {
    fontSize: isTablet ? 18 : 14,
    fontWeight: "600",
    marginTop: 2,
  },
  tag: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    marginLeft: 10,
  },
  tagText: {
    fontWeight: "bold",
    fontSize: isTablet ? 15 : 12,
    letterSpacing: 1,
  },
  sectionCard: {
    borderRadius: 16,
    padding: isTablet ? 28 : 18,
    marginTop: isTablet ? 28 : 16,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  sectionTitle: {
    fontWeight: "bold",
    fontSize: isTablet ? 18 : 15,
    marginLeft: 8,
    color: "#222",
  },
  responderTable: {
    marginTop: 8,
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#eee",
  },
  responderRowHeader: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    paddingVertical: 6,
  },
  responderCellHeader: {
    flex: 1,
    fontWeight: "bold",
    color: "#2563eb",
    textAlign: "center",
    fontSize: 14,
  },
  responderRow: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    paddingVertical: 6,
  },
  responderCell: {
    flex: 1,
    textAlign: "center",
    fontSize: 14,
  },
  regionGridTablet: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    marginTop: 8,
  },
  regionCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
    marginRight: 10,
    minWidth: 120,
    alignItems: "flex-start",
  },
  regionName: {
    fontWeight: "bold",
    fontSize: 15,
    color: "#2563eb",
  },
  regionStat: {
    fontSize: 13,
    marginLeft: 4,
    color: "#333",
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    gap: 8,
  },
  actionText: {
    fontSize: 14,
    color: "#222",
    marginLeft: 6,
    flex: 1,
  },
  actionTime: {
    fontSize: 12,
    color: "#888",
    marginLeft: 8,
  },
  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 8,
  },
  quickGridTablet: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 18,
    marginTop: 8,
  },
  quickBtn: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 18,
    marginRight: 10,
    marginBottom: 10,
    minWidth: 90,
    maxWidth: 140,
    elevation: 1,
  },
  quickLabel: {
    fontWeight: "bold",
    fontSize: 13,
    marginTop: 6,
  },
  notificationRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    borderLeftWidth: 0,
  },
  notificationText: {
    fontSize: 14,
    color: "#222",
    fontWeight: "500",
  },
});