import React, { useEffect, useState } from "react";
import {
  Alert,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";
import { getAuth } from "firebase/auth";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

// Emergency types and icon mapping
type EmergencyType =
  | "Medical Emergency"
  | "Fire Outbreak"
  | "Armed Robbery"
  | "Car Accident"
  | "Domestic Violence"
  | "Natural Disaster"
  | "Missing Person"
  | "Public Disturbance"
  | "Other";

type AlertLevel = "Low" | "Medium" | "High";

const emergencyTypes: EmergencyType[] = [
  "Medical Emergency",
  "Fire Outbreak",
  "Armed Robbery",
  "Car Accident",
  "Domestic Violence",
  "Natural Disaster",
  "Missing Person",
  "Public Disturbance",
  "Other",
];

const alertLevels: AlertLevel[] = ["Low", "Medium", "High"];

const getIconForType = (type: EmergencyType) => {
  switch (type) {
    case "Medical Emergency":
      return "stethoscope";
    case "Fire Outbreak":
      return "flame.fill";
    case "Armed Robbery":
      return "shield.lefthalf.filled";
    case "Car Accident":
      return "car.fill";
    case "Domestic Violence":
      return "person.2.slash.fill";
    case "Natural Disaster":
      return "tornado";
    case "Missing Person":
      return "person.fill.questionmark";
    case "Public Disturbance":
      return "megaphone.fill";
    default:
      return "exclamationmark.triangle.fill";
  }
};

// EmergencyTypePicker component
const EmergencyTypePicker: React.FC<{
  selectedType: EmergencyType | null;
  onSelect: (type: EmergencyType) => void;
}> = ({ selectedType, onSelect }) => {
  const colorScheme = useColorScheme() ?? "light";
  const s = emergencyTypePickerStyles(colorScheme);

  return (
    <View style={s.container}>
      <ThemedText style={s.label}>Emergency Type:</ThemedText>
      <View style={s.optionsGrid}>
        {emergencyTypes.map((type) => (
          <TouchableOpacity
            key={type}
            style={[
              s.optionButton,
              selectedType === type && s.selectedOption,
            ]}
            onPress={() => onSelect(type)}
          >
            <IconSymbol
              name={getIconForType(type)}
              size={20}
              color={selectedType === type ? "#fff" : Colors[colorScheme].text}
            />
            <ThemedText
              style={[
                s.optionText,
                selectedType === type && s.selectedOptionText,
              ]}
              numberOfLines={2}
            >
              {type}
            </ThemedText>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

// AlertLevelPicker component
const AlertLevelPicker: React.FC<{
  selectedLevel: AlertLevel | null;
  onSelect: (level: AlertLevel) => void;
}> = ({ selectedLevel, onSelect }) => {
  const colorScheme = useColorScheme() ?? "light";
  const s = alertLevelPickerStyles(colorScheme);

  return (
    <View style={s.container}>
      <ThemedText style={s.label}>Alert Level:</ThemedText>
      <View style={s.optionsRow}>
        {alertLevels.map((level) => (
          <TouchableOpacity
            key={level}
            style={[
              s.optionButton,
              selectedLevel === level && s.selectedOption,
              selectedLevel === level && level === "Low" && s.lowOption,
              selectedLevel === level && level === "Medium" && s.mediumOption,
              selectedLevel === level && level === "High" && s.highOption,
            ]}
            onPress={() => onSelect(level)}
          >
            <ThemedText
              style={[
                s.optionText,
                selectedLevel === level && s.selectedOptionText,
              ]}
            >
              {level}
            </ThemedText>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

function normalizeCity(city: string | null): string | null {
  return city ? city.trim().toLowerCase() : null;
}

export default function SOSScreen() {
  const [selectedEmergencyType, setSelectedEmergencyType] = useState<EmergencyType | null>(null);
  const [selectedAlertLevel, setSelectedAlertLevel] = useState<AlertLevel>("High");
  const [description, setDescription] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageDownloadUrl, setImageDownloadUrl] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [city, setCity] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [sosSent, setSosSent] = useState(false);
  const [canCancel, setCanCancel] = useState(false);
  const [cancelCountdown, setCancelCountdown] = useState(5);
  const [locationSubscription, setLocationSubscription] = useState<Location.LocationSubscription | null>(null);

  const colorScheme = useColorScheme() ?? "light";
  const s = styles(colorScheme);

  // Live location updates and city extraction
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Location permission is required to send SOS.");
        return;
      }
      const sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 2000, distanceInterval: 2 },
        async (location) => {
          setUserLocation({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          });
          // Reverse geocode to get city
          try {
            const geo = await Location.reverseGeocodeAsync({
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            });
            if (geo && geo[0] && geo[0].city) setCity(geo[0].city);
            else setCity(null);
          } catch (e) {
            setCity(null);
          }
        }
      );
      setLocationSubscription(sub);
    })();
    return () => {
      if (locationSubscription) locationSubscription.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Countdown timer for cancellation
  useEffect(() => {
    let timerId: ReturnType<typeof setTimeout> | undefined;
    if (sosSent && canCancel) {
      if (cancelCountdown > 0) {
        timerId = setTimeout(() => setCancelCountdown(cancelCountdown - 1), 1000);
      } else {
        setCanCancel(false);
        Alert.alert("SOS Confirmed", "Your SOS alert has been fully dispatched.");
      }
    }
    return () => {
      if (timerId) clearTimeout(timerId);
    };
  }, [sosSent, canCancel, cancelCountdown]);

  // Image picker and upload to Firebase Storage
  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Denied", "Camera roll permissions are required.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 1,
    });

    if (!result.canceled && result.assets?.[0]?.uri) {
      setImageUri(result.assets[0].uri);
      setImageDownloadUrl(null);
    }
  };

  // Upload image to Firebase Storage and get download URL
  const uploadImageAsync = async (uri: string, userId: string) => {
    setImageUploading(true);
    try {
      const uploadUri = Platform.OS === 'android' ? uri : uri.replace('file://', '');
      const response = await fetch(uploadUri);
      if (!response.ok) throw new Error(`Fetch failed with status ${response.status}`);
      const blob = await response.blob();
      const storage = getStorage();
      const filename = `sos_images/${userId}_${Date.now()}.jpg`;
      const storageRef = ref(storage, filename);
      await uploadBytes(storageRef, blob);
      const downloadUrl = await getDownloadURL(storageRef);
      return downloadUrl;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      Alert.alert("Upload Error", errorMessage);
      return null;
    } finally {
      setImageUploading(false);
    }
  };

  const handleSendSOS = async () => {
    if (!selectedEmergencyType) {
      Alert.alert("Missing Information", "Please select an emergency type.");
      return;
    }
    if (!userLocation) {
      Alert.alert("Location Error", "Could not fetch your location.");
      return;
    }
    if (!city) {
      Alert.alert("Location Error", "Could not determine your city. Please try again.");
      return;
    }
    setIsSending(true);
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) {
        Alert.alert("Not logged in", "You must be logged in to send SOS.");
        setIsSending(false);
        return;
      }
      let imageUrl = null;
      if (imageUri) {
        imageUrl = await uploadImageAsync(imageUri, user.uid);
        if (!imageUrl) {
          setIsSending(false);
          return;
        }
      }
      await addDoc(collection(db, "sos_requests"), {
        userId: user.uid,
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        city: normalizeCity(city),
        emergencyType: selectedEmergencyType,
        alertLevel: selectedAlertLevel,
        description,
        createdAt: serverTimestamp(),
        isPublic: true,
        senderName: user.displayName || user.email || "Unknown",
        senderContact: user.phoneNumber || "",
        imageUrl: imageUrl || null,
      });
      setSosSent(true);
      setCanCancel(true);
      setCancelCountdown(5);
    } catch (e) {
      Alert.alert("Error", "Failed to send SOS. Please try again.");
    }
    setIsSending(false);
  };

  const handleCancelSOS = () => {
    setSosSent(false);
    setCanCancel(false);
    setSelectedEmergencyType(null);
    setSelectedAlertLevel("High");
    setDescription("");
    setImageUri(null);
    setImageDownloadUrl(null);
    Alert.alert("SOS Cancelled", "Your SOS alert has been cancelled.");
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors[colorScheme].background }}>
      <ThemedView style={s.container}>
        {sosSent ? (
          <View style={s.confirmationContainer}>
            <IconSymbol name="checkmark.circle.fill" size={80} color={Colors.light.tint} />
            <ThemedText style={s.confirmationTitle}>SOS Sent!</ThemedText>
            <ThemedText style={s.confirmationMessage}>
              Help is on the way. Your location and emergency details have been dispatched.
            </ThemedText>
            {canCancel && (
              <View style={s.cancelContainer}>
                <TouchableOpacity style={s.cancelButton} onPress={handleCancelSOS}>
                  <ThemedText style={s.cancelButtonText}>Cancel Alert ({cancelCountdown}s)</ThemedText>
                </TouchableOpacity>
                <ThemedText style={s.cancelNote}>You can cancel within the next few seconds.</ThemedText>
              </View>
            )}
            {!canCancel && (
              <TouchableOpacity style={s.actionButton} onPress={() => setSosSent(false)}>
                <ThemedText style={s.actionButtonText}>Back to SOS Form</ThemedText>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <ScrollView contentContainerStyle={s.scrollContentContainer} keyboardShouldPersistTaps="handled">
            <ThemedText style={s.headerTitle}>Initiate SOS Alert</ThemedText>

            {/* Emergency Type Picker with icons and grid */}
            <EmergencyTypePicker
              selectedType={selectedEmergencyType}
              onSelect={setSelectedEmergencyType}
            />

            {/* Alert Level Picker */}
            <AlertLevelPicker
              selectedLevel={selectedAlertLevel}
              onSelect={setSelectedAlertLevel}
            />

            <ThemedText style={s.sectionTitle}>3. Optional Description</ThemedText>
            <TextInput
              style={s.descriptionInput}
              placeholder="e.g., Person unconscious, heavy smoke..."
              placeholderTextColor={Colors[colorScheme].textMuted}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
            />

            <ThemedText style={s.sectionTitle}>4. Add Image (Optional)</ThemedText>
            <TouchableOpacity style={s.imagePickerButton} onPress={handlePickImage}>
              <IconSymbol name="camera.fill" size={24} color={Colors[colorScheme].tint} />
              <ThemedText style={s.imagePickerButtonText}>{imageUri ? "Change Image" : "Select Image"}</ThemedText>
            </TouchableOpacity>
            {imageUri && (
              <View style={s.imagePreviewContainer}>
                <Image source={{ uri: imageUri }} style={s.imagePreview} />
                {imageUploading && <ActivityIndicator size="small" color={Colors[colorScheme].tint} style={{ marginTop: 8 }} />}
                <TouchableOpacity onPress={() => { setImageUri(null); setImageDownloadUrl(null); }} style={s.removeImageButton}>
                  <IconSymbol name="xmark.circle.fill" size={20} color={Colors.dark.text} />
                </TouchableOpacity>
              </View>
            )}

            <ThemedText style={s.sectionTitle}>5. Your Live Location</ThemedText>
            <View style={s.locationContainer}>
              <IconSymbol name="location.fill" size={20} color={Colors[colorScheme].icon} />
              <ThemedText style={s.locationText}>
                {userLocation
                  ? `Lat: ${userLocation.latitude.toFixed(6)}, Lon: ${userLocation.longitude.toFixed(6)}`
                  : "Fetching location..."}
              </ThemedText>
            </View>
            {city && (
              <ThemedText style={[s.locationText, { marginTop: 6 }]}>
                City: {city}
              </ThemedText>
            )}

            <TouchableOpacity style={s.sendButton} onPress={handleSendSOS} disabled={isSending || imageUploading}>
              {isSending ? (
                <ActivityIndicator size="small" color={Colors.dark.text} />
              ) : (
                <ThemedText style={s.sendButtonText}>SEND SOS NOW</ThemedText>
              )}
            </TouchableOpacity>
          </ScrollView>
        )}
      </ThemedView>
    </SafeAreaView>
  );
}

// Styles for EmergencyTypePicker
const emergencyTypePickerStyles = (colorScheme: "light" | "dark") =>
  StyleSheet.create({
    container: {
      marginBottom: 20,
    },
    label: {
      fontSize: 16,
      marginBottom: 8,
      color: Colors[colorScheme].textMuted,
    },
    optionsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
    },
    optionButton: {
      width: "30%",
      padding: 10,
      marginBottom: 10,
      borderRadius: 8,
      alignItems: "center",
      borderWidth: 1,
      borderColor: Colors[colorScheme].border,
    },
    selectedOption: {
      backgroundColor: "#7C3AED", // Purple color
      borderColor: "#7C3AED",
    },
    optionText: {
      marginTop: 6,
      fontSize: 12,
      textAlign: "center",
      color: Colors[colorScheme].text,
    },
    selectedOptionText: {
      color: "#fff",
    },
  });

