import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

interface ChatHeaderProps {
  title: string;
  isPublic: boolean;
  onToggleVisibility: () => void;
  canToggle: boolean;
  city: string | null;
}

export default function ChatHeader({
  title,
  isPublic,
  onToggleVisibility,
  canToggle,
  city,
}: ChatHeaderProps) {
  return (
    <SafeAreaView edges={["top"]} style={{ backgroundColor: "#fff" }}>
      <View style={{
        flexDirection: "row",
        alignItems: "center",
        padding: 12,
        borderBottomWidth: 1,
        borderColor: "#eee"
      }}>
        <Ionicons name="chatbubbles" size={22} color="#007aff" />
        <Text style={{ fontWeight: "bold", fontSize: 18, marginLeft: 8, flex: 1 }}>
          {title} <Text style={{ color: "#888", fontSize: 13 }}>({city ?? "Unknown"})</Text>
        </Text>
        {canToggle && (
          <TouchableOpacity onPress={onToggleVisibility} style={{ flexDirection: "row", alignItems: "center" }}>
            <Ionicons name={isPublic ? "eye" : "eye-off"} size={20} color={isPublic ? "#4caf50" : "#e91e63"} />
            <Text style={{ color: isPublic ? "#4caf50" : "#e91e63", marginLeft: 4, fontWeight: "bold" }}>
              {isPublic ? "Public" : "Private"}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}