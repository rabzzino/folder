import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Link, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, RefreshControl, ScrollView, Text, TouchableOpacity, View, Dimensions } from 'react-native';
import Animated, { FadeInDown, FadeOut, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthProvider';
import { supabase } from '../../lib/supabase';
import * as Haptics from 'expo-haptics';
import ConfettiCannon from 'react-native-confetti-cannon';

// Task Card Component with Long Press Animation
function TaskCard({ task, onComplete, onPress }: { task: any, onComplete: () => void, onPress: () => void }) {
  const [isPressed, setIsPressed] = useState(false);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const handleLongPress = () => {
    // Bounce animation
    scale.value = withSpring(1.05, { damping: 2 }, () => {
      scale.value = withSpring(0.95, {}, () => {
        scale.value = withSpring(1);
      });
    });
    // Trigger completion
    onComplete();
  };

  const isCompleted = task.status === 'completed';

  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        <View className={`card-brutal mb-3 flex-row items-start ${isCompleted ? 'opacity-60' : ''}`}>
          <View className="flex-1">
            <Text className={`text-black font-bold text-lg mb-1 font-mono uppercase ${isCompleted ? 'line-through' : ''}`}>
              {task.title}
            </Text>
            {task.description && (
              <Text className={`text-black text-sm mb-2 font-mono leading-5 ${isCompleted ? 'line-through opacity-60' : ''}`} numberOfLines={2}>
                {task.description}
              </Text>
            )}
            <View className="flex-row items-center mt-1">
              <View className="bg-black px-2 py-1 mr-2">
                <Text className="text-white text-[11px] font-bold font-mono">
                  {task.due_date ? new Date(task.due_date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).toUpperCase() : '2:00 PM'}
                </Text>
              </View>
              {task.plans?.type && (
                <View className="border border-black px-2 py-1 mr-2">
                  <Text className="text-black text-[11px] font-bold font-mono uppercase">{task.plans.type}</Text>
                </View>
              )}
            </View>
          </View>
          <TouchableOpacity 
            onLongPress={handleLongPress}
            delayLongPress={500}
            onPressIn={() => setIsPressed(true)}
            onPressOut={() => setIsPressed(false)}
            className="mt-1"
          >
            <View className={`w-10 h-10 border-2 border-black items-center justify-center ${
              isCompleted 
                ? 'bg-black' 
                : isPressed 
                  ? 'bg-gray-100' 
                  : 'bg-white'
            }`}>
              {isCompleted ? (
                <FontAwesome name="check" size={18} color="#FFFFFF" />
              ) : (
                <FontAwesome name="square-o" size={18} color="#000000" />
              )}
            </View>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const { width, height } = Dimensions.get('window');

export default function HomeScreen() {
  const { user } = useAuth();
  const [plans, setPlans] = useState<any[]>([]);
  const [sharedPlans, setSharedPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTasks, setActiveTasks] = useState<any[]>([]);
  const [showConfetti, setShowConfetti] = useState(false);
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

    // Fetch Active Tasks for Today's Plan (limit 3, show both pending and completed)
    const { data: taskData } = await supabase
        .from('tasks')
        .select('*, plans(type, title)')
        .in('status', ['pending', 'completed'])
        .order('status', { ascending: true }) // pending first
        .limit(5);
    
    if (taskData) setActiveTasks(taskData);

    // Fetch Shared Plans
    const { data: sharedData } = await supabase
      .from('plan_collaborators')
      .select('plan:plans(*)') 
      .eq('user_id', user.id);
    
    if (sharedData) {
        const flattened = sharedData.map(d => d.plan).filter(Boolean); 
        setSharedPlans(flattened);
    }

    setLoading(false);
  };

  useEffect(() => {
    if (user) fetchPlans();
  }, [user]);

  const toggleTask = async (taskId: string) => {
      // Haptic feedback
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      // Find current task status
      const currentTask = activeTasks.find(t => t.id === taskId);
      const newStatus = currentTask?.status === 'completed' ? 'pending' : 'completed';
      
      // Optimistic update - toggle status but keep in list
      setActiveTasks(prev => prev.map(t => 
          t.id === taskId ? { ...t, status: newStatus } : t
      ));
      
      // Check if all tasks are now completed
      const updatedTasks = activeTasks.map(t => 
          t.id === taskId ? { ...t, status: newStatus } : t
      );
      const allCompleted = updatedTasks.every(t => t.status === 'completed');
      
      if (allCompleted && newStatus === 'completed') {
          // Trigger confetti!
          setShowConfetti(true);
          
          // Initial burst haptic
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          
          // Confetti takes 2.5 seconds to fall (fallSpeed: 2500)
          // Haptic feedback when pieces land (staggered like Apple)
          const impactTimings = [2200, 2300, 2400, 2500, 2600, 2700, 2800, 2900];
          impactTimings.forEach(delay => {
              setTimeout(() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }, delay);
          });
          
          setTimeout(() => setShowConfetti(false), 3500);
      }
      
      const { error } = await supabase
          .from('tasks')
          .update({ status: newStatus })
          .eq('id', taskId);
      
      if (error) {
          // Revert if error (fetch again)
          fetchPlans();
      }
  };

  const getFormattedDate = () => {
      return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase();
  };

  const PlanCard = ({ item, index }: { item: any, index: number }) => {
    const progressWidth = useSharedValue(0);
    
    const progressStyle = useAnimatedStyle(() => ({
      width: `${progressWidth.value}%`,
    }));

    useEffect(() => {
      // Animate progress bar on mount
      progressWidth.value = withSpring(35, { damping: 15 });
    }, []);

    return (
      <Link href={`/plan/${item.id}`} asChild>
        <TouchableOpacity className="mr-4 w-64">
          <View className="card-brutal h-40 justify-between bg-white">
            <View className="flex-row justify-between items-start">
              <View className="bg-black px-3 py-1 border border-black">
                <Text className="text-white text-xs font-bold uppercase font-mono">{item.type}</Text>
              </View>
              <Text className="text-black font-bold text-xs font-mono">35%</Text>
            </View>

            <View>
              <Text className="text-black font-bold text-xl leading-6 mb-1 uppercase font-mono" numberOfLines={1}>{item.title}</Text>
              <Text className="text-textMuted text-xs font-mono uppercase">12 DAYS LEFT</Text>
            </View>

            <View className="h-3 border-2 border-black bg-white mt-2 overflow-hidden">
              <Animated.View style={progressStyle} className="h-full bg-black" />
            </View>
          </View>
        </TouchableOpacity>
      </Link>
    );
  };

  const renderPlanCard = ({ item, index }: { item: any, index: number }) => (
    <PlanCard item={item} index={index} />
  );

  const renderQuickAccess = (icon: string, label: string, route: string) => (
      <Link href={route as any} asChild>
        <TouchableOpacity className="items-center justify-center flex-1 active:translate-y-1">
            <View className="w-12 h-12 bg-white border-2 border-black items-center justify-center mb-2 shadow-block-sm">
                <FontAwesome name={icon as any} size={20} color="#000000" />
            </View>
            <Text className="text-black text-xs font-bold uppercase font-mono">{label}</Text>
        </TouchableOpacity>
      </Link>
  );

  return (
    <SafeAreaView className="flex-1 bg-background">
      {showConfetti && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: height, zIndex: 9999, pointerEvents: 'none' }}>
          <ConfettiCannon
            count={300}
            origin={{ x: width / 2, y: 0 }}
            explosionSpeed={400}
            fallSpeed={2500}
            fadeOut={true}
            autoStart={true}
            autoStartDelay={0}
            colors={['#000000', '#FFFFFF', '#CCCCCC', '#999999']}
          />
        </View>
      )}
      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchPlans} tintColor="#000000" />}
        className="px-5 pt-2"
      >
        {/* Header Area */}
        <View className="flex-row justify-between items-center mb-8 mt-2 border-b-2 border-black pb-4">
            <View>
                <Text className="text-textMuted text-xs font-bold uppercase font-mono tracking-wider mb-1">{getFormattedDate()}</Text>
                <Text className="text-black font-bold text-2xl uppercase font-mono">HEY, {user?.email?.split('@')[0] || 'USER'}</Text>
                <View className="flex-row items-center mt-1">
                    <FontAwesome name="cloud" size={12} color="#000000" className="mr-2" />
                    <Text className="text-textMuted text-xs font-mono uppercase">LONDON • 18°C</Text>
                </View>
            </View>
            <TouchableOpacity className="w-12 h-12 bg-black border-2 border-black items-center justify-center shadow-block-sm active:translate-y-1">
                <FontAwesome name="magic" size={20} color="#FFFFFF" />
            </TouchableOpacity>
        </View>

        {/* Quick Access Tiles */}
        <View className="flex-row justify-between mb-10 p-4 border-2 border-black bg-white shadow-block">
            {renderQuickAccess('plus', 'NEW', '/wizard')}
            {renderQuickAccess('calendar', 'CAL', '/(tabs)/calendar')}
            {renderQuickAccess('users', 'TEAM', '/(tabs)/settings')}
            {renderQuickAccess('comment', 'ASK AI', '/wizard')}
        </View>

        {/* Today's Focus */}
        <View className="mb-8">
            <View className="flex-row justify-between items-center mb-4 border-b-2 border-black pb-1">
                <Text className="text-black font-bold text-xl uppercase font-mono">TODAY'S FOCUS</Text>
                <TouchableOpacity onPress={() => router.push('/(tabs)/calendar')}>
                    <Text className="text-black text-sm font-bold underline font-mono">SEE ALL</Text>
                </TouchableOpacity>
            </View>

            {activeTasks.length > 0 ? (
                activeTasks.map((task, index) => (
                    <TaskCard 
                        key={task.id} 
                        task={task} 
                        onComplete={() => toggleTask(task.id)}
                        onPress={() => router.push(`/task/${task.id}`)}
                    />
                ))
            ) : (
                 <View className="card-brutal border-dashed items-center py-8">
                     <Text className="text-textMuted mb-2 font-mono uppercase text-center">NO TASKS PENDING</Text>
                     <Link href="/wizard" asChild>
                        <TouchableOpacity className="bg-black px-4 py-2">
                            <Text className="text-white font-bold font-mono uppercase">START A PLAN</Text>
                        </TouchableOpacity>
                     </Link>
                 </View>
            )}
        </View>

        {/* Active Plans Horizontal Scroll */}
        <View className="mb-8">
            <Text className="text-black font-bold text-xl mb-4 uppercase font-mono border-b-2 border-black pb-1 self-start">PROGRESS</Text>
            <FlatList
                data={plans}
                renderItem={renderPlanCard}
                keyExtractor={(item) => item.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 4 }} 
                ListEmptyComponent={
                    <Text className="text-textMuted text-sm font-mono uppercase ml-1">NO ACTIVE PLANS.</Text>
                }
            />
        </View>

        {/* AI Suggestions */}
        <View className="mb-24">
             <View className="bg-white border-2 border-black p-5 shadow-block">
                 <View className="flex-row items-center mb-3 border-b-2 border-black pb-2">
                     <FontAwesome name="lightbulb-o" size={16} color="#000000" className="mr-2" />
                     <Text className="text-black font-bold text-sm uppercase font-mono">AI INSIGHT</Text>
                 </View>
                 <Text className="text-black font-medium text-sm mb-4 font-mono leading-5">
                     "YOUR WEDDING IS 90 DAYS AWAY. SCHEDULE A VENUE WALKTHROUGH?"
                 </Text>
                 <View className="flex-row space-x-3">
                     <TouchableOpacity className="bg-black px-4 py-2 border-2 border-black shadow-block-sm active:translate-y-0.5 active:shadow-none">
                         <Text className="text-white font-bold text-xs font-mono uppercase">YES, ADD IT</Text>
                     </TouchableOpacity>
                     <TouchableOpacity className="bg-white px-4 py-2 border-2 border-black shadow-block-sm active:translate-y-0.5 active:shadow-none">
                         <Text className="text-black font-bold text-xs font-mono uppercase">DISMISS</Text>
                     </TouchableOpacity>
                 </View>
             </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
