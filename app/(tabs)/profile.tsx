import { useEffect, useState } from "react"
import { Alert, Image, Platform, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View, ActivityIndicator, Modal, Pressable } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useRouter } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import * as ImagePicker from "expo-image-picker"
import * as Location from "expo-location"
import { getAuth, signOut, updatePassword, EmailAuthProvider, reauthenticateWithCredential, onAuthStateChanged, User } from "firebase/auth"
import { doc, getDoc, updateDoc, collection, query, where, getDocs, addDoc } from "firebase/firestore"
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { db } from "../../lib/firebase"
import { Colors } from "@/constants/Colors"
import { useColorScheme } from "@/hooks/useColorScheme"
import { ThemedText } from "@/components/ThemedText"
import { ThemedView } from "@/components/ThemedView"

type HelpHistoryItem = {
  id: string
  latitude?: number
  longitude?: number
  emergencyType?: string
  createdAt?: any
  description?: string
  [key: string]: any
}

type ModalInputProps = {
  visible: boolean
  title: string
  placeholder?: string
  secureTextEntry?: boolean
  onCancel: () => void
  onSubmit: (value: string) => void
}

function ModalInput({ visible, title, placeholder, secureTextEntry, onCancel, onSubmit }: ModalInputProps) {
  const [value, setValue] = useState("")
  useEffect(() => { setValue("") }, [visible])
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={{
        flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0008"
      }}>
        <View style={{
          backgroundColor: "#fff", padding: 20, borderRadius: 10, width: "85%"
        }}>
          <Text style={{ fontWeight: "bold", fontSize: 18, marginBottom: 10 }}>{title}</Text>
          <TextInput
            placeholder={placeholder}
            value={value}
            onChangeText={setValue}
            secureTextEntry={secureTextEntry}
            style={{
              borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 10, marginBottom: 15
            }}
            autoFocus
          />
          <View style={{ flexDirection: "row", justifyContent: "flex-end" }}>
            <Pressable onPress={onCancel} style={{ marginRight: 20 }}>
              <Text style={{ color: "#888", fontWeight: "bold" }}>Cancel</Text>
            </Pressable>
            <Pressable onPress={() => { onSubmit(value); setValue(""); }}>
              <Text style={{ color: "#007aff", fontWeight: "bold" }}>OK</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  )
}