// Styles for AlertLevelPicker
const alertLevelPickerStyles = (colorScheme: "light" | "dark") =>
  StyleSheet.create({
    container: {
      marginBottom: 20,
    },
    label: {
      fontSize: 16,
      marginBottom: 8,
      color: Colors[colorScheme].textMuted,
    },
    optionsRow: {
      flexDirection: "row",
      justifyContent: "space-between",
    },
    optionButton: {
      flex: 1,
      padding: 12,
      marginHorizontal: 4,
      borderRadius: 8,
      alignItems: "center",
      borderWidth: 1,
      borderColor: Colors[colorScheme].border,
      backgroundColor: Colors[colorScheme].inputBackground,
    },
    selectedOption: {
      borderWidth: 2,
    },
    lowOption: {
      backgroundColor: "#10B981", // Green
      borderColor: "#10B981",
    },
    mediumOption: {
      backgroundColor: "#F59E0B", // Orange
      borderColor: "#F59E0B",
    },
    highOption: {
      backgroundColor: "#EF4444", // Red
      borderColor: "#EF4444",
    },
    optionText: {
      fontSize: 14,
      fontWeight: "500",
      color: Colors[colorScheme].text,
    },
    selectedOptionText: {
      color: "#fff",
      fontWeight: "bold",
    },
  });

