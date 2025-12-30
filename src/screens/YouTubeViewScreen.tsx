import React, { useRef, useState } from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
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

      {/* Loading Indicator */}
      {isLoading && (
        <View className="absolute inset-0 items-center justify-center z-10 bg-[#0E0E0E]">
          <ActivityIndicator size="large" color={accentColor} />
          <Text className="text-[#666666] text-xs tracking-[2px] font-mono uppercase mt-4">
            LOADING YOUTUBE...
          </Text>
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
