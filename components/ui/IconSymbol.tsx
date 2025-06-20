// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from "@expo/vector-icons/MaterialIcons"
import type { SymbolViewProps, SymbolWeight } from "expo-symbols"
import type { ComponentProps } from "react"
import type { OpaqueColorValue, StyleProp, TextStyle } from "react-native"

type IconMapping = Record<SymbolViewProps["name"], ComponentProps<typeof MaterialIcons>["name"]>
type IconSymbolName = keyof typeof MAPPING

const MAPPING = {
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
  "list.bullet.below.rectangle": "list-alt", // Or 'view-list'
  "bell.badge.fill": "notifications-active", // Or 'notifications'
  xmark: "close",
  "exclamationmark.triangle.fill": "warning",
  "text.bubble.fill": "chat-bubble",
  "bolt.horizontal.circle.fill": "offline-bolt", // Or 'flash-on' for urgency
  "phone.fill": "phone",
  "doc.text.magnifyingglass": "find-in-page", // Or 'search'
  "circle.fill": "circle",
  "message.fill": "message",
  "location.circle.fill": "my-location",
} as IconMapping

export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName
  size?: number
  color: string | OpaqueColorValue
  style?: StyleProp<TextStyle>
  weight?: SymbolWeight
}) {
  const iconName = MAPPING[name] || "help-outline"
  if (!MAPPING[name]) {
    console.warn(`IconSymbol: No mapping found for SF Symbol "${name}". Falling back to "${iconName}".`)
  }
  return <MaterialIcons color={color} size={size} name={iconName} style={style} />
}
