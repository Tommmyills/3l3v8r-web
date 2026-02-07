import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
  Keyboard,
  TouchableWithoutFeedback,
  Dimensions,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Clipboard from "@react-native-clipboard/clipboard";
import Animated, {
  FadeIn,
  FadeOut,
  Layout,
  SlideInRight,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import {
  fetchYoutubeTranscript,
  formatTimestamp,
  searchTranscript,
  TranscriptSegment,
  TranscriptResult,
} from "../api/youtube-transcript";
import { translateText } from "../utils/translator";
import { Language } from "../state/voiceAssistStore";
import {
  summarizeTranscript,
  askTranscriptQuestion,
  detectChapters,
  extractKeyConcepts,
  generateStudyNotes,
  TranscriptSummary,
  TranscriptChapter,
  KeyConcepts,
  QAResponse,
} from "../api/transcript-ai";
import { useAppStore } from "../state/appStore";
import { useTranscriptStore } from "../state/transcriptStore";

type TabType = "transcript" | "summary" | "chapters" | "concepts" | "qa" | "notes";

interface TranscriptScreenProps {
  videoId: string;
  videoTitle?: string;
  onClose: () => void;
  onSeekTo?: (seconds: number) => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const TranscriptScreen: React.FC<TranscriptScreenProps> = ({
  videoId,
  videoTitle,
  onClose,
  onSeekTo,
}) => {
  const insets = useSafeAreaInsets();
  const audioMode = useAppStore((s) => s.audioMode);
  const scrollViewRef = useRef<ScrollView>(null);

  // Transcript store for persistence
  const cacheTranscript = useTranscriptStore((s) => s.cacheTranscript);
  const getCache = useTranscriptStore((s) => s.getCache);

  // Try to load from cache first
  const cachedData = getCache(videoId);

  // Swipe gesture values
  const { height: SCREEN_HEIGHT } = Dimensions.get("window");
  const translateY = useSharedValue(0);
  const context = useSharedValue({ y: 0 });

  // State - initialize from cache if available
  const [activeTab, setActiveTab] = useState<TabType>(cachedData?.activeTab || "transcript");
  const [transcript, setTranscript] = useState<TranscriptResult | null>(cachedData?.transcript || null);
  const [loading, setLoading] = useState(!cachedData?.transcript); // Don't load if we have cache
  const [error, setError] = useState<string | null>(null);

  // AI Features State
  const [summary, setSummary] = useState<TranscriptSummary | null>(null);
  const [chapters, setChapters] = useState<TranscriptChapter[]>([]);
  const [concepts, setConcepts] = useState<KeyConcepts | null>(null);
  const [studyNotes, setStudyNotes] = useState<string>("");

  // Q&A State
  const [question, setQuestion] = useState("");
  const [qaHistory, setQaHistory] = useState<Array<{ q: string; a: QAResponse }>>([]);
  const [askingQuestion, setAskingQuestion] = useState(false);

  // Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<TranscriptSegment[]>([]);

  // Translation State - initialize from cache if available
  const [translatedTranscript, setTranslatedTranscript] = useState<TranscriptResult | null>(cachedData?.translatedTranscript || null);
  const [translating, setTranslating] = useState(false);
  const [selectedTranslateLang, setSelectedTranslateLang] = useState<Language | null>(cachedData?.selectedTranslateLang || null);
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);

  // Loading states for AI features
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [loadingChapters, setLoadingChapters] = useState(false);
  const [loadingConcepts, setLoadingConcepts] = useState(false);
  const [loadingNotes, setLoadingNotes] = useState(false);

  // Pan gesture for swipe down to dismiss
  const panGesture = Gesture.Pan()
    .onStart(() => {
      context.value = { y: translateY.value };
    })
    .onUpdate((event) => {
      // Only allow swiping down (positive translationY)
      if (event.translationY > 0) {
        translateY.value = context.value.y + event.translationY;
      }
    })
    .onEnd((event) => {
      const dismissThreshold = SCREEN_HEIGHT * 0.3;
      const shouldDismiss = translateY.value > dismissThreshold || event.velocityY > 500;

      if (shouldDismiss) {
        // Swipe down to dismiss
        translateY.value = withTiming(
          SCREEN_HEIGHT,
          { duration: 200 },
          () => {
            runOnJS(onClose)();
          }
        );
        runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Medium);
      } else {
        // Snap back to position
        translateY.value = withSpring(0, {
          damping: 15,
          stiffness: 150,
        });
      }
    });

  // Animated style for the container
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
    };
  });

  // Get mode colors
  const getModeColor = () => {
    switch (audioMode) {
      case "FOCUS": return "#FF9A5A";
      case "STUDY": return "#5FD4F4";
      case "CHILL": return "#A78BFA";
      case "FLOW": return "#5EEAD4";
      case "DEEP": return "#F87171";
      default: return "#FF9A5A";
    }
  };

  const accentColor = getModeColor();

  // Fetch transcript on mount and when video changes
  useEffect(() => {
    // Only fetch if we don't have cached data
    if (!cachedData?.transcript) {
      loadTranscript();
    }
  }, [videoId]);

  // Cache transcript whenever it changes
  useEffect(() => {
    if (transcript) {
      cacheTranscript(videoId, { transcript });
    }
  }, [transcript, videoId, cacheTranscript]);

  // Cache translation whenever it changes
  useEffect(() => {
    if (translatedTranscript || selectedTranslateLang) {
      cacheTranscript(videoId, {
        translatedTranscript,
        selectedTranslateLang,
      });
    }
  }, [translatedTranscript, selectedTranslateLang, videoId, cacheTranscript]);

  // Cache active tab
  useEffect(() => {
    cacheTranscript(videoId, { activeTab });
  }, [activeTab, videoId, cacheTranscript]);

  const loadTranscript = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await fetchYoutubeTranscript(videoId);

      // Check if we got an empty transcript (no captions available)
      if (!result.segments || result.segments.length === 0) {
        setError("No captions available for this video");
        setTranscript(null);
      } else {
        setTranscript(result);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load transcript";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Load AI features when tabs are opened
  useEffect(() => {
    if (!transcript) return;

    if (activeTab === "summary" && !summary && !loadingSummary) {
      loadSummary();
    } else if (activeTab === "chapters" && chapters.length === 0 && !loadingChapters) {
      loadChapters();
    } else if (activeTab === "concepts" && !concepts && !loadingConcepts) {
      loadConcepts();
    } else if (activeTab === "notes" && !studyNotes && !loadingNotes) {
      loadStudyNotes();
    }
  }, [activeTab, transcript]);

  const loadSummary = async () => {
    if (!transcript) return;
    setLoadingSummary(true);
    try {
      const result = await summarizeTranscript(transcript.fullText, videoTitle);
      setSummary(result);
    } catch (err) {
      Alert.alert("Error", "Failed to generate summary");
    } finally {
      setLoadingSummary(false);
    }
  };

  const loadChapters = async () => {
    if (!transcript) return;
    setLoadingChapters(true);
    try {
      const result = await detectChapters(transcript.segments, transcript.fullText);
      setChapters(result);
    } catch (err) {
      Alert.alert("Error", "Failed to detect chapters");
    } finally {
      setLoadingChapters(false);
    }
  };

  const loadConcepts = async () => {
    if (!transcript) return;
    setLoadingConcepts(true);
    try {
      const result = await extractKeyConcepts(transcript.fullText);
      setConcepts(result);
    } catch (err) {
      Alert.alert("Error", "Failed to extract concepts");
    } finally {
      setLoadingConcepts(false);
    }
  };

  const loadStudyNotes = async () => {
    if (!transcript) return;
    setLoadingNotes(true);
    try {
      const result = await generateStudyNotes(transcript.fullText, videoTitle);
      setStudyNotes(result);
    } catch (err) {
      Alert.alert("Error", "Failed to generate study notes");
    } finally {
      setLoadingNotes(false);
    }
  };

  const handleAskQuestion = async () => {
    if (!transcript || !question.trim()) return;

    Keyboard.dismiss();
    setAskingQuestion(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const answer = await askTranscriptQuestion(
        question.trim(),
        transcript.fullText,
        transcript.segments
      );
      setQaHistory([{ q: question.trim(), a: answer }, ...qaHistory]);
      setQuestion("");
    } catch (err) {
      Alert.alert("Error", "Failed to answer question");
    } finally {
      setAskingQuestion(false);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (!transcript || !query.trim()) {
      setSearchResults([]);
      return;
    }
    const results = searchTranscript(transcript.segments, query);
    setSearchResults(results);
  };

  const copyToClipboard = (text: string) => {
    Clipboard.setString(text);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("Copied", "Text copied to clipboard");
  };

  const handleTimestampPress = (seconds: number) => {
    if (onSeekTo) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onSeekTo(seconds);
      Alert.alert("Jumped to timestamp", `Playing from ${formatTimestamp(seconds)}`);
    }
  };

  // Translate transcript to selected language using BATCH translation (1 API call)
  const handleTranslateTranscript = async (targetLanguage: Language) => {
    console.log("========================================");
    console.log("[UI] LANGUAGE BUTTON CLICKED:", targetLanguage);
    console.log("========================================");

    if (!transcript) {
      console.log("[UI] ERROR: No transcript available");
      return;
    }
    if (translating) {
      console.log("[UI] ERROR: Already translating");
      return;
    }

    try {
      setTranslating(true);
      setSelectedTranslateLang(targetLanguage);
      setShowLanguageMenu(false);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      console.log("[UI] Starting translation to", targetLanguage);
      console.log("[UI] Transcript has", transcript.segments.length, "segments");

      // BATCH TRANSLATION: Combine all segments with a unique delimiter
      const DELIMITER = "|||SEG|||";
      const combinedText = transcript.segments.map(s => s.text).join(DELIMITER);

      console.log("[UI] Combined text length:", combinedText.length);
      console.log("[UI] First 100 chars of combined text:", combinedText.substring(0, 100));

      // Make ONE API call to translate everything
      console.log("[UI] Calling translateText function...");
      const translatedCombined = await translateText(combinedText, "en", targetLanguage);

      console.log("[UI] translateText returned!");
      console.log("[UI] Translated text length:", translatedCombined.length);
      console.log("[UI] First 100 chars of translated:", translatedCombined.substring(0, 100));

      // Split the translated result back into segments
      const translatedTexts = translatedCombined.split(DELIMITER);
      console.log("[UI] Split into", translatedTexts.length, "segments");

      // Map translated texts back to segments
      const translatedSegments: TranscriptSegment[] = transcript.segments.map((segment, index) => ({
        ...segment,
        text: translatedTexts[index]?.trim() || segment.text,
      }));

      // Update UI with all translated segments at once
      const finalResult: TranscriptResult = {
        ...transcript,
        segments: translatedSegments,
        fullText: translatedSegments.map(s => s.text).join(" "),
        language: targetLanguage,
      };

      console.log("[UI] Setting translatedTranscript state...");
      setTranslatedTranscript(finalResult);
      setTranslating(false);
      console.log("[UI] DONE! UI should now show translated text");
      console.log("========================================");

    } catch (error) {
      console.error("[UI] TRANSLATION ERROR:", error);
      setTranslating(false);
      setSelectedTranslateLang(null);
      setTranslatedTranscript(null);
    }
  };

  // Reset to original language
  const handleResetTranslation = () => {
    setTranslatedTranscript(null);
    setSelectedTranslateLang(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // Get current transcript (translated or original)
  const currentTranscript = translatedTranscript || transcript;

  // Log which transcript is being displayed
  console.log("[RENDER] currentTranscript language:", currentTranscript?.language || "original");
  console.log("[RENDER] translatedTranscript exists:", !!translatedTranscript);

  // Render functions for each tab
  const renderTranscriptTab = () => {
    if (!transcript) return null;

    const displaySegments = searchQuery.trim() ? searchResults : (currentTranscript?.segments || transcript.segments);

    return (
      <View className="flex-1">
        {/* Search Bar */}
        <View className="px-4 py-3 border-b border-[#2a2a2a]">
          <View className="flex-row items-center bg-[#1a1a1a] rounded-sm px-3 py-2 border border-[#2a2a2a]">
            <Ionicons name="search" size={16} color="#666" />
            <TextInput
              value={searchQuery}
              onChangeText={handleSearch}
              placeholder="SEARCH TRANSCRIPT..."
              placeholderTextColor="#666"
              className="flex-1 ml-2 text-white font-mono text-xs tracking-wider"
              style={{ fontFamily: "monospace" }}
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => handleSearch("")}>
                <Ionicons name="close-circle" size={16} color="#666" />
              </Pressable>
            )}
          </View>
        </View>

        {/* Transcript Segments */}
        <ScrollView
          ref={scrollViewRef}
          className="flex-1 px-4 py-3"
          showsVerticalScrollIndicator={true}
          indicatorStyle="white"
          persistentScrollbar={true}
        >
          {displaySegments.length === 0 && searchQuery.trim() ? (
            <Text className="text-[#666] font-mono text-xs text-center mt-8 tracking-wider">
              NO RESULTS FOUND
            </Text>
          ) : (
            displaySegments.map((segment, index) => (
              <Animated.View
                key={index}
                entering={FadeIn.delay(index * 20)}
                layout={Layout.springify()}
                className="mb-4"
              >
                <Pressable
                  onPress={() => handleTimestampPress(segment.start)}
                  className="flex-row"
                >
                  <Text
                    className="font-mono text-xs tracking-wider mr-3 mt-0.5"
                    style={{ color: accentColor }}
                    selectable={true}
                  >
                    {formatTimestamp(segment.start)}
                  </Text>
                  <Text
                    className="flex-1 text-white font-mono text-xs leading-5 tracking-wide"
                    selectable={true}
                    selectionColor={Platform.OS === "android" ? `${accentColor}80` : undefined}
                  >
                    {segment.text}
                  </Text>
                </Pressable>
              </Animated.View>
            ))
          )}
        </ScrollView>

        {/* Copy Full Transcript */}
        <View className="border-t border-[#2a2a2a] px-4 py-3">
          <Pressable
            onPress={() => copyToClipboard(transcript.fullText)}
            className="bg-[#1a1a1a] border rounded-sm py-3 items-center"
            style={{ borderColor: accentColor }}
          >
            <Text
              className="font-mono text-xs tracking-widest font-bold"
              style={{ color: accentColor }}
            >
              COPY FULL TRANSCRIPT
            </Text>
          </Pressable>
        </View>
      </View>
    );
  };

  const renderSummaryTab = () => {
    if (loadingSummary) {
      return (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={accentColor} />
          <Text className="text-[#666] font-mono text-xs mt-4 tracking-wider">
            ANALYZING VIDEO...
          </Text>
        </View>
      );
    }

    if (!summary) return null;

    return (
      <ScrollView className="flex-1 px-4 py-4" showsVerticalScrollIndicator={true} indicatorStyle="white" persistentScrollbar={true}>
        <View className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-sm p-4 mb-4">
          <Text className="text-[#999] font-mono text-[10px] tracking-widest mb-2">
            SUMMARY
          </Text>
          <Text
            className="text-white font-mono text-xs leading-5 tracking-wide mb-3"
            selectable={true}
            selectionColor={Platform.OS === "android" ? `${accentColor}80` : undefined}
          >
            {summary.summary}
          </Text>
          <Pressable
            onPress={() => copyToClipboard(summary.summary)}
            className="self-end"
          >
            <Ionicons name="copy-outline" size={16} color={accentColor} />
          </Pressable>
        </View>

        <View className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-sm p-4 mb-4">
          <Text className="text-[#999] font-mono text-[10px] tracking-widest mb-3">
            KEY TOPICS
          </Text>
          {summary.keyTopics.map((topic, index) => (
            <View key={index} className="flex-row items-start mb-2">
              <Text style={{ color: accentColor }} className="mr-2">•</Text>
              <Text
                className="flex-1 text-white font-mono text-xs tracking-wide"
                selectable={true}
                selectionColor={Platform.OS === "android" ? `${accentColor}80` : undefined}
              >
                {topic}
              </Text>
            </View>
          ))}
        </View>

        <View className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-sm p-4">
          <Text className="text-[#999] font-mono text-[10px] tracking-widest mb-1">
            READING TIME
          </Text>
          <Text
            className="text-white font-mono text-xs tracking-wide"
            selectable={true}
          >
            {summary.estimatedReadingTime}
          </Text>
        </View>
      </ScrollView>
    );
  };

  const renderChaptersTab = () => {
    if (loadingChapters) {
      return (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={accentColor} />
          <Text className="text-[#666] font-mono text-xs mt-4 tracking-wider">
            DETECTING CHAPTERS...
          </Text>
        </View>
      );
    }

    if (chapters.length === 0) {
      return (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-[#666] font-mono text-xs text-center tracking-wider">
            NO CHAPTERS DETECTED
          </Text>
        </View>
      );
    }

    return (
      <ScrollView className="flex-1 px-4 py-4" showsVerticalScrollIndicator={true} indicatorStyle="white" persistentScrollbar={true}>
        {chapters.map((chapter, index) => (
          <Animated.View
            key={index}
            entering={SlideInRight.delay(index * 100)}
            className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-sm p-4 mb-3"
          >
            <Pressable onPress={() => handleTimestampPress(chapter.startTime)}>
              <View className="flex-row items-center justify-between mb-2">
                <Text
                  className="font-mono text-xs tracking-wider font-bold"
                  style={{ color: accentColor }}
                  selectable={true}
                >
                  {formatTimestamp(chapter.startTime)} - {formatTimestamp(chapter.endTime)}
                </Text>
                <Ionicons name="play-circle-outline" size={20} color={accentColor} />
              </View>
              <Text
                className="text-white font-mono text-sm tracking-wide font-bold mb-2"
                selectable={true}
                selectionColor={Platform.OS === "android" ? `${accentColor}80` : undefined}
              >
                {chapter.title}
              </Text>
              <Text
                className="text-[#999] font-mono text-xs leading-5 tracking-wide"
                selectable={true}
                selectionColor={Platform.OS === "android" ? `${accentColor}80` : undefined}
              >
                {chapter.summary}
              </Text>
            </Pressable>
          </Animated.View>
        ))}
      </ScrollView>
    );
  };

  const renderConceptsTab = () => {
    if (loadingConcepts) {
      return (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={accentColor} />
          <Text className="text-[#666] font-mono text-xs mt-4 tracking-wider">
            EXTRACTING CONCEPTS...
          </Text>
        </View>
      );
    }

    if (!concepts) return null;

    const renderSection = (title: string, items: string[], icon: any) => {
      if (items.length === 0) return null;

      return (
        <View className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-sm p-4 mb-4">
          <View className="flex-row items-center mb-3">
            <Ionicons name={icon} size={16} color={accentColor} />
            <Text className="text-[#999] font-mono text-[10px] tracking-widest ml-2">
              {title}
            </Text>
          </View>
          {items.map((item, index) => (
            <Pressable
              key={index}
              onPress={() => copyToClipboard(item)}
              className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-sm p-3 mb-2"
            >
              <Text
                className="text-white font-mono text-xs tracking-wide"
                selectable={true}
                selectionColor={Platform.OS === "android" ? `${accentColor}80` : undefined}
              >
                {item}
              </Text>
            </Pressable>
          ))}
        </View>
      );
    };

    return (
      <ScrollView className="flex-1 px-4 py-4" showsVerticalScrollIndicator={true} indicatorStyle="white" persistentScrollbar={true}>
        {/* Key Moments - Show first if available */}
        {concepts.keyMoments && concepts.keyMoments.length > 0 && (
          <View className="bg-[#1a1a1a] border rounded-sm p-4 mb-4" style={{ borderColor: accentColor }}>
            <View className="flex-row items-center mb-3">
              <Ionicons name="list" size={16} color={accentColor} />
              <Text className="text-[#999] font-mono text-[10px] tracking-widest ml-2">
                KEY MOMENTS - ACTION STEPS
              </Text>
            </View>
            {concepts.keyMoments.map((moment, index) => (
              <Pressable
                key={index}
                onPress={() => {
                  if (moment.timestamp && onSeekTo) {
                    handleTimestampPress(moment.timestamp);
                  }
                }}
                className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-sm p-3 mb-2"
              >
                <View className="flex-row items-start">
                  <Text className="font-mono text-xs font-bold mr-2" style={{ color: accentColor }}>
                    #{moment.number}
                  </Text>
                  <View className="flex-1">
                    <Text
                      className="text-white font-mono text-xs font-bold mb-1"
                      selectable={true}
                      selectionColor={Platform.OS === "android" ? `${accentColor}80` : undefined}
                    >
                      {moment.title}
                    </Text>
                    <Text
                      className="text-[#999] font-mono text-xs tracking-wide leading-4"
                      selectable={true}
                      selectionColor={Platform.OS === "android" ? `${accentColor}80` : undefined}
                    >
                      {moment.action}
                    </Text>
                    {moment.timestamp > 0 && (
                      <Text className="text-[#666] font-mono text-[10px] mt-1" selectable={true}>
                        @ {formatTimestamp(moment.timestamp)}
                      </Text>
                    )}
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        )}

        {renderSection("CODE SNIPPETS", concepts.codeSnippets, "code-slash")}
        {renderSection("COMMANDS", concepts.commands, "terminal")}
        {renderSection("TOOLS MENTIONED", concepts.toolsMentioned, "construct")}
        {renderSection("KEY CONCEPTS", concepts.importantConcepts, "bulb")}
      </ScrollView>
    );
  };

  const renderQATab = () => {
    return (
      <View className="flex-1">
        {/* Question Input */}
        <View className="px-4 py-3 border-b border-[#2a2a2a]">
          <Text className="text-[#999] font-mono text-[10px] tracking-widest mb-2">
            ASK ABOUT THIS VIDEO
          </Text>
          <View className="flex-row items-center">
            <TextInput
              value={question}
              onChangeText={setQuestion}
              placeholder="What does the video explain about..."
              placeholderTextColor="#666"
              className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-sm px-3 py-2 text-white font-mono text-xs tracking-wide mr-2"
              style={{ fontFamily: "monospace" }}
              onSubmitEditing={handleAskQuestion}
              editable={!askingQuestion}
            />
            <Pressable
              onPress={handleAskQuestion}
              disabled={!question.trim() || askingQuestion}
              className="px-4 py-2 rounded-sm"
              style={{
                backgroundColor: question.trim() && !askingQuestion ? accentColor : "#2a2a2a",
              }}
            >
              {askingQuestion ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <Ionicons name="send" size={16} color={question.trim() ? "#000" : "#666"} />
              )}
            </Pressable>
          </View>
        </View>

        {/* Q&A History */}
        <ScrollView className="flex-1 px-4 py-4" showsVerticalScrollIndicator={true} indicatorStyle="white" persistentScrollbar={true}>
          {qaHistory.length === 0 ? (
            <View className="flex-1 items-center justify-center py-12">
              <Ionicons name="chatbox-ellipses-outline" size={48} color="#2a2a2a" />
              <Text className="text-[#666] font-mono text-xs mt-4 text-center tracking-wider">
                ASK QUESTIONS ABOUT{"\n"}THE VIDEO CONTENT
              </Text>
            </View>
          ) : (
            qaHistory.map((item, index) => (
              <Animated.View
                key={index}
                entering={FadeIn}
                className="mb-4"
              >
                {/* Question */}
                <View className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-sm p-3 mb-2">
                  <Text className="text-[#999] font-mono text-[10px] tracking-widest mb-1">
                    YOUR QUESTION
                  </Text>
                  <Text
                    className="text-white font-mono text-xs tracking-wide"
                    selectable={true}
                    selectionColor={Platform.OS === "android" ? `${accentColor}80` : undefined}
                  >
                    {item.q}
                  </Text>
                </View>

                {/* Answer */}
                <View
                  className="border rounded-sm p-3 mb-2"
                  style={{
                    backgroundColor: "#0a0a0a",
                    borderColor: item.a.confidence === "high" ? accentColor : "#2a2a2a",
                  }}
                >
                  <View className="flex-row items-center justify-between mb-2">
                    <Text className="text-[#999] font-mono text-[10px] tracking-widest">
                      ANSWER
                    </Text>
                    <Text
                      className="font-mono text-[9px] tracking-wider"
                      style={{
                        color:
                          item.a.confidence === "high"
                            ? accentColor
                            : item.a.confidence === "medium"
                            ? "#999"
                            : "#666",
                      }}
                    >
                      {item.a.confidence.toUpperCase()} CONFIDENCE
                    </Text>
                  </View>
                  <Text
                    className="text-white font-mono text-xs leading-5 tracking-wide mb-3"
                    selectable={true}
                    selectionColor={Platform.OS === "android" ? `${accentColor}80` : undefined}
                  >
                    {item.a.answer}
                  </Text>

                  {/* Timestamps */}
                  {item.a.relevantTimestamps.length > 0 && (
                    <View className="flex-row flex-wrap gap-2">
                      {item.a.relevantTimestamps.map((ts, idx) => (
                        <Pressable
                          key={idx}
                          onPress={() => handleTimestampPress(ts)}
                          className="px-2 py-1 rounded-sm border"
                          style={{ borderColor: accentColor, backgroundColor: "#1a1a1a" }}
                        >
                          <Text
                            className="font-mono text-[10px] tracking-wider"
                            style={{ color: accentColor }}
                          >
                            {formatTimestamp(ts)}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  )}
                </View>

                {/* Copy Answer */}
                <Pressable
                  onPress={() => copyToClipboard(item.a.answer)}
                  className="self-end px-3 py-1 border border-[#2a2a2a] rounded-sm"
                >
                  <Text className="text-[#666] font-mono text-[10px] tracking-wider">
                    COPY
                  </Text>
                </Pressable>
              </Animated.View>
            ))
          )}
        </ScrollView>
      </View>
    );
  };

  const renderNotesTab = () => {
    if (loadingNotes) {
      return (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={accentColor} />
          <Text className="text-[#666] font-mono text-xs mt-4 tracking-wider">
            GENERATING STUDY NOTES...
          </Text>
        </View>
      );
    }

    if (!studyNotes) return null;

    return (
      <View className="flex-1">
        <ScrollView className="flex-1 px-4 py-4" showsVerticalScrollIndicator={true} indicatorStyle="white" persistentScrollbar={true}>
          <View className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-sm p-4">
            <Text
              className="text-white font-mono text-xs leading-6 tracking-wide"
              selectable={true}
              selectionColor={Platform.OS === "android" ? `${accentColor}80` : undefined}
            >
              {studyNotes}
            </Text>
          </View>
        </ScrollView>

        {/* Copy Notes */}
        <View className="border-t border-[#2a2a2a] px-4 py-3">
          <Pressable
            onPress={() => copyToClipboard(studyNotes)}
            className="bg-[#1a1a1a] border rounded-sm py-3 items-center"
            style={{ borderColor: accentColor }}
          >
            <Text
              className="font-mono text-xs tracking-widest font-bold"
              style={{ color: accentColor }}
            >
              COPY STUDY NOTES
            </Text>
          </Pressable>
        </View>
      </View>
    );
  };

  // Loading/Error States
  if (loading) {
    return (
      <GestureDetector gesture={panGesture}>
        <Animated.View
          className="flex-1 bg-[#0E0E0E]"
          style={[{ paddingTop: insets.top }, animatedStyle]}
        >
          {/* Header */}
          <View className="border-b border-[#2a2a2a] px-4 py-4">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-[#999] font-mono text-[10px] tracking-widest">
                VIDEO TRANSCRIPT
              </Text>
              <Pressable onPress={onClose} className="p-2">
                <Ionicons name="close" size={24} color="#fff" />
              </Pressable>
            </View>

            {/* Swipe Indicator */}
            <View className="items-center">
              <View className="w-8 h-1 rounded-full bg-[#333]" />
            </View>
          </View>

          {/* Loading Content - Scrollable */}
          <ScrollView
            className="flex-1 px-6 py-8"
            contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
            showsVerticalScrollIndicator={true}
            indicatorStyle="white"
            persistentScrollbar={true}
          >
            <View className="items-center">
              <ActivityIndicator size="large" color={accentColor} />
              <Text className="text-[#666] font-mono text-xs mt-4 tracking-wider">
                LOADING TRANSCRIPT...
              </Text>
              <Text className="text-[#444] font-mono text-[10px] mt-2 tracking-wider text-center">
                Fetching captions from YouTube{"\n"}This may take a few seconds
              </Text>
            </View>
          </ScrollView>
        </Animated.View>
      </GestureDetector>
    );
  }

  if (error || !transcript) {
    return (
      <View className="flex-1 bg-[#0E0E0E]" style={{ paddingTop: insets.top }}>
        {/* Header */}
        <View className="border-b border-[#2a2a2a] px-4 py-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-[#999] font-mono text-[10px] tracking-widest">
              VIDEO TRANSCRIPT
            </Text>
            <Pressable onPress={onClose} className="p-2">
              <Ionicons name="close" size={24} color="#fff" />
            </Pressable>
          </View>
        </View>

        {/* Error Content */}
        <ScrollView
          className="flex-1 px-6 py-8"
          showsVerticalScrollIndicator={true}
          indicatorStyle="white"
          persistentScrollbar={true}
        >
          <View className="items-center mb-8">
            <Ionicons name="alert-circle-outline" size={64} color="#666" style={{ marginBottom: 16 }} />
            <Text
              className="text-white font-mono text-sm text-center tracking-wide mb-2"
              selectable={true}
            >
              No Transcript Available
            </Text>
            <Text
              className="text-[#666] font-mono text-xs text-center tracking-wide leading-5"
              selectable={true}
            >
              This video does not have{"\n"}captions or subtitles enabled
            </Text>
          </View>

          {/* Why This Happens */}
          <View className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-sm p-4 mb-4">
            <View className="flex-row items-center mb-3">
              <Ionicons name="information-circle-outline" size={18} color={accentColor} />
              <Text className="text-[#999] font-mono text-xs tracking-wider ml-2">
                WHY THIS HAPPENS
              </Text>
            </View>
            <Text className="text-white font-mono text-xs leading-5 tracking-wide mb-2" selectable={true}>
              • Video creator disabled captions
            </Text>
            <Text className="text-white font-mono text-xs leading-5 tracking-wide mb-2" selectable={true}>
              • No auto-generated captions available
            </Text>
            <Text className="text-white font-mono text-xs leading-5 tracking-wide" selectable={true}>
              • Video is too new (processing pending)
            </Text>
          </View>

          {/* What You Can Do */}
          <View className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-sm p-4 mb-4">
            <View className="flex-row items-center mb-3">
              <Ionicons name="bulb-outline" size={18} color={accentColor} />
              <Text className="text-[#999] font-mono text-xs tracking-wider ml-2">
                WHAT YOU CAN DO
              </Text>
            </View>
            <Text className="text-white font-mono text-xs leading-5 tracking-wide mb-3" selectable={true}>
              1. Check if the video has captions on YouTube directly
            </Text>
            <Text className="text-white font-mono text-xs leading-5 tracking-wide mb-3" selectable={true}>
              2. Try a different video with captions enabled
            </Text>
            <Text className="text-white font-mono text-xs leading-5 tracking-wide mb-3" selectable={true}>
              3. Use the Instant Notes feature while watching
            </Text>
            <Text className="text-white font-mono text-xs leading-5 tracking-wide" selectable={true}>
              4. Wait if video is newly uploaded (YouTube may still be processing)
            </Text>
          </View>

          {/* Quick Tips */}
          <View className="bg-[#0a0a0a] border rounded-sm p-4" style={{ borderColor: `${accentColor}30` }}>
            <View className="flex-row items-center mb-3">
              <Ionicons name="star-outline" size={16} color={accentColor} />
              <Text className="font-mono text-xs tracking-wider ml-2" style={{ color: accentColor }}>
                PRO TIP
              </Text>
            </View>
            <Text
              className="text-[#999] font-mono text-xs leading-5 tracking-wide"
              selectable={true}
            >
              Most educational videos, tutorials, and lectures have auto-generated captions. Look for the [CC] icon on YouTube to verify before loading.
            </Text>
          </View>

          {/* Action Buttons */}
          <View className="mt-6 flex-row" style={{ gap: 12 }}>
            <Pressable
              onPress={loadTranscript}
              className="flex-1 border py-3 rounded-2xl items-center"
              style={{
                borderColor: accentColor,
                backgroundColor: `${accentColor}20`,
              }}
            >
              <Text className="font-mono text-xs tracking-widest font-bold" style={{ color: accentColor }}>
                TRY AGAIN
              </Text>
            </Pressable>
            <Pressable
              onPress={onClose}
              className="flex-1 border py-3 rounded-2xl items-center"
              style={{
                borderColor: "#666",
                backgroundColor: "rgba(255,255,255,0.03)",
              }}
            >
              <Text className="font-mono text-xs tracking-widest font-bold text-[#999]">
                CLOSE
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    );
  }

  // Main UI
  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View
        className="flex-1 bg-[#0E0E0E]"
        style={[{ paddingTop: insets.top }, animatedStyle]}
      >
        {/* Swipe Indicator */}
        <View className="items-center py-2">
          <View
            className="rounded-full bg-[#666]"
            style={{ width: 36, height: 4 }}
          />
        </View>
      {/* Header */}
      <View className="border-b border-[#2a2a2a] px-4 py-4">
        <View className="flex-row items-center justify-between mb-2">
          <View className="flex-1 mr-4">
            <Text className="text-[#999] font-mono text-[10px] tracking-widest mb-1">
              VIDEO TRANSCRIPT
            </Text>
            {videoTitle && (
              <Text className="text-white font-mono text-xs tracking-wide" numberOfLines={2}>
                {videoTitle}
              </Text>
            )}
          </View>

          {/* Translate Button */}
          {transcript && (
            <Pressable
              onPress={() => setShowLanguageMenu(!showLanguageMenu)}
              disabled={translating}
              className="mr-2 px-3 py-2 rounded-sm border"
              style={{
                borderColor: selectedTranslateLang ? accentColor : "#2a2a2a",
                backgroundColor: selectedTranslateLang ? `${accentColor}20` : "#1a1a1a",
                opacity: translating ? 0.5 : 1,
              }}
            >
              <View className="flex-row items-center">
                <Ionicons
                  name="language"
                  size={16}
                  color={selectedTranslateLang ? accentColor : "#999"}
                />
                {selectedTranslateLang && (
                  <Text
                    className="font-mono text-[9px] ml-1 font-bold tracking-widest"
                    style={{ color: accentColor }}
                  >
                    {selectedTranslateLang.toUpperCase()}
                  </Text>
                )}
              </View>
            </Pressable>
          )}

          <Pressable onPress={onClose} className="p-2">
            <Ionicons name="close" size={24} color="#fff" />
          </Pressable>
        </View>

        {/* Language Selection Menu */}
        {showLanguageMenu && transcript && (
          <View className="absolute top-16 right-4 bg-[#1a1a1a] border border-[#2a2a2a] rounded-sm z-50 shadow-2xl">
            <Pressable
              onPress={handleResetTranslation}
              className="px-4 py-3 border-b border-[#2a2a2a]"
            >
              <Text className="text-white font-mono text-xs tracking-wide">
                English (Original)
              </Text>
            </Pressable>
            {(["es", "de", "pt", "ja", "zh-CN"] as Language[]).map((lang) => {
              const labels: Record<string, string> = {
                es: "Spanish",
                de: "German",
                pt: "Portuguese",
                ja: "Japanese",
                "zh-CN": "Chinese",
              };
              return (
                <Pressable
                  key={lang}
                  onPress={() => handleTranslateTranscript(lang)}
                  className="px-4 py-3 border-b border-[#2a2a2a]"
                  style={{
                    backgroundColor: selectedTranslateLang === lang ? `${accentColor}10` : "transparent"
                  }}
                >
                  <Text
                    className="font-mono text-xs tracking-wide"
                    style={{
                      color: selectedTranslateLang === lang ? accentColor : "#fff"
                    }}
                  >
                    {labels[lang] || lang}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>

      {/* Translating Indicator */}
      {translating && (
        <View className="px-4 py-2 bg-[#1a1a1a] border-b border-[#2a2a2a]">
          <View className="flex-row items-center">
            <ActivityIndicator size="small" color={accentColor} />
            <Text className="text-[#999] font-mono text-xs ml-2 tracking-wide">
              Translating to {selectedTranslateLang}...
            </Text>
          </View>
        </View>
      )}

      {/* Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="border-b border-[#2a2a2a]"
      >
        <View className="flex-row px-2 py-2">
          {[
            { id: "transcript", label: "TRANSCRIPT", icon: "document-text" },
            { id: "summary", label: "SUMMARY", icon: "list" },
            { id: "chapters", label: "CHAPTERS", icon: "albums" },
            { id: "concepts", label: "CONCEPTS", icon: "bulb" },
            { id: "qa", label: "Q&A", icon: "chatbubbles" },
            { id: "notes", label: "NOTES", icon: "reader" },
          ].map((tab) => (
            <Pressable
              key={tab.id}
              onPress={() => {
                setActiveTab(tab.id as TabType);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              className="px-4 py-2 mr-2 rounded-sm border"
              style={{
                backgroundColor: activeTab === tab.id ? accentColor : "#1a1a1a",
                borderColor: activeTab === tab.id ? accentColor : "#2a2a2a",
              }}
            >
              <View className="flex-row items-center">
                <Ionicons
                  name={tab.icon as any}
                  size={14}
                  color={activeTab === tab.id ? "#000" : "#999"}
                />
                <Text
                  className="font-mono text-[10px] tracking-widest ml-2 font-bold"
                  style={{ color: activeTab === tab.id ? "#000" : "#999" }}
                >
                  {tab.label}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      {/* Content */}
      {activeTab === "transcript" && renderTranscriptTab()}
      {activeTab === "summary" && renderSummaryTab()}
      {activeTab === "chapters" && renderChaptersTab()}
      {activeTab === "concepts" && renderConceptsTab()}
      {activeTab === "qa" && renderQATab()}
      {activeTab === "notes" && renderNotesTab()}
      </Animated.View>
    </GestureDetector>
  );
};
