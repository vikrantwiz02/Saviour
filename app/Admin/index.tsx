import { useColorScheme } from "@/hooks/useColorScheme";
import { Ionicons, MaterialCommunityIcons, FontAwesome, Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState, useEffect } from "react";
import {
  Alert,
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Image,
  ScrollView,
  RefreshControl,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Location from "expo-location";
import axios from "axios";
import { collection, getDocs, query, orderBy, doc, getDoc, where } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useAuth } from "@/context/AuthContext";
import MapView, { Heatmap, PROVIDER_GOOGLE } from "react-native-maps";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeIn } from "react-native-reanimated";

const { width } = Dimensions.get("window");
const isTablet = width >= 768;

type SOSRequest = {
  id: string;
  title: string;
  description: string;
  urgency: "High" | "Medium" | "Low";
  type: string;
  location: { latitude: number; longitude: number };
  createdAt: string;
  userId: string;
  status: string;
  isPublic?: boolean;
};

type QuickAction = {
  id: string;
  title: string;
  icon: string;
  color: string;
  route: string;
  iconSet: "Ionicons" | "MaterialCommunityIcons" | "FontAwesome" | "Feather";
};

type NewsItem = {
  id: string;
  title: string;
  summary: string;
  date: string;
  type: "tip" | "news" | "tutorial";
};

const NotificationIcon = ({
  unseenCount,
  onPress,
  theme,
}: {
  unseenCount: number;
  onPress: () => void;
  theme: string;
}) => (
  <TouchableOpacity onPress={onPress} style={{ marginLeft: 12 }}>
    <Ionicons name="notifications-outline" size={30} color={theme === "dark" ? "#fff" : "#222"} />
    {unseenCount > 0 && (
      <View
        style={{
          position: "absolute",
          right: -2,
          top: -2,
          backgroundColor: "#f43f5e",
          borderRadius: 8,
          paddingHorizontal: 5,
          paddingVertical: 1,
          minWidth: 16,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ color: "#fff", fontSize: 11, fontWeight: "bold" }}>{unseenCount}</Text>
      </View>
    )}
  </TouchableOpacity>
);

