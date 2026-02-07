import React, { useEffect } from "react";
import { View, Text } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withDelay,
  withSpring,
  Easing,
  interpolate,
  interpolateColor,
} from "react-native-reanimated";
import { AudioMode } from "../state/appStore";

interface AudioVisualizerProps {
  mode: AudioMode;
  audioLevel: number; // 0-100 representing the audio level
  isActive: boolean; // Whether audio is currently playing
  opacity?: number; // Optional opacity override (0-1)
  showLabel?: boolean; // Show "SOUND" label
}

// Mode color mapping - matching MixWaveScreen
const getModeColors = (mode: AudioMode) => {
  switch (mode) {
    case "FOCUS":
      return { accent: "#FF9A5A", glow: "#FF9A5A", secondary: "#FFB380" }; // Orange
    case "STUDY":
      return { accent: "#5FD4F4", glow: "#5FD4F4", secondary: "#8DE4FF" }; // Cyan
    case "CHILL":
      return { accent: "#A78BFA", glow: "#A78BFA", secondary: "#C4B5FD" }; // Purple
    case "FLOW":
      return { accent: "#5EEAD4", glow: "#5EEAD4", secondary: "#99F6E4" }; // Teal
    case "DEEP":
      return { accent: "#F87171", glow: "#F87171", secondary: "#FCA5A5" }; // Red
  }
};

const NUM_BARS = 24; // More bars for richer visualization

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  mode,
  audioLevel,
  isActive,
  opacity = 1,
  showLabel = false,
}) => {
  const modeColors = getModeColors(mode);
  const pulseValue = useSharedValue(0);
  const glowIntensity = useSharedValue(0);

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
  const bar16 = useSharedValue(0);
  const bar17 = useSharedValue(0);
  const bar18 = useSharedValue(0);
  const bar19 = useSharedValue(0);
  const bar20 = useSharedValue(0);
  const bar21 = useSharedValue(0);
  const bar22 = useSharedValue(0);
  const bar23 = useSharedValue(0);

  const barHeights = [
    bar0, bar1, bar2, bar3, bar4, bar5, bar6, bar7,
    bar8, bar9, bar10, bar11, bar12, bar13, bar14, bar15,
    bar16, bar17, bar18, bar19, bar20, bar21, bar22, bar23,
  ];

  useEffect(() => {
    if (isActive) {
      // Pulsing background glow
      pulseValue.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.3, { duration: 1500, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );

      glowIntensity.value = withTiming(1, { duration: 500 });

      // Animate bars with staggered timing for wave effect - center outward pattern
      const centerIndex = Math.floor(barHeights.length / 2);
      barHeights.forEach((bar, index) => {
        const distanceFromCenter = Math.abs(index - centerIndex);
        const delay = distanceFromCenter * 40; // Stagger from center
        const baseHeight = 0.4 + (1 - distanceFromCenter / centerIndex) * 0.3; // Higher in center
        const duration = 500 + Math.random() * 300;

        bar.value = withDelay(
          delay,
          withRepeat(
            withSequence(
              withTiming(baseHeight + Math.random() * 0.4, {
                duration: duration,
                easing: Easing.bezier(0.25, 0.1, 0.25, 1),
              }),
              withTiming(0.15 + Math.random() * 0.15, {
                duration: duration,
                easing: Easing.bezier(0.25, 0.1, 0.25, 1),
              })
            ),
            -1,
            true
          )
        );
      });
    } else {
      // Smooth fade out
      pulseValue.value = withTiming(0, { duration: 600 });
      glowIntensity.value = withTiming(0, { duration: 400 });

      barHeights.forEach((bar, index) => {
        bar.value = withDelay(
          index * 20,
          withTiming(0, {
            duration: 400,
            easing: Easing.out(Easing.ease),
          })
        );
      });
    }
  }, [isActive]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulseValue.value, [0, 1], [0.1, 0.3]) * glowIntensity.value,
  }));

  return (
    <View
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1,
        backgroundColor: "transparent",
      }}
      pointerEvents="none"
    >
      {/* Pulsing background glow */}
      <Animated.View
        style={[
          {
            position: "absolute",
            top: "20%",
            left: "10%",
            right: "10%",
            bottom: "20%",
            borderRadius: 100,
            backgroundColor: modeColors.accent,
          },
          pulseStyle,
        ]}
      />

      {/* Main visualizer bars */}
      <View
        style={{
          flex: 1,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 12,
          gap: 3,
          opacity: opacity,
        }}
      >
        {barHeights.map((barHeight, index) => (
          <VisualizerBar
            key={index}
            height={barHeight}
            color={modeColors.accent}
            glowColor={modeColors.glow}
            secondaryColor={modeColors.secondary}
            index={index}
            total={barHeights.length}
          />
        ))}
      </View>

      {/* Optional label */}
      {showLabel && isActive && (
        <View
          style={{
            position: "absolute",
            bottom: 8,
            left: 0,
            right: 0,
            alignItems: "center",
          }}
        >
          <Text
            style={{
              fontFamily: "monospace",
              fontSize: 8,
              letterSpacing: 4,
              color: modeColors.accent,
              opacity: 0.5,
            }}
          >
            SOUND
          </Text>
        </View>
      )}
    </View>
  );
};

interface VisualizerBarProps {
  height: Animated.SharedValue<number>;
  color: string;
  glowColor: string;
  secondaryColor: string;
  index: number;
  total: number;
}

const VisualizerBar: React.FC<VisualizerBarProps> = ({
  height,
  color,
  glowColor,
  secondaryColor,
  index,
  total,
}) => {
  const centerIndex = Math.floor(total / 2);
  const distanceFromCenter = Math.abs(index - centerIndex);
  const normalizedDistance = distanceFromCenter / centerIndex;

  const animatedStyle = useAnimatedStyle(() => {
    const barHeight = interpolate(height.value, [0, 1], [4, 140]);
    const barOpacity = interpolate(height.value, [0, 0.3, 1], [0.2, 0.6, 0.95]);
    const shadowIntensity = interpolate(height.value, [0, 1], [0, 0.9]);

    return {
      height: barHeight,
      opacity: barOpacity,
      shadowOpacity: shadowIntensity,
      transform: [{ scaleX: interpolate(height.value, [0, 1], [0.8, 1]) }],
    };
  });

  const gradientStyle = useAnimatedStyle(() => {
    const gradientOpacity = interpolate(height.value, [0, 0.5, 1], [0, 0.3, 0.6]);
    return {
      opacity: gradientOpacity,
    };
  });

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <Animated.View
        style={[
          {
            width: "100%",
            backgroundColor: color,
            borderRadius: 3,
            shadowColor: glowColor,
            shadowOffset: { width: 0, height: 0 },
            shadowRadius: 16,
            minWidth: 3,
          },
          animatedStyle,
        ]}
      >
        {/* Inner gradient highlight */}
        <Animated.View
          style={[
            {
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: "40%",
              backgroundColor: secondaryColor,
              borderTopLeftRadius: 3,
              borderTopRightRadius: 3,
            },
            gradientStyle,
          ]}
        />
      </Animated.View>
    </View>
  );
};
