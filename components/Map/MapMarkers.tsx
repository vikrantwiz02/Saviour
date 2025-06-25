import React from "react";
import { Callout, Marker } from "react-native-maps";
import { ThemedText } from "@/components/ThemedText";
import { View, StyleSheet } from "react-native";
import { SOSRequest } from "./types";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";

interface MapMarkersProps {
  sosRequests: SOSRequest[];
  onMarkerPress: (sos: SOSRequest) => void;
  userLocation?: { latitude: number; longitude: number };
  fromLocation?: { latitude: number; longitude: number };
  toLocation?: { latitude: number; longitude: number };
}

export const MapMarkers: React.FC<MapMarkersProps> = ({
  sosRequests,
  onMarkerPress,
  userLocation,
  fromLocation,
  toLocation,
}) => {
  const colorScheme = useColorScheme() ?? "light";
  const s = styles(colorScheme);

  const getPinColor = (urgency: string) => {
    if (urgency === "High") return "#FF3B30";
    if (urgency === "Medium") return "#FFD60A";
    if (urgency === "Low") return "#10b981";
    return "#888";
  };

  return (
    <>
      {/* User Location Marker */}
      {userLocation && (
        <Marker
          coordinate={userLocation}
          pinColor="#007AFF"
          title="Your Location"
          description="Current position"
        />
      )}

      {/* From/To Location Markers (for navigation) */}
      {fromLocation && (
        <Marker
          coordinate={fromLocation}
          pinColor="#10b981"
          title="Starting Point"
        />
      )}
      {toLocation && (
        <Marker
          coordinate={toLocation}
          pinColor="#FF3B30"
          title="Destination"
        />
      )}

      {/* SOS Markers */}
      {sosRequests.map((sos) => (
        <Marker
          key={sos.id}
          coordinate={{
            latitude: sos.location.latitude,
            longitude: sos.location.longitude,
          }}
          pinColor={getPinColor(sos.urgency)}
          onPress={() => onMarkerPress(sos)}
        >
          <Callout tooltip={false}>
            <View style={s.calloutView}>
              <ThemedText style={s.calloutTitle}>{sos.emergencyType}</ThemedText>
              <ThemedText style={s.calloutDescription} numberOfLines={1}>
                {sos.description}
              </ThemedText>
              <ThemedText style={{ fontSize: 11, color: "#888" }}>
                {sos.createdAt?.toDate
                  ? sos.createdAt.toDate().toLocaleString()
                  : ""}
              </ThemedText>
            </View>
          </Callout>
        </Marker>
      ))}
    </>
  );
};

const styles = (colorScheme: "light" | "dark") =>
  StyleSheet.create({
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