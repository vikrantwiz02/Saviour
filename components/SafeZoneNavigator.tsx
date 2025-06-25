import React, { useEffect, useState, useRef } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Platform, ActivityIndicator } from "react-native";
import MapView, { Polyline, Marker, PROVIDER_GOOGLE, LatLng } from "react-native-maps";
import { getFirestore, collection, getDocs, query, where } from "firebase/firestore";
import * as Location from "expo-location";
import * as Speech from "expo-speech";
import { Colors } from "@/constants/Colors";
import { IconSymbol as Icon } from "@/components/ui/IconSymbol";
import { useColorScheme } from "@/hooks/useColorScheme";
import { decodePolyline } from "@/components/utils/mapUtils";

// --- Types ---
type SafePlace = {
  id: string;
  name: string;
  type: string;
  latitude: number;
  longitude: number;
};

type RouteStep = {
  instruction: string;
  distance: string;
  duration: string;
};

type SafetyAnalysis = {
  safetyScore: number;
  risks: string[];
  recommendations: string[];
};

type UserLocation = {
  latitude: number;
  longitude: number;
};

// --- SafeZoneRoute: draws route and markers, and provides route/instructions to parent ---
export const SafeZoneRoute: React.FC<{
  userLocation: UserLocation | null;
  setRouteData: (data: { routeCoords: LatLng[]; instructions: string[]; nearest: SafePlace | null }) => void;
  colorScheme: "light" | "dark";
}> = ({ userLocation, setRouteData, colorScheme }) => {
  const [safeZones, setSafeZones] = useState<SafePlace[]>([]);
  const [routeCoords, setRouteCoords] = useState<LatLng[]>([]);
  const [instructions, setInstructions] = useState<string[]>([]);
  const [nearest, setNearest] = useState<SafePlace | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch safe zones
  useEffect(() => {
    const fetchSafeZones = async () => {
      const db = getFirestore();
      const q = query(collection(db, "safe_places"), where("verified", "==", true));
      const snapshot = await getDocs(q);
      const zones = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as SafePlace[];
      setSafeZones(zones);
    };
    fetchSafeZones();
  }, []);

  // Find nearest safe zone and route
  useEffect(() => {
    const getRoute = async () => {
      if (!userLocation || safeZones.length === 0) return;
      setLoading(true);
      // Find nearest
      const nearestZone = safeZones
        .map(zone => ({
          ...zone,
          distance: calculateDistance(userLocation, zone),
        }))
        .sort((a, b) => a.distance - b.distance)[0];
      setNearest(nearestZone);

      // Fetch route
      const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${userLocation.latitude},${userLocation.longitude}&destination=${nearestZone.latitude},${nearestZone.longitude}&mode=walking&key=${apiKey}`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.routes?.length > 0) {
        const route = data.routes[0];
        const coords = decodePolyline(route.overview_polyline.points);
        const steps = route.legs[0].steps.map((step: any) =>
          step.html_instructions.replace(/<[^>]+>/g, "")
        );
        setRouteCoords(coords);
        setInstructions(steps);
        setRouteData({ routeCoords: coords, instructions: steps, nearest: nearestZone });
      }
      setLoading(false);
    };
    getRoute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLocation, safeZones]);

  // Helper
  function calculateDistance(point1: { latitude: number; longitude: number }, point2: { latitude: number; longitude: number }) {
    const R = 6371;
    const dLat = (point2.latitude - point1.latitude) * Math.PI / 180;
    const dLon = (point2.longitude - point1.longitude) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(point1.latitude * Math.PI / 180) *
      Math.cos(point2.latitude * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // Render only Polyline and Marker (parent MapView)
  if (!userLocation || !nearest || routeCoords.length === 0) return null;
  return (
    <>
      <Polyline
        coordinates={routeCoords}
        strokeColor={colorScheme === "dark" ? "#00e0ff" : "#007AFF"}
        strokeWidth={6}
      />
      <Marker
        coordinate={{ latitude: nearest.latitude, longitude: nearest.longitude }}
        title={`Safe Zone: ${nearest.name}`}
        pinColor="#10b981"
      />
    </>
  );
};

// --- SafeZoneControls: navigation controls for step-by-step navigation ---
export const SafeZoneControls: React.FC<{
  navigating: boolean;
  ttsPaused: boolean;
  voice: "male" | "female";
  instructions: string[];
  currentStep: number;
  onStart: () => void;
  onPause: () => void;
  onSwitchVoice: () => void;
  onStepChange: (step: number) => void;
  canNavigate: boolean;
  colorScheme: "light" | "dark";
}> = ({
  navigating,
  ttsPaused,
  voice,
  instructions,
  currentStep,
  onStart,
  onPause,
  onSwitchVoice,
  onStepChange,
  canNavigate,
  colorScheme,
}) => {
  if (!canNavigate) return null;
  return (
    <View style={styles.controlsContainer}>
      {!navigating ? (
        <TouchableOpacity
          style={[
            styles.navigateButton,
            { backgroundColor: Colors[colorScheme].tint }
          ]}
          onPress={onStart}
        >
          <Icon name="walk" size={20} color="#fff" />
          <Text style={styles.navigateButtonText}>Navigate to Safety</Text>
        </TouchableOpacity>
      ) : (
        <View style={[
          styles.navigationPanel,
          { backgroundColor: Colors[colorScheme].background }
        ]}>
          <View style={styles.stepHeader}>
            <Text style={[styles.stepText, { color: Colors[colorScheme].text }]}>
              Step {currentStep + 1}/{instructions.length}
            </Text>
            <TouchableOpacity onPress={onPause}>
              <Icon
                name={ttsPaused ? "play" : "pause"}
                size={24}
                color={Colors[colorScheme].text}
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={onSwitchVoice}>
              <Icon
                name={voice === "male" ? "male" : "female"}
                size={24}
                color={Colors[colorScheme].text}
              />
            </TouchableOpacity>
          </View>
          <Text style={[styles.instructionText, { color: Colors[colorScheme].text }]}>
            {instructions[currentStep]}
          </Text>
          <View style={styles.stepControls}>
            <TouchableOpacity
              style={styles.stepButton}
              onPress={() => onStepChange(currentStep - 1)}
              disabled={currentStep === 0}
            >
              <Text style={styles.stepButtonText}>Previous</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.stepButton}
              onPress={() => onStepChange(currentStep + 1)}
              disabled={currentStep >= instructions.length - 1}
            >
              <Text style={styles.stepButtonText}>Next</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

// --- Main SafeZoneNavigator (standalone screen, not used as subcomponent) ---
export const SafeZoneNavigator = () => {
  const colorScheme = useColorScheme() ?? "light";
  const mapRef = useRef<MapView>(null);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [routeCoords, setRouteCoords] = useState<LatLng[]>([]);
  const [instructions, setInstructions] = useState<string[]>([]);
  const [nearestSafeZone, setNearestSafeZone] = useState<SafePlace | null>(null);
  const [navigating, setNavigating] = useState(false);
  const [ttsPaused, setTtsPaused] = useState(false);
  const [voice, setVoice] = useState<"male" | "female">("female");
  const [currentStep, setCurrentStep] = useState(0);

  // Fetch user location
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      const location = await Location.getCurrentPositionAsync({});
      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    })();
  }, []);

  // Handler for SafeZoneRoute
  const handleRouteData = (data: { routeCoords: LatLng[]; instructions: string[]; nearest: SafePlace | null }) => {
    setRouteCoords(data.routeCoords);
    setInstructions(data.instructions);
    setNearestSafeZone(data.nearest);
  };

  // Navigation controls
  const handleStartNavigation = () => {
    if (instructions.length > 0) {
      setNavigating(true);
      setCurrentStep(0);
      setTtsPaused(false);
      speakInstruction(instructions[0]);
    }
  };
  const handlePause = () => {
    setTtsPaused((p) => {
      if (!p) Speech.stop();
      else speakInstruction(instructions[currentStep]);
      return !p;
    });
  };
  const handleSwitchVoice = () => setVoice((v) => (v === "male" ? "female" : "male"));
  const handleStepChange = (step: number) => {
    const newStep = Math.max(0, Math.min(step, instructions.length - 1));
    setCurrentStep(newStep);
    speakInstruction(instructions[newStep]);
  };

  // Voice guidance
  const speakInstruction = (text: string) => {
    Speech.stop();
    Speech.speak(text, {
      voice: voice === "male" ? "com.apple.ttsbundle.Daniel" : "com.apple.ttsbundle.Samantha",
      rate: 0.9,
    });
  };

  return (
    <View style={{ flex: 1 }}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={PROVIDER_GOOGLE}
        showsUserLocation
        initialRegion={userLocation ? {
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        } : undefined}
      >
        <SafeZoneRoute
          userLocation={userLocation}
          setRouteData={handleRouteData}
          colorScheme={colorScheme}
        />
      </MapView>
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
    </View>
  );
};

const styles = StyleSheet.create({
  controlsContainer: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  navigateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 25,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  navigateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  navigationPanel: {
    width: '100%',
    borderRadius: 15,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  stepHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  stepText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  instructionText: {
    fontSize: 14,
    marginBottom: 10,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  warningText: {
    color: '#FF3B30',
    fontSize: 12,
    marginLeft: 5,
  },
  stepControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stepButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  stepButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});