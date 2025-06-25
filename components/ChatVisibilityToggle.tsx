import { TouchableOpacity, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface ChatVisibilityToggleProps {
  isPublic: boolean;
  onToggle: () => void;
}

export default function ChatVisibilityToggle({ isPublic, onToggle }: ChatVisibilityToggleProps) {
  return (
    <TouchableOpacity onPress={onToggle} style={{ flexDirection: "row", alignItems: "center", marginLeft: 12 }}>
      <Ionicons name={isPublic ? "eye" : "eye-off"} size={20} color={isPublic ? "#4caf50" : "#e91e63"} />
      <Text style={{ color: isPublic ? "#4caf50" : "#e91e63", marginLeft: 4, fontWeight: "bold" }}>
        {isPublic ? "Public" : "Private"}
      </Text>
    </TouchableOpacity>
  );
}