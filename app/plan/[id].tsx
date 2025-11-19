import { View, Text, FlatList, TouchableOpacity, ScrollView, Modal, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useAuth } from '../../context/AuthProvider';

export default function PlanDetailScreen() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const [plan, setPlan] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [collaborators, setCollaborators] = useState<any[]>([]);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [shareEmail, setShareEmail] = useState('');
  const router = useRouter();

  useEffect(() => {
    if (id) {
        fetchPlanDetails();
        fetchCollaborators();
    }
  }, [id]);

  const fetchPlanDetails = async () => {
    const { data: planData } = await supabase.from('plans').select('*').eq('id', id).single();
    const { data: taskData } = await supabase.from('tasks').select('*').eq('plan_id', id).order('created_at', { ascending: true });
    
    setPlan(planData);
    setTasks(taskData || []);
  };

  const fetchCollaborators = async () => {
      const { data } = await supabase
        .from('plan_collaborators')
        .select('*, user:profiles(*)') // Assuming profiles table exists and is linked (if not, we'd need to adjust schema to store emails or use auth table differently, but for now we just list them)
        .eq('plan_id', id);
      // Note: since we can't easily select auth.users email directly due to security, in a real app we'd join with a public profiles table. 
      // For MVP/Demo without profiles populated, we might just show IDs or mock names.
      setCollaborators(data || []);
  };

  const toggleTask = async (taskId: string, currentStatus: string) => {
      const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
      await supabase.from('tasks').update({ status: newStatus }).eq('id', taskId);
  };

  const assignTask = async (taskId: string) => {
      // Simple toggle assignment for MVP (Self vs Unassigned)
      // Real app would open a picker to select a collaborator
      const task = tasks.find(t => t.id === taskId);
      const newAssignee = task.assigned_to ? null : user?.email; // Just using email or ID as "name" display
      
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, assigned_to: newAssignee } : t));
      await supabase.from('tasks').update({ assigned_to: newAssignee }).eq('id', taskId);
  };

  const sharePlan = async () => {
      if (!shareEmail) return;
      
      // In a real app, we'd look up the user ID by email via an Edge Function (admin auth).
      // For this demo, we can't invite by email directly without backend logic.
      // We will simulate the UI success for the user flow demonstration.
      Alert.alert("Invite Sent", `Invitation sent to ${shareEmail}. (Backend logic required for actual user lookup)`);
      setShareModalVisible(false);
      setShareEmail('');
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
       <Stack.Screen options={{ headerShown: false }} />
       
       {/* Header */}
       <View className="flex-row items-center justify-between p-4 border-b border-border">
        <TouchableOpacity onPress={() => router.back()}>
            <FontAwesome name="arrow-left" size={24} color="#D4AF37" />
        </TouchableOpacity>
        <Text className="text-text font-bold text-lg w-2/3 text-center" numberOfLines={1}>{plan?.title || 'Loading...'}</Text>
        <TouchableOpacity onPress={() => setShareModalVisible(true)}>
             <FontAwesome name="user-plus" size={24} color="#D4AF37" />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 p-4">
        <View className="mb-6">
            <Text className="text-textMuted text-sm uppercase tracking-widest mb-1">{plan?.type} PLAN</Text>
            <Text className="text-text font-bold text-3xl mb-2">{plan?.title}</Text>
            <Text className="text-textMuted text-base leading-6">{plan?.description}</Text>
            
            {/* Collaborators List (Mock display if empty) */}
            <View className="flex-row mt-4">
                <View className="w-8 h-8 bg-primary rounded-full items-center justify-center border-2 border-background -ml-0 z-10">
                    <Text className="text-background font-bold text-xs">Me</Text>
                </View>
                {collaborators.map((c, i) => (
                    <View key={c.id} className="w-8 h-8 bg-surfaceHighlight rounded-full items-center justify-center border-2 border-background -ml-2">
                         <FontAwesome name="user" size={12} color="#A1A1A1" />
                    </View>
                ))}
            </View>
        </View>

        <Text className="text-text font-bold text-xl mb-4">Tasks & Timeline</Text>

        {tasks.map((task, index) => (
             <Animated.View 
                entering={FadeInDown.delay(index * 100)} 
                key={task.id}
                className="mb-3"
             >
                <TouchableOpacity 
                    onPress={() => toggleTask(task.id, task.status)}
                    onLongPress={() => assignTask(task.id)}
                    className={`p-4 rounded-xl border ${task.status === 'completed' ? 'bg-surface/50 border-border' : 'bg-surface border-primary/20'} flex-row items-start`}
                >
                    <View className={`w-6 h-6 rounded-full border-2 mr-3 items-center justify-center ${task.status === 'completed' ? 'bg-primary border-primary' : 'border-textMuted'}`}>
                        {task.status === 'completed' && <FontAwesome name="check" size={12} color="#0A0A0A" />}
                    </View>
                    <View className="flex-1">
                        <Text className={`text-base font-medium ${task.status === 'completed' ? 'text-textMuted line-through' : 'text-text'}`}>{task.title}</Text>
                        {task.description && <Text className="text-textMuted text-sm mt-1">{task.description}</Text>}
                        
                        {/* Assigned To Badge */}
                        {task.assigned_to && (
                            <View className="flex-row items-center mt-2 bg-surfaceHighlight self-start px-2 py-1 rounded-md">
                                <FontAwesome name="user" size={10} color="#D4AF37" className="mr-1" />
                                <Text className="text-textMuted text-xs">{task.assigned_to === user?.email ? 'You' : task.assigned_to}</Text>
                            </View>
                        )}
                    </View>
                </TouchableOpacity>
             </Animated.View>
        ))}
        
        <Text className="text-textMuted text-xs text-center mt-4 mb-8">Long press a task to assign it to yourself.</Text>
      </ScrollView>

      {/* Share Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={shareModalVisible}
        onRequestClose={() => setShareModalVisible(false)}
      >
          <View className="flex-1 justify-end bg-black/50">
              <View className="bg-surface p-6 rounded-t-3xl border-t border-border">
                  <Text className="text-text font-bold text-xl mb-4">Share Plan</Text>
                  <Text className="text-textMuted mb-4">Invite a partner or friend to collaborate on this plan.</Text>
                  
                  <TextInput 
                    className="bg-background text-text p-4 rounded-xl border border-border mb-4"
                    placeholder="Enter email address"
                    placeholderTextColor="#666"
                    value={shareEmail}
                    onChangeText={setShareEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                  
                  <TouchableOpacity 
                    onPress={sharePlan}
                    className="bg-primary p-4 rounded-xl items-center mb-3"
                  >
                      <Text className="text-background font-bold text-lg">Send Invite</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    onPress={() => setShareModalVisible(false)}
                    className="p-4 items-center"
                  >
                      <Text className="text-textMuted">Cancel</Text>
                  </TouchableOpacity>
              </View>
          </View>
      </Modal>
    </SafeAreaView>
  );
}
