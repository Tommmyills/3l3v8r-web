import React from "react";
import { View, Text, Pressable, ScrollView, Alert, Linking } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAppStore } from "../state/appStore";

interface SettingsScreenProps {
  onClose: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onClose }) => {
  const insets = useSafeAreaInsets();
  const visualizerEnabled = useAppStore((s) => s.visualizerEnabled);
  const setVisualizerEnabled = useAppStore((s) => s.setVisualizerEnabled);

  const handleResetAppData = () => {
    Alert.alert(
      "Reset App Data",
      "Are you sure you want to reset all app data? This will clear all settings and return the app to its default state.",
      [
        {
          text: "Cancel",
          style: "cancel",
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          },
        },
        {
          text: "Reset",
          style: "destructive",
          onPress: async () => {
            try {
              await AsyncStorage.clear();
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert("Success", "App data has been reset. Please restart the app.");
            } catch (error) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              Alert.alert("Error", "Failed to reset app data. Please try again.");
            }
          },
        },
      ]
    );
  };

  const handleOpenLink = (url: string, title: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert(
      title,
      "This feature will open external links once configured.",
      [
        {
          text: "OK",
          onPress: () => {},
        },
      ]
    );
    // For future implementation:
    // Linking.openURL(url);
  };

  const SettingItem = ({
    icon,
    title,
    subtitle,
    onPress,
    showChevron = true,
    destructive = false,
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    subtitle?: string;
    onPress: () => void;
    showChevron?: boolean;
    destructive?: boolean;
  }) => (
    <Pressable
      onPress={() => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onPress();
      }}
      className="border-b px-6 py-5"
      style={{ borderColor: "#2a2a2a" }}
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center flex-1" style={{ gap: 14 }}>
          <View
            className="w-9 h-9 rounded items-center justify-center"
            style={{ backgroundColor: destructive ? "#EF444410" : "#FF7A0010" }}
          >
            <Ionicons
              name={icon}
              size={20}
              color={destructive ? "#EF4444" : "#FF7A00"}
            />
          </View>
          <View className="flex-1">
            <Text
              className="text-white text-sm mb-0.5"
              style={{ fontFamily: "monospace" }}
            >
              {title}
            </Text>
            {subtitle && (
              <Text
                className="text-gray-500 text-xs"
                style={{ fontFamily: "monospace" }}
              >
                {subtitle}
              </Text>
            )}
          </View>
        </View>
        {showChevron && (
          <Ionicons name="chevron-forward" size={18} color="#666" />
        )}
      </View>
    </Pressable>
  );

  const ToggleSettingItem = ({
    icon,
    title,
    subtitle,
    value,
    onToggle,
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    subtitle?: string;
    value: boolean;
    onToggle: (newValue: boolean) => void;
  }) => (
    <Pressable
      onPress={() => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onToggle(!value);
      }}
      className="border-b px-6 py-5"
      style={{ borderColor: "#2a2a2a" }}
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center flex-1" style={{ gap: 14 }}>
          <View
            className="w-9 h-9 rounded items-center justify-center"
            style={{ backgroundColor: "#FF7A0010" }}
          >
            <Ionicons name={icon} size={20} color="#FF7A00" />
          </View>
          <View className="flex-1">
            <Text
              className="text-white text-sm mb-0.5"
              style={{ fontFamily: "monospace" }}
            >
              {title}
            </Text>
            {subtitle && (
              <Text
                className="text-gray-500 text-xs"
                style={{ fontFamily: "monospace" }}
              >
                {subtitle}
              </Text>
            )}
          </View>
        </View>
        <View
          className="w-12 h-7 rounded-full p-1 flex-row items-center"
          style={{
            backgroundColor: value ? "#FF7A00" : "#333",
            justifyContent: value ? "flex-end" : "flex-start",
          }}
        >
          <View
            className="w-5 h-5 rounded-full"
            style={{ backgroundColor: "#fff" }}
          />
        </View>
      </View>
    </Pressable>
  );

  return (
    <View
      className="flex-1"
      style={{ backgroundColor: "#0E0E0E", paddingTop: insets.top }}
    >
      {/* Header */}
      <View
        className="px-6 py-4 border-b flex-row items-center"
        style={{ borderColor: "#2a2a2a", backgroundColor: "#121212" }}
      >
        <Pressable
          onPress={() => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            onClose();
          }}
          className="mr-3 p-1"
        >
          <Ionicons name="arrow-back" size={22} color="#FF7A00" />
        </Pressable>
        <View className="flex-1">
          <Text
            className="text-lg font-bold tracking-widest"
            style={{ fontFamily: "monospace", color: "#FF7A00" }}
          >
            SETTINGS
          </Text>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Visual Settings Section */}
        <View className="px-6 pt-6 pb-3">
          <Text
            className="text-gray-500 text-xs tracking-widest mb-3"
            style={{ fontFamily: "monospace", letterSpacing: 2 }}
          >
            VISUAL SETTINGS
          </Text>
        </View>

        <View className="border-t" style={{ borderColor: "#2a2a2a" }}>
          <ToggleSettingItem
            icon="pulse-outline"
            title="Audio Visualizer"
            subtitle="Show animated visualizer in player"
            value={visualizerEnabled}
            onToggle={setVisualizerEnabled}
          />
        </View>

        {/* App Info Section */}
        <View className="px-6 pt-6 pb-3">
          <Text
            className="text-gray-500 text-xs tracking-widest mb-3"
            style={{ fontFamily: "monospace", letterSpacing: 2 }}
          >
            APP INFORMATION
          </Text>
        </View>

        <View className="border-t" style={{ borderColor: "#2a2a2a" }}>
          <SettingItem
            icon="information-circle-outline"
            title="App Version"
            subtitle="3L3VAT3 v1.0.0 (Build 001)"
            onPress={() => {}}
            showChevron={false}
          />
        </View>

        {/* Legal Section */}
        <View className="px-6 pt-8 pb-3">
          <Text
            className="text-gray-500 text-xs tracking-widest mb-3"
            style={{ fontFamily: "monospace", letterSpacing: 2 }}
          >
            LEGAL
          </Text>
        </View>

        <View className="border-t" style={{ borderColor: "#2a2a2a" }}>
          <SettingItem
            icon="document-text-outline"
            title="Terms of Use"
            subtitle="View terms and conditions"
            onPress={() =>
              handleOpenLink("https://example.com/terms", "Terms of Use")
            }
          />
          <SettingItem
            icon="shield-checkmark-outline"
            title="Privacy Policy"
            subtitle="View privacy policy"
            onPress={() =>
              handleOpenLink("https://example.com/privacy", "Privacy Policy")
            }
          />
        </View>

        {/* Support Section */}
        <View className="px-6 pt-8 pb-3">
          <Text
            className="text-gray-500 text-xs tracking-widest mb-3"
            style={{ fontFamily: "monospace", letterSpacing: 2 }}
          >
            SUPPORT
          </Text>
        </View>

        <View className="border-t" style={{ borderColor: "#2a2a2a" }}>
          <SettingItem
            icon="mail-outline"
            title="Contact Support"
            subtitle="Get help and report issues"
            onPress={() =>
              handleOpenLink("mailto:support@3l3vat3.com", "Contact Support")
            }
          />
        </View>

        {/* Danger Zone */}
        <View className="px-6 pt-8 pb-3">
          <Text
            className="text-xs tracking-widest mb-3"
            style={{ fontFamily: "monospace", letterSpacing: 2, color: "#EF4444" }}
          >
            DANGER ZONE
          </Text>
        </View>

        <View className="border-t" style={{ borderColor: "#2a2a2a" }}>
          <SettingItem
            icon="trash-outline"
            title="Reset App Data"
            subtitle="Clear all settings and data"
            onPress={handleResetAppData}
            showChevron={false}
            destructive={true}
          />
        </View>

        {/* Footer */}
        <View className="px-6 pt-8 pb-4">
          <View
            className="border-t pt-4"
            style={{ borderColor: "#222" }}
          >
            <Text
              className="text-gray-600 text-xs tracking-widest text-center mb-2"
              style={{ fontFamily: "monospace", letterSpacing: 2 }}
            >
              TE-001 FIRMWARE Rev. 3L3VAT3
            </Text>
            <Text
              className="text-gray-800 text-xs tracking-wider text-center"
              style={{ fontFamily: "monospace" }}
            >
              2025-ALPHA ENGINE
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};
