import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Alert,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useAppStore, AudioMode } from "../state/appStore";

interface NotesScreenProps {
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

const formatTimestamp = (timestamp: number): string => {
  const date = new Date(timestamp);
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
};

const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp);
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  return `${month}/${day}`;
};

export const NotesScreen: React.FC<NotesScreenProps> = ({ onClose }) => {
  const insets = useSafeAreaInsets();
  const audioMode = useAppStore((s) => s.audioMode);
  const sessionNotes = useAppStore((s) => s.sessionNotes);
  const deleteSessionNote = useAppStore((s) => s.deleteSessionNote);
  const clearAllNotes = useAppStore((s) => s.clearAllNotes);
  const modeColors = getModeColors(audioMode);

  const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);

  const handleDeleteNote = (id: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    deleteSessionNote(id);
  };

  const handleClearAll = () => {
    Alert.alert(
      "Clear All Notes",
      "Are you sure you want to delete all session notes? This cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Clear All",
          style: "destructive",
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            clearAllNotes();
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
            <Ionicons name="document-text" size={20} color={modeColors.accent} />
            <Text
              className="text-lg font-bold tracking-widest"
              style={{ fontFamily: "monospace", color: modeColors.accent }}
            >
              SESSION NOTES
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
            {sessionNotes.length}
          </Text>
        </View>
      </View>

      {/* Clear All Button */}
      {sessionNotes.length > 0 && (
        <View className="px-6 pt-4">
          <Pressable
            onPress={handleClearAll}
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
              CLEAR ALL
            </Text>
          </Pressable>
        </View>
      )}

      {/* Notes List */}
      <ScrollView
        className="flex-1 px-6"
        contentContainerStyle={{ paddingTop: 16, paddingBottom: insets.bottom + 20 }}
        showsVerticalScrollIndicator={true}
        indicatorStyle="white"
        persistentScrollbar={true}
      >
        {sessionNotes.length === 0 ? (
          <View className="flex-1 items-center justify-center py-20">
            <View
              className="border border-dashed px-8 py-8 rounded-3xl"
              style={{
                borderColor: "rgba(255,255,255,0.2)",
                backgroundColor: "rgba(0,0,0,0.3)",
              }}
            >
              <Ionicons
                name="document-text-outline"
                size={48}
                color="#333"
                style={{ alignSelf: "center", marginBottom: 16 }}
              />
              <Text
                className="text-gray-600 text-xs font-bold text-center tracking-widest mb-2"
                style={{ fontFamily: "monospace" }}
              >
                NO NOTES YET
              </Text>
              <Text
                className="text-gray-700 text-xs text-center"
                style={{ fontFamily: "monospace", fontSize: 10, lineHeight: 16 }}
              >
                Use the Notes button while watching tutorials to capture key concepts
              </Text>
            </View>
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            {sessionNotes.map((note) => {
              const isExpanded = expandedNoteId === note.id;
              return (
                <View
                  key={note.id}
                  className="border rounded-3xl overflow-hidden"
                  style={{
                    borderColor: "rgba(255,255,255,0.08)",
                    backgroundColor: "rgba(10,10,10,0.6)",
                  }}
                >
                  {/* Note Header */}
                  <Pressable
                    onPress={() => {
                      Haptics.selectionAsync();
                      setExpandedNoteId(isExpanded ? null : note.id);
                    }}
                    className="p-4 border-b"
                    style={{
                      borderColor: "rgba(255,255,255,0.05)",
                      backgroundColor: "rgba(0,0,0,0.3)",
                    }}
                  >
                    <View className="flex-row items-start justify-between mb-2">
                      <View className="flex-1 mr-3">
                        <Text
                          className="text-white text-sm mb-1"
                          style={{ fontFamily: "monospace", lineHeight: 18 }}
                          numberOfLines={isExpanded ? undefined : 2}
                          selectable={isExpanded}
                          selectionColor={Platform.OS === "android" ? `${modeColors.accent}80` : undefined}
                        >
                          {note.expandedNote}
                        </Text>
                      </View>
                      <View className="flex-row items-center" style={{ gap: 8 }}>
                        <Pressable
                          onPress={() => handleDeleteNote(note.id)}
                          className="border p-1.5 rounded-lg"
                          style={{
                            borderColor: "rgba(248,113,113,0.3)",
                            backgroundColor: "rgba(248,113,113,0.1)",
                          }}
                        >
                          <Ionicons name="trash-outline" size={14} color="#F87171" />
                        </Pressable>
                        <Ionicons
                          name={isExpanded ? "chevron-up" : "chevron-down"}
                          size={18}
                          color="#666"
                        />
                      </View>
                    </View>

                    <View className="flex-row items-center flex-wrap" style={{ gap: 8 }}>
                      <View className="flex-row items-center" style={{ gap: 4 }}>
                        <Ionicons name="time-outline" size={12} color="#666" />
                        <Text
                          className="text-gray-500 text-xs"
                          style={{ fontFamily: "monospace" }}
                        >
                          {formatDate(note.timestamp)} {formatTimestamp(note.timestamp)}
                        </Text>
                      </View>
                      {note.videoTimestamp && (
                        <View
                          className="px-2 py-0.5 border rounded"
                          style={{
                            borderColor: "rgba(255,255,255,0.1)",
                            backgroundColor: "rgba(0,0,0,0.3)",
                          }}
                        >
                          <Text
                            className="text-gray-500 text-xs"
                            style={{ fontFamily: "monospace", fontSize: 9 }}
                          >
                            @ {note.videoTimestamp}
                          </Text>
                        </View>
                      )}
                    </View>
                  </Pressable>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <View className="p-4" style={{ backgroundColor: "rgba(0,0,0,0.2)" }}>
                      {note.rawInput !== note.expandedNote && (
                        <View className="mb-3">
                          <Text
                            className="text-gray-500 text-xs mb-1.5 tracking-wider"
                            style={{ fontFamily: "monospace" }}
                          >
                            ORIGINAL INPUT:
                          </Text>
                          <View
                            className="p-3 border rounded-2xl"
                            style={{
                              borderColor: "rgba(255,255,255,0.1)",
                              backgroundColor: "rgba(0,0,0,0.3)",
                            }}
                          >
                            <Text
                              className="text-gray-400 text-xs italic"
                              style={{ fontFamily: "monospace", lineHeight: 16 }}
                              selectable={true}
                              selectionColor={Platform.OS === "android" ? `${modeColors.accent}80` : undefined}
                            >
                              {note.rawInput}
                            </Text>
                          </View>
                        </View>
                      )}

                      {note.videoTitle && (
                        <View>
                          <Text
                            className="text-gray-500 text-xs mb-1.5 tracking-wider"
                            style={{ fontFamily: "monospace" }}
                          >
                            VIDEO CONTEXT:
                          </Text>
                          <View
                            className="p-3 border rounded-2xl"
                            style={{
                              borderColor: "rgba(255,255,255,0.1)",
                              backgroundColor: "rgba(0,0,0,0.3)",
                            }}
                          >
                            <Text
                              className="text-gray-400 text-xs"
                              style={{ fontFamily: "monospace", lineHeight: 16 }}
                              numberOfLines={3}
                              selectable={true}
                              selectionColor={Platform.OS === "android" ? `${modeColors.accent}80` : undefined}
                            >
                              {note.videoTitle}
                            </Text>
                          </View>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </LinearGradient>
  );
};
