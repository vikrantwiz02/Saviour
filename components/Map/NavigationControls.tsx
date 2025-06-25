import React from "react";
import { View, StyleSheet, TouchableOpacity, Text } from "react-native";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";

interface NavigationControlsProps {
  steps: any[];
  currentStep: number;
  onStart: () => void;
  onPause: () => void;
  onStop: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onVoiceToggle: () => void;
  isNavigating: boolean;
  isPaused: boolean;
  voiceType: "male" | "female";
}

export const NavigationControls: React.FC<NavigationControlsProps> = ({
  steps,
  currentStep,
  onStart,
  onPause,
  onStop,
  onNext,
  onPrevious,
  onVoiceToggle,
  isNavigating,
  isPaused,
  voiceType,
}) => {
  const colorScheme = useColorScheme() ?? "light";
  const s = styles(colorScheme);

  if (!steps.length) return null;

  return (
    <View style={s.container}>
      <View style={s.row}>
        <TouchableOpacity style={s.button} onPress={onPrevious} disabled={currentStep === 0}>
          <Text style={s.buttonText}>Prev</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.button} onPress={onStart} disabled={isNavigating}>
          <Text style={s.buttonText}>Start</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.button} onPress={onPause} disabled={!isNavigating}>
          <Text style={s.buttonText}>{isPaused ? "Resume" : "Pause"}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.button} onPress={onStop} disabled={!isNavigating}>
          <Text style={s.buttonText}>Stop</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.button} onPress={onNext} disabled={currentStep === steps.length - 1}>
          <Text style={s.buttonText}>Next</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.button} onPress={onVoiceToggle}>
          <Text style={s.buttonText}>{voiceType === "female" ? "♀️" : "♂️"}</Text>
        </TouchableOpacity>
      </View>
      <Text style={s.stepText}>
        Step {currentStep + 1} / {steps.length}: {steps[currentStep]?.instruction}
      </Text>
    </View>
  );
};

const styles = (colorScheme: "light" | "dark") =>
  StyleSheet.create({
    container: {
      position: "absolute",
      bottom: 16,
      left: 0,
      right: 0,
      alignItems: "center",
      zIndex: 10,
    },
    row: {
      flexDirection: "row",
      justifyContent: "center",
      marginBottom: 8,
    },
    button: {
      backgroundColor: Colors[colorScheme].inputBackground,
      padding: 10,
      borderRadius: 8,
      marginHorizontal: 4,
    },
    buttonText: {
      color: Colors[colorScheme].text,
      fontWeight: "bold",
    },
    stepText: {
      color: Colors[colorScheme].text,
      fontSize: 14,
      textAlign: "center",
      marginTop: 4,
      backgroundColor: Colors[colorScheme].background + "cc",
      padding: 6,
      borderRadius: 8,
    },
  });