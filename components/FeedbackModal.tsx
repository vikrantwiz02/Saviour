import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

export default function FeedbackModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [rating, setRating] = useState<number | null>(null)
  const [comment, setComment] = useState("")

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>Rate Your Experience</Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map(i => (
              <TouchableOpacity
                key={i}
                onPress={() => setRating(i)}
                accessibilityRole="button"
                accessibilityLabel={`Rate ${i} star${i > 1 ? "s" : ""}`}
              >
                <Ionicons
                  name={i <= (rating ?? 0) ? "star" : "star-outline"}
                  size={32}
                  color="#FFD600"
                />
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            style={styles.input}
            placeholder="Leave a comment (optional)"
            value={comment}
            onChangeText={setComment}
            multiline
            accessibilityLabel="Feedback comment"
          />
          <TouchableOpacity style={styles.button} onPress={onClose} accessibilityRole="button" accessibilityLabel="Submit feedback">
            <Text style={styles.buttonText}>Submit</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center" },
  modal: { backgroundColor: "#fff", borderRadius: 16, padding: 24, width: "85%" },
  title: { fontSize: 20, fontWeight: "bold", marginBottom: 16, textAlign: "center" },
  starsRow: { flexDirection: "row", justifyContent: "center", marginBottom: 16 },
  input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 8, padding: 10, minHeight: 60, marginBottom: 16 },
  button: { backgroundColor: "#0a7ea4", borderRadius: 8, padding: 14, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
})