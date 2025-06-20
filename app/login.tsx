import LoginScreenComponent from "@/components/LoginScreen"
import { Stack } from "expo-router"

export default function LoginRoute() {
  return (
    <>
      <Stack.Screen options={{ title: "Login", headerShown: false }} />
      <LoginScreenComponent />
    </>
  )
}
