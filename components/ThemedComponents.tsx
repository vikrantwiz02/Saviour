import React from 'react';
import { 
  View as DefaultView, 
  Text as DefaultText, 
  TextInput as DefaultTextInput,
  ViewProps,
  TextProps,
  TextInputProps,
  StyleProp,
  ViewStyle,
  TextStyle
} from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

type ThemeProps = {
  lightColor?: string;
  darkColor?: string;
};

export type ThemedViewProps = ThemeProps & ViewProps;
export type ThemedTextProps = ThemeProps & TextProps;
export type ThemedTextInputProps = ThemeProps & TextInputProps;

export function ThemedView(props: ThemedViewProps) {
  const { style, lightColor, darkColor, ...otherProps } = props;
  const theme = useColorScheme() ?? 'light';

  const backgroundColor = theme === 'light' 
    ? lightColor || Colors.light.background 
    : darkColor || Colors.dark.background;

  return <DefaultView style={[{ backgroundColor }, style]} {...otherProps} />;
}

export function ThemedText(props: ThemedTextProps) {
  const { style, lightColor, darkColor, ...otherProps } = props;
  const theme = useColorScheme() ?? 'light';

  const color = theme === 'light' 
    ? lightColor || Colors.light.text 
    : darkColor || Colors.dark.text;

  return <DefaultText style={[{ color }, style]} {...otherProps} />;
}

export function ThemedTextInput(props: ThemedTextInputProps) {
  const { style, lightColor, darkColor, ...otherProps } = props;
  const theme = useColorScheme() ?? 'light';

  const textColor = theme === 'light' 
    ? lightColor || Colors.light.text 
    : darkColor || Colors.dark.text;

  const placeholderTextColor = theme === 'light'
    ? Colors.light.textMuted
    : Colors.dark.textMuted;

  const backgroundColor = theme === 'light'
    ? Colors.light.inputBackground
    : Colors.dark.inputBackground;

  const borderColor = theme === 'light'
    ? Colors.light.border
    : Colors.dark.border;

  return (
    <DefaultTextInput
      style={[{ 
        color: textColor,
        backgroundColor,
        borderColor,
      }, style]}
      placeholderTextColor={placeholderTextColor}
      {...otherProps}
    />
  );
}