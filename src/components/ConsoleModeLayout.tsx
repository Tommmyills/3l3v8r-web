import React from "react";
import { View, Text, Pressable, Dimensions } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  Easing,
  withTiming,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { AudioMode } from "../state/appStore";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const AnimatedView = Animated.createAnimatedComponent(View);

interface ConsoleModeLayoutProps {
  children: React.ReactNode;
  audioMode: AudioMode;
  onModeChange?: (mode: AudioMode) => void;
}

// Mode color mapping
const getModeColors = (mode: AudioMode) => {
  switch (mode) {
    case "FOCUS":
      return { accent: "#FF9A5A", glow: "#FF9A5A" };
    case "STUDY":
      return { accent: "#5FD4F4", glow: "#5FD4F4" };
    case "CHILL":
      return { accent: "#A78BFA", glow: "#A78BFA" };
    case "FLOW":
      return { accent: "#5EEAD4", glow: "#5EEAD4" };
    case "DEEP":
      return { accent: "#F87171", glow: "#F87171" };
  }
};

export const ConsoleModeLayout: React.FC<ConsoleModeLayoutProps> = ({
  children,
  audioMode,
  onModeChange,
}) => {
  const colors = getModeColors(audioMode);
  const glowPulse = useSharedValue(1);

  // Pulsing glow effect
  React.useEffect(() => {
    glowPulse.value = withRepeat(
      withSequence(
        withTiming(1.3, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, [audioMode]);

  const glowStyle = useAnimatedStyle(() => ({
    shadowOpacity: 0.6 * glowPulse.value,
    shadowRadius: 20 * glowPulse.value,
  }));

  return (
    <View style={{ flex: 1, backgroundColor: "#0a0a0a", alignItems: "center", justifyContent: "center" }}>
      {/* Physical Device Shell */}
      <View
        style={{
          width: SCREEN_WIDTH * 0.95,
          height: SCREEN_HEIGHT * 0.88,
          backgroundColor: "#1a1a1a",
          borderRadius: 24,
          borderWidth: 4,
          borderColor: "#2a2a2a",
          overflow: "hidden",
          shadowColor: colors.glow,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.4,
          shadowRadius: 30,
          elevation: 10,
        }}
      >
        {/* Inner Screen Bezel */}
        <View
          style={{
            flex: 1,
            margin: 12,
            backgroundColor: "#0E0E0E",
            borderRadius: 16,
            borderWidth: 2,
            borderColor: colors.accent,
            overflow: "hidden",
          }}
        >
          {/* Glowing Border Effect */}
          <AnimatedView
            style={[
              {
                position: "absolute",
                top: -2,
                left: -2,
                right: -2,
                bottom: -2,
                borderRadius: 16,
                borderWidth: 2,
                borderColor: colors.glow,
                shadowColor: colors.glow,
                shadowOffset: { width: 0, height: 0 },
                zIndex: 10,
                pointerEvents: "none",
              },
              glowStyle,
            ]}
          />

          {/* Screen Content */}
          <View style={{ flex: 1, padding: 8 }}>
            {children}
          </View>
        </View>

        {/* Physical Button Panel at Bottom */}
        <View
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 100,
            backgroundColor: "#1a1a1a",
            borderTopWidth: 2,
            borderTopColor: "#2a2a2a",
            paddingHorizontal: 16,
            paddingVertical: 12,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-around",
          }}
        >
          {/* Mode Selection Buttons */}
          {(["FOCUS", "STUDY", "CHILL", "FLOW", "DEEP"] as AudioMode[]).map((mode) => {
            const modeColor = getModeColors(mode);
            const isActive = audioMode === mode;

            return (
              <Pressable
                key={mode}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  onModeChange?.(mode);
                }}
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: isActive ? modeColor.accent : "#2a2a2a",
                  borderWidth: 2,
                  borderColor: isActive ? modeColor.glow : "#3a3a3a",
                  alignItems: "center",
                  justifyContent: "center",
                  shadowColor: isActive ? modeColor.glow : "transparent",
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.8,
                  shadowRadius: 10,
                }}
              >
                <Text
                  style={{
                    fontFamily: "monospace",
                    fontSize: 8,
                    color: isActive ? "#000" : "#666",
                    fontWeight: "700",
                    letterSpacing: 0.5,
                  }}
                >
                  {mode.slice(0, 1)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Top Panel - Serial Number / Branding */}
        <View
          style={{
            position: "absolute",
            top: 8,
            left: 16,
            right: 16,
            height: 24,
            backgroundColor: "#0a0a0a",
            borderRadius: 4,
            borderWidth: 1,
            borderColor: "#2a2a2a",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text
            style={{
              fontFamily: "monospace",
              fontSize: 8,
              color: colors.accent,
              letterSpacing: 2,
              fontWeight: "600",
            }}
          >
            3L3V8R-CONSOLE • {audioMode} MODE
          </Text>
        </View>
      </View>

      {/* Bottom Info Label */}
      <View style={{ marginTop: 12, paddingHorizontal: 20 }}>
        <Text
          style={{
            fontFamily: "monospace",
            fontSize: 8,
            color: "#666",
            textAlign: "center",
            letterSpacing: 1.5,
          }}
        >
          OPERATOR INTERFACE • TEEN ENGINEERING INSPIRED
        </Text>
      </View>
    </View>
  );
};
