import React from "react";
import { View, Text, Pressable } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { UIMode } from "../state/uiModeStore";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface UIModeToggleProps {
  mode: UIMode;
  onToggle: (mode: UIMode) => void;
  accentColor: string;
}

export const UIModeToggle: React.FC<UIModeToggleProps> = ({
  mode,
  onToggle,
  accentColor,
}) => {
  const togglePosition = useSharedValue(mode === "classic" ? 0 : 1);

  React.useEffect(() => {
    togglePosition.value = withSpring(mode === "classic" ? 0 : 1, {
      damping: 15,
      stiffness: 150,
    });
  }, [mode]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: togglePosition.value * 62 }],
  }));

  const handlePress = (newMode: UIMode) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onToggle(newMode);
  };

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(0,0,0,0.6)",
        borderRadius: 20,
        padding: 3,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.1)",
        width: 130,
        height: 32,
        position: "relative",
        shadowColor: accentColor,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      }}
    >
      {/* Animated Indicator */}
      <Animated.View
        style={[
          {
            position: "absolute",
            left: 3,
            top: 3,
            width: 60,
            height: 24,
            borderRadius: 16,
            backgroundColor: accentColor,
            shadowColor: accentColor,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.6,
            shadowRadius: 6,
          },
          indicatorStyle,
        ]}
      />

      {/* Classic Button */}
      <Pressable
        onPress={() => handlePress("classic")}
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          zIndex: 10,
        }}
      >
        <Text
          style={{
            fontFamily: "monospace",
            fontSize: 10,
            fontWeight: "700",
            color: mode === "classic" ? "#000" : "#666",
            letterSpacing: 0.5,
          }}
        >
          CLASSIC
        </Text>
      </Pressable>

      {/* Console Button */}
      <Pressable
        onPress={() => handlePress("console")}
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          zIndex: 10,
        }}
      >
        <Text
          style={{
            fontFamily: "monospace",
            fontSize: 10,
            fontWeight: "700",
            color: mode === "console" ? "#000" : "#666",
            letterSpacing: 0.5,
          }}
        >
          CONSOLE
        </Text>
      </Pressable>
    </View>
  );
};
