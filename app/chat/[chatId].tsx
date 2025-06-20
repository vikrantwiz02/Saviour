import ChatThread from "@/components/ChatThread"
import { ThemedView } from "@/components/ThemedView"
import { Stack, useLocalSearchParams } from "expo-router"
import { StyleSheet } from "react-native"

export default function ChatScreen() {
  const { chatId } = useLocalSearchParams<{ chatId: string }>()

  // For demo, allow call for a specific chatId
  const canCall = chatId === "chatMySos1"
  const contactNumber = canCall ? "555-1234" : undefined

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: `Chat` }} />
      <ChatThread contactNumber={contactNumber} canCall={canCall} />
    </ThemedView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f7f7f7",
  },
})