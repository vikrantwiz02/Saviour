import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import React, { ReactNode, useEffect, useRef, useState } from "react";
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "../../constants/Colors";
import { useColorScheme } from "../../hooks/useColorScheme";
import { db } from "../../lib/firebase";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  setDoc,
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
  flagged: boolean;
  helpHistory?: string[];
  reports?: string[];
  logs?: string[];
  createdAt?: any;
  lastLogin?: any;
  [key: string]: any; // For extra fields
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
  { label: "Flagged", value: "flagged", icon: "flag" },
  { label: "Suspended", value: "suspended", icon: "remove-circle" },
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

interface CollapsibleSectionProps {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}

function CollapsibleSection({ title, children, defaultOpen = false }: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <View style={{ marginBottom: 12 }}>
      <TouchableOpacity
        onPress={() => setOpen((o) => !o)}
        style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}
        accessibilityRole="button"
        accessibilityLabel={`Toggle ${title} section`}
      >
        <Ionicons name={open ? "chevron-down" : "chevron-forward"} size={18} color="#2563eb" />
        <Text style={{ fontWeight: "bold", fontSize: 15, color: "#2563eb", marginLeft: 4 }}>{title}</Text>
      </TouchableOpacity>
      {open && <View style={{ paddingLeft: 18 }}>{children}</View>}
    </View>
  );
}

interface ProfileDetailModalProps {
  visible: boolean;
  user: User | null;
  onClose: () => void;
}

