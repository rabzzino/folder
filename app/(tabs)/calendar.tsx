import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Alert, Platform, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Calendar from 'expo-calendar';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthProvider';
import FontAwesome from '@expo/vector-icons/FontAwesome';

export default function CalendarScreen() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      if (status === 'granted') {
        await Calendar.requestRemindersPermissionsAsync();
      }
    })();
    
    if (user) fetchTasks();
  }, [user]);

  const fetchTasks = async () => {
    // Fetch all pending tasks
    const { data } = await supabase
        .from('tasks')
        .select('*, plans(title)')
        .eq('status', 'pending');
    if (data) setTasks(data);
  };

  const toggleTask = async (taskId: string) => {
      // Optimistic update
      setTasks(prev => prev.filter(t => t.id !== taskId));
      
      const { error } = await supabase
          .from('tasks')
          .update({ status: 'completed' })
          .eq('id', taskId);
      
      if (error) {
          // Revert if error (fetch again)
          fetchTasks();
      }
  };

  const syncToCalendar = async () => {
    try {
        const { status } = await Calendar.requestCalendarPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert("Permission needed", "We need calendar access to sync your tasks.");
            return;
        }

        const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
        const defaultCalendar = calendars.find(c => c.isPrimary) || calendars[0];

        if (!defaultCalendar) {
            Alert.alert("Error", "No calendar found on device.");
            return;
        }

        let count = 0;
        for (const task of tasks) {
             // Simple logic: Create event for tomorrow if no date, or use due_date
             const startDate = task.due_date ? new Date(task.due_date) : new Date(Date.now() + 86400000);
             const endDate = new Date(startDate.getTime() + 3600000); // 1 hour

             await Calendar.createEventAsync(defaultCalendar.id, {
                 title: `PlannerAI: ${task.title}`,
                 startDate,
                 endDate,
                 notes: task.description,
                 location: 'PlannerAI App'
             });
             count++;
        }

        Alert.alert("Success", `Synced ${count} tasks to your calendar!`);

    } catch (e: any) {
        Alert.alert("Error", e.message);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background p-4">
      <Text className="text-3xl font-bold text-text mb-2">Calendar</Text>
      <Text className="text-textMuted mb-6">Sync your plan tasks to your device calendar.</Text>

      <View className="bg-surface p-6 rounded-2xl border border-border items-center mb-8">
         <View className="w-16 h-16 bg-primary/20 rounded-full items-center justify-center mb-4">
            <FontAwesome name="calendar" size={32} color="#D4AF37" />
         </View>
         <Text className="text-text font-bold text-xl mb-2">Sync Tasks</Text>
         <Text className="text-textMuted text-center mb-6">
            Add {tasks.length} pending tasks to your default calendar to stay on track.
         </Text>
         
         <TouchableOpacity 
            onPress={syncToCalendar}
            className="bg-primary py-3 px-8 rounded-xl shadow-lg shadow-primary/20"
         >
            <Text className="text-background font-bold text-lg">Sync Now</Text>
         </TouchableOpacity>
      </View>

      <Text className="text-text font-bold text-xl mb-4">Upcoming Tasks</Text>
      <FlatList 
        data={tasks}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
            <View className="bg-surface p-4 rounded-xl border border-border mb-3 flex-row items-center">
                <View className="w-1 h-8 bg-primary rounded-full mr-4" />
                <View className="flex-1">
                    <Text className="text-text font-medium">{item.title}</Text>
                    <Text className="text-textMuted text-xs">{item.plans?.title}</Text>
                </View>
                <TouchableOpacity onPress={() => toggleTask(item.id)} className="ml-2">
                    <View className="w-8 h-8 rounded-full border border-border items-center justify-center">
                        <FontAwesome name="check" size={12} color="#666" />
                    </View>
                </TouchableOpacity>
            </View>
        )}
      />
    </SafeAreaView>
  );
}
