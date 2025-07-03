import { useEffect, useState } from "react";
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Modal,
  Pressable,
  Animated,
  Easing,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { getAuth, signOut, updatePassword, EmailAuthProvider, reauthenticateWithCredential, onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db } from "../../lib/firebase";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";

type ModalInputProps = {
  visible: boolean;
  title: string;
  placeholder?: string;
  secureTextEntry?: boolean;
  onCancel: () => void;
  onSubmit: (value: string) => void;
  theme: "light" | "dark";
};

function ModalInput({ visible, title, placeholder, secureTextEntry, onCancel, onSubmit, theme }: ModalInputProps) {
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

  const backgroundColor = theme === "dark" ? Colors.dark.inputBackground : Colors.light.background;
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
            placeholderTextColor={theme === "dark" ? Colors.dark.textMuted : Colors.light.textMuted}
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
                  color: theme === "dark" ? Colors.dark.textMuted : Colors.light.textMuted,
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

export default function AdminProfileScreen() {
  const colorScheme = useColorScheme() ?? "light";
  const theme = colorScheme;
  const s = styles(theme);
  const router = useRouter();
  const auth = getAuth();

  // Animation values
  const profileImageScale = useState(new Animated.Value(1))[0];
  const buttonScale = useState(new Animated.Value(1))[0];

  // Listen for auth state changes
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
  const [contact, setContact] = useState("");
  const [email, setEmail] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);

  // Modal state
  const [modal, setModal] = useState<null | "changePasswordOld" | "changePasswordNew">(null);
  const [modalCallback, setModalCallback] = useState<(value: string) => void>(() => () => {});
  const [tempPassword, setTempPassword] = useState("");

  // Fetch admin profile
  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data() || {};
          setName(data.fullName || data.name || "");
          setContact(data.contact || "");
          setEmail(data.email || user.email || "");
          setPhoto(data.photoUrl || null);
        }
      } catch (e) {
        Alert.alert("Error", "Failed to fetch admin profile.");
      }
      setLoading(false);
    };
    fetchProfile();
  }, [user]);

  // Save profile changes
  const saveProfile = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "users", user.uid), {
        fullName: name,
        contact,
        photoUrl: photo,
      });
      Alert.alert("Profile Updated", "Your profile has been updated.");
    } catch (e) {
      Alert.alert("Error", "Failed to update profile.");
    }
    setSaving(false);
  };

  // Pick and upload profile photo with animation
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
        const refPath = `profile_photos/${user?.uid}.${ext}`;
        const storageRef = ref(storage, refPath);
        const response = await fetch(uri);
        const blob = await response.blob();
        await uploadBytes(storageRef, blob);
        const downloadUrl = await getDownloadURL(storageRef);
        setPhoto(downloadUrl);
        await updateDoc(doc(db, "users", user!.uid), { photoUrl: downloadUrl });
      } catch (e) {
        Alert.alert("Upload Error", "Failed to upload photo.");
      }
      setPhotoUploading(false);
    }
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
            const credential = EmailAuthProvider.credential(user.email, oldPassword);
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
    Alert.alert("Confirm Logout", "Are you sure you want to log out?", [
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
    ]);
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
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <ThemedView style={s.container}>
          <ThemedText style={s.headerTitle}>Admin Profile</ThemedText>

          {/* Profile Photo */}
          <Animated.View style={{ transform: [{ scale: profileImageScale }] }}>
            <TouchableOpacity style={s.photoContainer} onPress={pickImage} activeOpacity={0.7}>
              {photo ? (
                <Image source={{ uri: photo }} style={s.photo} resizeMode="cover" />
              ) : (
                <View style={s.photoPlaceholder}>
                  <Ionicons name="person" size={48} color={Colors[theme].textMuted} />
                  <ThemedText style={s.photoEditText}>Edit</ThemedText>
                </View>
              )}
              {photoUploading && (
                <View style={s.uploadOverlay}>
                  <ActivityIndicator size="small" color={Colors[theme].background} />
                </View>
              )}
              <View style={s.photoEditBadge}>
                <Ionicons name="camera" size={16} color={Colors[theme].background} />
              </View>
            </TouchableOpacity>
          </Animated.View>

          {/* Save Button */}
          <TouchableOpacity
            style={[s.saveButton, saving && s.saveButtonDisabled]}
            onPress={saveProfile}
            disabled={saving}
            activeOpacity={0.7}
          >
            <Ionicons name="save" size={20} color={Colors[theme].background} style={{ marginRight: 8 }} />
            <ThemedText style={s.saveButtonText}>{saving ? "Saving..." : "Save Changes"}</ThemedText>
          </TouchableOpacity>

          {/* Profile Fields */}
          <View style={s.section}>
            <ThemedText style={s.sectionTitle}>Admin Information</ThemedText>
            <View style={s.inputGroup}>
              <ThemedText style={s.label}>Full Name</ThemedText>
              <TextInput
                style={s.input}
                value={name}
                onChangeText={setName}
                placeholder="Admin name"
                placeholderTextColor={Colors[theme].textMuted}
              />
            </View>
            <View style={s.inputGroup}>
              <ThemedText style={s.label}>Contact Number</ThemedText>
              <TextInput
                style={s.input}
                value={contact}
                onChangeText={setContact}
                placeholder="Phone number"
                keyboardType="phone-pad"
                placeholderTextColor={Colors[theme].textMuted}
              />
            </View>
            <View style={s.inputGroup}>
              <ThemedText style={s.label}>Email</ThemedText>
              <TextInput
                style={[s.input, { backgroundColor: Colors[theme].inputBackground }]}
                value={email}
                editable={false}
                selectTextOnFocus={false}
                placeholderTextColor={Colors[theme].textMuted}
              />
            </View>
          </View>

          {/* Security Section */}
          <View style={s.section}>
            <ThemedText style={s.sectionTitle}>Security</ThemedText>
            <TouchableOpacity style={s.securityButton} onPress={handleChangePassword} activeOpacity={0.7}>
              <Ionicons name="key" size={20} color={Colors[theme].tint} style={{ marginRight: 12 }} />
              <ThemedText style={s.securityButtonText}>Change Password</ThemedText>
            </TouchableOpacity>
          </View>

          {/* Logout Button */}
          <TouchableOpacity style={s.logoutButton} onPress={handleLogout} activeOpacity={0.7}>
            <Ionicons name="log-out" size={20} color="#EF5350" style={{ marginRight: 8 }} />
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
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = (theme: "light" | "dark") =>
  StyleSheet.create({
    container: {
      flex: 1,
      padding: 20,
      paddingBottom: 30,
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: "bold",
      color: Colors[theme].tint,
      marginBottom: 18,
      textAlign: "center",
    },
    photoContainer: {
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: theme === "dark" ? Colors.dark.card : Colors.light.inputBackground,
      alignSelf: "center",
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 20,
      borderWidth: 3,
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
      fontSize: 14,
      color: Colors[theme].tint,
      marginTop: 6,
      fontWeight: "500",
    },
    photoEditBadge: {
      position: "absolute",
      bottom: 8,
      right: 8,
      backgroundColor: Colors[theme].tint,
      width: 28,
      height: 28,
      borderRadius: 14,
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
    saveButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: Colors[theme].tint,
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 10,
      marginBottom: 24,
      alignSelf: "center",
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
      backgroundColor: theme === "dark" ? Colors.dark.card : Colors.light.inputBackground,
    },
    securityButton: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderRadius: 10,
      backgroundColor: theme === "dark" ? Colors.dark.card : Colors.light.inputBackground,
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