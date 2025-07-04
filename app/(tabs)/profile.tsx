"use client"

import { useEffect, useState } from "react"
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Modal,
  Pressable,
  Animated,
  Easing,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useRouter } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import * as ImagePicker from "expo-image-picker"
import * as Location from "expo-location"
import {
  getAuth,
  signOut,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  onAuthStateChanged,
  type User,
} from "firebase/auth"
import { doc, getDoc, updateDoc, collection, query, where, getDocs, addDoc } from "firebase/firestore"
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage"
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
  theme: "light" | "dark"
}

function ModalInput({ visible, title, placeholder, secureTextEntry, onCancel, onSubmit, theme }: ModalInputProps) {
  const [value, setValue] = useState("")
  const fadeAnim = useState(new Animated.Value(0))[0]
  const slideAnim = useState(new Animated.Value(300))[0]

  useEffect(() => {
    setValue("")
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
      ]).start()
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
      ]).start()
    }
  }, [visible])

  const backgroundColor = theme === "dark" ? Colors.dark.inputBackground : Colors.light.background
  const textColor = theme === "dark" ? Colors.dark.text : Colors.light.text
  const borderColor = theme === "dark" ? Colors.dark.border : Colors.light.border
  const buttonColor = theme === "dark" ? Colors.dark.tint : Colors.light.tint

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
                onSubmit(value)
                setValue("")
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
  )
}

