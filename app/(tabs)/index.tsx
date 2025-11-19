import FontAwesome from '@expo/vector-icons/FontAwesome';
import { LinearGradient } from 'expo-linear-gradient';
import { Link, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthProvider';
import { supabase } from '../../lib/supabase';

export default function HomeScreen() {
  const { user } = useAuth();
  const [plans, setPlans] = useState<any[]>([]);
  const [sharedPlans, setSharedPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTasks, setActiveTasks] = useState<any[]>([]);
  const router = useRouter();

  const fetchPlans = async () => {
    if (!user) return;
    setLoading(true);
    
    // Fetch My Plans
    const { data: myData } = await supabase
      .from('plans')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (myData) setPlans(myData);

    // Fetch Active Tasks for Today's Plan (limit 3)
    const { data: taskData } = await supabase
        .from('tasks')
        .select('*, plans(type, title)')
        .eq('status', 'pending')
        .limit(3);
    
    if (taskData) setActiveTasks(taskData);

    // Fetch Shared Plans
    const { data: sharedData } = await supabase
      .from('plan_collaborators')
      .select('plan:plans(*)') // Join with plans table
      .eq('user_id', user.id);
    
    if (sharedData) {
        const flattened = sharedData.map(d => d.plan).filter(Boolean); // Extract plan object
        setSharedPlans(flattened);
    }

    setLoading(false);
  };

  useEffect(() => {
    if (user) fetchPlans();
  }, [user]);

  const toggleTask = async (taskId: string) => {
      // Optimistic update
      setActiveTasks(prev => prev.filter(t => t.id !== taskId));
      
      const { error } = await supabase
          .from('tasks')
          .update({ status: 'completed' })
          .eq('id', taskId);
      
      if (error) {
          // Revert if error (fetch again)
          fetchPlans();
      }
  };

  const getFormattedDate = () => {
      return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  };

  const renderPlanCard = ({ item, index }: { item: any, index: number }) => (
    <Link href={`/plan/${item.id}`} asChild>
      <TouchableOpacity className="mr-4 w-64">
         <LinearGradient
            colors={['#1A1A1A', '#2A2A2A']}
            className="rounded-3xl p-5 border border-white/10 h-40 justify-between"
          >
            <View className="flex-row justify-between items-start">
                <View className="bg-primary/20 px-3 py-1 rounded-full self-start">
                    <Text className="text-primary text-xs font-bold uppercase">{item.type}</Text>
                </View>
                {/* Mock Progress */}
                <Text className="text-textMuted font-bold text-xs">35%</Text>
            </View>

            <View>
                <Text className="text-text font-bold text-xl leading-6 mb-1" numberOfLines={1}>{item.title}</Text>
                <Text className="text-textMuted text-xs">12 days remaining</Text>
            </View>

            <View className="h-1 bg-surface rounded-full overflow-hidden mt-2">
                <View className="h-full w-[35%] bg-primary" />
            </View>
          </LinearGradient>
      </TouchableOpacity>
    </Link>
  );

  const renderQuickAccess = (icon: string, label: string, route: string, color: string = "#D4AF37") => (
      <Link href={route as any} asChild>
        <TouchableOpacity className="items-center justify-center flex-1">
            <View className="w-14 h-14 rounded-2xl bg-surface border border-white/5 items-center justify-center mb-2 shadow-sm">
                <FontAwesome name={icon as any} size={20} color={color} />
            </View>
            <Text className="text-textMuted text-xs font-medium">{label}</Text>
        </TouchableOpacity>
      </Link>
  );

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchPlans} tintColor="#D4AF37" />}
        className="px-5 pt-2"
      >
        {/* Header Area */}
        <View className="flex-row justify-between items-center mb-8 mt-2">
            <View>
                <Text className="text-textMuted text-sm font-medium uppercase tracking-wider mb-1">{getFormattedDate()}</Text>
                <Text className="text-text font-bold text-3xl">Hey, {user?.email?.split('@')[0] || 'Planner'}</Text>
                <View className="flex-row items-center mt-1">
                    <FontAwesome name="cloud" size={12} color="#A1A1A1" className="mr-2" />
                    <Text className="text-textMuted text-xs">London • 18°C Mostly Sunny</Text>
                </View>
            </View>
            <TouchableOpacity className="w-12 h-12 bg-gradient-to-br from-primary to-primaryLight rounded-full items-center justify-center shadow-lg shadow-primary/20 border border-white/10">
                <FontAwesome name="magic" size={20} color="#0A0A0A" />
            </TouchableOpacity>
        </View>

        {/* Quick Access Tiles */}
        <View className="flex-row justify-between mb-10 bg-white/5 p-4 rounded-3xl border border-white/5">
            {renderQuickAccess('plus', 'New Plan', '/wizard', '#D4AF37')}
            {renderQuickAccess('calendar', 'Calendar', '/(tabs)/calendar', '#C0C0C0')}
            {renderQuickAccess('users', 'Shared', '/(tabs)/settings', '#C0C0C0')}
            {renderQuickAccess('comments', 'Ask AI', '/wizard', '#C0C0C0')}
        </View>

        {/* Today's Focus */}
        <View className="mb-8">
            <View className="flex-row justify-between items-center mb-4">
                <Text className="text-text font-bold text-xl">Today's Focus</Text>
                <TouchableOpacity onPress={() => router.push('/(tabs)/calendar')}>
                    <Text className="text-primary text-sm font-bold">See All</Text>
                </TouchableOpacity>
            </View>

            {activeTasks.length > 0 ? (
                activeTasks.map((task, index) => (
                    <Animated.View key={task.id} entering={FadeInDown.delay(index * 100)}>
                         <View className="bg-surface p-4 rounded-2xl border border-white/5 mb-3 flex-row items-center shadow-sm">
                            <View className={`w-1 h-10 rounded-full mr-4 ${task.plans?.type === 'wedding' ? 'bg-pink-400' : task.plans?.type === 'fitness' ? 'bg-green-400' : 'bg-blue-400'}`} />
                            <View className="flex-1">
                                <Text className="text-text font-bold text-base mb-1">{task.title}</Text>
                                {task.description && (
                                    <Text className="text-textMuted text-sm mb-2 leading-5" numberOfLines={2}>
                                        {task.description}
                                    </Text>
                                )}
                                <View className="flex-row items-center">
                                    <FontAwesome name="clock-o" size={10} color="#666" className="mr-1" />
                                    <Text className="text-textMuted text-xs mr-3">2:00 PM</Text>
                                    {task.assigned_to && (
                                         <View className="bg-surfaceHighlight px-2 py-0.5 rounded-md flex-row items-center">
                                            <FontAwesome name="user" size={8} color="#D4AF37" className="mr-1" />
                                            <Text className="text-textMuted text-[10px]">{task.assigned_to}</Text>
                                        </View>
                                    )}
                                </View>
                            </View>
                            <TouchableOpacity onPress={() => toggleTask(task.id)}>
                                <View className="w-8 h-8 rounded-full border border-border items-center justify-center">
                                    <FontAwesome name="check" size={12} color="#666" />
                                </View>
                            </TouchableOpacity>
                        </View>
                    </Animated.View>
                ))
            ) : (
                 <View className="bg-surface p-6 rounded-2xl border border-dashed border-border items-center">
                     <Text className="text-textMuted mb-2">No tasks for today.</Text>
                     <Link href="/wizard" asChild>
                        <TouchableOpacity>
                            <Text className="text-primary font-bold">Create a plan to get started</Text>
                        </TouchableOpacity>
                     </Link>
                 </View>
            )}
        </View>

        {/* Active Plans Horizontal Scroll */}
        <View className="mb-8">
            <Text className="text-text font-bold text-xl mb-4">Your Progress</Text>
            <FlatList
                data={plans}
                renderItem={renderPlanCard}
                keyExtractor={(item) => item.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                ListEmptyComponent={
                    <Text className="text-textMuted text-sm italic ml-1">You have no active plans.</Text>
                }
            />
        </View>

        {/* AI Suggestions */}
        <View className="mb-24">
             <LinearGradient
                colors={['#2A2A2A', '#1A1A1A']}
                className="p-5 rounded-3xl border border-primary/20"
             >
                 <View className="flex-row items-center mb-3">
                     <FontAwesome name="lightbulb-o" size={16} color="#D4AF37" className="mr-2" />
                     <Text className="text-primary font-bold text-sm uppercase tracking-widest">Smart Suggestion</Text>
                 </View>
                 <Text className="text-text font-medium text-lg mb-3">
                     "Your wedding is 90 days away. Would you like to schedule a reminder to finalize the guest list?"
                 </Text>
                 <View className="flex-row space-x-3">
                     <TouchableOpacity className="bg-primary px-5 py-2 rounded-xl">
                         <Text className="text-background font-bold text-sm">Yes, add it</Text>
                     </TouchableOpacity>
                     <TouchableOpacity className="px-5 py-2">
                         <Text className="text-textMuted font-bold text-sm">Dismiss</Text>
                     </TouchableOpacity>
                 </View>
             </LinearGradient>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
