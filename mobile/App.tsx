import { useCallback, useState } from "react";
import { View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { MixwaveScreen } from "./src/screens/MixwaveScreen";
import { SplashScreen } from "./src/screens/SplashScreen";

/*
IMPORTANT NOTICE: DO NOT REMOVE
There are already environment keys in the project.
Before telling the user to add them, check if you already have access to the required keys through bash.
Directly access them with process.env.${key}

Correct usage:
process.env.EXPO_PUBLIC_VIBECODE_{key}
//directly access the key

Incorrect usage:
import { OPENAI_API_KEY } from '@env';
//don't use @env, its depreicated

Incorrect usage:
import Constants from 'expo-constants';
const openai_api_key = Constants.expoConfig.extra.apikey;
//don't use expo-constants, its depreicated

*/

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [showApp, setShowApp] = useState(false);
  const beginSplashFade = useCallback(() => setShowApp(true), []);
  const finishSplash = useCallback(() => {
    setShowApp(true);
    setShowSplash(false);
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: "#020207" }}>
      <SafeAreaProvider>
        {showApp && <NavigationContainer>
          <MixwaveScreen />
        </NavigationContainer>}
        {showSplash && (
          <View style={{ position: "absolute", inset: 0 }}>
            <SplashScreen onFinish={finishSplash} onFadeOut={beginSplashFade} />
          </View>
        )}
        <StatusBar style="light" />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
