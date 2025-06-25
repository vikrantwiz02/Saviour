import { useEffect, useState, useCallback } from "react";
import { View, ActivityIndicator, Text, KeyboardAvoidingView, Platform, Alert, Modal, TouchableOpacity, ScrollView } from "react-native";
import { getAuth, User } from "firebase/auth";
import { db } from "../../lib/firebase";
import { doc, getDoc, setDoc, collection, addDoc, onSnapshot, serverTimestamp, query, where } from "firebase/firestore";
import * as Location from "expo-location";
import ChatHeader from "@/components/ChatHeader";
import ChatInput from "@/components/ChatInput";
import ChatMessageList from "@/components/ChatMessageList";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

const CHAT_COLLECTION = "chats";
const MESSAGES_SUBCOLLECTION = "messages";

function normalizeCity(city: string | null): string {
  return city ? city.trim().toLowerCase() : "unknown";
}

interface ChatDoc {
  id: string;
  city: string;
  isPublic: boolean;
  visibleTo: string[];
  createdAt?: any;
  privateWith?: string;
}

interface UserProfile {
  name?: string;
  fullName?: string;
  email: string;
  avatarUrl?: string;
  mobile?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  role: string;
  [key: string]: any;
}

interface Message {
  id: string;
  senderId: string;
  senderRole: string;
  text?: string;
  createdAt?: any;
  type?: "text" | "image" | "video" | "audio" | "file";
  mediaUrl?: string;
  fileName?: string;
}

interface Employee {
  id: string;
  name: string;
  role: string;
}

