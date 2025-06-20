"use client"

import RequestCard, { UserRequest } from "@/components/RequestCard"
import { useRouter } from "expo-router"
import { FlatList } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

// Mock Data
const MOCK_MY_SOS_ALERTS: UserRequest[] = [
  {
    id: "mySos1",
    type: "SOS Sent",
    emergencyType: "Medical",
    timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000),
    status: "Responder En Route",
    timeline: [
      { action: "Alert Sent", time: new Date(Date.now() - 1 * 60 * 60 * 1000) },
      { action: "Responder 'Medic Unit 1' Accepted", time: new Date(Date.now() - 55 * 60 * 1000) },
      { action: "Responder En Route", time: new Date(Date.now() - 50 * 60 * 1000) },
    ],
    otherPartyName: "Medic Unit 1",
    chatId: "chatMySos1",
  },
  {
    id: "mySos2",
    type: "SOS Sent",
    emergencyType: "Fire",
    timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000),
    status: "Completed",
    timeline: [
      { action: "Alert Sent", time: new Date(Date.now() - 3 * 60 * 60 * 1000) },
      { action: "Responder 'Fire Truck 5' Accepted", time: new Date(Date.now() - 2.9 * 60 * 60 * 1000) },
      { action: "Assistance Provided", time: new Date(Date.now() - 2 * 60 * 60 * 1000) },
      { action: "Case Closed", time: new Date(Date.now() - 1.9 * 60 * 60 * 1000) },
    ],
    otherPartyName: "Fire Truck 5",
    chatId: "chatMySos2",
  },
]

export default function RequestsScreen() {
  const router = useRouter()

  const handleOpenChat = (chatId: string) => {
    router.push(`/chat/${chatId}`)
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f7f7f7" }} edges={["top", "left", "right"]}>
      <FlatList
        data={MOCK_MY_SOS_ALERTS}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <RequestCard request={item} onOpenChat={handleOpenChat} />
        )}
        contentContainerStyle={{ padding: 12, paddingBottom: 24 }}
      />
    </SafeAreaView>
  )
}