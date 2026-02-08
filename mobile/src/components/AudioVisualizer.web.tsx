import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { AudioMode } from "../state/appStore";

interface AudioVisualizerProps {
  mode: AudioMode;
  audioLevel: number;
  isActive: boolean;
  opacity?: number;
  showLabel?: boolean;
}

const getModeColors = (mode: AudioMode) => {
  switch (mode) {
    case "FOCUS":
      return { accent: "#FF9A5A", glow: "#FF9A5A", secondary: "#FFB380" };
    case "STUDY":
      return { accent: "#5FD4F4", glow: "#5FD4F4", secondary: "#8DE4FF" };
    case "CHILL":
      return { accent: "#A78BFA", glow: "#A78BFA", secondary: "#C4B5FD" };
    case "FLOW":
      return { accent: "#5EEAD4", glow: "#5EEAD4", secondary: "#99F6E4" };
    case "DEEP":
      return { accent: "#F87171", glow: "#F87171", secondary: "#FCA5A5" };
  }
};

const NUM_BARS = 24;

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  mode,
  audioLevel,
  isActive,
  opacity = 1,
  showLabel = false,
}) => {
  const modeColors = getModeColors(mode);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (isActive) {
      setMounted(true);
    } else {
      const timer = setTimeout(() => setMounted(false), 400);
      return () => clearTimeout(timer);
    }
  }, [isActive]);

  // Generate CSS keyframes for each bar
  const generateBarStyle = (index: number) => {
    const centerIndex = Math.floor(NUM_BARS / 2);
    const distanceFromCenter = Math.abs(index - centerIndex);
    const baseHeight = 0.4 + (1 - distanceFromCenter / centerIndex) * 0.3;
    const delay = distanceFromCenter * 40;
    const duration = 500 + Math.random() * 300;

    const minHeight = 4;
    const maxHeight = 140;
    const animatedHeight = isActive ? minHeight + (maxHeight - minHeight) * baseHeight : minHeight;

    return {
      flex: 1,
      backgroundColor: modeColors.accent,
      borderRadius: 3,
      minWidth: 3,
      height: isActive ? animatedHeight : 4,
      opacity: isActive ? 0.8 : 0.2,
      boxShadow: isActive ? `0 0 16px ${modeColors.glow}` : 'none',
      transition: `all ${duration}ms ease-in-out`,
      transitionDelay: `${delay}ms`,
      animation: isActive ? `pulse-bar-${index} ${duration * 2}ms ease-in-out infinite` : 'none',
      animationDelay: `${delay}ms`,
    } as any;
  };

  return (
    <View
      style={[styles.container, { opacity }]}
      pointerEvents="none"
    >
      {/* Inject CSS keyframes for animations */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            ${Array.from({ length: NUM_BARS }, (_, i) => {
              const centerIndex = Math.floor(NUM_BARS / 2);
              const distanceFromCenter = Math.abs(i - centerIndex);
              const baseHeight = 0.4 + (1 - distanceFromCenter / centerIndex) * 0.3;
              const minH = 4;
              const maxH = 140;
              const peakHeight = minH + (maxH - minH) * (baseHeight + 0.4);
              const lowHeight = minH + (maxH - minH) * 0.15;

              return `
                @keyframes pulse-bar-${i} {
                  0%, 100% { height: ${peakHeight}px; opacity: 0.95; }
                  50% { height: ${lowHeight}px; opacity: 0.6; }
                }
              `;
            }).join('\n')}

            @keyframes pulse-glow {
              0%, 100% { opacity: 0.3; }
              50% { opacity: 0.1; }
            }
          `,
        }}
      />

      {/* Pulsing background glow */}
      {isActive && (
        <View
          style={[
            styles.glowBackground,
            {
              backgroundColor: modeColors.accent,
              opacity: mounted ? 0.2 : 0,
              animation: 'pulse-glow 3s ease-in-out infinite',
            } as any,
          ]}
        />
      )}

      {/* Main visualizer bars */}
      <View style={styles.barsContainer}>
        {Array.from({ length: NUM_BARS }, (_, index) => (
          <View key={index} style={styles.barWrapper}>
            <View style={generateBarStyle(index)}>
              {/* Inner gradient highlight */}
              <View
                style={[
                  styles.barHighlight,
                  {
                    backgroundColor: modeColors.secondary,
                    opacity: isActive ? 0.4 : 0,
                  },
                ]}
              />
            </View>
          </View>
        ))}
      </View>

      {/* Optional label */}
      {showLabel && isActive && (
        <View style={styles.labelContainer}>
          <Text
            style={[
              styles.label,
              { color: modeColors.accent },
            ]}
          >
            SOUND
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
    backgroundColor: "transparent",
  },
  glowBackground: {
    position: "absolute",
    top: "20%",
    left: "10%",
    right: "10%",
    bottom: "20%",
    borderRadius: 100,
  },
  barsContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    gap: 3,
  },
  barWrapper: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  barHighlight: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "40%",
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  labelContainer: {
    position: "absolute",
    bottom: 8,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  label: {
    fontFamily: "monospace",
    fontSize: 8,
    letterSpacing: 4,
    opacity: 0.5,
  },
});
