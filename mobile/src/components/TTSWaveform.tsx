import React, { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from "react-native-reanimated";

interface TTSWaveformProps {
  isActive: boolean; // Should animate when status is "speaking"
  color: string; // Mode accent color
}

const WAVE_BAR_COUNT = 5;
const BAR_WIDTH = 3;
const BAR_GAP = 4;
const MIN_HEIGHT = 4;
const MAX_HEIGHT = 24;

export const TTSWaveform: React.FC<TTSWaveformProps> = ({ isActive, color }) => {
  // Create animated values for each bar
  const bar1 = useSharedValue(MIN_HEIGHT);
  const bar2 = useSharedValue(MIN_HEIGHT);
  const bar3 = useSharedValue(MIN_HEIGHT);
  const bar4 = useSharedValue(MIN_HEIGHT);
  const bar5 = useSharedValue(MIN_HEIGHT);

  const bars = [bar1, bar2, bar3, bar4, bar5];

  useEffect(() => {
    if (isActive) {
      // Start animations with staggered timing for organic feel
      bars.forEach((bar, index) => {
        const delay = index * 100; // Stagger by 100ms
        const duration = 400 + Math.random() * 200; // Random duration 400-600ms

        bar.value = withRepeat(
          withSequence(
            withTiming(MAX_HEIGHT - index * 2, {
              duration: duration,
              easing: Easing.inOut(Easing.ease),
            }),
            withTiming(MIN_HEIGHT + index, {
              duration: duration,
              easing: Easing.inOut(Easing.ease),
            })
          ),
          -1, // Infinite
          false // Don't reverse
        );
      });
    } else {
      // Stop animations and reset to min height
      bars.forEach((bar) => {
        bar.value = withTiming(MIN_HEIGHT, {
          duration: 200,
          easing: Easing.out(Easing.ease),
        });
      });
    }
  }, [isActive]);

  // Animated styles for each bar
  const bar1Style = useAnimatedStyle(() => ({
    width: BAR_WIDTH,
    height: bar1.value,
    backgroundColor: color,
    borderRadius: 2,
    opacity: 0.9,
  }));

  const bar2Style = useAnimatedStyle(() => ({
    width: BAR_WIDTH,
    height: bar2.value,
    backgroundColor: color,
    borderRadius: 2,
    opacity: 0.9,
  }));

  const bar3Style = useAnimatedStyle(() => ({
    width: BAR_WIDTH,
    height: bar3.value,
    backgroundColor: color,
    borderRadius: 2,
    opacity: 0.9,
  }));

  const bar4Style = useAnimatedStyle(() => ({
    width: BAR_WIDTH,
    height: bar4.value,
    backgroundColor: color,
    borderRadius: 2,
    opacity: 0.9,
  }));

  const bar5Style = useAnimatedStyle(() => ({
    width: BAR_WIDTH,
    height: bar5.value,
    backgroundColor: color,
    borderRadius: 2,
    opacity: 0.9,
  }));

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        height: MAX_HEIGHT,
        gap: BAR_GAP,
      }}
    >
      <Animated.View style={bar1Style} />
      <Animated.View style={bar2Style} />
      <Animated.View style={bar3Style} />
      <Animated.View style={bar4Style} />
      <Animated.View style={bar5Style} />
    </View>
  );
};
