import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  ActivityIndicator,
  Alert,
  Dimensions,
  Linking,
  Modal,
  Platform,
  KeyboardAvoidingView,
  TouchableOpacity,
} from 'react-native';
import {
  Ionicons,
  MaterialIcons,
  FontAwesome,
  MaterialCommunityIcons,
} from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { db } from '@/lib/firebase';
import { getStorage } from 'firebase/storage';
const storage = getStorage();
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  doc,
  updateDoc,
  getDoc,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as Location from 'expo-location';
import { Audio } from 'expo-av';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import ChatInput from '../components/ChatInput';

dayjs.extend(relativeTime);

type MessageType = 'text' | 'image' | 'video' | 'document' | 'audio' | 'location';

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderEmail: string;
  senderCity: string;
  city: string;
  content: string;
  type: MessageType;
  timestamp: Date | null;
  readBy: string[];
  metadata?: {
    uri?: string;
    duration?: number;
    latitude?: number;
    longitude?: number;
    fileName?: string;
    fileSize?: number;
  };
}

const ChatScreen = () => {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const { city } = useLocalSearchParams<{ city?: string }>();
  const router = useRouter();

  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [profileModal, setProfileModal] = useState<{ visible: boolean; name: string; email: string; city: string }>(
    { visible: false, name: '', email: '', city: '' }
  );
  const flatListRef = useRef<FlatList>(null);
  const { width } = Dimensions.get('window');
  const isTablet = width >= 768;

  // Get current user
  useEffect(() => {
    const authInstance = getAuth();
    const unsubscribe = authInstance.onAuthStateChanged((user: any) => {
      if (user) {
        const userRef = doc(db, 'users', user.uid);
        getDoc(userRef).then((docSnap) => {
          if (docSnap.exists()) {
            const userData = docSnap.data();
            if (userData.role !== 'employee') {
              Alert.alert('Access Denied', 'Only employees can access this chat');
              router.back();
            } else {
              setUser({ uid: user.uid, ...userData });
            }
          } else {
            router.back();
          }
        });
      } else {
        router.back();
      }
    });
    return unsubscribe;
  }, []);

  // Fetch messages for the current city
  useEffect(() => {
    if (!city || !user) return;

    setIsLoading(true);
    const messagesRef = collection(db, 'messages');
    const q = query(
      messagesRef,
      where('city', '==', city),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messagesData: Message[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        let timestamp: Date | null = null;
        if (data.timestamp && typeof data.timestamp.toDate === 'function') {
          timestamp = data.timestamp.toDate();
        }
        messagesData.push({
          id: docSnap.id,
          senderId: data.senderId || '',
          senderName: data.senderName || '',
          senderEmail: data.senderEmail || '',
          senderCity: data.senderCity || '',
          city: data.city || '',
          content: data.content || '',
          type: data.type || 'text',
          timestamp,
          readBy: Array.isArray(data.readBy) ? data.readBy : [],
          metadata: data.metadata || {},
        });
      });
      setMessages(messagesData);
      setIsLoading(false);
      markMessagesAsRead(messagesData);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    });

    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [city, user]);

  const markMessagesAsRead = useCallback((msgs: Message[] = messages) => {
    if (!user) return;

    const unreadMessages = msgs.filter(
      (msg) => msg.senderId !== user.uid && !msg.readBy.includes(user.uid)
    );

    if (unreadMessages.length > 0) {
      const batch = [];
      for (const message of unreadMessages) {
        const messageRef = doc(db, 'messages', message.id);
        batch.push(
          updateDoc(messageRef, {
            readBy: [...message.readBy, user.uid],
          })
        );
      }
      Promise.all(batch).catch(console.error);
    }
  }, [messages, user]);

  // ChatInput handlers
  const handleSend = async (text: string) => {
    if (!text.trim() || !user || !city) return;
    try {
      await addDoc(collection(db, 'messages'), {
        senderId: user.uid,
        senderName: user.name || user.fullName || '',
        senderEmail: user.email || '',
        senderCity: user.city || '',
        city,
        content: text,
        type: 'text',
        timestamp: serverTimestamp(),
        readBy: [user.uid],
      });
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      Alert.alert('Error', 'Failed to send message');
    }
  };

  const handleSendMedia = async (media: { uri: string; type: "image" | "video" | "audio" | "file"; name?: string }) => {
    if (!user || !city) return;
    try {
      setIsLoading(true);
      const response = await fetch(media.uri);
      const blob = await response.blob();
      const storageRef = ref(storage, `chat/${media.type}s/${Date.now()}_${user.uid}`);
      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);

      await addDoc(collection(db, 'messages'), {
        senderId: user.uid,
        senderName: user.name || user.fullName || '',
        senderEmail: user.email || '',
        senderCity: user.city || '',
        city,
        content: `${media.type} shared`,
        type: media.type === 'file' ? 'document' : media.type,
        timestamp: serverTimestamp(),
        readBy: [user.uid],
        metadata: {
          uri: downloadURL,
          fileName: media.name,
        },
      });
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      Alert.alert('Error', 'Failed to send media');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendAudio = async (uri: string) => {
    if (!user || !city) return;
    try {
      setIsLoading(true);
      const response = await fetch(uri);
      const blob = await response.blob();
      const storageRef = ref(storage, `chat/audios/${Date.now()}_${user.uid}`);
      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);

      // Get duration
      const { sound } = await Audio.Sound.createAsync({ uri });
      const status = await sound.getStatusAsync();
      sound.unloadAsync();
      const duration = 'durationMillis' in status && typeof status.durationMillis === 'number'
        ? status.durationMillis / 1000
        : 0;

      await addDoc(collection(db, 'messages'), {
        senderId: user.uid,
        senderName: user.name || user.fullName || '',
        senderEmail: user.email || '',
        senderCity: user.city || '',
        city,
        content: `audio shared`,
        type: 'audio',
        timestamp: serverTimestamp(),
        readBy: [user.uid],
        metadata: {
          uri: downloadURL,
          duration,
        },
      });
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      Alert.alert('Error', 'Failed to send audio');
    } finally {
      setIsLoading(false);
    }
  };

  // Location sending (optional, you can add a button for this if you want)
  const handleSendLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission denied', 'Location permission is required to share your location');
      return;
    }
    const location = await Location.getCurrentPositionAsync({});
    if (user && city) {
      await addDoc(collection(db, 'messages'), {
        senderId: user.uid,
        senderName: user.name || user.fullName || '',
        senderEmail: user.email || '',
        senderCity: user.city || '',
        city,
        content: 'Location shared',
        type: 'location',
        timestamp: serverTimestamp(),
        readBy: [user.uid],
        metadata: {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        },
      });
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isCurrentUser = item.senderId === user?.uid;
    const isRead = item.readBy.length > 1;
    const messageTime =
      item.timestamp && !isNaN(item.timestamp.getTime())
        ? dayjs(item.timestamp).fromNow()
        : '';

    return (
      <View
        style={[
          styles.messageContainer,
          isCurrentUser ? styles.currentUserMessage : styles.otherUserMessage,
          {
            backgroundColor: isCurrentUser ? theme.tint : theme.card,
            maxWidth: isTablet ? '70%' : '80%',
          },
        ]}
      >
        {/* Avatar and sender name */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
          <TouchableOpacity
            onPress={() =>
              setProfileModal({
                visible: true,
                name: item.senderName || 'Unknown',
                email: item.senderEmail || '',
                city: item.senderCity || item.city || '',
              })
            }
            style={styles.avatar}
          >
            <Text style={styles.avatarText}>
              {(item.senderName || item.senderEmail || 'U').charAt(0).toUpperCase()}
            </Text>
          </TouchableOpacity>
          <Text style={[styles.senderName, { color: theme.text }]}>
            {item.senderName || 'Unknown'}
          </Text>
        </View>

        {renderMessageContent(item, isCurrentUser)}

        <View style={styles.messageFooter}>
          <Text
            style={[
              styles.messageTime,
              { color: isCurrentUser ? '#ffffff' : theme.textMuted },
            ]}
          >
            {messageTime}
          </Text>
          {isCurrentUser && (
            <Ionicons
              name={isRead ? 'checkmark-done' : 'checkmark'}
              size={16}
              color={isRead ? '#ffffff' : theme.textMuted}
              style={styles.readReceipt}
            />
          )}
        </View>
      </View>
    );
  };

  const renderMessageContent = (message: Message, isCurrentUser: boolean) => {
    switch (message.type) {
      case 'image':
        return (
          <TouchableOpacity onPress={() => viewMedia(message.metadata?.uri, 'image')}>
            <Image
              source={{ uri: message.metadata?.uri }}
              style={styles.mediaMessage}
              resizeMode="cover"
            />
          </TouchableOpacity>
        );
      case 'video':
        return (
          <TouchableOpacity
            style={styles.mediaMessage}
            onPress={() => viewMedia(message.metadata?.uri, 'video')}
          >
            <MaterialIcons
              name="videocam"
              size={48}
              color={isCurrentUser ? '#ffffff' : theme.text}
            />
            <Text style={[styles.mediaText, { color: isCurrentUser ? '#ffffff' : theme.text }]}>
              Video
            </Text>
          </TouchableOpacity>
        );
      case 'document':
        return (
          <TouchableOpacity
            style={styles.documentMessage}
            onPress={() => viewMedia(message.metadata?.uri, 'document')}
          >
            <MaterialIcons
              name="insert-drive-file"
              size={32}
              color={isCurrentUser ? '#ffffff' : theme.text}
            />
            <View style={styles.documentInfo}>
              <Text
                style={[styles.documentName, { color: isCurrentUser ? '#ffffff' : theme.text }]}
                numberOfLines={1}
                ellipsizeMode="middle"
              >
                {message.metadata?.fileName || 'Document'}
              </Text>
              <Text style={[styles.documentSize, { color: isCurrentUser ? '#e0e0e0' : theme.textMuted }]}>
                {formatFileSize(message.metadata?.fileSize)}
              </Text>
            </View>
          </TouchableOpacity>
        );
      case 'audio':
        return (
          <View style={styles.audioMessage}>
            <TouchableOpacity onPress={() => playAudio(message.metadata?.uri)}>
              <MaterialIcons
                name="play-circle"
                size={48}
                color={isCurrentUser ? '#ffffff' : theme.tint}
              />
            </TouchableOpacity>
            <Text style={[styles.audioDuration, { color: isCurrentUser ? '#ffffff' : theme.text }]}>
              {formatDuration(message.metadata?.duration)}
            </Text>
          </View>
        );
      case 'location':
        return (
          <TouchableOpacity
            style={styles.locationMessage}
            onPress={() => openLocation(message.metadata?.latitude, message.metadata?.longitude)}
          >
            <MaterialCommunityIcons name="map-marker" size={48} color="#ff0000" />
            <Text style={[styles.locationText, { color: isCurrentUser ? '#ffffff' : theme.text }]}>
              View Location
            </Text>
          </TouchableOpacity>
        );
      default:
        return (
          <Text style={[styles.messageText, { color: isCurrentUser ? '#ffffff' : theme.text }]}>
            {message.content}
          </Text>
        );
    }
  };

  const viewMedia = (uri?: string, type?: string) => {
    if (!uri) return;
    Alert.alert(
      'Media',
      type === 'image' ? 'Image' : type === 'video' ? 'Video' : 'Document',
      [
        { text: 'Open', onPress: () => Linking.openURL(uri) },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const playAudio = async (uri?: string) => {
    if (!uri) return;
    try {
      const { sound } = await Audio.Sound.createAsync({ uri });
      await sound.playAsync();
    } catch (error) {
      console.error('Error playing audio:', error);
    }
  };

  const openLocation = (lat?: number, lng?: number) => {
    if (!lat || !lng) return;
    Alert.alert(
      'Location',
      `Latitude: ${lat}, Longitude: ${lng}`,
      [
        {
          text: 'Open in Maps',
          onPress: () => Linking.openURL(`https://www.google.com/maps?q=${lat},${lng}`),
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={{ flex: 1 }}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.tint} />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messagesList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="chatbubbles-outline" size={48} color={theme.textMuted} />
                <Text style={[styles.emptyText, { color: theme.textMuted }]}>
                  No messages yet. Start the conversation!
                </Text>
              </View>
            }
          />
        )}

        {/* Input Area (fixed at bottom, above keyboard) */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          <ChatInput
            onSend={handleSend}
            onSendMedia={handleSendMedia}
            onSendAudio={handleSendAudio}
            disabled={isLoading || !user}
          />
        </KeyboardAvoidingView>

        {/* Profile Modal */}
        <Modal
          visible={profileModal.visible}
          transparent
          animationType="fade"
          onRequestClose={() => setProfileModal({ ...profileModal, visible: false })}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={[styles.avatar, { alignSelf: 'center', marginBottom: 12, width: 60, height: 60 }]}>
                <Text style={[styles.avatarText, { fontSize: 28 }]}>
                  {profileModal.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <Text style={styles.modalName}>{profileModal.name}</Text>
              <Text style={styles.modalEmail}>{profileModal.email}</Text>
              <Text style={styles.modalCity}>{profileModal.city}</Text>
              <TouchableOpacity
                style={styles.modalClose}
                onPress={() => setProfileModal({ ...profileModal, visible: false })}
              >
                <Text style={{ color: '#2563eb', fontWeight: 'bold' }}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  messagesList: {
    padding: 16,
  },
  messageContainer: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  currentUserMessage: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: 0,
  },
  otherUserMessage: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 0,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  avatarText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  senderName: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  messageText: {
    fontSize: 16,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  messageTime: {
    fontSize: 10,
  },
  readReceipt: {
    marginLeft: 4,
  },
  mediaMessage: {
    width: 200,
    height: 200,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  mediaText: {
    marginTop: 8,
  },
  documentMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 8,
    maxWidth: 200,
  },
  documentInfo: {
    marginLeft: 8,
    flex: 1,
  },
  documentName: {
    fontSize: 14,
  },
  documentSize: {
    fontSize: 12,
    marginTop: 2,
  },
  audioMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  audioDuration: {
    marginLeft: 8,
    fontSize: 14,
  },
  locationMessage: {
    alignItems: 'center',
    padding: 8,
  },
  locationText: {
    marginTop: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
  attachmentMenu: {
    position: 'absolute',
    bottom: 60,
    left: 16,
    right: 16,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
    zIndex: 10,
  },
  attachmentMenuItem: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  attachmentMenuText: {
    marginLeft: 8,
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    width: 280,
  },
  modalName: {
    fontWeight: 'bold',
    fontSize: 18,
    marginBottom: 4,
    color: '#22223b',
  },
  modalEmail: {
    fontSize: 14,
    color: '#6366f1',
    marginBottom: 2,
  },
  modalCity: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 12,
  },
  modalClose: {
    marginTop: 8,
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
});

export default ChatScreen;

// Fix getAuth to return the Firebase Auth instance
import { getAuth as _getAuth } from 'firebase/auth';
function getAuth() {
  return _getAuth();
}