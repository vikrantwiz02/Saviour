import HelpHistory from "@/components/HelpHistory"
import StatsSummary from "@/components/StatsSummary"
import { ThemedText } from "@/components/ThemedText"
import { ThemedView } from "@/components/ThemedView"
import { Colors } from "@/constants/Colors"
import { useColorScheme } from "@/hooks/useColorScheme"
import { Ionicons } from "@expo/vector-icons"
import * as ImagePicker from "expo-image-picker"
import { useRouter } from "expo-router"
import React, { useState } from "react"
import { Alert, Image, Platform, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

export default function ProfileScreen() {
  const colorScheme = useColorScheme() ?? "light"
  const s = styles(colorScheme)
  const router = useRouter()

  const [name, setName] = useState("John Doe")
  const [contact, setContact] = useState("+91 9876543210")
  const [medical, setMedical] = useState("")
  const [notifications, setNotifications] = useState(true)
  const [photo, setPhoto] = useState<string | null>(null)

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    })
    if (!result.canceled && result.assets.length > 0) {
      setPhoto(result.assets[0].uri)
    }
  }

  const handleLogout = () => Alert.alert("Logout", "You have been logged out. (UI only)")
  const handleChangePassword = () => Alert.alert("Change Password", "Change password flow. (UI only)")
  const handleManageBlocked = () => Alert.alert("Blocked Users", "Manage blocked users. (UI only)")
  const handleReportAbuse = () => Alert.alert("Report Abuse", "Report abuse flow. (UI only)")

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <ThemedView style={s.container}>
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
          </TouchableOpacity>

          {/* Settings & Notifications Buttons */}
          <View style={s.topButtonsRow}>
            <TouchableOpacity
              style={s.iconBtn}
              onPress={() => router.push("/settings")}
              accessibilityRole="button"
              accessibilityLabel="Open Settings"
            >
              <Ionicons name="settings" size={22} color={Colors[colorScheme].tint} />
              <Text style={s.iconBtnText}>Settings</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.iconBtn}
              onPress={() => router.push("/notifications")}
              accessibilityRole="button"
              accessibilityLabel="Open Notifications"
            >
              <Ionicons name="notifications" size={22} color={Colors[colorScheme].tint} />
              <Text style={s.iconBtnText}>Notifications</Text>
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
              onValueChange={setNotifications}
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

          {/* Stats & History */}
          <StatsSummary />
          <HelpHistory />
        </ThemedView>
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