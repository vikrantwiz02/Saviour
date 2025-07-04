import React, { useState } from 'react';
import { 
  View, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  KeyboardAvoidingView, 
  Platform,
  ActivityIndicator,
  Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';

  const handleResetPassword = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      Alert.alert(
        'Email Sent',
        'Password reset link has been sent to your email address.',
        [
          { 
            text: 'OK', 
            onPress: () => router.back() 
          }
        ]
      );
    } catch (error: any) {
      handleAuthError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAuthError = (error: any) => {
    console.error('Password reset error:', error);
    let message = 'Failed to send reset email. Please try again.';
    
    switch(error.code) {
      case 'auth/user-not-found':
        message = 'No account found with this email address.';
        break;
      case 'auth/invalid-email':
        message = 'Invalid email address format.';
        break;
      case 'auth/too-many-requests':
        message = 'Too many attempts. Please try again later.';
        break;
    }
    
    Alert.alert('Error', message);
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      padding: 20,
      backgroundColor: Colors[colorScheme].background,
    },
    title: {
      fontSize: 28,
      fontWeight: 'bold',
      marginBottom: 20,
      color: Colors[colorScheme].text,
      textAlign: 'center',
    },
    description: {
      fontSize: 16,
      marginBottom: 30,
      color: Colors[colorScheme].textMuted,
      textAlign: 'center',
    },
    input: {
      height: 50,
      borderWidth: 1,
      borderColor: Colors[colorScheme].border,
      borderRadius: 8,
      padding: 10,
      marginBottom: 20,
      backgroundColor: Colors[colorScheme].inputBackground,
      color: Colors[colorScheme].text,
    },
    button: {
      backgroundColor: Colors[colorScheme].tint,
      padding: 15,
      borderRadius: 8,
      alignItems: 'center',
      marginTop: 10,
    },
    buttonText: {
      color: Colors[colorScheme].text,
      fontWeight: 'bold',
      fontSize: 16,
    },
    backText: {
      color: Colors[colorScheme].tint,
      textAlign: 'center',
      marginTop: 20,
    },
  });

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <ThemedView style={styles.container}>
        <ThemedText style={styles.title}>Reset Password</ThemedText>
        <ThemedText style={styles.description}>
          Enter your email address and we'll send you a link to reset your password.
        </ThemedText>
        
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={Colors[colorScheme].textMuted}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoCorrect={false}
        />
        
        <TouchableOpacity 
          style={styles.button} 
          onPress={handleResetPassword}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={Colors[colorScheme].text} />
          ) : (
            <ThemedText style={styles.buttonText}>Send Reset Link</ThemedText>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity onPress={() => router.back()}>
          <ThemedText style={styles.backText}>Back to Login</ThemedText>
        </TouchableOpacity>
      </ThemedView>
    </KeyboardAvoidingView>
  );
}