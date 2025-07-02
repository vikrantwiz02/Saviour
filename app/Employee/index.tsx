import React, { useEffect, useState } from "react";
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { getAuth } from "firebase/auth";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  doc,
} from "firebase/firestore";
import { useRouter } from "expo-router";

const { width } = Dimensions.get("window");
const isTablet = width >= 768;

const LEVEL_COLORS: Record<string, string> = {
  High: "#ef4444",
  Medium: "#fbbf24",
  Low: "#3b82f6",
};

const WEATHER_API_KEY = "475dad9f469397c42f28ed2ce92b2537";

type SOSRequest = {
  id: string;
  createdAt?: { toDate: () => Date; toMillis: () => number };
  emergencyType?: string;
  urgency?: string;
  description?: string;
  responderId?: string;
  responderName?: string;
  senderName?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  city?: string;
  status?: string;
};

function isToday(date: Date) {
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

export default function EmployeeDashboard() {
  const colorScheme = useColorScheme() ?? "light";
  const [employee, setEmployee] = useState<any>(null);
  const [handledCount, setHandledCount] = useState(0);
  const [sosRequests, setSosRequests] = useState<SOSRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [weather, setWeather] = useState<any>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [recentActivity, setRecentActivity] = useState<SOSRequest[]>([]);
  const [myResponded, setMyResponded] = useState<SOSRequest[]>([]);
  const router = useRouter();

  // Theme-aware colors
  const themeColors = Colors[colorScheme];
  const cardBackground = colorScheme === "dark" ? themeColors.card : "#ffffff";
  const textColor = colorScheme === "dark" ? "#ffffff" : "#1f2937";
  const secondaryTextColor = colorScheme === "dark" ? "#9ca3af" : "#6b7280";

  // Fetch employee profile
  useEffect(() => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) return;
    const unsub = onSnapshot(doc(db, "users", user.uid), (snap) => {
      if (snap.exists()) {
        setEmployee({ ...snap.data(), uid: user.uid });
      }
    });
    return unsub;
  }, []);

  // Fetch handled SOS count and recent activity
  useEffect(() => {
    if (!employee?.uid) return;
    const q = query(
      collection(db, "sos_requests"),
      where("responderId", "==", employee.uid),
      where("status", "==", "responded")
    );
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs
        .map((d) => ({ id: d.id, ...d.data() } as SOSRequest))
        .sort(
          (a, b) =>
            (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0)
        );
      setHandledCount(snap.size);
      setRecentActivity(data.slice(0, 5));
      setMyResponded(data);
    });
    return unsub;
  }, [employee?.uid]);

  // Fetch all SOS requests (Active Alerts)
  useEffect(() => {
    const q = query(
      collection(db, "sos_requests"),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setSosRequests(
        snap.docs.map((d) => ({ id: d.id, ...d.data() } as SOSRequest))
      );
      setLoading(false);
    });
    return unsub;
  }, []);

  // Fetch weather for employee city
  useEffect(() => {
    if (!employee?.city) return;

    const fetchWeather = async () => {
      setWeatherLoading(true);
      try {
        const response = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(
            employee.city
          )}&appid=${WEATHER_API_KEY}&units=metric`
        );

        if (!response.ok) {
          throw new Error('Weather data not available');
        }

        const data = await response.json();
        setWeather(data);
      } catch (error) {
        console.error("Failed to fetch weather:", error);
        setWeather(null);
      } finally {
        setWeatherLoading(false);
      }
    };

    fetchWeather();
  }, [employee?.city]);

  // Raise new SOS
  const handleRaiseSOS = () => {
    router.push("/sos");
  };

  // Format date for display
  const formatDate = (date?: { toDate: () => Date }) => {
    if (!date?.toDate) return "Unknown time";
    return date.toDate().toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Filter today's active alerts
  const todaysAlerts = sosRequests.filter(
    (alert) =>
      alert.createdAt &&
      isToday(alert.createdAt.toDate && typeof alert.createdAt.toDate === "function"
        ? alert.createdAt.toDate()
        : new Date(alert.createdAt as any))
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: themeColors.background }}>
      <ScrollView contentContainerStyle={{ padding: isTablet ? 32 : 16, paddingBottom: 40 }}>
        {/* Header Section */}
        <View style={styles.topRow}>
          <View>
            <Text style={[styles.greeting, { color: textColor }]}>
              Hello,{" "}
              <Text style={{ color: themeColors.tint }}>
                {employee?.name || employee?.fullName || "User"}
              </Text>
            </Text>
            <Text style={[styles.regionText, { color: secondaryTextColor }]}>
              {employee?.city || "Unknown location"}
            </Text>
          </View>

          {/* Weather Display */}
          <View style={styles.weatherContainer}>
            {weatherLoading ? (
              <ActivityIndicator size="small" color={themeColors.tint} />
            ) : weather && weather.main ? (
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                {weather.weather?.[0]?.icon && (
                  <Image
                    source={{
                      uri: `https://openweathermap.org/img/wn/${weather.weather[0].icon}@2x.png`,
                    }}
                    style={{ width: 40, height: 40, marginRight: 8 }}
                  />
                )}
                <View>
                  <Text style={[styles.weatherTemp, { color: textColor }]}>
                    {Math.round(weather.main.temp)}°C
                  </Text>
                  <Text style={[styles.weatherDesc, { color: secondaryTextColor }]}>
                    {weather.weather[0].main}
                  </Text>
                </View>
              </View>
            ) : (
              <Text style={[styles.weatherDesc, { color: secondaryTextColor }]}>
                Weather unavailable
              </Text>
            )}
          </View>
        </View>

        {/* Quick Stats Row */}
        <View style={isTablet ? styles.statsRowTablet : styles.statsRow}>
          <View style={[
            styles.statCard,
            {
              backgroundColor: colorScheme === 'dark' ? '#1e293b' : '#f1f5f9',
              borderColor: colorScheme === 'dark' ? '#334155' : '#e2e8f0'
            }
          ]}>
            <Ionicons
              name="checkmark-circle"
              size={28}
              color={colorScheme === 'dark' ? '#4ade80' : '#22c55e'}
            />
            <Text style={[styles.statValue, { color: themeColors.tint }]}>
              {handledCount}
            </Text>
            <Text style={[styles.statLabel, { color: secondaryTextColor }]}>
              Handled Alerts
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.statCard,
              {
                backgroundColor: colorScheme === 'dark' ? '#431314' : '#fee2e2',
                borderColor: colorScheme === 'dark' ? '#7f1d1d' : '#fecaca'
              }
            ]}
            onPress={handleRaiseSOS}
          >
            <Ionicons
              name="add-circle"
              size={28}
              color={colorScheme === 'dark' ? '#f87171' : '#ef4444'}
            />
            <Text style={[styles.statValue, { color: colorScheme === 'dark' ? '#f87171' : '#ef4444' }]}>
              Raise SOS
            </Text>
            <Text style={[styles.statLabel, { color: secondaryTextColor }]}>
              Quick Action
            </Text>
          </TouchableOpacity>
        </View>

        {/* Quick Access Cards */}
        <View style={styles.quickAccessRow}>
          {/* Team Chat Card */}
          <TouchableOpacity
            style={[
              styles.quickAccessCard,
              {
                backgroundColor: colorScheme === 'dark' ? '#1e1b4b' : '#e0e7ff',
                borderColor: colorScheme === 'dark' ? '#3730a3' : '#c7d2fe'
              }
            ]}
            onPress={() =>
              router.push({
                pathname: "/Employee-Chat-Screen",
                params: { city: employee?.city || "" },
              })
            }
          >
            <Ionicons
              name="chatbubbles"
              size={24}
              color={colorScheme === 'dark' ? '#818cf8' : '#4f46e5'}
              style={{ marginRight: 12 }}
            />
            <View style={{ flex: 1 }}>
              <Text style={[styles.quickAccessTitle, { color: colorScheme === 'dark' ? '#e0e7ff' : '#312e81' }]}>
                Team Chat
              </Text>
              <Text style={[styles.quickAccessDesc, { color: colorScheme === 'dark' ? '#a5b4fc' : '#6366f1' }]}>
                Coordinate with your team
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={colorScheme === 'dark' ? '#a5b4fc' : '#6366f1'}
            />
          </TouchableOpacity>

          {/* My Responded Alerts Card */}
          <View style={[
            styles.quickAccessCard,
            {
              backgroundColor: colorScheme === 'dark' ? '#052e16' : '#f0fdf4',
              borderColor: colorScheme === 'dark' ? '#14532d' : '#bbf7d0'
            }
          ]}>
            <Ionicons
              name="checkmark-done"
              size={24}
              color={colorScheme === 'dark' ? '#4ade80' : '#22c55e'}
              style={{ marginRight: 12 }}
            />
            <View style={{ flex: 1 }}>
              <Text style={[styles.quickAccessTitle, { color: colorScheme === 'dark' ? '#dcfce7' : '#166534' }]}>
                My Responded
              </Text>
              <Text style={[styles.quickAccessDesc, { color: colorScheme === 'dark' ? '#86efac' : '#16a34a' }]}>
                {myResponded.length} alerts
              </Text>
            </View>
          </View>
        </View>

        {/* Active Alerts Section */}
        <View style={[styles.sectionContainer, { backgroundColor: cardBackground }]}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons
              name="alert-decagram"
              size={20}
              color="#ef4444"
            />
            <Text style={[styles.sectionTitle, { color: textColor }]}>
              Today's Active Alerts
            </Text>
            <View style={styles.sectionBadge}>
              <Text style={styles.sectionBadgeText}>
                {loading ? '...' : todaysAlerts.length}
              </Text>
            </View>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={themeColors.tint} />
              <Text style={[styles.loadingText, { color: secondaryTextColor }]}>
                Loading alerts...
              </Text>
            </View>
          ) : todaysAlerts.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons
                name="checkmark-circle-outline"
                size={40}
                color={secondaryTextColor}
              />
              <Text style={[styles.emptyStateText, { color: secondaryTextColor }]}>
                No active alerts for today
              </Text>
            </View>
          ) : (
            <View style={styles.alertsContainer}>
              {todaysAlerts.slice(0, 3).map((alert) => (
                <View
                  key={alert.id}
                  style={[
                    styles.alertCard,
                    {
                      backgroundColor: colorScheme === 'dark' ? '#1e293b' : '#f8fafc',
                      borderLeftColor: LEVEL_COLORS[alert.urgency ?? "Low"] || "#2563eb",
                    }
                  ]}
                >
                  <View style={styles.alertHeader}>
                    <Text style={[
                      styles.levelTag,
                      {
                        color: LEVEL_COLORS[alert.urgency ?? "Low"] || "#2563eb",
                        backgroundColor: colorScheme === 'dark' ? '#0f172a' : '#e0e7ff'
                      }
                    ]}>
                      {alert.urgency === "High"
                        ? "🔴"
                        : alert.urgency === "Medium"
                          ? "🟠"
                          : "🔵"}{" "}
                      {alert.urgency}
                    </Text>
                    <Text style={[styles.alertType, { color: textColor }]}>
                      {alert.emergencyType}
                    </Text>
                  </View>

                  <Text style={[styles.alertDescription, { color: secondaryTextColor }]}>
                    {alert.description || "No description provided"}
                  </Text>

                  <View style={styles.alertFooter}>
                    <View style={styles.alertFooterItem}>
                      <Ionicons name="location" size={14} color="#3b82f6" />
                      <Text style={[styles.alertFooterText, { color: secondaryTextColor }]}>
                        {alert.city || "Unknown location"}
                      </Text>
                    </View>

                    <View style={styles.alertFooterItem}>
                      <Ionicons name="person" size={14} color={secondaryTextColor} />
                      <Text style={[styles.alertFooterText, { color: secondaryTextColor }]}>
                        {alert.senderName || "Unknown"}
                      </Text>
                    </View>

                    <View style={styles.alertFooterItem}>
                      <Ionicons name="time" size={14} color={secondaryTextColor} />
                      <Text style={[styles.alertFooterText, { color: secondaryTextColor }]}>
                        {formatDate(alert.createdAt)}
                      </Text>
                    </View>
                  </View>

                  <View style={[
                    styles.alertStatus,
                    {
                      backgroundColor: alert.status === "responded"
                        ? colorScheme === 'dark' ? '#14532d' : '#dcfce7'
                        : colorScheme === 'dark' ? '#431314' : '#fee2e2'
                    }
                  ]}>
                    <Text style={[
                      styles.alertStatusText,
                      {
                        color: alert.status === "responded"
                          ? colorScheme === 'dark' ? '#86efac' : '#166534'
                          : colorScheme === 'dark' ? '#fca5a5' : '#b91c1c'
                      }
                    ]}>
                      {alert.status === "responded"
                        ? `✓ Responded by ${alert.responderName || "a team member"}`
                        : "⚠️ Awaiting response"}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Recent Activity Section */}
        <View style={[styles.sectionContainer, { backgroundColor: cardBackground }]}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons
              name="history"
              size={20}
              color={themeColors.tint}
            />
            <Text style={[styles.sectionTitle, { color: textColor }]}>
              Recent Activity
            </Text>
          </View>

          {recentActivity.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons
                name="time-outline"
                size={40}
                color={secondaryTextColor}
              />
              <Text style={[styles.emptyStateText, { color: secondaryTextColor }]}>
                No recent activity yet
              </Text>
            </View>
          ) : (
            <View style={styles.activityContainer}>
              {recentActivity.map((item, index) => (
                <View
                  key={item.id}
                  style={[
                    styles.activityItem,
                    index !== recentActivity.length - 1 && styles.activityItemBorder,
                    { borderBottomColor: colorScheme === 'dark' ? '#334155' : '#e5e7eb' }
                  ]}
                >
                  <View style={styles.activityIcon}>
                    <Ionicons
                      name="checkmark-done"
                      size={18}
                      color={colorScheme === 'dark' ? '#4ade80' : '#22c55e'}
                    />
                  </View>
                  <View style={styles.activityContent}>
                    <Text style={[styles.activityTitle, { color: textColor }]}>
                      {item.emergencyType} - {item.urgency}
                    </Text>
                    <Text style={[styles.activityDesc, { color: secondaryTextColor }]}>
                      {item.description}
                    </Text>
                    <Text style={[styles.activityTime, { color: secondaryTextColor }]}>
                      {formatDate(item.createdAt)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
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
    marginBottom: 24,
  },
  greeting: {
    fontSize: isTablet ? 28 : 22,
    fontWeight: "bold",
    marginBottom: 4,
  },
  regionText: {
    fontSize: isTablet ? 16 : 14,
  },
  weatherContainer: {
    alignItems: 'flex-end',
  },
  weatherTemp: {
    fontSize: isTablet ? 20 : 18,
    fontWeight: '600',
  },
  weatherDesc: {
    fontSize: isTablet ? 14 : 12,
    textAlign: 'right',
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
    gap: 12,
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
    borderRadius: 12,
    paddingVertical: isTablet ? 24 : 16,
    paddingHorizontal: 8,
    borderWidth: 1,
    minWidth: 100,
    maxWidth: 160,
  },
  statValue: {
    fontSize: isTablet ? 24 : 18,
    fontWeight: "bold",
    marginTop: 8,
  },
  statLabel: {
    fontSize: isTablet ? 14 : 12,
    marginTop: 4,
    fontWeight: "500",
    textAlign: "center",
  },
  quickAccessRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  quickAccessCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  quickAccessTitle: {
    fontWeight: '600',
    fontSize: 16,
    marginBottom: 2,
  },
  quickAccessDesc: {
    fontSize: 12,
  },
  sectionContainer: {
    borderRadius: 16,
    padding: isTablet ? 24 : 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontWeight: "bold",
    fontSize: isTablet ? 18 : 16,
    marginLeft: 8,
  },
  sectionBadge: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
  },
  sectionBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyStateText: {
    marginTop: 8,
    fontSize: 14,
    textAlign: 'center',
  },
  alertsContainer: {
    flexDirection: "column",
    gap: 12,
  },
  alertCard: {
    borderRadius: 12,
    borderLeftWidth: 4,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  alertHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    flexWrap: "wrap",
  },
  levelTag: {
    fontWeight: "bold",
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
  alertType: {
    fontWeight: "bold",
    fontSize: 16,
  },
  alertDescription: {
    fontSize: 14,
    marginBottom: 12,
  },
  alertFooter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  alertFooterItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  alertFooterText: {
    fontSize: 12,
    marginLeft: 4,
  },
  alertStatus: {
    borderRadius: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    alignSelf: 'flex-start',
  },
  alertStatusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  activityContainer: {
    flexDirection: 'column',
  },
  activityItem: {
    flexDirection: 'row',
    paddingVertical: 12,
  },
  activityItemBorder: {
    borderBottomWidth: 1,
  },
  activityIcon: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontWeight: '600',
    fontSize: 14,
    marginBottom: 2,
  },
  activityDesc: {
    fontSize: 13,
    marginBottom: 4,
  },
  activityTime: {
    fontSize: 11,
  },
});