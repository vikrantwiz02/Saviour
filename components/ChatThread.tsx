import { Ionicons } from "@expo/vector-icons"
import React, { useEffect, useRef, useState } from "react"
import {
    ActivityIndicator,
    FlatList,
    KeyboardAvoidingView,
    Linking,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native"

const mockMessages = [
  { id: "1", text: "Hi, I need help!", timestamp: "10:00", sender: "user", read: true },
  { id: "2", text: "Help is on the way!", timestamp: "10:01", sender: "responder", read: true },
  { id: "3", text: "Thank you!", timestamp: "10:02", sender: "user", read: false },
]

export default function ChatThread({
  contactNumber,
  canCall = false,
}: {
  contactNumber?: string
  canCall?: boolean
}) {
  const [messages, setMessages] = useState(mockMessages)
  const [input, setInput] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const flatListRef = useRef<FlatList>(null)

  const sendMessage = () => {
    if (!input.trim()) return
    setMessages([
      ...messages,
      {
        id: Date.now().toString(),
        text: input,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        sender: "user",
        read: false,
      },
    ])
    setInput("")
    setIsTyping(true)
    setTimeout(() => setIsTyping(false), 1200)
  }

  // Scroll to bottom when new message is sent
  useEffect(() => {
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true })
  }, [messages])

  const renderMessage = ({ item }: { item: typeof mockMessages[0] }) => {
    const isUser = item.sender === "user"
    return (
      <View
        style={[
          styles.messageRow,
          isUser ? styles.userRow : styles.responderRow,
        ]}
      >
        <View
          style={[
            styles.bubble,
            isUser ? styles.userBubble : styles.responderBubble,
          ]}
        >
          <Text style={[styles.msgText, isUser ? styles.userText : styles.responderText]}>
            {item.text}
          </Text>
          <View style={styles.metaRow}>
            <Text style={[styles.timestamp, isUser ? styles.userMeta : styles.responderMeta]}>
              {item.timestamp}
            </Text>
            {isUser && (
              <Ionicons
                name={item.read ? "checkmark-done" : "checkmark"}
                size={15}
                color={item.read ? "#4caf50" : "#bbb"}
                style={{ marginLeft: 4 }}
              />
            )}
          </View>
        </View>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <View style={styles.flex}>
        <FlatList
          ref={flatListRef}
          data={[...messages].reverse()}
          keyExtractor={item => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.listContent}
          inverted
          showsVerticalScrollIndicator={false}
        />

        {isTyping && (
          <View style={styles.typingIndicator}>
            <ActivityIndicator size="small" color="#007AFF" />
            <Text style={{ marginLeft: 8, color: "#888" }}>Responder is typing...</Text>
          </View>
        )}

        <View style={styles.inputBarShadow}>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={input}
              onChangeText={setInput}
              placeholder="Type a message..."
              placeholderTextColor="#aaa"
              returnKeyType="send"
              onSubmitEditing={sendMessage}
            />
            <TouchableOpacity style={styles.sendBtn} onPress={sendMessage}>
              <Ionicons name="send" size={22} color="#fff" />
            </TouchableOpacity>
            {canCall && contactNumber && (
              <TouchableOpacity
                style={styles.callBtn}
                onPress={() => Linking.openURL(`tel:${contactNumber}`)}
              >
                <Ionicons name="call" size={22} color="#fff" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#fafbfc" },
  listContent: {
    padding: 16,
    paddingBottom: 80,
  },
  messageRow: {
    marginVertical: 4,
    flexDirection: "row",
    alignItems: "flex-end",
  },
  userRow: {
    justifyContent: "flex-end",
    alignSelf: "flex-end",
  },
  responderRow: {
    justifyContent: "flex-start",
    alignSelf: "flex-start",
  },
  bubble: {
    maxWidth: "80%",
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 2,
    elevation: 1,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  userBubble: {
    backgroundColor: "#1976D2",
    borderBottomRightRadius: 6,
    marginLeft: 40,
  },
  responderBubble: {
    backgroundColor: "#f0f1f3",
    borderBottomLeftRadius: 6,
    marginRight: 40,
  },
  msgText: {
    fontSize: 15,
    marginBottom: 4,
  },
  userText: {
    color: "#fff",
  },
  responderText: {
    color: "#222",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-end",
  },
  timestamp: {
    fontSize: 11,
    marginTop: 2,
  },
  userMeta: {
    color: "#cbe6ff",
  },
  responderMeta: {
    color: "#888",
  },
  typingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 18,
    marginBottom: 8,
  },
  inputBarShadow: {
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: -2 },
    elevation: 8,
    borderTopLeftRadius: 20,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    paddingBottom: Platform.OS === "ios" ? 24 : 10,
  },
  input: {
    flex: 1,
    backgroundColor: "#f0f0f0",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    marginRight: 8,
    color: "#222",
  },
  sendBtn: {
    backgroundColor: "#1976D2",
    borderRadius: 20,
    padding: 10,
    marginRight: 4,
  },
  callBtn: {
    backgroundColor: "#4caf50",
    borderRadius: 20,
    padding: 10,
  },
})