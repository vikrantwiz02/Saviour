import React, { useState, useEffect, useRef } from "react";
import { View, StyleSheet, TextInput, FlatList, KeyboardAvoidingView, Platform, TouchableOpacity, SafeAreaView } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { ChatMessage } from "../Map/types";
import { auth, db } from "@/lib/firebase";
import { getFirestore, collection, addDoc, serverTimestamp, onSnapshot, query, orderBy } from "firebase/firestore";

interface ChatModalProps {
  visible: boolean;
  onClose: () => void;
  sosId: string;
}

export const ChatModal: React.FC<ChatModalProps> = ({
  visible,
  onClose,
  sosId,
}) => {
  const colorScheme = useColorScheme() ?? "light";
  const s = styles(colorScheme);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const user = auth.currentUser;

  useEffect(() => {
    if (!visible || !sosId) return;

    const db = getFirestore();
    const messagesRef = collection(db, "sos_chats", sosId, "messages");
    const messagesQuery = query(messagesRef, orderBy("createdAt", "asc"));

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const newMessages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as ChatMessage[];
      setMessages(newMessages);

      // Scroll to bottom when new messages arrive
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    });

    return unsubscribe;
  }, [visible, sosId]);

  const handleSend = async () => {
    if (!newMessage.trim() || !user || !sosId) return;

    setIsSubmitting(true);
    try {
      const db = getFirestore();
      const messagesRef = collection(db, "sos_chats", sosId, "messages");

      await addDoc(messagesRef, {
        sosId,
        senderId: user.uid,
        senderName: user.displayName || "Anonymous",
        text: newMessage.trim(),
        createdAt: serverTimestamp(),
      });

      setNewMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isCurrentUser = item.senderId === user?.uid;

    return (
      <View style={[
        s.messageContainer,
        isCurrentUser ? s.currentUserMessage : s.otherUserMessage,
      ]}>
        {!isCurrentUser && (
          <ThemedText style={s.senderName}>{item.senderName}</ThemedText>
        )}
        <ThemedView style={[
          s.messageBubble,
          isCurrentUser ? s.currentUserBubble : s.otherUserBubble,
        ]}>
          <ThemedText style={[
            s.messageText,
            isCurrentUser && s.currentUserText,
          ]}>
            {item.text}
          </ThemedText>
        </ThemedView>
        <ThemedText style={s.messageTime}>
          {item.createdAt?.toDate?.().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </ThemedText>
      </View>
    );
  };

  if (!visible) return null;

  return (
    <SafeAreaView style={s.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={s.container}
      >
        <ThemedView style={s.modalContent}>
          <View style={s.header}>
            <ThemedText style={s.title}>Emergency Chat</ThemedText>
            <TouchableOpacity onPress={onClose}>
              <IconSymbol name="xmark" size={24} color={Colors[colorScheme].text} />
            </TouchableOpacity>
          </View>

          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            contentContainerStyle={s.messagesList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
          />

          <View style={s.inputContainer}>
            <TextInput
              style={s.input}
              placeholder="Type a message..."
              placeholderTextColor={Colors[colorScheme].textMuted}
              value={newMessage}
              onChangeText={setNewMessage}
              multiline
            />
            <TouchableOpacity
              style={s.sendButton}
              onPress={handleSend}
              disabled={isSubmitting || !newMessage.trim()}
            >
              <IconSymbol
                name="paperplane.fill"
                size={24}
                color={newMessage.trim() ? "#007AFF" : Colors[colorScheme].textMuted}
              />
            </TouchableOpacity>
          </View>
        </ThemedView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = (colorScheme: "light" | "dark") =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: Colors[colorScheme].background,
    },
    container: {
      flex: 1,
      justifyContent: "flex-end",
    },
    modalContent: {
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 16,
      paddingBottom: Platform.OS === "ios" ? 32 : 16,
      height: "80%",
      backgroundColor: Colors[colorScheme].background,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 16,
    },
    title: {
      fontSize: 20,
      fontWeight: "bold",
    },
    messagesList: {
      paddingVertical: 8,
    },
    messageContainer: {
      marginBottom: 12,
      maxWidth: "80%",
    },
    currentUserMessage: {
      alignSelf: "flex-end",
      alignItems: "flex-end",
    },
    otherUserMessage: {
      alignSelf: "flex-start",
      alignItems: "flex-start",
    },
    senderName: {
      fontSize: 12,
      color: Colors[colorScheme].textMuted,
      marginBottom: 4,
    },
    messageBubble: {
      padding: 12,
      borderRadius: 16,
    },
    currentUserBubble: {
      backgroundColor: "#007AFF",
      borderBottomRightRadius: 4,
    },
    otherUserBubble: {
      backgroundColor: Colors[colorScheme].inputBackground,
      borderBottomLeftRadius: 4,
    },
    messageText: {
      fontSize: 16,
    },
    currentUserText: {
      color: "#fff",
    },
    messageTime: {
      fontSize: 10,
      color: Colors[colorScheme].textMuted,
      marginTop: 4,
    },
    inputContainer: {
      flexDirection: "row",
      alignItems: "center",
      borderTopWidth: 1,
      borderTopColor: Colors[colorScheme].border,
      paddingTop: 12,
    },
    input: {
      flex: 1,
      borderWidth: 1,
      borderColor: Colors[colorScheme].border,
      borderRadius: 20,
      paddingHorizontal: 16,
      paddingVertical: 10,
      marginRight: 8,
      color: Colors[colorScheme].text,
      backgroundColor: Colors[colorScheme].inputBackground,
      maxHeight: 100,
    },
    sendButton: {
      padding: 8,
    },
  });