export default function ProfileScreen() {
  const colorScheme = useColorScheme() ?? "light"
  const theme = colorScheme
  const s = styles(theme)
  const router = useRouter()
  const auth = getAuth()

  // Animation values
  const profileImageScale = useState(new Animated.Value(1))[0]
  const buttonScale = useState(new Animated.Value(1))[0]

  // Listen for auth state changes
  const [user, setUser] = useState<User | null>(auth.currentUser)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser)
      if (!firebaseUser) {
        router.replace("/(auth)/login")
      }
    })
    return unsubscribe
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
  const [modal, setModal] = useState<
    null | "changePasswordOld" | "changePasswordNew" | "blockUser" | "reportAbuse" | "unblockUser"
  >(null)
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

        // Fetch help history
        const q = query(collection(db, "sos_requests"), where("userId", "==", user.uid))
        const snap = await getDocs(q)
        setHelpHistory(
          snap.docs
            .map((doc) => {
              const data = doc.data() || {}
              return { ...data, id: doc.id } as HelpHistoryItem
            })
            .sort((a, b) => {
              const aDate = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0)
              const bDate = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0)
              return bDate.getTime() - aDate.getTime()
            }),
        )
      } catch (e) {
        console.error("Error fetching profile:", e)
        Alert.alert("Error", "Failed to fetch profile or SOS requests.")
      }
      setLoading(false)
    }

    fetchProfile()
  }, [user])

  // Fetch current city
  useEffect(() => {
    const fetchCurrentCity = async () => {
      setCityLoading(true)
      try {
        const { status } = await Location.requestForegroundPermissionsAsync()
        if (status !== "granted") {
          setCurrentCity(null)
          setCityLoading(false)
          return
        }

        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        })

        const geo = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        })

        if (geo && geo[0] && geo[0].city) setCurrentCity(geo[0].city)
        else setCurrentCity(null)
      } catch (e) {
        console.error("Location error:", e)
        setCurrentCity(null)
      }
      setCityLoading(false)
    }

    fetchCurrentCity()
  }, [])

  // Save profile changes
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
        updatedAt: new Date(),
      })
      Alert.alert("Profile Updated", "Your profile has been updated successfully.")
    } catch (e) {
      console.error("Error updating profile:", e)
      Alert.alert("Error", "Failed to update profile. Please try again.")
    }
    setSaving(false)
  }

  // Helper function to convert URI to blob
  const uriToBlob = async (uri: string): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.onload = () => {
        resolve(xhr.response)
      }
      xhr.onerror = (e) => {
        console.error("XHR Error:", e)
        reject(new TypeError("Network request failed"))
      }
      xhr.responseType = "blob"
      xhr.open("GET", uri, true)
      xhr.send(null)
    })
  }

  // Pick and upload profile photo with improved error handling
  const pickImage = async () => {
    if (!user) {
      Alert.alert("Error", "User not authenticated")
      return
    }

    // Animation feedback
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
    ]).start()

    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Camera roll permissions are required to upload profile photos.")
        return
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7, // Reduced quality for faster upload
        allowsMultipleSelection: false,
      })

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return
      }

      const selectedImage = result.assets[0]
      const uri = selectedImage.uri

      if (!uri) {
        Alert.alert("Error", "Failed to get image URI")
        return
      }

      setPhotoUploading(true)

      try {
        // Initialize Firebase Storage
        const storage = getStorage()

        // Create unique filename
        const timestamp = Date.now()
        const fileExtension = uri.split(".").pop() || "jpg"
        const fileName = `profile_${user.uid}_${timestamp}.${fileExtension}`
        const storageRef = ref(storage, `profile_photos/${fileName}`)

        console.log("Starting upload for:", fileName)

        // Convert URI to blob
        let blob: Blob
        try {
          blob = await uriToBlob(uri)
        } catch (blobError) {
          console.error("Blob conversion error:", blobError)
          // Fallback method for blob conversion
          const response = await fetch(uri)
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
          }
          blob = await response.blob()
        }

        console.log("Blob created, size:", blob.size)

        // Upload to Firebase Storage with metadata
        const metadata = {
          contentType: selectedImage.type || "image/jpeg",
          customMetadata: {
            userId: user.uid,
            uploadedAt: new Date().toISOString(),
          },
        }

        const uploadTask = await uploadBytes(storageRef, blob, metadata)
        console.log("Upload completed:", uploadTask.metadata.fullPath)

        // Get download URL
        const downloadUrl = await getDownloadURL(storageRef)
        console.log("Download URL obtained:", downloadUrl)

        // Delete old profile photo if exists
        if (photo && photo.includes("profile_photos/")) {
          try {
            const oldPhotoRef = ref(storage, photo)
            await deleteObject(oldPhotoRef)
            console.log("Old photo deleted")
          } catch (deleteError) {
            console.log("Could not delete old photo:", deleteError)
            // Don't throw error, just log it
          }
        }

        // Update state and Firestore
        setPhoto(downloadUrl)

        await updateDoc(doc(db, "users", user.uid), {
          photoUrl: downloadUrl,
          photoUpdatedAt: new Date(),
        })

        Alert.alert("Success", "Profile photo updated successfully!")
      } catch (uploadError) {
        console.error("Upload error details:", uploadError)

        let errorMessage = "Failed to upload photo. "

        if (uploadError instanceof Error) {
          if (uploadError.message.includes("network")) {
            errorMessage += "Please check your internet connection."
          } else if (uploadError.message.includes("permission")) {
            errorMessage += "Storage permission denied."
          } else if (uploadError.message.includes("quota")) {
            errorMessage += "Storage quota exceeded."
          } else {
            errorMessage += uploadError.message
          }
        } else {
          errorMessage += "Please try again."
        }

        Alert.alert("Upload Error", errorMessage)
      }
    } catch (error) {
      console.error("Image picker error:", error)
      Alert.alert("Error", "Failed to select image. Please try again.")
    } finally {
      setPhotoUploading(false)
    }
  }

  // Toggle notifications with animation
  const handleToggleNotifications = async (value: boolean) => {
    Animated.spring(buttonScale, {
      toValue: 0.9,
      friction: 3,
      useNativeDriver: true,
    }).start(() => {
      Animated.spring(buttonScale, {
        toValue: 1,
        friction: 3,
        useNativeDriver: true,
      }).start()
    })

    setNotifications(value)
    if (user) {
      try {
        await updateDoc(doc(db, "users", user.uid), { notifications: value })
      } catch (error) {
        console.error("Error updating notifications:", error)
        // Revert the change if update fails
        setNotifications(!value)
        Alert.alert("Error", "Failed to update notification settings.")
      }
    }
  }

  // Change password
  const handleChangePassword = () => {
    setModalCallback(() => async (oldPassword: string) => {
      setModal(null)
      if (!oldPassword) return

      setTempPassword(oldPassword)
      setTimeout(() => {
        setModalCallback(() => async (newPassword: string) => {
          setModal(null)
          if (!newPassword) return

          if (newPassword.length < 6) {
            Alert.alert("Error", "Password must be at least 6 characters long.")
            return
          }

          try {
            if (!user?.email) throw new Error("No email found")

            const credential = EmailAuthProvider.credential(user.email, oldPassword)
            await reauthenticateWithCredential(user, credential)
            await updatePassword(user, newPassword)
            Alert.alert("Success", "Password changed successfully.")
          } catch (e: any) {
            console.error("Password change error:", e)
            let errorMessage = "Failed to change password. "

            if (e.code === "auth/wrong-password") {
              errorMessage = "Current password is incorrect."
            } else if (e.code === "auth/weak-password") {
              errorMessage = "New password is too weak."
            } else if (e.code === "auth/requires-recent-login") {
              errorMessage = "Please log out and log back in, then try again."
            } else {
              errorMessage += e.message || "Please try again."
            }

            Alert.alert("Error", errorMessage)
          }
        })
        setModal("changePasswordNew")
      }, 300)
    })
    setModal("changePasswordOld")
  }

  // Logout with confirmation
  const handleLogout = async () => {
    Alert.alert("Confirm Logout", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: async () => {
          try {
            await signOut(auth)
          } catch (e) {
            console.error("Logout error:", e)
            Alert.alert("Logout Failed", "Could not log out. Try again.")
          }
        },
      },
    ])
  }

  // Blocked users management
  const handleManageBlocked = () => {
    Alert.alert("Blocked Users", "What do you want to do?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Block User",
        onPress: () => {
          setModalCallback(() => async (email: string) => {
            setModal(null)
            if (!email) return

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
            if (!emailRegex.test(email)) {
              Alert.alert("Invalid Email", "Please enter a valid email address.")
              return
            }

            if (blockedUsers.includes(email)) {
              Alert.alert("Already Blocked", "This user is already blocked.")
              return
            }

            const updated = [...blockedUsers, email]
            setBlockedUsers(updated)
            if (user) {
              try {
                await updateDoc(doc(db, "users", user.uid), { blockedUsers: updated })
                Alert.alert("Blocked", `${email} has been blocked.`)
              } catch (error) {
                console.error("Error blocking user:", error)
                setBlockedUsers(blockedUsers) // Revert on error
                Alert.alert("Error", "Failed to block user.")
              }
            }
          })
          setModal("blockUser")
        },
      },
      {
        text: "Unblock User",
        onPress: () => {
          setModalCallback(() => async (email: string) => {
            setModal(null)
            if (!email) return

            if (!blockedUsers.includes(email)) {
              Alert.alert("Not Blocked", "This user is not blocked.")
              return
            }

            const updated = blockedUsers.filter((u) => u !== email)
            setBlockedUsers(updated)
            if (user) {
              try {
                await updateDoc(doc(db, "users", user.uid), { blockedUsers: updated })
                Alert.alert("Unblocked", `${email} has been unblocked.`)
              } catch (error) {
                console.error("Error unblocking user:", error)
                setBlockedUsers(blockedUsers) // Revert on error
                Alert.alert("Error", "Failed to unblock user.")
              }
            }
          })
          setModal("unblockUser")
        },
      },
    ])
  }

  // Report abuse
  const handleReportAbuse = () => {
    setModalCallback(() => async (desc: string) => {
      setModal(null)
      if (!desc) return

      try {
        await addDoc(collection(db, "abuse_reports"), {
          userId: user?.uid,
          userEmail: user?.email,
          description: desc,
          createdAt: new Date(),
          status: "pending",
        })
        Alert.alert("Reported", "Thank you for reporting. We'll review your report and take appropriate action.")
      } catch (e) {
        console.error("Error reporting abuse:", e)
        Alert.alert("Error", "Failed to submit report. Please try again.")
      }
    })
    setModal("reportAbuse")
  }

  if (!user || loading) {
    return (
      <SafeAreaView
        style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: Colors[theme].background }}
      >
        <ActivityIndicator size="large" color={Colors[theme].tint} />
        <ThemedText style={{ marginTop: 16, color: Colors[theme].text }}>Loading profile...</ThemedText>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors[theme].background }} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <ThemedView style={s.container}>
          <ThemedText style={s.headerTitle}>Profile</ThemedText>

          {/* Current City */}
          <View style={s.cityContainer}>
            <Ionicons name="location" size={18} color={Colors[theme].tint} style={{ marginRight: 6 }} />
            <ThemedText style={s.cityText}>
              {cityLoading ? "Detecting your current city..." : currentCity ? currentCity : "Location not available"}
            </ThemedText>
          </View>

          {/* Profile Photo */}
          <Animated.View style={{ transform: [{ scale: profileImageScale }] }}>
            <TouchableOpacity
              style={s.photoContainer}
              onPress={pickImage}
              activeOpacity={0.7}
              disabled={photoUploading}
            >
              {photo ? (
                <Image source={{ uri: photo }} style={s.photo} resizeMode="cover" />
              ) : (
                <View style={s.photoPlaceholder}>
                  <Ionicons name="person" size={48} color={Colors[theme].textMuted} />
                  <ThemedText style={s.photoEditText}>Add Photo</ThemedText>
                </View>
              )}
              {photoUploading && (
                <View style={s.uploadOverlay}>
                  <ActivityIndicator size="small" color={Colors[theme].background} />
                  <ThemedText style={{ color: Colors[theme].background, marginTop: 8, fontSize: 12 }}>
                    Uploading...
                  </ThemedText>
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
            <ThemedText style={s.sectionTitle}>Personal Information</ThemedText>

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
                value={contact}
                onChangeText={setContact}
                placeholder="Phone number"
                keyboardType="phone-pad"
                placeholderTextColor={Colors[theme].textMuted}
              />
            </View>

            <View style={s.inputGroup}>
              <ThemedText style={s.label}>Medical Information</ThemedText>
              <TextInput
                style={[s.input, { minHeight: 80, textAlignVertical: "top" }]}
                value={medical}
                onChangeText={setMedical}
                placeholder="Allergies, conditions, medications, etc."
                multiline
                placeholderTextColor={Colors[theme].textMuted}
              />
            </View>
          </View>

          {/* Preferences Section */}
          <View style={s.section}>
            <ThemedText style={s.sectionTitle}>Preferences</ThemedText>

            <View style={s.switchRow}>
              <View style={{ flex: 1 }}>
                <ThemedText style={s.label}>Notifications</ThemedText>
                <ThemedText style={s.subLabel}>Receive alerts and updates</ThemedText>
              </View>
              <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                <Switch
                  value={notifications}
                  onValueChange={handleToggleNotifications}
                  thumbColor={notifications ? Colors[theme].tint : Colors[theme].switchThumb}
                  trackColor={{
                    false: Colors[theme].switchTrack,
                    true: Colors[theme].tint + "55",
                  }}
                />
              </Animated.View>
            </View>
          </View>

          {/* Security Section */}
          <View style={s.section}>
            <ThemedText style={s.sectionTitle}>Security</ThemedText>

            <TouchableOpacity style={s.securityButton} onPress={handleChangePassword} activeOpacity={0.7}>
              <Ionicons name="key" size={20} color={Colors[theme].tint} style={{ marginRight: 12 }} />
              <ThemedText style={s.securityButtonText}>Change Password</ThemedText>
            </TouchableOpacity>

            <TouchableOpacity style={s.securityButton} onPress={handleManageBlocked} activeOpacity={0.7}>
              <Ionicons name="ban" size={20} color="#FF7043" style={{ marginRight: 12 }} />
              <ThemedText style={[s.securityButtonText, { color: "#FF7043" }]}>Manage Blocked Users</ThemedText>
            </TouchableOpacity>

            <TouchableOpacity style={s.securityButton} onPress={handleReportAbuse} activeOpacity={0.7}>
              <Ionicons name="alert-circle" size={20} color="#EC407A" style={{ marginRight: 12 }} />
              <ThemedText style={[s.securityButtonText, { color: "#EC407A" }]}>Report Abuse</ThemedText>
            </TouchableOpacity>
          </View>

          {/* Help History Section */}
          <View style={s.section}>
            <ThemedText style={s.sectionTitle}>Help History</ThemedText>

            {helpHistory.length === 0 ? (
              <View style={s.emptyHistory}>
                <Ionicons name="time" size={24} color={Colors[theme].textMuted} style={{ marginBottom: 8 }} />
                <ThemedText style={s.emptyHistoryText}>No SOS requests yet</ThemedText>
              </View>
            ) : (
              <View style={s.historyList}>
                {helpHistory.map((item) => (
                  <View key={item.id} style={s.historyItem}>
                    <View style={s.historyItemHeader}>
                      <ThemedText style={s.historyItemTitle}>{item.emergencyType || "Emergency Request"}</ThemedText>
                      <ThemedText style={s.historyItemDate}>
                        {item.createdAt?.toDate ? item.createdAt.toDate().toLocaleString() : item.createdAt || "N/A"}
                      </ThemedText>
                    </View>

                    {item.description && <ThemedText style={s.historyItemDescription}>{item.description}</ThemedText>}

                    {typeof item.latitude === "number" && typeof item.longitude === "number" && (
                      <View style={s.historyItemLocation}>
                        <Ionicons
                          name="location"
                          size={14}
                          color={Colors[theme].textMuted}
                          style={{ marginRight: 4 }}
                        />
                        <ThemedText style={s.historyItemLocationText}>
                          {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}
                        </ThemedText>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}
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
          placeholder="New Password (min 6 characters)"
          secureTextEntry
          onCancel={() => setModal(null)}
          onSubmit={modalCallback}
          theme={theme}
        />
        <ModalInput
          visible={modal === "blockUser"}
          title="Block User"
          placeholder="Enter user's email"
          onCancel={() => setModal(null)}
          onSubmit={modalCallback}
          theme={theme}
        />
        <ModalInput
          visible={modal === "unblockUser"}
          title="Unblock User"
          placeholder="Enter user's email"
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
  )
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
    cityContainer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      padding: 12,
      borderRadius: 20,
      backgroundColor: theme === "dark" ? Colors.dark.card : Colors.light.inputBackground,
      marginBottom: 24,
      alignSelf: "center",
    },
    cityText: {
      fontSize: 15,
      fontWeight: "500",
      color: Colors[theme].tint,
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
      backgroundColor: "rgba(0,0,0,0.7)",
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
    subLabel: {
      fontSize: 13,
      color: Colors[theme].textMuted,
      marginBottom: 8,
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
    switchRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 8,
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
      color: Colors[theme].text,
    },
    emptyHistory: {
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
      borderRadius: 10,
      backgroundColor: theme === "dark" ? Colors.dark.card : Colors.light.inputBackground,
    },
    emptyHistoryText: {
      color: Colors[theme].textMuted,
      fontSize: 15,
    },
    historyList: {
      borderRadius: 10,
      overflow: "hidden",
    },
    historyItem: {
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: Colors[theme].border,
      backgroundColor: theme === "dark" ? Colors.dark.card : Colors.light.inputBackground,
    },
    historyItemHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 8,
    },
    historyItemTitle: {
      fontWeight: "600",
      fontSize: 15,
      flex: 1,
      color: Colors[theme].text,
    },
    historyItemDate: {
      fontSize: 13,
      color: Colors[theme].textMuted,
    },
    historyItemDescription: {
      fontSize: 14,
      color: Colors[theme].text,
      marginBottom: 8,
      lineHeight: 20,
    },
    historyItemLocation: {
      flexDirection: "row",
      alignItems: "center",
    },
    historyItemLocationText: {
      fontSize: 13,
      color: Colors[theme].textMuted,
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
  })
