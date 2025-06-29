import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
  ImageBackground,
  Image,
  Text, // <-- FIX: Import Text!
} from "react-native";
import { getAuth, User } from "firebase/auth";
import { db } from "../../lib/firebase";
import { doc, getDoc, setDoc, collection, addDoc, onSnapshot, serverTimestamp } from "firebase/firestore";
import * as Location from "expo-location";
import * as ImagePicker from 'expo-image-picker';
import ChatHeader from "@/components/ChatHeader";
import ChatInput from "@/components/ChatInput";
import ChatMessageList from "@/components/ChatMessageList";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";

const { width } = Dimensions.get("window");
const isTablet = width >= 768;

const CHAT_COLLECTION = "chats";
const MESSAGES_SUBCOLLECTION = "messages";

// Default wallpaper assets (you'll need to add these to your project)
const DEFAULT_WALLPAPERS = {
  patterns: [
    { id: 'pattern1', uri: Image.resolveAssetSource(require('@/assets/images/wallpapers/pattern1.jpg')).uri },
    { id: 'pattern2', uri: Image.resolveAssetSource(require('@/assets/images/wallpapers/pattern2.jpg')).uri },
    { id: 'pattern3', uri: Image.resolveAssetSource(require('@/assets/images/wallpapers/pattern3.jpg')).uri },
  ],
  gradients: [
    { id: 'gradient1', uri: Image.resolveAssetSource(require('@/assets/images/wallpapers/gradient1.jpg')).uri },
    { id: 'gradient2', uri: Image.resolveAssetSource(require('@/assets/images/wallpapers/gradient2.png')).uri },
  ],
  colors: [
    { id: 'blue', color: '#128C7E' },
    { id: 'green', color: '#075E54' },
    { id: 'purple', color: '#4A235A' },
    { id: 'dark', color: '#1A1A1A' },
    { id: 'light', color: '#F5F5F5' },
  ]
};

type WallpaperType = 'color' | 'image' | 'gradient';

