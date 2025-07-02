import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
  Platform,
  Pressable,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather, MaterialIcons } from "@expo/vector-icons";
import { useColorScheme } from "@/hooks/useColorScheme";
import { db, auth } from "@/lib/firebase";
import {
  addDoc,
  collection,
  onSnapshot,
  query,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { theme } from "@/constants/theme";

// Resource type
type Resource = {
  id: string;
  name: string;
  available: number;
  [key: string]: any;
};

const ResourcesScreen = () => {
  const colorScheme = useColorScheme() ?? "light";
  const colors = theme[colorScheme];

  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [resourceName, setResourceName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [requesting, setRequesting] = useState(false);

  // Snackbar animation
  const snackbarAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (snackbarVisible) {
      Animated.timing(snackbarAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setTimeout(() => {
          Animated.timing(snackbarAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }).start(() => setSnackbarVisible(false));
        }, 2500);
      });
    }
  }, [snackbarVisible]);

  // Fetch resources from Firestore
  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, "resources"), orderBy("name", "asc"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data: Resource[] = [];
        snapshot.forEach((doc) => {
          data.push({ id: doc.id, ...doc.data() } as Resource);
        });
        setResources(data);
        setLoading(false);
        setRefreshing(false);
      },
      (error) => {
        setSnackbarMessage("Failed to load resources");
        setSnackbarVisible(true);
        setLoading(false);
        setRefreshing(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  }, []);

  const handleRequest = async () => {
    if (!resourceName.trim()) {
      setSnackbarMessage("Resource name is required");
      setSnackbarVisible(true);
      return;
    }
    if (!quantity.trim() || isNaN(Number(quantity)) || Number(quantity) <= 0) {
      setSnackbarMessage("Please enter a valid quantity");
      setSnackbarVisible(true);
      return;
    }
    const userId = auth.currentUser?.uid;
    if (!userId) {
      setSnackbarMessage("You must be logged in to request resources");
      setSnackbarVisible(true);
      return;
    }
    setRequesting(true);
    try {
      await addDoc(collection(db, "requests"), {
        resourceName: resourceName.trim(),
        quantity: Number(quantity),
        userId,
        status: "pending",
        createdAt: Timestamp.now(),
      });
      setSnackbarMessage(`Request for ${quantity} ${resourceName} submitted`);
      setSnackbarVisible(true);
      setModalVisible(false);
      setResourceName("");
      setQuantity("");
    } catch (error) {
      setSnackbarMessage("Failed to submit request");
      setSnackbarVisible(true);
    } finally {
      setRequesting(false);
    }
  };

  const renderResourceItem = ({ item }: { item: Resource }) => (
    <View style={[styles.resourceItem, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
      <View style={styles.resourceInfo}>
        <Text style={[styles.resourceName, { color: colors.text }]}>{item.name}</Text>
        <Text style={[styles.resourceAvailable, { color: colors.primary }]}>
          {item.available} available
        </Text>
      </View>
      <View style={styles.resourceIcon}>
        <Feather name="box" size={28} color={colors.primary} />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Resources</Text>
        <TouchableOpacity
          onPress={() => setModalVisible(true)}
          accessibilityLabel="Request Resource"
        >
          <MaterialIcons name="add-circle-outline" size={30} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : resources.length === 0 ? (
        <View style={styles.emptyState}>
          <Feather name="inbox" size={54} color={colors.textSecondary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            No resources available
          </Text>
        </View>
      ) : (
        <FlatList
          data={resources}
          keyExtractor={(item) => item.id}
          renderItem={renderResourceItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
        />
      )}

      {/* Request Resource Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.cardBackground }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Request Resource</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Feather name="x" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <TextInput
              placeholder="Resource Name"
              placeholderTextColor={colors.textSecondary}
              value={resourceName}
              onChangeText={setResourceName}
              style={[
                styles.input,
                {
                  color: colors.text,
                  borderColor: colors.border,
                  backgroundColor: colors.inputBackground,
                },
              ]}
              autoCapitalize="words"
              autoFocus
            />
            <TextInput
              placeholder="Quantity"
              placeholderTextColor={colors.textSecondary}
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="numeric"
              style={[
                styles.input,
                {
                  color: colors.text,
                  borderColor: colors.border,
                  backgroundColor: colors.inputBackground,
                },
              ]}
            />
            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setModalVisible(false)}
                style={[
                  styles.button,
                  styles.cancelButton,
                  { borderColor: colors.border, backgroundColor: colors.inputBackground },
                ]}
                disabled={requesting}
              >
                <Text style={{ color: colors.textSecondary, fontWeight: "600" }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleRequest}
                style={[
                  styles.button,
                  styles.submitButton,
                  { backgroundColor: requesting ? colors.border : colors.primary },
                ]}
                disabled={requesting}
              >
                {requesting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={{ color: "#fff", fontWeight: "600" }}>Submit</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Snackbar */}
      {snackbarVisible && (
        <Animated.View
          style={[
            styles.snackbar,
            {
              backgroundColor: colors.snackbarBackground || "#222",
              opacity: snackbarAnim,
              transform: [
                {
                  translateY: snackbarAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [60, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={{ color: "#fff", textAlign: "center" }}>{snackbarMessage}</Text>
        </Animated.View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  resourceItem: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  resourceInfo: { flex: 1 },
  resourceName: {
    fontWeight: "600",
    fontSize: 17,
    marginBottom: 4,
  },
  resourceAvailable: {
    fontSize: 14,
    fontWeight: "500",
  },
  resourceIcon: { padding: 8 },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyText: {
    marginTop: 18,
    fontSize: 17,
    textAlign: "center",
    fontWeight: "500",
    opacity: 0.7,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "92%",
    borderRadius: 18,
    padding: 22,
    maxWidth: 420,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  modalTitle: {
    fontSize: 21,
    fontWeight: "600",
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: Platform.OS === "ios" ? 14 : 12,
    marginBottom: 16,
    fontSize: 16,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 8,
  },
  button: {
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 22,
    marginLeft: 8,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 100,
  },
  cancelButton: {
    borderWidth: 1,
    marginRight: 12,
  },
  submitButton: {
    minWidth: 120,
  },
  snackbar: {
    position: "absolute",
    left: 20,
    right: 20,
    bottom: 30,
    padding: 16,
    borderRadius: 10,
    zIndex: 100,
    elevation: 10,
  },
});

export default ResourcesScreen;