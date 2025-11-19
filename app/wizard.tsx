import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { OpenAIService, PlanType } from '../lib/openai';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthProvider';
import Animated, { FadeIn } from 'react-native-reanimated';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
}

const PLAN_TYPES = [
    { id: 'fitness', label: 'Fitness Journey', icon: 'heartbeat' },
    { id: 'wedding', label: 'Wedding', icon: 'heart' },
    { id: 'home', label: 'Home Rota', icon: 'home' },
    { id: 'general', label: 'Other', icon: 'list' },
];

export default function WizardScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [planType, setPlanType] = useState<PlanType | null>(null);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
     // Initial state: No messages, user sees selection buttons
  }, []);

  const selectPlanType = (type: string) => {
      const selectedType = type as PlanType;
      setPlanType(selectedType);
      
      let initialQuestion = "";
      switch(selectedType) {
          case 'wedding': initialQuestion = "Congratulations! When is the big day and how many guests are you expecting?"; break;
          case 'fitness': initialQuestion = "Let's get moving. What are your main fitness goals and current activity level?"; break;
          case 'home': initialQuestion = "A tidy home is a happy home. Who lives with you and what are the main chores you need help with?"; break;
          default: initialQuestion = "What would you like to plan today? Give me as much detail as possible."; break;
      }

      setMessages([
          { id: '1', text: initialQuestion, sender: 'ai' }
      ]);
  };

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMsg: Message = { id: Date.now().toString(), text: input, sender: 'user' };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    
    // If we have context (messages > 1), generate plan. 
    // Real app would have a more complex state machine or intent classification.
    if (messages.length >= 1) {
        generatePlan(input);
    }
  };

  const generatePlan = async (context: string) => {
      if (!user || !planType) return;
      setLoading(true);
      
      setMessages(prev => [...prev, { id: 'generating', text: 'Designing your perfect plan... This may take a moment.', sender: 'ai' }]);

      try {
          // Combine all user messages for context
          const fullContext = messages
            .filter(m => m.sender === 'user')
            .map(m => m.text)
            .join(" ");

          const planData = await OpenAIService.generatePlan({
              type: planType,
              context: fullContext + " " + context
          });

          const { data: plan, error: planError } = await supabase
            .from('plans')
            .insert({
                user_id: user.id,
                title: planData.title,
                type: planData.type,
                description: planData.description,
                metadata: planData
            })
            .select()
            .single();

          if (planError) throw planError;

          if (planData.tasks && planData.tasks.length > 0) {
             const tasksToInsert = planData.tasks.map((t: any) => ({
                 plan_id: plan.id,
                 title: t.title,
                 description: t.description,
                 priority: t.priority,
                 status: 'pending'
             }));
             
             const { error: taskError } = await supabase.from('tasks').insert(tasksToInsert);
             if (taskError) throw taskError;
          }

          router.replace(`/plan/${plan.id}`);

      } catch (error: any) {
          Alert.alert("Error", error.message);
          setMessages(prev => prev.filter(m => m.id !== 'generating'));
          setLoading(false);
      }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <Stack.Screen options={{ headerShown: false }} />
      
      <View className="flex-row items-center p-4 border-b border-border">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
            <FontAwesome name="arrow-left" size={24} color="#D4AF37" />
        </TouchableOpacity>
        <Text className="text-text font-bold text-xl">New Plan</Text>
      </View>

      {!planType ? (
        <View className="flex-1 p-6 justify-center">
            <Text className="text-3xl font-bold text-text mb-2">What would you like to plan?</Text>
            <Text className="text-textMuted text-lg mb-8">Select a category to get started.</Text>
            
            <View className="flex-row flex-wrap justify-between">
                {PLAN_TYPES.map((type, index) => (
                    <Animated.View 
                        key={type.id} 
                        entering={FadeIn.delay(index * 100)}
                        className="w-[48%] mb-4"
                    >
                        <TouchableOpacity 
                            onPress={() => selectPlanType(type.id)}
                            className="bg-surface p-6 rounded-2xl border border-border items-center aspect-square justify-center"
                        >
                            <FontAwesome name={type.icon as any} size={32} color="#D4AF37" className="mb-4" />
                            <Text className="text-text font-bold text-center">{type.label}</Text>
                        </TouchableOpacity>
                    </Animated.View>
                ))}
            </View>
        </View>
      ) : (
          <>
            <FlatList
                ref={flatListRef}
                data={messages}
                keyExtractor={item => item.id}
                contentContainerStyle={{ padding: 16 }}
                renderItem={({ item }) => (
                    <View className={`mb-4 max-w-[80%] p-4 rounded-2xl ${item.sender === 'user' ? 'bg-primary self-end' : 'bg-surface self-start border border-border'}`}>
                        <Text className={item.sender === 'user' ? 'text-background font-medium' : 'text-text'}>{item.text}</Text>
                    </View>
                )}
                onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
            />

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                <View className="p-4 border-t border-border bg-background flex-row items-center">
                    <TextInput 
                        className="flex-1 bg-surface text-text p-4 rounded-xl border border-border mr-2"
                        placeholder="Type your message..."
                        placeholderTextColor="#666"
                        value={input}
                        onChangeText={setInput}
                        editable={!loading}
                    />
                    <TouchableOpacity 
                        onPress={sendMessage} 
                        disabled={loading}
                        className={`p-4 rounded-xl ${loading ? 'bg-surface' : 'bg-primary'}`}
                    >
                        {loading ? <ActivityIndicator color="#D4AF37" /> : <FontAwesome name="send" size={20} color="#0A0A0A" />}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
          </>
      )}
    </SafeAreaView>
  );
}
