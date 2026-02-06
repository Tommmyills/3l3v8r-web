import React, { useRef, useState, useEffect } from "react";
import { View, Text, Pressable, Animated } from "react-native";
import { WebView } from "react-native-webview";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useAppStore } from "../state/appStore";

export const YouTubeViewScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const webViewRef = useRef<WebView>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [canGoBack, setCanGoBack] = useState(false);

  const audioMode = useAppStore((s) => s.audioMode);

  // Simple pulse animation using React Native Animated
  const pulseAnim = useRef(new Animated.Value(0.6)).current;
  const glowAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Pulse animation
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.6,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    );

    // Glow scale animation
    const glowAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1.15,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );

    pulseAnimation.start();
    glowAnimation.start();

    return () => {
      pulseAnimation.stop();
      glowAnimation.stop();
    };
  }, [pulseAnim, glowAnim]);

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
    <View style={{ flex: 1, backgroundColor: "#0E0E0E" }}>
      {/* Custom Header */}
      <View
        style={{
          backgroundColor: "#0a0a0a",
          borderBottomWidth: 1,
          borderBottomColor: "#2a2a2a",
          paddingTop: insets.top,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 16,
            paddingVertical: 12,
          }}
        >
          <Pressable
            onPress={handleGoBack}
            disabled={!canGoBack}
            style={{ padding: 8, opacity: canGoBack ? 1 : 0.4 }}
          >
            <Ionicons name="arrow-back" size={24} color={accentColor} />
          </Pressable>

          <Text
            style={{
              color: accentColor,
              fontSize: 16,
              letterSpacing: 3,
              fontFamily: "monospace",
              textTransform: "uppercase",
            }}
          >
            YOUTUBE
          </Text>

          <Pressable onPress={handleRefresh} style={{ padding: 8 }}>
            <Ionicons name="refresh" size={24} color={accentColor} />
          </Pressable>
        </View>
      </View>

      {/* 3L3V8R Splash Screen */}
      {isLoading && (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10,
            backgroundColor: "#0E0E0E",
          }}
        >
          {/* Glow effect behind logo */}
          <Animated.View
            style={{
              position: "absolute",
              width: 200,
              height: 200,
              borderRadius: 100,
              backgroundColor: accentColor,
              opacity: 0.15,
              transform: [{ scale: glowAnim }],
            }}
          />

          {/* Main Logo */}
          <Animated.View style={{ opacity: pulseAnim }}>
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
            style={{
              marginTop: 24,
              letterSpacing: 4,
              fontFamily: "monospace",
              fontSize: 11,
              color: "#666",
              textTransform: "uppercase",
            }}
          >
            Loading Content
          </Text>

          {/* Dots */}
          <View style={{ flexDirection: "row", marginTop: 16, gap: 6 }}>
            {[0, 1, 2].map((i) => (
              <View
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
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        allowsPictureInPictureMediaPlayback={true}
        onShouldStartLoadWithRequest={(request) => {
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
        decelerationRate="normal"
        contentInset={{ top: 0, left: 0, bottom: 0, right: 0 }}
        automaticallyAdjustContentInsets={false}
        forceDarkOn={true}
        bounces={false}
        scrollEnabled={true}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        userAgent="Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1"
      />
    </View>
  );
};
