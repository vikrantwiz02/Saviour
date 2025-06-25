import { View, TextInput, TouchableOpacity, Keyboard, GestureResponderEvent } from "react-native";
import { useState, useRef } from "react";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { Audio } from "expo-av"; // Use expo-av for now, expo-audio is not yet stable for all features

interface ChatInputProps {
  onSend: (text: string) => void;
  onSendMedia: (media: { uri: string; type: "image" | "video" | "audio" | "file"; name?: string }) => void;
  onSendAudio: (uri: string) => void;
  disabled: boolean;
}

export default function ChatInput({ onSend, onSendMedia, onSendAudio, disabled }: ChatInputProps) {
  const [input, setInput] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const recordingRef = useRef<Audio.Recording | null>(null);

  const handleSend = () => {
    if (input.trim()) {
      onSend(input.trim());
      setInput("");
      Keyboard.dismiss();
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: false,
      quality: 0.8,
    });
    if (!result.canceled && result.assets && result.assets[0]) {
      const asset = result.assets[0];
      onSendMedia({
        uri: asset.uri,
        type: asset.type === "video" ? "video" : "image",
        name: asset.fileName || undefined,
      });
    }
  };

  const pickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
    if (result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      onSendMedia({
        uri: asset.uri,
        type: "file",
        name: asset.name,
      });
    }
  };

  // Tap-and-hold voice recording using expo-av
  const onMicPressIn = async (_e: GestureResponderEvent) => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== "granted") return;
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await recording.startAsync();
      recordingRef.current = recording;
      setIsRecording(true);
    } catch (err) {
      setIsRecording(false);
    }
  };

  const onMicPressOut = async (_e: GestureResponderEvent) => {
    if (!recordingRef.current) return;
    setIsRecording(false);
    await recordingRef.current.stopAndUnloadAsync();
    const uri = recordingRef.current.getURI();
    if (uri) {
      onSendAudio(uri);
    }
    recordingRef.current = null;
  };

  return (
    <SafeAreaView edges={["bottom"]} style={{ backgroundColor: "#fff" }}>
      <View style={{
        flexDirection: "row",
        alignItems: "center",
        padding: 8,
        borderTopWidth: 1,
        borderColor: "#eee"
      }}>
        <TouchableOpacity onPress={pickImage} disabled={disabled}>
          <Ionicons name="image" size={26} color={disabled ? "#ccc" : "#007aff"} style={{ marginHorizontal: 4 }} />
        </TouchableOpacity>
        <TouchableOpacity onPress={pickDocument} disabled={disabled}>
          <Ionicons name="attach" size={26} color={disabled ? "#ccc" : "#007aff"} style={{ marginHorizontal: 4 }} />
        </TouchableOpacity>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Type a message..."
          style={{
            flex: 1,
            borderWidth: 1,
            borderColor: "#ccc",
            borderRadius: 20,
            padding: 10,
            fontSize: 16,
            backgroundColor: "#f7f7f7"
          }}
          editable={!disabled}
          onSubmitEditing={handleSend}
          returnKeyType="send"
        />
        <TouchableOpacity
          onPressIn={onMicPressIn}
          onPressOut={onMicPressOut}
          disabled={disabled}
          style={{ marginLeft: 8 }}
        >
          <Ionicons name={isRecording ? "mic-off" : "mic"} size={26} color={isRecording ? "#e53935" : (disabled ? "#ccc" : "#007aff")} />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleSend} disabled={disabled || !input.trim()} style={{ marginLeft: 8 }}>
          <Ionicons name="send" size={24} color={disabled || !input.trim() ? "#ccc" : "#007aff"} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}