import React from "react";
import { View, Text, TouchableOpacity, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface UserProfile {
  name: string;
  email: string;
  avatarUrl?: string;
  mobile?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  role: string;
  [key: string]: any;
}

interface ChatMessageBubbleProps {
  senderId: string;
  senderRole: string;
  userId: string;
  senderProfile?: UserProfile;
  text?: string;
  createdAt?: any;
  type?: "text" | "image" | "video" | "audio" | "file";
  mediaUrl?: string;
  fileName?: string;
  onUserPress?: (uid: string) => void;
}

export default function ChatMessageBubble({
  senderId,
  senderRole,
  userId,
  senderProfile,
  text,
  createdAt,
  type = "text",
  mediaUrl,
  fileName,
  onUserPress,
}: ChatMessageBubbleProps) {
  const isMe = senderId === userId;
  const displayName = isMe
    ? "You"
    : senderProfile?.name || senderProfile?.email || senderRole.charAt(0).toUpperCase() + senderRole.slice(1);
  const avatarUrl = senderProfile?.avatarUrl;

  return (
    <View style={{
      alignSelf: isMe ? "flex-end" : "flex-start",
      backgroundColor: isMe ? "#dcf8c6" : "#fff",
      borderRadius: 16,
      marginVertical: 2,
      marginHorizontal: 4,
      padding: 10,
      maxWidth: "80%",
      shadowColor: "#000",
      shadowOpacity: 0.04,
      shadowRadius: 2,
      elevation: 1,
      flexDirection: "row",
      alignItems: "flex-start"
    }}>
      {!isMe && (
        <TouchableOpacity onPress={() => onUserPress && onUserPress(senderId)}>
          {avatarUrl ? (
            <Image
              source={{ uri: avatarUrl }}
              style={{ width: 32, height: 32, borderRadius: 16, marginRight: 8 }}
            />
          ) : (
            <Ionicons name="person-circle" size={32} color="#bbb" style={{ marginRight: 8 }} />
          )}
        </TouchableOpacity>
      )}
      <View style={{ flex: 1 }}>
        <TouchableOpacity
          disabled={isMe}
          onPress={() => onUserPress && onUserPress(senderId)}
        >
          <Text style={{ fontWeight: "bold", color: isMe ? "#075e54" : "#007aff", fontSize: 13 }}>
            {displayName}
          </Text>
        </TouchableOpacity>
        {type === "text" && <Text style={{ fontSize: 16, marginVertical: 2 }}>{text}</Text>}
        <Text style={{ fontSize: 10, color: "#888", alignSelf: "flex-end" }}>
          {createdAt?.toDate ? createdAt.toDate().toLocaleTimeString() : ""}
        </Text>
      </View>
    </View>
  );
}