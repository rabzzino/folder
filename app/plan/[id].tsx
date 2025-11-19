import { View, Text, FlatList, TouchableOpacity, ScrollView, Modal, TextInput, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useAuth } from '../../context/AuthProvider';
import DateTimePicker from '@react-native-community/datetimepicker';
import { scheduleTaskNotification } from '../../lib/notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function PlanDetailScreen() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const [plan, setPlan] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [collaborators, setCollaborators] = useState<any[]>([]);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [shareEmail, setShareEmail] = useState('');
  
  const [editTaskModalVisible, setEditTaskModalVisible] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editDueDate, setEditDueDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

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
        .select('*, user:profiles(*)') 
        .eq('plan_id', id);
      setCollaborators(data || []);
  };

  const toggleTask = async (taskId: string, currentStatus: string) => {
      const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
      await supabase.from('tasks').update({ status: newStatus }).eq('id', taskId);
  };

  const assignTask = async (taskId: string) => {
      const task = tasks.find(t => t.id === taskId);
      const newAssignee = task.assigned_to ? null : user?.email; 
      
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, assigned_to: newAssignee } : t));
      await supabase.from('tasks').update({ assigned_to: newAssignee }).eq('id', taskId);
  };

  const deleteTask = async (taskId: string) => {
      Alert.alert(
          "DELETE TASK", 
          "ARE YOU SURE?",
          [
              { text: "CANCEL", style: "cancel" },
              { 
                  text: "DELETE", 
                  style: "destructive",
                  onPress: async () => {
                      setTasks(prev => prev.filter(t => t.id !== taskId));
                      await supabase.from('tasks').delete().eq('id', taskId);
                  }
              }
          ]
      );
  };

  const openEditModal = (task: any) => {
      setEditingTask(task);
      setEditTitle(task.title);
      setEditDesc(task.description || '');
      setEditDueDate(task.due_date ? new Date(task.due_date) : null);
      setEditTaskModalVisible(true);
  };

  const saveTaskEdit = async () => {
      if (!editingTask) return;
      
      setTasks(prev => prev.map(t => t.id === editingTask.id ? { ...t, title: editTitle, description: editDesc, due_date: editDueDate } : t));
      
      await supabase.from('tasks').update({ 
          title: editTitle, 
          description: editDesc,
          due_date: editDueDate ? editDueDate.toISOString() : null
      }).eq('id', editingTask.id);
      
      // Schedule notification if notifications are enabled and due date is set
      const notificationsEnabled = await AsyncStorage.getItem('notifications_enabled');
      if (notificationsEnabled === 'true' && editDueDate) {
          await scheduleTaskNotification(editTitle, editDueDate);
      }
      
      setEditTaskModalVisible(false);
      setEditingTask(null);
  };

  const sharePlan = async () => {
      if (!shareEmail) return;
      Alert.alert("INVITE SENT", `INVITATION SENT TO ${shareEmail}.`);
      setShareModalVisible(false);
      setShareEmail('');
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
       <Stack.Screen options={{ headerShown: false }} />
       
       {/* Header */}
       <View className="flex-row items-center justify-between p-4 border-b-2 border-black">
        <TouchableOpacity onPress={() => router.back()} className="border-2 border-black p-2 bg-white shadow-block-sm active:shadow-none active:translate-y-0.5">
            <FontAwesome name="arrow-left" size={16} color="#000000" />
        </TouchableOpacity>
        <Text className="text-black font-bold text-lg font-mono uppercase w-2/3 text-center" numberOfLines={1}>{plan?.title || 'LOADING...'}</Text>
        <TouchableOpacity onPress={() => setShareModalVisible(true)} className="border-2 border-black p-2 bg-white shadow-block-sm active:shadow-none active:translate-y-0.5">
             <FontAwesome name="user-plus" size={16} color="#000000" />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 p-4">
        <View className="mb-6 border-2 border-black p-4 bg-white shadow-block">
            <View className="bg-black self-start px-2 py-1 mb-2">
                <Text className="text-white text-xs font-bold font-mono uppercase">{plan?.type} PLAN</Text>
            </View>
            <Text className="text-black font-bold text-2xl mb-2 font-mono uppercase">{plan?.title}</Text>
            <Text className="text-textMuted text-sm font-mono uppercase leading-5">{plan?.description}</Text>
            
            <View className="flex-row mt-4">
                <View className="w-8 h-8 bg-black border-2 border-black items-center justify-center z-10">
                    <Text className="text-white font-bold text-xs font-mono">ME</Text>
                </View>
                {collaborators.map((c, i) => (
                    <View key={c.id} className="w-8 h-8 bg-white border-2 border-black items-center justify-center -ml-2">
                         <FontAwesome name="user" size={12} color="#000000" />
                    </View>
                ))}
            </View>
        </View>

        <Text className="text-black font-bold text-xl mb-4 font-mono uppercase border-b-2 border-black pb-1 self-start">TASKS & TIMELINE</Text>

        {tasks.map((task, index) => (
             <Animated.View 
                entering={FadeInDown.delay(index * 100)} 
                key={task.id}
                className="mb-3"
             >
                <TouchableOpacity 
                    onPress={() => toggleTask(task.id, task.status)}
                    onLongPress={() => assignTask(task.id)}
                    className={`p-4 border-2 border-black shadow-block-sm flex-row items-start active:shadow-none active:translate-y-0.5 ${task.status === 'completed' ? 'bg-gray-200' : 'bg-white'}`}
                >
                    <View className={`w-6 h-6 border-2 border-black mr-3 items-center justify-center ${task.status === 'completed' ? 'bg-black' : 'bg-white'}`}>
                        {task.status === 'completed' && <FontAwesome name="check" size={12} color="#FFFFFF" />}
                    </View>
                    <View className="flex-1">
                        <Text className={`text-base font-bold font-mono uppercase ${task.status === 'completed' ? 'text-textMuted line-through' : 'text-black'}`}>{task.title}</Text>
                        {task.description && <Text className="text-textMuted text-xs mt-1 font-mono uppercase leading-4">{task.description}</Text>}
                        
                        {task.assigned_to && (
                            <View className="flex-row items-center mt-2 border border-black self-start px-2 py-1 bg-white">
                                <FontAwesome name="user" size={10} color="#000000" className="mr-1" />
                                <Text className="text-black text-[10px] font-bold font-mono uppercase">{task.assigned_to === user?.email ? 'YOU' : task.assigned_to}</Text>
                            </View>
                        )}
                    </View>
                    
                    <View className="flex-row ml-2">
                        <TouchableOpacity onPress={() => openEditModal(task)} className="mr-3 p-1 border border-black bg-white active:bg-black">
                            <FontAwesome name="pencil" size={12} color="#000000" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => deleteTask(task.id)} className="p-1 border border-black bg-white active:bg-black">
                            <FontAwesome name="trash" size={12} color="#FF4444" />
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
             </Animated.View>
        ))}
        
        <Text className="text-textMuted text-xs text-center mt-4 mb-8 font-mono uppercase">LONG PRESS TO ASSIGN • TAP PENCIL TO EDIT</Text>
      </ScrollView>

      {/* Share Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={shareModalVisible}
        onRequestClose={() => setShareModalVisible(false)}
      >
          <View className="flex-1 justify-end bg-black/50">
              <View className="bg-white p-6 border-t-2 border-black">
                  <Text className="text-black font-bold text-xl mb-4 font-mono uppercase">SHARE PLAN</Text>
                  <TextInput 
                    className="bg-white text-black p-4 border-2 border-black mb-4 font-mono uppercase shadow-block-sm"
                    placeholder="ENTER EMAIL ADDRESS"
                    placeholderTextColor="#999"
                    value={shareEmail}
                    onChangeText={setShareEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                  <TouchableOpacity 
                    onPress={sharePlan}
                    className="bg-black p-4 border-2 border-black items-center mb-3 shadow-block-sm active:shadow-none active:translate-y-0.5"
                  >
                      <Text className="text-white font-bold text-lg font-mono uppercase">SEND INVITE</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={() => setShareModalVisible(false)}
                    className="p-4 items-center border-2 border-black bg-white shadow-block-sm active:shadow-none active:translate-y-0.5"
                  >
                      <Text className="text-black font-bold font-mono uppercase">CANCEL</Text>
                  </TouchableOpacity>
              </View>
          </View>
      </Modal>

      {/* Edit Task Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={editTaskModalVisible}
        onRequestClose={() => setEditTaskModalVisible(false)}
      >
          <View className="flex-1 justify-end bg-black/50">
              <View className="bg-white p-6 border-t-2 border-black">
                  <Text className="text-black font-bold text-xl mb-4 font-mono uppercase">EDIT TASK</Text>
                  
                  <TextInput 
                    className="bg-white text-black p-4 border-2 border-black mb-4 font-mono uppercase shadow-block-sm"
                    placeholder="TASK TITLE"
                    placeholderTextColor="#999"
                    value={editTitle}
                    onChangeText={setEditTitle}
                  />

                  <TextInput 
                    className="bg-white text-black p-4 border-2 border-black mb-4 min-h-[80px] font-mono uppercase shadow-block-sm"
                    placeholder="DESCRIPTION (OPTIONAL)"
                    placeholderTextColor="#999"
                    value={editDesc}
                    onChangeText={setEditDesc}
                    multiline
                  />

                  <TouchableOpacity 
                    onPress={() => setShowDatePicker(true)}
                    className="bg-white p-4 border-2 border-black mb-4 shadow-block-sm active:shadow-none active:translate-y-0.5 flex-row justify-between items-center"
                  >
                      <View>
                          <Text className="text-black text-xs font-bold font-mono uppercase">DUE DATE</Text>
                          <Text className="text-textMuted text-xs font-mono mt-1">
                              {editDueDate ? editDueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase() : 'NOT SET'}
                          </Text>
                      </View>
                      <FontAwesome name="calendar" size={20} color="#000000" />
                  </TouchableOpacity>

                  {showDatePicker && (
                      <DateTimePicker
                          value={editDueDate || new Date()}
                          mode="date"
                          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                          onChange={(event, selectedDate) => {
                              setShowDatePicker(Platform.OS === 'ios');
                              if (selectedDate) setEditDueDate(selectedDate);
                          }}
                      />
                  )}
                  
                  <TouchableOpacity 
                    onPress={saveTaskEdit}
                    className="bg-black p-4 border-2 border-black items-center mb-3 shadow-block-sm active:shadow-none active:translate-y-0.5"
                  >
                      <Text className="text-white font-bold text-lg font-mono uppercase">SAVE CHANGES</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    onPress={() => setEditTaskModalVisible(false)}
                    className="p-4 items-center border-2 border-black bg-white shadow-block-sm active:shadow-none active:translate-y-0.5"
                  >
                      <Text className="text-black font-bold font-mono uppercase">CANCEL</Text>
                  </TouchableOpacity>
              </View>
          </View>
      </Modal>
    </SafeAreaView>
  );
}
