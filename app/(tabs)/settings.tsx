import { View, Text, TouchableOpacity, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import * as Calendar from 'expo-calendar';
import { useAuth } from '../../context/AuthProvider';

export default function SettingsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [calendarSyncEnabled, setCalendarSyncEnabled] = useState(false);

  const toggleCalendar = async (value: boolean) => {
      if (value) {
          const { status } = await Calendar.requestCalendarPermissionsAsync();
          if (status === 'granted') {
              setCalendarSyncEnabled(true);
          } else {
              Alert.alert("Permission Required", "Please enable calendar access in your device settings.");
              setCalendarSyncEnabled(false);
          }
      } else {
          setCalendarSyncEnabled(false);
      }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    router.replace('/(auth)/login');
  };

  return (
    <SafeAreaView className="flex-1 bg-background p-4">
      <Text className="text-3xl font-bold text-text mb-8">Settings</Text>
      
      <View className="space-y-6 mb-10">
          <View className="flex-row justify-between items-center bg-surface p-4 rounded-xl border border-border">
              <View>
                  <Text className="text-text text-lg font-medium">Notifications</Text>
                  <Text className="text-textMuted text-sm">Receive updates on task deadlines</Text>
              </View>
              <Switch 
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ false: '#333', true: '#D4AF37' }}
                thumbColor={notificationsEnabled ? '#fff' : '#f4f3f4'}
              />
          </View>

          <View className="flex-row justify-between items-center bg-surface p-4 rounded-xl border border-border">
              <View>
                  <Text className="text-text text-lg font-medium">Calendar Sync</Text>
                  <Text className="text-textMuted text-sm">Auto-add tasks to your device calendar</Text>
              </View>
              <Switch 
                value={calendarSyncEnabled}
                onValueChange={toggleCalendar}
                trackColor={{ false: '#333', true: '#D4AF37' }}
                thumbColor={calendarSyncEnabled ? '#fff' : '#f4f3f4'}
              />
          </View>

          <View className="bg-surface p-4 rounded-xl border border-border">
             <Text className="text-text text-lg font-medium mb-2">Account</Text>
             <Text className="text-textMuted">{user?.email}</Text>
             <Text className="text-textMuted text-xs mt-1">User ID: {user?.id}</Text>
          </View>
      </View>
      
      <TouchableOpacity 
        onPress={signOut}
        className="bg-surface p-4 rounded-xl border border-red-900/50 mt-auto mb-4"
      >
        <Text className="text-red-500 text-lg font-medium text-center">Sign Out</Text>
      </TouchableOpacity>
      
      <Text className="text-center text-textMuted text-xs">PlannerAI v1.0.0</Text>
    </SafeAreaView>
  );
}
