import React, { useRef, useState } from "react";
import { View, Text, Pressable } from "react-native";
import { WebView } from "react-native-webview";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from "react-native-reanimated";
import { useEffect } from "react";
import { useAppStore } from "../state/appStore";

export const YouTubeViewScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const webViewRef = useRef<WebView>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [canGoBack, setCanGoBack] = useState(false);

  const audioMode = useAppStore((s) => s.audioMode);

  // Animation values for splash
  const pulseOpacity = useSharedValue(0.6);
  const glowScale = useSharedValue(1);

  useEffect(() => {
    // Pulse animation for logo
    pulseOpacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.6, { duration: 1200, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    // Glow scale animation
    glowScale.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
  }));

  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glowScale.value }],
    opacity: pulseOpacity.value * 0.5,
  }));

  // Get mode colors
  const getModeColor = () => {
    switch (audioMode) {
      case "FOCUS":
        return "#FF9A5A";
      case "STUDY":
        return "#5FD4F4";
      case "CHILL":
        return "#A78BFA";
      case "FLOW":
        return "#5EEAD4";
      case "DEEP":
        return "#F87171";
      default:
        return "#FF9A5A";
    }
  };

  const accentColor = getModeColor();

  const handleGoBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (webViewRef.current && canGoBack) {
      webViewRef.current.goBack();
    }
  };

  const handleRefresh = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (webViewRef.current) {
      webViewRef.current.reload();
    }
  };

  return (
    <View className="flex-1 bg-[#0E0E0E]">
      {/* Custom Header */}
      <View
        className="bg-[#0a0a0a] border-b border-[#2a2a2a]"
        style={{ paddingTop: insets.top }}
      >
        <View className="flex-row items-center justify-between px-4 py-3">
          <Pressable
            onPress={handleGoBack}
            disabled={!canGoBack}
            className="p-2"
            style={{ opacity: canGoBack ? 1 : 0.4 }}
          >
            <Ionicons name="arrow-back" size={24} color={accentColor} />
          </Pressable>

          <Text
            className="text-white text-base tracking-[3px] font-mono uppercase"
            style={{ color: accentColor }}
          >
            YOUTUBE
          </Text>

          <Pressable onPress={handleRefresh} className="p-2">
            <Ionicons name="refresh" size={24} color={accentColor} />
          </Pressable>
        </View>
      </View>

      {/* 3L3V8R Splash Screen */}
      {isLoading && (
        <View className="absolute inset-0 items-center justify-center z-10 bg-[#0E0E0E]">
          {/* Glow effect behind logo */}
          <Animated.View
            style={[
              glowStyle,
              {
                position: "absolute",
                width: 200,
                height: 200,
                borderRadius: 100,
                backgroundColor: accentColor,
                opacity: 0.15,
              },
            ]}
          />

          {/* Main Logo */}
          <Animated.View style={pulseStyle}>
            <Text
              style={{
                fontSize: 48,
                fontWeight: "900",
                letterSpacing: 8,
                color: accentColor,
                textShadowColor: accentColor,
                textShadowOffset: { width: 0, height: 0 },
                textShadowRadius: 20,
              }}
            >
              3L3V8R
            </Text>
          </Animated.View>

          {/* Subtitle */}
          <Text
            className="mt-6 tracking-[4px]"
            style={{
              fontFamily: "monospace",
              fontSize: 11,
              color: "#666",
              textTransform: "uppercase",
            }}
          >
            Loading Content
          </Text>

          {/* Animated dots */}
          <View className="flex-row mt-4" style={{ gap: 6 }}>
            {[0, 1, 2].map((i) => (
              <Animated.View
                key={i}
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: accentColor,
                  opacity: 0.6,
                }}
              />
            ))}
          </View>
        </View>
      )}

      {/* WebView */}
      <WebView
        ref={webViewRef}
        source={{ uri: "https://m.youtube.com" }}
        style={{ flex: 1, backgroundColor: "#0E0E0E" }}
        onLoadStart={() => setIsLoading(true)}
        onLoadEnd={() => setIsLoading(false)}
        onNavigationStateChange={(navState) => {
          setCanGoBack(navState.canGoBack);
        }}
        // Allow autoplay
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        // Allow picture-in-picture if supported
        allowsPictureInPictureMediaPlayback={true}
        // Disable opening external apps
        onShouldStartLoadWithRequest={(request) => {
          // Only allow youtube domains
          const url = request.url.toLowerCase();
          if (
            url.includes("youtube.com") ||
            url.includes("youtu.be") ||
            url.includes("google.com") ||
            url.includes("gstatic.com") ||
            url.includes("ggpht.com") ||
            url.includes("ytimg.com")
          ) {
            return true;
          }
          return false;
        }}
        // iOS specific settings
        decelerationRate="normal"
        // Remove default styling
        contentInset={{ top: 0, left: 0, bottom: 0, right: 0 }}
        automaticallyAdjustContentInsets={false}
        // Dark mode preference
        forceDarkOn={true}
        // Disable bouncing for cleaner look
        bounces={false}
        // Better scrolling performance
        scrollEnabled={true}
        // Optimize for video playback
        javaScriptEnabled={true}
        domStorageEnabled={true}
        // User agent to ensure mobile experience
        userAgent="Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1"
      />
    </View>
  );
};
