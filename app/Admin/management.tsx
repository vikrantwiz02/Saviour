import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
  ActivityIndicator,
  Platform,
  Keyboard,
  Animated,
  Linking,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "../../constants/Colors";
import { useColorScheme } from "../../hooks/useColorScheme";
import { db } from "../../lib/firebase";
import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";

const { width } = Dimensions.get("window");
const isTablet = width >= 768;

type UserRole = "Users" | "Employee" | "Admin";
type UserStatus = "Active" | "Suspended";

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  status: UserStatus;
  createdAt?: any;
  lastLogin?: any;
  [key: string]: any;
}

const ROLE_COLORS: Record<UserRole | UserStatus, string> = {
  Users: "#2563eb",
  Employee: "#22c55e",
  Admin: "#a21caf",
  Suspended: "#ef4444",
  Active: "#22c55e",
};

const FILTERS = [
  { label: "All", value: "all", icon: "apps" },
  { label: "Users", value: "users", icon: "person" },
  { label: "Employees", value: "employees", icon: "people" },
];

function capitalize(str?: string) {
  if (!str || typeof str !== "string") return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function getRoleColor(role: UserRole, status: UserStatus): string {
  if (status === "Suspended") return ROLE_COLORS.Suspended;
  return ROLE_COLORS[role] || "#888";
}

function RoleTag({ role, status }: { role: UserRole; status: UserStatus }) {
  return (
    <View
      style={{
        backgroundColor: getRoleColor(role, status) + "22",
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 3,
        marginRight: 6,
        alignSelf: "flex-start",
      }}
      accessible
      accessibilityLabel={`Role: ${role}, Status: ${status}`}
    >
      <Text style={{ color: getRoleColor(role, status), fontWeight: "bold", fontSize: 12 }}>
        {status === "Suspended" ? "Suspended" : capitalize(role)}
      </Text>
    </View>
  );
}

function StatusDot({ status }: { status: UserStatus }) {
  return (
    <View
      style={{
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: status === "Active" ? "#22c55e" : "#ef4444",
        marginRight: 6,
        alignSelf: "center",
      }}
      accessible
      accessibilityLabel={`Status: ${status}`}
    />
  );
}

interface ActionButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  onPress: () => void;
  disabled?: boolean;
}

function ActionButton({ icon, label, color, onPress, disabled = false }: ActionButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: color + "22",
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 8,
        marginRight: 8,
        marginBottom: 4,
        opacity: disabled ? 0.5 : 1,
        minWidth: 44,
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
    >
      <Ionicons name={icon} size={18} color={color} />
      <Text style={{ color, fontWeight: "bold", marginLeft: 4, fontSize: 13 }}>{label}</Text>
    </TouchableOpacity>
  );
}

interface ProfileDetailModalProps {
  visible: boolean;
  user: User | null;
  onClose: () => void;
}

