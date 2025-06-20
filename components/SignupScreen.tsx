"use client"

import { ThemedText } from "@/components/ThemedText"
import { ThemedView } from "@/components/ThemedView"
import { Colors } from "@/constants/Colors"
import { useColorScheme } from "@/hooks/useColorScheme"
import { useRouter } from "expo-router"
import { useState } from "react"
import {
    Alert,
    Image,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native"
import { IconSymbol } from "./ui/IconSymbol"

// Placeholder for actual social signup functions
const handleSocialSignup = (provider: string) => {
  Alert.alert("Social Signup", `Attempting to sign up with ${provider}... (UI only)`)
}

export default function SignupScreen() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const colorScheme = useColorScheme() ?? "light"
  const router = useRouter()

  const handleSignup = () => {
    if (email.trim() === "" || password.trim() === "" || confirmPassword.trim() === "") {
      Alert.alert("Signup Failed", "Please fill in all fields.")
      return
    }
    if (password !== confirmPassword) {
      Alert.alert("Signup Failed", "Passwords do not match.")
      return
    }
    // Role is now hardcoded to "users" for all signups
    const role = "users"
    console.log("Signup attempt with:", { email, password, role })
    Alert.alert("Signup Successful", `Account created for ${email}! Please login.`)
    router.replace("/login")
  }

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: "center",
      padding: 20,
      backgroundColor: Colors[colorScheme].background,
    },
    title: {
      fontSize: 32,
      fontWeight: "bold",
      textAlign: "center",
      marginBottom: 10,
      color: Colors[colorScheme].text,
    },
    subtitle: {
      textAlign: "center",
      marginBottom: 30, // Increased margin to compensate for removed role selector
      fontSize: 16,
      color: Colors[colorScheme].textMuted,
    },
    inputContainer: {
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderColor: Colors[colorScheme].border,
      borderRadius: 8,
      marginBottom: 15,
      paddingHorizontal: 10,
      backgroundColor: Colors[colorScheme].inputBackground,
    },
    icon: {
      marginRight: 10,
    },
    input: {
      flex: 1,
      height: 50,
      color: Colors[colorScheme].text,
      fontSize: 16,
    },
    button: {
      backgroundColor: Colors[colorScheme].tint,
      paddingVertical: 15,
      borderRadius: 8,
      alignItems: "center",
      marginBottom: 15,
    },
    buttonText: {
      color: Colors[colorScheme].background,
      fontSize: 18,
      fontWeight: "bold",
    },
    dividerContainer: {
      flexDirection: "row",
      alignItems: "center",
      marginVertical: 15,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: Colors[colorScheme].border,
    },
    dividerText: {
      marginHorizontal: 10,
      color: Colors[colorScheme].textMuted,
      fontSize: 14,
    },
    socialLoginContainer: {
      flexDirection: "row",
      justifyContent: "center",
      marginBottom: 20,
    },
    socialButton: {
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 8,
      padding: 12,
      marginHorizontal: 10,
      width: 50,
      height: 50,
      backgroundColor: Colors[colorScheme].inputBackground,
    },
    socialLogo: {
      width: 24,
      height: 24,
    },
    linkText: {
      textAlign: "center",
      color: Colors[colorScheme].tint,
      fontSize: 16,
    },
  })

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
      <ThemedView style={styles.container}>
        <ThemedText style={styles.title}>Create Account</ThemedText>
        <ThemedText style={styles.subtitle}>Join us today!</ThemedText>

        <View style={styles.inputContainer}>
          <IconSymbol name="envelope.fill" size={20} color={Colors[colorScheme].icon} style={styles.icon} />
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={Colors[colorScheme].textMuted}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputContainer}>
          <IconSymbol name="lock.fill" size={20} color={Colors[colorScheme].icon} style={styles.icon} />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={Colors[colorScheme].textMuted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        <View style={styles.inputContainer}>
          <IconSymbol name="lock.shield.fill" size={20} color={Colors[colorScheme].icon} style={styles.icon} />
          <TextInput
            style={styles.input}
            placeholder="Confirm Password"
            placeholderTextColor={Colors[colorScheme].textMuted}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />
        </View>

        <TouchableOpacity style={styles.button} onPress={handleSignup}>
          <ThemedText style={styles.buttonText}>Sign Up</ThemedText>
        </TouchableOpacity>

        <View style={styles.dividerContainer}>
          <View style={styles.dividerLine} />
          <ThemedText style={styles.dividerText}>Or sign up with</ThemedText>
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.socialLoginContainer}>
          <TouchableOpacity style={styles.socialButton} onPress={() => handleSocialSignup("Google")}>
            <Image source={require("../assets/images/google-logo.png")} style={styles.socialLogo} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.socialButton} onPress={() => handleSocialSignup("Microsoft")}>
            <Image source={require("../assets/images/microsoft-logo.png")} style={styles.socialLogo} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.socialButton} onPress={() => handleSocialSignup("Apple")}>
            <Image source={require("../assets/images/apple-logo.png")} style={styles.socialLogo} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => router.push("/login")}>
          <ThemedText style={styles.linkText}>Already have an account? Log In</ThemedText>
        </TouchableOpacity>
      </ThemedView>
    </KeyboardAvoidingView>
  )
}