// Main styles
const styles = (colorScheme: "light" | "dark" = "light") =>
  StyleSheet.create({
    container: {
      flex: 1,
      paddingTop: Platform.OS === "android" ? 25 : 0,
    },
    scrollContentContainer: {
      padding: 20,
      paddingBottom: 50,
    },
    headerTitle: {
      fontSize: 26,
      fontWeight: "bold",
      textAlign: "center",
      marginBottom: 25,
      color: "#7C3AED", // Purple color
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "600",
      marginTop: 20,
      marginBottom: 10,
      color: Colors[colorScheme].text,
    },
    descriptionInput: {
      backgroundColor: Colors[colorScheme].inputBackground,
      borderColor: Colors[colorScheme].border,
      borderWidth: 1,
      borderRadius: 8,
      padding: 15,
      fontSize: 16,
      color: Colors[colorScheme].text,
      minHeight: 100,
      textAlignVertical: "top",
    },
    imagePickerButton: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: Colors[colorScheme].inputBackground,
      padding: 15,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: Colors[colorScheme].border,
      justifyContent: "center",
    },
    imagePickerButtonText: {
      marginLeft: 10,
      fontSize: 16,
      color: "#7C3AED", // Purple color
      fontWeight: "500",
    },
    imagePreviewContainer: {
      marginTop: 10,
      alignItems: "center",
      position: "relative",
    },
    imagePreview: {
      width: 150,
      height: 150,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: Colors[colorScheme].border,
    },
    removeImageButton: {
      position: "absolute",
      top: 5,
      right: 5,
      backgroundColor: "rgba(0,0,0,0.5)",
      borderRadius: 15,
      padding: 2,
    },
    locationContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: Colors[colorScheme].inputBackground,
      padding: 15,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: Colors[colorScheme].border,
    },
    locationText: {
      marginLeft: 10,
      fontSize: 16,
      color: Colors[colorScheme].textMuted,
      flex: 1,
    },
    sendButton: {
      backgroundColor: "#7C3AED", // Purple color
      paddingVertical: 18,
      borderRadius: 8,
      alignItems: "center",
      marginTop: 30,
      shadowColor: "#7C3AED",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 6,
    },
    sendButtonText: {
      color: "#FFFFFF",
      fontSize: 18,
      fontWeight: "bold",
    },
    confirmationContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 20,
      backgroundColor: Colors[colorScheme].background,
    },
    confirmationTitle: {
      fontSize: 28,
      fontWeight: "bold",
      marginTop: 20,
      marginBottom: 10,
      textAlign: "center",
      color: "#7C3AED", // Purple color
    },
    confirmationMessage: {
      fontSize: 16,
      textAlign: "center",
      marginBottom: 30,
      color: Colors[colorScheme].textMuted,
      paddingHorizontal: 10,
    },
    cancelContainer: {
      alignItems: "center",
    },
    cancelButton: {
      backgroundColor: Colors[colorScheme].inputBackground,
      paddingVertical: 15,
      paddingHorizontal: 30,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: Colors[colorScheme].border,
    },
    cancelButtonText: {
      color: "#7C3AED", // Purple color
      fontSize: 16,
      fontWeight: "600",
    },
    cancelNote: {
      fontSize: 13,
      color: Colors[colorScheme].textMuted,
      marginTop: 10,
    },
    actionButton: {
      backgroundColor: "#7C3AED", // Purple color
      paddingVertical: 15,
      paddingHorizontal: 40,
      borderRadius: 8,
      marginTop: 20,
    },
    actionButtonText: {
      color: "#FFFFFF",
      fontSize: 16,
      fontWeight: "bold",
    },
  });