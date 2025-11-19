import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Switch, Alert, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'expo-router';
import * as Calendar from 'expo-calendar';
import * as Notifications from 'expo-notifications';
import { useAuth } from '../../context/AuthProvider';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { requestNotificationPermissions, scheduleDailyPlanningReminder, cancelAllNotifications } from '../../lib/notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SettingsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [calendarSyncEnabled, setCalendarSyncEnabled] = useState(false);
  
  // Profile State
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [loadingProfile, setLoadingProfile] = useState(false);

  useEffect(() => {
      if (user) {
          fetchProfile();
          loadSettings();
      }
  }, [user]);

  const loadSettings = async () => {
      const notifPref = await AsyncStorage.getItem('notifications_enabled');
      const calPref = await AsyncStorage.getItem('calendar_sync_enabled');
      
      if (notifPref !== null) setNotificationsEnabled(notifPref === 'true');
      if (calPref !== null) setCalendarSyncEnabled(calPref === 'true');
  };

  const fetchProfile = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('username, full_name')
        .eq('id', user?.id)
        .single();
      
      if (data) {
          setUsername(data.username || '');
          setFullName(data.full_name || '');
      }
  };

  const updateProfile = async () => {
      if (!user) return;
      setLoadingProfile(true);
      const { error } = await supabase
        .from('profiles')
        .upsert({
            id: user.id,
            username,
            full_name: fullName,
            updated_at: new Date(),
        });
      
      if (error) Alert.alert("Error", error.message);
      else Alert.alert("Success", "Profile updated!");
      setLoadingProfile(false);
  };

  const toggleNotifications = async (value: boolean) => {
      if (value) {
          const granted = await requestNotificationPermissions();
          if (granted) {
              setNotificationsEnabled(true);
              await AsyncStorage.setItem('notifications_enabled', 'true');
              // Schedule daily planning reminder
              await scheduleDailyPlanningReminder();
              Alert.alert("✅ ENABLED", "Daily planning reminders activated!");
          } else {
              Alert.alert("Permission Required", "Please enable notifications in settings.");
              setNotificationsEnabled(false);
              await AsyncStorage.setItem('notifications_enabled', 'false');
          }
      } else {
          setNotificationsEnabled(false);
          await AsyncStorage.setItem('notifications_enabled', 'false');
          await cancelAllNotifications();
      }
  };

  const toggleCalendar = async (value: boolean) => {
      if (value) {
          const { status } = await Calendar.requestCalendarPermissionsAsync();
          if (status === 'granted') {
              setCalendarSyncEnabled(true);
              await AsyncStorage.setItem('calendar_sync_enabled', 'true');
          } else {
              Alert.alert("Permission Required", "Please enable calendar access in settings.");
              setCalendarSyncEnabled(false);
              await AsyncStorage.setItem('calendar_sync_enabled', 'false');
          }
      } else {
          setCalendarSyncEnabled(false);
          await AsyncStorage.setItem('calendar_sync_enabled', 'false');
      }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    router.replace('/(auth)/login');
  };

  return (
    <SafeAreaView className="flex-1 bg-background p-4">
      <Text className="text-3xl font-bold text-black mb-8 font-mono uppercase border-b-2 border-black pb-2 self-start">SETTINGS</Text>
      
      <View className="space-y-6 mb-10">
          
          {/* Profile Section */}
          <View className="bg-white border-2 border-black p-4 shadow-block">
              <Text className="text-black text-lg font-bold mb-4 font-mono uppercase border-b-2 border-black pb-1 self-start">PROFILE</Text>
              
              <Text className="text-black text-xs font-bold font-mono uppercase mb-1">USERNAME</Text>
              <TextInput 
                  value={username}
                  onChangeText={setUsername}
                  className="bg-white border-2 border-black p-2 mb-3 font-mono shadow-block-sm"
                  placeholder="SET USERNAME"
              />

              <Text className="text-black text-xs font-bold font-mono uppercase mb-1">FULL NAME</Text>
              <TextInput 
                  value={fullName}
                  onChangeText={setFullName}
                  className="bg-white border-2 border-black p-2 mb-4 font-mono shadow-block-sm"
                  placeholder="SET NAME"
              />

              <TouchableOpacity 
                  onPress={updateProfile}
                  disabled={loadingProfile}
                  className="bg-black p-3 border-2 border-black items-center shadow-block-sm active:shadow-none active:translate-y-0.5"
              >
                  <Text className="text-white font-bold font-mono uppercase">{loadingProfile ? 'SAVING...' : 'SAVE PROFILE'}</Text>
              </TouchableOpacity>
          </View>

          {/* Preferences Section */}
          <View className="flex-row justify-between items-center bg-white p-4 border-2 border-black shadow-block-sm">
              <View>
                  <Text className="text-black text-base font-bold font-mono uppercase">NOTIFICATIONS</Text>
                  <Text className="text-textMuted text-xs font-mono uppercase">TASK ALERTS</Text>
              </View>
              <Switch 
                value={notificationsEnabled}
                onValueChange={toggleNotifications}
                trackColor={{ false: '#E0E0E0', true: '#000000' }}
                thumbColor={'#FFFFFF'}
              />
          </View>

          <View className="flex-row justify-between items-center bg-white p-4 border-2 border-black shadow-block-sm">
              <View>
                  <Text className="text-black text-base font-bold font-mono uppercase">CALENDAR SYNC</Text>
                  <Text className="text-textMuted text-xs font-mono uppercase">AUTO-ADD TASKS</Text>
              </View>
              <Switch 
                value={calendarSyncEnabled}
                onValueChange={toggleCalendar}
                trackColor={{ false: '#E0E0E0', true: '#000000' }}
                thumbColor={'#FFFFFF'}
              />
          </View>

          <View className="bg-white p-4 border-2 border-black shadow-block-sm">
             <Text className="text-black text-base font-bold font-mono uppercase mb-1">ACCOUNT</Text>
             <Text className="text-textMuted font-mono text-xs">{user?.email}</Text>
             <Text className="text-textMuted text-[10px] mt-1 font-mono">ID: {user?.id}</Text>
          </View>
      </View>
      
      <TouchableOpacity 
        onPress={signOut}
        className="bg-white p-4 border-2 border-black shadow-block items-center mt-auto mb-4 active:bg-red-50 active:border-red-500"
      >
        <Text className="text-red-600 text-lg font-bold text-center font-mono uppercase">SIGN OUT</Text>
      </TouchableOpacity>
      
      <Text className="text-center text-textMuted text-xs font-mono uppercase">PLANNER.AI V1.0</Text>
    </SafeAreaView>
  );
}
