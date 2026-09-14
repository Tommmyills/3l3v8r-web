import React, { useEffect, useState } from "react";
import { View } from "react-native";
import * as NativeSplashScreen from "expo-splash-screen";
import { SynthwaveMediaIdleDisplayV2 } from "../components/HardwareChrome";

interface SplashScreenProps {
  onFinish: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!ready) return;
    const timer = setTimeout(onFinish, 2400);
    return () => clearTimeout(timer);
  }, [ready, onFinish]);

  return (
    <View
      style={{ flex: 1, backgroundColor: "#020207" }}
      onLayout={() => {
        setReady(true);
        void NativeSplashScreen.hideAsync().catch(() => {});
      }}
    >
      <SynthwaveMediaIdleDisplayV2 opening />
    </View>
  );
};