export default function ProfileScreen() {
  const colorScheme = useColorScheme() ?? "light"
  const s = styles(colorScheme)
  const router = useRouter()
  const auth = getAuth()

  // Listen for auth state changes to prevent access after logout
  const [user, setUser] = useState<User | null>(auth.currentUser)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser)
      if (!firebaseUser) {
        router.replace("/(auth)/login")
      }
    })
    return unsubscribe
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Profile state
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState("")
  const [contact, setContact] = useState("")
  const [medical, setMedical] = useState("")
  const [notifications, setNotifications] = useState(true)
  const [photo, setPhoto] = useState<string | null>(null)
  const [photoUploading, setPhotoUploading] = useState(false)
  const [blockedUsers, setBlockedUsers] = useState<string[]>([])
  const [helpHistory, setHelpHistory] = useState<HelpHistoryItem[]>([])

  // Modal state
  const [modal, setModal] = useState<null | "changePasswordOld" | "changePasswordNew" | "blockUser" | "reportAbuse" | "unblockUser">(null)
  const [modalCallback, setModalCallback] = useState<(value: string) => void>(() => () => {})
  const [tempPassword, setTempPassword] = useState("")

  // Current city state
  const [currentCity, setCurrentCity] = useState<string | null>(null)
  const [cityLoading, setCityLoading] = useState(true)

  // Fetch user profile and help history
  useEffect(() => {
    if (!user) return
    const fetchProfile = async () => {
      setLoading(true)
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid))
        if (userDoc.exists()) {
          const data = userDoc.data() || {}
          setName(data.fullName || "")
          setContact(data.contact || "")
          setMedical(data.medical || "")
          setNotifications(data.notifications ?? true)
          setPhoto(data.photoUrl || null)
          setBlockedUsers(data.blockedUsers || [])
        }
        // Fetch help history (SOS requests by this user)
        const q = query(collection(db, "sos_requests"), where("userId", "==", user.uid))
        const snap = await getDocs(q)
        setHelpHistory(
          snap.docs
            .map(doc => {
              const data = doc.data() || {}
              return { ...data, id: doc.id } as HelpHistoryItem
            })
        )
      } catch (e) {
        Alert.alert("Error", "Failed to fetch profile or SOS requests.")
      }
      setLoading(false)
    }
    fetchProfile()
  }, [user])

  // Fetch current city using live location
  useEffect(() => {
    const fetchCurrentCity = async () => {
      setCityLoading(true)
      try {
        let { status } = await Location.requestForegroundPermissionsAsync()
        if (status !== "granted") {
          setCurrentCity(null)
          setCityLoading(false)
          return
        }
        const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High })
        const geo = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        })
        if (geo && geo[0] && geo[0].city) setCurrentCity(geo[0].city)
        else setCurrentCity(null)
      } catch (e) {
        setCurrentCity(null)
      }
      setCityLoading(false)
    }
    fetchCurrentCity()
  }, [])

  // Save profile changes to Firestore
  const saveProfile = async () => {
    if (!user) return
    setSaving(true)
    try {
      await updateDoc(doc(db, "users", user.uid), {
        fullName: name,
        contact,
        medical,
        notifications,
        photoUrl: photo,
        blockedUsers,
      })
      Alert.alert("Profile Updated", "Your profile has been updated.")
    } catch (e) {
      Alert.alert("Error", "Failed to update profile.")
    }
    setSaving(false)
  }

  // Pick and upload profile photo
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== "granted") {
      Alert.alert("Permission Denied", "Camera roll permissions are required.")
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 1,
    })
    if (!result.canceled && result.assets.length > 0) {
      const uri = result.assets[0].uri
      setPhotoUploading(true)
      try {
        // Upload to Firebase Storage
        const storage = getStorage()
        const ext = uri.split(".").pop() || "jpg"
        const refPath = `profile_photos/${user?.uid}.${ext}`
        const storageRef = ref(storage, refPath)
        const response = await fetch(uri)
        const blob = await response.blob()
        await uploadBytes(storageRef, blob)
        const downloadUrl = await getDownloadURL(storageRef)
        setPhoto(downloadUrl)
        await updateDoc(doc(db, "users", user!.uid), { photoUrl: downloadUrl })
      } catch (e) {
        Alert.alert("Upload Error", "Failed to upload photo.")
      }
      setPhotoUploading(false)
    }
  }

  // Toggle notifications and persist
  const handleToggleNotifications = async (value: boolean) => {
    setNotifications(value)
    if (user) {
      await updateDoc(doc(db, "users", user.uid), { notifications: value })
    }
  }

  // Change password (with modal input)
  const handleChangePassword = () => {
    setModalCallback(() => async (oldPassword: string) => {
      setModal(null)
      if (!oldPassword) return
      setTempPassword(oldPassword)
      setTimeout(() => {
        setModalCallback(() => async (newPassword: string) => {
          setModal(null)
          if (!newPassword) return
          try {
            if (!user?.email) throw new Error("No email found")
            const credential = EmailAuthProvider.credential(user.email, oldPassword)
            await reauthenticateWithCredential(user, credential)
            await updatePassword(user, newPassword)
            Alert.alert("Success", "Password changed successfully.")
          } catch (e: any) {
            Alert.alert("Error", e.message || "Failed to change password.")
          }
        })
        setModal("changePasswordNew")
      }, 300)
    })
    setModal("changePasswordOld")
  }

  // Logout
  const handleLogout = async () => {
    try {
      await signOut(auth)
      // onAuthStateChanged will handle redirect
    } catch (e) {
      Alert.alert("Logout Failed", "Could not log out. Try again.")
    }
  }

  // Blocked users management (add/remove)
  const handleManageBlocked = () => {
    Alert.alert(
      "Blocked Users",
      "What do you want to do?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Block User", onPress: () => {
          setModalCallback(() => async (email: string) => {
            setModal(null)
            if (!email) return
            if (blockedUsers.includes(email)) {
              Alert.alert("Already Blocked", "This user is already blocked.")
              return
            }
            const updated = [...blockedUsers, email]
            setBlockedUsers(updated)
            if (user) await updateDoc(doc(db, "users", user.uid), { blockedUsers: updated })
            Alert.alert("Blocked", `${email} has been blocked.`)
          })
          setModal("blockUser")
        }},
        { text: "Unblock User", onPress: () => {
          setModalCallback(() => async (email: string) => {
            setModal(null)
            if (!email) return
            if (!blockedUsers.includes(email)) {
              Alert.alert("Not Blocked", "This user is not blocked.")
              return
            }
            const updated = blockedUsers.filter(u => u !== email)
            setBlockedUsers(updated)
            if (user) await updateDoc(doc(db, "users", user.uid), { blockedUsers: updated })
            Alert.alert("Unblocked", `${email} has been unblocked.`)
          })
          setModal("unblockUser")
        }},
      ]
    )
  }

  // Report abuse (with modal input)
  const handleReportAbuse = () => {
    setModalCallback(() => async (desc: string) => {
      setModal(null)
      if (!desc) return
      try {
        await addDoc(collection(db, "abuse_reports"), {
          userId: user?.uid,
          description: desc,
          createdAt: new Date().toISOString(),
        })
        Alert.alert("Reported", "Thank you for reporting. We'll review your report.")
      } catch (e) {
        Alert.alert("Error", "Failed to submit report.")
      }
    })
    setModal("reportAbuse")
  }

  if (!user || loading) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={Colors[colorScheme].tint} />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <ThemedView style={s.container}>
          {/* Current City */}
          <View style={{ alignItems: "center", marginBottom: 12 }}>
            <ThemedText style={{ fontSize: 16, color: Colors[colorScheme].tint }}>
              {cityLoading
                ? "Detecting your current city..."
                : currentCity
                  ? `Current City: ${currentCity}`
                  : "Current city not available"}
            </ThemedText>
          </View>

          {/* Profile Photo */}
          <TouchableOpacity style={s.photoContainer} onPress={pickImage} activeOpacity={0.7}>
            {photo ? (
              <Image source={{ uri: photo }} style={s.photo} />
            ) : (
              <View style={s.photoPlaceholder}>
                <Ionicons name="person-circle" size={80} color={Colors[colorScheme].icon} />
                <ThemedText style={s.photoEditText}>Edit</ThemedText>
              </View>
            )}
            {photoUploading && <ActivityIndicator size="small" color={Colors[colorScheme].tint} style={{ marginTop: 8 }} />}
          </TouchableOpacity>

          {/* Settings & Notifications Buttons */}
          <View style={s.topButtonsRow}>
            <TouchableOpacity
              style={s.iconBtn}
              onPress={saveProfile}
              accessibilityRole="button"
              accessibilityLabel="Save Profile"
              disabled={saving}
            >
              <Ionicons name="save" size={22} color={Colors[colorScheme].tint} />
              <Text style={s.iconBtnText}>{saving ? "Saving..." : "Save"}</Text>
            </TouchableOpacity>
          </View>

          {/* Editable Fields */}
          <View style={s.inputGroup}>
            <ThemedText style={s.label}>Name</ThemedText>
            <TextInput
              style={s.input}
              value={name}
              onChangeText={setName}
              placeholder="Your Name"
              placeholderTextColor={Colors[colorScheme].textMuted}
            />
          </View>
          <View style={s.inputGroup}>
            <ThemedText style={s.label}>Contact</ThemedText>
            <TextInput
              style={s.input}
              value={contact}
              onChangeText={setContact}
              placeholder="Contact Number"
              keyboardType="phone-pad"
              placeholderTextColor={Colors[colorScheme].textMuted}
            />
          </View>
          <View style={s.inputGroup}>
            <ThemedText style={s.label}>Medical Info (optional)</ThemedText>
            <TextInput
              style={s.input}
              value={medical}
              onChangeText={setMedical}
              placeholder="Allergies, blood group, etc."
              placeholderTextColor={Colors[colorScheme].textMuted}
            />
          </View>

          {/* Notification Toggle */}
          <View style={s.switchRow}>
            <ThemedText style={s.label}>Notifications</ThemedText>
            <Switch
              value={notifications}
              onValueChange={handleToggleNotifications}
              thumbColor={notifications ? Colors[colorScheme].tint : "#ccc"}
              trackColor={{ false: "#ccc", true: Colors[colorScheme].tint + "55" }}
            />
          </View>

          {/* Security & Privacy */}
          <View style={s.securityRow}>
            <TouchableOpacity style={s.securityBtn} onPress={handleChangePassword}>
              <Ionicons name="key" size={20} color={Colors[colorScheme].tint} />
              <ThemedText style={s.securityText}>Change Password</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity style={s.securityBtn} onPress={handleLogout}>
              <Ionicons name="log-out" size={20} color="#f44336" />
              <ThemedText style={[s.securityText, { color: "#f44336" }]}>Logout</ThemedText>
            </TouchableOpacity>
          </View>
          <View style={s.securityRow}>
            <TouchableOpacity style={s.securityBtn} onPress={handleManageBlocked}>
              <Ionicons name="ban" size={20} color="#ff9800" />
              <ThemedText style={[s.securityText, { color: "#ff9800" }]}>Blocked Users</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity style={s.securityBtn} onPress={handleReportAbuse}>
              <Ionicons name="alert-circle" size={20} color="#e91e63" />
              <ThemedText style={[s.securityText, { color: "#e91e63" }]}>Report Abuse</ThemedText>
            </TouchableOpacity>
          </View>

          {/* Stats & Help History */}
          <View style={{ marginTop: 20 }}>
            <ThemedText style={s.label}>Help History</ThemedText>
            {helpHistory.length === 0 ? (
              <ThemedText style={{ color: Colors[colorScheme].textMuted }}>No SOS requests yet.</ThemedText>
            ) : (
              helpHistory.map((item) => (
                <View key={item.id} style={{ marginBottom: 10, padding: 10, backgroundColor: Colors[colorScheme].inputBackground, borderRadius: 8 }}>
                  <ThemedText style={{ fontWeight: "bold" }}>{item.emergencyType || "Unknown"}</ThemedText>
                  <ThemedText>
                    Date: {item.createdAt?.toDate ? item.createdAt.toDate().toLocaleString() : (item.createdAt || "N/A")}
                  </ThemedText>
                  <ThemedText>Description: {item.description || "N/A"}</ThemedText>
                  <ThemedText>
                    Location: {typeof item.latitude === "number" && typeof item.longitude === "number"
                      ? `${item.latitude}, ${item.longitude}`
                      : "N/A"}
                  </ThemedText>
                </View>
              ))
            )}
          </View>
        </ThemedView>
        {/* Modals for text input */}
        <ModalInput
          visible={modal === "changePasswordOld"}
          title="Enter Current Password"
          placeholder="Current Password"
          secureTextEntry
          onCancel={() => setModal(null)}
          onSubmit={modalCallback}
        />
        <ModalInput
          visible={modal === "changePasswordNew"}
          title="Enter New Password"
          placeholder="New Password"
          secureTextEntry
          onCancel={() => setModal(null)}
          onSubmit={modalCallback}
        />
        <ModalInput
          visible={modal === "blockUser"}
          title="Block User"
          placeholder="User Email"
          onCancel={() => setModal(null)}
          onSubmit={modalCallback}
        />
        <ModalInput
          visible={modal === "unblockUser"}
          title="Unblock User"
          placeholder="User Email"
          onCancel={() => setModal(null)}
          onSubmit={modalCallback}
        />
        <ModalInput
          visible={modal === "reportAbuse"}
          title="Report Abuse"
          placeholder="Describe the issue"
          onCancel={() => setModal(null)}
          onSubmit={modalCallback}
        />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = (colorScheme: "light" | "dark") =>
  StyleSheet.create({
    container: {
      flex: 1,
      padding: 18,
      paddingBottom: 24,
    },
    photoContainer: {
      alignSelf: "center",
      marginBottom: 18,
    },
    photo: {
      width: 90,
      height: 90,
      borderRadius: 45,
      borderWidth: 2,
      borderColor: Colors[colorScheme].tint,
    },
    photoPlaceholder: {
      alignItems: "center",
      justifyContent: "center",
    },
    photoEditText: {
      fontSize: 13,
      color: Colors[colorScheme].tint,
      marginTop: -8,
    },
    topButtonsRow: {
      flexDirection: "row",
      justifyContent: "flex-end",
      marginBottom: 10,
      gap: 16,
    },
    iconBtn: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: Colors[colorScheme].inputBackground,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 6,
      marginLeft: 8,
    },
    iconBtnText: {
      marginLeft: 4,
      color: Colors[colorScheme].tint,
      fontWeight: "bold",
      fontSize: 15,
    },
    inputGroup: {
      marginBottom: 12,
    },
    label: {
      fontSize: 15,
      fontWeight: "500",
      marginBottom: 4,
    },
    input: {
      borderWidth: 1,
      borderColor: Colors[colorScheme].border,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: Platform.OS === "ios" ? 12 : 8,
      fontSize: 15,
      color: Colors[colorScheme].text,
      backgroundColor: Colors[colorScheme].inputBackground,
    },
    switchRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 18,
      marginTop: 2,
    },
    securityRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 10,
    },
    securityBtn: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderRadius: 8,
      backgroundColor: Colors[colorScheme].inputBackground,
      marginRight: 8,
    },
    securityText: {
      fontSize: 15,
      marginLeft: 6,
      color: Colors[colorScheme].tint,
      fontWeight: "500",
    },
    securityTextDanger: {
      color: "#f44336",
    },
    securityTextWarning: {
      color: "#ff9800",
    },
    securityTextInfo: {
      color: "#2196f3",
    },
    securityTextSuccess: {
      color: "#4caf50",
    },
    securityTextNeutral: {
      color: Colors[colorScheme].textMuted,
    },
    securityTextPrimary: {
      color: Colors[colorScheme].text,
    },
    securityTextSecondary: {
      color: Colors[colorScheme].textMuted,
    },
  })