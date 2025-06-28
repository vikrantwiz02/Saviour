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
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";

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
  responderName?: string;
  responderRole?: string;
  respondedAt?: any;
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
  image?: string;
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
  <TouchableOpacity 
    onPress={onPress} 
    style={{ 
      marginLeft: 12,
      position: 'relative'
    }}
  >
    <LinearGradient
      colors={['#6E45E2', '#89D4CF']}
      style={{
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center'
      }}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <Ionicons name="notifications-outline" size={22} color="#fff" />
    </LinearGradient>
    {unseenCount > 0 && (
      <View
        style={{
          position: "absolute",
          right: -4,
          top: -4,
          backgroundColor: "#FF4757",
          borderRadius: 10,
          width: 20,
          height: 20,
          justifyContent: "center",
          alignItems: "center",
          borderWidth: 2,
          borderColor: theme === "dark" ? "#181a20" : "#fff"
        }}
      >
        <Text style={{ color: "#fff", fontSize: 10, fontWeight: "bold" }}>{unseenCount}</Text>
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
  const [sosResponses, setSosResponses] = useState<SOSRequest[]>([]);
  const router = useRouter();
  const { user } = useAuth();

  // Quick actions configuration
  const quickActions: QuickAction[] = [
    {
      id: "1",
      title: "Create SOS",
      icon: "plus",
      color: "#FF4757",
      route: "/sos",
      iconSet: "Feather",
    },
    {
      id: "2",
      title: "View Map",
      icon: "map",
      color: "#1E90FF",
      route: "/map",
      iconSet: "Feather",
    },
    {
      id: "3",
      title: "Resources",
      icon: "book",
      color: "#2ED573",
      route: "/Resources",
      iconSet: "Feather",
    },
    {
      id: "4",
      title: "Community",
      icon: "users",
      color: "#FFA502",
      route: "/chat",
      iconSet: "Feather",
    },
  ];

  // Sample news and tips
  const [newsFeed, setNewsFeed] = useState<NewsItem[]>([
    {
      id: "1",
      title: "Emergency Preparedness Tips",
      summary: "Learn how to prepare for natural disasters in your area",
      date: "Today",
      type: "tip",
      image: "https://images.unsplash.com/photo-1601134467661-3d775b999c8b?w=500"
    },
    {
      id: "2",
      title: "New Response Team Formed",
      summary: "Local volunteers create neighborhood emergency response team",
      date: "2 days ago",
      type: "news",
      image: "https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?w=500"
    },
    {
      id: "3",
      title: "First Aid Tutorial",
      summary: "Basic first aid techniques everyone should know",
      date: "1 week ago",
      type: "tutorial",
      image: "https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=500"
    }
  ]);

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
        setWeather(null);
      }

      // Fetch profile
      if (user) {
        const docSnap = await getDoc(doc(db, "users", user.uid));
        if (docSnap.exists()) setProfile(docSnap.data());
      }

      // Fetch SOS requests
      await fetchSOS();

      // Fetch responded SOS for this user
      await fetchSOSResponses();
    } catch (e) {
      console.error("Error fetching data:", e);
    }
  };

  // Fetch SOS requests
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
          title: data.title,
          description: data.description,
          urgency: data.urgency,
          type: data.type,
          location: data.location,
          createdAt: data.createdAt,
          userId: data.userId,
          status: data.status,
          responderName: data.responderName,
          responderRole: data.responderRole,
          respondedAt: data.respondedAt,
        });
      });
      setSosRequests(requests);
      setNotifCount(requests.filter(r => r.status === "new").length);

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

  // Fetch responded SOS for this user
  const fetchSOSResponses = async () => {
    if (!user) return;
    try {
      const q = query(
        collection(db, "sos_requests"),
        where("userId", "==", user.uid),
        where("status", "==", "responded"),
        orderBy("respondedAt", "desc")
      );
      const querySnapshot = await getDocs(q);
      const responses: SOSRequest[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        responses.push({
          id: docSnap.id,
          title: data.title,
          description: data.description,
          urgency: data.urgency,
          type: data.emergencyType,
          location: {
            latitude: data.latitude,
            longitude: data.longitude,
          },
          createdAt: data.createdAt,
          userId: data.userId,
          status: data.status,
          responderName: data.responderName,
          responderRole: data.responderRole,
          respondedAt: data.respondedAt,
        });
      });
      setSosResponses(responses);
    } catch (e) {
      console.error("Error fetching responded SOS:", e);
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

  // Helper for role display
  const getRoleLabel = (role?: string) => {
    if (role === "employee") return "Helper";
    if (role === "responder") return "Rescuer";
    return "User";
  };

  const getWeatherGradient = () => {
    if (!weather) return ['#6E45E2', '#89D4CF'];
    
    const weatherMain = weather.weather[0].main.toLowerCase();
    if (weatherMain.includes('rain')) return ['#4B79CF', '#4B79CF'];
    if (weatherMain.includes('cloud')) return ['#B7B7B7', '#5C5C5C'];
    if (weatherMain.includes('sun') || weatherMain.includes('clear')) return ['#FF7E5F', '#FEB47B'];
    return ['#6E45E2', '#89D4CF'];
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colorScheme === "dark" ? "#0F172A" : "#F8FAFC" }}>
      <ScrollView
        style={{ flex: 1 }}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            colors={['#6E45E2']}
            tintColor={'#6E45E2'}
          />
        }
        contentContainerStyle={{ paddingBottom: 40, flexGrow: 1 }}
        alwaysBounceVertical
      >
        {/* Header with greeting and notification */}
        <Animated.View entering={FadeIn.duration(600)}>
          <View style={{ 
            flexDirection: "row", 
            justifyContent: "space-between", 
            alignItems: "center", 
            paddingHorizontal: 24,
            paddingTop: 24,
            paddingBottom: 16
          }}>
            <View>
              <Text style={{ 
                fontSize: 14, 
                color: colorScheme === "dark" ? "#94A3B8" : "#64748B",
                marginBottom: 4
              }}>
                {greeting()}
              </Text>
              <Text style={{ 
                fontSize: isTablet ? 28 : 24, 
                fontWeight: "bold", 
                color: colorScheme === "dark" ? "#F8FAFC" : "#0F172A" 
              }}>
                {profile?.fullName ? profile.fullName : user?.email ? user.email.split('@')[0] : "User"}
              </Text>
            </View>
            <NotificationIcon
              unseenCount={notifCount}
              onPress={() => router.push("/Notifications")}
              theme={colorScheme}
            />
          </View>
        </Animated.View>

        {/* Weather Card */}
        <Animated.View entering={FadeIn.delay(100).duration(600)}>
          <LinearGradient
            colors={getWeatherGradient() as any}
            style={{
              borderRadius: 24,
              padding: 20,
              marginHorizontal: 24,
              marginBottom: 24,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              shadowColor: "#000",
              shadowOffset: {
                width: 0,
                height: 4,
              },
              shadowOpacity: 0.1,
              shadowRadius: 10,
              elevation: 8
            }}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {weather && weather.weather && weather.weather[0] ? (
              <>
                <View>
                  <Text style={{
                    fontWeight: "bold",
                    fontSize: 18,
                    color: "#fff",
                    marginBottom: 4
                  }}>
                    {weather.name}
                  </Text>
                  <Text style={{
                    fontSize: 32,
                    fontWeight: '800',
                    color: "#fff",
                    marginBottom: 4
                  }}>
                    {Math.round(weather.main.temp)}°C
                  </Text>
                  <Text style={{
                    fontSize: 14,
                    color: "rgba(255,255,255,0.8)"
                  }}>
                    {weather.weather[0].description}
                  </Text>
                </View>
                <Image
                  source={{ uri: `https://openweathermap.org/img/wn/${weather.weather[0].icon}@4x.png` }}
                  style={{ width: 120, height: 120 }}
                  resizeMode="contain"
                />
              </>
            ) : (
              <View style={{ flex: 1, alignItems: "center" }}>
                <Text style={{ color: "#fff" }}>Weather unavailable</Text>
              </View>
            )}
          </LinearGradient>
        </Animated.View>

        {/* Quick Actions Grid */}
        <Animated.View entering={FadeIn.delay(200).duration(600)}>
          <Text style={{
            fontWeight: "600",
            fontSize: 18,
            marginBottom: 16,
            marginHorizontal: 24,
            color: colorScheme === "dark" ? "#F8FAFC" : "#0F172A"
          }}>
            Quick Actions
          </Text>
          <View style={{
            flexDirection: "row",
            justifyContent: "space-between",
            paddingHorizontal: 24,
            marginBottom: 24,
            flexWrap: "wrap",
            gap: 12
          }}>
            {quickActions.map((action) => (
              <TouchableOpacity
                key={action.id}
                onPress={() => router.push(action.route as any)}
                style={{
                  width: (width - 72) / 2,
                  backgroundColor: colorScheme === "dark" ? "#1E293B" : "#FFFFFF",
                  borderRadius: 16,
                  padding: 20,
                  alignItems: "center",
                  justifyContent: "center",
                  shadowColor: "#000",
                  shadowOffset: {
                    width: 0,
                    height: 2,
                  },
                  shadowOpacity: 0.1,
                  shadowRadius: 4,
                  elevation: 3
                }}
              >
                <View style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: `${action.color}20`,
                  justifyContent: "center",
                  alignItems: "center",
                  marginBottom: 12
                }}>
                  {renderIcon(action.iconSet, action.icon, 24, action.color)}
                </View>
                <Text style={{
                  fontWeight: "600",
                  color: colorScheme === "dark" ? "#F8FAFC" : "#0F172A",
                  textAlign: "center"
                }}>
                  {action.title}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        {/* SOS Responses Section */}
        {sosResponses.length > 0 && (
          <Animated.View entering={FadeIn.delay(350).duration(600)}>
            <View style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
              marginHorizontal: 24
            }}>
              <Text style={{
                fontWeight: "600",
                fontSize: 18,
                color: colorScheme === "dark" ? "#F8FAFC" : "#0F172A"
              }}>
                SOS Responses
              </Text>
              <TouchableOpacity onPress={() => router.push("/sos-history" as any)}>
                <Text style={{
                  color: "#6E45E2",
                  fontSize: 14,
                  fontWeight: "500"
                }}>
                  View All
                </Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingLeft: 24, paddingRight: 8, gap: 16 }}
            >
              {sosResponses.map((sos) => (
                <View key={sos.id} style={{
                  width: width * 0.7,
                  backgroundColor: colorScheme === "dark" ? "#1E293B" : "#FFFFFF",
                  borderRadius: 16,
                  padding: 16,
                  shadowColor: "#000",
                  shadowOffset: {
                    width: 0,
                    height: 2,
                  },
                  shadowOpacity: 0.1,
                  shadowRadius: 4,
                  elevation: 3
                }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
                    <Text style={{ 
                      fontWeight: "bold", 
                      fontSize: 16, 
                      color: colorScheme === "dark" ? "#F8FAFC" : "#0F172A" 
                    }}>
                      {sos.type}
                    </Text>
                    <View style={{
                      backgroundColor: sos.urgency === "High" ? "#FF475720" : 
                                      sos.urgency === "Medium" ? "#FFA50220" : "#2ED57320",
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 12,
                      alignSelf: 'flex-start'
                    }}>
                      <Text style={{ 
                        color: sos.urgency === "High" ? "#FF4757" : 
                              sos.urgency === "Medium" ? "#FFA502" : "#2ED573",
                        fontSize: 12,
                        fontWeight: '600'
                      }}>
                        {sos.urgency}
                      </Text>
                    </View>
                  </View>
                  <Text style={{ 
                    color: "#6E45E2", 
                    fontSize: 12, 
                    marginBottom: 8,
                    fontWeight: '500'
                  }}>
                    Responded by: {sos.responderName || "Unknown"} • {getRoleLabel(sos.responderRole)}
                  </Text>
                  <Text style={{ 
                    color: colorScheme === "dark" ? "#94A3B8" : "#64748B", 
                    fontSize: 14,
                    marginBottom: 12 
                  }}>
                    {sos.description.length > 100 ? `${sos.description.substring(0, 100)}...` : sos.description}
                  </Text>
                  <View style={{ 
                    flexDirection: 'row', 
                    alignItems: 'center', 
                    marginTop: 'auto'
                  }}>
                    <Feather 
                      name="clock" 
                      size={14} 
                      color={colorScheme === "dark" ? "#94A3B8" : "#64748B"} 
                      style={{ marginRight: 4 }}
                    />
                    <Text style={{ 
                      color: colorScheme === "dark" ? "#94A3B8" : "#64748B", 
                      fontSize: 12 
                    }}>
                      {sos.respondedAt?.toDate ? sos.respondedAt.toDate().toLocaleString() : "Recently"}
                    </Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          </Animated.View>
        )}

        {/* Emergency Heatmap */}
        <Animated.View entering={FadeIn.delay(400).duration(600)}>
          <View style={{
            marginTop: 24,
            marginBottom: 16,
            marginHorizontal: 24
          }}>
            <Text style={{
              fontWeight: "600",
              fontSize: 18,
              color: colorScheme === "dark" ? "#F8FAFC" : "#0F172A",
              marginBottom: 8
            }}>
              Emergency Heatmap
            </Text>
            <Text style={{
              color: colorScheme === "dark" ? "#94A3B8" : "#64748B",
              fontSize: 14
            }}>
              Recent emergency activity in your area
            </Text>
          </View>
          <View style={{
            backgroundColor: colorScheme === "dark" ? "#1E293B" : "#FFFFFF",
            borderRadius: 24,
            height: 200,
            marginHorizontal: 24,
            overflow: "hidden",
            shadowColor: "#000",
            shadowOffset: {
              width: 0,
              height: 2,
            },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3
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
                customMapStyle={colorScheme === 'dark' ? [
                  {
                    "elementType": "geometry",
                    "stylers": [
                      {
                        "color": "#242f3e"
                      }
                    ]
                  },
                  {
                    "elementType": "labels.text.fill",
                    "stylers": [
                      {
                        "color": "#746855"
                      }
                    ]
                  },
                  {
                    "elementType": "labels.text.stroke",
                    "stylers": [
                      {
                        "color": "#242f3e"
                      }
                    ]
                  }
                ] : []}
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
                backgroundColor: colorScheme === "dark" ? "#1E293B" : "#F1F5F9"
              }}>
                <ActivityIndicator size="small" color="#6E45E2" />
                <Text style={{ marginTop: 8, color: colorScheme === "dark" ? "#94A3B8" : "#64748B" }}>Loading map...</Text>
              </View>
            )}
          </View>
        </Animated.View>

        {/* Stats Overview */}
        <Animated.View entering={FadeIn.delay(500).duration(600)}>
          <View style={{
            marginTop: 24,
            marginBottom: 16,
            marginHorizontal: 24
          }}>
            <Text style={{
              fontWeight: "600",
              fontSize: 18,
              color: colorScheme === "dark" ? "#F8FAFC" : "#0F172A",
              marginBottom: 8
            }}>
              Your Safety Stats
            </Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingLeft: 24, paddingRight: 8, gap: 16 }}
          >
            {/* SOS Raised Card */}
            <LinearGradient
              colors={['#FF4757', '#FF6B81']}
              style={{
                width: 160,
                borderRadius: 16,
                padding: 16,
                shadowColor: "#000",
                shadowOffset: {
                  width: 0,
                  height: 2,
                },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 3
              }}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Feather name="alert-triangle" size={24} color="#fff" style={{ marginBottom: 12 }} />
              <Text style={{
                fontSize: 12,
                color: "rgba(255,255,255,0.8)",
                marginBottom: 4
              }}>
                SOS Raised
              </Text>
              <Text style={{
                fontSize: 28,
                fontWeight: "bold",
                color: "#fff",
                marginBottom: 4
              }}>
                {profile?.sosRaised || 0}
              </Text>
            </LinearGradient>

            {/* Help Provided Card */}
            <LinearGradient
              colors={['#2ED573', '#7BED9F']}
              style={{
                width: 160,
                borderRadius: 16,
                padding: 16,
                shadowColor: "#000",
                shadowOffset: {
                  width: 0,
                  height: 2,
                },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 3
              }}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Feather name="heart" size={24} color="#fff" style={{ marginBottom: 12 }} />
              <Text style={{
                fontSize: 12,
                color: "rgba(255,255,255,0.8)",
                marginBottom: 4
              }}>
                Help Provided
              </Text>
              <Text style={{
                fontSize: 28,
                fontWeight: "bold",
                color: "#fff",
                marginBottom: 4
              }}>
                {profile?.helpProvided || 0}
              </Text>
            </LinearGradient>

            {/* Trust Rating Card */}
            <LinearGradient
              colors={['#6E45E2', '#88A2E8']}
              style={{
                width: 160,
                borderRadius: 16,
                padding: 16,
                shadowColor: "#000",
                shadowOffset: {
                  width: 0,
                  height: 2,
                },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 3
              }}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Feather name="star" size={24} color="#fff" style={{ marginBottom: 12 }} />
              <Text style={{
                fontSize: 12,
                color: "rgba(255,255,255,0.8)",
                marginBottom: 4
              }}>
                Trust Rating
              </Text>
              <Text style={{
                fontSize: 28,
                fontWeight: "bold",
                color: "#fff",
                marginBottom: 4
              }}>
                {profile?.trustRating ? profile.trustRating.toFixed(1) : "0.0"}
              </Text>
            </LinearGradient>
          </ScrollView>
        </Animated.View>

        {/* Community Impact */}
        <Animated.View entering={FadeIn.delay(600).duration(600)}>
          <View style={{
            marginTop: 24,
            marginBottom: 16,
            marginHorizontal: 24
          }}>
            <Text style={{
              fontWeight: "600",
              fontSize: 18,
              color: colorScheme === "dark" ? "#F8FAFC" : "#0F172A",
              marginBottom: 8
            }}>
              Community Impact
            </Text>
          </View>
          <View style={{
            backgroundColor: colorScheme === "dark" ? "#1E293B" : "#FFFFFF",
            borderRadius: 16,
            padding: 16,
            marginHorizontal: 24,
            shadowColor: "#000",
            shadowOffset: {
              width: 0,
              height: 2,
            },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3
          }}>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
              <LinearGradient
                colors={['#6E45E2', '#89D4CF']}
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  justifyContent: "center",
                  alignItems: "center",
                  marginRight: 16
                }}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Feather name="users" size={24} color="#fff" />
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={{
                  fontWeight: "bold",
                  color: colorScheme === "dark" ? "#F8FAFC" : "#0F172A",
                  fontSize: 16,
                  marginBottom: 4
                }}>
                  {sosRequests.length > 0 ?
                    `${Math.floor(sosRequests.length / 3)} people helped nearby` :
                    "Community growing"}
                </Text>
                <Text style={{
                  color: colorScheme === "dark" ? "#94A3B8" : "#64748B",
                  fontSize: 14
                }}>
                  {sosRequests.length > 0 ?
                    "Your neighborhood is actively responding to emergencies" :
                    "Check back soon for community updates"}
                </Text>
              </View>
            </View>
            <View style={{
              height: 8,
              backgroundColor: colorScheme === "dark" ? "#334155" : "#E2E8F0",
              borderRadius: 4,
              overflow: "hidden"
            }}>
              <LinearGradient
                colors={['#6E45E2', '#89D4CF']}
                style={{
                  width: `${sosRequests.length > 0 ? Math.min(100, sosRequests.length * 10) : 20}%`,
                  height: "100%",
                  borderRadius: 4
                }}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              />
            </View>
          </View>
        </Animated.View>

        {/* News & Tips */}
        <Animated.View entering={FadeIn.delay(700).duration(600)}>
          <View style={{
            marginTop: 24,
            marginBottom: 16,
            marginHorizontal: 24,
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center"
          }}>
            <Text style={{
              fontWeight: "600",
              fontSize: 18,
              color: colorScheme === "dark" ? "#F8FAFC" : "#0F172A"
            }}>
              Safety Updates
            </Text>
            <TouchableOpacity onPress={() => router.push("./news")}>
              <Text style={{
                color: "#6E45E2",
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
            contentContainerStyle={{ paddingLeft: 24, paddingRight: 8, gap: 16 }}
          >
            {newsFeed.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={{
                  width: width * 0.8,
                  backgroundColor: colorScheme === "dark" ? "#1E293B" : "#FFFFFF",
                  borderRadius: 16,
                  overflow: "hidden",
                  shadowColor: "#000",
                  shadowOffset: {
                    width: 0,
                    height: 2,
                  },
                  shadowOpacity: 0.1,
                  shadowRadius: 4,
                  elevation: 3
                }}
              >
                <Image
                  source={{ uri: item.image }}
                  style={{ width: '100%', height: 120 }}
                  resizeMode="cover"
                />
                <View style={{ padding: 16 }}>
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginBottom: 8
                  }}>
                    <View style={{
                      backgroundColor: item.type === "tip" ? "#2ED57320" :
                                      item.type === "news" ? "#1E90FF20" : "#FF475720",
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 12,
                      marginRight: 8
                    }}>
                      <Text style={{ 
                        color: item.type === "tip" ? "#2ED573" :
                              item.type === "news" ? "#1E90FF" : "#FF4757",
                        fontSize: 12,
                        fontWeight: '600',
                        textTransform: 'capitalize'
                      }}>
                        {item.type}
                      </Text>
                    </View>
                    <Text style={{ 
                      color: colorScheme === "dark" ? "#94A3B8" : "#64748B", 
                      fontSize: 12 
                    }}>
                      {item.date}
                    </Text>
                  </View>
                  <Text style={{
                    fontWeight: "bold",
                    color: colorScheme === "dark" ? "#F8FAFC" : "#0F172A",
                    fontSize: 16,
                    marginBottom: 8
                  }}>
                    {item.title}
                  </Text>
                  <Text style={{
                    color: colorScheme === "dark" ? "#94A3B8" : "#64748B",
                    fontSize: 14,
                    marginBottom: 8
                  }}>
                    {item.summary}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}