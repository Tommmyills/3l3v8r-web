import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Image,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useAppStore, AudioMode } from "../state/appStore";
import { useFavoritesStore, FavoriteVideo } from "../state/favoritesStore";

interface FavoritesScreenProps {
  onClose: () => void;
  onSelectVideo: (videoId: string, title: string) => void;
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

const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp);
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  return `${month}/${day}`;
};

const formatTimeAgo = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return formatDate(timestamp);
};

type TabType = "favorites" | "recent";

export const FavoritesScreen: React.FC<FavoritesScreenProps> = ({
  onClose,
  onSelectVideo,
}) => {
  const insets = useSafeAreaInsets();
  const audioMode = useAppStore((s) => s.audioMode);
  const modeColors = getModeColors(audioMode);

  const favorites = useFavoritesStore((s) => s.favorites);
  const recentlyWatched = useFavoritesStore((s) => s.recentlyWatched);
  const removeFavorite = useFavoritesStore((s) => s.removeFavorite);
  const clearRecentlyWatched = useFavoritesStore((s) => s.clearRecentlyWatched);
  const clearAllFavorites = useFavoritesStore((s) => s.clearAllFavorites);

  const [activeTab, setActiveTab] = useState<TabType>("favorites");

  const handleSelectVideo = (video: FavoriteVideo) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSelectVideo(video.videoId, video.title);
    onClose();
  };

  const handleRemoveFavorite = (videoId: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    removeFavorite(videoId);
  };

  const handleClearRecent = () => {
    Alert.alert(
      "Clear History",
      "Are you sure you want to clear your watch history?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            clearRecentlyWatched();
          },
        },
      ]
    );
  };

  const handleClearFavorites = () => {
    Alert.alert(
      "Clear All Favorites",
      "Are you sure you want to remove all favorites? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear All",
          style: "destructive",
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            clearAllFavorites();
          },
        },
      ]
    );
  };

  const currentList = activeTab === "favorites" ? favorites : recentlyWatched;

  const renderVideoCard = (video: FavoriteVideo) => (
    <Pressable
      key={video.id}
      onPress={() => handleSelectVideo(video)}
      className="border rounded-2xl overflow-hidden mb-3"
      style={{
        borderColor: "rgba(255,255,255,0.08)",
        backgroundColor: "rgba(10,10,10,0.6)",
      }}
    >
      <View className="flex-row">
        {/* Thumbnail */}
        <View
          className="relative"
          style={{ width: 140, height: 80 }}
        >
          <Image
            source={{ uri: video.thumbnail }}
            style={{ width: 140, height: 80, backgroundColor: "#1a1a1a" }}
            resizeMode="cover"
          />
          {/* Play overlay */}
          <View
            className="absolute inset-0 items-center justify-center"
            style={{ backgroundColor: "rgba(0,0,0,0.3)" }}
          >
            <View
              className="w-8 h-8 rounded-full items-center justify-center"
              style={{ backgroundColor: modeColors.accent }}
            >
              <Ionicons name="play" size={16} color="#000" />
            </View>
          </View>
        </View>

        {/* Info */}
        <View className="flex-1 p-3 justify-between">
          <Text
            className="text-white text-xs font-medium mb-1"
            style={{ fontFamily: "monospace", lineHeight: 16 }}
            numberOfLines={2}
          >
            {video.title}
          </Text>
          <View className="flex-row items-center justify-between">
            <Text
              className="text-gray-500 text-xs"
              style={{ fontFamily: "monospace", fontSize: 9 }}
              numberOfLines={1}
            >
              {video.channelTitle}
            </Text>
            <Text
              className="text-gray-600 text-xs"
              style={{ fontFamily: "monospace", fontSize: 9 }}
            >
              {formatTimeAgo(video.savedAt)}
            </Text>
          </View>
        </View>

        {/* Actions */}
        {activeTab === "favorites" && (
          <Pressable
            onPress={() => handleRemoveFavorite(video.videoId)}
            className="px-3 items-center justify-center"
            style={{ borderLeftWidth: 1, borderLeftColor: "rgba(255,255,255,0.05)" }}
          >
            <Ionicons name="heart" size={18} color={modeColors.accent} />
          </Pressable>
        )}
      </View>
    </Pressable>
  );

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
            <Ionicons name="heart" size={20} color={modeColors.accent} />
            <Text
              className="text-lg font-bold tracking-widest"
              style={{ fontFamily: "monospace", color: modeColors.accent }}
            >
              FAVORITES
            </Text>
          </View>
        </View>
        <View
          className="px-3 py-1.5 border rounded-xl"
          style={{
            borderColor: modeColors.accent,
            backgroundColor: `${modeColors.accent}20`,
          }}
        >
          <Text
            className="text-xs font-bold"
            style={{ fontFamily: "monospace", color: modeColors.accent }}
          >
            {favorites.length}
          </Text>
        </View>
      </View>

      {/* Tab Switcher */}
      <View
        className="flex-row mx-6 mt-4 p-1 rounded-2xl"
        style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
      >
        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            setActiveTab("favorites");
          }}
          className="flex-1 py-2.5 rounded-xl items-center"
          style={{
            backgroundColor: activeTab === "favorites" ? modeColors.accent : "transparent",
          }}
        >
          <View className="flex-row items-center" style={{ gap: 6 }}>
            <Ionicons
              name="heart"
              size={14}
              color={activeTab === "favorites" ? "#000" : "#666"}
            />
            <Text
              className="text-xs font-bold tracking-wider"
              style={{
                fontFamily: "monospace",
                color: activeTab === "favorites" ? "#000" : "#666",
              }}
            >
              FAVORITES
            </Text>
          </View>
        </Pressable>
        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            setActiveTab("recent");
          }}
          className="flex-1 py-2.5 rounded-xl items-center"
          style={{
            backgroundColor: activeTab === "recent" ? modeColors.accent : "transparent",
          }}
        >
          <View className="flex-row items-center" style={{ gap: 6 }}>
            <Ionicons
              name="time"
              size={14}
              color={activeTab === "recent" ? "#000" : "#666"}
            />
            <Text
              className="text-xs font-bold tracking-wider"
              style={{
                fontFamily: "monospace",
                color: activeTab === "recent" ? "#000" : "#666",
              }}
            >
              RECENT
            </Text>
          </View>
        </Pressable>
      </View>

      {/* Clear Button */}
      {currentList.length > 0 && (
        <View className="px-6 pt-4">
          <Pressable
            onPress={activeTab === "favorites" ? handleClearFavorites : handleClearRecent}
            className="border py-2.5 px-4 rounded-2xl self-end"
            style={{
              borderColor: "#F87171",
              backgroundColor: "rgba(248,113,113,0.1)",
            }}
          >
            <Text
              className="text-xs font-semibold tracking-wider"
              style={{ fontFamily: "monospace", color: "#F87171" }}
            >
              {activeTab === "favorites" ? "CLEAR ALL" : "CLEAR HISTORY"}
            </Text>
          </Pressable>
        </View>
      )}

      {/* Video List */}
      <ScrollView
        className="flex-1 px-6"
        contentContainerStyle={{ paddingTop: 16, paddingBottom: insets.bottom + 20 }}
        showsVerticalScrollIndicator={true}
        indicatorStyle="white"
      >
        {currentList.length === 0 ? (
          <View className="flex-1 items-center justify-center py-20">
            <View
              className="border border-dashed px-8 py-8 rounded-3xl"
              style={{
                borderColor: "rgba(255,255,255,0.2)",
                backgroundColor: "rgba(0,0,0,0.3)",
              }}
            >
              <Ionicons
                name={activeTab === "favorites" ? "heart-outline" : "time-outline"}
                size={48}
                color="#333"
                style={{ alignSelf: "center", marginBottom: 16 }}
              />
              <Text
                className="text-gray-600 text-xs font-bold text-center tracking-widest mb-2"
                style={{ fontFamily: "monospace" }}
              >
                {activeTab === "favorites" ? "NO FAVORITES YET" : "NO RECENT VIDEOS"}
              </Text>
              <Text
                className="text-gray-700 text-xs text-center"
                style={{ fontFamily: "monospace", fontSize: 10, lineHeight: 16 }}
              >
                {activeTab === "favorites"
                  ? "Tap the heart icon on any video to save it here for quick access"
                  : "Videos you watch will appear here for easy replay"}
              </Text>
            </View>
          </View>
        ) : (
          <View>
            {currentList.map(renderVideoCard)}
          </View>
        )}
      </ScrollView>
    </LinearGradient>
  );
};
