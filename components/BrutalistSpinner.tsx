import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming, Easing } from 'react-native-reanimated';

export function BrutalistSpinner({ size = 40 }: { size?: number }) {
  const rotation = useSharedValue(0);

  useEffect(() => {
    // Rotate in 90 degree snaps (brutalist style - no smooth rotation)
    rotation.value = withRepeat(
      withSequence(
        withTiming(90, { duration: 200, easing: Easing.linear }),
        withTiming(180, { duration: 200, easing: Easing.linear }),
        withTiming(270, { duration: 200, easing: Easing.linear }),
        withTiming(360, { duration: 200, easing: Easing.linear })
      ),
      -1
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <View style={{ width: size, height: size }} className="items-center justify-center">
      <Animated.View 
        style={[animatedStyle, { width: size, height: size }]} 
        className="border-4 border-black border-t-transparent"
      />
    </View>
  );
}

