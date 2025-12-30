import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  Dimensions,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useAppStore, AudioMode } from "../state/appStore";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { UIModeToggle } from "../components/UIModeToggle";
import { useUIModeStore } from "../state/uiModeStore";
import YoutubePlayer, { YoutubeIframeRef } from "react-native-youtube-iframe";
import Slider from "@react-native-community/slider";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const AnimatedView = Animated.createAnimatedComponent(View);
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Mode color mapping
const getModeColors = (mode: AudioMode) => {
  switch (mode) {
    case "FOCUS":
      return { accent: "#FF9A5A", glow: "#FF9A5A", dark: "#CC6B2F" };
    case "STUDY":
      return { accent: "#5FD4F4", glow: "#5FD4F4", dark: "#3A9FBF" };
    case "CHILL":
      return { accent: "#A78BFA", glow: "#A78BFA", dark: "#7C5FC5" };
    case "FLOW":
      return { accent: "#5EEAD4", glow: "#5EEAD4", dark: "#3FB5A3" };
    case "DEEP":
      return { accent: "#F87171", glow: "#F87171", dark: "#C34646" };
  }
};

export const ConsoleModeScreen: React.FC = () => {
  const insets = useSafeAreaInsets();

  // State
  const mainVideo = useAppStore((s) => s.mainVideo);
  const setMainVideoVolume = useAppStore((s) => s.setMainVideoVolume);
  const audioMode = useAppStore((s) => s.audioMode);
  const setAudioMode = useAppStore((s) => s.setAudioMode);
  const uiMode = useUIModeStore((s) => s.uiMode);
  const setUIMode = useUIModeStore((s) => s.setUIMode);

  const modeColors = getModeColors(audioMode);
  const glowPulse = useSharedValue(1);
  const mainPlayerRef = useRef<YoutubeIframeRef>(null);

  // Pulsing glow effect
  useEffect(() => {
    glowPulse.value = withRepeat(
      withSequence(
        withTiming(1.4, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, [audioMode]);

  const glowStyle = useAnimatedStyle(() => ({
    shadowOpacity: 0.7 * glowPulse.value,
    shadowRadius: 25 * glowPulse.value,
  }));

  // Big center dial rotation
  const [dialValue, setDialValue] = useState(mainVideo.volume);
  const dialRotation = useSharedValue(0);

  useEffect(() => {
    dialRotation.value = withSpring((dialValue / 100) * 270 - 135);
  }, [dialValue]);

  const dialStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${dialRotation.value}deg` }],
  }));

  const handleDialChange = (value: number) => {
    setDialValue(value);
    setMainVideoVolume(value);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#0a0a0a", paddingTop: insets.top }}>
      {/* UI Mode Toggle */}
      <View style={{ alignItems: "center", paddingVertical: 12 }}>
        <UIModeToggle mode={uiMode} onToggle={setUIMode} accentColor={modeColors.accent} />
      </View>

      {/* Physical Device Shell */}
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          paddingBottom: insets.bottom + 20,
        }}
      >
        <View
          style={{
            width: SCREEN_WIDTH * 0.95,
            height: SCREEN_HEIGHT * 0.8,
            backgroundColor: "#1a1a1a",
            borderRadius: 24,
            borderWidth: 4,
            borderColor: "#2a2a2a",
            overflow: "hidden",
            shadowColor: modeColors.glow,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.4,
            shadowRadius: 30,
            elevation: 10,
          }}
        >
          {/* Top Panel - Branding */}
          <View
            style={{
              height: 28,
              backgroundColor: "#0a0a0a",
              borderBottomWidth: 2,
              borderBottomColor: "#2a2a2a",
              alignItems: "center",
              justifyContent: "center",
              paddingHorizontal: 16,
            }}
          >
            <Text
              style={{
                fontFamily: "monospace",
                fontSize: 9,
                color: modeColors.accent,
                letterSpacing: 2.5,
                fontWeight: "600",
              }}
            >
              3L3V8R-CONSOLE • {audioMode} MODE
            </Text>
          </View>

          {/* Inner Screen Bezel */}
          <View
            style={{
              flex: 1,
              margin: 12,
              backgroundColor: "#0E0E0E",
              borderRadius: 16,
              borderWidth: 2,
              borderColor: modeColors.accent,
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
                  borderColor: modeColors.glow,
                  shadowColor: modeColors.glow,
                  shadowOffset: { width: 0, height: 0 },
                  zIndex: 10,
                  pointerEvents: "none",
                },
                glowStyle,
              ]}
            />

            {/* Screen Content */}
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ padding: 16 }}
              showsVerticalScrollIndicator={false}
            >
              {/* Video Display Area */}
              {mainVideo.videoId ? (
                <View
                  style={{
                    width: "100%",
                    height: 180,
                    borderRadius: 12,
                    overflow: "hidden",
                    borderWidth: 2,
                    borderColor: modeColors.dark,
                    marginBottom: 20,
                  }}
                >
                  <YoutubePlayer
                    ref={mainPlayerRef}
                    height={180}
                    videoId={mainVideo.videoId}
                    play={mainVideo.isPlaying}
                    volume={mainVideo.volume}
                    muted={mainVideo.isMuted}
                  />
                </View>
              ) : (
                <View
                  style={{
                    width: "100%",
                    height: 180,
                    borderRadius: 12,
                    backgroundColor: "#1a1a1a",
                    borderWidth: 2,
                    borderColor: modeColors.dark,
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 20,
                  }}
                >
                  <Ionicons name="tv-outline" size={48} color="#333" />
                  <Text
                    style={{
                      fontFamily: "monospace",
                      fontSize: 10,
                      color: "#666",
                      marginTop: 12,
                      letterSpacing: 1.5,
                    }}
                  >
                    NO SIGNAL
                  </Text>
                </View>
              )}

              {/* Big Center Dial */}
              <View style={{ alignItems: "center", marginVertical: 24 }}>
                <View
                  style={{
                    width: 180,
                    height: 180,
                    borderRadius: 90,
                    backgroundColor: "#1a1a1a",
                    borderWidth: 4,
                    borderColor: modeColors.accent,
                    alignItems: "center",
                    justifyContent: "center",
                    shadowColor: modeColors.glow,
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.6,
                    shadowRadius: 20,
                  }}
                >
                  {/* Dial Indicator */}
                  <AnimatedView style={[{ position: "absolute" }, dialStyle]}>
                    <View
                      style={{
                        width: 6,
                        height: 70,
                        backgroundColor: modeColors.accent,
                        borderRadius: 3,
                        shadowColor: modeColors.glow,
                        shadowOffset: { width: 0, height: 0 },
                        shadowOpacity: 0.8,
                        shadowRadius: 10,
                      }}
                    />
                  </AnimatedView>

                  {/* Center Circle */}
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: modeColors.accent,
                      shadowColor: modeColors.glow,
                      shadowOffset: { width: 0, height: 0 },
                      shadowOpacity: 1,
                      shadowRadius: 15,
                    }}
                  />

                  {/* Volume Value */}
                  <Text
                    style={{
                      position: "absolute",
                      bottom: 30,
                      fontFamily: "monospace",
                      fontSize: 32,
                      color: modeColors.accent,
                      fontWeight: "700",
                    }}
                  >
                    {Math.round(dialValue)}
                  </Text>
                </View>

                {/* Dial Label */}
                <Text
                  style={{
                    fontFamily: "monospace",
                    fontSize: 10,
                    color: "#666",
                    marginTop: 12,
                    letterSpacing: 2,
                  }}
                >
                  MASTER GAIN
                </Text>

                {/* Hidden Slider for Control */}
                <Slider
                  style={{ width: 200, height: 40, marginTop: 8 }}
                  minimumValue={0}
                  maximumValue={100}
                  value={dialValue}
                  onValueChange={handleDialChange}
                  minimumTrackTintColor={modeColors.accent}
                  maximumTrackTintColor="#2a2a2a"
                  thumbTintColor={modeColors.accent}
                />
              </View>

              {/* Mode Indicator Grid */}
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "center",
                  gap: 8,
                  marginTop: 16,
                }}
              >
                {(["FOCUS", "STUDY", "CHILL", "FLOW", "DEEP"] as AudioMode[]).map((mode) => {
                  const mColor = getModeColors(mode);
                  const isActive = audioMode === mode;

                  return (
                    <Pressable
                      key={mode}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        setAudioMode(mode);
                      }}
                      style={{
                        width: 50,
                        height: 50,
                        borderRadius: 8,
                        backgroundColor: isActive ? mColor.accent : "#2a2a2a",
                        borderWidth: 2,
                        borderColor: isActive ? mColor.glow : "#3a3a3a",
                        alignItems: "center",
                        justifyContent: "center",
                        shadowColor: isActive ? mColor.glow : "transparent",
                        shadowOffset: { width: 0, height: 0 },
                        shadowOpacity: 0.8,
                        shadowRadius: 12,
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: "monospace",
                          fontSize: 9,
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
            </ScrollView>
          </View>

          {/* Bottom Info Label */}
          <View
            style={{
              height: 24,
              backgroundColor: "#0a0a0a",
              borderTopWidth: 2,
              borderTopColor: "#2a2a2a",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text
              style={{
                fontFamily: "monospace",
                fontSize: 8,
                color: "#666",
                letterSpacing: 1.5,
              }}
            >
              OPERATOR INTERFACE • TEEN ENGINEERING INSPIRED
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};
