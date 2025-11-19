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
    const { data } = await supabase
        .from('tasks')
        .select('*, plans(title)')
        .eq('status', 'pending');
    if (data) setTasks(data);
  };

  const toggleTask = async (taskId: string) => {
      setTasks(prev => prev.filter(t => t.id !== taskId));
      
      const { error } = await supabase
          .from('tasks')
          .update({ status: 'completed' })
          .eq('id', taskId);
      
      if (error) {
          fetchTasks();
      }
  };

  const syncToCalendar = async () => {
    try {
        const { status } = await Calendar.requestCalendarPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert("PERMISSION NEEDED", "WE NEED CALENDAR ACCESS TO SYNC YOUR TASKS.");
            return;
        }

        const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
        const defaultCalendar = calendars.find(c => c.isPrimary) || calendars[0];

        if (!defaultCalendar) {
            Alert.alert("ERROR", "NO CALENDAR FOUND ON DEVICE.");
            return;
        }

        let count = 0;
        for (const task of tasks) {
             const startDate = task.due_date ? new Date(task.due_date) : new Date(Date.now() + 86400000);
             const endDate = new Date(startDate.getTime() + 3600000); 

             await Calendar.createEventAsync(defaultCalendar.id, {
                 title: `PLANNERAI: ${task.title}`,
                 startDate,
                 endDate,
                 notes: task.description,
                 location: 'PLANNERAI APP'
             });
             count++;
        }

        Alert.alert("SUCCESS", `SYNCED ${count} TASKS TO YOUR CALENDAR!`);

    } catch (e: any) {
        Alert.alert("ERROR", e.message);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background p-4">
      <Text className="text-3xl font-bold text-black mb-2 font-mono uppercase border-b-2 border-black pb-2 self-start">CALENDAR</Text>
      <Text className="text-textMuted mb-6 font-mono uppercase text-sm">SYNC PLAN TASKS TO DEVICE.</Text>

      <View className="bg-white p-6 border-2 border-black shadow-block items-center mb-8">
         <View className="w-16 h-16 bg-white border-2 border-black items-center justify-center mb-4 shadow-block-sm">
            <FontAwesome name="calendar" size={32} color="#000000" />
         </View>
         <Text className="text-black font-bold text-xl mb-2 font-mono uppercase">SYNC TASKS</Text>
         <Text className="text-textMuted text-center mb-6 font-mono uppercase text-xs leading-5">
            ADD {tasks.length} PENDING TASKS TO YOUR DEFAULT CALENDAR TO STAY ON TRACK.
         </Text>
         
         <TouchableOpacity 
            onPress={syncToCalendar}
            className="bg-black py-3 px-8 border-2 border-black shadow-block-sm active:shadow-none active:translate-y-0.5"
         >
            <Text className="text-white font-bold text-lg font-mono uppercase">SYNC NOW</Text>
         </TouchableOpacity>
      </View>

      <Text className="text-black font-bold text-xl mb-4 font-mono uppercase border-b-2 border-black pb-1 self-start">UPCOMING</Text>
      <FlatList 
        data={tasks}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
            <View className="bg-white p-4 border-2 border-black shadow-block-sm mb-3 flex-row items-center">
                <View className="w-2 h-full bg-black mr-4 border border-black" />
                <View className="flex-1">
                    <Text className="text-black font-bold font-mono uppercase">{item.title}</Text>
                    <Text className="text-textMuted text-xs font-mono uppercase">{item.plans?.title}</Text>
                </View>
                <TouchableOpacity onPress={() => toggleTask(item.id)} className="ml-2">
                    <View className="w-8 h-8 border-2 border-black bg-white items-center justify-center active:bg-black">
                        <FontAwesome name="check" size={12} color="#000000" />
                    </View>
                </TouchableOpacity>
            </View>
        )}
      />
    </SafeAreaView>
  );
}
