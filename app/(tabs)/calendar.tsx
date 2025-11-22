import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Alert, Platform, FlatList, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Calendar from 'expo-calendar';
import { Calendar as RNCalendar } from 'react-native-calendars';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthProvider';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as Haptics from 'expo-haptics';
import Animated, { FadeOut, SlideInRight, SlideOutLeft } from 'react-native-reanimated';
import { useRouter } from 'expo-router';

export default function CalendarScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [tasks, setTasks] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [markedDates, setMarkedDates] = useState<any>({});

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
        .select('*, plans(title, type)')
        .eq('status', 'pending');
    if (data) {
        setTasks(data);
        // Build marked dates object
        const marked: any = {};
        data.forEach((task: any) => {
            if (task.due_date) {
                const dateKey = new Date(task.due_date).toISOString().split('T')[0]; // YYYY-MM-DD format
                if (!marked[dateKey]) {
                    marked[dateKey] = { marked: true, dotColor: '#000000', dots: [{ color: '#000000' }] };
                }
            }
        });
        console.log('Marked dates:', marked); // Debug log
        setMarkedDates(marked);
    }
  };

  const toggleTask = async (taskId: string) => {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      setTimeout(() => {
          setTasks(prev => prev.filter(t => t.id !== taskId));
      }, 400);
      
      const { error } = await supabase
          .from('tasks')
          .update({ status: 'completed' })
          .eq('id', taskId);
      
      if (error) {
          fetchTasks();
      }
  };

  const filteredTasks = selectedDate 
    ? tasks.filter(task => task.due_date && task.due_date.startsWith(selectedDate))
    : tasks;

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
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-4 pt-2">
        <Text className="text-3xl font-bold text-black mb-2 font-mono uppercase border-b-2 border-black pb-2 self-start">CALENDAR</Text>
        <View className="flex-row justify-between items-center mb-4">
          <Text className="text-textMuted font-mono uppercase text-sm">TAP DATE TO FILTER</Text>
          <TouchableOpacity 
            onPress={syncToCalendar}
            className="bg-black py-2 px-4 border-2 border-black shadow-block-sm active:shadow-none active:translate-y-0.5"
          >
            <Text className="text-white font-bold text-xs font-mono uppercase">SYNC {tasks.length}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Month Calendar View */}
      <View className="bg-white border-2 border-black mx-4 mb-4 shadow-block">
        <RNCalendar
          markedDates={{
            ...markedDates,
            ...(selectedDate ? { [selectedDate]: { selected: true, selectedColor: '#000000' } } : {})
          }}
          onDayPress={(day) => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setSelectedDate(selectedDate === day.dateString ? null : day.dateString);
          }}
          theme={{
            calendarBackground: '#FFFFFF',
            textSectionTitleColor: '#000000',
            selectedDayBackgroundColor: '#000000',
            selectedDayTextColor: '#FFFFFF',
            todayTextColor: '#000000',
            dayTextColor: '#000000',
            textDisabledColor: '#CCCCCC',
            dotColor: '#000000',
            selectedDotColor: '#FFFFFF',
            arrowColor: '#000000',
            monthTextColor: '#000000',
            textDayFontFamily: 'SpaceMono_400Regular',
            textMonthFontFamily: 'SpaceMono_700Bold',
            textDayHeaderFontFamily: 'SpaceMono_700Bold',
            textDayFontWeight: 'bold',
            textMonthFontWeight: 'bold',
            textDayHeaderFontWeight: 'bold',
            textDayFontSize: 14,
            textMonthFontSize: 16,
            textDayHeaderFontSize: 12,
          }}
          style={{
            borderWidth: 0,
          }}
        />
      </View>

      {/* Task List */}
      <View className="px-4 flex-1">
        <View className="flex-row justify-between items-center mb-3 border-b-2 border-black pb-1">
          <Text className="text-black font-bold text-xl font-mono uppercase">
            {selectedDate ? new Date(selectedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase() : 'ALL TASKS'}
          </Text>
          {selectedDate && (
            <TouchableOpacity onPress={() => setSelectedDate(null)}>
              <Text className="text-black text-xs font-bold underline font-mono">CLEAR</Text>
            </TouchableOpacity>
          )}
        </View>
        
        <Animated.View entering={SlideInRight.springify()} exiting={SlideOutLeft} key={selectedDate || 'all'}>
          <FlatList 
            data={filteredTasks}
            keyExtractor={item => item.id}
            ListEmptyComponent={
              <View className="card-brutal border-dashed items-center py-8">
                <Text className="text-textMuted font-mono uppercase text-center">
                  {selectedDate ? 'NO TASKS ON THIS DATE' : 'NO PENDING TASKS'}
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <TaskRow 
                task={item} 
                onToggle={() => toggleTask(item.id)}
                onPress={() => router.push(`/task/${item.id}`)}
              />
            )}
          />
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

// Task Row Component with Animation
function TaskRow({ task, onToggle, onPress }: { task: any, onToggle: () => void, onPress: () => void }) {
  const [isCompleting, setIsCompleting] = useState(false);

  const handleToggle = () => {
    setIsCompleting(true);
    onToggle();
  };

  if (isCompleting) {
    return (
      <Animated.View exiting={FadeOut.duration(300)}>
        <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
          <View className="bg-white p-4 border-2 border-black shadow-block-sm mb-3 flex-row items-center opacity-50">
            <View className="w-2 h-full bg-black mr-4 border border-black" />
            <View className="flex-1">
              <Text className="text-black font-bold font-mono uppercase line-through">{task.title}</Text>
              <Text className="text-textMuted text-xs font-mono uppercase line-through">{task.plans?.title}</Text>
            </View>
            <View className="w-8 h-8 border-2 border-black bg-black items-center justify-center ml-2">
              <FontAwesome name="check" size={12} color="#FFFFFF" />
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <View className="bg-white p-4 border-2 border-black shadow-block-sm mb-3 flex-row items-center">
        <View className="w-2 h-full bg-black mr-4 border border-black" />
        <View className="flex-1">
          <Text className="text-black font-bold font-mono uppercase">{task.title}</Text>
          <Text className="text-textMuted text-xs font-mono uppercase">{task.plans?.title}</Text>
          {task.due_date && (
            <Text className="text-black text-[10px] font-mono mt-1">
              {new Date(task.due_date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).toUpperCase()}
            </Text>
          )}
        </View>
        <TouchableOpacity 
          onLongPress={handleToggle}
          delayLongPress={500}
          className="ml-2"
        >
          <View className="w-8 h-8 border-2 border-black bg-white items-center justify-center active:bg-gray-100">
            <FontAwesome name="square-o" size={14} color="#000000" />
          </View>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}