function ProfileDetailModal({ visible, user, onClose }: ProfileDetailModalProps) {
  if (!user) return null;
  const infoFields = Object.entries(user)
    .filter(([k]) => !["id"].includes(k))
    .map(([k, v]) => (
      <View key={k} style={{ flexDirection: "row", marginBottom: 4 }}>
        <Text style={{ fontWeight: "bold", color: "#2563eb", minWidth: 90 }}>{capitalize(k)}: </Text>
        <Text style={{ color: "#333", flex: 1 }}>{typeof v === "string" ? v : JSON.stringify(v)}</Text>
      </View>
    ));
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.profileModal}>
          <TouchableOpacity
            onPress={onClose}
            style={{ position: "absolute", left: 10, top: 10, zIndex: 10 }}
            accessibilityRole="button"
            accessibilityLabel="Close profile"
          >
            <Ionicons name="arrow-back" size={24} color="#222" />
          </TouchableOpacity>
          <View style={{ alignItems: "center", marginBottom: 10, marginTop: 10 }}>
            <MaterialCommunityIcons
              name={user.role === "Employee" ? "account-tie" : user.role === "Admin" ? "account-cog" : "account"}
              size={48}
              color={getRoleColor(user.role, user.status)}
            />
            <Text style={{ fontWeight: "bold", fontSize: 20, marginTop: 6 }}>{capitalize(user.name)}</Text>
            <RoleTag role={user.role} status={user.status} />
            <Text style={{ color: "#555", fontSize: 13 }}>{user.email}</Text>
            <Text style={{ color: "#555", fontSize: 13 }}>{user.phone}</Text>
          </View>
          <ScrollView style={{ flex: 1 }}>
            <View style={{ paddingLeft: 18, paddingTop: 8 }}>{infoFields}</View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export default function ManagementScreen() {
  const colorScheme = useColorScheme() ?? "light";
  const [filter, setFilter] = useState<"all" | "users" | "employees">("all");
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);

  // For horizontal scrollbar
  const filterScrollRef = useRef<ScrollView>(null);
  const [scrollBarWidth, setScrollBarWidth] = useState(0);
  const [scrollBarX, setScrollBarX] = useState(0);
  const [scrollBarContentWidth, setScrollBarContentWidth] = useState(1);

  // Fetch users from Firestore
  const fetchUsers = async () => {
    setLoading(true);
    let q = collection(db, "users");
    let userQuery: any = q;
    try {
      if (filter === "users" && !search) {
        userQuery = query(q, where("role", "==", "users"));
      } else if (filter === "employees" && !search) {
        userQuery = query(q, where("role", "==", "employee"));
      }
      const snap = await getDocs(userQuery);
      const data: User[] = [];
      snap.forEach((docSnap) => {
        const d = docSnap.data() as any;
        data.push({
          id: docSnap.id,
          name: capitalize(d.fullName || d.name),
          email: d.email,
          phone: d.phone,
          role: capitalize(d.role) as UserRole,
          status: capitalize(d.status) as UserStatus,
          createdAt: d.createdAt,
          lastLogin: d.lastLogin,
          ...d,
        });
      });
      let filtered = data;
      if (search) {
        filtered = data.filter((u) =>
          (u.name && u.name.toLowerCase().includes(search.toLowerCase())) ||
          (u.email && u.email.toLowerCase().includes(search.toLowerCase())) ||
          (u.phone && u.phone.includes(search))
        );
        if (filter === "users") filtered = filtered.filter((u) => u.role.toLowerCase() === "users");
        if (filter === "employees") filtered = filtered.filter((u) => u.role.toLowerCase() === "employee");
      }
      setUsers(filtered);
    } catch (e) {
      Alert.alert("Error", "Failed to fetch users.");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, search]);

  const handleCopyEmail = (email: string) => {
    Clipboard.setStringAsync(email);
    Alert.alert("Copied", "Email copied to clipboard.");
  };

  // --- Filter Bar Scrollbar Logic ---
  const handleFilterScroll = (e: any) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    setScrollBarX(contentOffset.x);
    setScrollBarContentWidth(contentSize.width);
    setScrollBarWidth(layoutMeasurement.width);
  };

  // --- UI ---
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors[colorScheme].background }}>
      {/* Sticky Filter Bar */}
      <View style={{ backgroundColor: Colors[colorScheme].background, zIndex: 10 }}>
        <ScrollView
          ref={filterScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterBarScroll}
          style={{ marginBottom: 2, marginTop: Platform.OS === "ios" ? 6 : 0 }}
          keyboardShouldPersistTaps="handled"
          onScroll={handleFilterScroll}
          scrollEventThrottle={16}
        >
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f.value}
              onPress={() => {
                setFilter(f.value as any);
                Keyboard.dismiss();
              }}
              style={[
                styles.filterPill,
                filter === f.value && styles.filterPillActive,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Filter: ${f.label}`}
              activeOpacity={0.85}
            >
              <Ionicons
                name={f.icon as any}
                size={18}
                color={filter === f.value ? "#fff" : "#6E45E2"}
                style={{ marginRight: 6 }}
              />
              <Text
                style={{
                  color: filter === f.value ? "#fff" : "#6E45E2",
                  fontWeight: filter === f.value ? "bold" : "600",
                  fontSize: 15,
                }}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color="#888" />
            <TextInput
              placeholder="Search name, email, phone"
              placeholderTextColor="#aaa"
              style={{ flex: 1, marginLeft: 8, color: "#222", fontSize: 15 }}
              value={search}
              onChangeText={setSearch}
              accessibilityLabel="Search users"
              accessible
              returnKeyType="search"
              onSubmitEditing={Keyboard.dismiss}
            />
          </View>
        </ScrollView>
        {/* Modern Thin Scrollbar */}
        <View style={styles.scrollbarTrack}>
          <Animated.View
            style={[
              styles.scrollbarThumb,
              {
                width: scrollBarWidth * (scrollBarWidth / scrollBarContentWidth),
                left: scrollBarContentWidth > scrollBarWidth
                  ? (scrollBarX / (scrollBarContentWidth - scrollBarWidth)) * (scrollBarWidth - scrollBarWidth * (scrollBarWidth / scrollBarContentWidth))
                  : 0,
              },
            ]}
          />
        </View>
      </View>
      {/* User List */}
      <View style={{ flex: 1, padding: isTablet ? 24 : 10 }}>
        {loading ? (
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
            <ActivityIndicator size="large" color="#2563eb" />
          </View>
        ) : (
          <FlatList
            data={users}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View
                style={[
                  styles.userCard,
                  { backgroundColor: "#f8fafc", marginBottom: 14, borderColor: getRoleColor(item.role, item.status) + "33" },
                ]}
                accessible
                accessibilityLabel={`User: ${capitalize(item.name)}, Role: ${capitalize(item.role)}, Status: ${capitalize(item.status)}`}
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <StatusDot status={item.status} />
                  <Text style={{ fontWeight: "bold", fontSize: 16, color: "#222" }}>{capitalize(item.name)}</Text>
                  <RoleTag role={item.role} status={item.status} />
                </View>
                <Text style={{ color: "#555", fontSize: 13, marginTop: 2 }}>{item.email}</Text>
                <Text style={{ color: "#555", fontSize: 13 }}>{item.phone}</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 8 }}>
                  <ActionButton
                    icon="eye"
                    label="View"
                    color="#2563eb"
                    onPress={() => {
                      setSelectedUser(item);
                      setProfileOpen(true);
                    }}
                  />
                  <ActionButton
                    icon="mail"
                    label="Send Email"
                    color="#2563eb"
                    onPress={() => Linking.openURL(`mailto:${item.email}`)}
                  />
                  <ActionButton
                    icon="call"
                    label="Call"
                    color="#22c55e"
                    onPress={() => Linking.openURL(`tel:${item.phone}`)}
                  />
                  <ActionButton
                    icon="copy"
                    label="Copy Email"
                    color="#a21caf"
                    onPress={() => handleCopyEmail(item.email)}
                  />
                </View>
              </View>
            )}
            contentContainerStyle={{ paddingBottom: 40 }}
            ListEmptyComponent={
              <View style={{ alignItems: "center", marginTop: 40 }}>
                <MaterialCommunityIcons name="account-search" size={40} color="#888" />
                <Text style={{ color: "#888", marginTop: 10 }}>No users found.</Text>
              </View>
            }
          />
        )}
        <ProfileDetailModal
          visible={profileOpen}
          user={selectedUser}
          onClose={() => setProfileOpen(false)}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  filterBarScroll: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 4,
    paddingTop: 4,
    paddingLeft: 2,
    paddingRight: 2,
    gap: 8,
  },
  filterPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f3f0fa",
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    shadowColor: "#6E45E2",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
  },
  filterPillActive: {
    backgroundColor: "#6E45E2",
    borderColor: "#6E45E2",
    shadowOpacity: 0.15,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginLeft: 8,
    flex: 1,
    minWidth: 180,
  },
  scrollbarTrack: {
    height: 3,
    backgroundColor: "#e5e7eb",
    borderRadius: 2,
    marginHorizontal: 8,
    marginBottom: 2,
    marginTop: 0,
  },
  scrollbarThumb: {
    height: 3,
    backgroundColor: "#6E45E2",
    borderRadius: 2,
    position: "absolute",
    top: 0,
    left: 0,
  },
  userCard: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    elevation: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.18)",
    justifyContent: "center",
    alignItems: "center",
  },
  profileModal: {
    width: isTablet ? 420 : "95%",
    maxHeight: "90%",
    backgroundColor: "#fff",
     borderRadius: 18,
    padding: 18,
    elevation: 6,
  },
});