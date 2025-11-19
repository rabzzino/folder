import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function requestNotificationPermissions() {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  if (finalStatus !== 'granted') {
    return false;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#000000',
    });
  }

  return true;
}

export async function scheduleTaskNotification(taskTitle: string, dueDate: Date) {
  // Schedule notification 1 day before the task is due
  const notificationDate = new Date(dueDate);
  notificationDate.setDate(notificationDate.getDate() - 1);
  notificationDate.setHours(9, 0, 0, 0); // 9 AM

  // Only schedule if the notification date is in the future
  if (notificationDate > new Date()) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '📋 TASK REMINDER',
        body: `"${taskTitle}" is due tomorrow!`,
        data: { taskTitle },
        sound: true,
      },
      trigger: notificationDate,
    });
  }

  // Also schedule notification on the day of
  const dueDateMorning = new Date(dueDate);
  dueDateMorning.setHours(8, 0, 0, 0); // 8 AM

  if (dueDateMorning > new Date()) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🔔 TASK DUE TODAY',
        body: `"${taskTitle}" is due today!`,
        data: { taskTitle },
        sound: true,
      },
      trigger: dueDateMorning,
    });
  }
}

export async function scheduleDailyPlanningReminder() {
  // Schedule a daily notification at 7 AM to review plans
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '🌅 GOOD MORNING',
      body: "Ready to tackle today's plans?",
      sound: true,
    },
    trigger: {
      hour: 7,
      minute: 0,
      repeats: true,
    },
  });
}

export async function cancelAllNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

