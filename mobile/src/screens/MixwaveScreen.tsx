import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  Keyboard,
  ScrollView,
  TouchableWithoutFeedback,
  ImageBackground,
  Alert,
  Platform,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { YoutubeIframeRef } from "react-native-youtube-iframe";
import YoutubePlayer from "../components/TutorialPlayer";
import { SoundCloudPlayer, SoundCloudPlayerRef } from "../components/SoundCloudPlayer";
import { resolveSoundCloudInput } from "../utils/soundCloudWidget";
import { WebView } from "react-native-webview";
import Slider from "../components/PlaybackSlider";
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";
import * as DocumentPicker from "expo-document-picker";
import * as Haptics from "expo-haptics";
import { useAppStore, AudioMode } from "../state/appStore";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  Easing,
  FadeIn,
  FadeOut,
} from "react-native-reanimated";
import { SettingsScreen } from "./SettingsScreen";
import { NotesScreen } from "./NotesScreen";
import { ProfileScreen } from "./ProfileScreen";
import { NotesModal } from "../components/NotesModal";
import { TranscriptScreen } from "./TranscriptScreen";
import { ActionStepsScreen } from "./ActionStepsScreen";
import { useProfileStore } from "../state/profileStore";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { AudioVisualizer } from "../components/AudioVisualizer";
import { MusicWaveform } from "../components/MusicWaveform";
import { VoiceAssistModal } from "../components/VoiceAssistModal";
import { useVoiceAssistStore } from "../state/voiceAssistStore";
import { FavoritesScreen } from "./FavoritesScreen";
import { useFavoritesStore } from "../state/favoritesStore";
import {
  HardwareFooter,
  HardwareGrille,
  HardwareHeader,
  HardwareScrew,
  HardwareSectionTitle,
  SynthwaveIdleDisplay,
  SynthwaveIdleDisplayV2,
  SynthwaveMediaIdleDisplay,
  SynthwaveMediaIdleDisplayV2,
  hardwarePalette,
  hardwareRaisedButton,
} from "../components/HardwareChrome";

type MusicSource = "local" | "bandcamp" | "mixcloud" | "apple-music" | "soundcloud" | "spotify" | null;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const AnimatedText = Animated.createAnimatedComponent(Text);
const AnimatedView = Animated.createAnimatedComponent(View);

// V1: YouTube + local MY MUSIC only.
// Full integrations remain preserved in Git.
const V1_SIMPLE_MODE = true;

// Mode color mapping - softer, more subtle
const getModeColors = (mode: AudioMode) => {
  switch (mode) {
    case "FOCUS":
      return { accent: "#FF9A5A", bg: "#FF9A5A12", glow: "#FF9A5A" }; // Softer Orange
    case "STUDY":
      return { accent: "#5FD4F4", bg: "#5FD4F412", glow: "#5FD4F4" }; // Softer Cyan
    case "CHILL":
      return { accent: "#A78BFA", bg: "#A78BFA12", glow: "#A78BFA" }; // Softer Purple
    case "FLOW":
      return { accent: "#5EEAD4", bg: "#5EEAD412", glow: "#5EEAD4" }; // Softer Teal
    case "DEEP":
      return { accent: "#F87171", bg: "#F8717112", glow: "#F87171" }; // Softer Red
  }
};

