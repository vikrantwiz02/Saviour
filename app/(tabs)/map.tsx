"use client"

import MapFilterModal from "@/components/MapFilterModal"
import SOSDetailModal from "@/components/SOSDetailModal"
import { ThemedText } from "@/components/ThemedText"
import { ThemedView } from "@/components/ThemedView"
import { IconSymbol } from "@/components/ui/IconSymbol"
import { Colors } from "@/constants/Colors"
import { useColorScheme } from "@/hooks/useColorScheme"
import { useRef, useState } from "react"
import { Alert, Platform, StyleSheet, TouchableOpacity, View } from "react-native"
import MapView, { Callout, Marker, PROVIDER_GOOGLE } from "react-native-maps"
import { SafeAreaView } from "react-native-safe-area-context"

// Mock data for SOS alerts
const MOCK_SOS_ALERTS = [
  {
    id: "1",
    coordinate: { latitude: 37.787, longitude: -122.435 },
    emergencyType: "Fire",
    description: "Fire in building",
    urgency: "High",
  },
  {
    id: "2",
    coordinate: { latitude: 37.785, longitude: -122.433 },
    emergencyType: "Medical",
    description: "Person fainted",
    urgency: "Medium",
  },
]

// Mock data for responders
const MOCK_RESPONDERS = [
  {
    id: "r1",
    coordinate: { latitude: 37.7865, longitude: -122.4345 },
    name: "Responder 1",
    type: "Ambulance",
    status: "Available",
  },
  {
    id: "r2",
    coordinate: { latitude: 37.7855, longitude: -122.4325 },
    name: "Responder 2",
    type: "Fire Truck",
    status: "Busy",
  },
]

// ...existing code...

export default function MapScreen() {
  const colorScheme = useColorScheme() ?? "light"
  const s = styles(colorScheme)
  const mapRef = useRef<MapView>(null)

  const [sosAlerts, setSosAlerts] = useState(MOCK_SOS_ALERTS)
  const [responders, setResponders] = useState(MOCK_RESPONDERS)
  const [selectedSOS, setSelectedSOS] = useState<any>(null)
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false)
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false)

  const userLocation = { latitude: 37.786, longitude: -122.434 }

  const initialRegion = {
    latitude: userLocation.latitude,
    longitude: userLocation.longitude,
    latitudeDelta: 0.02,
    longitudeDelta: 0.01,
  }

  const handleMarkerPress = (sosAlert: any) => {
    setSelectedSOS(sosAlert)
    setIsDetailModalVisible(true)
  }

  const handleAcceptSOS = (sosId: string) => {
    Alert.alert("SOS Accepted", `You are now responding to SOS ID: ${sosId}. (UI Only)`)
    setIsDetailModalVisible(false)
  }

  const applyFilters = (filters: any) => {
    setIsFilterModalVisible(false)
  }

    function getPinColor(
        type: string,
        isResponder: boolean = false,
        status?: string
    ): string | undefined {
        if (isResponder) {
            // Color for responders based on type and status
            if (status === "Busy") return "#b0b0b0" // Gray for busy
            if (type === "Ambulance") return "#007AFF" // Blue
            if (type === "Fire Truck") return "#FF3B30" // Red
            if (type === "Police") return "#34C759" // Green
            return "#8E8E93" // Default responder color
        }
        // Color for SOS alerts based on emergency type
        if (type === "Fire") return "#FF3B30" // Red
        if (type === "Medical") return "#FF9500" // Orange
        if (type === "Crime") return "#5856D6" // Purple
        return "#FFD60A" // Default (yellow)
    }

  return (
    <SafeAreaView style={s.safeArea} edges={["top", "left", "right"]}>
      <ThemedView style={s.container}>
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          provider={PROVIDER_GOOGLE}
          initialRegion={initialRegion}
          showsUserLocation
          showsMyLocationButton={false}
        >
          {sosAlerts.map((alert) => (
            <Marker
              key={alert.id}
              coordinate={alert.coordinate}
              pinColor={getPinColor(alert.emergencyType)}
              onPress={() => handleMarkerPress(alert)}
            >
              {alert.urgency === "High" && <View style={s.animatedBadge} />}
              <Callout tooltip={false}>
                <View style={s.calloutView}>
                  <ThemedText style={s.calloutTitle}>{alert.emergencyType}</ThemedText>
                  <ThemedText style={s.calloutDescription} numberOfLines={1}>
                    {alert.description || "Tap for details"}
                  </ThemedText>
                </View>
              </Callout>
            </Marker>
          ))}
          {responders.map((responder) => (
            <Marker
              key={responder.id}
              coordinate={responder.coordinate}
              pinColor={getPinColor(responder.type, true, responder.status)}
              opacity={responder.status === "Busy" ? 0.6 : 1}
            >
              <Callout>
                <View style={s.calloutView}>
                  <ThemedText style={s.calloutTitle}>
                    {responder.name} ({responder.type})
                  </ThemedText>
                  <ThemedText>Status: {responder.status}</ThemedText>
                </View>
              </Callout>
            </Marker>
          ))}
        </MapView>

        {/* Sleek Top Bar */}
        <View style={s.topBar}>
          <ThemedText style={s.topBarTitle}>Live Emergency Map</ThemedText>
          <TouchableOpacity style={s.iconButton} onPress={() => setIsFilterModalVisible(true)}>
            <IconSymbol name="line.3.horizontal.decrease.circle.fill" size={26} color={Colors[colorScheme].text} />
          </TouchableOpacity>
        </View>

        {/* Floating Action Button */}
        <TouchableOpacity
          style={s.fab}
          onPress={() => mapRef.current?.animateToRegion(initialRegion, 1000)}
          activeOpacity={0.8}
        >
          <IconSymbol name="location.circle.fill" size={32} color="#fff" />
        </TouchableOpacity>

        {/* Bottom Sheet for SOS Details */}
        {selectedSOS && (
          <SOSDetailModal
            isVisible={isDetailModalVisible}
            sosAlert={selectedSOS}
            onClose={() => setIsDetailModalVisible(false)}
            onAccept={handleAcceptSOS}
          />
        )}

        <MapFilterModal
          isVisible={isFilterModalVisible}
          onClose={() => setIsFilterModalVisible(false)}
          onApplyFilters={applyFilters}
        />
      </ThemedView>
    </SafeAreaView>
  )
}

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
    animatedBadge: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: "red",
      position: "absolute",
      top: -1,
      right: -1,
      borderWidth: 1,
      borderColor: "white",
    },
  })