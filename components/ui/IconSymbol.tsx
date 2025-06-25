import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import Ionicons from "@expo/vector-icons/Ionicons";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import type { SymbolWeight } from "expo-symbols";
import type { ComponentProps } from "react";
import type { OpaqueColorValue, StyleProp, TextStyle } from "react-native";

type IconSymbolName = string;

// Main MaterialIcons mapping
const MATERIAL_MAPPING: Record<string, ComponentProps<typeof MaterialIcons>["name"]> = {
  "house.fill": "home",
  "paperplane.fill": "send",
  "chevron.left.forwardslash.chevron.right": "code",
  "chevron.right": "chevron-right",
  "envelope.fill": "email",
  "lock.fill": "lock",
  "lock.shield.fill": "security",
  "person.fill": "person",
  "location.fill": "location-on",
  "clock.fill": "access-time",
  "hand.raised.fill": "pan-tool",
  "line.3.horizontal.decrease.circle.fill": "filter-list",
  "shield.lefthalf.filled.slash": "gpp-bad",
  "checkmark.circle.fill": "check-circle",
  "xmark.circle.fill": "cancel",
  "camera.fill": "photo-camera",
  "map.fill": "map",
  "list.bullet.below.rectangle": "list-alt",
  "bell.badge.fill": "notifications-active",
  xmark: "close",
  "exclamationmark.triangle.fill": "warning",
  "text.bubble.fill": "chat-bubble",
  "bolt.horizontal.circle.fill": "offline-bolt",
  "phone.fill": "phone",
  "doc.text.magnifyingglass": "find-in-page",
  "circle.fill": "circle",
  "message.fill": "message",
  "location.circle.fill": "my-location",
  "cross.case.fill": "medical-services",
  "plus.circle.fill": "add-circle", // <-- Added mapping
  "plus": "add", // <-- Added for convenience
  // Add more as needed
};

// Extra mapping for icons not in MaterialIcons
const EXTRA_MAPPING: Record<
  string,
  | { lib: typeof Ionicons | typeof FontAwesome | typeof MaterialCommunityIcons; name: string }
  | undefined
> = {
  // Your custom mappings for warnings and SF Symbols
  stethoscope: { lib: MaterialCommunityIcons, name: "stethoscope" },
  "flame.fill": { lib: MaterialCommunityIcons, name: "fire" },
  "shield.lefthalf.filled": { lib: MaterialCommunityIcons, name: "shield-half-full" },
  "car.fill": { lib: MaterialCommunityIcons, name: "car" },
  "person.2.slash.fill": { lib: MaterialCommunityIcons, name: "account-cancel" },
  tornado: { lib: MaterialCommunityIcons, name: "weather-tornado" },
  "person.fill.questionmark": { lib: MaterialCommunityIcons, name: "account-question" },
  "megaphone.fill": { lib: MaterialCommunityIcons, name: "bullhorn" },
  circle: { lib: Ionicons, name: "ellipse-outline" },
  "bubble.left.fill": { lib: Ionicons, name: "chatbubble-ellipses" },
  "xmark": { lib: Ionicons, name: "close" },
  "exclamationmark.triangle.fill": { lib: Ionicons, name: "warning" },
  "location": { lib: Ionicons, name: "location-sharp" },
  "phone": { lib: Ionicons, name: "call" },
  "calendar": { lib: Ionicons, name: "calendar" },
  "exclamationmark.circle": { lib: Ionicons, name: "alert-circle" },
  "medkit": { lib: Ionicons, name: "medkit" },
  "checkmark": { lib: Ionicons, name: "checkmark" },
  "envelope.fill": { lib: FontAwesome, name: "envelope" },
  "lock.shield.fill": { lib: MaterialCommunityIcons, name: "shield-lock" },
  "cross.case.fill": { lib: Ionicons, name: "medkit" },
  // Add more as needed
};

export function IconSymbol({
  name,
  size = 24,
  color,
  style,
  weight,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  const extra = EXTRA_MAPPING[name];
  if (extra) {
    const { lib: Lib, name: iconName } = extra;
    return <Lib color={color} size={size} name={iconName as any} style={style} />;
  }
  const iconName = MATERIAL_MAPPING[name] || "help-outline";
  if (!MATERIAL_MAPPING[name] && !EXTRA_MAPPING[name]) {
    console.warn(`IconSymbol: No mapping found for SF Symbol "${name}". Falling back to "${iconName}".`);
  }
    return <MaterialIcons color={color} size={size} name={iconName} style={style} />;
  }