import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const MOCK_ADMIN = {
  name: "Admin User",
  email: "admin@saviour.com",
  phone: "+91 9000000000",
  role: "Admin",
  photo: null as string | null,
  notifications: true,
  org: "Saviour HQ",
  lastLogin: "2025-06-19 09:30",
  joined: "2024-01-01",
};

export default function AdminProfileScreen() {
  const colorScheme = useColorScheme() ?? "light";
  const s = styles(colorScheme);
  const router = useRouter();

  const [name, setName] = useState(MOCK_ADMIN.name);
  const [email, setEmail] = useState(MOCK_ADMIN.email);
  const [phone, setPhone] = useState(MOCK_ADMIN.phone);
  const [org, setOrg] = useState(MOCK_ADMIN.org);
  const [notifications, setNotifications] = useState(MOCK_ADMIN.notifications);
  const [photo, setPhoto] = useState<string | null>(MOCK_ADMIN.photo);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets.length > 0) {
      setPhoto(result.assets[0].uri);
    }
  };

  const handleLogout = () => Alert.alert("Logout", "You have been logged out. (UI only)");
  const handleChangePassword = () => Alert.alert("Change Password", "Change password flow. (UI only)");
  const handleManageEmployees = () => router.push("../management");
  const handleViewLogs = () => Alert.alert("Activity Logs", "Show admin activity logs. (UI only)");

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
                <MaterialCommunityIcons name="account-tie" size={80} color={Colors[colorScheme].icon} />
                <ThemedText style={s.photoEditText}>Edit</ThemedText>
              </View>
            )}
          </TouchableOpacity>

          {/* Admin Info */}
          <View style={s.infoBlock}>
            <ThemedText style={s.adminName}>{name}</ThemedText>
            <View style={s.roleTag}>
              <MaterialCommunityIcons name="shield-account" size={16} color="#fff" />
              <Text style={s.roleTagText}>Admin</Text>
            </View>
            <Text style={s.infoText}>{email}</Text>
            <Text style={s.infoText}>{phone}</Text>
            <Text style={s.infoText}>Organization: {org}</Text>
            <Text style={s.infoText}>Joined: {MOCK_ADMIN.joined}</Text>
            <Text style={s.infoText}>Last Login: {MOCK_ADMIN.lastLogin}</Text>
          </View>

          {/* Editable Fields */}
          <View style={s.inputGroup}>
            <ThemedText style={s.label}>Name</ThemedText>
            <TextInput
              style={s.input}
              value={name}
              onChangeText={setName}
              placeholder="Admin Name"
              placeholderTextColor={Colors[colorScheme].textMuted}
            />
          </View>
          <View style={s.inputGroup}>
            <ThemedText style={s.label}>Email</ThemedText>
            <TextInput
              style={s.input}
              value={email}
              onChangeText={setEmail}
              placeholder="Email"
              keyboardType="email-address"
              placeholderTextColor={Colors[colorScheme].textMuted}
              autoCapitalize="none"
            />
          </View>
          <View style={s.inputGroup}>
            <ThemedText style={s.label}>Phone</ThemedText>
            <TextInput
              style={s.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="Phone Number"
              keyboardType="phone-pad"
              placeholderTextColor={Colors[colorScheme].textMuted}
            />
          </View>
          <View style={s.inputGroup}>
            <ThemedText style={s.label}>Organization</ThemedText>
            <TextInput
              style={s.input}
              value={org}
              onChangeText={setOrg}
              placeholder="Organization"
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

          {/* Admin Actions */}
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
            <TouchableOpacity style={s.securityBtn} onPress={handleManageEmployees}>
              <MaterialCommunityIcons name="account-group" size={20} color="#22c55e" />
              <ThemedText style={[s.securityText, { color: "#22c55e" }]}>Manage Users</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity style={s.securityBtn} onPress={handleViewLogs}>
              <MaterialCommunityIcons name="file-document" size={20} color="#2196f3" />
              <ThemedText style={[s.securityText, { color: "#2196f3" }]}>Activity Logs</ThemedText>
            </TouchableOpacity>
          </View>
        </ThemedView>
      </ScrollView>
    </SafeAreaView>
  );
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
    infoBlock: {
      alignItems: "center",
      marginBottom: 18,
    },
    adminName: {
      fontSize: 22,
      fontWeight: "bold",
      color: Colors[colorScheme].text,
      marginBottom: 2,
    },
    roleTag: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "#2563eb",
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 3,
      marginBottom: 6,
      marginTop: 2,
    },
    roleTagText: {
      color: "#fff",
      fontWeight: "bold",
      marginLeft: 4,
      fontSize: 13,
    },
    infoText: {
      color: Colors[colorScheme].textMuted,
      fontSize: 13,
      marginBottom: 1,
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
  });