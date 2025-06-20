import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import React, { ReactNode, useState } from "react";
import {
    Dimensions,
    FlatList,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "../../constants/Colors";
import { useColorScheme } from "../../hooks/useColorScheme";

const { width } = Dimensions.get("window");
const isTablet = width >= 768;

type UserRole = "User" | "Employee";
type UserStatus = "Active" | "Suspended";

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  status: UserStatus;
  flagged: boolean;
  helpHistory: string[];
  reports: string[];
  logs: string[];
}

const MOCK_USERS: User[] = [
  {
    id: "1",
    name: "Alice Johnson",
    email: "alice@email.com",
    phone: "+91 9876543210",
    role: "User",
    status: "Active",
    flagged: false,
    helpHistory: ["SOS: 2025-06-01", "SOS: 2025-05-20"],
    reports: [],
    logs: ["Login 2025-06-19", "Profile updated 2025-06-10"],
  },
  {
    id: "2",
    name: "Bob Singh",
    email: "bob@email.com",
    phone: "+91 9123456780",
    role: "Employee",
    status: "Active",
    flagged: false,
    helpHistory: ["SOS: 2025-06-10"],
    reports: ["Late response"],
    logs: ["Login 2025-06-18"],
  },
  {
    id: "3",
    name: "Carol Lee",
    email: "carol@email.com",
    phone: "+91 9988776655",
    role: "User",
    status: "Suspended",
    flagged: true,
    helpHistory: [],
    reports: ["Abusive language"],
    logs: ["Suspended 2025-06-15"],
  },
  {
    id: "4",
    name: "David Kumar",
    email: "david@email.com",
    phone: "+91 9001122334",
    role: "Employee",
    status: "Active",
    flagged: true,
    helpHistory: ["SOS: 2025-06-12"],
    reports: ["Unprofessional behavior"],
    logs: ["Warning issued 2025-06-13"],
  },
];

const ROLE_COLORS: Record<UserRole | UserStatus, string> = {
  User: "#2563eb",
  Employee: "#22c55e",
  Suspended: "#ef4444",
  Active: "#22c55e",
};

const FILTERS = [
  { label: "All", value: "all" },
  { label: "Employees", value: "employee" },
  { label: "Flagged", value: "flagged" },
];

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
      accessible accessibilityLabel={`Role: ${role}, Status: ${status}`}
    >
      <Text style={{ color: getRoleColor(role, status), fontWeight: "bold", fontSize: 12 }}>
        {status === "Suspended" ? "Suspended" : role}
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
      accessible accessibilityLabel={`Status: ${status}`}
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
  const [tab, setTab] = useState<"Help" | "Reports" | "Logs">("Help");
  if (!user) return null;
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
              name={user.role === "Employee" ? "account-tie" : "account"}
              size={48}
              color={getRoleColor(user.role, user.status)}
            />
            <Text style={{ fontWeight: "bold", fontSize: 20, marginTop: 6 }}>{user.name}</Text>
            <RoleTag role={user.role} status={user.status} />
            <Text style={{ color: "#555", fontSize: 13 }}>{user.email}</Text>
            <Text style={{ color: "#555", fontSize: 13 }}>{user.phone}</Text>
          </View>
          {/* Tabs */}
          <View style={{ flexDirection: "row", justifyContent: "center", marginBottom: 10 }}>
            {(["Help", "Reports", "Logs"] as const).map((t) => (
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
            {tab === "Help" && (
              <CollapsibleSection title="Help History" defaultOpen>
                {user.helpHistory.length === 0 ? (
                  <Text style={{ color: "#888" }}>No help requests.</Text>
                ) : (
                  user.helpHistory.map((h: string, i: number) => (
                    <Text key={i} style={{ color: "#333", marginBottom: 2 }}>
                      {h}
                    </Text>
                  ))
                )}
              </CollapsibleSection>
            )}
            {tab === "Reports" && (
              <CollapsibleSection title="Reported Behavior" defaultOpen>
                {user.reports.length === 0 ? (
                  <Text style={{ color: "#888" }}>No reports.</Text>
                ) : (
                  user.reports.map((r: string, i: number) => (
                    <Text key={i} style={{ color: "#b91c1c", marginBottom: 2 }}>
                      {r}
                    </Text>
                  ))
                )}
              </CollapsibleSection>
            )}
            {tab === "Logs" && (
              <CollapsibleSection title="Activity Logs" defaultOpen>
                {user.logs.length === 0 ? (
                  <Text style={{ color: "#888" }}>No logs.</Text>
                ) : (
                  user.logs.map((l: string, i: number) => (
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
  const [filter, setFilter] = useState<"all" | "employee" | "flagged">("all");
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<User[]>(MOCK_USERS);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);

  // Filter and search
  const filteredUsers = users.filter((u) => {
    if (filter === "employee" && u.role !== "Employee") return false;
    if (filter === "flagged" && !u.flagged) return false;
    if (
      search &&
      !(
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase()) ||
        u.phone.includes(search)
      )
    )
      return false;
    return true;
  });

  // Actions
  const handleSuspend = (user: User) => {
    setUsers((prev) =>
      prev.map((u) =>
        u.id === user.id ? { ...u, status: "Suspended", logs: [...u.logs, "Suspended " + new Date().toISOString().slice(0, 10)] } : u
      )
    );
  };
  const handleDelete = (user: User) => {
    setUsers((prev) => prev.filter((u) => u.id !== user.id));
  };
  const handlePromote = (user: User) => {
    setUsers((prev) =>
      prev.map((u) =>
        u.id === user.id ? { ...u, role: "Employee", logs: [...u.logs, "Promoted " + new Date().toISOString().slice(0, 10)] } : u
      )
    );
  };

  // Accessibility: larger tap targets, readable colors, collapsible sections
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors[colorScheme].background }}>
      <View style={{ padding: isTablet ? 24 : 10, flex: 1 }}>
        {/* Filter bar */}
        <View style={styles.filterBar}>
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f.value}
              onPress={() => setFilter(f.value as "all" | "employee" | "flagged")}
              style={[
                styles.filterBtn,
                filter === f.value && styles.filterBtnActive,
                { minWidth: 90 },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Filter: ${f.label}`}
            >
              <Text style={{ color: filter === f.value ? "#2563eb" : "#555", fontWeight: filter === f.value ? "bold" : "normal" }}>
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
            />
          </View>
        </View>
        {/* User list */}
        <FlatList
          data={filteredUsers}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View
              style={[
                styles.userCard,
                { backgroundColor: "#f8fafc", marginBottom: 14, borderColor: getRoleColor(item.role, item.status) + "33" },
              ]}
              accessible
              accessibilityLabel={`User: ${item.name}, Role: ${item.role}, Status: ${item.status}`}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <StatusDot status={item.status} />
                <Text style={{ fontWeight: "bold", fontSize: 16, color: "#222" }}>{item.name}</Text>
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
                {item.role === "User" && (
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
        {/* Profile modal */}
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
  filterBar: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    flexWrap: "wrap",
    gap: 8,
  },
  filterBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#f1f5f9",
    marginRight: 8,
    marginBottom: 8,
  },
  filterBtnActive: {
    backgroundColor: "#dbeafe",
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