import React, { useEffect, useState } from "react";
import { FlatList } from "react-native";
import ChatMessageBubble from "./ChatMessageBubble";
import { db } from "../lib/firebase";
import { doc, getDoc } from "firebase/firestore";

interface Message {
  id: string;
  senderId: string;
  senderRole: string;
  text?: string;
  createdAt?: any;
  type?: "text" | "image" | "video" | "audio" | "file";
  mediaUrl?: string;
  fileName?: string;
}

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

interface ChatMessageListProps {
  messages: Message[];
  userId: string;
  onUserPress?: (uid: string) => void;
}

export default function ChatMessageList({ messages, userId, onUserPress }: ChatMessageListProps) {
  const [userProfiles, setUserProfiles] = useState<{ [uid: string]: UserProfile }>({});

  useEffect(() => {
    const senderIds = Array.from(new Set(messages.map(m => m.senderId)));
    Promise.all(
      senderIds.map(async (uid) => {
        const userDoc = await getDoc(doc(db, "users", uid));
        return userDoc.exists() ? { uid, profile: userDoc.data() as UserProfile } : null;
      })
    ).then(results => {
      const profiles: { [uid: string]: UserProfile } = {};
      results.forEach(res => {
        if (res) profiles[res.uid] = res.profile;
      });
      setUserProfiles(profiles);
    });
  }, [messages]);

  return (
    <FlatList
      data={messages}
      keyExtractor={item => item.id}
      renderItem={({ item }) => (
        <ChatMessageBubble
          {...item}
          userId={userId}
          senderProfile={userProfiles[item.senderId]}
          onUserPress={onUserPress}
        />
      )}
      inverted
      contentContainerStyle={{ flexGrow: 1, justifyContent: "flex-end" }}
    />
  );
}