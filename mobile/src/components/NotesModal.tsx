import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  Keyboard,
  TouchableWithoutFeedback,
  ActivityIndicator,
  ScrollView,
  Platform,
} from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useAppStore, AudioMode } from "../state/appStore";
import { getOpenAIChatResponse } from "../api/chat-service";

interface NotesModalProps {
  onClose: () => void;
  videoTitle?: string;
  videoTimestamp?: string;
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

export const NotesModal: React.FC<NotesModalProps> = ({
  onClose,
  videoTitle,
  videoTimestamp,
}) => {
  const audioMode = useAppStore((s) => s.audioMode);
  const addSessionNote = useAppStore((s) => s.addSessionNote);
  const modeColors = getModeColors(audioMode);

  const [noteInput, setNoteInput] = useState("");
  const [isExpanding, setIsExpanding] = useState(false);
  const [expandedPreview, setExpandedPreview] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  const handleExpandNote = async () => {
    if (!noteInput.trim()) return;

    setIsExpanding(true);
    Keyboard.dismiss();

    try {
      const prompt = `You are a study assistant helping organize learning notes. The user wrote this quick note while watching a tutorial:

"${noteInput.trim()}"

Expand this into clear, organized bullet points or a brief paragraph. Keep it concise (2-4 bullet points or 1-2 sentences). Focus on the key concept. Make it easy to review later.`;

      const response = await getOpenAIChatResponse(prompt);
      setExpandedPreview(response.content);
      setShowPreview(true);
    } catch (error) {
      setExpandedPreview("Could not expand note. Please try again.");
      setShowPreview(true);
    } finally {
      setIsExpanding(false);
    }
  };

  const handleSaveNote = () => {
    if (!expandedPreview) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const note = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      rawInput: noteInput.trim(),
      expandedNote: expandedPreview,
      videoTitle,
      videoTimestamp,
    };

    addSessionNote(note);
    onClose();
  };

  const handleQuickSave = () => {
    if (!noteInput.trim()) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const note = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      rawInput: noteInput.trim(),
      expandedNote: noteInput.trim(),
      videoTitle,
      videoTimestamp,
    };

    addSessionNote(note);
    onClose();
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View
        className="absolute inset-0 items-center justify-center px-6"
        style={{ backgroundColor: "rgba(0,0,0,0.95)", zIndex: 1000 }}
      >
        <BlurView
          intensity={40}
          tint="dark"
          className="w-full max-w-md rounded-3xl overflow-hidden"
          style={{
            borderWidth: 1,
            borderColor: modeColors.accent,
            backgroundColor: "rgba(10,10,10,0.6)",
            shadowColor: modeColors.glow,
            shadowOffset: { width: 0, height: 12 },
            shadowOpacity: 0.4,
            shadowRadius: 24,
            maxHeight: "80%",
          }}
        >
          <View
            className="w-full overflow-hidden"
            style={{ backgroundColor: "transparent" }}
          >
            {/* Header */}
            <View
              className="px-4 py-3 border-b flex-row items-center justify-between"
              style={{
                backgroundColor: "rgba(0,0,0,0.4)",
                borderColor: `${modeColors.accent}40`,
              }}
            >
              <View className="flex-row items-center" style={{ gap: 8 }}>
                <Ionicons name="create-outline" size={18} color={modeColors.accent} />
                <Text
                  className="text-sm font-bold tracking-widest"
                  style={{ fontFamily: "monospace", color: modeColors.accent }}
                >
                  INSTANT NOTES
                </Text>
              </View>
              <Pressable
                onPress={() => {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  onClose();
                }}
              >
                <Ionicons name="close" size={22} color={modeColors.accent} />
              </Pressable>
            </View>

            <ScrollView
              className="max-h-96"
              contentContainerStyle={{ padding: 20 }}
              showsVerticalScrollIndicator={true}
              indicatorStyle="white"
              persistentScrollbar={true}
            >
              {/* Video Context */}
              {videoTitle && (
                <View
                  className="mb-4 p-3 border rounded-2xl"
                  style={{
                    borderColor: "rgba(255,255,255,0.1)",
                    backgroundColor: "rgba(0,0,0,0.3)",
                  }}
                >
                  <Text
                    className="text-gray-400 text-xs mb-1"
                    style={{ fontFamily: "monospace" }}
                  >
                    VIDEO:
                  </Text>
                  <Text
                    className="text-white text-xs"
                    style={{ fontFamily: "monospace" }}
                    numberOfLines={2}
                  >
                    {videoTitle}
                  </Text>
                  {videoTimestamp && (
                    <Text
                      className="text-gray-500 text-xs mt-1"
                      style={{ fontFamily: "monospace" }}
                    >
                      @ {videoTimestamp}
                    </Text>
                  )}
                </View>
              )}

