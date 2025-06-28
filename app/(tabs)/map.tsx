import React, { useEffect, useRef, useState } from "react";
import { Alert, Platform, StyleSheet, TouchableOpacity, View, ActivityIndicator } from "react-native";
import MapView, { Callout, Marker, PROVIDER_GOOGLE, Region, Polyline } from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Location from "expo-location";
import { useColorScheme } from "@/hooks/useColorScheme";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { IconSymbol } from "@/components/ui/IconSymbol";
import MapFilterModal from "@/components/MapFilterModal";
import SOSDetailModal from "@/components/Modals/SOSDetailModal";
import { SafeZoneRoute, SafeZoneControls } from "@/components/SafeZoneNavigator";
import { Colors } from "@/constants/Colors";
import { getFirestore, collection, onSnapshot, Unsubscribe, Timestamp } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getDistance } from "geolib";
import { useLocalSearchParams, useRouter } from "expo-router";

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
  timestamp?: number;
};

type UserProfile = {
  uid: string;
  role: "user" | "employee" | "admin";
  serviceRadius?: number;
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

export default function MapScreen() {
  const colorScheme = useColorScheme() ?? "light";
  const s = styles(colorScheme);
  const mapRef = useRef<MapView>(null);
  const router = useRouter();

  // --- Navigation from chat/profile modal ---
  const params = useLocalSearchParams();
  const fromLat = params.fromLat ? parseFloat(params.fromLat as string) : null;
  const fromLng = params.fromLng ? parseFloat(params.fromLng as string) : null;
  const toLat = params.toLat ? parseFloat(params.toLat as string) : null;
  const toLng = params.toLng ? parseFloat(params.toLng as string) : null;

  // State
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [sosRequests, setSosRequests] = useState<SOSRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSOS, setSelectedSOS] = useState<SOSRequest | null>(null);
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [filters, setFilters] = useState<{ urgency?: string[]; type?: string[] }>({});
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // Navigation & TTS state
  const [routeCoords, setRouteCoords] = useState<{ latitude: number; longitude: number }[]>([]);
  const [instructions, setInstructions] = useState<string[]>([]);
  const [nearestSafeZone, setNearestSafeZone] = useState<any>(null);
  const [navigating, setNavigating] = useState(false);
  const [ttsPaused, setTtsPaused] = useState(false);
  const [voice, setVoice] = useState<"male" | "female">("female");
  const [currentStep, setCurrentStep] = useState(0);

  // --- Fetch User Location ---
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Location permission is required to use the map.");
        setLoading(false);
        return;
      }
      let location = await Location.getCurrentPositionAsync({});
      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
      setLoading(false);
    })();
  }, []);

  // --- Fetch User Profile (role, etc) ---
  useEffect(() => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) return;
    setUserProfile({
      uid: user.uid,
      role: "user", // You can fetch actual role from Firestore if needed
      serviceRadius: 10,
    });
  }, []);

  // --- Firestore Listener for SOS Requests ---
  useEffect(() => {
    if (!userLocation || !userProfile) return;
    const db = getFirestore();
    let q = collection(db, "sos_requests");

    let unsubscribe: Unsubscribe = onSnapshot(q, (snapshot) => {
      const allSOS: SOSRequest[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        allSOS.push({
          id: doc.id,
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
          timestamp: data.createdAt?.toMillis?.() || Date.now(),
        });
      });

      // --- Filtering by role ---
      // ...existing code...
let filtered: SOSRequest[] = [];
if (userProfile.role === "admin") {
  filtered = allSOS.filter(
    (sos) =>
      typeof sos.latitude === "number" &&
      typeof sos.longitude === "number"
  );
} else if (userProfile.role === "employee") {
  filtered = allSOS.filter((sos) => {
    if (
      typeof sos.latitude !== "number" ||
      typeof sos.longitude !== "number"
    )
      return false;
    const dist = getDistance(
      { latitude: userLocation.latitude, longitude: userLocation.longitude },
      { latitude: sos.latitude, longitude: sos.longitude }
    );
    return dist <= ((userProfile.serviceRadius ?? 10) * 1000);
  });
} else {
  // Regular user: only public and within 10km
  filtered = allSOS.filter(
    (sos) =>
      sos.isPublic &&
      typeof sos.latitude === "number" &&
      typeof sos.longitude === "number" &&
      getDistance(
        { latitude: userLocation.latitude, longitude: userLocation.longitude },
        { latitude: sos.latitude, longitude: sos.longitude }
      ) <= 10000
  );
}
// ...existing code...

      // --- Apply dynamic filters ---
      if (filters.urgency && filters.urgency.length > 0) {
        filtered = filtered.filter((sos) => filters.urgency!.includes(sos.urgency));
      }
      if (filters.type && filters.type.length > 0) {
        filtered = filtered.filter((sos) => filters.type!.includes(sos.emergencyType));
      }

      setSosRequests(filtered);
    });

    return () => unsubscribe();
  }, [userLocation, userProfile, filters]);

  // --- Map Region ---
  const initialRegion: Region =
    toLat && toLng
      ? {
          latitude: toLat,
          longitude: toLng,
          latitudeDelta: 0.02,
          longitudeDelta: 0.01,
        }
      : userLocation
      ? {
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.01,
        }
      : {
          latitude: 37.786,
          longitude: -122.434,
          latitudeDelta: 0.02,
          longitudeDelta: 0.01,
        };

  // --- Pin Color by Urgency ---
  function getPinColor(urgency: string) {
    if (urgency === "High") return "#FF3B30";
    if (urgency === "Medium") return "#FFD60A";
    if (urgency === "Low") return "#10b981";
    return "#888";
  }

  // --- Marker Press ---
  const handleMarkerPress = (sos: SOSRequest) => {
    setSelectedSOS(sos);
    setIsDetailModalVisible(true);
  };

  // --- Respond Action ---
  const handleRespond = (sosId: string) => {
    Alert.alert("Respond", `You are now responding to SOS ID: ${sosId}.`);
    setIsDetailModalVisible(false);
    // Optionally, update Firestore to mark as responded
  };

  // --- Filtering Modal ---
  const applyFilters = (f: any) => {
    setFilters(f);
    setIsFilterModalVisible(false);
  };

  // --- SafeZone Route Data Handler ---
  const handleRouteData = (data: { routeCoords: any[]; instructions: string[]; nearest: any }) => {
    setRouteCoords(data.routeCoords);
    setInstructions(data.instructions);
    setNearestSafeZone(data.nearest);
  };

  // --- Navigation Controls Handlers ---
  const handleStartNavigation = () => {
    if (instructions.length > 0) {
      setNavigating(true);
      setCurrentStep(0);
      setTtsPaused(false);
    }
  };
  const handlePause = () => setTtsPaused((p) => !p);
  const handleSwitchVoice = () => setVoice((v) => (v === "male" ? "female" : "male"));
  const handleStepChange = (step: number) => setCurrentStep(step);

  // --- Center on user location ---
  const centerOnUser = () => {
    if (userLocation && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.01,
      }, 800);
    }
  };

  // --- Go to SOS creation screen ---
  const goToSOSCreation = () => {
    router.push("/(tabs)/sos");
  };

  // --- Render ---
  return (
    <SafeAreaView style={s.safeArea} edges={["top", "left", "right"]}>
      <ThemedView style={s.container}>
        {loading || !userLocation ? (
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
            <ActivityIndicator size="large" color={Colors[colorScheme].tint} />
            <ThemedText>Loading map...</ThemedText>
          </View>
        ) : (
          <>
            <MapView
              ref={mapRef}
              style={StyleSheet.absoluteFill}
              provider={PROVIDER_GOOGLE}
              initialRegion={initialRegion}
              showsUserLocation
              showsMyLocationButton={false}
            >
              {/* SOS Markers */}
              {sosRequests.map((sos) => {
                const dist = getDistance(
                  { latitude: userLocation.latitude, longitude: userLocation.longitude },
                  { latitude: sos.latitude, longitude: sos.longitude }
                );
                return (
                  <Marker
                    key={sos.id}
                    coordinate={{ latitude: sos.latitude, longitude: sos.longitude }}
                    pinColor={getPinColor(sos.urgency)}
                    onPress={() => handleMarkerPress(sos)}
                  >
                    <Callout tooltip={false}>
                      <View style={s.calloutView}>
                        <ThemedText style={s.calloutTitle}>{sos.emergencyType}</ThemedText>
                        <ThemedText style={s.calloutDescription} numberOfLines={1}>
                          {sos.description}
                        </ThemedText>
                        <ThemedText style={{ fontSize: 11, color: "#888" }}>
                          {sos.createdAt?.toDate
                            ? timeAgo(sos.createdAt.toDate())
                            : ""}
                          {"  •  "}
                          {dist > 1000
                            ? `${(dist / 1000).toFixed(1)} km`
                            : `${dist.toFixed(0)} m`}
                        </ThemedText>
                      </View>
                    </Callout>
                  </Marker>
                );
              })}
              {/* Safe Zone Navigation Polyline/Markers */}
              <SafeZoneRoute
                userLocation={userLocation}
                setRouteData={handleRouteData}
                colorScheme={colorScheme}
              />
              {/* --- Chat/Profile Navigation Markers --- */}
              {fromLat && fromLng && (
                <Marker
                  coordinate={{ latitude: fromLat, longitude: fromLng }}
                  pinColor="#10b981"
                  title="Your Location"
                  description="You"
                />
              )}
              {toLat && toLng && (
                <Marker
                  coordinate={{ latitude: toLat, longitude: toLng }}
                  pinColor="#007aff"
                  title="Destination"
                  description="User's Location"
                />
              )}
              {fromLat && fromLng && toLat && toLng && (
                <Polyline
                  coordinates={[
                    { latitude: fromLat, longitude: fromLng },
                    { latitude: toLat, longitude: toLng }
                  ]}
                  strokeColor="#007aff"
                  strokeWidth={4}
                />
              )}
            </MapView>

            {/* Navigation Controls (outside MapView) */}
            <SafeZoneControls
              navigating={navigating}
              ttsPaused={ttsPaused}
              voice={voice}
              instructions={instructions}
              currentStep={currentStep}
              onStart={handleStartNavigation}
              onPause={handlePause}
              onSwitchVoice={handleSwitchVoice}
              onStepChange={handleStepChange}
              canNavigate={!!nearestSafeZone}
              colorScheme={colorScheme}
            />

            {/* Top Bar */}
            <View style={s.topBar}>
              <ThemedText style={s.topBarTitle}>Live Emergency Map</ThemedText>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <ThemedText style={{ marginRight: 12, fontWeight: "bold" }}>
                  {sosRequests.length} Active
                </ThemedText>
                <TouchableOpacity style={s.iconButton} onPress={() => setIsFilterModalVisible(true)} accessibilityLabel="Filter">
                  <IconSymbol
                    name="line.3.horizontal.decrease.circle.fill"
                    size={26}
                    color={Colors[colorScheme].text}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Floating Action Buttons */}
            <TouchableOpacity
              style={[s.fab, { bottom: 100, backgroundColor: "#fff" }]}
              onPress={centerOnUser}
              activeOpacity={0.8}
              accessibilityLabel="Center on my location"
            >
              <IconSymbol name="location.circle.fill" size={32} color="#007AFF" />
            </TouchableOpacity>
            <TouchableOpacity
              style={s.fab}
              onPress={goToSOSCreation}
              activeOpacity={0.8}
              accessibilityLabel="Create SOS"
            >
              <IconSymbol name="plus.circle.fill" size={32} color="#fff" />
            </TouchableOpacity>

            {/* Nearest Safe Zone Info */}
            {nearestSafeZone && (
              <View style={{
                position: "absolute",
                left: 0, right: 0, bottom: 180,
                backgroundColor: Colors[colorScheme].background + "ee",
                marginHorizontal: 24, borderRadius: 12, padding: 12, alignItems: "center", shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 4, elevation: 4
              }}>
                <ThemedText style={{ fontWeight: "bold" }}>Nearest Safe Zone</ThemedText>
                <ThemedText>{nearestSafeZone.name || "Safe Zone"}</ThemedText>
                <ThemedText style={{ fontSize: 12, color: "#888" }}>
                  {nearestSafeZone.distance
                    ? `${(nearestSafeZone.distance / 1000).toFixed(2)} km away`
                    : ""}
                </ThemedText>
              </View>
            )}

            {/* SOS Detail Modal */}
            {selectedSOS && (
              <SOSDetailModal
                isVisible={isDetailModalVisible}
                sosAlert={selectedSOS}
                onClose={() => setIsDetailModalVisible(false)}
                onAccept={() => handleRespond(selectedSOS.id)}
              />
            )}

            {/* Filter Modal */}
            <MapFilterModal
              isVisible={isFilterModalVisible}
              onClose={() => setIsFilterModalVisible(false)}
              onApplyFilters={applyFilters}
              filters={filters}
            />
          </>
        )}
      </ThemedView>
    </SafeAreaView>
  );
}

// --- Styles ---
const styles = (colorScheme: "light" | "dark") =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: Colors[colorScheme].background,
    },
    container: {
      flex: 1,
      backgroundColor: Colors[colorScheme].background,
    },
    topBar: {
      position: "absolute",
      top: Platform.OS === "ios" ? 0 : 0,
      left: 0,
      right: 0,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingVertical: 12,
      backgroundColor: Colors[colorScheme].background + "ee",
      borderBottomLeftRadius: 18,
      borderBottomRightRadius: 18,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 5,
      zIndex: 10,
    },
    topBarTitle: {
      fontSize: 18,
      fontWeight: "bold",
      color: Colors[colorScheme].text,
    },
    iconButton: {
      padding: 6,
      borderRadius: 20,
      backgroundColor: Colors[colorScheme].background + "cc",
    },
    fab: {
      position: "absolute",
      bottom: 32,
      right: 24,
      backgroundColor: "#007AFF",
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 6,
      zIndex: 20,
    },
    calloutView: {
      padding: 8,
      minWidth: 150,
    },
    calloutTitle: {
      fontWeight: "bold",
      fontSize: 16,
      marginBottom: 3,
    },
    calloutDescription: {
      fontSize: 13,
    },
  });