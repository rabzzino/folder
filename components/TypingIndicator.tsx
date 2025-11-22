import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

export function TypingIndicator() {
  const dot1 = useSharedValue(0);
  const dot2 = useSharedValue(0);
  const dot3 = useSharedValue(0);

  useEffect(() => {
    // Staggered bounce animation
    dot1.value = withRepeat(
      withSequence(
        withTiming(-4, { duration: 400 }),
        withTiming(0, { duration: 400 })
      ),
      -1
    );

    dot2.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 200 }),
        withTiming(-4, { duration: 400 }),
        withTiming(0, { duration: 400 })
      ),
      -1
    );

    dot3.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 400 }),
        withTiming(-4, { duration: 400 }),
        withTiming(0, { duration: 400 })
      ),
      -1
    );
  }, []);

  const dot1Style = useAnimatedStyle(() => ({
    transform: [{ translateY: dot1.value }],
  }));

  const dot2Style = useAnimatedStyle(() => ({
    transform: [{ translateY: dot2.value }],
  }));

  const dot3Style = useAnimatedStyle(() => ({
    transform: [{ translateY: dot3.value }],
  }));

  return (
    <View className="flex-row items-center justify-start py-3 px-4 bg-white border-2 border-black shadow-block-sm mb-3 self-start">
      <Animated.View style={dot1Style} className="w-2 h-2 bg-black mr-2" />
      <Animated.View style={dot2Style} className="w-2 h-2 bg-black mr-2" />
      <Animated.View style={dot3Style} className="w-2 h-2 bg-black" />
    </View>
  );
}

