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
      <View className="mb-12 border-l-4 border-black pl-4">
        <Text className="text-black text-4xl font-bold mb-2 font-mono uppercase">JOIN US</Text>
        <Text className="text-textMuted text-lg font-mono uppercase">START PLANNING INTELLIGENTLY.</Text>
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
        onPress={signUpWithEmail}
        disabled={loading}
        className="mt-10 btn-brutal items-center bg-black active:bg-neutral-800"
      >
        <Text className="text-white font-bold text-xl font-mono uppercase">{loading ? 'CREATING...' : 'SIGN UP'}</Text>
      </TouchableOpacity>

      <View className="flex-row justify-center mt-8 items-center">
        <Text className="text-black text-lg font-mono mr-2">HAVE AN ACCOUNT?</Text>
        <Link href="/login" asChild>
          <TouchableOpacity>
            <Text className="text-black font-bold text-lg font-mono underline uppercase">LOGIN</Text>
          </TouchableOpacity>
        </Link>
      </View>
    </SafeAreaView>
  );
}
