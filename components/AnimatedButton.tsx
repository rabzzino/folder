import React from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

interface AnimatedButtonProps {
  onPress: () => void;
  label: string;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  className?: string;
}

export function AnimatedButton({ 
  onPress, 
  label, 
  variant = 'primary',
  disabled = false,
  className = ''
}: AnimatedButtonProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const baseClass = variant === 'primary'
    ? 'bg-black border-2 border-black shadow-block'
    : 'bg-white border-2 border-black shadow-block';

  const textClass = variant === 'primary'
    ? 'text-white'
    : 'text-black';

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => {
        scale.value = withSpring(0.95, { damping: 15 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 15 });
      }}
      disabled={disabled}
    >
      <Animated.View 
        style={animatedStyle} 
        className={`${baseClass} p-4 items-center ${disabled ? 'opacity-50' : ''} ${className}`}
      >
        <Text className={`${textClass} font-bold text-lg font-mono uppercase`}>
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

