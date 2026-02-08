import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useAppStore } from "../state/appStore";

interface SplashScreenProps {
  onFinish: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const audioMode = useAppStore((s) => s.audioMode);
  const [opacity, setOpacity] = useState(0);

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
    // Fade in animation
    const fadeIn = setTimeout(() => {
      setOpacity(1);
    }, 50);

    // Navigate after 2 seconds
    const timer = setTimeout(() => {
      onFinish();
    }, 2000);

    return () => {
      clearTimeout(fadeIn);
      clearTimeout(timer);
    };
  }, [onFinish]);

  return (
    <View style={styles.container}>
      <Text
        style={[
          styles.logo,
          {
            color: neonColor,
            textShadow: `0 0 30px ${neonColor}, 0 0 60px ${neonColor}, 0 0 90px ${neonColor}`,
            opacity: opacity,
            transition: "opacity 1s ease-out",
          } as any,
        ]}
      >
        3L3V8R
      </Text>
      <Text
        style={[
          styles.tagline,
          {
            color: neonColor,
            opacity: opacity * 0.5,
            transition: "opacity 1s ease-out",
          } as any,
        ]}
      >
        ELEVATE YOUR LEARNING
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#000000",
  },
  logo: {
    fontFamily: "monospace",
    fontSize: 52,
    fontWeight: "bold",
    letterSpacing: 8,
  },
  tagline: {
    fontFamily: "monospace",
    fontSize: 12,
    fontWeight: "500",
    letterSpacing: 6,
    marginTop: 12,
  },
});
