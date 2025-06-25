import { View, Text, TouchableOpacity } from "react-native";
import { useEffect, useState } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export type UserRequest = {
  id: string;
  userId: string;
  city: string;
  emergencyType: string;
  description: string;
  createdAt: any;
  status: string;
  otherPartyName?: string;
  chatId?: string;
};

export default function RequestCard({
  request,
  onOpenChat,
}: {
  request: UserRequest;
  onOpenChat: (chatId: string) => void;
}) {
  const [isPublic, setIsPublic] = useState<boolean>(true);
  const [chatId, setChatId] = useState<string | undefined>(request.chatId);

  useEffect(() => {
    // Fetch chat visibility if chatId exists
    const fetchChat = async () => {
      if (!request.chatId) return;
      const chatDoc = await getDoc(doc(db, "chats", request.chatId));
      if (chatDoc.exists()) {
        setIsPublic(chatDoc.data().isPublic ?? true);
      }
    };
    fetchChat();
  }, [request.chatId]);

  const handleToggleVisibility = async () => {
    if (!chatId) return;
    const chatRef = doc(db, "chats", chatId);
    await updateDoc(chatRef, { isPublic: !isPublic });
    setIsPublic(!isPublic);
  };

  return (
    <View style={{ backgroundColor: "#fff", borderRadius: 8, padding: 14, marginBottom: 12, elevation: 2 }}>
      <Text style={{ fontWeight: "bold", fontSize: 16 }}>{request.emergencyType}</Text>
      <Text>Status: {request.status}</Text>
      <Text>Description: {request.description}</Text>
      <Text>Date: {request.createdAt?.toDate ? request.createdAt.toDate().toLocaleString() : String(request.createdAt)}</Text>
      <TouchableOpacity onPress={() => chatId && onOpenChat(chatId)} style={{ marginTop: 8 }}>
        <Text style={{ color: "#007aff", fontWeight: "bold" }}>Open Chat</Text>
      </TouchableOpacity>
      {chatId && (
        <TouchableOpacity onPress={handleToggleVisibility} style={{ marginTop: 8 }}>
          <Text style={{ color: isPublic ? "#4caf50" : "#e91e63" }}>
            {isPublic ? "Make Chat Private" : "Make Chat Public"}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}