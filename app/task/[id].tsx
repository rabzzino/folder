import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { supabase } from '../../lib/supabase';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [task, setTask] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) fetchTask();
  }, [id]);

  const fetchTask = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('tasks')
      .select('*, plans(id, title, type, description)')
      .eq('id', id)
      .single();
    
    if (data) setTask(data);
    if (error) Alert.alert('Error', 'Failed to load task');
    setLoading(false);
  };

  const toggleTaskStatus = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    setTask({ ...task, status: newStatus });
    
    await supabase
      .from('tasks')
      .update({ status: newStatus })
      .eq('id', id);
  };

  const deleteTask = async () => {
    Alert.alert(
      'DELETE TASK',
      'ARE YOU SURE? THIS CANNOT BE UNDONE.',
      [
        { text: 'CANCEL', style: 'cancel' },
        {
          text: 'DELETE',
          style: 'destructive',
          onPress: async () => {
            await supabase.from('tasks').delete().eq('id', id);
            router.back();
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <Text className="text-black font-mono uppercase">LOADING...</Text>
      </SafeAreaView>
    );
  }

  if (!task) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <Text className="text-black font-mono uppercase">TASK NOT FOUND</Text>
      </SafeAreaView>
    );
  }

  const isCompleted = task.status === 'completed';

  return (
    <SafeAreaView className="flex-1 bg-background">
      <Stack.Screen options={{ headerShown: false }} />
      
      <ScrollView className="flex-1 p-4">
        {/* Header */}
        <View className="flex-row justify-between items-center mb-6 border-b-2 border-black pb-4">
          <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 border-2 border-black bg-white items-center justify-center shadow-block-sm active:shadow-none active:translate-y-0.5">
            <FontAwesome name="arrow-left" size={16} color="#000000" />
          </TouchableOpacity>
          <Text className="text-2xl font-bold text-black font-mono uppercase">TASK</Text>
          <TouchableOpacity onPress={deleteTask} className="w-10 h-10 border-2 border-black bg-white items-center justify-center shadow-block-sm active:shadow-none active:translate-y-0.5">
            <FontAwesome name="trash" size={16} color="#000000" />
          </TouchableOpacity>
        </View>

        {/* Status Badge */}
        <Animated.View entering={FadeInDown.delay(100)}>
          <View className={`${isCompleted ? 'bg-black' : 'bg-white'} border-2 border-black p-4 mb-4 shadow-block`}>
            <View className="flex-row items-center justify-between">
              <View className="flex-1">
                <Text className={`${isCompleted ? 'text-white' : 'text-black'} text-xs font-bold font-mono uppercase mb-1`}>STATUS</Text>
                <Text className={`${isCompleted ? 'text-white' : 'text-black'} text-2xl font-bold font-mono uppercase`}>
                  {isCompleted ? '✓ COMPLETED' : '○ PENDING'}
                </Text>
              </View>
              <TouchableOpacity 
                onPress={toggleTaskStatus}
                className={`${isCompleted ? 'bg-white' : 'bg-black'} px-4 py-2 border-2 border-black shadow-block-sm active:shadow-none active:translate-y-0.5`}
              >
                <Text className={`${isCompleted ? 'text-black' : 'text-white'} font-bold font-mono uppercase text-xs`}>
                  {isCompleted ? 'UNDO' : 'MARK DONE'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>

        {/* Task Title */}
        <Animated.View entering={FadeInDown.delay(200)}>
          <View className="bg-white border-2 border-black p-4 mb-4 shadow-block">
            <Text className="text-black text-xs font-bold font-mono uppercase mb-2">TASK</Text>
            <Text className={`text-black text-2xl font-bold font-mono uppercase leading-8 ${isCompleted ? 'line-through opacity-50' : ''}`}>
              {task.title}
            </Text>
          </View>
        </Animated.View>

        {/* Task Description */}
        {task.description && (
          <Animated.View entering={FadeInDown.delay(300)}>
            <View className="bg-white border-2 border-black p-4 mb-4 shadow-block">
              <Text className="text-black text-xs font-bold font-mono uppercase mb-2">DESCRIPTION</Text>
              <Text className={`text-textMuted text-base font-mono leading-6 ${isCompleted ? 'line-through opacity-50' : ''}`}>
                {task.description}
              </Text>
            </View>
          </Animated.View>
        )}

        {/* Due Date */}
        {task.due_date && (
          <Animated.View entering={FadeInDown.delay(400)}>
            <View className="bg-white border-2 border-black p-4 mb-4 shadow-block">
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="text-black text-xs font-bold font-mono uppercase mb-1">DUE DATE</Text>
                  <Text className="text-black text-lg font-bold font-mono">
                    {new Date(task.due_date).toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    }).toUpperCase()}
                  </Text>
                  <Text className="text-textMuted text-sm font-mono mt-1">
                    {new Date(task.due_date).toLocaleTimeString('en-US', { 
                      hour: 'numeric', 
                      minute: '2-digit' 
                    }).toUpperCase()}
                  </Text>
                </View>
                <View className="w-12 h-12 border-2 border-black bg-white items-center justify-center shadow-block-sm">
                  <FontAwesome name="calendar" size={24} color="#000000" />
                </View>
              </View>
            </View>
          </Animated.View>
        )}

        {/* Category/Priority */}
        <Animated.View entering={FadeInDown.delay(500)}>
          <View className="flex-row gap-3 mb-4">
            {task.category && (
              <View className="flex-1 bg-white border-2 border-black p-3 shadow-block-sm">
                <Text className="text-black text-xs font-bold font-mono uppercase mb-1">CATEGORY</Text>
                <Text className="text-black text-sm font-mono uppercase">{task.category}</Text>
              </View>
            )}
            {task.priority && (
              <View className="flex-1 bg-white border-2 border-black p-3 shadow-block-sm">
                <Text className="text-black text-xs font-bold font-mono uppercase mb-1">PRIORITY</Text>
                <Text className="text-black text-sm font-mono uppercase">{task.priority}</Text>
              </View>
            )}
          </View>
        </Animated.View>

        {/* Related Plan */}
        {task.plans && (
          <Animated.View entering={FadeInDown.delay(600)}>
            <TouchableOpacity 
              onPress={() => router.push(`/plan/${task.plans.id}`)}
              activeOpacity={0.7}
            >
              <View className="bg-white border-2 border-black p-4 mb-4 shadow-block active:shadow-none active:translate-y-0.5">
                <View className="flex-row items-center justify-between">
                  <View className="flex-1">
                    <Text className="text-black text-xs font-bold font-mono uppercase mb-1">PART OF PLAN</Text>
                    <Text className="text-black text-lg font-bold font-mono uppercase">{task.plans.title}</Text>
                    {task.plans.type && (
                      <View className="bg-black px-2 py-1 self-start mt-2">
                        <Text className="text-white text-xs font-bold font-mono uppercase">{task.plans.type}</Text>
                      </View>
                    )}
                  </View>
                  <FontAwesome name="arrow-right" size={20} color="#000000" />
                </View>
              </View>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Assigned To */}
        {task.assigned_to && (
          <Animated.View entering={FadeInDown.delay(700)}>
            <View className="bg-white border-2 border-black p-4 mb-4 shadow-block">
              <Text className="text-black text-xs font-bold font-mono uppercase mb-2">ASSIGNED TO</Text>
              <View className="flex-row items-center">
                <View className="w-8 h-8 border-2 border-black bg-black items-center justify-center mr-3">
                  <FontAwesome name="user" size={14} color="#FFFFFF" />
                </View>
                <Text className="text-black text-sm font-mono uppercase">{task.assigned_to}</Text>
              </View>
            </View>
          </Animated.View>
        )}

        {/* Edit Button */}
        <Animated.View entering={FadeInDown.delay(800)}>
          <TouchableOpacity 
            onPress={() => router.push(`/plan/${task.plan_id}`)}
            className="bg-black p-4 border-2 border-black shadow-block items-center mb-4 active:shadow-none active:translate-y-0.5"
          >
            <Text className="text-white font-bold text-lg font-mono uppercase">EDIT IN PLAN VIEW</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

