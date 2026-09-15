import React, { useEffect, useState } from "react";
import { Image, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

interface SplashScreenProps {
  onFinish: () => void;
  onFadeOut: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish, onFadeOut }) => {
  const insets = useSafeAreaInsets();
  const [laidOut, setLaidOut] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const artworkOpacity = useSharedValue(1);

  useEffect(() => {
    if (!laidOut || !imageLoaded) return;

    const hold = setTimeout(() => {
      onFadeOut();
      artworkOpacity.value = withTiming(0, { duration: 350 });
    }, 1500);
    const finish = setTimeout(onFinish, 1850);
    return () => {
      clearTimeout(hold);
      clearTimeout(finish);
      cancelAnimation(artworkOpacity);
    };
  }, [laidOut, imageLoaded, onFinish, onFadeOut, artworkOpacity]);

  const artworkStyle = useAnimatedStyle(() => ({ opacity: artworkOpacity.value }));

  return (
    <View
      style={{ flex: 1 }}
      onLayout={() => setLaidOut(true)}
    >
      <Animated.View style={[
        StyleSheet.absoluteFillObject,
        {
          backgroundColor: "#e5e4df",
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
          paddingLeft: insets.left,
          paddingRight: insets.right,
        },
        artworkStyle,
      ]}>
        <Image
          source={require("../../assets/3L3V8R_Splash.png")}
          resizeMode="contain"
          style={{ flex: 1, width: "100%" }}
          onLoad={() => setImageLoaded(true)}
          accessibilityLabel="3L3V8R — Elevate your learning"
        />
      </Animated.View>
    </View>
  );
};
