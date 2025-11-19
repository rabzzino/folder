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
  options?: string[]; // Chips provided by AI
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
  const [readyToPlan, setReadyToPlan] = useState(false);
  
  const { user } = useAuth();
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);

  const selectPlanType = async (type: string) => {
      const selectedType = type as PlanType;
      setPlanType(selectedType);
      setLoading(true);
      
      // Start the chat loop
      try {
          const response = await OpenAIService.chat([], selectedType);
          setMessages([{ 
              id: Date.now().toString(), 
              text: response.message, 
              sender: 'ai',
              options: response.options 
          }]);
      } catch (e) {
          Alert.alert("Error", "Failed to start chat");
      } finally {
          setLoading(false);
      }
  };

  const sendMessage = async (textOverride?: string) => {
    const textToSend = textOverride || input;
    if (!textToSend.trim()) return;

    const userMsg: Message = { id: Date.now().toString(), text: textToSend, sender: 'user' };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
        // Prepare history for API
        const history = messages.concat(userMsg).map(m => ({
            role: m.sender === 'user' ? 'user' : 'assistant',
            content: m.text
        })) as any;

        const response = await OpenAIService.chat(history, planType || 'general');
        
        const aiMsg: Message = {
            id: (Date.now() + 1).toString(),
            text: response.message,
            sender: 'ai',
            options: response.options
        };
        
        setMessages(prev => [...prev, aiMsg]);
        if (response.ready_to_plan) setReadyToPlan(true);

    } catch (e: any) {
        Alert.alert("Error", e.message);
    } finally {
        setLoading(false);
    }
  };

  const generatePlan = async () => {
      if (!user || !planType) return;
      setLoading(true);
      
      setMessages(prev => [...prev, { id: 'generating', text: 'Perfect! Designing your plan now...', sender: 'ai' }]);

      try {
          const fullContext = messages
            .filter(m => m.sender === 'user')
            .map(m => m.text)
            .join(" ");

          const planData = await OpenAIService.generatePlan({
              type: planType,
              context: fullContext
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
        <Text className="text-text font-bold text-xl">AI Planner</Text>
        {readyToPlan && (
            <TouchableOpacity onPress={generatePlan} className="ml-auto bg-primary px-3 py-1 rounded-full">
                <Text className="text-background font-bold text-xs">Create Plan</Text>
            </TouchableOpacity>
        )}
      </View>

      {!planType ? (
        <View className="flex-1 p-6 justify-center">
             {loading ? (
                <ActivityIndicator size="large" color="#D4AF37" />
             ) : (
                <>
                    <Text className="text-3xl font-bold text-text mb-2">What are we planning?</Text>
                    <Text className="text-textMuted text-lg mb-8">Choose a category to start the chat.</Text>
                    
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
                </>
             )}
        </View>
      ) : (
          <>
            <FlatList
                ref={flatListRef}
                data={messages}
                keyExtractor={item => item.id}
                contentContainerStyle={{ padding: 16 }}
                renderItem={({ item }) => (
                    <View className={`mb-4 max-w-[85%] ${item.sender === 'user' ? 'self-end' : 'self-start'}`}>
                        <View className={`p-4 rounded-2xl ${item.sender === 'user' ? 'bg-primary' : 'bg-surface border border-border'}`}>
                            <Text className={item.sender === 'user' ? 'text-background font-medium' : 'text-text'}>{item.text}</Text>
                        </View>
                        
                        {/* Render Options if AI */}
                        {item.sender === 'ai' && item.options && (
                            <View className="flex-row flex-wrap mt-2">
                                {item.options.map((opt, idx) => (
                                    <TouchableOpacity 
                                        key={idx} 
                                        onPress={() => sendMessage(opt)}
                                        disabled={loading}
                                        className="bg-surfaceHighlight border border-border rounded-full px-4 py-2 mr-2 mb-2"
                                    >
                                        <Text className="text-textMuted text-xs font-bold">{opt}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </View>
                )}
                onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
            />

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                <View className="p-4 border-t border-border bg-background flex-row items-center">
                    <TextInput 
                        className="flex-1 bg-surface text-text p-4 rounded-xl border border-border mr-2"
                        placeholder={readyToPlan ? "Say 'Create' or add more details..." : "Type or select an option..."}
                        placeholderTextColor="#666"
                        value={input}
                        onChangeText={setInput}
                        editable={!loading}
                    />
                    <TouchableOpacity 
                        onPress={() => sendMessage()} 
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
