import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { supabase } from '../../lib/supabase';
import { Link, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function signInWithEmail() {
    if (!email || !password) {
        Alert.alert("Error", "Please enter email and password");
        return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) Alert.alert("Sign In Failed", error.message);
    else router.replace('/(tabs)');
    setLoading(false);
  }

  return (
    <SafeAreaView className="flex-1 bg-background justify-center px-6">
      <View className="mb-12">
        <Text className="text-primary text-5xl font-bold mb-2 tracking-tight">PlannerAI</Text>
        <Text className="text-textMuted text-xl font-light">Design your life, intelligently.</Text>
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
        onPress={signInWithEmail}
        disabled={loading}
        className="mt-10 bg-primary p-5 rounded-2xl items-center shadow-lg shadow-primary/20 active:opacity-90"
      >
        <Text className="text-background font-bold text-xl">{loading ? 'Authenticating...' : 'Sign In'}</Text>
      </TouchableOpacity>

      <View className="flex-row justify-center mt-8">
        <Text className="text-textMuted text-lg">New here? </Text>
        <Link href="/sign-up" asChild>
          <TouchableOpacity>
            <Text className="text-primary font-bold text-lg">Create Account</Text>
          </TouchableOpacity>
        </Link>
      </View>
    </SafeAreaView>
  );
}

