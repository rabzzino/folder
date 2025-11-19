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
      <View className="mb-12 border-l-4 border-black pl-4">
        <Text className="text-black text-5xl font-bold mb-2 font-mono uppercase">PLANNER.AI</Text>
        <Text className="text-textMuted text-xl font-mono">DESIGN YOUR LIFE.</Text>
      </View>

      <View className="space-y-6">
        <View className="card-brutal p-0">
          <Text className="bg-black text-white text-xs font-bold px-2 py-1 self-start font-mono uppercase">EMAIL</Text>
          <TextInput
            onChangeText={(text) => setEmail(text)}
            value={email}
            placeholder="ENTER EMAIL..."
            placeholderTextColor="#999"
            autoCapitalize="none"
            className="text-black text-lg font-mono p-4 h-14"
          />
        </View>
        <View className="card-brutal p-0">
          <Text className="bg-black text-white text-xs font-bold px-2 py-1 self-start font-mono uppercase">PASSWORD</Text>
          <TextInput
            onChangeText={(text) => setPassword(text)}
            value={password}
            placeholder="ENTER PASSWORD..."
            placeholderTextColor="#999"
            secureTextEntry={true}
            autoCapitalize="none"
            className="text-black text-lg font-mono p-4 h-14"
          />
        </View>
      </View>

      <TouchableOpacity 
        onPress={signInWithEmail}
        disabled={loading}
        className="mt-10 btn-brutal items-center bg-black active:bg-neutral-800"
      >
        <Text className="text-white font-bold text-xl font-mono uppercase">{loading ? 'LOADING...' : 'ENTER'}</Text>
      </TouchableOpacity>

      <View className="flex-row justify-center mt-8 items-center">
        <Text className="text-black text-lg font-mono mr-2">NEW?</Text>
        <Link href="/sign-up" asChild>
          <TouchableOpacity>
            <Text className="text-black font-bold text-lg font-mono underline uppercase">CREATE ACCOUNT</Text>
          </TouchableOpacity>
        </Link>
      </View>
    </SafeAreaView>
  );
}
