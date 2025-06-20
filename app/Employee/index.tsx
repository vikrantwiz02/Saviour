import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");
const isTablet = width >= 768;

// Mock employee data
const EMPLOYEE = {
  name: "Bob Singh",
  emergenciesHandled: 42,
  assignmentsPending: 3,
  activeSOSNearby: 2,
  region: "North",
};

// Mock priority alerts
const PRIORITY_ALERTS = [
  {
    id: "sos-1001",
    type: "Medical",
    level: "Critical",
    raised: "2025-06-20T09:30:00Z",
    location: "Sector 12",
    proximity: "1.2 km",
    timeAgo: "5 min ago",
  },
  {
    id: "sos-1002",
    type: "Fire",
    level: "High",
    raised: "2025-06-20T08:55:00Z",
    location: "Market Road",
    proximity: "2.5 km",
    timeAgo: "40 min ago",
  },
];

const LEVEL_COLORS: Record<string, string> = {
  Critical: "#ef4444",
  High: "#fbbf24",
  Moderate: "#3b82f6",
};

export default function EmployeeDashboard() {
  const colorScheme = useColorScheme() ?? "light";
  const [onDuty, setOnDuty] = useState(true);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors[colorScheme].background }}>
      <ScrollView contentContainerStyle={{ padding: isTablet ? 32 : 16, paddingBottom: 40 }}>
        {/* Greeting and Status */}
        <View style={styles.topRow}>
          <View>
            <Text style={styles.greeting}>
              Hello, <Text style={{ color: "#2563eb" }}>{EMPLOYEE.name}</Text>
            </Text>
            <Text style={styles.regionText}>Region: {EMPLOYEE.region}</Text>
          </View>
          <View style={styles.statusToggle}>
            <Text style={{ color: onDuty ? "#22c55e" : "#ef4444", fontWeight: "bold", marginRight: 8 }}>
              {onDuty ? "On Duty" : "Off Duty"}
            </Text>
            <Switch
              value={onDuty}
              onValueChange={setOnDuty}
              thumbColor={onDuty ? "#22c55e" : "#ccc"}
              trackColor={{ false: "#ccc", true: "#bbf7d0" }}
            />
          </View>
        </View>

        {/* Quick Stats */}
        <View style={isTablet ? styles.statsRowTablet : styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: "#f1f5f9" }]}>
            <Ionicons name="checkmark-circle" size={28} color="#22c55e" />
            <Text style={styles.statValue}>{EMPLOYEE.emergenciesHandled}</Text>
            <Text style={styles.statLabel}>Handled</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: "#f1f5f9" }]}>
            <Ionicons name="alert-circle" size={28} color="#ef4444" />
            <Text style={styles.statValue}>{EMPLOYEE.activeSOSNearby}</Text>
            <Text style={styles.statLabel}>Active SOS Nearby</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: "#f1f5f9" }]}>
            <Ionicons name="clipboard" size={28} color="#fbbf24" />
            <Text style={styles.statValue}>{EMPLOYEE.assignmentsPending}</Text>
            <Text style={styles.statLabel}>Pending Assignments</Text>
          </View>
        </View>

        {/* Priority Alerts Panel */}
        <View style={[styles.sectionCard, { backgroundColor: colorScheme === "dark" ? "#23272e" : "#fff" }]}>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
            <MaterialCommunityIcons name="alert-decagram" size={20} color="#ef4444" />
            <Text style={styles.sectionTitle}>Priority Alerts</Text>
          </View>
          {PRIORITY_ALERTS.length === 0 ? (
            <Text style={{ color: "#888", marginTop: 10 }}>No critical emergencies in your area.</Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4 }}>
              {PRIORITY_ALERTS.map((alert) => (
                <View
                  key={alert.id}
                  style={[
                    styles.alertCard,
                    { borderLeftColor: LEVEL_COLORS[alert.level], backgroundColor: "#f8fafc" },
                    isTablet && { minWidth: 260, maxWidth: 320 },
                  ]}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
                    <Text style={[styles.levelTag, { color: LEVEL_COLORS[alert.level] }]}>
                      {alert.level === "Critical" ? "🔴" : alert.level === "High" ? "🟠" : "🔵"} {alert.level}
                    </Text>
                    <Text style={styles.alertType}>{alert.type}</Text>
                  </View>
                  <Text style={styles.alertLocation}>
                    <Ionicons name="location" size={14} color="#3b82f6" /> {alert.location}
                  </Text>
                  <View style={{ flexDirection: "row", alignItems: "center", marginTop: 2 }}>
                    <MaterialCommunityIcons name="map-marker-distance" size={16} color="#fbbf24" />
                    <Text style={styles.alertProximity}>{alert.proximity} away</Text>
                    <Ionicons name="time" size={14} color="#888" style={{ marginLeft: 10 }} />
                    <Text style={styles.alertTime}>{alert.timeAgo}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Availability Info */}
        <View style={[styles.sectionCard, { backgroundColor: colorScheme === "dark" ? "#23272e" : "#fff" }]}>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
            <Ionicons name="information-circle" size={20} color="#3b82f6" />
            <Text style={styles.sectionTitle}>Availability</Text>
          </View>
          <Text style={{ color: "#555", fontSize: 15 }}>
            {onDuty
              ? "You are currently available for new assignments and will receive emergency alerts."
              : "You are marked as off-duty and will not receive new assignments or alerts."}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  greeting: {
    fontSize: isTablet ? 28 : 20,
    fontWeight: "bold",
    marginBottom: 2,
    color: "#222",
  },
  regionText: {
    fontSize: isTablet ? 16 : 13,
    color: "#888",
  },
  statusToggle: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 18,
    gap: 10,
  },
  statsRowTablet: {
    flexDirection: "row",
    justifyContent: "flex-start",
    marginBottom: 24,
    gap: 24,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
    borderRadius: 14,
    paddingVertical: isTablet ? 28 : 18,
    marginHorizontal: 4,
    elevation: 1,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    minWidth: 90,
    maxWidth: 160,
  },
  statValue: {
    fontSize: isTablet ? 28 : 20,
    fontWeight: "bold",
    color: "#2563eb",
    marginTop: 6,
  },
  statLabel: {
    fontSize: isTablet ? 15 : 12,
    color: "#888",
    marginTop: 2,
    fontWeight: "500",
    textAlign: "center",
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
  alertCard: {
    borderRadius: 12,
    borderLeftWidth: 5,
    padding: 14,
    marginRight: 14,
    minWidth: 180,
    maxWidth: 260,
    elevation: 1,
  },
  levelTag: {
    fontWeight: "bold",
    fontSize: 14,
    marginRight: 8,
  },
  alertType: {
    fontWeight: "bold",
    fontSize: 15,
    color: "#222",
  },
  alertLocation: {
    color: "#3b82f6",
    fontSize: 14,
    marginTop: 2,
    marginBottom: 2,
  },
  alertProximity: {
    color: "#fbbf24",
    fontSize: 13,
    marginLeft: 4,
  },
  alertTime: {
    color: "#888",
    fontSize: 13,
    marginLeft: 4,
  },
});