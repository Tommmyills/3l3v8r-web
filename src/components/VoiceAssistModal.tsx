import React from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import {
  useVoiceAssistStore,
  Language,
} from "../state/voiceAssistStore";

interface VoiceAssistModalProps {
  onClose: () => void;
  modeColor: string;
}

const LANGUAGE_OPTIONS: { value: Language; label: string }[] = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "de", label: "German" },
  { value: "pt", label: "Portuguese" },
  { value: "ja", label: "Japanese" },
  { value: "zh-CN", label: "Chinese" },
];

export const VoiceAssistModal: React.FC<VoiceAssistModalProps> = ({
  onClose,
  modeColor,
}) => {
  const translationEnabled = useVoiceAssistStore((s) => s.voiceAssistEnabled);
  const targetLang = useVoiceAssistStore((s) => s.voiceAssistTargetLang);

  const setTranslationEnabled = useVoiceAssistStore(
    (s) => s.setVoiceAssistEnabled
  );
  const setTargetLang = useVoiceAssistStore((s) => s.setVoiceAssistTargetLang);

  return (
    <View
      className="absolute inset-0 items-center justify-center px-6"
      style={{ backgroundColor: "rgba(0,0,0,0.90)", zIndex: 200 }}
    >
      <BlurView
        intensity={40}
        tint="dark"
        className="w-full max-w-md rounded-3xl overflow-hidden"
        style={{
          borderWidth: 1,
          borderColor: modeColor,
          backgroundColor: "rgba(10,10,10,0.6)",
          shadowColor: modeColor,
          shadowOffset: { width: 0, height: 12 },
          shadowOpacity: 0.4,
          shadowRadius: 24,
        }}
      >
        {/* Header */}
        <View
          className="px-5 py-4 border-b flex-row items-center justify-between"
          style={{
            backgroundColor: "rgba(255,255,255,0.02)",
            borderColor: `${modeColor}50`,
          }}
        >
          <View className="flex-row items-center" style={{ gap: 8 }}>
            <Ionicons name="language" size={18} color={modeColor} />
            <Text
              className="text-sm font-bold tracking-widest"
              style={{ fontFamily: "monospace", color: modeColor }}
            >
              TEXT TRANSLATOR
            </Text>
          </View>
          <Pressable
            onPress={() => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              onClose();
            }}
            className="p-1"
          >
            <Ionicons name="close" size={20} color="#999" />
          </Pressable>
        </View>

        <ScrollView
          className="max-h-96"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View className="p-5">
            {/* Enable Toggle */}
            <View className="mb-6">
              <Text
                className="text-xs text-gray-400 mb-3 tracking-wider"
                style={{ fontFamily: "monospace" }}
              >
                ENABLE TRANSLATION
              </Text>
              <Pressable
                onPress={() => {
                  Haptics.notificationAsync(
                    Haptics.NotificationFeedbackType.Success
                  );
                  setTranslationEnabled(!translationEnabled);
                }}
                className="border px-4 py-3.5 rounded-2xl flex-row items-center justify-between"
                style={{
                  borderColor: translationEnabled
                    ? modeColor
                    : "rgba(255,255,255,0.1)",
                  backgroundColor: translationEnabled
                    ? `${modeColor}15`
                    : "rgba(255,255,255,0.03)",
                  shadowColor: translationEnabled ? modeColor : "transparent",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: translationEnabled ? 0.3 : 0,
                  shadowRadius: 8,
                }}
              >
                <Text
                  className="text-sm font-semibold tracking-wider"
                  style={{
                    color: translationEnabled ? modeColor : "#999",
                    letterSpacing: 0.5,
                  }}
                >
                  Text Translation {translationEnabled ? "ON" : "OFF"}
                </Text>
                <Ionicons
                  name={
                    translationEnabled ? "toggle" : "toggle-outline"
                  }
                  size={28}
                  color={translationEnabled ? modeColor : "#666"}
                />
              </Pressable>
            </View>

            {/* Info Box */}
            <View className="mb-6">
              <View
                className="border px-4 py-3.5 rounded-2xl"
                style={{
                  borderColor: "rgba(255,255,255,0.1)",
                  backgroundColor: "rgba(0,0,0,0.3)",
                }}
              >
                <View className="flex-row items-center mb-2" style={{ gap: 8 }}>
                  <Ionicons name="information-circle" size={16} color="#666" />
                  <Text
                    className="text-xs text-gray-400 tracking-wider"
                    style={{ fontFamily: "monospace" }}
                  >
                    HOW IT WORKS
                  </Text>
                </View>
                <Text
                  className="text-xs leading-5"
                  style={{ color: "#999", letterSpacing: 0.3 }}
                >
                  When enabled, video transcripts will be automatically translated to your selected language. Open the transcript view and use the translate button to see translated text.
                </Text>
              </View>
            </View>

            {/* Translate To Language */}
            <View className="mb-4">
              <Text
                className="text-xs text-gray-400 mb-3 tracking-wider"
                style={{ fontFamily: "monospace" }}
              >
                TRANSLATE TO
              </Text>
              <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                {LANGUAGE_OPTIONS.map((lang) => (
                  <Pressable
                    key={`output-${lang.value}`}
                    onPress={() => {
                      console.log("[TextTranslator] Language selected:", lang.value);
                      Haptics.notificationAsync(
                        Haptics.NotificationFeedbackType.Success
                      );
                      setTargetLang(lang.value);
                    }}
                    className="border px-4 py-2.5 rounded-xl"
                    style={{
                      borderColor:
                        targetLang === lang.value
                          ? modeColor
                          : "rgba(255,255,255,0.1)",
                      backgroundColor:
                        targetLang === lang.value
                          ? `${modeColor}15`
                          : "rgba(0,0,0,0.3)",
                    }}
                  >
                    <Text
                      className="text-xs font-semibold"
                      style={{
                        color: targetLang === lang.value ? modeColor : "#999",
                        letterSpacing: 0.5,
                      }}
                    >
                      {lang.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Footer */}
        <View
          className="px-5 py-4 border-t"
          style={{
            backgroundColor: "rgba(255,255,255,0.02)",
            borderColor: "rgba(255,255,255,0.05)",
          }}
        >
          <Pressable
            onPress={() => {
              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success
              );
              onClose();
            }}
            className="border py-3 rounded-2xl"
            style={{
              borderColor: modeColor,
              backgroundColor: `${modeColor}20`,
              shadowColor: modeColor,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.4,
              shadowRadius: 10,
            }}
          >
            <Text
              className="font-bold text-sm text-center tracking-widest"
              style={{ fontFamily: "monospace", color: modeColor }}
            >
              DONE
            </Text>
          </Pressable>
        </View>
      </BlurView>
    </View>
  );
};
