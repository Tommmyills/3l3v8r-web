import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useAppStore, AudioMode } from "../state/appStore";
import { useProfileStore } from "../state/profileStore";

interface ProfileScreenProps {
  onClose: () => void;
}

const getModeColors = (mode: AudioMode) => {
  switch (mode) {
    case "FOCUS":
      return { accent: "#FF9A5A", glow: "#FF9A5A" };
    case "STUDY":
      return { accent: "#5FD4F4", glow: "#5FD4F4" };
    case "CHILL":
      return { accent: "#A78BFA", glow: "#A78BFA" };
    case "FLOW":
      return { accent: "#5EEAD4", glow: "#5EEAD4" };
    case "DEEP":
      return { accent: "#F87171", glow: "#F87171" };
  }
};

// Avatar component with gradient backgrounds
const Avatar: React.FC<{ avatar: string; size?: number; selected?: boolean; accent?: string }> = ({
  avatar,
  size = 80,
  selected = false,
  accent = "#5FD4F4",
}) => {
  const avatarConfigs = {
    avatar1: {
      gradient: ["#FF6B6B", "#FF8E53"] as const,
      icon: "person" as const,
      label: "CLASSIC",
    },
    avatar2: {
      gradient: ["#4FACFE", "#00F2FE"] as const,
      icon: "flash" as const,
      label: "ENERGY",
    },
    avatar3: {
      gradient: ["#43E97B", "#38F9D7"] as const,
      icon: "leaf" as const,
      label: "FOCUS",
    },
    avatar4: {
      gradient: ["#FA709A", "#FEE140"] as const,
      icon: "musical-notes" as const,
      label: "VIBES",
    },
    avatar5: {
      gradient: ["#A18CD1", "#FBC2EB"] as const,
      icon: "bulb" as const,
      label: "INSIGHT",
    },
  };

  const config = avatarConfigs[avatar as keyof typeof avatarConfigs] || avatarConfigs.avatar1;

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        overflow: "hidden",
        borderWidth: selected ? 3 : 0,
        borderColor: accent,
        shadowColor: selected ? accent : "transparent",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: selected ? 0.6 : 0,
        shadowRadius: 12,
      }}
    >
      <LinearGradient
        colors={config.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name={config.icon} size={size * 0.5} color="#FFF" />
      </LinearGradient>
    </View>
  );
};

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ onClose }) => {
  const insets = useSafeAreaInsets();
  const audioMode = useAppStore((s) => s.audioMode);
  const sessionNotes = useAppStore((s) => s.sessionNotes);
  const modeColors = getModeColors(audioMode);

  const profile = useProfileStore((s) => s.profile);
  const isProfileSetup = useProfileStore((s) => s.isProfileSetup);
  const createProfile = useProfileStore((s) => s.createProfile);
  const updateProfile = useProfileStore((s) => s.updateProfile);
  const saveNotesToProfile = useProfileStore((s) => s.saveNotesToProfile);
  const updateStreak = useProfileStore((s) => s.updateStreak);
  const resetProfile = useProfileStore((s) => s.resetProfile);

  const [isEditing, setIsEditing] = useState(!isProfileSetup);
  const [name, setName] = useState(profile?.name || "");
  const [selectedAvatar, setSelectedAvatar] = useState(profile?.avatar || "avatar1");

  const avatarIds = ["avatar1", "avatar2", "avatar3", "avatar4", "avatar5"];

  useEffect(() => {
    // Update streak when screen loads
    if (profile) {
      updateStreak();
    }
  }, []);

  const handleSaveProfile = () => {
    if (!name.trim()) {
      Alert.alert("Name Required", "Please enter your name");
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    if (!isProfileSetup) {
      createProfile(name.trim(), selectedAvatar);
    } else {
      updateProfile({ name: name.trim(), avatar: selectedAvatar });
    }

    setIsEditing(false);
  };

  const handleSaveSessionNotes = () => {
    if (sessionNotes.length === 0) {
      Alert.alert("No Notes", "You do not have any session notes to save");
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    saveNotesToProfile(sessionNotes);
    Alert.alert("Saved!", `${sessionNotes.length} notes saved to your profile`);
  };

  const handleResetProfile = () => {
    Alert.alert(
      "Reset Profile",
      "Are you sure you want to reset your entire profile? This will delete all saved mixes, notes, and streak data.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            resetProfile();
            setName("");
            setSelectedAvatar("avatar1");
            setIsEditing(true);
          },
        },
      ]
    );
  };

  return (
    <LinearGradient
      colors={["#0A0E1A", "#1A0A2E", "#0D0221"]}
      locations={[0, 0.5, 1]}
      className="flex-1"
      style={{ paddingTop: insets.top }}
    >
      {/* Header */}
      <View
        className="px-6 py-4 border-b flex-row items-center justify-between"
        style={{
          borderColor: "rgba(255,255,255,0.08)",
          backgroundColor: "rgba(0,0,0,0.3)",
        }}
      >
        <View className="flex-row items-center" style={{ gap: 12 }}>
          <Pressable
            onPress={() => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              onClose();
            }}
          >
            <Ionicons name="arrow-back" size={22} color={modeColors.accent} />
          </Pressable>
          <View className="flex-row items-center" style={{ gap: 8 }}>
            <Ionicons name="person-circle" size={20} color={modeColors.accent} />
            <Text
              className="text-lg font-bold tracking-widest"
              style={{ fontFamily: "monospace", color: modeColors.accent }}
            >
              PROFILE
            </Text>
          </View>
        </View>
        {!isEditing && profile && (
          <Pressable
            onPress={() => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              setIsEditing(true);
              setName(profile.name);
              setSelectedAvatar(profile.avatar);
            }}
            className="border px-3 py-1.5 rounded-xl"
            style={{
              borderColor: modeColors.accent,
              backgroundColor: `${modeColors.accent}20`,
            }}
          >
            <Text
              className="text-xs font-bold tracking-wider"
              style={{ fontFamily: "monospace", color: modeColors.accent }}
            >
              EDIT
            </Text>
          </Pressable>
        )}
      </View>

      <ScrollView
        className="flex-1 px-6"
        contentContainerStyle={{ paddingTop: 20, paddingBottom: insets.bottom + 20 }}
        showsVerticalScrollIndicator={false}
      >
        {isEditing ? (
          // Profile Setup/Edit Mode
          <View>
            {/* Avatar Selection */}
            <View className="mb-6">
              <Text
                className="text-gray-400 text-xs mb-3 tracking-wider"
                style={{ fontFamily: "monospace" }}
              >
                SELECT AVATAR:
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 16 }}
              >
                {avatarIds.map((avatarId) => (
                  <Pressable
                    key={avatarId}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setSelectedAvatar(avatarId);
                    }}
                  >
                    <Avatar
                      avatar={avatarId}
                      size={90}
                      selected={selectedAvatar === avatarId}
                      accent={modeColors.accent}
                    />
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            {/* Name Input */}
            <View className="mb-6">
              <Text
                className="text-gray-400 text-xs mb-2 tracking-wider"
                style={{ fontFamily: "monospace" }}
              >
                YOUR NAME:
              </Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Enter your name..."
                placeholderTextColor="#555"
                className="bg-black border px-4 py-3 text-white text-sm rounded-2xl"
                style={{
                  fontFamily: "monospace",
                  borderColor: "rgba(255,255,255,0.15)",
                  backgroundColor: "rgba(0,0,0,0.6)",
                }}
                autoCapitalize="words"
                maxLength={30}
              />
            </View>

            {/* Save Button */}
            <Pressable
              onPress={handleSaveProfile}
              className="border py-3 rounded-2xl"
              style={{
                borderColor: modeColors.accent,
                backgroundColor: `${modeColors.accent}20`,
                shadowColor: modeColors.glow,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.4,
                shadowRadius: 10,
              }}
            >
              <Text
                className="font-bold text-sm text-center tracking-widest"
                style={{ fontFamily: "monospace", color: modeColors.accent }}
              >
                {isProfileSetup ? "SAVE CHANGES" : "CREATE PROFILE"}
              </Text>
            </Pressable>
          </View>
        ) : profile ? (
          // Profile Display Mode
          <View>
            {/* Avatar and Name */}
            <View className="items-center mb-8">
              <Avatar avatar={profile.avatar} size={120} accent={modeColors.accent} />
              <Text
                className="text-white text-2xl font-bold mt-4"
                style={{ fontFamily: "monospace", letterSpacing: 2 }}
              >
                {profile.name}
              </Text>
              <Text
                className="text-gray-500 text-xs mt-1"
                style={{ fontFamily: "monospace" }}
              >
                MEMBER SINCE {new Date(profile.createdAt).toLocaleDateString()}
              </Text>
            </View>

            {/* Stats Grid */}
            <View className="flex-row flex-wrap mb-6" style={{ gap: 12 }}>
              {/* Daily Streak */}
              <View
                className="flex-1 border rounded-3xl p-4"
                style={{
                  borderColor: "rgba(255,255,255,0.08)",
                  backgroundColor: "rgba(10,10,10,0.6)",
                  minWidth: "45%",
                }}
              >
                <View className="flex-row items-center mb-2" style={{ gap: 6 }}>
                  <Ionicons name="flame" size={20} color="#FF9A5A" />
                  <Text
                    className="text-gray-400 text-xs tracking-wider"
                    style={{ fontFamily: "monospace" }}
                  >
                    STREAK
                  </Text>
                </View>
                <Text
                  className="text-white text-3xl font-bold"
                  style={{ fontFamily: "monospace" }}
                >
                  {profile.dailyStreak}
                </Text>
                <Text
                  className="text-gray-600 text-xs"
                  style={{ fontFamily: "monospace" }}
                >
                  {profile.dailyStreak === 1 ? "DAY" : "DAYS"}
                </Text>
              </View>

              {/* Total Sessions */}
              <View
                className="flex-1 border rounded-3xl p-4"
                style={{
                  borderColor: "rgba(255,255,255,0.08)",
                  backgroundColor: "rgba(10,10,10,0.6)",
                  minWidth: "45%",
                }}
              >
                <View className="flex-row items-center mb-2" style={{ gap: 6 }}>
                  <Ionicons name="calendar" size={20} color="#5FD4F4" />
                  <Text
                    className="text-gray-400 text-xs tracking-wider"
                    style={{ fontFamily: "monospace" }}
                  >
                    SESSIONS
                  </Text>
                </View>
                <Text
                  className="text-white text-3xl font-bold"
                  style={{ fontFamily: "monospace" }}
                >
                  {profile.totalSessions}
                </Text>
                <Text
                  className="text-gray-600 text-xs"
                  style={{ fontFamily: "monospace" }}
                >
                  TOTAL
                </Text>
              </View>

              {/* Saved Notes */}
              <View
                className="flex-1 border rounded-3xl p-4"
                style={{
                  borderColor: "rgba(255,255,255,0.08)",
                  backgroundColor: "rgba(10,10,10,0.6)",
                  minWidth: "45%",
                }}
              >
                <View className="flex-row items-center mb-2" style={{ gap: 6 }}>
                  <Ionicons name="document-text" size={20} color="#A78BFA" />
                  <Text
                    className="text-gray-400 text-xs tracking-wider"
                    style={{ fontFamily: "monospace" }}
                  >
                    NOTES
                  </Text>
                </View>
                <Text
                  className="text-white text-3xl font-bold"
                  style={{ fontFamily: "monospace" }}
                >
                  {profile.allNotes.length}
                </Text>
                <Text
                  className="text-gray-600 text-xs"
                  style={{ fontFamily: "monospace" }}
                >
                  SAVED
                </Text>
              </View>

              {/* Saved Mixes */}
              <View
                className="flex-1 border rounded-3xl p-4"
                style={{
                  borderColor: "rgba(255,255,255,0.08)",
                  backgroundColor: "rgba(10,10,10,0.6)",
                  minWidth: "45%",
                }}
              >
                <View className="flex-row items-center mb-2" style={{ gap: 6 }}>
                  <Ionicons name="musical-notes" size={20} color="#5EEAD4" />
                  <Text
                    className="text-gray-400 text-xs tracking-wider"
                    style={{ fontFamily: "monospace" }}
                  >
                    MIXES
                  </Text>
                </View>
                <Text
                  className="text-white text-3xl font-bold"
                  style={{ fontFamily: "monospace" }}
                >
                  {profile.savedMixes.length}
                </Text>
                <Text
                  className="text-gray-600 text-xs"
                  style={{ fontFamily: "monospace" }}
                >
                  SAVED
                </Text>
              </View>
            </View>

            {/* Save Session Notes Button */}
            {sessionNotes.length > 0 && (
              <Pressable
                onPress={handleSaveSessionNotes}
                className="border py-3 px-4 rounded-2xl mb-4"
                style={{
                  borderColor: modeColors.accent,
                  backgroundColor: `${modeColors.accent}15`,
                  shadowColor: modeColors.glow,
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                }}
              >
                <View className="flex-row items-center justify-center" style={{ gap: 8 }}>
                  <Ionicons name="save" size={16} color={modeColors.accent} />
                  <Text
                    className="font-bold text-sm tracking-wider"
                    style={{ fontFamily: "monospace", color: modeColors.accent }}
                  >
                    SAVE SESSION NOTES ({sessionNotes.length})
                  </Text>
                </View>
              </Pressable>
            )}

            {/* Reset Profile */}
            <Pressable
              onPress={handleResetProfile}
              className="border py-3 px-4 rounded-2xl mt-6"
              style={{
                borderColor: "#F87171",
                backgroundColor: "rgba(248,113,113,0.1)",
              }}
            >
              <Text
                className="font-bold text-sm text-center tracking-wider"
                style={{ fontFamily: "monospace", color: "#F87171" }}
              >
                RESET PROFILE
              </Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
    </LinearGradient>
  );
};
