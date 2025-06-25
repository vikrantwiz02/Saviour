import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";

interface MapControlsProps {
  onCenterPress: () => void;
  onFilterPress: () => void;
  onSOSPress?: () => void;
}

export const MapControls: React.FC<MapControlsProps> = ({
  onCenterPress,
  onFilterPress,
  onSOSPress,
}) => {
  const colorScheme = useColorScheme() ?? "light";
  const s = styles(colorScheme);

  return (
    <View style={s.container}>
      <TouchableOpacity style={s.button} onPress={onFilterPress}>
        <IconSymbol
          name="line.3.horizontal.decrease.circle.fill"
          size={26}
          color={Colors[colorScheme].text}
        />
      </TouchableOpacity>

      {onSOSPress && (
        <TouchableOpacity style={s.sosButton} onPress={onSOSPress}>
          <IconSymbol name="exclamationmark.triangle.fill" size={26} color="#fff" />
        </TouchableOpacity>
      )}

      <TouchableOpacity style={s.button} onPress={onCenterPress}>
        <IconSymbol
          name="location.circle.fill"
          size={26}
          color={Colors[colorScheme].text}
        />
      </TouchableOpacity>
    </View>
  );
};

const styles = (colorScheme: "light" | "dark") =>
  StyleSheet.create({
    container: {
      position: "absolute",
      right: 16,
      top: 16,
      zIndex: 10,
    },
    button: {
      backgroundColor: Colors[colorScheme].background + "cc",
      padding: 10,
      borderRadius: 20,
      marginBottom: 12,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 3,
    },
    sosButton: {
      backgroundColor: "#FF3B30",
      padding: 12,
      borderRadius: 20,
      marginBottom: 12,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 3,
    },
  });