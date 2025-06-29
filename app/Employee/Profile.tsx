import { useEffect, useState } from "react";
import {
  Alert,
  Animated,
  Easing,
  Dimensions,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import {
  getAuth,
  signOut,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  onAuthStateChanged,
  User,
} from "firebase/auth";
import {
  doc,
  getDoc,
  updateDoc,
  setDoc,
  collection,
  addDoc,
} from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db } from "../../lib/firebase";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";

const { width } = Dimensions.get("window");
const isTablet = width >= 768;

type ModalInputProps = {
  visible: boolean;
  title: string;
  placeholder?: string;
  secureTextEntry?: boolean;
  onCancel: () => void;
  onSubmit: (value: string) => void;
  theme: "light" | "dark";
};

const EMERGENCY_TYPES = ["Medical", "Fire", "Police", "Other"];

function ModalInput({
  visible,
  title,
  placeholder,
  secureTextEntry,
  onCancel,
  onSubmit,
  theme,
}: ModalInputProps) {
  const [value, setValue] = useState("");
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(300))[0];

  useEffect(() => {
    setValue("");
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          easing: Easing.out(Easing.back(1.2)),
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 300,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const backgroundColor = theme === "dark" ? Colors.dark.card : Colors.light.background;
  const textColor = theme === "dark" ? Colors.dark.text : Colors.light.text;
  const borderColor = theme === "dark" ? Colors.dark.border : Colors.light.border;
  const buttonColor = theme === "dark" ? Colors.dark.tint : Colors.light.tint;

  return (
    <Modal visible={visible} transparent animationType="none">
      <Animated.View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: `rgba(0,0,0,${theme === "dark" ? 0.7 : 0.5})`,
          opacity: fadeAnim,
        }}
      >
        <Animated.View
          style={{
            backgroundColor,
            padding: 20,
            borderRadius: 14,
            width: "85%",
            transform: [{ translateY: slideAnim }],
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: theme === "dark" ? 0.3 : 0.1,
            shadowRadius: 10,
            elevation: 5,
            borderWidth: theme === "dark" ? 1 : 0,
            borderColor,
          }}
        >
          <ThemedText
            style={{
              fontWeight: "bold",
              fontSize: 18,
              marginBottom: 16,
              color: textColor,
            }}
          >
            {title}
          </ThemedText>
          <TextInput
            placeholder={placeholder}
            placeholderTextColor={
              theme === "dark" ? Colors.dark.textMuted : Colors.light.textMuted
            }
            value={value}
            onChangeText={setValue}
            secureTextEntry={secureTextEntry}
            style={{
              borderWidth: 1,
              borderColor,
              borderRadius: 10,
              padding: 14,
              marginBottom: 20,
              fontSize: 16,
              color: textColor,
              backgroundColor: theme === "dark" ? Colors.dark.card : Colors.light.inputBackground,
            }}
            autoFocus
          />
          <View
            style={{
              flexDirection: "row",
              justifyContent: "flex-end",
              gap: 16,
            }}
          >
            <Pressable
              onPress={onCancel}
              style={({ pressed }) => ({
                opacity: pressed ? 0.6 : 1,
                paddingHorizontal: 16,
                paddingVertical: 8,
              })}
            >
              <ThemedText
                style={{
                  color:
                    theme === "dark" ? Colors.dark.textMuted : Colors.light.textMuted,
                  fontWeight: "600",
                  fontSize: 16,
                }}
              >
                Cancel
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={() => {
                onSubmit(value);
                setValue("");
              }}
              style={({ pressed }) => ({
                opacity: pressed ? 0.6 : 1,
                paddingHorizontal: 16,
                paddingVertical: 8,
              })}
            >
              <ThemedText
                style={{
                  color: buttonColor,
                  fontWeight: "bold",
                  fontSize: 16,
                }}
              >
                OK
              </ThemedText>
            </Pressable>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

export default function ProfileScreen() {
  const colorScheme = useColorScheme() ?? "light";
  const theme = colorScheme;
  const s = styles(theme);
  const router = useRouter();
  const auth = getAuth();

  // Animation values
  const profileImageScale = useState(new Animated.Value(1))[0];
  const buttonScale = useState(new Animated.Value(1))[0];
  const chipScale = useState(new Animated.Value(1))[0];

  // Auth state
  const [user, setUser] = useState<User | null>(auth.currentUser);
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (!firebaseUser) {
        router.replace("/(auth)/login");
      }
    });
    return unsubscribe;
  }, []);

  // Profile state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [onDuty, setOnDuty] = useState(false);
  const [notificationRadius, setNotificationRadius] = useState("3");
  const [preferredTypes, setPreferredTypes] = useState<string[]>([]);
  const [shift, setShift] = useState("");
  const [verified, setVerified] = useState(false);
  const [emergenciesHandled, setEmergenciesHandled] = useState(0);
  const [avgResponse, setAvgResponse] = useState("0m 0s");
  const [contribution, setContribution] = useState(0);

  // Modal state
  const [modal, setModal] = useState<
    null | "changePasswordOld" | "changePasswordNew" | "reportAbuse"
  >(null);
  const [modalCallback, setModalCallback] = useState<(value: string) => void>(
    () => () => {}
  );
  const [tempPassword, setTempPassword] = useState("");

  // Current city state
  const [currentCity, setCurrentCity] = useState<string | null>(null);
  const [cityLoading, setCityLoading] = useState(true);

  // Photo upload state
  const [photoUploading, setPhotoUploading] = useState(false);

  // Fetch user profile (employeeId = user.uid)
  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data() || {};
          // Check for employee role
          if (data.role !== "employee") {
            Alert.alert("Access Denied", "You are not an employee.");
            router.replace("/(auth)/login");
            return;
          }
          setName(data.fullName || "");
          setPhone(data.phone || "");
          setPhoto(data.photoUrl || null);
          setOnDuty(data.onDuty || false);
          setNotificationRadius(data.notificationRadius?.toString() || "3");
          setPreferredTypes(data.preferredTypes || []);
          setShift(data.shift || "");
          setVerified(data.verified || false);
          setEmergenciesHandled(data.emergenciesHandled || 0);
          setAvgResponse(data.avgResponse || "0m 0s");
          setContribution(data.contribution || 0);
        }
      } catch (e) {
        Alert.alert("Error", "Failed to fetch profile data.");
      }
      setLoading(false);
    };
    fetchProfile();
  }, [user]);

  // Fetch current city
  useEffect(() => {
    const fetchCurrentCity = async () => {
      setCityLoading(true);
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setCurrentCity(null);
          setCityLoading(false);
          return;
        }
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        const geo = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
        if (geo && geo[0] && geo[0].city) setCurrentCity(geo[0].city);
        else setCurrentCity(null);
      } catch (e) {
        setCurrentCity(null);
      }
      setCityLoading(false);
    };
    fetchCurrentCity();
  }, []);

  // Save all profile fields to Firestore (employeeId = user.uid)
  const saveProfile = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await setDoc(
        doc(db, "users", user.uid),
        {
          fullName: name,
          phone,
          photoUrl: photo,
          onDuty,
          notificationRadius: parseInt(notificationRadius) || 3,
          preferredTypes,
          shift,
          verified,
          emergenciesHandled,
          avgResponse,
          contribution,
          role: "employee",
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      Alert.alert("Profile Updated", "Your employee profile has been updated.");
    } catch (e) {
      Alert.alert("Error", "Failed to update profile.");
    }
    setSaving(false);
  };

  // Pick and upload profile photo with animation, save photoUrl in Firestore
  const pickImage = async () => {
    Animated.sequence([
      Animated.timing(profileImageScale, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(profileImageScale, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Denied", "Camera roll permissions are required.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets.length > 0) {
      const uri = result.assets[0].uri;
      setPhotoUploading(true);
      try {
        const storage = getStorage();
        const ext = uri.split(".").pop() || "jpg";
        const refPath = `employee_photos/${user?.uid}.${ext}`;
        const storageRef = ref(storage, refPath);
        const response = await fetch(uri);
        const blob = await response.blob();
        await uploadBytes(storageRef, blob);
        const downloadUrl = await getDownloadURL(storageRef);
        setPhoto(downloadUrl);
        await updateDoc(doc(db, "users", user!.uid), {
          photoUrl: downloadUrl,
        });
      } catch (e) {
        Alert.alert("Upload Error", "Failed to upload photo.");
      }
      setPhotoUploading(false);
    }
  };

  // Toggle duty status and save to Firestore
  const handleToggleDuty = async (value: boolean) => {
    Animated.spring(buttonScale, {
      toValue: 0.9,
      friction: 3,
      useNativeDriver: true,
    }).start(() => {
      Animated.spring(buttonScale, {
        toValue: 1,
        friction: 3,
        useNativeDriver: true,
      }).start();
    });

    setOnDuty(value);
    if (user) {
      await updateDoc(doc(db, "users", user.uid), { onDuty: value });
    }
  };

  // Toggle preferred emergency type (local only, saved on Save)
  const toggleType = (type: string) => {
    Animated.sequence([
      Animated.timing(chipScale, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(chipScale, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    setPreferredTypes((prev) =>
      prev.includes(type)
        ? prev.filter((t) => t !== type)
        : [...prev, type]
    );
  };

  // Change password
  const handleChangePassword = () => {
    setModalCallback(() => async (oldPassword: string) => {
      setModal(null);
      if (!oldPassword) return;
      setTempPassword(oldPassword);
      setTimeout(() => {
        setModalCallback(() => async (newPassword: string) => {
          setModal(null);
          if (!newPassword) return;
          try {
            if (!user?.email) throw new Error("No email found");
            const credential = EmailAuthProvider.credential(
              user.email,
              oldPassword
            );
            await reauthenticateWithCredential(user, credential);
            await updatePassword(user, newPassword);
            Alert.alert("Success", "Password changed successfully.");
          } catch (e: any) {
            Alert.alert("Error", e.message || "Failed to change password.");
          }
        });
        setModal("changePasswordNew");
      }, 300);
    });
    setModal("changePasswordOld");
  };

  // Logout with confirmation
  const handleLogout = async () => {
    Alert.alert(
      "Confirm Logout",
      "Are you sure you want to log out?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Log Out",
          style: "destructive",
          onPress: async () => {
            try {
              await signOut(auth);
            } catch (e) {
              Alert.alert("Logout Failed", "Could not log out. Try again.");
            }
          },
        },
      ]
    );
  };

  // Report abuse, save to abuse_reports with employeeId
  const handleReportAbuse = () => {
    setModalCallback(() => async (desc: string) => {
      setModal(null);
      if (!desc) return;
      try {
        await addDoc(collection(db, "abuse_reports"), {
          userId: user?.uid,
          description: desc,
          createdAt: new Date().toISOString(),
          userType: "employee",
        });
        Alert.alert(
          "Reported",
          "Thank you for reporting. We'll review your report."
        );
      } catch (e) {
        Alert.alert("Error", "Failed to submit report.");
      }
    });
    setModal("reportAbuse");
  };

  if (!user || loading) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={Colors[theme].tint} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right"]}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        <ThemedView style={s.container}>
          <ThemedText style={s.headerTitle}>Profile</ThemedText>
          {/* Current City */}
          <View style={s.cityContainer}>
            <Ionicons
              name="location"
              size={18}
              color={Colors[theme].tint}
              style={{ marginRight: 6 }}
            />
            <ThemedText style={s.cityText}>
              {cityLoading
                ? "Detecting your current city..."
                : currentCity
                ? currentCity
                : "Location not available"}
            </ThemedText>
          </View>

          {/* Profile Photo & Badge */}
          <View style={s.photoRow}>
            <Animated.View style={{ transform: [{ scale: profileImageScale }] }}>
              <TouchableOpacity
                style={s.photoContainer}
                onPress={pickImage}
                activeOpacity={0.7}
              >
                {photo ? (
                  <Image
                    source={{ uri: photo }}
                    style={s.photo}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={s.photoPlaceholder}>
                    <Ionicons
                      name="person"
                      size={isTablet ? 48 : 40}
                      color={Colors[theme].textMuted}
                    />
                    <ThemedText style={s.photoEditText}>Edit</ThemedText>
                  </View>
                )}
                {photoUploading && (
                  <View style={s.uploadOverlay}>
                    <ActivityIndicator
                      size="small"
                      color={Colors[theme].background}
                    />
                  </View>
                )}
                <View style={s.photoEditBadge}>
                  <Ionicons
                    name="camera"
                    size={16}
                    color={Colors[theme].background}
                  />
                </View>
              </TouchableOpacity>
            </Animated.View>

            <View style={s.badgeCol}>
              {verified && (
                <View style={s.verifiedBadge}>
                  <MaterialCommunityIcons
                    name="shield-check"
                    size={22}
                    color="#22c55e"
                  />
                  <ThemedText style={s.verifiedText}>
                    Verified Employee
                  </ThemedText>
                </View>
              )}
              <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                <View style={s.dutyRow}>
                  <ThemedText
                    style={[
                      s.dutyText,
                      { color: onDuty ? "#22c55e" : "#ef4444" },
                    ]}
                  >
                    {onDuty ? "On Duty" : "Off Duty"}
                  </ThemedText>
                  <Switch
                    value={onDuty}
                    onValueChange={handleToggleDuty}
                    thumbColor={onDuty ? "#22c55e" : Colors[theme].switchThumb}
                    trackColor={{
                      false: Colors[theme].switchTrack,
                      true: "#22c55e55",
                    }}
                  />
                </View>
              </Animated.View>
            </View>
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={[s.saveButton, saving && s.saveButtonDisabled]}
            onPress={saveProfile}
            disabled={saving}
            activeOpacity={0.7}
          >
            <Ionicons
              name="save"
              size={20}
              color={Colors[theme].background}
              style={{ marginRight: 8 }}
            />
            <ThemedText style={s.saveButtonText}>
              {saving ? "Saving..." : "Save Changes"}
            </ThemedText>
          </TouchableOpacity>

          {/* Profile Fields */}
          <View style={s.section}>
            <ThemedText style={s.sectionTitle}>Employee Information</ThemedText>

            <View style={s.inputGroup}>
              <ThemedText style={s.label}>Full Name</ThemedText>
              <TextInput
                style={s.input}
                value={name}
                onChangeText={setName}
                placeholder="Your name"
                placeholderTextColor={Colors[theme].textMuted}
              />
            </View>

            <View style={s.inputGroup}>
              <ThemedText style={s.label}>Contact Number</ThemedText>
              <TextInput
                style={s.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="Phone number"
                keyboardType="phone-pad"
                placeholderTextColor={Colors[theme].textMuted}
              />
            </View>
          </View>

          {/* Preferences Section */}
          <View style={s.section}>
            <ThemedText style={s.sectionTitle}>Response Preferences</ThemedText>

            <View style={s.inputGroup}>
              <ThemedText style={s.label}>Notification Radius (km)</ThemedText>
              <TextInput
                style={s.input}
                value={notificationRadius}
                onChangeText={setNotificationRadius}
                placeholder="Radius in kilometers"
                keyboardType="numeric"
                placeholderTextColor={Colors[theme].textMuted}
              />
            </View>

            <View style={s.inputGroup}>
              <ThemedText style={s.label}>Preferred Emergency Types</ThemedText>
              <View style={s.typeRow}>
                {EMERGENCY_TYPES.map((type) => (
                  <Animated.View
                    key={type}
                    style={{ transform: [{ scale: chipScale }] }}
                  >
                    <TouchableOpacity
                      style={[
                        s.typeChip,
                        preferredTypes.includes(type) && s.typeChipActive,
                      ]}
                      onPress={() => toggleType(type)}
                    >
                      <ThemedText
                        style={[
                          s.typeChipText,
                          preferredTypes.includes(type) && s.typeChipTextActive,
                        ]}
                      >
                        {type}
                      </ThemedText>
                    </TouchableOpacity>
                  </Animated.View>
                ))}
              </View>
            </View>

            <View style={s.inputGroup}>
              <ThemedText style={s.label}>Shift Schedule</ThemedText>
              <TextInput
                style={s.input}
                value={shift}
                onChangeText={setShift}
                placeholder="e.g. 08:00 - 16:00"
                placeholderTextColor={Colors[theme].textMuted}
              />
            </View>
          </View>

          {/* Impact Metrics */}
          <View style={s.section}>
            <ThemedText style={s.sectionTitle}>Response Metrics</ThemedText>

            <View style={s.metricsRow}>
              <View style={s.metricCard}>
                <Ionicons name="checkmark-circle" size={22} color="#22c55e" />
                <ThemedText style={s.metricValue}>
                  {emergenciesHandled}
                </ThemedText>
                <ThemedText style={s.metricLabel}>Handled</ThemedText>
              </View>

              <View style={s.metricCard}>
                <Ionicons name="timer" size={22} color="#3b82f6" />
                <ThemedText style={s.metricValue}>{avgResponse}</ThemedText>
                <ThemedText style={s.metricLabel}>Avg. Response</ThemedText>
              </View>
            </View>

            <View style={s.progressBarRow}>
              <ThemedText style={s.progressLabel}>
                Community Contribution
              </ThemedText>
              <View style={s.progressBarBg}>
                <View
                  style={[
                    s.progressBarFill,
                    { width: `${contribution}%` },
                  ]}
                />
              </View>
              <ThemedText style={s.progressValue}>{contribution}%</ThemedText>
            </View>
          </View>

          {/* Security Section */}
          <View style={s.section}>
            <ThemedText style={s.sectionTitle}>Account</ThemedText>

            <TouchableOpacity
              style={s.securityButton}
              onPress={handleChangePassword}
              activeOpacity={0.7}
            >
              <Ionicons
                name="key"
                size={20}
                color={Colors[theme].tint}
                style={{ marginRight: 12 }}
              />
              <ThemedText style={s.securityButtonText}>
                Change Password
              </ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={s.securityButton}
              onPress={handleReportAbuse}
              activeOpacity={0.7}
            >
              <Ionicons
                name="alert-circle"
                size={20}
                color="#EC407A"
                style={{ marginRight: 12 }}
              />
              <ThemedText
                style={[s.securityButtonText, { color: "#EC407A" }]}
              >
                Report Abuse
              </ThemedText>
            </TouchableOpacity>
          </View>

          {/* Logout Button */}
          <TouchableOpacity
            style={s.logoutButton}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <Ionicons
              name="log-out"
              size={20}
              color="#EF5350"
              style={{ marginRight: 8 }}
            />
            <ThemedText style={s.logoutButtonText}>Log Out</ThemedText>
          </TouchableOpacity>
        </ThemedView>

        {/* Modals */}
        <ModalInput
          visible={modal === "changePasswordOld"}
          title="Enter Current Password"
          placeholder="Current Password"
          secureTextEntry
          onCancel={() => setModal(null)}
          onSubmit={modalCallback}
          theme={theme}
        />
        <ModalInput
          visible={modal === "changePasswordNew"}
          title="Enter New Password"
          placeholder="New Password"
          secureTextEntry
          onCancel={() => setModal(null)}
          onSubmit={modalCallback}
          theme={theme}
        />
        <ModalInput
          visible={modal === "reportAbuse"}
          title="Report Abuse"
          placeholder="Describe the issue"
          onCancel={() => setModal(null)}
          onSubmit={modalCallback}
          theme={theme}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = (theme: "light" | "dark") =>
  StyleSheet.create({
    headerTitle: {
      fontSize: 22,
      fontWeight: "bold",
      color: Colors[theme].tint,
      textAlign: "center",
      marginTop: 18,
      marginBottom: 10,
    },
    container: {
      flex: 1,
      padding: isTablet ? 24 : 16,
      paddingBottom: 30,
    },
    cityContainer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      padding: 12,
      borderRadius: 20,
      backgroundColor:
        theme === "dark" ? Colors.dark.card : Colors.light.inputBackground,
      marginBottom: 24,
      alignSelf: "center",
    },
    cityText: {
      fontSize: 15,
      fontWeight: "500",
      color: Colors[theme].tint,
    },
    photoRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 18,
      gap: 18,
    },
    photoContainer: {
      width: isTablet ? 110 : 80,
      height: isTablet ? 110 : 80,
      borderRadius: isTablet ? 55 : 40,
      backgroundColor:
        theme === "dark" ? Colors.dark.card : Colors.light.inputBackground,
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 2,
      borderColor: Colors[theme].tint + "33",
      overflow: "hidden",
    },
    photo: {
      width: "100%",
      height: "100%",
    },
    photoPlaceholder: {
      alignItems: "center",
      justifyContent: "center",
    },
    photoEditText: {
      fontSize: 13,
      color: Colors[theme].tint,
      marginTop: 6,
      fontWeight: "500",
    },
    photoEditBadge: {
      position: "absolute",
      bottom: 6,
      right: 6,
      backgroundColor: Colors[theme].tint,
      width: 26,
      height: 26,
      borderRadius: 13,
      justifyContent: "center",
      alignItems: "center",
    },
    uploadOverlay: {
      position: "absolute",
      width: "100%",
      height: "100%",
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "center",
      alignItems: "center",
    },
    badgeCol: {
      flex: 1,
      alignItems: "flex-start",
      gap: 10,
    },
    verifiedBadge: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme === "dark" ? "#1a2e22" : "#d1fae5",
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 6,
      marginBottom: 4,
      marginTop: 2,
    },
    verifiedText: {
      color: "#22c55e",
      fontWeight: "bold",
      marginLeft: 6,
      fontSize: 14,
    },
    dutyRow: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor:
        theme === "dark" ? Colors.dark.card : Colors.light.inputBackground,
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 6,
      marginTop: 4,
    },
    dutyText: {
      fontWeight: "bold",
      marginRight: 8,
      fontSize: 14,
    },
    saveButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: Colors[theme].tint,
      paddingVertical: 14,
      paddingHorizontal: 20,
      borderRadius: 10,
      marginBottom: 24,
      shadowColor: Colors[theme].tint,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 4,
    },
    saveButtonDisabled: {
      opacity: 0.7,
    },
    saveButtonText: {
      color: Colors[theme].background,
      fontWeight: "600",
      fontSize: 16,
    },
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "600",
      marginBottom: 16,
      color: Colors[theme].tint,
    },
    inputGroup: {
      marginBottom: 16,
    },
    label: {
      fontSize: 15,
      fontWeight: "500",
      marginBottom: 6,
      color: Colors[theme].text,
    },
    input: {
      borderWidth: 1,
      borderColor: Colors[theme].border,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      color: Colors[theme].text,
      backgroundColor:
        theme === "dark" ? Colors.dark.card : Colors.light.inputBackground,
    },
    typeRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginTop: 8,
    },
    typeChip: {
      backgroundColor:
        theme === "dark" ? Colors.dark.card : Colors.light.inputBackground,
      borderRadius: 16,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderWidth: 1,
      borderColor: Colors[theme].border,
    },
    typeChipActive: {
      backgroundColor: Colors[theme].tint,
      borderColor: Colors[theme].tint,
    },
    typeChipText: {
      fontSize: 14,
      color: Colors[theme].text,
    },
    typeChipTextActive: {
      color: "#fff",
    },
    metricsRow: {
      flexDirection: "row",
      gap: 16,
      marginBottom: 16,
    },
    metricCard: {
      alignItems: "center",
      backgroundColor:
        theme === "dark" ? Colors.dark.card : Colors.light.inputBackground,
      borderRadius: 10,
      padding: 16,
      flex: 1,
    },
    metricValue: {
      fontSize: 18,
      fontWeight: "bold",
      color: Colors[theme].tint,
      marginTop: 8,
    },
    metricLabel: {
      fontSize: 13,
      color: Colors[theme].textMuted,
      marginTop: 4,
      fontWeight: "500",
      textAlign: "center",
    },
    progressBarRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 8,
      gap: 8,
    },
    progressLabel: {
      fontSize: 13,
      color: Colors[theme].textMuted,
      flex: 1,
    },
    progressBarBg: {
      flex: 3,
      height: 8,
      backgroundColor:
        theme === "dark" ? Colors.dark.border : Colors.light.border,
      borderRadius: 4,
      overflow: "hidden",
      marginHorizontal: 6,
    },
    progressBarFill: {
      height: 8,
      backgroundColor: "#22c55e",
      borderRadius: 4,
    },
    progressValue: {
      fontSize: 13,
      color: "#22c55e",
      fontWeight: "bold",
      minWidth: 36,
      textAlign: "right",
    },
    securityButton: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderRadius: 10,
      backgroundColor:
        theme === "dark" ? Colors.dark.card : Colors.light.inputBackground,
      marginBottom: 10,
    },
    securityButtonText: {
      fontSize: 15,
      fontWeight: "500",
    },
    logoutButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      padding: 16,
      borderRadius: 10,
      backgroundColor: theme === "dark" ? "#2D1C1C" : "#FFEBEE",
      marginTop: 16,
    },
    logoutButtonText: {
      color: "#EF5350",
      fontWeight: "600",
      fontSize: 16,
    },
  });