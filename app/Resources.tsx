import React, { useState } from "react";
import { View, Text, FlatList, TouchableOpacity, Modal, TextInput, Alert, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColorScheme } from "@/hooks/useColorScheme";

const mockResources = [
  { id: "1", name: "Water Bottles", available: 120 },
  { id: "2", name: "Blankets", available: 45 },
  { id: "3", name: "First Aid Kits", available: 30 },
  { id: "4", name: "Food Packets", available: 80 },
];

export default function ResourcesScreen() {
  const colorScheme = useColorScheme() ?? "light";
  const [resources, setResources] = useState(mockResources);
  const [modalVisible, setModalVisible] = useState(false);
  const [resourceName, setResourceName] = useState("");
  const [quantity, setQuantity] = useState("");

  const handleRequest = () => {
    if (!resourceName || !quantity) {
      Alert.alert("Please fill all fields");
      return;
    }
    Alert.alert("Request Sent", `Requested ${quantity} of ${resourceName}`);
    setModalVisible(false);
    setResourceName("");
    setQuantity("");
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colorScheme === "dark" ? "#181a20" : "#fff" }}>
      <View style={{ padding: 20, flex: 1 }}>
        <Text style={{ fontSize: 22, fontWeight: "bold", marginBottom: 18, color: colorScheme === "dark" ? "#fff" : "#222" }}>
          Available Resources
        </Text>
        <FlatList
          data={resources}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <View style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: colorScheme === "dark" ? "#23272e" : "#f3f4f6",
              borderRadius: 12,
              padding: 16,
              marginBottom: 12,
              justifyContent: "space-between"
            }}>
              <View>
                <Text style={{ fontWeight: "bold", fontSize: 16, color: colorScheme === "dark" ? "#fff" : "#222" }}>{item.name}</Text>
                <Text style={{ color: "#10b981", marginTop: 2 }}>{item.available} available</Text>
              </View>
              <Feather name="box" size={24} color="#10b981" />
            </View>
          )}
        />
        <TouchableOpacity
          style={{
            backgroundColor: "#10b981",
            padding: 16,
            borderRadius: 12,
            alignItems: "center",
            marginTop: 16
          }}
          onPress={() => setModalVisible(true)}
        >
          <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 16 }}>
            Request Resource
          </Text>
        </TouchableOpacity>
      </View>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colorScheme === "dark" ? "#23272e" : "#fff" }]}>
            <Text style={{ fontWeight: "bold", fontSize: 18, marginBottom: 12, color: colorScheme === "dark" ? "#fff" : "#222" }}>
              Request Resource
            </Text>
            <TextInput
              placeholder="Resource Name"
              placeholderTextColor="#888"
              value={resourceName}
              onChangeText={setResourceName}
              style={[styles.input, { color: colorScheme === "dark" ? "#fff" : "#222", borderColor: "#10b981" }]}
            />
            <TextInput
              placeholder="Quantity"
              placeholderTextColor="#888"
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="numeric"
              style={[styles.input, { color: colorScheme === "dark" ? "#fff" : "#222", borderColor: "#10b981" }]}
            />
            <View style={{ flexDirection: "row", justifyContent: "flex-end", marginTop: 16 }}>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={{ marginRight: 16 }}>
                <Text style={{ color: "#888", fontWeight: "bold" }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleRequest}>
                <Text style={{ color: "#10b981", fontWeight: "bold" }}>Send Request</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center"
  },
  modalContent: {
    width: "85%",
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16
  }
});