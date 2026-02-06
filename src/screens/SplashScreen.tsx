import React, { useEffect } from "react";
import { View, Text } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { useAppStore } from "../state/appStore";

interface SplashScreenProps {
  onFinish: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const audioMode = useAppStore((s) => s.audioMode);
  const opacity = useSharedValue(0);

  // Get mode color
  const getModeColor = () => {
    switch (audioMode) {
      case "FOCUS":
        return "#FF7A00";
      case "STUDY":
        return "#00E3FF";
      case "CHILL":
        return "#8B5CF6";
      case "FLOW":
        return "#14B8A6";
      case "DEEP":
        return "#EF4444";
      default:
        return "#FF7A00";
    }
  };

  const neonColor = getModeColor();

  useEffect(() => {
    // Fade in over 1 second
    opacity.value = withTiming(1, {
      duration: 1000,
      easing: Easing.out(Easing.ease),
    });

    // Navigate after 2 seconds total (1s fade + 1s hold)
    const timer = setTimeout(() => {
      onFinish();
    }, 2000);

    return () => clearTimeout(timer);
  }, [onFinish]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <View className="flex-1 items-center justify-center" style={{ backgroundColor: "#000000" }}>
      <Animated.Text
        style={[
          {
            fontFamily: "monospace",
            fontSize: 52,
            fontWeight: "bold",
            letterSpacing: 8,
            color: neonColor,
            textShadowColor: neonColor,
            textShadowOffset: { width: 0, height: 0 },
            textShadowRadius: 30,
          },
          animatedStyle,
        ]}
      >
        ELEVATE
      </Animated.Text>
      <Animated.Text
        style={[
          {
            fontFamily: "monospace",
            fontSize: 12,
            fontWeight: "500",
            letterSpacing: 6,
            color: neonColor,
            opacity: 0.5,
            marginTop: 12,
          },
          animatedStyle,
        ]}
      >
        YOUR LEARNING
      </Animated.Text>
    </View>
  );
};