function ProfileDetailModal({ visible, user, onClose }: ProfileDetailModalProps) {
  const [tab, setTab] = useState<"Help" | "Reports" | "Logs" | "Info">("Info");
  if (!user) return null;
  const helpHistory = Array.isArray(user.helpHistory) ? user.helpHistory : [];
  const reports = Array.isArray(user.reports) ? user.reports : [];
  const logs = Array.isArray(user.logs) ? user.logs : [];
  // Show all details
  const infoFields = Object.entries(user)
    .filter(([k]) => !["helpHistory", "reports", "logs", "id"].includes(k))
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
          {/* Tabs */}
          <View style={{ flexDirection: "row", justifyContent: "center", marginBottom: 10 }}>
            {(["Info", "Help", "Reports", "Logs"] as const).map((t) => (
              <TouchableOpacity
                key={t}
                onPress={() => setTab(t)}
                style={[
                  styles.tabBtn,
                  tab === t && styles.tabBtnActive,
                  { minWidth: 80 },
                ]}
                accessibilityRole="tab"
                accessibilityLabel={`Show ${t}`}
              >
                <Text style={{ color: tab === t ? "#2563eb" : "#555", fontWeight: tab === t ? "bold" : "normal" }}>
                  {t}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <ScrollView style={{ flex: 1 }}>
            {tab === "Info" && (
              <CollapsibleSection title="All Details" defaultOpen>
                {infoFields}
              </CollapsibleSection>
            )}
            {tab === "Help" && (
              <CollapsibleSection title="Help History" defaultOpen>
                {helpHistory.length === 0 ? (
                  <Text style={{ color: "#888" }}>No help requests.</Text>
                ) : (
                  helpHistory.map((h: string, i: number) => (
                    <Text key={i} style={{ color: "#333", marginBottom: 2 }}>
                      {h}
                    </Text>
                  ))
                )}
              </CollapsibleSection>
            )}
            {tab === "Reports" && (
              <CollapsibleSection title="Reported Behavior" defaultOpen>
                {reports.length === 0 ? (
                  <Text style={{ color: "#888" }}>No reports.</Text>
                ) : (
                  reports.map((r: string, i: number) => (
                    <Text key={i} style={{ color: "#b91c1c", marginBottom: 2 }}>
                      {r}
                    </Text>
                  ))
                )}
              </CollapsibleSection>
            )}
            {tab === "Logs" && (
              <CollapsibleSection title="Activity Logs" defaultOpen>
                {logs.length === 0 ? (
                  <Text style={{ color: "#888" }}>No logs.</Text>
                ) : (
                  logs.map((l: string, i: number) => (
                    <Text key={i} style={{ color: "#333", marginBottom: 2 }}>
                      {l}
                    </Text>
                  ))
                )}
              </CollapsibleSection>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export default function ManagementScreen() {
  const colorScheme = useColorScheme() ?? "light";
  const [filter, setFilter] = useState<"all" | "users" | "employees" | "flagged" | "suspended">("all");
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
      // Only use Firestore filter if search is empty
      if (filter === "users" && !search) {
        userQuery = query(q, where("role", "==", "users"));
      } else if (filter === "employees" && !search) {
        userQuery = query(q, where("role", "==", "employee"));
      } else if (filter === "flagged" && !search) {
        userQuery = query(q, where("flagged", "==", true));
      } else if (filter === "suspended" && !search) {
        userQuery = query(q, where("status", "in", ["suspended", "Suspended"]));
      }
      const snap = await getDocs(userQuery);
      const data: User[] = [];
      snap.forEach((docSnap) => {
        const d = docSnap.data() as any;
        data.push({
          id: docSnap.id,
          name: capitalize(d.name),
          email: d.email,
          phone: d.phone,
          role: capitalize(d.role) as UserRole,
          status: capitalize(d.status) as UserStatus,
          flagged: !!d.flagged,
          helpHistory: Array.isArray(d.helpHistory) ? d.helpHistory : [],
          reports: Array.isArray(d.reports) ? d.reports : [],
          logs: Array.isArray(d.logs) ? d.logs : [],
          createdAt: d.createdAt,
          lastLogin: d.lastLogin,
          ...d,
        });
      });
      // JS filtering for search
      let filtered = data;
      if (search) {
        filtered = data.filter((u) =>
          (u.name && u.name.toLowerCase().includes(search.toLowerCase())) ||
          (u.email && u.email.toLowerCase().includes(search.toLowerCase())) ||
          (u.phone && u.phone.includes(search))
        );
        if (filter === "users") filtered = filtered.filter((u) => u.role.toLowerCase() === "users");
        if (filter === "employees") filtered = filtered.filter((u) => u.role.toLowerCase() === "employee");
        if (filter === "flagged") filtered = filtered.filter((u) => u.flagged);
        if (filter === "suspended") filtered = filtered.filter((u) => u.status.toLowerCase() === "suspended");
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

  // Actions
  const handleSuspend = async (user: User) => {
    Alert.alert(
      "Suspend User",
      `Are you sure you want to suspend ${capitalize(user.name)}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Suspend",
          style: "destructive",
          onPress: async () => {
            try {
              await setDoc(doc(db, "suspended_users", user.id), {
                ...user,
                status: "Suspended",
                logs: [...(user.logs || []), "Suspended " + new Date().toISOString().slice(0, 10)],
              });
              await deleteDoc(doc(db, "users", user.id));
              fetchUsers();
            } catch (e) {
              Alert.alert("Error", "Failed to suspend user. Make sure you are logged in as admin and Firestore rules allow admin access.");
            }
          },
        },
      ]
    );
  };

  const handleDelete = async (user: User) => {
    Alert.alert(
      "Delete User",
      `Are you sure you want to delete ${capitalize(user.name)}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await setDoc(doc(db, "deleted_users", user.id), {
                ...user,
                logs: [...(user.logs || []), "Deleted " + new Date().toISOString().slice(0, 10)],
              });
              await deleteDoc(doc(db, "users", user.id));
              fetchUsers();
            } catch (e) {
              Alert.alert("Error", "Failed to delete user. Make sure you are logged in as admin and Firestore rules allow admin access.");
            }
          },
        },
      ]
    );
  };

  const handlePromote = async (user: User) => {
    Alert.alert(
      "Promote User",
      `Promote ${capitalize(user.name)} to Employee?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Promote",
          onPress: async () => {
            try {
              await updateDoc(doc(db, "users", user.id), {
                role: "Employee",
                logs: [...(user.logs || []), "Promoted " + new Date().toISOString().slice(0, 10)],
              });
              fetchUsers();
            } catch (e) {
              Alert.alert("Error", "Failed to promote user. Make sure you are logged in as admin and Firestore rules allow admin access.");
            }
          },
        },
      ]
    );
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
                  {item.flagged && (
                    <MaterialCommunityIcons name="flag" size={18} color="#f59e42" style={{ marginLeft: 4 }} accessibilityLabel="Flagged user" />
                  )}
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
                    icon="remove-circle"
                    label="Suspend"
                    color="#ef4444"
                    onPress={() => handleSuspend(item)}
                    disabled={item.status === "Suspended"}
                  />
                  <ActionButton
                    icon="trash"
                    label="Delete"
                    color="#b91c1c"
                    onPress={() => handleDelete(item)}
                  />
                  {item.role === "Users" && (
                    <ActionButton
                      icon="arrow-up-circle"
                      label="Promote"
                      color="#22c55e"
                      onPress={() => handlePromote(item)}
                    />
                  )}
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
  tabBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#f1f5f9",
    marginHorizontal: 4,
  },
  tabBtnActive: {
    backgroundColor: "#dbeafe",
  },
});