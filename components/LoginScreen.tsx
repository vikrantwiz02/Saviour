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

const USER_ROLES = ["users", "employee", "admin"] as const
type UserRole = (typeof USER_ROLES)[number]

// Placeholder for actual social login functions
const handleSocialLogin = (provider: string) => {
  Alert.alert("Social Login", `Attempting to log in with ${provider}... (UI only)`)
}

export default function LoginScreen() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [selectedRole, setSelectedRole] = useState<UserRole>("users")
  const colorScheme = useColorScheme() ?? "light"
  const router = useRouter()

  const handleLogin = () => {
    if (email.trim() !== "" && password.trim() !== "") {
      console.log("Login attempt with:", { email, password, role: selectedRole })
      Alert.alert("Login Successful", `Welcome back, ${selectedRole} ${email}!`)
      if (selectedRole === "admin") {
        router.replace("/Admin" as any)
      } else if (selectedRole === "employee") {
        router.replace("/Employee" as any)
      } else {
        router.replace("/(tabs)")
      }
    } else {
      Alert.alert("Login Failed", "Please enter email, password, and select a role.")
    }
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
      marginBottom: 20,
      fontSize: 16,
      color: Colors[colorScheme].textMuted,
    },
    roleSelectorContainer: {
      flexDirection: "row",
      justifyContent: "space-around",
      marginBottom: 20,
      backgroundColor: Colors[colorScheme].inputBackground,
      borderRadius: 8,
      padding: 5,
    },
    roleButton: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 6,
      alignItems: "center",
      marginHorizontal: 2,
    },
    roleButtonSelected: {
      backgroundColor: Colors[colorScheme].tint,
    },
    roleButtonText: {
      fontSize: 14,
      fontWeight: "600",
      color: Colors[colorScheme].textMuted,
    },
    roleButtonTextSelected: {
      color: Colors[colorScheme].background,
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
        <ThemedText style={styles.title}>Welcome Back!</ThemedText>
        <ThemedText style={styles.subtitle}>Sign in to continue as</ThemedText>

        <View style={styles.roleSelectorContainer}>
          {USER_ROLES.map((role) => (
            <TouchableOpacity
              key={role}
              style={[styles.roleButton, selectedRole === role && styles.roleButtonSelected]}
              onPress={() => setSelectedRole(role)}
            >
              <ThemedText style={[styles.roleButtonText, selectedRole === role && styles.roleButtonTextSelected]}>
                {role === "users"
                  ? "User"
                  : role.charAt(0).toUpperCase() + role.slice(1)}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </View>

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

        <TouchableOpacity style={styles.button} onPress={handleLogin}>
          <ThemedText style={styles.buttonText}>
            Login as{" "}
            {selectedRole === "users"
              ? "User"
              : selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)}
          </ThemedText>
        </TouchableOpacity>

        <View style={styles.dividerContainer}>
          <View style={styles.dividerLine} />
          <ThemedText style={styles.dividerText}>Or continue with</ThemedText>
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.socialLoginContainer}>
          <TouchableOpacity style={styles.socialButton} onPress={() => handleSocialLogin("Google")}>
            <Image source={require("../assets/images/google-logo.png")} style={styles.socialLogo} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.socialButton} onPress={() => handleSocialLogin("Microsoft")}>
            <Image source={require("../assets/images/microsoft-logo.png")} style={styles.socialLogo} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.socialButton} onPress={() => handleSocialLogin("Apple")}>
            <Image source={require("../assets/images/apple-logo.png")} style={styles.socialLogo} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => router.push("/signup")}>
          <ThemedText style={styles.linkText}>Don't have an account? Sign Up</ThemedText>
        </TouchableOpacity>
      </ThemedView>
    </KeyboardAvoidingView>
  )
}