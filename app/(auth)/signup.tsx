"use client"

import { useState, useEffect } from "react"
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  ScrollView,
} from "react-native"
import { useRouter } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import { Colors } from "@/constants/Colors"
import { useColorScheme } from "@/hooks/useColorScheme"
import { ThemedText } from "@/components/ThemedText"
import { ThemedView } from "@/components/ThemedView"
import { IconSymbol } from "../../components/ui/IconSymbol"
import { createUserWithEmailAndPassword, GoogleAuthProvider, signInWithCredential } from "firebase/auth"
import { doc, setDoc, getDoc } from "firebase/firestore"
import { auth, db } from "../../lib/firebase"
import * as GoogleAuth from "expo-auth-session/providers/google"
import * as WebBrowser from "expo-web-browser"

const GOOGLE_WEB_CLIENT_ID = "1012376360740-7egjvkecijotophpbhnsvc5flbsr75vm.apps.googleusercontent.com"

WebBrowser.maybeCompleteAuthSession()

export default function SignupScreen() {
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [city, setCity] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [isGoogleSignup, setIsGoogleSignup] = useState(false)
  const colorScheme = useColorScheme() ?? "light"
  const router = useRouter()

  // Google AuthSession
  const [request, response, promptAsync] = GoogleAuth.useAuthRequest({
    clientId: GOOGLE_WEB_CLIENT_ID,
  })

  useEffect(() => {
    const doGoogleLogin = async () => {
      if (response?.type === "success" && response.authentication?.accessToken) {
        setGoogleLoading(true)
        try {
          const credential = GoogleAuthProvider.credential(null, response.authentication.accessToken)
          const userCredential = await signInWithCredential(auth, credential)
          if (!userCredential.user) {
            Alert.alert("Signup Failed", "No user returned from authentication.")
            setGoogleLoading(false)
            return
          }
          const userDocRef = doc(db, "users", userCredential.user.uid)
          const userDocSnap = await getDoc(userDocRef)
          if (userDocSnap.exists()) {
            Alert.alert("Welcome!", "Logged in with Google.")
            router.replace("/(tabs)")
          } else {
            setEmail(userCredential.user.email || "")
            setFullName(userCredential.user.displayName || "")
            setIsGoogleSignup(true)
            Alert.alert("Almost done!", "Please fill in the required details to complete your signup.")
          }
        } catch (error: any) {
          console.error(error)
          Alert.alert("Google Signup Failed", "Could not sign up with Google.")
        } finally {
          setGoogleLoading(false)
        }
      }
    }
    doGoogleLogin()
  }, [response])

  const handleSignup = async () => {
    if (!fullName.trim() || !email.trim() || !city.trim() || (!isGoogleSignup && !password.trim())) {
      Alert.alert("Signup Failed", "Please fill in all required fields.")
      return
    }
    if (!isGoogleSignup && password.length < 8) {
      Alert.alert("Signup Failed", "Password must be at least 8 characters.")
      return
    }
    setLoading(true)
    try {
      let userCredential
      if (isGoogleSignup) {
        userCredential = { user: auth.currentUser }
      } else {
        userCredential = await createUserWithEmailAndPassword(auth, email, password)
      }
      if (!userCredential.user) {
        Alert.alert("Signup Failed", "No user returned from authentication.")
        setLoading(false)
        return
      }
      try {
        await setDoc(doc(db, "users", userCredential.user.uid), {
          fullName,
          email,
          city,
          role: "users",
          createdAt: new Date().toISOString(),
        })
        Alert.alert("Signup Successful", `Account created for ${email}!`)
        router.replace("/login")
      } catch (firestoreError: any) {
        if (!isGoogleSignup && userCredential.user) {
          await userCredential.user.delete()
        }
        Alert.alert("Signup Failed", "Account created in Auth, but failed to save user profile. Please try again.")
      }
    } catch (error: any) {
      let message = "Signup failed. Please try again."
      if (error.code === "auth/email-already-in-use") message = "This email is already registered."
      if (error.code === "auth/invalid-email") message = "Invalid email address."
      if (error.code === "auth/weak-password") message = "Password should be at least 6 characters."
      Alert.alert("Signup Failed", message)
    } finally {
      setLoading(false)
    }
  }

  const styles = StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: Colors[colorScheme].background,
    },
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
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
          <ThemedView style={styles.container}>
            <ThemedText style={styles.title}>Create Account</ThemedText>
            <ThemedText style={styles.subtitle}>Join us today!</ThemedText>

            {/* Full Name */}
            <View style={styles.inputContainer}>
              <IconSymbol name="person.fill" size={20} color={Colors[colorScheme].icon} style={styles.icon} />
              <TextInput
                style={styles.input}
                placeholder="Full Name"
                placeholderTextColor={Colors[colorScheme].textMuted}
                value={fullName}
                onChangeText={setFullName}
              />
            </View>

            {/* Email */}
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
                editable={!isGoogleSignup}
              />
            </View>

            {/* City */}
            <View style={styles.inputContainer}>
              <IconSymbol name="location" size={20} color={Colors[colorScheme].icon} style={styles.icon} />
              <TextInput
                style={styles.input}
                placeholder="City"
                placeholderTextColor={Colors[colorScheme].textMuted}
                value={city}
                onChangeText={setCity}
              />
            </View>

            {/* Password */}
            {!isGoogleSignup && (
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
            )}

            <TouchableOpacity
              style={styles.button}
              onPress={handleSignup}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={Colors[colorScheme].background} />
              ) : (
                <ThemedText style={styles.buttonText}>
                  {isGoogleSignup ? "Complete Signup" : "Sign Up"}
                </ThemedText>
              )}
            </TouchableOpacity>

            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <ThemedText style={styles.dividerText}>Or sign up with</ThemedText>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.socialLoginContainer}>
              <TouchableOpacity
                style={styles.socialButton}
                onPress={() => promptAsync()}
                disabled={googleLoading || !request}
              >
                {googleLoading ? (
                  <ActivityIndicator color={Colors[colorScheme].tint} />
                ) : (
                  <Image source={require("../../assets/images/google-logo.png")} style={styles.socialLogo} />
                )}
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={() => router.push("/login")}>
              <ThemedText style={styles.linkText}>Already have an account? Log In</ThemedText>
            </TouchableOpacity>
          </ThemedView>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}