interface ThemeSettings {
  wallpaper: {
    type: WallpaperType;
    value: string;
    opacity: number;
  };
  bubbleColors: {
    sent: string;
    received: string;
    text: string;
  };
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
  themeSettings?: ThemeSettings;
  customWallpaper?: string;
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

export default function ChatScreen() {
  const router = useRouter();
  const systemColorScheme = useColorScheme() ?? "light";
  const [loading, setLoading] = useState(true);
  const [chat, setChat] = useState<ChatDoc | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [city, setCity] = useState<string | null>(null);
  const [profileModal, setProfileModal] = useState(false);
  const [profileUser, setProfileUser] = useState<UserProfile | null>(null);
  const [myLocation, setMyLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [themeModalVisible, setThemeModalVisible] = useState(false);
  const [themeSettings, setThemeSettings] = useState<ThemeSettings>({
    wallpaper: {
      type: 'color',
      value: systemColorScheme === 'dark' ? '#1A1A1A' : '#F5F5F5',
      opacity: 0.9
    },
    bubbleColors: {
      sent: '#DCF8C6',
      received: '#FFFFFF',
      text: '#000000'
    }
  });
  const [customWallpaper, setCustomWallpaper] = useState<string | null>(null);

  // Initialize auth and user profile
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
      if (user) {
        getDoc(doc(db, "users", user.uid)).then((docSnapshot) => {
          if (docSnapshot.exists()) {
            const data = docSnapshot.data() as UserProfile;
            setUserProfile(data);
            if (data.themeSettings) {
              setThemeSettings(data.themeSettings);
            }
            if (data.customWallpaper) {
              setCustomWallpaper(data.customWallpaper);
            }
          }
        });
      }
    });
    return unsubscribe;
  }, []);

  // Get user location and city
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      try {
        const location = await Location.getCurrentPositionAsync({});
        setMyLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });

        const geocode = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
        setCity(geocode[0]?.city || null);
      } catch (error) {
        console.error("Error getting location:", error);
      }
    })();
  }, []);

  // Initialize chat
  useEffect(() => {
    if (!city || !user) return;

    setLoading(true);
    const chatId = city.trim().toLowerCase();
    const chatRef = doc(db, CHAT_COLLECTION, chatId);

    const unsubscribeChat = onSnapshot(chatRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        setChat({ id: chatId, ...docSnapshot.data() } as ChatDoc);
      } else {
        const newChat: ChatDoc = {
          id: chatId,
          city: chatId,
          isPublic: true,
          visibleTo: ["user", "rescuer", "helper", "admin"],
          createdAt: serverTimestamp(),
        };
        setDoc(chatRef, newChat).then(() => setChat(newChat));
      }
      setLoading(false);
    });

    return () => unsubscribeChat();
  }, [city, user]);

  // Subscribe to messages
  useEffect(() => {
    if (!chat) return;

    const messagesRef = collection(db, CHAT_COLLECTION, chat.id, MESSAGES_SUBCOLLECTION);
    const unsubscribeMessages = onSnapshot(messagesRef, (querySnapshot) => {
      const loadedMessages = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Message));
      setMessages(loadedMessages.reverse());
    });

    return () => unsubscribeMessages();
  }, [chat]);

  const fetchUserProfile = useCallback(async (userId: string) => {
    try {
      const userDoc = await getDoc(doc(db, "users", userId));
      if (userDoc.exists()) {
        setProfileUser(userDoc.data() as UserProfile);
        setProfileModal(true);
      }
    } catch (error) {
      Alert.alert("Error", "Could not load user profile");
    }
  }, []);

  const handleSendMessage = async (text: string) => {
    if (!chat || !user || !userProfile) return;

    try {
      await addDoc(collection(db, CHAT_COLLECTION, chat.id, MESSAGES_SUBCOLLECTION), {
        senderId: user.uid,
        senderRole: userProfile.role,
        text,
        type: "text",
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      Alert.alert("Error", "Failed to send message");
    }
  };

  const handleSendMedia = async (media: { uri: string; type: "image" | "video" | "audio" | "file"; name?: string }) => {
    if (!chat || !user || !userProfile) return;

    try {
      const storage = getStorage();
      const fileExtension = media.uri.split('.').pop() || media.type;
      const fileName = `chat_media/${chat.id}_${user.uid}_${Date.now()}.${fileExtension}`;
      const storageRef = ref(storage, fileName);

      const response = await fetch(media.uri);
      const blob = await response.blob();
      await uploadBytes(storageRef, blob);

      const downloadUrl = await getDownloadURL(storageRef);

      await addDoc(collection(db, CHAT_COLLECTION, chat.id, MESSAGES_SUBCOLLECTION), {
        senderId: user.uid,
        senderRole: userProfile.role,
        type: media.type,
        mediaUrl: downloadUrl,
        fileName: media.name,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      Alert.alert("Error", "Failed to upload media");
    }
  };

  const handleSendAudio = async (uri: string) => {
    // For audio, wrap as media object and call handleSendMedia
    await handleSendMedia({ uri, type: "audio" });
  };

  const handlePickCustomWallpaper = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert("Permission required", "Please allow access to your photos");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (result.canceled || !result.assets?.[0]?.uri) return;

    try {
      const storage = getStorage();
      const fileName = `wallpapers/${user?.uid}_${Date.now()}.jpg`;
      const storageRef = ref(storage, fileName);

      const response = await fetch(result.assets[0].uri);
      const blob = await response.blob();
      await uploadBytes(storageRef, blob);

      const downloadUrl = await getDownloadURL(storageRef);
      setCustomWallpaper(downloadUrl);

      const newThemeSettings: ThemeSettings = {
        ...themeSettings,
        wallpaper: {
          type: 'image',
          value: downloadUrl,
          opacity: 0.8
        }
      };
      setThemeSettings(newThemeSettings);

      if (user) {
        await setDoc(doc(db, "users", user.uid), {
          themeSettings: newThemeSettings,
          customWallpaper: downloadUrl
        }, { merge: true });
      }
    } catch (error) {
      Alert.alert("Error", "Failed to upload wallpaper");
    }
  };

  const applyWallpaper = (type: WallpaperType, value: string) => {
    const newThemeSettings: ThemeSettings = {
      ...themeSettings,
      wallpaper: {
        type,
        value,
        opacity: type === 'color' ? 1 : 0.8
      }
    };
    setThemeSettings(newThemeSettings);

    if (user) {
      setDoc(doc(db, "users", user.uid), {
        themeSettings: newThemeSettings
      }, { merge: true });
    }
  };

  const applyBubbleTheme = (sent: string, received: string, text: string) => {
    const newThemeSettings: ThemeSettings = {
      ...themeSettings,
      bubbleColors: { sent, received, text }
    };
    setThemeSettings(newThemeSettings);

    if (user) {
      setDoc(doc(db, "users", user.uid), {
        themeSettings: newThemeSettings
      }, { merge: true });
    }
  };

  const resetToDefaultTheme = () => {
    const defaultTheme: ThemeSettings = {
      wallpaper: {
        type: 'color',
        value: systemColorScheme === 'dark' ? '#1A1A1A' : '#F5F5F5',
        opacity: 0.9
      },
      bubbleColors: {
        sent: '#DCF8C6',
        received: '#FFFFFF',
        text: '#000000'
      }
    };
    setThemeSettings(defaultTheme);
    setCustomWallpaper(null);

    if (user) {
      setDoc(doc(db, "users", user.uid), {
        themeSettings: defaultTheme,
        customWallpaper: null
      }, { merge: true });
    }
  };

  const handleNavigateToUser = (latitude?: number, longitude?: number) => {
    if (!latitude || !longitude || !myLocation) {
      Alert.alert("Location unavailable", "Cannot navigate to this user");
      return;
    }

    router.push({
      pathname: "/map",
      params: {
        fromLat: myLocation.latitude.toString(),
        fromLng: myLocation.longitude.toString(),
        toLat: latitude.toString(),
        toLng: longitude.toString(),
        nav: "1"
      },
    });
    setProfileModal(false);
  };

  const renderWallpaperPreview = () => {
    if (themeSettings.wallpaper.type === 'color') {
      return (
        <View style={[
          styles.wallpaperPreview,
          { backgroundColor: themeSettings.wallpaper.value }
        ]} />
      );
    }

    return (
      <Image
        source={{ uri: themeSettings.wallpaper.value }}
        style={styles.wallpaperPreview}
        resizeMode="cover"
      />
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors[systemColorScheme].tint} />
        <Text style={[styles.loadingText, { color: Colors[systemColorScheme].text }]}>
          Loading chat...
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      {/* Wallpaper Background */}
      {themeSettings.wallpaper.type === 'color' ? (
        <View style={[
          styles.background,
          { backgroundColor: themeSettings.wallpaper.value }
        ]} />
      ) : (
        <ImageBackground
          source={{ uri: themeSettings.wallpaper.value }}
          style={styles.background}
          resizeMode="cover"
          blurRadius={2}
        >
          <View style={[
            styles.backgroundOverlay,
            { backgroundColor: `rgba(0,0,0,${1 - themeSettings.wallpaper.opacity})` }
          ]} />
        </ImageBackground>
      )}

      <ChatHeader
        title={`Public Chat - ${city || "Unknown Location"}`}
        isPublic={true}
        onToggleVisibility={() => {}}
        canToggle={false}
        city={city}
        onThemePress={() => setThemeModalVisible(true)}
      />

      <View style={styles.messageListContainer}>
        <ChatMessageList
          messages={messages}
          userId={user?.uid || ""}
          onUserPress={fetchUserProfile}
        />
      </View>

      <View style={styles.inputContainer}>
        <ChatInput
          onSend={handleSendMessage}
          onSendMedia={handleSendMedia}
          onSendAudio={handleSendAudio}
          disabled={false}
        />
      </View>

      {/* Profile Modal */}
      <Modal visible={profileModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[
            styles.modalContent,
            { backgroundColor: Colors[systemColorScheme].card }
          ]}>
            <ScrollView>
              <Text style={[
                styles.profileName,
                { color: Colors[systemColorScheme].text }
              ]}>
                {profileUser?.name || profileUser?.fullName || profileUser?.email || "User"}
              </Text>

              <View style={styles.profileDetailRow}>
                <Ionicons
                  name="mail"
                  size={16}
                  color={Colors[systemColorScheme].icon}
                />
                <Text style={[
                  styles.profileDetailText,
                  { color: Colors[systemColorScheme].text }
                ]}>
                  {profileUser?.email || "N/A"}
                </Text>
              </View>

              {profileUser?.mobile && (
                <View style={styles.profileDetailRow}>
                  <Ionicons
                    name="call"
                    size={16}
                    color={Colors[systemColorScheme].icon}
                  />
                  <Text style={[
                    styles.profileDetailText,
                    { color: Colors[systemColorScheme].text }
                  ]}>
                    {profileUser.mobile}
                  </Text>
                </View>
              )}

              {profileUser?.city && (
                <View style={styles.profileDetailRow}>
                  <Ionicons
                    name="location"
                    size={16}
                    color={Colors[systemColorScheme].icon}
                  />
                  <Text style={[
                    styles.profileDetailText,
                    { color: Colors[systemColorScheme].text }
                  ]}>
                    {profileUser.city}
                  </Text>
                </View>
              )}

              {(profileUser?.latitude !== undefined && profileUser?.longitude !== undefined) && (
                <TouchableOpacity
                  onPress={() => handleNavigateToUser(profileUser.latitude, profileUser.longitude)}
                  style={styles.navigateButton}
                >
                  <View style={styles.profileDetailRow}>
                    <Ionicons
                      name="navigate"
                      size={16}
                      color={Colors[systemColorScheme].tint}
                    />
                    <Text style={[
                      styles.profileDetailText,
                      { color: Colors[systemColorScheme].tint }
                    ]}>
                      View Location
                    </Text>
                  </View>
                  <Text style={[
                    styles.coordinatesText,
                    { color: Colors[systemColorScheme].textMuted }
                  ]}>
                    Lat: {profileUser.latitude.toFixed(4)}, Lng: {profileUser.longitude.toFixed(4)}
                  </Text>
                </TouchableOpacity>
              )}
            </ScrollView>

            <TouchableOpacity
              onPress={() => setProfileModal(false)}
              style={[
                styles.closeButton,
                { backgroundColor: Colors[systemColorScheme].tint }
              ]}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Theme Settings Modal */}
      <Modal visible={themeModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[
            styles.themeModalContent,
            { backgroundColor: Colors[systemColorScheme].card }
          ]}>
            <ScrollView>
              <Text style={[
                styles.themeModalTitle,
                { color: Colors[systemColorScheme].text }
              ]}>
                Chat Appearance
              </Text>

              <Text style={[
                styles.themeSectionTitle,
                { color: Colors[systemColorScheme].text }
              ]}>
                Current Wallpaper
              </Text>
              {renderWallpaperPreview()}

              <Text style={[
                styles.themeSectionTitle,
                { color: Colors[systemColorScheme].text }
              ]}>
                Solid Colors
              </Text>
              <View style={styles.themeOptionsRow}>
                {DEFAULT_WALLPAPERS.colors.map(color => (
                  <TouchableOpacity
                    key={color.id}
                    style={[
                      styles.themeOption,
                      { backgroundColor: color.color },
                      themeSettings.wallpaper.type === 'color' &&
                      themeSettings.wallpaper.value === color.color &&
                      styles.selectedThemeOption
                    ]}
                    onPress={() => applyWallpaper('color', color.color)}
                  />
                ))}
              </View>

              <Text style={[
                styles.themeSectionTitle,
                { color: Colors[systemColorScheme].text }
              ]}>
                Patterns
              </Text>
              <View style={styles.themeOptionsRow}>
                {DEFAULT_WALLPAPERS.patterns.map(pattern => (
                  <TouchableOpacity
                    key={pattern.id}
                    style={[
                      styles.themeOption,
                      themeSettings.wallpaper.type === 'image' &&
                      themeSettings.wallpaper.value === pattern.uri &&
                      styles.selectedThemeOption
                    ]}
                    onPress={() => applyWallpaper('image', pattern.uri)}
                  >
                    <Image
                      source={{ uri: pattern.uri }}
                      style={styles.themeOptionImage}
                      resizeMode="cover"
                    />
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[
                styles.themeSectionTitle,
                { color: Colors[systemColorScheme].text }
              ]}>
                Gradients
              </Text>
              <View style={styles.themeOptionsRow}>
                {DEFAULT_WALLPAPERS.gradients.map(gradient => (
                  <TouchableOpacity
                    key={gradient.id}
                    style={[
                      styles.themeOption,
                      themeSettings.wallpaper.type === 'gradient' &&
                      themeSettings.wallpaper.value === gradient.uri &&
                      styles.selectedThemeOption
                    ]}
                    onPress={() => applyWallpaper('gradient', gradient.uri)}
                  >
                    <Image
                      source={{ uri: gradient.uri }}
                      style={styles.themeOptionImage}
                      resizeMode="cover"
                    />
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[
                styles.themeSectionTitle,
                { color: Colors[systemColorScheme].text }
              ]}>
                Custom Wallpaper
              </Text>
              <TouchableOpacity
                style={[
                  styles.customWallpaperButton,
                  { backgroundColor: Colors[systemColorScheme].inputBackground }
                ]}
                onPress={handlePickCustomWallpaper}
              >
                <MaterialCommunityIcons
                  name="image-plus"
                  size={24}
                  color={Colors[systemColorScheme].tint}
                />
                <Text style={[
                  styles.customWallpaperButtonText,
                  { color: Colors[systemColorScheme].tint }
                ]}>
                  {customWallpaper ? 'Change Custom Wallpaper' : 'Choose Custom Wallpaper'}
                </Text>
              </TouchableOpacity>

              <Text style={[
                styles.themeSectionTitle,
                { color: Colors[systemColorScheme].text }
              ]}>
                Bubble Colors
              </Text>
              <View style={styles.bubbleThemeOptions}>
                <View style={styles.bubbleThemeOption}>
                  <Text style={[
                    styles.bubbleThemeLabel,
                    { color: Colors[systemColorScheme].text }
                  ]}>
                    Sent:
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.bubbleColorPreview,
                      { backgroundColor: themeSettings.bubbleColors.sent },
                      { borderColor: Colors[systemColorScheme].border }
                    ]}
                  />
                </View>
                <View style={styles.bubbleThemeOption}>
                  <Text style={[
                    styles.bubbleThemeLabel,
                    { color: Colors[systemColorScheme].text }
                  ]}>
                    Received:
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.bubbleColorPreview,
                      { backgroundColor: themeSettings.bubbleColors.received },
                      { borderColor: Colors[systemColorScheme].border }
                    ]}
                  />
                </View>
                <View style={styles.bubbleThemeOption}>
                  <Text style={[
                    styles.bubbleThemeLabel,
                    { color: Colors[systemColorScheme].text }
                  ]}>
                    Text:
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.bubbleColorPreview,
                      { backgroundColor: themeSettings.bubbleColors.text },
                      { borderColor: Colors[systemColorScheme].border }
                    ]}
                  />
                </View>
              </View>

              <View style={styles.themePresets}>
                <Text style={[
                  styles.themeSectionTitle,
                  { color: Colors[systemColorScheme].text }
                ]}>
                  Presets
                </Text>
                <View style={styles.presetButtons}>
                  <TouchableOpacity
                    style={[
                      styles.presetButton,
                      { backgroundColor: Colors[systemColorScheme].inputBackground }
                    ]}
                    onPress={() => applyBubbleTheme('#DCF8C6', '#FFFFFF', '#000000')}
                  >
                    <Text style={{ color: Colors[systemColorScheme].text }}>Default</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.presetButton,
                      { backgroundColor: Colors[systemColorScheme].inputBackground }
                    ]}
                    onPress={() => applyBubbleTheme('#FFD3B6', '#FFAAA5', '#000000')}
                  >
                    <Text style={{ color: Colors[systemColorScheme].text }}>Warm</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.presetButton,
                      { backgroundColor: Colors[systemColorScheme].inputBackground }
                    ]}
                    onPress={() => applyBubbleTheme('#B5EAD7', '#C7CEEA', '#000000')}
                  >
                    <Text style={{ color: Colors[systemColorScheme].text }}>Cool</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.presetButton,
                      { backgroundColor: Colors[systemColorScheme].inputBackground }
                    ]}
                    onPress={() => applyBubbleTheme('#E2F0CB', '#B5EAD7', '#000000')}
                  >
                    <Text style={{ color: Colors[systemColorScheme].text }}>Green</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                style={[
                  styles.resetButton,
                  { backgroundColor: Colors[systemColorScheme].inputBackground }
                ]}
                onPress={resetToDefaultTheme}
              >
                <Text style={[
                  styles.resetButtonText,
                  { color: Colors[systemColorScheme].tint }
                ]}>
                  Reset to Default
                </Text>
              </TouchableOpacity>
            </ScrollView>

            <TouchableOpacity
              onPress={() => setThemeModalVisible(false)}
              style={[
                styles.closeButton,
                { backgroundColor: Colors[systemColorScheme].tint }
              ]}
            >
              <Text style={styles.closeButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  backgroundOverlay: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  messageListContainer: {
    flex: 1,
    paddingHorizontal: isTablet ? 24 : 12,
  },
  inputContainer: {
    paddingHorizontal: isTablet ? 24 : 12,
    paddingBottom: 16,
    paddingTop: 8,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    borderRadius: 12,
    padding: 24,
    width: isTablet ? '70%' : '85%',
    maxHeight: '80%',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  profileName: {
    fontWeight: "bold",
    fontSize: 20,
    marginBottom: 16,
  },
  profileDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  profileDetailText: {
    fontSize: 16,
    marginLeft: 8,
  },
  navigateButton: {
    marginTop: 8,
    marginBottom: 8,
    padding: 8,
    borderRadius: 8,
  },
  coordinatesText: {
    fontSize: 13,
    marginLeft: 24,
    marginTop: 4,
  },
  closeButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 16,
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontWeight: "bold",
  },
  themeModalContent: {
    borderRadius: 12,
    padding: 24,
    width: isTablet ? '70%' : '90%',
    maxHeight: '80%',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  themeModalTitle: {
    fontWeight: "bold",
    fontSize: 20,
    marginBottom: 20,
    textAlign: 'center',
  },
  themeSectionTitle: {
    fontWeight: '600',
    fontSize: 16,
    marginTop: 16,
    marginBottom: 12,
  },
  wallpaperPreview: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
  },
  themeOptionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  themeOption: {
    width: isTablet ? '23%' : '30%',
    aspectRatio: 1,
    borderRadius: 8,
    marginBottom: 10,
    overflow: 'hidden',
    borderWidth: 1,
  },
  selectedThemeOption: {
    borderWidth: 3,
  },
  themeOptionImage: {
    width: '100%',
    height: '100%',
  },
  customWallpaperButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    justifyContent: 'center',
  },
  customWallpaperButtonText: {
    marginLeft: 8,
    fontWeight: '500',
  },
  bubbleThemeOptions: {
    marginBottom: 16,
  },
  bubbleThemeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  bubbleThemeLabel: {
    fontSize: 16,
  },
  bubbleColorPreview: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
  },
  themePresets: {
    marginBottom: 16,
  },
  presetButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  presetButton: {
    width: isTablet ? '23%' : '48%',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  resetButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  resetButtonText: {
    fontWeight: 'bold',
    fontSize: 16,
  },
});