              {/* Input Field */}
              <View className="mb-4">
                <Text
                  className="text-gray-400 text-xs mb-2 tracking-wider"
                  style={{ fontFamily: "monospace" }}
                >
                  QUICK NOTE:
                </Text>
                <TextInput
                  value={noteInput}
                  onChangeText={setNoteInput}
                  placeholder="Type a quick thought or concept..."
                  placeholderTextColor="#555"
                  className="bg-black border px-4 py-3 text-white text-sm rounded-2xl"
                  style={{
                    fontFamily: "monospace",
                    borderColor: "rgba(255,255,255,0.15)",
                    backgroundColor: "rgba(0,0,0,0.6)",
                    minHeight: 80,
                    textAlignVertical: "top",
                  }}
                  multiline
                  autoFocus
                  maxLength={200}
                />
                <Text
                  className="text-gray-600 text-xs mt-1 text-right"
                  style={{ fontFamily: "monospace" }}
                >
                  {noteInput.length}/200
                </Text>
              </View>

              {/* Expanded Preview */}
              {showPreview && expandedPreview && (
                <View className="mb-4">
                  <Text
                    className="text-xs mb-2 tracking-wider"
                    style={{ fontFamily: "monospace", color: modeColors.accent }}
                  >
                    AI EXPANDED:
                  </Text>
                  <View
                    className="p-4 border rounded-2xl"
                    style={{
                      borderColor: `${modeColors.accent}40`,
                      backgroundColor: `${modeColors.accent}10`,
                    }}
                  >
                    <Text
                      className="text-white text-sm"
                      style={{ fontFamily: "monospace", lineHeight: 20 }}
                      selectable={true}
                      selectionColor={Platform.OS === "android" ? `${modeColors.accent}80` : undefined}
                    >
                      {expandedPreview}
                    </Text>
                  </View>
                </View>
              )}

              {/* Action Buttons */}
              <View className="flex-row" style={{ gap: 10 }}>
                {!showPreview ? (
                  <>
                    <Pressable
                      onPress={handleExpandNote}
                      disabled={isExpanding || !noteInput.trim()}
                      className="flex-1 border py-3 rounded-2xl"
                      style={{
                        borderColor: modeColors.accent,
                        backgroundColor: `${modeColors.accent}20`,
                        shadowColor: modeColors.glow,
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.4,
                        shadowRadius: 10,
                        opacity: isExpanding || !noteInput.trim() ? 0.5 : 1,
                      }}
                    >
                      {isExpanding ? (
                        <ActivityIndicator size="small" color={modeColors.accent} />
                      ) : (
                        <Text
                          className="font-bold text-xs text-center tracking-widest"
                          style={{ fontFamily: "monospace", color: modeColors.accent }}
                        >
                          EXPAND WITH AI
                        </Text>
                      )}
                    </Pressable>
                    <Pressable
                      onPress={handleQuickSave}
                      disabled={!noteInput.trim()}
                      className="border px-4 py-3 rounded-2xl"
                      style={{
                        borderColor: "rgba(255,255,255,0.2)",
                        backgroundColor: "rgba(0,0,0,0.4)",
                        opacity: !noteInput.trim() ? 0.5 : 1,
                      }}
                    >
                      <Text
                        className="font-bold text-xs text-center tracking-widest"
                        style={{ fontFamily: "monospace", color: "#999" }}
                      >
                        SAVE AS-IS
                      </Text>
                    </Pressable>
                  </>
                ) : (
                  <>
                    <Pressable
                      onPress={handleSaveNote}
                      className="flex-1 border py-3 rounded-2xl"
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
                        className="font-bold text-xs text-center tracking-widest"
                        style={{ fontFamily: "monospace", color: modeColors.accent }}
                      >
                        SAVE NOTE
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        setShowPreview(false);
                        setExpandedPreview("");
                      }}
                      className="border px-4 py-3 rounded-2xl"
                      style={{
                        borderColor: "rgba(255,255,255,0.2)",
                        backgroundColor: "rgba(0,0,0,0.4)",
                      }}
                    >
                      <Text
                        className="font-bold text-xs text-center tracking-widest"
                        style={{ fontFamily: "monospace", color: "#999" }}
                      >
                        RE-EDIT
                      </Text>
                    </Pressable>
                  </>
                )}
              </View>
            </ScrollView>
          </View>
        </BlurView>
      </View>
    </TouchableWithoutFeedback>
  );
};
