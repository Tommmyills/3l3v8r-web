import React, { useEffect, useState } from "react";
import { Image, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import * as NativeSplashScreen from "expo-splash-screen";
import { SynthwaveMediaIdleDisplayV2 } from "../components/HardwareChrome";

interface SplashScreenProps {
  onFinish: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const insets = useSafeAreaInsets();
  const [laidOut, setLaidOut] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [showArtwork, setShowArtwork] = useState(true);
  const [showOpening, setShowOpening] = useState(false);
  const artworkOpacity = useSharedValue(1);

  useEffect(() => {
    if (!laidOut || !imageLoaded) return;
    void NativeSplashScreen.hideAsync().catch(() => {});

    const hold = setTimeout(() => {
      setShowOpening(true);
      artworkOpacity.value = withTiming(0, { duration: 350 });
    }, 1500);
    const fade = setTimeout(() => setShowArtwork(false), 1850);
    const finish = setTimeout(onFinish, 1850 + 2400);
    return () => {
      clearTimeout(hold);
      clearTimeout(fade);
      clearTimeout(finish);
      cancelAnimation(artworkOpacity);
    };
  }, [laidOut, imageLoaded, onFinish, artworkOpacity]);

  const artworkStyle = useAnimatedStyle(() => ({ opacity: artworkOpacity.value }));

  return (
    <View
      style={{ flex: 1, backgroundColor: "#020207" }}
      onLayout={() => setLaidOut(true)}
    >
      {showOpening && <SynthwaveMediaIdleDisplayV2 opening />}
      {showArtwork && (
        <Animated.View style={[
          StyleSheet.absoluteFillObject,
          {
            backgroundColor: "#020207",
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
      )}
    </View>
  );
};