export const MixwaveScreen: React.FC = () => {
  const insets = useSafeAreaInsets();

  // State selectors
  const mainVideo = useAppStore((s) => s.mainVideo);
  const setMainVideoUrl = useAppStore((s) => s.setMainVideoUrl);
  const setMainVideoVolume = useAppStore((s) => s.setMainVideoVolume);
  const setMainVideoMuted = useAppStore((s) => s.setMainVideoMuted);
  const setMainVideoPlaying = useAppStore((s) => s.setMainVideoPlaying);
  const clearMainVideo = useAppStore((s) => s.clearMainVideo);

  const musicVideo = useAppStore((s) => s.musicVideo);
  const setMusicVideoVolume = useAppStore((s) => s.setMusicVideoVolume);
  const setMusicVideoMuted = useAppStore((s) => s.setMusicVideoMuted);
  const clearMusicVideo = useAppStore((s) => s.clearMusicVideo);

  const audioMode = useAppStore((s) => s.audioMode);
  const setAudioMode = useAppStore((s) => s.setAudioMode);
  const visualizerEnabled = useAppStore((s) => s.visualizerEnabled);

  // Local UI State
  const [mainUrlInput, setMainUrlInput] = useState("");
  const [showMainInput, setShowMainInput] = useState(false);
  const [musicSource, setMusicSource] = useState<MusicSource>(null);
  const [visualStyle, setVisualStyle] = useState<"classic" | "hardware">("hardware");
  const isHardware = visualStyle === "hardware";
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  const isMobileLayout = screenWidth <= 900;
  const isLandscapeMobile = isMobileLayout && screenWidth > screenHeight;

  const tutorialSideMargin = 18;
  const tutorialMaxWidth = Math.max(
    0,
    screenWidth - tutorialSideMargin * 2
  );

  const tutorialLandscapeHeight = Math.max(
    180,
    screenHeight - insets.top - insets.bottom - 16
  );

  const tutorialVideoHeight =
    isHardware && isMobileLayout
      ? isLandscapeMobile
        ? Math.min(tutorialLandscapeHeight, tutorialMaxWidth * 9 / 16)
        : tutorialMaxWidth * 9 / 16
      : 320;

  const tutorialVideoWidth =
    isHardware && isMobileLayout
      ? tutorialVideoHeight * 16 / 9
      : undefined;

  // Settings State
  const [showSettings, setShowSettings] = useState(false);

  // Profile State
  const [showProfile, setShowProfile] = useState(false);
  const saveMix = useProfileStore((s) => s.saveMix);

  // Notes State
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [showNotesScreen, setShowNotesScreen] = useState(false);
  const sessionNotesCount = useAppStore((s) => s.sessionNotes.length);

  // Transcript State
  const [showTranscript, setShowTranscript] = useState(false);

  // Lesson Breakdown State
  const [showActionSteps, setShowActionSteps] = useState(false);

  // Voice Assist State
  const [showVoiceAssist, setShowVoiceAssist] = useState(false);
  const voiceAssistEnabled = useVoiceAssistStore((s) => s.voiceAssistEnabled);

  // Favorites State
  const [showFavorites, setShowFavorites] = useState(false);
  const addFavorite = useFavoritesStore((s) => s.addFavorite);
  const removeFavorite = useFavoritesStore((s) => s.removeFavorite);
  const isFavorite = useFavoritesStore((s) => s.isFavorite);
  const addToRecentlyWatched = useFavoritesStore((s) => s.addToRecentlyWatched);
  const favoritesCount = useFavoritesStore((s) => s.favorites.length);

  // Track Player State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<string>("");
  const [localQueue, setLocalQueue] = useState<DocumentPicker.DocumentPickerAsset[]>([]);
  const [localTrackIndex, setLocalTrackIndex] = useState(-1);
  const localQueueRef = useRef<DocumentPicker.DocumentPickerAsset[]>([]);
  const localTrackIndexRef = useRef(-1);
  const audioRef = useRef<AudioPlayer | null>(null);

  // Video error state
  const [videoError, setVideoError] = useState(false);

  // Video title tracking for favorites
  const [currentVideoTitle, setCurrentVideoTitle] = useState<string>("");
  const [currentChannelTitle, setCurrentChannelTitle] = useState<string>("");
  const [currentThumbnail, setCurrentThumbnail] = useState<string>("");

  // Video loading state
  const [videoLoading, setVideoLoading] = useState(false);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Expandable sections state
  const [tutorialExpanded, setTutorialExpanded] = useState(false);
  const [musicExpanded, setMusicExpanded] = useState(false);

  // Player refs
  const mainPlayerRef = useRef<YoutubeIframeRef>(null);
  const musicWebViewRef = useRef<WebView>(null);
  const soundCloudRef = useRef<SoundCloudPlayerRef>(null);
  const [soundCloudInput, setSoundCloudInput] = useState("");
  const [soundCloudUrl, setSoundCloudUrl] = useState("");
  const [soundCloudLoading, setSoundCloudLoading] = useState(false);
  const soundCloudLoad = useRef<AbortController | null>(null);
  const [musicError, setMusicError] = useState("");
  const audioGeneration = useRef(0);
  const audioObjectUrl = useRef<string | null>(null);

  // Track playing states locally
  const [mainPlaying, setMainPlaying] = useState(false);

  // Loop section state
  const [loopEnabled, setLoopEnabled] = useState(false);
  const [loopStart, setLoopStart] = useState(0);
  const [loopEnd, setLoopEnd] = useState(0);
  const [showLoopModal, setShowLoopModal] = useState(false);

  // Speed control state
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [showSpeedModal, setShowSpeedModal] = useState(false);

  // Progress tracking for YouTube
  const [youtubeDuration, setYoutubeDuration] = useState(0);
  const [youtubeCurrentTime, setYoutubeCurrentTime] = useState(0);
  const youtubeProgressInterval = useRef<NodeJS.Timeout | null>(null);

  // Progress tracking for local audio
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);

  // Animation values
  const sliderGlowA = useSharedValue(0);
  const sliderGlowB = useSharedValue(0);
  const progressGlowA = useSharedValue(0);
  const progressGlowB = useSharedValue(0);

  // Logo animation values
  const logoGlow = useSharedValue(0);
  const logoWave = useSharedValue(0);

  // Loading logo animation
  const loadingLogoOpacity = useSharedValue(0);
  const loadingLogoGlow = useSharedValue(0);

  // Border glow animation value
  const borderGlow = useSharedValue(0);

  // Mixer state
  const channelAGain = mainVideo.volume;
  const channelBGain = musicVideo.volume;
  const [autoDuckEnabled, setAutoDuckEnabled] = useState(false);
  const speechActive = mainPlaying && !mainVideo.isMuted && channelAGain > 0;
  const isDucking = autoDuckEnabled && speechActive;
  const musicVolume = musicVideo.isMuted ? 0 : channelBGain;
  const musicVolumeRef = useRef(musicVolume);
  musicVolumeRef.current = musicVolume;

  // Get current mode colors
  const classicModeColors = getModeColors(audioMode);

  // Hardware UI always uses the permanent 3L3V8R burnt-orange theme.
  // Classic UI keeps Focus / Study / Chill / Flow / Deep colors.
  const modeColors = isHardware
    ? {
        accent: "#F26432",
        bg: "#F2643212",
        glow: "#FF7A45",
      }
    : classicModeColors;

  const setupAudio = async () => {
    if (Platform.OS === "web") return;

    try {
      await setAudioModeAsync({
        playsInSilentMode: true,
        shouldPlayInBackground: false,
        allowsRecording: false,
        interruptionMode: "mixWithOthers",
      });
    } catch (error) {
      console.log("Audio setup error:", error);
    }
  };

  const cleanupAudio = async () => {
    soundCloudLoad.current?.abort();
    soundCloudLoad.current = null;
    audioGeneration.current += 1;
    const sound = audioRef.current;
    const objectUrl = audioObjectUrl.current;
    audioRef.current = null;
    audioObjectUrl.current = null;
    try {
      if (sound) sound.remove();
    } finally {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    }
  };

  // YouTube progress tracking
  const startYoutubeProgressTracking = useCallback(async () => {
    if (youtubeProgressInterval.current) {
      clearInterval(youtubeProgressInterval.current);
    }

    if (mainPlayerRef.current) {
      try {
        const duration = await mainPlayerRef.current.getDuration();
        setYoutubeDuration(duration);

        youtubeProgressInterval.current = setInterval(async () => {
          if (mainPlayerRef.current && mainPlaying) {
            try {
              const currentTime = await mainPlayerRef.current.getCurrentTime();
              setYoutubeCurrentTime(currentTime);

              // Check loop boundary
              if (loopEnabled && loopEnd > loopStart && currentTime >= loopEnd) {
                await mainPlayerRef.current.seekTo(loopStart, true);
              }
            } catch (err) {
              console.log("Error getting current time:", err);
            }
          }
        }, 500);
      } catch (err) {
        console.log("Error getting duration:", err);
        // For long videos, duration might not be immediately available
        // Set up interval anyway and try to get duration later
        youtubeProgressInterval.current = setInterval(async () => {
          if (mainPlayerRef.current && mainPlaying) {
            try {
              const currentTime = await mainPlayerRef.current.getCurrentTime();
              setYoutubeCurrentTime(currentTime);

              // Try to get duration if we don't have it yet
              if (youtubeDuration === 0) {
                const dur = await mainPlayerRef.current.getDuration();
                if (dur > 0) {
                  setYoutubeDuration(dur);
                }
              }

              // Check loop boundary
              if (loopEnabled && loopEnd > loopStart && currentTime >= loopEnd) {
                await mainPlayerRef.current.seekTo(loopStart, true);
              }
            } catch (err) {
              // Ignore errors during buffering
            }
          }
        }, 500);
      }
    }
  }, [mainPlaying, youtubeDuration, loopEnabled, loopStart, loopEnd]);

  const stopYoutubeProgressTracking = useCallback(() => {
    if (youtubeProgressInterval.current) {
      clearInterval(youtubeProgressInterval.current);
      youtubeProgressInterval.current = null;
    }
  }, []);

  // Initialize Audio
  useEffect(() => {
    setupAudio();

    // Start smooth looping logo glow animation (6 second cycle - slower, breathing)
    logoGlow.value = withRepeat(
      withTiming(1, {
        duration: 6000,
        easing: Easing.inOut(Easing.ease),
      }),
      -1, // infinite
      true // reverse
    );

    // Start slow wave animation moving left to right (8 second cycle)
    logoWave.value = withRepeat(
      withTiming(1, {
        duration: 8000,
        easing: Easing.inOut(Easing.sin),
      }),
      -1, // infinite
      false // don't reverse, loop
    );

    // Start subtle border glow animation (10 second cycle - very slow breathing)
    borderGlow.value = withRepeat(
      withTiming(1, {
        duration: 10000,
        easing: Easing.inOut(Easing.ease),
      }),
      -1, // infinite
      true // reverse
    );

    return () => {
      cleanupAudio();
      stopYoutubeProgressTracking();
    };
  }, [stopYoutubeProgressTracking]);

  // Sync local playing state with store state when video loads
  useEffect(() => {
    if (mainVideo.videoId && mainVideo.isPlaying) {
      setMainPlaying(true);
    }
  }, [mainVideo.videoId, mainVideo.isPlaying]);

  const seekYoutube = useCallback(async (seconds: number) => {
    if (mainPlayerRef.current) {
      await mainPlayerRef.current.seekTo(seconds, true);
      setYoutubeCurrentTime(seconds);
    }
  }, []);

  // Format time helper
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Extract YouTube Video ID
  const extractVideoId = (url: string): string | null => {
    // Remove whitespace
    const cleanUrl = url.trim();

    // Try to extract video ID from various YouTube URL formats
    const patterns = [
      // Standard watch URLs (with or without www, http/https)
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
      // Shortened youtu.be URLs
      /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([a-zA-Z0-9_-]{11})/,
      // Embed URLs
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
      // Mobile URLs
      /(?:https?:\/\/)?(?:www\.)?m\.youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
      // Shorts URLs
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
      // v/ URLs
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
    ];

    for (const pattern of patterns) {
      const match = cleanUrl.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    // If no pattern matched, try to find any 11-character alphanumeric string (YouTube video ID format)
    const videoIdPattern = /([a-zA-Z0-9_-]{11})/;
    const idMatch = cleanUrl.match(videoIdPattern);
    if (idMatch && idMatch[1]) {
      return idMatch[1];
    }

    return null;
  };

  // Handle Main Video Load
  const handleLoadMainVideo = () => {
    if (!mainUrlInput.trim()) {
      Alert.alert("Empty URL", "Please enter a YouTube URL");
      return;
    }

    const videoId = extractVideoId(mainUrlInput.trim());
    if (videoId) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setMainVideoUrl(mainUrlInput.trim(), videoId);
      setShowMainInput(false);
      setMainUrlInput("");
      setVideoError(false); // Reset error state
      setVideoLoading(true); // Show loading overlay immediately when URL is submitted
      loadingLogoOpacity.value = withTiming(1, { duration: 300 }); // Fade in the logo
      Keyboard.dismiss();

      // Set playing state immediately for autoplay
      setMainPlaying(true);
      setMainVideoPlaying(true);
    } else {
      Alert.alert("Invalid URL", "Please enter a valid YouTube URL");
    }
  };


  // Handle state changes
  const onMainStateChange = useCallback((state: string) => {
    console.log("YouTube player state:", state);

    // Clear any existing loading timeout
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }

    if (state === "playing") {
      console.log("YouTube player now playing");
      setMainPlaying(true);
      setMainVideoPlaying(true);
      setVideoError(false); // Clear error on successful play
      setVideoLoading(false); // Hide loading overlay
      // Fade out loading logo
      loadingLogoOpacity.value = withTiming(0, { duration: 500 });
      startYoutubeProgressTracking();
    } else if (state === "paused") {
      console.log("YouTube player paused");
      setMainPlaying(false);
      setMainVideoPlaying(false);
      setVideoLoading(false); // Hide loading when paused
      stopYoutubeProgressTracking();
    } else if (state === "ended") {
      console.log("YouTube player ended");
      setMainPlaying(false);
      setMainVideoPlaying(false);
      setVideoLoading(false); // Hide loading when ended
      stopYoutubeProgressTracking();
    } else if (state === "ready") {
      // Player is ready but not playing yet
      console.log("YouTube player ready - video loaded and ready to play");
      setVideoError(false); // Clear error on successful load
      setVideoLoading(false); // Hide loading overlay
      // Fade out loading logo
      loadingLogoOpacity.value = withTiming(0, { duration: 500 });
    } else if (state === "buffering") {
      console.log("YouTube player buffering - this is normal for long videos");
      // Don't show loading screen for buffering, just keep current state
      // Keep playing state true during buffering so it resumes automatically
      if (mainVideo.isPlaying) {
        setMainPlaying(true);
      }
    } else if (state === "unstarted") {
      console.log("YouTube player unstarted - showing loading screen");
      setVideoLoading(true); // Show loading overlay
      // Fade in loading logo
      loadingLogoOpacity.value = withTiming(1, { duration: 300 });

      // Set a timeout to hide loading screen if video doesn't start within 5 seconds
      loadingTimeoutRef.current = setTimeout(() => {
        console.log("Loading timeout - video may be unavailable");
        setVideoLoading(false);
        setVideoError(true);
        loadingLogoOpacity.value = withTiming(0, { duration: 300 });
        Alert.alert(
          "Video Unavailable",
          "This video cannot be played. It may be age-restricted, private, or region-locked."
        );
      }, 5000);
    } else if (state === "error") {
      console.log("YouTube player error");
      setMainPlaying(false);
      setMainVideoPlaying(false);
      setVideoError(true); // Set error state
      setVideoLoading(false); // Hide loading overlay
      loadingLogoOpacity.value = withTiming(0, { duration: 300 });
      Alert.alert("Video Error", "Unable to load this video. It may be restricted or unavailable.");
    }
  }, [setMainVideoPlaying, startYoutubeProgressTracking, stopYoutubeProgressTracking, mainVideo.isPlaying, loadingLogoOpacity]);

  // Handle local music playlists
  const isPickingAudio = useRef(false);

  async function loadLocalTrack(index: number, autoplay = true) {
    const queue = localQueueRef.current;
    const file = queue[index];
    if (!file) return;

    await cleanupAudio();
    const generation = audioGeneration.current;

    setMusicError("");
    setIsPlaying(false);
    setAudioDuration(0);
    setAudioCurrentTime(0);
    setCurrentTrack(file.name);
    setLocalTrackIndex(index);
    localTrackIndexRef.current = index;

    const objectUrl =
      Platform.OS === "web" && file.file
        ? URL.createObjectURL(file.file)
        : null;

    audioObjectUrl.current = objectUrl;

    try {
      const sound = createAudioPlayer(
        { uri: objectUrl ?? file.uri },
        { updateInterval: 1000 }
      );

      sound.volume = musicVolumeRef.current / 100;
      sound.loop = false;

      if (generation !== audioGeneration.current) {
        sound.remove();
        if (objectUrl) URL.revokeObjectURL(objectUrl);
        return;
      }

      audioRef.current = sound;

      const progressInterval = setInterval(() => {
        if (generation !== audioGeneration.current) {
          clearInterval(progressInterval);
          return;
        }

        if (sound.duration > 0) {
          setAudioDuration(sound.duration);
        }

        setAudioCurrentTime(sound.currentTime);

        if (
          !sound.playing &&
          sound.duration > 0 &&
          sound.currentTime >= sound.duration - 0.25
        ) {
          clearInterval(progressInterval);

          const nextIndex = index + 1;
          if (nextIndex < localQueueRef.current.length) {
            void loadLocalTrack(nextIndex, true);
          } else {
            setIsPlaying(false);
            setAudioCurrentTime(0);
          }
        }
      }, 1000);

      if (sound.duration > 0) {
        setAudioDuration(sound.duration);
      }

      if (autoplay) {
        sound.play();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error("Failed to load audio file:", error);

      let userMessage = "Could not load this audio file.";
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      if (
        errorMessage.includes("-11800") ||
        errorMessage.includes("AVFoundationErrorDomain")
      ) {
        userMessage =
          "This audio file format is not supported or the file is corrupted. Try another MP3, AAC/M4A, or WAV file.";
      } else if (errorMessage.includes("1685348671")) {
        userMessage =
          "The audio file could not be decoded. Try converting it to a standard MP3 or AAC file.";
      }

      setMusicError(userMessage);
      setIsPlaying(false);
    }
  }

  const handlePickLocalMusic = async () => {
    if (isPickingAudio.current) {
      console.log("Document picker already open, ignoring request");
      return;
    }

    try {
      isPickingAudio.current = true;
      setMusicError("");

      const result = await DocumentPicker.getDocumentAsync({
        type: "audio/*",
        copyToCacheDirectory: true,
        base64: false,
        multiple: true,
      });

      if (
        result.canceled === false &&
        result.assets &&
        result.assets.length > 0
      ) {
        const tracks = result.assets;

        console.log(
          "Selected audio playlist:",
          tracks.map((track) => track.name)
        );

        localQueueRef.current = tracks;
        setLocalQueue(tracks);
        localTrackIndexRef.current = 0;
        setLocalTrackIndex(0);
        setMusicSource("local");

        await loadLocalTrack(0, true);

        Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success
        );
      }
    } catch (error) {
      console.error("Failed to select audio files:", error);

      const errorMessage =
        error instanceof Error ? error.message : String(error);

      if (!errorMessage.includes("Different document picking in progress")) {
        setMusicError("Could not load the selected audio files.");
      }
    } finally {
      isPickingAudio.current = false;
    }
  };

  const playPreviousLocalTrack = async () => {
    const queue = localQueueRef.current;
    if (!queue.length) return;

    const current = localTrackIndexRef.current;
    const previous = current <= 0 ? queue.length - 1 : current - 1;

    await loadLocalTrack(previous, true);
  };

  const playNextLocalTrack = async () => {
    const queue = localQueueRef.current;
    if (!queue.length) return;

    const current = localTrackIndexRef.current;
    const next = current >= queue.length - 1 ? 0 : current + 1;

    await loadLocalTrack(next, true);
  };

  // Seek local audio
  const seekAudio = async (seconds: number) => {
    if (audioRef.current) {
      await audioRef.current.seekTo(seconds);
      setAudioCurrentTime(seconds);
    }
  };

  // Toggle playback for local files
  const togglePlayback = async () => {
    if (musicSource === "soundcloud") {
      soundCloudRef.current?.toggle();
      return;
    }
    if (audioRef.current) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      if (audioRef.current.playing) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  // Clear music source
  const clearMusicSource = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await cleanupAudio();
    localQueueRef.current = [];
    localTrackIndexRef.current = -1;
    setLocalQueue([]);
    setLocalTrackIndex(-1);
    setCurrentTrack("");
    setIsPlaying(false);
    setAudioDuration(0);
    setAudioCurrentTime(0);
    setMusicError("");
    setSoundCloudUrl("");
    setSoundCloudLoading(false);
    setSoundCloudInput("");
    setMusicSource(null);
    clearMusicVideo();
  };

  // Save current mix to profile
  const handleSaveMix = () => {
    if (!mainVideo.videoId && !musicSource) {
      Alert.alert("No Mix", "Load a video or music to save your mix");
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const mixName = mainVideo.videoId
      ? `Mix ${new Date().toLocaleDateString()}`
      : `Music Mix ${new Date().toLocaleDateString()}`;

    saveMix({
      id: Date.now().toString(),
      name: mixName,
      timestamp: Date.now(),
      mainVideoUrl: mainVideo.url,
      mainVideoId: mainVideo.videoId,
      musicSource,
      channelAGain,
      channelBGain,
      audioMode,
    });

    Alert.alert("Saved!", "Your mix has been saved to your profile");
  };

  // Toggle favorite for current video
  const handleToggleFavorite = () => {
    if (!mainVideo.videoId) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    if (isFavorite(mainVideo.videoId)) {
      removeFavorite(mainVideo.videoId);
    } else {
      addFavorite({
        videoId: mainVideo.videoId,
        title: currentVideoTitle || "Tutorial Video",
        channelTitle: currentChannelTitle || "Unknown Channel",
        thumbnail: currentThumbnail || `https://img.youtube.com/vi/${mainVideo.videoId}/mqdefault.jpg`,
      });
    }
  };

  // Handle selecting a video from favorites
  const handleSelectFromFavorites = (videoId: string, title: string) => {
    const url = `https://www.youtube.com/watch?v=${videoId}`;
    setMainVideoUrl(url, videoId);
    setCurrentVideoTitle(title);
    setCurrentThumbnail(`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`);
    setVideoError(false);

    // Add to recently watched
    addToRecentlyWatched({
      videoId,
      title,
      channelTitle: currentChannelTitle || "Unknown Channel",
      thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
    });
  };

  // One writer for Channel B; Channel A has no access to this sound.
  useEffect(() => {
    if (audioRef.current && musicSource === "local") {
      try {
        audioRef.current.volume = musicVolume / 100;
      } catch {
        setMusicError("Could not update music volume. Reload the local file.");
      }
    }
  }, [musicVolume, musicSource]);

  // Pulsing glow animation for loading logo
  useEffect(() => {
    if (videoLoading) {
      // Start pulsing glow animation
      loadingLogoGlow.value = withRepeat(
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
    } else {
      // Stop animation
      loadingLogoGlow.value = 0;
    }
  }, [videoLoading, loadingLogoGlow]);

  // Cleanup loading timeout on unmount or video change
  useEffect(() => {
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
    };
  }, [mainVideo.videoId]);

  // Initialize loop end time when duration becomes available
  useEffect(() => {
    if (youtubeDuration > 0 && loopEnd === 0) {
      setLoopEnd(youtubeDuration);
    }
  }, [youtubeDuration]);

  // Get music source URL
  const getMusicSourceUrl = () => {
    switch (musicSource) {
      case "bandcamp":
        return "https://bandcamp.com";
      case "mixcloud":
        return "https://mixcloud.com";
      case "apple-music":
        return "https://music.apple.com";
      case "soundcloud":
        return "https://soundcloud.com";
      case "spotify":
        return "https://open.spotify.com";
      default:
        return "";
    }
  };

  // Animated slider glow styles
  const animatedSliderStyleA = useAnimatedStyle(() => ({
    shadowOpacity: sliderGlowA.value,
    shadowRadius: 8,
    shadowColor: modeColors.accent,
  }));

  const animatedSliderStyleB = useAnimatedStyle(() => ({
    shadowOpacity: sliderGlowB.value,
    shadowRadius: 8,
    shadowColor: modeColors.accent,
  }));

  const animatedProgressStyleA = useAnimatedStyle(() => ({
    shadowOpacity: progressGlowA.value,
    shadowRadius: 8,
    shadowColor: modeColors.accent,
  }));

  const animatedProgressStyleB = useAnimatedStyle(() => ({
    shadowOpacity: progressGlowB.value,
    shadowRadius: 8,
    shadowColor: modeColors.accent,
  }));

  // Animated logo style with softer backlight glow
  const animatedLogoStyle = useAnimatedStyle(() => {
    // Dynamic glow based on audio mode
    const backlightColor = modeColors.glow;

    // Very subtle wave position (left to right backlight movement)
    const waveOffset = (logoWave.value - 0.5) * 3; // -1.5 to 1.5 px

    // Softer, more diffused backlight glow
    const glowIntensity = 0.12 + logoGlow.value * 0.08; // 0.12 to 0.20 opacity
    const blurRadius = 24 + logoGlow.value * 12; // 24 to 36 blur

    return {
      shadowColor: backlightColor,
      shadowOffset: { width: waveOffset, height: 0 },
      shadowOpacity: glowIntensity,
      shadowRadius: blurRadius,
    };
  });

  // Animated border glow style - very subtle
  const animatedBorderStyle = useAnimatedStyle(() => {
    // Subtle breathing glow effect
    const glowOpacity = 0.08 + borderGlow.value * 0.08; // 0.08 to 0.16 opacity
    const glowRadius = 16 + borderGlow.value * 8; // 16 to 24 blur

    return {
      shadowColor: modeColors.glow,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: glowOpacity,
      shadowRadius: glowRadius,
    };
  });

  // Animated loading logo style with pulsing glow
  const animatedLoadingLogoStyle = useAnimatedStyle(() => {
    return {
      opacity: loadingLogoOpacity.value,
    };
  });

  return (
    <View className="flex-1">
      <LinearGradient
        colors={isHardware ? ["#efede9", "#d8d4ce", "#ebe8e3"] : ["#151923", "#251433", "#18132A"]}
        locations={[0, 0.5, 1]}
        style={{ flex: 1, paddingTop: insets.top, paddingHorizontal: isHardware ? 8 : 0 }}
      >
        <AnimatedView
          className="flex-1"
          style={isHardware ? {
            flex: 1,
            minHeight: 0,
            borderWidth: 1,
            borderColor: "#aaa69f",
            borderRadius: 18,
            overflow: "hidden",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.24,
            shadowRadius: 18,
          } : animatedBorderStyle}
        >
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
            showsVerticalScrollIndicator={false}
            bounces={false}
            overScrollMode="never"
            style={{ backgroundColor: isHardware ? "#1b1c1d" : "#1A1A1A" }}
          >
            {isHardware && (
              <HardwareHeader
                audioMode={audioMode}
                onModeChange={(mode) => {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  setAudioMode(mode);
                }}
                onSave={handleSaveMix}
                onFavorites={() => {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  setShowFavorites(true);
                }}
                onNotes={() => {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  setShowNotesScreen(true);
                }}
                onProfile={() => {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  setShowProfile(true);
                }}
                onSettings={() => {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  setShowSettings(true);
                }}
                favoritesCount={favoritesCount}
                sessionNotesCount={sessionNotesCount}
                onClassic={() => setVisualStyle("classic")}
              />
            )}
            {/* Header with Branding */}
            <View className="px-6 pt-8 pb-4 border-b" style={{ borderColor: "rgba(255,255,255,0.12)", display: isHardware ? "none" : "flex" }}>

          <View className="flex-row items-center justify-between mb-4">
            <View>
              <Animated.View style={animatedLogoStyle}>
                <Text
                  className="text-3xl font-bold tracking-widest"
                  style={{
                    fontFamily: isHardware ? "Arial Black" : "monospace",
                    letterSpacing: 4,
                    color: "#1a1a1a",
                    textShadowColor: modeColors.accent,
                    textShadowOffset: { width: -0.6, height: -0.6 },
                    textShadowRadius: 0,
                  }}
                >
                  3L3V8R
                </Text>
                <Text
                  className="text-3xl font-bold tracking-widest"
                  style={{
                    fontFamily: isHardware ? "Arial Black" : "monospace",
                    letterSpacing: 4,
                    color: "#1a1a1a",
                    textShadowColor: modeColors.accent,
                    textShadowOffset: { width: 0.6, height: -0.6 },
                    textShadowRadius: 0,
                    position: "absolute",
                    top: 0,
                    left: 0,
                  }}
                >
                  3L3V8R
                </Text>
                <Text
                  className="text-3xl font-bold tracking-widest"
                  style={{
                    fontFamily: "monospace",
                    letterSpacing: 4,
                    color: "#1a1a1a",
                    textShadowColor: modeColors.accent,
                    textShadowOffset: { width: -0.6, height: 0.6 },
                    textShadowRadius: 0,
                    position: "absolute",
                    top: 0,
                    left: 0,
                  }}
                >
                  3L3V8R
                </Text>
                <Text
                  className="text-3xl font-bold tracking-widest"
                  style={{
                    fontFamily: "monospace",
                    letterSpacing: 4,
                    color: "#1a1a1a",
                    textShadowColor: modeColors.accent,
                    textShadowOffset: { width: 0.6, height: 0.6 },
                    textShadowRadius: 0,
                    position: "absolute",
                    top: 0,
                    left: 0,
                  }}
                >
                  3L3V8R
                </Text>
              </Animated.View>
              <View
                className="mt-1.5 px-2 py-0.5 self-start border rounded-sm"
                style={{
                  backgroundColor: "rgba(255,255,255,0.03)",
                  borderColor: "#333",
                }}
              >
                <Text
                  className="text-gray-600 text-xs tracking-widest"
                  style={{
                    fontFamily: "monospace",
                    letterSpacing: 2.5,
                    fontSize: 9,
                  }}
                >
                  3L3V8R SYST3M5
                </Text>
              </View>
            </View>
            <View className="flex-row items-center" style={{ gap: 8 }}>
              <Pressable
                onPress={handleSaveMix}
                className="border p-2 rounded-xl"
                style={{
                  borderColor: "rgba(255,255,255,0.15)",
                  backgroundColor: "rgba(255,255,255,0.03)",
                  shadowColor: modeColors.glow,
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.2,
                  shadowRadius: 8,
                }}
              >
                <Ionicons name="save-outline" size={16} color={modeColors.accent} />
              </Pressable>
              <Pressable
                onPress={() => {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  setShowFavorites(true);
                }}
                className="border p-2 rounded-xl relative"
                style={{
                  borderColor: "rgba(255,255,255,0.15)",
                  backgroundColor: "rgba(255,255,255,0.03)",
                  shadowColor: modeColors.glow,
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.2,
                  shadowRadius: 8,
                }}
              >
                <Ionicons name="heart" size={16} color={modeColors.accent} />
                {favoritesCount > 0 && (
                  <View
                    className="absolute -top-1 -right-1 w-4 h-4 rounded-full items-center justify-center"
                    style={{
                      backgroundColor: modeColors.accent,
                    }}
                  >
                    <Text
                      className="text-white font-bold"
                      style={{ fontSize: 9, fontFamily: "monospace" }}
                    >
                      {favoritesCount > 9 ? "9+" : favoritesCount}
                    </Text>
                  </View>
                )}
              </Pressable>
              <Pressable
                onPress={() => {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  setShowNotesScreen(true);
                }}
                className="border p-2 rounded-xl relative"
                style={{
                  borderColor: "rgba(255,255,255,0.1)",
                  backgroundColor: "rgba(0,0,0,0.3)",
                  shadowColor: modeColors.glow,
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.2,
                  shadowRadius: 8,
                }}
              >
                <Ionicons name="document-text-outline" size={16} color={modeColors.accent} />
                {sessionNotesCount > 0 && (
                  <View
                    className="absolute -top-1 -right-1 w-4 h-4 rounded-full items-center justify-center"
                    style={{
                      backgroundColor: modeColors.accent,
                    }}
                  >
                    <Text
                      className="text-white font-bold"
                      style={{ fontSize: 9, fontFamily: "monospace" }}
                    >
                      {sessionNotesCount}
                    </Text>
                  </View>
                )}
              </Pressable>
              <Pressable
                onPress={() => {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  setShowProfile(true);
                }}
                className="border p-2 rounded-xl"
                style={{
                  borderColor: "rgba(255,255,255,0.15)",
                  backgroundColor: "rgba(255,255,255,0.03)",
                  shadowColor: modeColors.glow,
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.2,
                  shadowRadius: 8,
                }}
              >
                <Ionicons name="person-circle-outline" size={16} color={modeColors.accent} />
              </Pressable>
              <Pressable
                onPress={() => {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  setShowSettings(true);
                }}
                className="border p-2 rounded-xl"
                style={{
                  borderColor: "rgba(255,255,255,0.15)",
                  backgroundColor: "rgba(255,255,255,0.03)",
                  shadowColor: modeColors.glow,
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.2,
                  shadowRadius: 8,
                }}
              >
                <Ionicons name="settings-outline" size={16} color={modeColors.accent} />
              </Pressable>
              <View
                className="px-3 py-1.5 rounded-xl"
                style={{
                  backgroundColor: modeColors.accent,
                  shadowColor: modeColors.glow,
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                }}
              >
                <Text
                  className="text-white text-xs font-semibold"
                  style={{ letterSpacing: 0.5 }}
                >
                  {audioMode}
                </Text>
              </View>
            </View>
          </View>

          {/* Mode Switcher */}
          <View className="flex-row flex-wrap mt-2" style={{ gap: 8 }}>
            {(["FOCUS", "STUDY", "CHILL", "FLOW", "DEEP"] as AudioMode[]).map((mode) => (
              <Pressable
                key={mode}
                onPress={() => {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  setAudioMode(mode);
                }}
                className="border px-4 py-2 rounded-2xl"
                style={{
                  borderColor: audioMode === mode ? getModeColors(mode).accent : "rgba(255,255,255,0.1)",
                  backgroundColor: audioMode === mode
                    ? `${getModeColors(mode).accent}20`
                    : "rgba(0,0,0,0.3)",
                  shadowColor: audioMode === mode ? getModeColors(mode).glow : "transparent",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: audioMode === mode ? 0.4 : 0,
                  shadowRadius: 8,
                }}
              >
                <Text
                  className="text-xs font-semibold"
                  style={{
                    letterSpacing: 1,
                    color: audioMode === mode ? getModeColors(mode).accent : "#666",
                  }}
                >
                  {mode}
                </Text>
              </Pressable>
            ))}
          </View>
          <Pressable
            onPress={() => setVisualStyle("hardware")}
            className="self-end border px-3 py-1.5 rounded-xl mt-3"
            style={{ borderColor: "rgba(255,255,255,0.14)", backgroundColor: "rgba(255,255,255,0.03)" }}
          >
            <Text style={{ color: "#777", fontFamily: "monospace", fontSize: 9, letterSpacing: 1.2 }}>CLASSIC / HARDWARE</Text>
          </Pressable>
        </View>

        {/* Main Video Section */}
        <View className={isHardware ? "px-3 mt-4 mb-4" : "px-6 mt-8 mb-6"}>
          <BlurView intensity={isHardware ? 8 : 20} tint={isHardware ? "light" : "dark"} className="overflow-hidden" style={isHardware ? {
            borderWidth: 1,
            borderColor: hardwarePalette.line,
            borderRadius: 10,
            backgroundColor: "#2a2b2c",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 5 },
            shadowOpacity: 0.18,
            shadowRadius: 7,
          } : {
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.12)",
            borderRadius: 24,
            backgroundColor: "rgba(30,30,30,0.5)",
            shadowColor: modeColors.glow,
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.15,
            shadowRadius: 20,
          }}>
          <View
            className="overflow-hidden"
            style={{
              backgroundColor: "transparent",
            }}
          >
            {/* Section Label */}
            <View
              className="px-4 py-2.5 border-b flex-row items-center justify-between"
              style={{
                backgroundColor: isHardware ? "#2a2b2c" : "rgba(255,255,255,0.02)",
                borderColor: isHardware ? hardwarePalette.line : "rgba(255,255,255,0.08)",
                minHeight: isHardware ? 46 : undefined,
              }}
            >
              {isHardware ? (
                <>
                  <HardwareSectionTitle title="MEDIA" detail="L3ARN / EXPLORE" />
                  <View style={{ marginLeft: 12 }}><HardwareScrew size={12} /></View>
                </>
              ) : <><View className="flex-row items-center" style={{ gap: 8 }}>
                <Text
                  className="text-gray-400 text-sm font-semibold"
                  style={{ letterSpacing: 0.5 }}
                >
                  Tutorial
                </Text>
                {voiceAssistEnabled && (
                  <View className="flex-row items-center" style={{ gap: 4 }}>
                    <Ionicons name="mic" size={10} color={modeColors.accent} />
                    <Text
                      className="text-xs font-bold tracking-wider"
                      style={{
                        fontFamily: "monospace",
                        color: modeColors.accent,
                        fontSize: 9,
                      }}
                    >
                      VA
                    </Text>
                  </View>
                )}
              </View>
              <View
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: mainVideo.videoId ? modeColors.accent : "#333" }}
              /></>}
            </View>

            {/* Video Player with rounded corners */}
            <View
              className="border-b relative overflow-hidden"
              style={{
                height: tutorialVideoHeight,
                width: tutorialVideoWidth,
                alignSelf: tutorialVideoWidth ? "center" : undefined,
                marginHorizontal: tutorialVideoWidth ? 0 : isHardware ? 18 : 0,
                marginTop: isHardware ? 12 : 0,
                borderRadius: isHardware ? 12 : 16,
                backgroundColor: "#121314",
                borderColor: isHardware ? "#8f8b85" : "rgba(255,255,255,0.08)",
                borderWidth: isHardware ? 1 : 0,
              }}
            >
              {mainVideo.videoId ? (
                <>
                  <YoutubePlayer
                    ref={mainPlayerRef}
                    key={`main-${mainVideo.videoId}`}
                    height={tutorialVideoHeight}
                    play={mainPlaying}
                    videoId={mainVideo.videoId}
                    volume={mainVideo.isMuted ? 0 : channelAGain}
                    playbackRate={playbackSpeed}
                    onChangeState={onMainStateChange}
                    onReady={() => {
                      console.log("YouTube player onReady - attempting to play");
                      // Ensure it plays when ready
                      setMainPlaying(true);
                      setMainVideoPlaying(true);
                      // Hide loading overlay when player is ready
                      setVideoLoading(false);
                      setVideoError(false);
                      // Clear timeout
                      if (loadingTimeoutRef.current) {
                        clearTimeout(loadingTimeoutRef.current);
                        loadingTimeoutRef.current = null;
                      }
                    }}
                    onError={(error: string) => {
                      console.log("YouTube error:", error);
                      setVideoError(true);
                      setVideoLoading(false); // Hide loading on error
                      // Clear timeout
                      if (loadingTimeoutRef.current) {
                        clearTimeout(loadingTimeoutRef.current);
                        loadingTimeoutRef.current = null;
                      }
                      Alert.alert("Video Error", "Unable to load this video. It may be restricted, age-gated, or unavailable.");
                    }}
                    forceAndroidAutoplay={true}
                    webViewProps={{
                      allowsInlineMediaPlayback: true,
                      mediaPlaybackRequiresUserAction: false,
                      javaScriptEnabled: true,
                      allowsFullscreenVideo: true,
                      mixedContentMode: "always",
                      startInLoadingState: false,
                      style: { backgroundColor: "#000000" },
                      onError: (syntheticEvent: any) => {
                        const { nativeEvent } = syntheticEvent;
                        console.log("WebView error:", nativeEvent);
                      },
                    }}
                    initialPlayerParams={{
                      preventFullScreen: false,
                      modestbranding: true,
                      controls: true,
                      rel: 0,
                      showClosedCaptions: false,
                      loop: false,
                      start: 0,
                    }}
                  />

                  {/* Error Overlay */}
                  {videoError && (
                    <View className="absolute inset-0 items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.85)" }}>
                      <Ionicons name="alert-circle-outline" size={48} color="#F87171" style={{ marginBottom: 16 }} />
                      <Text
                        className="text-center text-gray-300 text-sm mb-2 px-8"
                        style={{ letterSpacing: 0.3 }}
                      >
                        Video failed to load
                      </Text>
                      <Text
                        className="text-center text-gray-500 text-xs mb-6 px-8"
                        style={{ letterSpacing: 0.3 }}
                      >
                        It may be restricted or unavailable
                      </Text>
                      <View className="flex-row" style={{ gap: 12 }}>
                        <Pressable
                          onPress={() => {
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                            setVideoError(false);
                            setShowMainInput(true);
                          }}
                          className="border px-6 py-3 rounded-2xl"
                          style={{
                            borderColor: modeColors.accent,
                            backgroundColor: `${modeColors.accent}20`,
                            shadowColor: modeColors.glow,
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.3,
                            shadowRadius: 8,
                          }}
                        >
                          <Text
                            className="font-bold text-xs tracking-widest"
                            style={{ fontFamily: "monospace", color: modeColors.accent }}
                          >
                            TRY ANOTHER
                          </Text>
                        </Pressable>
                        <Pressable
                          onPress={() => {
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                            clearMainVideo();
                            setVideoError(false);
                            setTutorialExpanded(false);
                          }}
                          className="border px-6 py-3 rounded-2xl"
                          style={{
                            borderColor: "#F87171",
                            backgroundColor: "rgba(248,113,113,0.15)",
                          }}
                        >
                          <Text
                            className="font-bold text-xs tracking-widest"
                            style={{ fontFamily: "monospace", color: "#F87171" }}
                          >
                            CLEAR
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  )}

                  {/* Loading Overlay with 3L3V8R Logo */}
                  {videoLoading && (
                    <Animated.View
                      className="absolute inset-0 items-center justify-center"
                      style={{
                        backgroundColor: "#000000",
                        pointerEvents: "none"
                      }}
                      entering={FadeIn.duration(300)}
                      exiting={FadeOut.duration(500)}
                    >
                      <AnimatedText
                        style={[
                          {
                            fontFamily: "monospace",
                            fontSize: 50,
                            fontWeight: "bold",
                            letterSpacing: 8,
                            color: "#FF786A",
                            textShadowColor: "rgba(255,92,76,0.65)",
                            textShadowOffset: { width: 0, height: 0 },
                            textShadowRadius: 22,
                          },
                          animatedLoadingLogoStyle,
                        ]}
                      >
                        3L3V8R
                      </AnimatedText>
                    </Animated.View>
                  )}
                </>
              ) : (
                <Pressable
                  onPress={() => {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    setShowMainInput(true);
                  }}
                  disabled={isHardware}
                  style={{ flex: 1 }}
                >
                  {isHardware ? (
                    <SynthwaveMediaIdleDisplayV2 hidePrompt />
                  ) : (
                    <ImageBackground
                      source={require("../../assets/elev8ryoutubeholder-1765124402018.png")}
                      style={{ flex: 1 }}
                      resizeMode="cover"
                    >
                      <View
                        className="absolute inset-0"
                        style={{ backgroundColor: "rgba(0,0,0,0.70)" }}
                      />
                    </ImageBackground>
                  )}
                </Pressable>
              )}
            </View>

            {/* Controls */}
            <View className="p-5" style={{ backgroundColor: isHardware ? "#151617" : "rgba(255,255,255,0.02)" }}>
              {isHardware && (
                <View style={{ marginBottom: mainVideo.videoId ? 18 : 0 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 9 }}>
                    <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: hardwarePalette.orange, borderWidth: 1, borderColor: "#bd3414" }} />
                    <Text style={{ color: "#e8e9e5", fontFamily: "monospace", fontSize: 13, fontWeight: "900", letterSpacing: 2 }}>INPUT URL</Text>
                  </View>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "stretch", gap: 10 }}>
                    <TextInput
                      value={mainUrlInput}
                      onChangeText={setMainUrlInput}
                      onSubmitEditing={handleLoadMainVideo}
                      placeholder="Paste a YouTube URL..."
                      placeholderTextColor="#6e7074"
                      autoCapitalize="none"
                      autoCorrect={false}
                      style={{
                        flex: 1,
                        minWidth: 220,
                        minHeight: 50,
                        paddingHorizontal: 18,
                        borderWidth: 1,
                        borderColor: "#77746f",
                        borderRadius: 7,
                        backgroundColor: "#1c1d1f",
                        color: "#f5f2ed",
                        fontFamily: "monospace",
                        fontSize: 12,
                        letterSpacing: 0.5,
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.24,
                        shadowRadius: 4,
                      }}
                    />
                    <Pressable
                      onPress={handleLoadMainVideo}
                      style={{
                        minWidth: 140,
                        minHeight: 50,
                        borderRadius: 7,
                        borderWidth: 1,
                        borderColor: "#d13917",
                        backgroundColor: hardwarePalette.orange,
                        alignItems: "center",
                        justifyContent: "center",
                        flexDirection: "row",
                        gap: 18,
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.3,
                        shadowRadius: 4,
                      }}
                    >
                      <Text style={{ color: "#111", fontFamily: isHardware ? "Arial Black" : "monospace", fontWeight: "900", fontSize: isHardware ? 15 : 14, letterSpacing: 2 }}>LOAD</Text>
                      <Ionicons name="arrow-forward" size={18} color="#111" />
                    </Pressable>
                  </View>
                </View>
              )}
              {!mainVideo.videoId ? (
                isHardware ? null : <Pressable
                  onPress={() => {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    setShowMainInput(true);
                  }}
                  className="border py-3 items-center rounded-2xl"
                  style={{
                    borderColor: modeColors.accent,
                    backgroundColor: `${modeColors.accent}15`,
                    shadowColor: modeColors.glow,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 10,
                  }}
                >
                  <Text
                    className="font-bold text-xs tracking-widest"
                    style={{ fontFamily: "monospace", color: modeColors.accent }}
                  >
                    INPUT URL
                  </Text>
                </Pressable>
              ) : (
                <View>
                  {/* Simplified Main Controls */}
                  <View className="flex-row items-center justify-between mb-4">
                    <View className="flex-row items-center" style={{ gap: 6 }}>
                      <Text
                        className="text-gray-400 text-sm font-medium"
                        style={{ letterSpacing: 0.3 }}
                      >
                        Tutorial
                      </Text>
                      {speechActive && (
                        <View
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: "#10B981" }}
                        />
                      )}
                    </View>
                    <View className="flex-row items-center" style={{ gap: 8 }}>
                      <View
                        className="px-3 py-1.5 border rounded-xl"
                        style={{
                          borderColor: "rgba(255,255,255,0.1)",
                          backgroundColor: "rgba(0,0,0,0.4)",
                        }}
                      >
                        <Text
                          className="text-white text-xs font-bold"
                          style={{ fontFamily: "monospace" }}
                        >
                          {channelAGain}
                        </Text>
                      </View>
                      <Pressable
                        onPress={() => {
                          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                          setMainVideoMuted(!mainVideo.isMuted);
                        }}
                        className="border p-2 rounded-xl"
                        style={{
                          borderColor: "rgba(255,255,255,0.1)",
                          backgroundColor: "rgba(0,0,0,0.4)",
                        }}
                      >
                        <Ionicons
                          name={mainVideo.isMuted ? "volume-mute" : "volume-high"}
                          size={16}
                          color={mainVideo.isMuted ? "#F87171" : modeColors.accent}
                        />
                      </Pressable>
                    </View>
                  </View>

                  {/* Volume Slider */}
                  <Animated.View
                    className="border p-2 rounded-2xl mb-4"
                    style={[{
                      borderColor: "rgba(255,255,255,0.15)",
                      backgroundColor: "rgba(255,255,255,0.03)",
                    }, animatedSliderStyleA]}
                  >
                    <Slider
                      style={{ width: "100%", height: 30 }}
                      minimumValue={0}
                      maximumValue={100}
                      step={1}
                      accessibilityLabel="Tutorial volume"
                      value={channelAGain}
                      onValueChange={(value) => {
                        setMainVideoVolume(value);
                      }}
                      onTouchStart={() => {
                        sliderGlowA.value = withSpring(0.6);
                      }}
                      onTouchEnd={() => {
                        sliderGlowA.value = withSpring(0);
                      }}
                      minimumTrackTintColor={modeColors.accent}
                      maximumTrackTintColor="#1a1a1a"
                      thumbTintColor={modeColors.accent}
                    />
                  </Animated.View>

                  {/* Expand/Clear Row */}
                  <View className="flex-row" style={{ gap: 10 }}>
                    <Pressable
                      onPress={() => {
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        setTutorialExpanded(!tutorialExpanded);
                      }}
                      className="flex-1 border py-2.5 rounded-2xl flex-row items-center justify-center"
                      style={{
                        borderColor: tutorialExpanded ? modeColors.accent : "rgba(255,255,255,0.1)",
                        backgroundColor: tutorialExpanded ? `${modeColors.accent}15` : "rgba(255,255,255,0.03)",
                        shadowColor: tutorialExpanded ? modeColors.glow : "transparent",
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: tutorialExpanded ? 0.3 : 0,
                        shadowRadius: 8,
                      }}
                    >
                      <Ionicons
                        name={tutorialExpanded ? "chevron-up" : "chevron-down"}
                        size={14}
                        color={tutorialExpanded ? modeColors.accent : "#999"}
                        style={{ marginRight: 6 }}
                      />
                      <Text
                        className="text-xs font-semibold tracking-wider"
                        style={{
                          letterSpacing: 0.5,
                          color: tutorialExpanded ? modeColors.accent : "#999",
                        }}
                      >
                        {tutorialExpanded ? "Less" : "More"}
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={handleToggleFavorite}
                      className="border p-2.5 rounded-2xl"
                      style={{
                        borderColor: isFavorite(mainVideo.videoId) ? modeColors.accent : "rgba(255,255,255,0.1)",
                        backgroundColor: isFavorite(mainVideo.videoId) ? `${modeColors.accent}15` : "rgba(255,255,255,0.03)",
                      }}
                    >
                      <Ionicons
                        name={isFavorite(mainVideo.videoId) ? "heart" : "heart-outline"}
                        size={16}
                        color={isFavorite(mainVideo.videoId) ? modeColors.accent : "#999"}
                      />
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        clearMainVideo();
                        setTutorialExpanded(false);
                        setCurrentVideoTitle("");
                        setCurrentChannelTitle("");
                        setCurrentThumbnail("");
                      }}
                      className="border px-4 py-2.5 rounded-2xl"
                      style={{
                        borderColor: "#F87171",
                        backgroundColor: "rgba(248,113,113,0.1)",
                      }}
                    >
                      <Text
                        className="text-xs font-semibold"
                        style={{ letterSpacing: 0.5, color: "#F87171" }}
                      >
                        Clear
                      </Text>
                    </Pressable>
                  </View>

                  {tutorialExpanded && (
                    <View style={{ display: V1_SIMPLE_MODE ? "none" : "flex" }}>
                  {/* Notes Button */}
                  <Pressable
                    onPress={() => {
                      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                      setShowNotesModal(true);
                    }}
                    className="border py-2.5 px-4 rounded-2xl flex-row items-center justify-center mt-3"
                    style={{
                      borderColor: modeColors.accent,
                      backgroundColor: `${modeColors.accent}10`,
                      shadowColor: modeColors.glow,
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.2,
                      shadowRadius: 6,
                    }}
                  >
                    <Ionicons
                      name="create-outline"
                      size={14}
                      color={modeColors.accent}
                      style={{ marginRight: 6 }}
                    />
                    <Text
                      className="text-xs font-semibold tracking-wider"
                      style={{
                        letterSpacing: 0.5,
                        color: modeColors.accent,
                      }}
                    >
                      Instant Notes
                    </Text>
                  </Pressable>

                  {/* Transcript Button */}
                  <Pressable
                    onPress={() => {
                      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                      setShowTranscript(true);
                    }}
                    className="border py-2.5 px-4 rounded-2xl flex-row items-center justify-center mt-2"
                    style={{
                      borderColor: modeColors.accent,
                      backgroundColor: `${modeColors.accent}10`,
                      shadowColor: modeColors.glow,
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.2,
                      shadowRadius: 6,
                    }}
                  >
                    <Ionicons
                      name="document-text-outline"
                      size={14}
                      color={modeColors.accent}
                      style={{ marginRight: 6 }}
                    />
                    <Text
                      className="text-xs font-semibold tracking-wider"
                      style={{
                              display: V1_SIMPLE_MODE ? "none" : "flex",
                        letterSpacing: 0.5,
                        color: modeColors.accent,
                      }}
                    >
                      Video Transcript + AI
                    </Text>
                  </Pressable>

                  {/* Lesson Breakdown Button */}
                  <Pressable
                    onPress={() => {
                      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                      setShowActionSteps(true);
                    }}
                    className="border py-2.5 px-4 rounded-2xl flex-row items-center justify-center mt-2"
                    style={{
                      borderColor: modeColors.accent,
                      backgroundColor: `${modeColors.accent}10`,
                      shadowColor: modeColors.glow,
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.2,
                      shadowRadius: 6,
                    }}
                  >
                    <Ionicons
                      name="list-outline"
                      size={14}
                      color={modeColors.accent}
                      style={{ marginRight: 6 }}
                    />
                    <Text
                      className="text-xs font-semibold tracking-wider"
                      style={{
                        letterSpacing: 0.5,
                        color: modeColors.accent,
                      }}
                    >
                      Lesson Breakdown
                    </Text>
                  </Pressable>

                  {/* AI Voice Translator Button */}
                  <Pressable
                    onPress={() => {
                      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                      setShowVoiceAssist(true);
                    }}
                    className="border py-2.5 px-4 rounded-2xl flex-row items-center justify-between mt-2"
                    style={{
                      borderColor: voiceAssistEnabled ? modeColors.accent : "rgba(255,255,255,0.1)",
                      backgroundColor: voiceAssistEnabled ? `${modeColors.accent}15` : `${modeColors.accent}10`,
                      shadowColor: voiceAssistEnabled ? modeColors.glow : "transparent",
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: voiceAssistEnabled ? 0.3 : 0.2,
                      shadowRadius: 6,
                    }}
                  >
                    <View className="flex-row items-center" style={{ gap: 6 }}>
                      <Ionicons
                        name="language"
                        size={14}
                        color={modeColors.accent}
                      />
                      <Text
                        className="text-xs font-semibold tracking-wider"
                        style={{
                          letterSpacing: 0.5,
                          color: modeColors.accent,
                        }}
                      >
                        AI Voice Translator
                      </Text>
                    </View>
                    {voiceAssistEnabled && (
                      <View
                        className="w-2 h-2 rounded-full"
                        style={{
                          backgroundColor: modeColors.accent,
                          shadowColor: modeColors.glow,
                          shadowOffset: { width: 0, height: 0 },
                          shadowOpacity: 0.8,
                          shadowRadius: 4,
                        }}
                      />
                    )}
                  </Pressable>

                    </View>
                  )}
                  {/* Expanded Advanced Controls */}
                  {tutorialExpanded && (
                    <View className="mt-4 pt-4 border-t" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                      {/* Progress Slider */}
                      <View className="mb-4">
                        <View className="flex-row items-center justify-between mb-2">
                          <Text
                            className="text-gray-500 text-xs"
                            style={{ letterSpacing: 0.3 }}
                          >
                            Progress {loopEnabled ? "• Loop Active" : ""}
                          </Text>
                          <Text
                            className="text-gray-500 text-xs"
                            style={{ fontFamily: "monospace" }}
                          >
                            {formatTime(youtubeCurrentTime)} / {formatTime(youtubeDuration)}
                          </Text>
                        </View>
                        <Animated.View
                          className="border p-2 rounded-2xl relative"
                          style={[{
                            borderColor: loopEnabled ? modeColors.accent : "rgba(255,255,255,0.1)",
                            backgroundColor: "rgba(0,0,0,0.3)",
                          }, animatedProgressStyleA]}
                        >
                          {/* Loop Range Indicator Bar */}
                          {loopEnabled && youtubeDuration > 0 && loopEnd > loopStart && (
                            <View
                              className="absolute rounded-xl"
                              style={{
                                left: `${(loopStart / youtubeDuration) * 100}%`,
                                width: `${((loopEnd - loopStart) / youtubeDuration) * 100}%`,
                                height: 34,
                                top: 6,
                                backgroundColor: `${modeColors.accent}25`,
                                borderLeftWidth: 2,
                                borderRightWidth: 2,
                                borderColor: modeColors.accent,
                                zIndex: 1,
                              }}
                            >
                              {/* Loop markers */}
                              <View className="absolute left-0 top-0 bottom-0 w-0.5" style={{ backgroundColor: modeColors.accent }} />
                              <View className="absolute right-0 top-0 bottom-0 w-0.5" style={{ backgroundColor: modeColors.accent }} />
                            </View>
                          )}
                          <Slider
                            style={{ width: "100%", height: 30, zIndex: 2 }}
                            minimumValue={0}
                            maximumValue={youtubeDuration}
                            step={1}
                            value={youtubeCurrentTime}
                            onValueChange={seekYoutube}
                            onTouchStart={() => {
                              progressGlowA.value = withSpring(0.6);
                            }}
                            onTouchEnd={() => {
                              progressGlowA.value = withSpring(0);
                            }}
                            minimumTrackTintColor={modeColors.accent}
                            maximumTrackTintColor="#1a1a1a"
                            thumbTintColor={modeColors.accent}
                          />
                        </Animated.View>
                      </View>

                      {/* Advanced Features */}
                      <View className="space-y-3">
                        <Pressable
                          onPress={() => {
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                            setShowLoopModal(true);
                          }}
                          className="border py-2.5 px-4 rounded-xl flex-row items-center justify-between"
                          style={{
                            borderColor: loopEnabled ? modeColors.accent : "rgba(255,255,255,0.1)",
                            backgroundColor: loopEnabled ? `${modeColors.accent}15` : "rgba(0,0,0,0.3)",
                          }}
                        >
                          <Text
                            className="text-xs font-semibold"
                            style={{
                              letterSpacing: 0.3,
                              color: loopEnabled ? modeColors.accent : "#999"
                            }}
                          >
                            Loop Section {loopEnabled ? "(Active)" : ""}
                          </Text>
                          <Ionicons
                            name="repeat"
                            size={14}
                            color={loopEnabled ? modeColors.accent : "#666"}
                          />
                        </Pressable>
                        <Pressable
                          onPress={() => {
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                            setShowTranscript(true);
                          }}
                          className="border py-2.5 px-4 rounded-xl flex-row items-center justify-between mt-2"
                          style={{
                            borderColor: "rgba(255,255,255,0.1)",
                            backgroundColor: "rgba(0,0,0,0.3)",
                          }}
                        >
                          <Text className="text-xs text-gray-400" style={{ letterSpacing: 0.3 }}>
                            Transcript + AI
                          </Text>
                          <Ionicons name="document-text" size={14} color="#666" />
                        </Pressable>
                        <Pressable
                          onPress={() => {
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                            setShowTranscript(true);
                          }}
                          className="border py-2.5 px-4 rounded-xl flex-row items-center justify-between mt-2"
                          style={{
                            borderColor: "rgba(255,255,255,0.1)",
                            backgroundColor: "rgba(0,0,0,0.3)",
                          }}
                        >
                          <Text className="text-xs text-gray-400" style={{
                              display: V1_SIMPLE_MODE ? "none" : "flex", letterSpacing: 0.3 }}>
                            AI Chat
                          </Text>
                          <Ionicons name="chatbubbles" size={14} color="#666" />
                        </Pressable>
                        <Pressable
                          onPress={() => {
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                            setShowTranscript(true);
                          }}
                          className="border py-2.5 px-4 rounded-xl flex-row items-center justify-between mt-2"
                          style={{
                            borderColor: "rgba(255,255,255,0.1)",
                            backgroundColor: "rgba(0,0,0,0.3)",
                          }}
                        >
                          <Text className="text-xs text-gray-400" style={{ letterSpacing: 0.3 }}>
                            Translate
                          </Text>
                          <Ionicons name="language" size={14} color="#666" />
                        </Pressable>
                        <Pressable
                          onPress={() => {
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                            setShowSpeedModal(true);
                          }}
                          className="border py-2.5 px-4 rounded-xl flex-row items-center justify-between mt-2"
                          style={{
                            borderColor: playbackSpeed !== 1.0 ? modeColors.accent : "rgba(255,255,255,0.1)",
                            backgroundColor: playbackSpeed !== 1.0 ? `${modeColors.accent}15` : "rgba(0,0,0,0.3)",
                          }}
                        >
                          <Text
                            className="text-xs font-semibold"
                            style={{
                              letterSpacing: 0.3,
                              color: playbackSpeed !== 1.0 ? modeColors.accent : "#999"
                            }}
                          >
                            Speed Control {playbackSpeed !== 1.0 ? `(${playbackSpeed}x)` : ""}
                          </Text>
                          <Ionicons
                            name="speedometer"
                            size={14}
                            color={playbackSpeed !== 1.0 ? modeColors.accent : "#666"}
                          />
                        </Pressable>
                      </View>
                    </View>
                  )}
                </View>
              )}
            </View>
          </View>
          </BlurView>
        </View>

        {/* Music Channel Section */}
        <View className={isHardware ? "px-3 mb-4" : "px-6 mb-8"}>
          <BlurView intensity={isHardware ? 8 : 20} tint={isHardware ? "light" : "dark"} className="overflow-hidden" style={isHardware ? {
            borderWidth: 1,
            borderColor: hardwarePalette.line,
            borderRadius: 10,
            backgroundColor: hardwarePalette.shellLight,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 5 },
            shadowOpacity: 0.18,
            shadowRadius: 7,
          } : {
            borderWidth: 1.5,
            borderColor: musicSource ? `${modeColors.accent}50` : "rgba(255,255,255,0.12)",
            borderRadius: 24,
            backgroundColor: "rgba(30,30,30,0.5)",
            shadowColor: musicSource ? modeColors.glow : "#5FD4F4",
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: musicSource ? 0.25 : 0.12,
            shadowRadius: 24,
          }}>
          <View
            className="overflow-hidden"
            style={{
              backgroundColor: "transparent",
            }}
          >
            {/* Section Label - Premium Style */}
            <View
              className="px-4 py-3 border-b flex-row items-center justify-between"
              style={{
                backgroundColor: isHardware ? "#2a2b2c" : (musicSource ? `${modeColors.accent}12` : "rgba(255,255,255,0.02)"),
                borderColor: isHardware ? hardwarePalette.line : (musicSource ? `${modeColors.accent}20` : "rgba(255,255,255,0.08)"),
                minHeight: isHardware ? 46 : undefined,
              }}
            >
              {isHardware ? (
                <>
                  <HardwareSectionTitle title="SOUNDTRACK" detail="SELECT A SOURCE / BUILD YOUR VIBE" />
                  <View style={{ marginLeft: 12 }}><HardwareScrew size={12} /></View>
                </>
              ) : <><Text
                className="text-xs font-bold tracking-widest"
                style={{
                  fontFamily: "monospace",
                  letterSpacing: 3,
                  color: musicSource ? modeColors.accent : "#666",
                  opacity: 0.8,
                }}
              >
                SOUNDTRACK
              </Text>
              <View
                className="w-2 h-2 rounded-full"
                style={{
                  backgroundColor: musicSource ? modeColors.accent : "#333",
                  shadowColor: musicSource ? modeColors.glow : "transparent",
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.8,
                  shadowRadius: 4,
                }}
              /></>}
            </View>

            {/* Audio Source Selector - Horizontal */}
            {!V1_SIMPLE_MODE && (!musicSource || isHardware) && (
              <View
                className="p-4 border-b"
                style={{
                  borderColor: isHardware ? "#171819" : "rgba(255,255,255,0.08)",
                  backgroundColor: isHardware ? "#292a2b" : "rgba(0,0,0,0.3)",
                  flexDirection: "row",
                  alignItems: "center",
                  gap: isHardware ? 12 : 0,
                }}
              >
                <ScrollView
                  horizontal={isHardware ? false : true}
                  showsHorizontalScrollIndicator={false}
                  style={{ flex: 1, width: "100%" }}
                  contentContainerStyle={isHardware ? { flexGrow: 1, width: "100%" } : { flexGrow: 1 }}
                >
                  <View
                    className="flex-row"
                    style={{
                      gap: 10,
                      alignItems: "center",
                      flexGrow: 1,
                      flexWrap: isHardware ? "wrap" : "nowrap",
                      justifyContent: isHardware ? "center" : "flex-start",
                      width: isHardware ? "100%" : undefined,
                    }}
                  >
                    {[
                      { id: "soundcloud", label: "SNDCLD", icon: "cloud-outline", color: "#FF5500" },
                      { id: "local", label: "MY MUSIC", icon: "musical-notes", color: modeColors.accent },
                      { id: "mixcloud", label: "MIXCLOUD", icon: "cloud", color: "#FF7F00" },
                      { id: "bandcamp", label: "BNDCP", icon: "radio", color: "#1DA0C3" },
                      { id: "apple-music", label: "APPLE", icon: "logo-apple", color: "#FC3C44" },
                      { id: "spotify", label: "SPOTIFY", icon: "musical-note", color: "#1DB954" },
                    ].filter((source) => !V1_SIMPLE_MODE || source.id === "local").map((source) => (
                      <Pressable
                        key={source.id}
                        onPress={async () => {
                          if (source.id === musicSource) return;
                          await cleanupAudio();
                          setCurrentTrack("");
                          setIsPlaying(false);
                          setMusicError("");
                          setMusicSource(source.id as MusicSource);
                        }}
                        className="border px-4 py-3 rounded-2xl flex-row items-center"
                        style={isHardware ? [
                          hardwareRaisedButton(source.id === musicSource),
                          {
                            width: V1_SIMPLE_MODE ? "100%" : "31%",
                            minWidth: 96,
                            minHeight: 92,
                            flexGrow: 1,
                            paddingHorizontal: 8,
                            paddingVertical: 14,
                            gap: 9,
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                          }
                        ] : {
                          borderColor: `${source.color}40`,
                          backgroundColor: `${source.color}15`,
                          shadowColor: source.color,
                          shadowOffset: { width: 0, height: 4 },
                          shadowOpacity: 0.35,
                          shadowRadius: 12,
                          gap: 8,
                        }}
                      >
                        <Ionicons
                          name={source.icon as any}
                          size={isHardware ? 25 : 16}
                          color={isHardware ? "#111111" : source.color}
                        />
                        <Text
                          className="text-xs font-bold tracking-wider whitespace-nowrap"
                          style={{
                            fontFamily: isHardware ? "Arial Black" : "monospace",
                            color: isHardware ? "#161616" : source.color,
                            fontSize: isHardware ? 11 : undefined,
                            fontWeight: isHardware ? "800" : undefined,
                            letterSpacing: isHardware ? 0.8 : undefined,
                            textAlign: "center",
                            textShadowColor: isHardware ? "transparent" : source.color,
                            textShadowOffset: { width: 0, height: 0 },
                            textShadowRadius: 6,
                          }}
                        >
                          {source.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>
                {isHardware ? null : null}
              </View>
            )}

            {/* Music Player */}
            <View className="border-b overflow-hidden relative" style={{ minHeight: 220, marginHorizontal: isHardware ? 18 : 0, marginTop: isHardware ? 12 : 0, borderRadius: isHardware ? 12 : 16, backgroundColor: "#121314", borderColor: isHardware ? "#77736e" : "rgba(255,255,255,0.08)", borderWidth: isHardware ? 1 : 0 }}>
              {/* Decorative visualizer behind the existing playback controls. */}
              {visualizerEnabled && (musicSource === "local" ? (
                <MusicWaveform isActive={isPlaying} />
              ) : (
                <AudioVisualizer
                  mode={audioMode}
                  audioLevel={channelBGain}
                  isActive={isPlaying}
                  opacity={1}
                />
              ))}

              {musicSource === "local" ? (
                <View className="flex-1 justify-between py-6 px-6" style={{ zIndex: 2 }}>
                  {currentTrack ? (
                    <>
                      {/* Song Title - Heavily Dimmed */}
                      <View className="w-full px-4 pt-2">
                        <Text
                          className="text-center font-medium tracking-wide"
                          style={{
                            fontFamily: "monospace",
                            color: modeColors.accent,
                            fontSize: 13,
                            opacity: 0.50,
                            textShadowColor: modeColors.glow,
                            textShadowOffset: { width: 0, height: 0 },
                            textShadowRadius: 2,
                          }}
                          numberOfLines={2}
                        >
                          {currentTrack}
                        </Text>
                      </View>

                      {/* Spacer to push buttons to bottom */}
                      <View style={{ flex: 1 }} />

                      <Text
                        style={{
                          textAlign: "center",
                          color: "#8f9398",
                          fontFamily: "monospace",
                          fontSize: 10,
                          marginBottom: 10,
                          letterSpacing: 1.5,
                        }}
                      >
                        {localQueue.length > 0
                          ? `TRACK ${localTrackIndex + 1} / ${localQueue.length}`
                          : ""}
                      </Text>

                      <View
                        className="flex-row justify-center pb-2"
                        style={{ gap: 8 }}
                      >
                        <Pressable
                          onPress={playPreviousLocalTrack}
                          className="rounded-full px-4 py-3"
                          style={{
                            backgroundColor: "rgba(255,255,255,0.12)",
                            borderWidth: 1,
                            borderColor: "rgba(255,255,255,0.2)",
                          }}
                        >
                          <Text style={{ color: "#bbb", fontFamily: "monospace", fontSize: 11 }}>
                            ◀ PREV
                          </Text>
                        </Pressable>

                        <Pressable
                          onPress={togglePlayback}
                          className="rounded-full px-5 py-3"
                          style={{
                            backgroundColor: modeColors.accent,
                            opacity: 0.70,
                            shadowColor: modeColors.glow,
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.2,
                            shadowRadius: 6,
                          }}
                        >
                          <Text
                            style={{
                              fontFamily: "monospace",
                              color: "#000",
                              fontSize: 11,
                              fontWeight: "700",
                              letterSpacing: 1,
                            }}
                          >
                            {isPlaying ? "PAUSE" : "PLAY"}
                          </Text>
                        </Pressable>

                        <Pressable
                          onPress={playNextLocalTrack}
                          className="rounded-full px-4 py-3"
                          style={{
                            backgroundColor: "rgba(255,255,255,0.12)",
                            borderWidth: 1,
                            borderColor: "rgba(255,255,255,0.2)",
                          }}
                        >
                          <Text style={{ color: "#bbb", fontFamily: "monospace", fontSize: 11 }}>
                            NEXT ▶
                          </Text>
                        </Pressable>
                      </View>

                      {!V1_SIMPLE_MODE && (                      <Pressable
                        onPress={handlePickLocalMusic}
                        style={{ alignSelf: "center", paddingHorizontal: 12, paddingVertical: 6 }}
                      >
                        <Text
                          style={{
                            color: "#777",
                            fontFamily: "monospace",
                            fontSize: 9,
                            letterSpacing: 1.5,
                          }}
                        >
                          LOAD NEW PLAYLIST
                        </Text>
                      </Pressable>)}
                    </>
                  ) : (
                    <View className="flex-1 items-center justify-center">
                      <Pressable
                        onPress={handlePickLocalMusic}
                        className="rounded-full px-10 py-4"
                        style={{
                          backgroundColor: modeColors.accent,
                          opacity: 0.75,
                          shadowColor: modeColors.glow,
                          shadowOffset: { width: 0, height: 4 },
                          shadowOpacity: 0.3,
                          shadowRadius: 10,
                        }}
                      >
                        <Text
                          className="text-sm font-bold text-center tracking-widest"
                          style={{
                            fontFamily: "monospace",
                            color: "#000",
                            letterSpacing: 3,
                          }}
                        >
                          SELECT MUSIC
                        </Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              ) : musicSource === "soundcloud" ? (
                <View style={{ height: soundCloudUrl ? 320 : 190, zIndex: 2 }}>
                  <View style={{ paddingHorizontal: 12, paddingTop: 12, gap: 10 }}>
                    {!soundCloudUrl && (
                      <Text
                        style={{
                          color: "#d8d8d8",
                          fontFamily: "monospace",
                          fontSize: 10,
                          fontWeight: "700",
                          letterSpacing: 1.5,
                        }}
                      >
                        PASTE SOUNDCLOUD LINK
                      </Text>
                    )}
                    <TextInput value={soundCloudInput} onChangeText={setSoundCloudInput}
                      placeholder="Track or playlist URL" placeholderTextColor="#707276"
                      accessibilityLabel="SoundCloud track or playlist URL" autoCapitalize="none" autoCorrect={false}
                      style={{
                        width: "100%",
                        minHeight: 46,
                        color: "#f2f2f2",
                        fontSize: 13,
                        backgroundColor: "#111214",
                        borderWidth: 1,
                        borderColor: "#55585c",
                        borderRadius: 8,
                        paddingHorizontal: 12,
                      }} />
                    <Pressable
                      disabled={soundCloudLoading || !soundCloudInput.trim()}
                      style={{
                        width: "100%",
                        minHeight: 46,
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: 8,
                        backgroundColor:
                          soundCloudLoading || !soundCloudInput.trim()
                            ? "#343638"
                            : modeColors.accent,
                      }}
                      onPress={async () => {
                      soundCloudLoad.current?.abort();
                      const request = new AbortController();
                      soundCloudLoad.current = request;
                      setSoundCloudLoading(true);
                      setMusicError("");
                      const timeout = setTimeout(() => request.abort(), 15000);
                      try {
                        const url = await resolveSoundCloudInput(soundCloudInput, request.signal);
                        if (request.signal.aborted || soundCloudLoad.current !== request) return;
                        if (url !== soundCloudUrl) setIsPlaying(false);
                        setSoundCloudUrl(url);
                        setSoundCloudInput("");
                      } catch (error) {
                        if (soundCloudLoad.current === request) {
                          setMusicError(request.signal.aborted ? "SoundCloud took too long. Try again or paste Share → Embed code." : (error instanceof Error ? error.message : "SoundCloud could not load."));
                        }
                      } finally {
                        clearTimeout(timeout);
                        if (soundCloudLoad.current === request) {
                          soundCloudLoad.current = null;
                          setSoundCloudLoading(false);
                        }
                      }
                    }}>
                      <Text
                        style={{
                          color:
                            soundCloudLoading || !soundCloudInput.trim()
                              ? "#777"
                              : "#111",
                          fontFamily: "monospace",
                          fontWeight: "900",
                          fontSize: 12,
                          letterSpacing: 1.5,
                        }}
                      >
                        {soundCloudLoading ? "LOADING…" : "LOAD SOUNDTRACK"}
                      </Text>
                    </Pressable>
                  </View>
                  {!soundCloudUrl && (
                    <Text
                      style={{
                        color: "#777",
                        paddingHorizontal: 12,
                        paddingTop: 6,
                        fontSize: 10,
                      }}
                    >
                      Private playlist? Use SoundCloud Share → Embed code.
                    </Text>
                  )}
                  {soundCloudUrl && (
                    <>
                      <View style={{ flex: 1 }}>
                        <SoundCloudPlayer
                          key={`soundcloud-${soundCloudUrl}`}
                          ref={soundCloudRef}
                          url={soundCloudUrl}
                          volume={musicVolume}
                          onPlayingChange={setIsPlaying}
                        />
                      </View>

                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 10,
                          paddingHorizontal: 12,
                          paddingTop: 8,
                        }}
                      >
                        <Pressable
                          onPress={() => soundCloudRef.current?.previous()}
                          style={{
                            flex: 1,
                            minHeight: 38,
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor: "#222426",
                            borderWidth: 1,
                            borderColor: "#5f6266",
                            borderRadius: 6,
                          }}
                        >
                          <Text
                            style={{
                              color: "#e8e8e8",
                              fontFamily: "monospace",
                              fontSize: 11,
                              fontWeight: "700",
                              letterSpacing: 1.5,
                            }}
                          >
                            ◀ PREV
                          </Text>
                        </Pressable>

                        <Pressable
                          onPress={() => soundCloudRef.current?.toggle()}
                          style={{
                            flex: 1.2,
                            minHeight: 38,
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor: modeColors.accent,
                            borderRadius: 6,
                          }}
                        >
                          <Text
                            style={{
                              color: "#111",
                              fontFamily: "monospace",
                              fontSize: 11,
                              fontWeight: "900",
                              letterSpacing: 1.5,
                            }}
                          >
                            {isPlaying ? "PAUSE" : "PLAY"}
                          </Text>
                        </Pressable>

                        <Pressable
                          onPress={() => soundCloudRef.current?.next()}
                          style={{
                            flex: 1,
                            minHeight: 38,
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor: "#222426",
                            borderWidth: 1,
                            borderColor: "#5f6266",
                            borderRadius: 6,
                          }}
                        >
                          <Text
                            style={{
                              color: "#e8e8e8",
                              fontFamily: "monospace",
                              fontSize: 11,
                              fontWeight: "700",
                              letterSpacing: 1.5,
                            }}
                          >
                            NEXT ▶
                          </Text>
                        </Pressable>
                      </View>
                    </>
                  )}
                </View>
              ) : musicSource === "bandcamp" || musicSource === "mixcloud" || musicSource === "apple-music" || musicSource === "spotify" ? (
                <View style={{ height: 200, zIndex: 2 }}>
                  {Platform.OS === "web" ? (
                    <View className="flex-1 items-center justify-center p-6" style={{ backgroundColor: "#0a0a0a" }}>
                      <Text
                        style={{
                          fontFamily: "monospace",
                          fontSize: 14,
                          letterSpacing: 2,
                          color: modeColors.accent,
                          textAlign: "center",
                          marginBottom: 8,
                        }}
                      >
                        {musicSource?.toUpperCase().replace("-", " ")}
                      </Text>
                      <Text
                        style={{
                          fontFamily: "monospace",
                          fontSize: 10,
                          letterSpacing: 1,
                          color: "#666",
                          textAlign: "center",
                        }}
                      >
                        Available on iOS App
                      </Text>
                    </View>
                  ) : (
                    <WebView
                      ref={musicWebViewRef}
                      source={{ uri: getMusicSourceUrl() }}
                      allowsInlineMediaPlayback
                      mediaPlaybackRequiresUserAction={false}
                      javaScriptEnabled
                      domStorageEnabled
                      style={{ flex: 1 }}
                    />
                  )}
                </View>
              ) : (
                isHardware ? (
                  <SynthwaveIdleDisplayV2 hideSun={V1_SIMPLE_MODE} hidePrompt={V1_SIMPLE_MODE} />
                ) : (
                  <View style={{ zIndex: 2, minHeight: 220, backgroundColor: "#0a0a0a" }}>
                    <View className="flex-1 items-center justify-center p-6">
                      <Text style={{ color: modeColors.accent, fontFamily: "monospace" }}>
                        NO SOURCE SELECTED
                      </Text>
                    </View>
                  </View>
                )
              )}
            </View>

            {/* Controls */}
            <View className="p-5" style={{ backgroundColor: isHardware ? "#151617" : "rgba(255,255,255,0.02)", marginHorizontal: isHardware ? 18 : 0, marginBottom: isHardware ? 18 : 0, borderBottomLeftRadius: isHardware ? 12 : 0, borderBottomRightRadius: isHardware ? 12 : 0 }}>
              {V1_SIMPLE_MODE && (
                <View style={{ marginBottom: musicSource ? 18 : 0 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 9 }}>
                    <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: hardwarePalette.orange, borderWidth: 1, borderColor: "#bd3414" }} />
                    <Text style={{ color: "#e8e9e5", fontFamily: "monospace", fontSize: 13, fontWeight: "900", letterSpacing: 2 }}>AUDIO FILES</Text>
                  </View>
                  <Pressable onPress={handlePickLocalMusic} style={{ minHeight: 50, borderRadius: 7, borderWidth: 1, borderColor: "#d13917", backgroundColor: hardwarePalette.orange, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 18, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4 }}>
                    <Text style={{ color: "#111", fontFamily: "monospace", fontWeight: "900", fontSize: 14, letterSpacing: 2 }}>{musicSource ? "LOAD NEW PLAYLIST" : "CHOOSE AUDIO"}</Text>
                    <Ionicons name="folder-open-outline" size={18} color="#111" />
                  </Pressable>
                </View>
              )}
              {musicSource ? (
                <View>
                  {musicError ? <Text accessibilityRole="alert" style={{ color: "#FF9A5A", marginBottom: 12 }}>{musicError}</Text> : null}
                  {/* Simplified Controls */}
                  {((musicSource === "local" && currentTrack) || (musicSource === "soundcloud" && soundCloudUrl)) && (
                    <View>
                      <View className="flex-row items-center justify-between mb-4">
                        <View className="flex-row items-center" style={{ gap: 6 }}>
                          <Text
                            className="text-gray-400 text-sm font-medium"
                            style={{ letterSpacing: 0.3 }}
                          >
                            Music
                          </Text>
                          {isDucking && (
                            <Text
                              className="text-xs"
                              style={{ fontFamily: "monospace", color: "#FF9A5A" }}
                            >
                              [DUCK]
                            </Text>
                          )}
                        </View>
                        <View className="flex-row items-center" style={{ gap: 8 }}>
                          <View
                            className="px-3 py-1.5 border rounded-xl"
                            style={{
                              borderColor: "rgba(255,255,255,0.1)",
                              backgroundColor: "rgba(255,255,255,0.04)",
                            }}
                          >
                            <Text
                              className="text-white text-xs font-bold"
                              style={{ fontFamily: "monospace" }}
                            >
                              {channelBGain}
                            </Text>
                          </View>
                          <Pressable
                            onPress={togglePlayback}
                            className="border p-2 rounded-xl"
                            style={{
                              borderColor: "rgba(255,255,255,0.1)",
                              backgroundColor: "rgba(255,255,255,0.04)",
                            }}
                          >
                            <Ionicons
                              name={isPlaying ? "pause" : "play"}
                              size={16}
                              color="#5FD4F4"
                            />
                          </Pressable>
                        </View>
                      </View>

                      {/* Volume Slider */}
                      <Animated.View
                        className="border p-2 rounded-2xl mb-4"
                        style={[{
                          borderColor: "rgba(255,255,255,0.1)",
                          backgroundColor: "rgba(0,0,0,0.3)",
                        }, animatedSliderStyleB]}
                      >
                        <Slider
                          style={{ width: "100%", height: 30 }}
                          minimumValue={0}
                          maximumValue={100}
                          step={1}
                          accessibilityLabel="Music volume"
                          value={channelBGain}
                          onValueChange={(value) => {
                            setMusicVideoVolume(value);
                          }}
                          onTouchStart={() => {
                            sliderGlowB.value = withSpring(0.6);
                          }}
                          onTouchEnd={() => {
                            sliderGlowB.value = withSpring(0);
                          }}
                          minimumTrackTintColor="#5FD4F4"
                          maximumTrackTintColor="#1a1a1a"
                          thumbTintColor="#5FD4F4"
                        />
                      </Animated.View>
                    </View>
                  )}

                  {/* Expand/Clear Row */}
                  <View className="flex-row" style={{ gap: 10 }}>
                    <Pressable
                      onPress={() => {
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        setMusicExpanded(!musicExpanded);
                      }}
                      className="flex-1 border py-2.5 rounded-2xl flex-row items-center justify-center"
                      style={{
                        borderColor: musicExpanded ? "#5FD4F4" : "rgba(255,255,255,0.1)",
                        backgroundColor: musicExpanded ? "rgba(95,212,244,0.15)" : "rgba(255,255,255,0.03)",
                        shadowColor: musicExpanded ? "#5FD4F4" : "transparent",
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: musicExpanded ? 0.3 : 0,
                        shadowRadius: 8,
                      }}
                    >
                      <Ionicons
                        name={musicExpanded ? "chevron-up" : "chevron-down"}
                        size={14}
                        color={musicExpanded ? "#5FD4F4" : "#999"}
                        style={{ marginRight: 6 }}
                      />
                      <Text
                        className="text-xs font-semibold tracking-wider"
                        style={{
                          letterSpacing: 0.5,
                          color: musicExpanded ? "#5FD4F4" : "#999",
                        }}
                      >
                        {musicExpanded ? "Less" : "More"}
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        clearMusicSource();
                        setMusicExpanded(false);
                      }}
                      className="border px-4 py-2.5 rounded-2xl"
                      style={{
                        borderColor: "#F87171",
                        backgroundColor: "rgba(248,113,113,0.1)",
                      }}
                    >
                      <Text
                        className="text-xs font-semibold"
                        style={{ letterSpacing: 0.5, color: "#F87171" }}
                      >
                        Clear
                      </Text>
                    </Pressable>
                  </View>

                  {/* Expanded Advanced Controls */}
                  {musicExpanded && (
                    <View className="mt-4 pt-4 border-t" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                      {/* Source Info */}
                      <Text
                        className="text-xs tracking-wider mb-4"
                        style={{ fontFamily: "monospace", color: "#5FD4F4" }}
                      >
                        SOURCE: {musicSource.toUpperCase().replace("-", " ")}
                      </Text>

                      {/* Auto-Duck Toggle */}
                      <Pressable
                        onPress={() => {
                          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                          const newValue = !autoDuckEnabled;
                          setAutoDuckEnabled(newValue);
                        }}
                        className="border px-4 py-2.5 rounded-2xl mb-4 flex-row items-center justify-between"
                        style={{
                          borderColor: autoDuckEnabled ? "#5FD4F4" : "rgba(255,255,255,0.1)",
                          backgroundColor: autoDuckEnabled ? "rgba(95,212,244,0.15)" : "rgba(255,255,255,0.03)",
                          shadowColor: autoDuckEnabled ? "#5FD4F4" : "transparent",
                          shadowOffset: { width: 0, height: 4 },
                          shadowOpacity: autoDuckEnabled ? 0.3 : 0,
                          shadowRadius: 8,
                        }}
                      >
                        <View className="flex-row items-center" style={{ gap: 8 }}>
                          <Text
                            className="text-xs font-bold tracking-wider"
                            style={{
                              fontFamily: "monospace",
                              color: autoDuckEnabled ? "#5FD4F4" : "#666",
                            }}
                          >
                            SMARTMIX AUTO-DUCK
                          </Text>
                          {isDucking && (
                            <View
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ backgroundColor: "#FF9A5A" }}
                            />
                          )}
                        </View>
                        <Ionicons
                          name={autoDuckEnabled ? "checkmark-circle" : "ellipse-outline"}
                          size={18}
                          color={autoDuckEnabled ? "#5FD4F4" : "#666"}
                        />
                      </Pressable>

                      {musicSource === "local" && currentTrack && (
                        <View>
                          {/* Progress Slider */}
                          <View className="mb-4">
                            <View className="flex-row items-center justify-between mb-2">
                              <Text
                                className="text-gray-500 text-xs tracking-wider"
                                style={{ fontFamily: "monospace" }}
                              >
                                PROGRESS:
                              </Text>
                              <Text
                                className="text-gray-500 text-xs"
                                style={{ fontFamily: "monospace" }}
                              >
                                {formatTime(audioCurrentTime)} / {formatTime(audioDuration)}
                              </Text>
                            </View>
                            <Animated.View
                              className="border p-2 rounded-2xl"
                              style={[{
                                borderColor: "rgba(255,255,255,0.1)",
                                backgroundColor: "rgba(0,0,0,0.3)",
                              }, animatedProgressStyleB]}
                            >
                              <Slider
                                style={{ width: "100%", height: 30 }}
                                minimumValue={0}
                                maximumValue={audioDuration}
                                step={1}
                                value={audioCurrentTime}
                                onValueChange={seekAudio}
                                onTouchStart={() => {
                                  progressGlowB.value = withSpring(0.6);
                                }}
                                onTouchEnd={() => {
                                  progressGlowB.value = withSpring(0);
                                }}
                                minimumTrackTintColor="#5FD4F4"
                                maximumTrackTintColor="#1a1a1a"
                                thumbTintColor="#5FD4F4"
                              />
                            </Animated.View>
                          </View>

                          {/* Change Track Button */}
                          <Pressable
                            onPress={handlePickLocalMusic}
                            className="border py-2.5 px-4 rounded-xl flex-row items-center justify-between"
                            style={{
                              borderColor: "rgba(255,255,255,0.1)",
                              backgroundColor: "rgba(0,0,0,0.3)",
                            }}
                          >
                            <Text className="text-xs text-gray-400" style={{ fontFamily: "monospace" }}>
                              Change Track
                            </Text>
                            <Ionicons name="musical-notes" size={14} color="#666" />
                          </Pressable>
                        </View>
                      )}

                      {/* Advanced Features Placeholder */}
                      <View className="mt-4 space-y-3">
                        <Pressable
                          className="border py-2.5 px-4 rounded-xl flex-row items-center justify-between"
                          style={{
                            borderColor: "rgba(255,255,255,0.1)",
                            backgroundColor: "rgba(0,0,0,0.3)",
                          }}
                        >
                          <Text className="text-xs text-gray-400" style={{ letterSpacing: 0.3 }}>
                            Preset Library
                          </Text>
                          <Ionicons name="library" size={14} color="#666" />
                        </Pressable>
                        <Pressable
                          className="border py-2.5 px-4 rounded-xl flex-row items-center justify-between mt-2"
                          style={{
                            borderColor: "rgba(255,255,255,0.1)",
                            backgroundColor: "rgba(0,0,0,0.3)",
                          }}
                        >
                          <Text className="text-xs text-gray-400" style={{ letterSpacing: 0.3 }}>
                            Browse Local Files
                          </Text>
                          <Ionicons name="folder" size={14} color="#666" />
                        </Pressable>
                      </View>
                    </View>
                  )}
                </View>
              ) : V1_SIMPLE_MODE ? null : (
                <View className="border border-dashed py-3 rounded-2xl" style={{
                  borderColor: "rgba(255,255,255,0.2)",
                  backgroundColor: "rgba(255,255,255,0.02)",
                }}>
                  <Text
                    className="text-gray-700 text-xs text-center tracking-wider"
                    style={{ fontFamily: "monospace" }}
                  >
                    NO SOURCE SELECTED
                  </Text>
                </View>
              )}
            </View>
          </View>
          </BlurView>
        </View>

        {/* Bottom HUD - Firmware Style Footer */}
        {isHardware ? (
          <HardwareFooter onClassic={() => setVisualStyle("classic")} />
        ) : <View className="px-6 pb-6 mt-4">
          <View
            className="border-t pt-4"
            style={{ borderColor: "rgba(255,255,255,0.05)" }}
          >
            <View className="flex-row items-center justify-between mb-2">
              <Text
                className="text-gray-700 text-xs"
                style={{ letterSpacing: 0.3, opacity: 0.4 }}
              >
                3L3V8R v1.0.0
              </Text>
              <View className="flex-row items-center" style={{ gap: 8 }}>
                <View className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "#10B981" }} />
                <Text
                  className="text-gray-700 text-xs"
                  style={{ letterSpacing: 0.3, opacity: 0.4 }}
                >
                  Active
                </Text>
              </View>
            </View>
          </View>
        </View>}
      </ScrollView>

      {/* Main Video URL Input Modal */}
      {showMainInput && (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View
            className="absolute inset-0 items-center justify-center px-6"
            style={{ backgroundColor: "rgba(0,0,0,0.90)" }}
          >
            <BlurView intensity={40} tint="dark" className="w-full max-w-md rounded-3xl overflow-hidden" style={{
              borderWidth: 1,
              borderColor: modeColors.accent,
              backgroundColor: "rgba(10,10,10,0.6)",
              shadowColor: modeColors.glow,
              shadowOffset: { width: 0, height: 12 },
              shadowOpacity: 0.4,
              shadowRadius: 24,
            }}>
            <View
              className="w-full max-w-md overflow-hidden"
              style={{ backgroundColor: "transparent" }}
            >
              <View
                className="px-4 py-3 border-b"
                style={{
                  backgroundColor: "rgba(255,255,255,0.02)",
                  borderColor: `${modeColors.accent}50`,
                }}
              >
                <Text
                  className="text-sm font-bold tracking-widest"
                  style={{ fontFamily: "monospace", color: modeColors.accent }}
                >
                  VIDEO URL INPUT
                </Text>
              </View>
              <View className="p-5">
                <TextInput
                  value={mainUrlInput}
                  onChangeText={setMainUrlInput}
                  placeholder="PASTE YOUTUBE URL..."
                  placeholderTextColor="#555"
                  className="bg-black border px-4 py-3 text-white text-sm mb-5 rounded-2xl"
                  style={{
                    fontFamily: "monospace",
                    borderColor: "rgba(255,255,255,0.2)",
                    backgroundColor: "rgba(255,255,255,0.03)",
                  }}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoFocus
                  onSubmitEditing={handleLoadMainVideo}
                />
                <View className="flex-row" style={{ gap: 10 }}>
                  <Pressable
                    onPress={handleLoadMainVideo}
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
                      LOAD
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                      setShowMainInput(false);
                      setMainUrlInput("");
                      Keyboard.dismiss();
                    }}
                    className="flex-1 border py-3 rounded-2xl"
                    style={{
                      borderColor: "rgba(255,255,255,0.25)",
                      backgroundColor: "rgba(255,255,255,0.04)",
                    }}
                  >
                    <Text
                      className="font-bold text-xs text-center tracking-widest"
                      style={{ fontFamily: "monospace", color: "#999" }}
                    >
                      CANCEL
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>
            </BlurView>
          </View>
        </TouchableWithoutFeedback>
      )}

        {/* Settings Screen Modal */}
        {showSettings && (
          <View className="absolute inset-0" style={{ zIndex: 100 }}>
            <SettingsScreen onClose={() => setShowSettings(false)} />
          </View>
        )}

        {/* Profile Screen Modal */}
        {showProfile && (
          <View className="absolute inset-0" style={{ zIndex: 100 }}>
            <ProfileScreen onClose={() => setShowProfile(false)} />
          </View>
        )}

        {/* Favorites Screen Modal */}
        {showFavorites && (
          <View className="absolute inset-0" style={{ zIndex: 100 }}>
            <FavoritesScreen
              onClose={() => setShowFavorites(false)}
              onSelectVideo={handleSelectFromFavorites}
            />
          </View>
        )}

        {/* Notes Modal */}
        {showNotesModal && (
          <NotesModal
            onClose={() => setShowNotesModal(false)}
            videoTitle={mainVideo.videoId ? `Tutorial Video` : undefined}
            videoTimestamp={
              mainVideo.videoId && youtubeCurrentTime > 0
                ? formatTime(youtubeCurrentTime)
                : undefined
            }
          />
        )}

        {/* Notes Screen */}
        {showNotesScreen && (
          <View className="absolute inset-0" style={{ zIndex: 100 }}>
            <NotesScreen onClose={() => setShowNotesScreen(false)} />
          </View>
        )}

        {/* Transcript Screen */}
        {showTranscript && mainVideo.videoId && (
          <View className="absolute inset-0" style={{ zIndex: 100 }}>
            <TranscriptScreen
              videoId={mainVideo.videoId}
              videoTitle="Tutorial Video"
              onClose={() => setShowTranscript(false)}
              onSeekTo={async (seconds: number) => {
                try {
                  if (mainPlayerRef.current) {
                    await mainPlayerRef.current.seekTo(seconds, true);
                    setShowTranscript(false);
                  }
                } catch (error) {
                  console.error("Error seeking:", error);
                }
              }}
            />
          </View>
        )}

        {/* Lesson Breakdown Screen */}
        {showActionSteps && mainVideo.videoId && (
          <View className="absolute inset-0" style={{ zIndex: 100 }}>
            <ActionStepsScreen
              videoId={mainVideo.videoId}
              videoTitle="Tutorial Video"
              onClose={() => setShowActionSteps(false)}
            />
          </View>
        )}

        {/* Voice Assist Modal */}
        {showVoiceAssist && (
          <VoiceAssistModal
            onClose={() => setShowVoiceAssist(false)}
            modeColor={modeColors.accent}
          />
        )}

        {/* Loop Modal */}
        {showLoopModal && (
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View
              className="absolute inset-0 items-center justify-center px-6"
              style={{ backgroundColor: "rgba(0,0,0,0.90)" }}
            >
              <BlurView intensity={40} tint="dark" className="w-full max-w-md rounded-3xl overflow-hidden" style={{
                borderWidth: 1,
                borderColor: modeColors.accent,
                backgroundColor: "rgba(10,10,10,0.6)",
                shadowColor: modeColors.glow,
                shadowOffset: { width: 0, height: 12 },
                shadowOpacity: 0.4,
                shadowRadius: 24,
              }}>
                <View className="w-full max-w-md overflow-hidden" style={{ backgroundColor: "transparent" }}>
                  <View
                    className="px-4 py-3 border-b"
                    style={{
                      backgroundColor: "rgba(255,255,255,0.02)",
                      borderColor: `${modeColors.accent}50`,
                    }}
                  >
                    <Text
                      className="text-sm font-bold tracking-widest"
                      style={{ fontFamily: "monospace", color: modeColors.accent }}
                    >
                      LOOP SECTION
                    </Text>
                  </View>
                  <View className="p-5">
                    {/* Current Position */}
                    <Text className="text-gray-400 text-xs mb-2" style={{ fontFamily: "monospace" }}>
                      Current: {formatTime(youtubeCurrentTime)} / {formatTime(youtubeDuration)}
                    </Text>

                    {/* Loop Start */}
                    <Text className="text-white text-xs mb-2" style={{ fontFamily: "monospace" }}>
                      Loop Start: {formatTime(loopStart)}
                    </Text>
                    <View className="border p-2 rounded-2xl mb-4" style={{
                      borderColor: "rgba(255,255,255,0.15)",
                      backgroundColor: "rgba(255,255,255,0.03)",
                    }}>
                      <Slider
                        style={{ width: "100%", height: 30 }}
                        minimumValue={0}
                        maximumValue={youtubeDuration}
                        step={1}
                        value={loopStart}
                        onValueChange={setLoopStart}
                        minimumTrackTintColor={modeColors.accent}
                        maximumTrackTintColor="#1a1a1a"
                        thumbTintColor={modeColors.accent}
                      />
                    </View>

                    {/* Loop End */}
                    <Text className="text-white text-xs mb-2" style={{ fontFamily: "monospace" }}>
                      Loop End: {formatTime(loopEnd)}
                    </Text>
                    <View className="border p-2 rounded-2xl mb-4" style={{
                      borderColor: "rgba(255,255,255,0.15)",
                      backgroundColor: "rgba(255,255,255,0.03)",
                    }}>
                      <Slider
                        style={{ width: "100%", height: 30 }}
                        minimumValue={0}
                        maximumValue={youtubeDuration}
                        step={1}
                        value={loopEnd}
                        onValueChange={setLoopEnd}
                        minimumTrackTintColor={modeColors.accent}
                        maximumTrackTintColor="#1a1a1a"
                        thumbTintColor={modeColors.accent}
                      />
                    </View>

                    {/* Quick Set Buttons */}
                    <View className="flex-row mb-5" style={{ gap: 10 }}>
                      <Pressable
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setLoopStart(youtubeCurrentTime);
                        }}
                        className="flex-1 border py-2 rounded-xl"
                        style={{
                          borderColor: "rgba(255,255,255,0.2)",
                          backgroundColor: "rgba(255,255,255,0.05)",
                        }}
                      >
                        <Text className="text-xs text-center text-gray-400" style={{ fontFamily: "monospace" }}>
                          Set Start Here
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setLoopEnd(youtubeCurrentTime);
                        }}
                        className="flex-1 border py-2 rounded-xl"
                        style={{
                          borderColor: "rgba(255,255,255,0.2)",
                          backgroundColor: "rgba(255,255,255,0.05)",
                        }}
                      >
                        <Text className="text-xs text-center text-gray-400" style={{ fontFamily: "monospace" }}>
                          Set End Here
                        </Text>
                      </Pressable>
                    </View>

                    {/* Action Buttons */}
                    <View className="flex-row" style={{ gap: 10 }}>
                      <Pressable
                        onPress={() => {
                          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                          if (loopEnd > loopStart) {
                            setLoopEnabled(true);
                            setShowLoopModal(false);
                          } else {
                            Alert.alert("Invalid Range", "Loop end must be after loop start");
                          }
                        }}
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
                          ENABLE LOOP
                        </Text>
                      </Pressable>
                      {loopEnabled && (
                        <Pressable
                          onPress={() => {
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                            setLoopEnabled(false);
                            setShowLoopModal(false);
                          }}
                          className="px-4 py-3 border rounded-2xl"
                          style={{
                            borderColor: "#F87171",
                            backgroundColor: "rgba(248,113,113,0.1)",
                          }}
                        >
                          <Text
                            className="font-bold text-xs text-center tracking-widest"
                            style={{ fontFamily: "monospace", color: "#F87171" }}
                          >
                            DISABLE
                          </Text>
                        </Pressable>
                      )}
                      <Pressable
                        onPress={() => {
                          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                          setShowLoopModal(false);
                        }}
                        className="px-4 py-3 border rounded-2xl"
                        style={{
                          borderColor: "rgba(255,255,255,0.25)",
                          backgroundColor: "rgba(255,255,255,0.04)",
                        }}
                      >
                        <Text
                          className="font-bold text-xs text-center tracking-widest"
                          style={{ fontFamily: "monospace", color: "#999" }}
                        >
                          CANCEL
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              </BlurView>
            </View>
          </TouchableWithoutFeedback>
        )}

        {/* Speed Control Modal */}
        {showSpeedModal && (
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View
              className="absolute inset-0 items-center justify-center px-6"
              style={{ backgroundColor: "rgba(0,0,0,0.90)" }}
            >
              <BlurView intensity={40} tint="dark" className="w-full max-w-md rounded-3xl overflow-hidden" style={{
                borderWidth: 1,
                borderColor: modeColors.accent,
                backgroundColor: "rgba(10,10,10,0.6)",
                shadowColor: modeColors.glow,
                shadowOffset: { width: 0, height: 12 },
                shadowOpacity: 0.4,
                shadowRadius: 24,
              }}>
                <View className="w-full max-w-md overflow-hidden" style={{ backgroundColor: "transparent" }}>
                  <View
                    className="px-4 py-3 border-b"
                    style={{
                      backgroundColor: "rgba(255,255,255,0.02)",
                      borderColor: `${modeColors.accent}50`,
                    }}
                  >
                    <Text
                      className="text-sm font-bold tracking-widest"
                      style={{ fontFamily: "monospace", color: modeColors.accent }}
                    >
                      PLAYBACK SPEED
                    </Text>
                  </View>
                  <View className="p-5">
                    {/* Current Speed */}
                    <Text className="text-white text-2xl text-center mb-6" style={{ fontFamily: "monospace" }}>
                      {playbackSpeed.toFixed(2)}x
                    </Text>

                    {/* Speed Presets */}
                    <View className="flex-row flex-wrap mb-5" style={{ gap: 10 }}>
                      {[0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0].map((speed) => (
                        <Pressable
                          key={speed}
                          onPress={async () => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setPlaybackSpeed(speed);
                            // Note: YouTube iframe API doesn't support speed control directly
                            // This would need to be implemented with a custom video player
                          }}
                          className="border px-4 py-2 rounded-xl"
                          style={{
                            borderColor: playbackSpeed === speed ? modeColors.accent : "rgba(255,255,255,0.2)",
                            backgroundColor: playbackSpeed === speed ? `${modeColors.accent}20` : "rgba(255,255,255,0.05)",
                          }}
                        >
                          <Text
                            className="text-xs font-bold"
                            style={{
                              fontFamily: "monospace",
                              color: playbackSpeed === speed ? modeColors.accent : "#999"
                            }}
                          >
                            {speed}x
                          </Text>
                        </Pressable>
                      ))}
                    </View>

                    {/* Info Note */}
                    <View className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-3 mb-5">
                      <Text className="text-gray-500 text-xs text-center" style={{ fontFamily: "monospace", lineHeight: 16 }}>
                        Note: Speed control works best with YouTube Premium. Use YouTube app controls for full speed support.
                      </Text>
                    </View>

                    {/* Action Buttons */}
                    <View className="flex-row" style={{ gap: 10 }}>
                      <Pressable
                        onPress={() => {
                          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                          setShowSpeedModal(false);
                        }}
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
                          DONE
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() => {
                          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                          setPlaybackSpeed(1.0);
                        }}
                        className="px-4 py-3 border rounded-2xl"
                        style={{
                          borderColor: "rgba(255,255,255,0.25)",
                          backgroundColor: "rgba(255,255,255,0.04)",
                        }}
                      >
                        <Text
                          className="font-bold text-xs text-center tracking-widest"
                          style={{ fontFamily: "monospace", color: "#999" }}
                        >
                          RESET
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              </BlurView>
            </View>
          </TouchableWithoutFeedback>
        )}
      </AnimatedView>
    </LinearGradient>
    </View>
  );
};