export default function ChatScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(true);
  const [chat, setChat] = useState<ChatDoc | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [city, setCity] = useState<string | null>(null);
  const [cityLoading, setCityLoading] = useState<boolean>(true);
  const [profileModal, setProfileModal] = useState(false);
  const [profileUser, setProfileUser] = useState<UserProfile | null>(null);
  const [myLocation, setMyLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    const auth = getAuth();
    const u = auth.currentUser;
    setUser(u);
    if (u) {
      getDoc(doc(db, "users", u.uid)).then(userDoc => {
        if (userDoc.exists()) setUserProfile(userDoc.data() as UserProfile);
      });
    }
  }, []);

  useEffect(() => {
    async function fetchCity() {
      setCityLoading(true);
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setCity(null);
          setCityLoading(false);
          return;
        }
        const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        if (!location || !location.coords) {
          setCity(null);
          setCityLoading(false);
          return;
        }
        const geo = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
        if (geo && geo[0] && geo[0].city) setCity(geo[0].city);
        else setCity(null);
      } catch (e) {
        setCity(null);
      }
      setCityLoading(false);
    }
    fetchCity();
  }, []);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      let location = await Location.getCurrentPositionAsync({});
      setMyLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    })();
  }, []);

  useEffect(() => {
    if (!city || !user) return;
    setLoading(true);
    const chatId = normalizeCity(city);
    const chatRef = doc(db, CHAT_COLLECTION, chatId);
    getDoc(chatRef).then(async (chatDoc) => {
      if (chatDoc.exists()) {
        const chatData = chatDoc.data() as Omit<ChatDoc, "id">;
        setChat({ ...chatData, id: chatId });
      } else {
        const newChat: ChatDoc = {
          id: chatId,
          city: chatId,
          isPublic: true,
          visibleTo: ["user", "rescuer", "helper", "admin"],
          createdAt: serverTimestamp(),
        };
        await setDoc(chatRef, newChat);
        setChat(newChat);
      }
      setLoading(false);
    });
    const unsub = onSnapshot(chatRef, (docSnap) => {
      if (docSnap.exists()) {
        const chatData = docSnap.data() as Omit<ChatDoc, "id">;
        setChat({ ...chatData, id: chatId });
      }
    });
    return () => unsub();
  }, [city, user]);

  useEffect(() => {
    if (!chat) return;
    const messagesRef = collection(db, CHAT_COLLECTION, chat.id, MESSAGES_SUBCOLLECTION);
    const qUnsub = onSnapshot(messagesRef, (snap) => {
      const msgs: Message[] = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
      msgs.sort((a, b) => {
        if (!a.createdAt || !b.createdAt) return 0;
        return a.createdAt.seconds - b.createdAt.seconds;
      });
      setMessages(msgs.reverse());
    });
    return () => qUnsub();
  }, [chat]);

  const fetchUserProfile = useCallback(async (uid: string) => {
    const userDoc = await getDoc(doc(db, "users", uid));
    if (userDoc.exists()) {
      setProfileUser(userDoc.data() as UserProfile);
      setProfileModal(true);
    } else {
      Alert.alert("Profile not found", "This user's profile could not be loaded.");
    }
  }, []);

  const handleSend = async (text: string) => {
    if (!chat || !user || !userProfile) return;
    const messagesRef = collection(db, CHAT_COLLECTION, chat.id, MESSAGES_SUBCOLLECTION);
    await addDoc(messagesRef, {
      senderId: user.uid,
      senderRole: userProfile.role,
      text,
      type: "text",
      createdAt: serverTimestamp(),
    });
  };

  const handleSendMedia = async (media: { uri: string; type: "image" | "video" | "audio" | "file"; name?: string }) => {
    if (!chat || !user || !userProfile) return;
    try {
      const storage = getStorage();
      const ext = media.uri.split(".").pop() || media.type;
      const filename = `chat_media/${chat.id}_${user.uid}_${Date.now()}.${ext}`;
      const response = await fetch(media.uri);
      const blob = await response.blob();
      const storageRef = ref(storage, filename);
      await uploadBytes(storageRef, blob);
      const downloadUrl = await getDownloadURL(storageRef);

      const messagesRef = collection(db, CHAT_COLLECTION, chat.id, MESSAGES_SUBCOLLECTION);
      await addDoc(messagesRef, {
        senderId: user.uid,
        senderRole: userProfile.role,
        type: media.type,
        mediaUrl: downloadUrl,
        fileName: media.name || undefined,
        createdAt: serverTimestamp(),
      });
    } catch (e) {
      Alert.alert("Upload failed", "Could not upload file.");
    }
  };

  const handleSendAudio = async (uri: string) => {
    await handleSendMedia({ uri, type: "audio" });
  };

  const handleNavigateToUser = (latitude?: number, longitude?: number) => {
    if (!latitude || !longitude || !myLocation) {
      Alert.alert("Location not available", "This user or you have not shared location.");
      return;
    }
    router.push({
      pathname: "/map",
        params: {
          fromLat: myLocation && myLocation.latitude != null ? myLocation.latitude.toString() : "",
          fromLng: myLocation && myLocation.longitude != null ? myLocation.longitude.toString() : "",
          toLat: latitude != null ? latitude.toString() : "",
          toLng: longitude != null ? longitude.toString() : "",
          nav: "1"
        },
    });
    setProfileModal(false);
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#ece5dd", justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
        <Text>Loading chat...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: "#ece5dd" }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ChatHeader
        title={`Public City Chat (${city})`}
        isPublic={true}
        onToggleVisibility={() => {}}
        canToggle={false}
        city={city}
      />
      <View style={{ flex: 1 }}>
        <ChatMessageList
          messages={messages}
          userId={user?.uid || ""}
          onUserPress={fetchUserProfile}
        />
      </View>
      <ChatInput
        onSend={handleSend}
        onSendMedia={handleSendMedia}
        onSendAudio={handleSendAudio}
        disabled={false}
      />

      <Modal visible={profileModal} animationType="slide" transparent>
        <View style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.3)",
          justifyContent: "center",
          alignItems: "center"
        }}>
          <View style={{
            backgroundColor: "#fff",
            borderRadius: 12,
            padding: 24,
            width: "85%",
            maxHeight: "80%"
          }}>
            <ScrollView>
              <Text style={{ fontWeight: "bold", fontSize: 20, marginBottom: 10 }}>
                {profileUser?.name || profileUser?.fullName || profileUser?.email || "User"}
              </Text>
              <Text style={{ fontSize: 16, marginBottom: 4 }}>
                <Ionicons name="mail" size={16} /> {profileUser?.email || "N/A"}
              </Text>
              {profileUser?.mobile && (
                <Text style={{ fontSize: 16, marginBottom: 4 }}>
                  <Ionicons name="call" size={16} /> {profileUser.mobile}
                </Text>
              )}
              {profileUser?.city && (
                <Text style={{ fontSize: 16, marginBottom: 4 }}>
                  <Ionicons name="location" size={16} /> {profileUser.city}
                </Text>
              )}
              {(profileUser?.latitude !== undefined && profileUser?.longitude !== undefined) && (
                <TouchableOpacity
                  onPress={() => handleNavigateToUser(profileUser.latitude, profileUser.longitude)}
                  style={{ marginTop: 8, marginBottom: 8 }}
                >
                  <Text style={{ fontSize: 16, color: "#007aff" }}>
                    <Ionicons name="navigate" size={16} /> Lat: {profileUser.latitude}, Lng: {profileUser.longitude} {"\n"}
                    <Text style={{ fontSize: 13, color: "#888" }}>(Tap to navigate)</Text>
                  </Text>
                </TouchableOpacity>
              )}
            </ScrollView>
            <TouchableOpacity onPress={() => setProfileModal(false)} style={{ marginTop: 16, alignSelf: "flex-end" }}>
              <Text style={{ color: "#007aff", fontWeight: "bold" }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}