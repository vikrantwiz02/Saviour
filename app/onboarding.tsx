import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import React, { useRef, useState } from "react"
import { Dimensions, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

const { width } = Dimensions.get("window")
const slides = [
  {
    key: "1",
    title: "Welcome to Saviour",
    description: "Your safety companion. Raise or respond to SOS alerts in your community.",
    icon: "shield-checkmark",
  },
  {
    key: "2",
    title: "Raise or Respond",
    description: "Quickly raise an SOS or help others nearby. Stay connected and make a difference.",
    icon: "megaphone",
  },
  {
    key: "3",
    title: "Permissions",
    description: "We’ll need your location and notification permissions to keep you safe and informed.",
    icon: "location",
  },
]

export default function OnboardingScreen() {
  const [index, setIndex] = useState(0)
  const flatListRef = useRef<FlatList>(null)
  const router = useRouter()

  const handleNext = () => {
    if (index < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: index + 1 })
      setIndex(index + 1)
    } else {
      // Mark onboarding as complete (UI only)
      router.replace("/login")
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        ref={flatListRef}
        data={slides}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={item => item.key}
        onMomentumScrollEnd={e => {
          const newIndex = Math.round(e.nativeEvent.contentOffset.x / width)
          setIndex(newIndex)
        }}
        renderItem={({ item }) => (
          <View style={styles.slide}>
            <Ionicons name={item.icon as any} size={80} color="#0a7ea4" accessibilityLabel={item.title + " icon"} />
            <Text style={styles.title} accessibilityRole="header">{item.title}</Text>
            <Text style={styles.description}>{item.description}</Text>
          </View>
        )}
      />
      <View style={styles.dots}>
        {slides.map((_, i) => (
          <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
        ))}
      </View>
      <TouchableOpacity
        style={styles.button}
        onPress={handleNext}
        accessibilityRole="button"
        accessibilityLabel={index === slides.length - 1 ? "Get Started" : "Next"}
      >
        <Text style={styles.buttonText}>{index === slides.length - 1 ? "Get Started" : "Next"}</Text>
      </TouchableOpacity>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff", justifyContent: "center" },
  slide: { width, alignItems: "center", justifyContent: "center", padding: 30 },
  title: { fontSize: 28, fontWeight: "bold", marginBottom: 16, textAlign: "center" },
  description: { fontSize: 18, color: "#555", textAlign: "center", marginBottom: 30 },
  dots: { flexDirection: "row", justifyContent: "center", marginBottom: 20 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#eee", margin: 5 },
  dotActive: { backgroundColor: "#0a7ea4" },
  button: { backgroundColor: "#0a7ea4", padding: 16, borderRadius: 30, alignSelf: "center", minWidth: 180 },
  buttonText: { color: "#fff", fontSize: 18, textAlign: "center", fontWeight: "bold" },
})