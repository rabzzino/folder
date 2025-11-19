import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { supabase } from '../../lib/supabase';
import { Link, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SignUp() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function signUpWithEmail() {
    if (!email || !password) {
        Alert.alert("Error", "Please enter email and password");
        return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) Alert.alert("Sign Up Failed", error.message);
    else {
        Alert.alert("Success", "Check your email for the confirmation link!");
        router.replace('/login');
    }
    setLoading(false);
  }

  return (
    <SafeAreaView className="flex-1 bg-background justify-center px-6">
      <View className="mb-12">
        <Text className="text-primary text-4xl font-bold mb-2">Create Account</Text>
        <Text className="text-textMuted text-lg">Start your journey with AI-powered planning.</Text>
      </View>

      <View className="space-y-5">
        <View className="bg-surface p-4 rounded-2xl border border-border">
          <TextInput
            onChangeText={(text) => setEmail(text)}
            value={email}
            placeholder="Email Address"
            placeholderTextColor="#666"
            autoCapitalize="none"
            className="text-text text-lg"
          />
        </View>
        <View className="bg-surface p-4 rounded-2xl border border-border">
          <TextInput
            onChangeText={(text) => setPassword(text)}
            value={password}
            placeholder="Password"
            placeholderTextColor="#666"
            secureTextEntry={true}
            autoCapitalize="none"
            className="text-text text-lg"
          />
        </View>
      </View>

      <TouchableOpacity 
        onPress={signUpWithEmail}
        disabled={loading}
        className="mt-10 bg-primary p-5 rounded-2xl items-center shadow-lg shadow-primary/20 active:opacity-90"
      >
        <Text className="text-background font-bold text-xl">{loading ? 'Creating...' : 'Sign Up'}</Text>
      </TouchableOpacity>

      <View className="flex-row justify-center mt-8">
        <Text className="text-textMuted text-lg">Already have an account? </Text>
        <Link href="/login" asChild>
          <TouchableOpacity>
            <Text className="text-primary font-bold text-lg">Sign In</Text>
          </TouchableOpacity>
        </Link>
      </View>
    </SafeAreaView>
  );
}

