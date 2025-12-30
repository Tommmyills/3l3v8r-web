import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Dimensions,
  TextInput,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Clipboard from "@react-native-clipboard/clipboard";
import Animated, {
  FadeIn,
  FadeOut,
  SlideInRight,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { fetchYoutubeTranscript } from "../api/youtube-transcript";
import { generateLessonBreakdown, LessonBreakdown } from "../api/transcript-ai";
import { useLessonBreakdownStore } from "../state/actionStepsStore";
import { useAppStore } from "../state/appStore";
import { getOpenAIClient } from "../api/openai";

interface ActionStepsScreenProps {
  videoId: string;
  videoTitle?: string;
  onClose: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const ActionStepsScreen: React.FC<ActionStepsScreenProps> = ({
  videoId,
  videoTitle,
  onClose,
}) => {
  const insets = useSafeAreaInsets();
  const audioMode = useAppStore((s) => s.audioMode);
  const saveLessonBreakdown = useLessonBreakdownStore((s) => s.saveLessonBreakdown);
  const getLessonBreakdownForVideo = useLessonBreakdownStore((s) => s.getLessonBreakdownForVideo);

  // Swipe gesture values
  const { height: SCREEN_HEIGHT } = Dimensions.get("window");
  const translateY = useSharedValue(0);
  const context = useSharedValue({ y: 0 });

  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lessonBreakdown, setLessonBreakdown] = useState<LessonBreakdown | null>(null);

  // Q&A Modal State
  const [showQAModal, setShowQAModal] = useState(false);
  const [selectedStep, setSelectedStep] = useState<{ type: string; index: number; text: string } | null>(null);
  const [question, setQuestion] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [askingAI, setAskingAI] = useState(false);

  // Check if we already have cached lesson breakdown
  useEffect(() => {
    const loadLessonBreakdown = async () => {
      try {
        // Check cache first
        const cached = getLessonBreakdownForVideo(videoId);
        if (cached) {
          setLessonBreakdown(cached.lessonBreakdown);
          setLoading(false);
          return;
        }

        // Fetch transcript
        setLoading(true);
        const transcriptResult = await fetchYoutubeTranscript(videoId);

        if (!transcriptResult || !transcriptResult.segments || transcriptResult.segments.length === 0) {
          throw new Error("No transcript available for this video");
        }

        // Generate lesson breakdown
        const fullText = transcriptResult.segments.map((s) => s.text).join(" ");
        const breakdown = await generateLessonBreakdown(fullText, videoTitle);

        setLessonBreakdown(breakdown);
        saveLessonBreakdown(videoId, videoTitle, breakdown);
        setLoading(false);
      } catch (err) {
        console.error("Error loading lesson breakdown:", err);
        setError(err instanceof Error ? err.message : "Failed to load lesson breakdown");
        setLoading(false);
      }
    };

    loadLessonBreakdown();
  }, [videoId, videoTitle]);

  // Pan gesture for swipe down to dismiss
  const panGesture = Gesture.Pan()
    .onStart(() => {
      context.value = { y: translateY.value };
    })
    .onUpdate((event) => {
      // Only allow swiping down
      if (event.translationY > 0) {
        translateY.value = context.value.y + event.translationY;
      }
    })
    .onEnd((event) => {
      const dismissThreshold = SCREEN_HEIGHT * 0.3;
      const shouldDismiss = translateY.value > dismissThreshold || event.velocityY > 500;

      if (shouldDismiss) {
        translateY.value = withTiming(
          SCREEN_HEIGHT,
          { duration: 200 },
          () => {
            runOnJS(onClose)();
          }
        );
        runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Medium);
      } else {
        translateY.value = withSpring(0, {
          damping: 15,
          stiffness: 150,
        });
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const handleStepPress = (type: string, index: number, text: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedStep({ type, index, text });
    setShowQAModal(true);
    setQuestion("");
    setAiResponse("");
  };

  const askAI = async () => {
    if (!question.trim() || !selectedStep) return;

    try {
      setAskingAI(true);
      Keyboard.dismiss();

      const client = getOpenAIClient();

      const contextMessage = `The user is looking at this ${selectedStep.type}:\n"${selectedStep.text}"\n\nThey have a question about it. Please answer concisely and helpfully.`;

      const response = await client.chat.completions.create({
        model: "gpt-4o-2024-11-20",
        messages: [
          { role: "system", content: contextMessage },
          { role: "user", content: question },
        ],
        temperature: 0.7,
        max_tokens: 500,
      });

      const answer = response.choices[0].message.content || "I couldn't generate a response.";
      setAiResponse(answer);
    } catch (error) {
      console.error("Error asking AI:", error);
      setAiResponse("Sorry, I encountered an error. Please try again.");
    } finally {
      setAskingAI(false);
    }
  };

  const handleCopyAll = () => {
    if (!lessonBreakdown) return;

    let text = "";

    if (lessonBreakdown.toolsNeeded.length > 0) {
      text += "Tools Needed:\n";
      lessonBreakdown.toolsNeeded.forEach((tool: string) => {
        text += `- ${tool}\n`;
      });
      text += "\n";
    }

    if (lessonBreakdown.actionSteps.length > 0) {
      text += "Action Steps:\n";
      lessonBreakdown.actionSteps.forEach((step, index: number) => {
        text += `${index + 1}. ${step.title}: ${step.description}\n`;
      });
      text += "\n";
    }

    if (lessonBreakdown.keyLessons.length > 0) {
      text += "Key Lessons:\n";
      lessonBreakdown.keyLessons.forEach((lesson, index: number) => {
        text += `${index + 1}. ${lesson.title}: ${lesson.explanation}\n`;
      });
      text += "\n";
    }

    if (lessonBreakdown.tipsAndWarnings.length > 0) {
      text += "Tips & Warnings:\n";
      lessonBreakdown.tipsAndWarnings.forEach((tip: string) => {
        text += `- ${tip}\n`;
      });
    }

    Clipboard.setString(text);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleCopyItem = (text: string) => {
    Clipboard.setString(text);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View
        className="flex-1"
        style={[
          {
            backgroundColor: "#0E0E0E",
            paddingTop: insets.top,
          },
          animatedStyle,
        ]}
      >
        {/* Header */}
        <View className="px-6 py-4 border-b" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-1 mr-4">
              <Text
                className="text-white text-base font-bold tracking-wider mb-1"
                style={{ fontFamily: "monospace", letterSpacing: 1.5 }}
              >
                LESSON BREAKDOWN
              </Text>
              {videoTitle && (
                <Text
                  className="text-gray-400 text-xs"
                  style={{ letterSpacing: 0.3 }}
                  numberOfLines={2}
                >
                  {videoTitle}
                </Text>
              )}
            </View>
            <View className="flex-row items-center" style={{ gap: 12 }}>
              {lessonBreakdown && (
                <Pressable
                  onPress={handleCopyAll}
                  className="w-9 h-9 items-center justify-center rounded-full"
                  style={{ backgroundColor: "rgba(0,227,255,0.15)" }}
                >
                  <Ionicons name="copy-outline" size={16} color="#00E3FF" />
                </Pressable>
              )}
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onClose();
                }}
                className="w-9 h-9 items-center justify-center rounded-full"
                style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
              >
                <Ionicons name="close" size={20} color="#999" />
              </Pressable>
            </View>
          </View>

          {/* Swipe indicator */}
          <View className="items-center mt-1">
            <View
              className="w-10 h-1 rounded-full"
              style={{ backgroundColor: "rgba(255,255,255,0.15)" }}
            />
          </View>
        </View>

        {/* Content */}
        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 24,
            paddingBottom: insets.bottom + 24,
          }}
          showsVerticalScrollIndicator={true}
          indicatorStyle="white"
          persistentScrollbar={true}
        >
          {loading && (
            <View className="items-center justify-center py-20">
              <ActivityIndicator size="large" color="#00E3FF" />
              <Text
                className="text-gray-400 text-sm mt-4"
                style={{ letterSpacing: 0.5, fontFamily: "monospace" }}
              >
                Analyzing tutorial...
              </Text>
            </View>
          )}

          {error && (
            <View className="items-center justify-center py-20 px-6">
              <Ionicons name="alert-circle-outline" size={48} color="#F87171" style={{ marginBottom: 16 }} />
              <Text
                className="text-gray-300 text-base text-center mb-2"
                style={{ letterSpacing: 0.5, fontFamily: "monospace" }}
              >
                Could not generate action steps
              </Text>
              <Text
                className="text-gray-500 text-sm text-center"
                style={{ letterSpacing: 0.3 }}
              >
                {error}
              </Text>
            </View>
          )}

          {!loading && !error && lessonBreakdown && (
            <Animated.View entering={FadeIn.duration(400)}>
              {/* Tools Needed Section */}
              {lessonBreakdown.toolsNeeded.length > 0 && (
                <View className="mb-8">
                  <Text
                    className="text-lg font-bold mb-4"
                    style={{
                      color: "#00E3FF",
                      letterSpacing: 1.2,
                      fontFamily: "monospace",
                    }}
                  >
                    TOOLS NEEDED
                  </Text>
                  {lessonBreakdown.toolsNeeded.map((tool: string, index: number) => (
                    <Pressable
                      key={index}
                      onPress={() => handleCopyItem(tool)}
                      className="flex-row items-start mb-3 px-4 py-3 rounded-xl"
                      style={{
                        backgroundColor: "rgba(0,227,255,0.05)",
                        borderLeftWidth: 3,
                        borderLeftColor: "#00E3FF",
                      }}
                    >
                      <View
                        className="w-1.5 h-1.5 rounded-full mt-2 mr-3"
                        style={{ backgroundColor: "#00E3FF" }}
                      />
                      <Text
                        className="flex-1 text-white text-sm"
                        style={{ letterSpacing: 0.3, lineHeight: 20 }}
                        selectable={true}
                        selectionColor={Platform.OS === "android" ? "#00E3FF80" : undefined}
                      >
                        {tool}
                      </Text>
                      <Ionicons name="copy-outline" size={14} color="#00E3FF" style={{ marginLeft: 8, marginTop: 2 }} />
                    </Pressable>
                  ))}
                </View>
              )}

              {/* Action Steps Section */}
              {lessonBreakdown.actionSteps.length > 0 && (
                <View className="mb-8">
                  <Text
                    className="text-lg font-bold mb-4"
                    style={{
                      color: "#FFFFFF",
                      letterSpacing: 1.2,
                      fontFamily: "monospace",
                    }}
                  >
                    ACTION STEPS
                  </Text>
                  {lessonBreakdown.actionSteps.map((step, index: number) => (
                    <View
                      key={index}
                      className="mb-4 px-4 py-4 rounded-xl"
                      style={{
                        backgroundColor: "rgba(255,255,255,0.03)",
                        borderLeftWidth: 3,
                        borderLeftColor: "#999",
                      }}
                    >
                      <View className="flex-row items-start mb-2">
                        <Pressable
                          onPress={() => handleStepPress("action step", index + 1, `${step.title}: ${step.description}`)}
                          className="flex-row items-center mr-3"
                        >
                          <View
                            className="w-7 h-7 rounded-full items-center justify-center"
                            style={{ backgroundColor: "rgba(255,255,255,0.1)" }}
                          >
                            <Text
                              className="text-xs font-bold"
                              style={{
                                color: "#FFF",
                                fontFamily: "monospace",
                              }}
                            >
                              {index + 1}
                            </Text>
                          </View>
                        </Pressable>
                        <View className="flex-1">
                          <Text
                            className="text-white text-sm font-semibold mb-1"
                            style={{ letterSpacing: 0.5, lineHeight: 18 }}
                            selectable={true}
                            selectionColor={Platform.OS === "android" ? "#FFFFFF80" : undefined}
                          >
                            {step.title}
                          </Text>
                          <Text
                            className="text-gray-400 text-xs"
                            style={{ letterSpacing: 0.3, lineHeight: 18 }}
                            selectable={true}
                            selectionColor={Platform.OS === "android" ? "#FFFFFF80" : undefined}
                          >
                            {step.description}
                          </Text>
                        </View>
                        <View className="flex-row items-center" style={{ gap: 8 }}>
                          <Pressable
                            onPress={() => handleStepPress("action step", index + 1, `${step.title}: ${step.description}`)}
                            className="w-7 h-7 rounded-full items-center justify-center"
                            style={{ backgroundColor: "rgba(0,227,255,0.15)" }}
                          >
                            <Ionicons name="help-circle-outline" size={16} color="#00E3FF" />
                          </Pressable>
                          <Pressable onPress={() => handleCopyItem(`${step.title}: ${step.description}`)}>
                            <Ionicons name="copy-outline" size={14} color="#999" />
                          </Pressable>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* No Action Steps Notice */}
              {lessonBreakdown.actionSteps.length === 0 && lessonBreakdown.keyLessons.length > 0 && (
                <View className="mb-6 px-4 py-3 rounded-xl" style={{ backgroundColor: "rgba(255,255,255,0.02)" }}>
                  <Text className="text-gray-500 text-xs text-center" style={{ letterSpacing: 0.3, fontStyle: "italic" }}>
                    No clear step-by-step actions found, but here are the key lessons from this video.
                  </Text>
                </View>
              )}

              {/* Key Lessons Section */}
              {lessonBreakdown.keyLessons.length > 0 && (
                <View className="mb-8">
                  <Text
                    className="text-lg font-bold mb-4"
                    style={{
                      color: "#A78BFA",
                      letterSpacing: 1.2,
                      fontFamily: "monospace",
                    }}
                  >
                    KEY LESSONS
                  </Text>
                  {lessonBreakdown.keyLessons.map((lesson, index: number) => (
                    <View
                      key={index}
                      className="mb-4 px-4 py-4 rounded-xl"
                      style={{
                        backgroundColor: "rgba(167,139,250,0.05)",
                        borderLeftWidth: 3,
                        borderLeftColor: "#A78BFA",
                      }}
                    >
                      <View className="flex-row items-start mb-2">
                        <View
                          className="w-6 h-6 rounded-full items-center justify-center mr-3 mt-0.5"
                          style={{ backgroundColor: "rgba(167,139,250,0.2)" }}
                        >
                          <Ionicons name="bulb" size={12} color="#A78BFA" />
                        </View>
                        <View className="flex-1">
                          <Text
                            className="text-white text-sm font-semibold mb-1"
                            style={{ letterSpacing: 0.5, lineHeight: 18 }}
                            selectable={true}
                            selectionColor={Platform.OS === "android" ? "#A78BFA80" : undefined}
                          >
                            {lesson.title}
                          </Text>
                          <Text
                            className="text-gray-400 text-xs"
                            style={{ letterSpacing: 0.3, lineHeight: 18 }}
                            selectable={true}
                            selectionColor={Platform.OS === "android" ? "#A78BFA80" : undefined}
                          >
                            {lesson.explanation}
                          </Text>
                        </View>
                        <View className="flex-row items-center" style={{ gap: 8 }}>
                          <Pressable
                            onPress={() => handleStepPress("key lesson", index + 1, `${lesson.title}: ${lesson.explanation}`)}
                            className="w-7 h-7 rounded-full items-center justify-center"
                            style={{ backgroundColor: "rgba(167,139,250,0.15)" }}
                          >
                            <Ionicons name="help-circle-outline" size={16} color="#A78BFA" />
                          </Pressable>
                          <Pressable onPress={() => handleCopyItem(`${lesson.title}: ${lesson.explanation}`)}>
                            <Ionicons name="copy-outline" size={14} color="#A78BFA" />
                          </Pressable>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* Tips & Warnings Section */}
              {lessonBreakdown.tipsAndWarnings.length > 0 && (
                <View className="mb-4">
                  <Text
                    className="text-lg font-bold mb-4"
                    style={{
                      color: "#FF9A5A",
                      letterSpacing: 1.2,
                      fontFamily: "monospace",
                    }}
                  >
                    TIPS & WARNINGS
                  </Text>
                  {lessonBreakdown.tipsAndWarnings.map((tip: string, index: number) => (
                    <Pressable
                      key={index}
                      onPress={() => handleCopyItem(tip)}
                      className="flex-row items-start mb-3 px-4 py-3 rounded-xl"
                      style={{
                        backgroundColor: "rgba(255,154,90,0.05)",
                        borderLeftWidth: 3,
                        borderLeftColor: "#FF9A5A",
                      }}
                    >
                      <Ionicons name="alert-circle-outline" size={16} color="#FF9A5A" style={{ marginRight: 10, marginTop: 2 }} />
                      <Text
                        className="flex-1 text-white text-sm"
                        style={{ letterSpacing: 0.3, lineHeight: 20 }}
                        selectable={true}
                        selectionColor={Platform.OS === "android" ? "#FF9A5A80" : undefined}
                      >
                        {tip}
                      </Text>
                      <Ionicons name="copy-outline" size={14} color="#FF9A5A" style={{ marginLeft: 8, marginTop: 2 }} />
                    </Pressable>
                  ))}
                </View>
              )}
            </Animated.View>
          )}
        </ScrollView>

        {/* Q&A Modal */}
        {showQAModal && selectedStep && (
          <View
            className="absolute inset-0 items-center justify-center px-4"
            style={{ backgroundColor: "rgba(0,0,0,0.90)", zIndex: 100 }}
          >
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              className="w-full max-w-lg"
            >
              <Animated.View
                entering={FadeIn.duration(200)}
                className="w-full rounded-2xl overflow-hidden"
                style={{
                  backgroundColor: "#1a1a1a",
                  borderWidth: 1,
                  borderColor: "#00E3FF",
                }}
              >
                {/* Header */}
                <View
                  className="px-4 py-3 border-b flex-row items-center justify-between"
                  style={{ borderColor: "rgba(0,227,255,0.3)", backgroundColor: "rgba(0,227,255,0.05)" }}
                >
                  <View className="flex-1 mr-3">
                    <Text
                      className="text-xs font-bold tracking-wider mb-1"
                      style={{ fontFamily: "monospace", color: "#00E3FF" }}
                    >
                      ASK AI
                    </Text>
                    <Text
                      className="text-[10px] text-gray-400"
                      style={{ fontFamily: "monospace" }}
                      numberOfLines={1}
                    >
                      {selectedStep.type.toUpperCase()} {selectedStep.index}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => {
                      setShowQAModal(false);
                      Keyboard.dismiss();
                    }}
                    className="w-8 h-8 items-center justify-center rounded-full"
                    style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
                  >
                    <Ionicons name="close" size={18} color="#999" />
                  </Pressable>
                </View>

                {/* Selected Step Context */}
                <View className="px-4 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                  <Text
                    className="text-xs text-gray-500 mb-2"
                    style={{ fontFamily: "monospace", letterSpacing: 0.5 }}
                  >
                    ASKING ABOUT:
                  </Text>
                  <Text
                    className="text-sm text-white"
                    style={{ letterSpacing: 0.3, lineHeight: 18 }}
                    numberOfLines={3}
                  >
                    {selectedStep.text}
                  </Text>
                </View>

                {/* Question Input */}
                <View className="px-4 py-4">
                  <TextInput
                    className="border rounded-xl px-4 py-3 text-white text-sm mb-3"
                    style={{
                      borderColor: "rgba(255,255,255,0.1)",
                      backgroundColor: "rgba(0,0,0,0.3)",
                      fontFamily: "monospace",
                      letterSpacing: 0.3,
                    }}
                    placeholder="Type your question here..."
                    placeholderTextColor="#666"
                    value={question}
                    onChangeText={setQuestion}
                    multiline
                    numberOfLines={3}
                    autoFocus
                  />

                  {/* Ask Button */}
                  <Pressable
                    onPress={askAI}
                    disabled={!question.trim() || askingAI}
                    className="rounded-xl py-3 items-center"
                    style={{
                      backgroundColor: !question.trim() || askingAI ? "rgba(0,227,255,0.2)" : "rgba(0,227,255,0.3)",
                      borderWidth: 1,
                      borderColor: !question.trim() || askingAI ? "rgba(0,227,255,0.3)" : "#00E3FF",
                    }}
                  >
                    {askingAI ? (
                      <View className="flex-row items-center" style={{ gap: 8 }}>
                        <ActivityIndicator size="small" color="#00E3FF" />
                        <Text
                          className="text-xs font-bold tracking-wider"
                          style={{ fontFamily: "monospace", color: "#00E3FF" }}
                        >
                          THINKING...
                        </Text>
                      </View>
                    ) : (
                      <Text
                        className="text-xs font-bold tracking-wider"
                        style={{ fontFamily: "monospace", color: "#00E3FF" }}
                      >
                        ASK AI
                      </Text>
                    )}
                  </Pressable>
                </View>

                {/* AI Response */}
                {aiResponse && (
                  <Animated.View
                    entering={FadeIn.duration(300)}
                    className="px-4 py-4 border-t"
                    style={{ borderColor: "rgba(255,255,255,0.05)", maxHeight: 300 }}
                  >
                    <View className="flex-row items-center justify-between mb-3">
                      <Text
                        className="text-xs font-bold tracking-wider"
                        style={{ fontFamily: "monospace", color: "#00E3FF" }}
                      >
                        AI RESPONSE
                      </Text>
                      <Pressable onPress={() => handleCopyItem(aiResponse)}>
                        <Ionicons name="copy-outline" size={16} color="#00E3FF" />
                      </Pressable>
                    </View>
                    <ScrollView className="max-h-48" showsVerticalScrollIndicator={true} indicatorStyle="white" persistentScrollbar={true}>
                      <Text
                        className="text-sm text-white"
                        style={{ letterSpacing: 0.3, lineHeight: 20 }}
                        selectable={true}
                        selectionColor={Platform.OS === "android" ? "#00E3FF80" : undefined}
                      >
                        {aiResponse}
                      </Text>
                    </ScrollView>
                  </Animated.View>
                )}
              </Animated.View>
            </KeyboardAvoidingView>
          </View>
        )}
      </Animated.View>
    </GestureDetector>
  );
};
