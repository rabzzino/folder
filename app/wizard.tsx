import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Stack, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Platform, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthProvider';
import { OpenAIService, PlanType } from '../lib/openai';
import { supabase } from '../lib/supabase';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  options?: string[];
}

const PLAN_TYPES = [
    { id: 'fitness', label: 'FITNESS', icon: 'heartbeat' },
    { id: 'wedding', label: 'WEDDING', icon: 'heart' },
    { id: 'home', label: 'HOME', icon: 'home' },
    { id: 'general', label: 'OTHER', icon: 'list' },
];

export default function WizardScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [planType, setPlanType] = useState<PlanType | null>(null);
  const [loading, setLoading] = useState(false);
  const [readyToPlan, setReadyToPlan] = useState(false);
  const [userProfile, setUserProfile] = useState<{ full_name?: string, username?: string, location?: string }>({});
  
  const { user } = useAuth();
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
      if (user) fetchUserProfile();
  }, [user]);

  const fetchUserProfile = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('full_name, username, location')
        .eq('id', user?.id)
        .single();
      
      if (data) setUserProfile(data);
  };

  const selectPlanType = async (type: string) => {
      const selectedType = type as PlanType;
      setPlanType(selectedType);
      setLoading(true);
      
      try {
          const userContext = {
              name: userProfile.full_name || userProfile.username || 'User',
              currentDate: new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
          };
          const response = await OpenAIService.chat([], selectedType, userContext);
          setMessages([{ 
              id: Date.now().toString(), 
              text: response.message.toUpperCase(), 
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

    const userMsg: Message = { id: Date.now().toString(), text: textToSend.toUpperCase(), sender: 'user' };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
        const history = messages.concat(userMsg).map(m => ({
            role: m.sender === 'user' ? 'user' : 'assistant',
            content: m.text
        })) as any;

        const userContext = {
            name: userProfile.full_name || userProfile.username || 'User',
            currentDate: new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
        };
        const response = await OpenAIService.chat(history, planType || 'general', userContext);
        
        const aiMsg: Message = {
            id: (Date.now() + 1).toString(),
            text: response.message.toUpperCase(),
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
      
      setMessages(prev => [...prev, { id: 'generating', text: 'DESIGNING YOUR PLAN...', sender: 'ai' }]);

      try {
          const fullContext = messages
            .filter(m => m.sender === 'user')
            .map(m => m.text)
            .join(" ");

          const planData = await OpenAIService.generatePlan({
              type: planType,
              context: fullContext,
              location: userProfile.location,
              currentDate: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
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
             // Calculate due dates based on due_offset_days
             const startDate = new Date();
             
             const tasksToInsert = planData.tasks.map((t: any, index: number) => {
                 // Calculate due date from offset with smart fallbacks
                 let dueDate = new Date(startDate);
                 let offsetDays = t.due_offset_days;
                 
                 // Smart fallback if AI didn't provide offset
                 if (offsetDays === null || offsetDays === undefined) {
                     console.warn(`Task "${t.title}" missing due_offset_days, applying fallback`);
                     offsetDays = getSmartFallbackOffset(planType, index);
                 }
                 
                 dueDate.setDate(startDate.getDate() + offsetDays);
                 dueDate.setHours(12, 0, 0, 0); // Set to noon by default
                 
                 return {
                     plan_id: plan.id,
                     title: t.title,
                     description: t.description,
                     category: t.category,
                     priority: t.priority,
                     due_date: dueDate.toISOString(),
                     status: 'pending'
                 };
             });
             
             const { error: taskError } = await supabase.from('tasks').insert(tasksToInsert);
             if (taskError) throw taskError;
          }
          
          // Smart fallback function for missing due dates
          function getSmartFallbackOffset(type: string, taskIndex: number): number {
              const fallbacks = {
                  wedding: [0, 7, 14, 30, 60, 90, 120, 150, 180], // Spread over 6 months
                  fitness: [0, 7, 14, 21, 28, 35, 42, 49, 56], // Weekly progression
                  home: [0, 1, 3, 7, 10, 14, 21], // Daily to weekly
                  general: [0, 3, 7, 14, 21, 30] // Mixed urgency
              };
              
              const offsets = fallbacks[type as keyof typeof fallbacks] || fallbacks.general;
              return offsets[taskIndex % offsets.length] || (taskIndex * 7); // Fallback to weekly if beyond array
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
      
      <View className="flex-row items-center p-4 border-b-2 border-black">
        <TouchableOpacity onPress={() => router.back()} className="mr-4 border-2 border-black p-2 bg-white shadow-block-sm active:shadow-none active:translate-y-0.5">
            <FontAwesome name="arrow-left" size={16} color="#000000" />
        </TouchableOpacity>
        <Text className="text-black font-bold text-xl font-mono uppercase">AI PLANNER</Text>
        {readyToPlan && (
            <TouchableOpacity onPress={generatePlan} className="ml-auto bg-black px-4 py-2 border-2 border-black shadow-block-sm active:translate-y-0.5 active:shadow-none">
                <Text className="text-white font-bold text-xs font-mono uppercase">CREATE</Text>
            </TouchableOpacity>
        )}
      </View>

      {!planType ? (
        <View className="flex-1 p-6 justify-center">
             {loading ? (
                <ActivityIndicator size="large" color="#000000" />
             ) : (
                <>
                    <View className="border-l-4 border-black pl-4 mb-8">
                        <Text className="text-3xl font-bold text-black mb-2 font-mono uppercase">WHAT'S THE PLAN?</Text>
                        <Text className="text-textMuted text-lg font-mono uppercase">SELECT A CATEGORY.</Text>
                    </View>
                    
                    <View className="flex-row flex-wrap justify-between">
                        {PLAN_TYPES.map((type, index) => (
                            <Animated.View 
                                key={type.id} 
                                entering={FadeIn.delay(index * 100)}
                                className="w-[48%] mb-4"
                            >
                                <TouchableOpacity 
                                    onPress={() => selectPlanType(type.id)}
                                    className="bg-white p-6 border-2 border-black items-center aspect-square justify-center shadow-block active:shadow-none active:translate-y-1"
                                >
                                    <FontAwesome name={type.icon as any} size={32} color="#000000" className="mb-4" />
                                    <Text className="text-black font-bold text-center font-mono uppercase">{type.label}</Text>
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
                        <View className={`p-4 border-2 border-black shadow-block-sm ${item.sender === 'user' ? 'bg-black' : 'bg-white'}`}>
                            <Text className={`font-mono font-bold ${item.sender === 'user' ? 'text-white' : 'text-black'}`}>{item.text}</Text>
                        </View>
                        
                        {item.sender === 'ai' && item.options && (
                            <View className="flex-row flex-wrap mt-3 pl-1">
                                {item.options.map((opt: string, idx: number) => (
                                    <TouchableOpacity 
                                        key={idx} 
                                        onPress={() => sendMessage(opt)}
                                        disabled={loading}
                                        className="bg-white border-2 border-black px-4 py-2 mr-2 mb-2 shadow-block-sm active:shadow-none active:translate-y-0.5"
                                    >
                                        <Text className="text-black text-xs font-bold font-mono uppercase">{opt}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </View>
                )}
                onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
            />

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                <View className="p-4 border-t-2 border-black bg-background flex-row items-center">
                    <TextInput 
                        className="flex-1 bg-white text-black p-4 border-2 border-black mr-2 font-mono h-14 shadow-block-sm"
                        placeholder={readyToPlan ? "SAY 'CREATE'..." : "TYPE OR SELECT..."}
                        placeholderTextColor="#999"
                        value={input}
                        onChangeText={setInput}
                        editable={!loading}
                    />
                    <TouchableOpacity 
                        onPress={() => sendMessage()} 
                        disabled={loading}
                        className={`p-4 border-2 border-black h-14 w-14 items-center justify-center shadow-block-sm active:shadow-none active:translate-y-0.5 ${loading ? 'bg-white' : 'bg-black'}`}
                    >
                        {loading ? <ActivityIndicator color="#000000" /> : <FontAwesome name="send" size={20} color="#FFFFFF" />}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
          </>
      )}
    </SafeAreaView>
  );
}
