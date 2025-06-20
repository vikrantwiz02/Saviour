import SignupScreen from "@/components/SignupScreen"; // Correctly import the default export
import { Stack } from "expo-router"

export default function SignupRoute() {
  return (
    <>
      <Stack.Screen options={{ title: "Sign Up", headerShown: false }} />
      <SignupScreen />
    </>
  )
}