export default function HomeScreen() {
  const colorScheme = useColorScheme() ?? "light";
  const [sosRequests, setSosRequests] = useState<SOSRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [notifCount, setNotifCount] = useState(0);
  const [weather, setWeather] = useState<any>(null);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [heatmapData, setHeatmapData] = useState<any[]>([]);
  const [sosRaisedCount, setSosRaisedCount] = useState(0);
  const router = useRouter();
  const { user } = useAuth();

  // Quick actions configuration
  const quickActions: QuickAction[] = [
    {
      id: "1",
      title: "Create SOS",
      icon: "plus-circle",
      color: "#ef4444",
      route: "/sos",
      iconSet: "Feather",
    },
    {
      id: "2",
      title: "View Map",
      icon: "map",
      color: "#3b82f6",
      route: "/map",
      iconSet: "Feather",
    },
    {
      id: "3",
      title: "Resources",
      icon: "book",
      color: "#10b981",
      route: "/resources",
      iconSet: "Feather",
    },
    {
      id: "4",
      title: "Community",
      icon: "users",
      color: "#f59e0b",
      route: "/chat",
      iconSet: "Feather",
    },
  ];

  // Sample news and tips
  const [newsFeed, setNewsFeed] = useState<NewsItem[]>([]);

  // Fetch all data
  const fetchAll = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission required", "Location permission is needed for app functionality.");
        return;
      }
      let loc = await Location.getCurrentPositionAsync({});
      setLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });

      // Fetch weather
      const apiKey = "475dad9f469397c42f28ed2ce92b2537";
      try {
        const weatherResp = await axios.get(
          `https://api.openweathermap.org/data/2.5/weather?lat=${loc.coords.latitude}&lon=${loc.coords.longitude}&units=metric&appid=${apiKey}`
        );
        setWeather(weatherResp.data);
      } catch (err) {
        console.log("Weather error:", err);
      }

      // Fetch profile
      if (user) {
        const docSnap = await getDoc(doc(db, "users", user.uid));
        if (docSnap.exists()) setProfile(docSnap.data());
      }

      // Fetch SOS requests
      await fetchSOS();
      // Fetch SOS raised count for current user
      await fetchSosRaisedCount();
    } catch (e) {
      console.error("Error fetching data:", e);
    }
  };

  // Fetch SOS requests (all public)
  const fetchSOS = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "sos_requests"), orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      const requests: SOSRequest[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        requests.push({
          id: docSnap.id,
          title: data.title || data.emergencyType || "SOS",
          description: data.description,
          urgency: data.urgency,
          type: data.type || data.emergencyType || "General",
          location: {
            latitude: data.latitude,
            longitude: data.longitude,
          },
          createdAt: data.createdAt,
          userId: data.userId,
          status: data.status || "new",
          isPublic: data.isPublic,
        });
      });
      // Only show public SOS to everyone
      setSosRequests(requests.filter(r => r.isPublic !== false));
      setNotifCount(requests.filter(r => r.status === "new" && r.isPublic !== false).length);

      // Generate heatmap data
      if (requests.length > 0) {
        const heatmapPoints = requests.map(request => ({
          latitude: request.location.latitude,
          longitude: request.location.longitude,
          weight: request.urgency === "High" ? 0.8 : request.urgency === "Medium" ? 0.5 : 0.3
        }));
        setHeatmapData(heatmapPoints);
      }
    } catch (e) {
      console.error("Error fetching SOS requests:", e);
    } finally {
      setLoading(false);
    }
  };

  // Fetch SOS raised count for current user
  const fetchSosRaisedCount = async () => {
    if (!user) return;
    try {
      const q = query(
        collection(db, "sos_requests"),
        where("userId", "==", user.uid),
        where("isPublic", "==", true)
      );
      const querySnapshot = await getDocs(q);
      setSosRaisedCount(querySnapshot.size);
    } catch (e) {
      setSosRaisedCount(0);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  };

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const renderIcon = (iconSet: string, iconName: string, size: number, color: string) => {
    switch (iconSet) {
      case "Ionicons":
        return <Ionicons name={iconName as any} size={size} color={color} />;
      case "MaterialCommunityIcons":
        return <MaterialCommunityIcons name={iconName as any} size={size} color={color} />;
      case "FontAwesome":
        return <FontAwesome name={iconName as any} size={size} color={color} />;
      case "Feather":
        return <Feather name={iconName as any} size={size} color={color} />;
      default:
        return <Ionicons name="alert-circle" size={size} color={color} />;
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colorScheme === "dark" ? "#181a20" : "#fff" }}>
      <ScrollView
        style={{ flex: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ paddingHorizontal: isTablet ? 40 : 16, paddingBottom: 40, flexGrow: 1 }}
        alwaysBounceVertical
      >
        {/* Header with greeting and notification */}
        <Animated.View entering={FadeIn.duration(600)}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 18, marginBottom: 8 }}>
            <Text style={{ fontSize: isTablet ? 28 : 22, fontWeight: "bold", color: colorScheme === "dark" ? "#fff" : "#222" }}>
              {greeting()}{profile?.fullName ? `, ${profile.fullName}` : user?.email ? `, ${user.email.split('@')[0]}` : ""}!
            </Text>
            <NotificationIcon
              unseenCount={notifCount}
              onPress={() => router.push("/Notifications")}
              theme={colorScheme}
            />
          </View>
        </Animated.View>

        {/* Profile Summary */}
        <Animated.View entering={FadeIn.delay(100).duration(600)}>
          <LinearGradient
            colors={colorScheme === "dark"
              ? ["#23272e", "#181a20"]
              : ["#f3f4f6", "#fff"]}
            style={{
              borderRadius: 16,
              padding: 16,
              marginBottom: 16,
              flexDirection: "row",
              alignItems: "center"
            }}
          >
            <Image
              source={profile?.photo ? { uri: profile.photo } : require("../../assets/images/default-avatar.png")}
              style={{ width: 56, height: 56, borderRadius: 28, marginRight: 14 }}
            />
            <View style={{ flex: 1 }}>
              {profile ? (
                <>
                  <Text style={{ fontWeight: "bold", fontSize: 17, color: colorScheme === "dark" ? "#fff" : "#222" }}>
                    {profile.fullName}
                  </Text>
                  <Text style={{ color: "#888" }}>{profile.city || "Unknown location"}</Text>
                  <Text style={{ color: "#888" }}>{profile.role ? profile.role.toUpperCase() : "USER"}</Text>
                </>
              ) : (
                <Text style={{ color: "#888" }}>Loading profile...</Text>
              )}
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Weather Card */}
        <Animated.View entering={FadeIn.delay(200).duration(600)}>
          <LinearGradient
            colors={colorScheme === "dark"
              ? ["#23272e", "#23272e"]
              : ["#fffbe6", "#fff"]}
            style={{
              borderRadius: 16,
              padding: 16,
              marginBottom: 16,
              borderWidth: 1,
              borderColor: colorScheme === "dark" ? "#444" : "#fbbf24",
            }}
          >
            {weather ? (
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Ionicons
                  name={weather.weather[0].main.includes("Rain") ? "rainy" :
                    weather.weather[0].main.includes("Cloud") ? "cloudy" : "sunny"}
                  size={40}
                  color={colorScheme === "dark" ? "#ffd700" : "#f59e0b"}
                />
                <View style={{ marginLeft: 14 }}>
                  <Text style={{ fontSize: isTablet ? 32 : 22, fontWeight: "bold", color: colorScheme === "dark" ? "#ffd700" : "#f59e42" }}>
                    {Math.round(weather.main.temp)}°C
                  </Text>
                  <Text style={{ fontSize: isTablet ? 18 : 15, color: colorScheme === "dark" ? "#fff" : "#b08900" }}>
                    {weather.weather[0].main}, {weather.name}
                  </Text>
                </View>
              </View>
            ) : (
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <ActivityIndicator size="small" color={colorScheme === "dark" ? "#fff" : "#888"} />
                <Text style={{ marginLeft: 10, color: "#888" }}>Loading weather...</Text>
              </View>
            )}
          </LinearGradient>
        </Animated.View>

        {/* Quick Actions Grid */}
        <Animated.View entering={FadeIn.delay(300).duration(600)}>
          <Text style={{
            fontWeight: "600",
            fontSize: 16,
            marginBottom: 12,
            color: colorScheme === "dark" ? "#fff" : "#222"
          }}>
            Quick Actions
          </Text>
          <View style={{
            flexDirection: "row",
            flexWrap: "wrap",
            justifyContent: "space-between",
            gap: 12
          }}>
            {quickActions.map((action) => (
              <TouchableOpacity
                key={action.id}
                style={{
                  width: isTablet ? "48%" : "48%",
                  backgroundColor: colorScheme === "dark" ? "#23272e" : "#fff",
                  borderRadius: 12,
                  padding: 16,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1,
                  borderColor: colorScheme === "dark" ? "#444" : "#e5e7eb",
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 4,
                  elevation: 2,
                  marginBottom: 8,
                }}
                onPress={() => {
                  router.push(action.route as any);
                }}
              >
                {renderIcon(action.iconSet, action.icon, 28, action.color)}
                <Text style={{
                  marginTop: 8,
                  fontWeight: "600",
                  color: colorScheme === "dark" ? "#fff" : "#222",
                  textAlign: "center"
                }}>
                  {action.title}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        {/* Nearby Emergency Heatmap Preview */}
        <Animated.View entering={FadeIn.delay(400).duration(600)}>
          <Text style={{
            fontWeight: "600",
            fontSize: 16,
            marginBottom: 12,
            color: colorScheme === "dark" ? "#fff" : "#222"
          }}>
            Nearby Emergency Heatmap
          </Text>
          <View style={{
            backgroundColor: colorScheme === "dark" ? "#23272e" : "#fff",
            borderRadius: 16,
            height: 200,
            overflow: "hidden",
            borderWidth: 1,
            borderColor: colorScheme === "dark" ? "#444" : "#e5e7eb",
          }}>
            {location ? (
              <MapView
                style={{ flex: 1 }}
                provider={PROVIDER_GOOGLE}
                initialRegion={{
                  latitude: location.latitude,
                  longitude: location.longitude,
                  latitudeDelta: 0.0922,
                  longitudeDelta: 0.0421,
                }}
                scrollEnabled={false}
                zoomEnabled={false}
                pitchEnabled={false}
                rotateEnabled={false}
              >
                {heatmapData.length > 0 && (
                  <Heatmap
                    points={heatmapData}
                    opacity={1}
                    radius={50}
                    gradient={{
                      colors: ["#00f", "#0ff", "#0f0", "#ff0", "#f00"],
                      startPoints: [0.01, 0.25, 0.5, 0.75, 1],
                      colorMapSize: 256
                    }}
                  />
                )}
              </MapView>
            ) : (
              <View style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
                backgroundColor: colorScheme === "dark" ? "#1e1e1e" : "#f3f4f6"
              }}>
                <ActivityIndicator size="small" color={colorScheme === "dark" ? "#fff" : "#888"} />
                <Text style={{ marginTop: 8, color: "#888" }}>Loading map...</Text>
              </View>
            )}
          </View>
        </Animated.View>

        {/* My Activity Summary */}
        <Animated.View entering={FadeIn.delay(500).duration(600)}>
          <Text style={{
            fontWeight: "600",
            fontSize: 16,
            marginBottom: 12,
            color: colorScheme === "dark" ? "#fff" : "#222"
          }}>
            My Activity Summary
          </Text>
          <View style={{
            flexDirection: "row",
            justifyContent: "space-between",
            gap: 12
          }}>
            {/* SOS Raised Card */}
            <View style={{
              flex: 1,
              backgroundColor: colorScheme === "dark" ? "#23272e" : "#fff",
              borderRadius: 12,
              padding: 16,
              borderWidth: 1,
              borderColor: colorScheme === "dark" ? "#444" : "#e5e7eb",
              alignItems: "center"
            }}>
              <View style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: "#fef2f2",
                justifyContent: "center",
                alignItems: "center",
                marginBottom: 8
              }}>
                <Feather name="alert-triangle" size={24} color="#ef4444" />
              </View>
              <Text style={{
                fontSize: 24,
                fontWeight: "bold",
                color: colorScheme === "dark" ? "#fff" : "#222",
                marginBottom: 4
              }}>
                {sosRaisedCount}
              </Text>
              <Text style={{
                fontSize: 12,
                color: "#888",
                textAlign: "center"
              }}>
                SOS Raised
              </Text>
            </View>

            {/* Help Provided Card */}
            <View style={{
              flex: 1,
              backgroundColor: colorScheme === "dark" ? "#23272e" : "#fff",
              borderRadius: 12,
              padding: 16,
              borderWidth: 1,
              borderColor: colorScheme === "dark" ? "#444" : "#e5e7eb",
              alignItems: "center"
            }}>
              <View style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: "#f0fdf4",
                justifyContent: "center",
                alignItems: "center",
                marginBottom: 8
              }}>
                <Feather name="heart" size={24} color="#10b981" />
              </View>
              <Text style={{
                fontSize: 24,
                fontWeight: "bold",
                color: colorScheme === "dark" ? "#fff" : "#222",
                marginBottom: 4
              }}>
                {profile?.helpProvided || 0}
              </Text>
              <Text style={{
                fontSize: 12,
                color: "#888",
                textAlign: "center"
              }}>
                Help Provided
              </Text>
            </View>

            {/* Trust Rating Card */}
            <View style={{
              flex: 1,
              backgroundColor: colorScheme === "dark" ? "#23272e" : "#fff",
              borderRadius: 12,
              padding: 16,
              borderWidth: 1,
              borderColor: colorScheme === "dark" ? "#444" : "#e5e7eb",
              alignItems: "center"
            }}>
              <View style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: "#eff6ff",
                justifyContent: "center",
                alignItems: "center",
                marginBottom: 8
              }}>
                <Feather name="star" size={24} color="#3b82f6" />
              </View>
              <Text style={{
                fontSize: 24,
                fontWeight: "bold",
                color: colorScheme === "dark" ? "#fff" : "#222",
                marginBottom: 4
              }}>
                {profile?.trustRating ? profile.trustRating.toFixed(1) : "0.0"}
              </Text>
              <Text style={{
                fontSize: 12,
                color: "#888",
                textAlign: "center"
              }}>
                Trust Rating
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Community Impact Snapshot */}
        <Animated.View entering={FadeIn.delay(600).duration(600)}>
          <Text style={{
            fontWeight: "600",
            fontSize: 16,
            marginBottom: 12,
            color: colorScheme === "dark" ? "#fff" : "#222"
          }}>
            Community Impact
          </Text>
          <View style={{
            backgroundColor: colorScheme === "dark" ? "#23272e" : "#fff",
            borderRadius: 16,
            padding: 16,
            borderWidth: 1,
            borderColor: colorScheme === "dark" ? "#444" : "#e5e7eb",
          }}>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
              <View style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: colorScheme === "dark" ? "#374151" : "#e0f2fe",
                justifyContent: "center",
                alignItems: "center",
                marginRight: 12
              }}>
                <Feather name="users" size={20} color="#0ea5e9" />
              </View>
              <View>
                <Text style={{
                  fontWeight: "bold",
                  color: colorScheme === "dark" ? "#fff" : "#222",
                  fontSize: 16
                }}>
                  {sosRequests.length > 0 ?
                    `${Math.floor(sosRequests.length / 3)} people helped nearby this week` :
                    "Community data loading"}
                </Text>
                <Text style={{
                  color: "#888",
                  fontSize: 12
                }}>
                  {sosRequests.length > 0 ?
                    "Your neighborhood is actively responding to emergencies" :
                    "Check back soon for community updates"}
                </Text>
              </View>
            </View>
            <View style={{
              height: 6,
              backgroundColor: colorScheme === "dark" ? "#374151" : "#e5e7eb",
              borderRadius: 3,
              marginTop: 8,
              overflow: "hidden"
            }}>
              <View style={{
                width: `${sosRequests.length > 0 ? Math.min(100, sosRequests.length * 10) : 0}%`,
                height: "100%",
                backgroundColor: "#0ea5e9",
                borderRadius: 3
              }} />
            </View>
          </View>
        </Animated.View>

        {/* Quick Tips & News Feed */}
        <Animated.View entering={FadeIn.delay(700).duration(600)}>
          <View style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12
          }}>
            <Text style={{
              fontWeight: "600",
              fontSize: 16,
              color: colorScheme === "dark" ? "#fff" : "#222"
            }}>
              Quick Tips & News
            </Text>
            <TouchableOpacity onPress={() => router.push("./news")}>
              <Text style={{
                color: "#3b82f6",
                fontSize: 14,
                fontWeight: "500"
              }}>
                See All
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 12 }}
          >
            {newsFeed.length > 0 ? (
              newsFeed.map((item) => (
                <View
                  key={item.id}
                  style={{
                    width: 200,
                    backgroundColor: colorScheme === "dark" ? "#23272e" : "#fff",
                    borderRadius: 12,
                    padding: 16,
                    borderWidth: 1,
                    borderColor: colorScheme === "dark" ? "#444" : "#e5e7eb",
                  }}
                >
                  <View style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: item.type === "tip" ? "#f0fdf4" :
                      item.type === "news" ? "#eff6ff" : "#fef2f2",
                    justifyContent: "center",
                    alignItems: "center",
                    marginBottom: 8
                  }}>
                    <Feather
                      name={item.type === "tip" ? "info" :
                        item.type === "news" ? "bell" : "book"}
                      size={16}
                      color={item.type === "tip" ? "#10b981" :
                        item.type === "news" ? "#3b82f6" : "#ef4444"}
                    />
                  </View>
                  <Text style={{
                    fontWeight: "bold",
                    color: colorScheme === "dark" ? "#fff" : "#222",
                    marginBottom: 4
                  }}>
                    {item.title}
                  </Text>
                  <Text style={{
                    color: "#888",
                    fontSize: 12,
                    marginBottom: 8
                  }}>
                    {item.summary}
                  </Text>
                  <Text style={{
                    color: "#3b82f6",
                    fontSize: 10
                  }}>
                    {item.date}
                  </Text>
                </View>
              ))
            ) : (
              <View style={{
                width: 200,
                backgroundColor: colorScheme === "dark" ? "#23272e" : "#fff",
                borderRadius: 12,
                padding: 16,
                borderWidth: 1,
                borderColor: colorScheme === "dark" ? "#444" : "#e5e7eb",
                justifyContent: "center",
                alignItems: "center"
              }}>
                <Feather name="info" size={24} color="#888" />
                <Text style={{
                  color: "#888",
                  marginTop: 8,
                  textAlign: "center"
                }}>
                  No tips or news available
                </Text>
              </View>
            )}
          </ScrollView>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}