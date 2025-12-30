import React, { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  interpolate,
} from "react-native-reanimated";
import { AudioMode } from "../state/appStore";

interface AudioVisualizerProps {
  mode: AudioMode;
  audioLevel: number; // 0-100 representing the audio level
  isActive: boolean; // Whether audio is currently playing
  opacity?: number; // Optional opacity override (0-1)
}

// Mode color mapping - matching MixWaveScreen
const getModeColors = (mode: AudioMode) => {
  switch (mode) {
    case "FOCUS":
      return { accent: "#FF9A5A", glow: "#FF9A5A" }; // Orange
    case "STUDY":
      return { accent: "#5FD4F4", glow: "#5FD4F4" }; // Cyan
    case "CHILL":
      return { accent: "#A78BFA", glow: "#A78BFA" }; // Purple
    case "FLOW":
      return { accent: "#5EEAD4", glow: "#5EEAD4" }; // Teal
    case "DEEP":
      return { accent: "#F87171", glow: "#F87171" }; // Red
  }
};

const NUM_BARS = 16; // Number of visualizer bars

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  mode,
  audioLevel,
  isActive,
  opacity = 1,
}) => {
  const modeColors = getModeColors(mode);

  // Create animated values for each bar - must be at top level
  const bar0 = useSharedValue(0);
  const bar1 = useSharedValue(0);
  const bar2 = useSharedValue(0);
  const bar3 = useSharedValue(0);
  const bar4 = useSharedValue(0);
  const bar5 = useSharedValue(0);
  const bar6 = useSharedValue(0);
  const bar7 = useSharedValue(0);
  const bar8 = useSharedValue(0);
  const bar9 = useSharedValue(0);
  const bar10 = useSharedValue(0);
  const bar11 = useSharedValue(0);
  const bar12 = useSharedValue(0);
  const bar13 = useSharedValue(0);
  const bar14 = useSharedValue(0);
  const bar15 = useSharedValue(0);

  const barHeights = [bar0, bar1, bar2, bar3, bar4, bar5, bar6, bar7, bar8, bar9, bar10, bar11, bar12, bar13, bar14, bar15];

  useEffect(() => {
    if (isActive) {
      // Animate bars with staggered timing for wave effect
      barHeights.forEach((bar, index) => {
        const delay = index * 80; // Stagger delay
        const duration = 800 + Math.random() * 400; // Random duration for organic feel

        bar.value = withRepeat(
          withSequence(
            withTiming(0.3 + Math.random() * 0.4, {
              duration: duration / 2,
              easing: Easing.inOut(Easing.ease),
            }),
            withTiming(0.1 + Math.random() * 0.2, {
              duration: duration / 2,
              easing: Easing.inOut(Easing.ease),
            })
          ),
          -1,
          false
        );
      });
    } else {
      // Reset bars when not active
      barHeights.forEach((bar) => {
        bar.value = withTiming(0, {
          duration: 400,
          easing: Easing.out(Easing.ease),
        });
      });
    }
  }, [isActive, audioLevel]);

  return (
    <View
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 20,
        gap: 6,
        opacity: opacity,
        backgroundColor: "transparent",
      }}
      pointerEvents="none"
    >
      {barHeights.map((barHeight, index) => (
        <VisualizerBar
          key={index}
          height={barHeight}
          color={modeColors.accent}
          glowColor={modeColors.glow}
        />
      ))}
    </View>
  );
};

interface VisualizerBarProps {
  height: Animated.SharedValue<number>;
  color: string;
  glowColor: string;
}

const VisualizerBar: React.FC<VisualizerBarProps> = ({
  height,
  color,
  glowColor,
}) => {
  const animatedStyle = useAnimatedStyle(() => {
    const barHeight = interpolate(height.value, [0, 1], [8, 120]);

    return {
      height: barHeight,
      opacity: 0.3 + height.value * 0.5, // Fade in as height increases
      shadowOpacity: height.value * 0.6,
    };
  });

  return (
    <Animated.View
      style={[
        {
          flex: 1,
          backgroundColor: color,
          borderRadius: 4,
          shadowColor: glowColor,
          shadowOffset: { width: 0, height: 0 },
          shadowRadius: 12,
        },
        animatedStyle,
      ]}
    />
  );
};
