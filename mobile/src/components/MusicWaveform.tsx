import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import Svg, { Line, Path } from "react-native-svg";

const PERIOD = 600;
const HEIGHT = 40;
const CYCLE_MS = 6000;

// Decorative scope trace, not sampled audio. Two identical periods allow a seamless scroll.
const TRACE = Array.from({ length: 401 }, (_, index) => {
  const x = index * 3;
  const phase = (x / PERIOD) * Math.PI * 2;
  const y = 20 + (8 * Math.sin(phase * 9) + 4 * Math.sin(phase * 17)) *
    (0.65 + 0.35 * Math.cos(phase * 3));
  return `${index === 0 ? "M" : "L"}${x},${y.toFixed(2)}`;
}).join(" ");

export function MusicWaveform({ isActive }: { isActive: boolean }) {
  const [width, setWidth] = useState(0);
  const progress = useSharedValue(0);
  const brightness = useSharedValue(0.35);

  useEffect(() => {
    brightness.value = withTiming(isActive ? 0.85 : 0.35, { duration: 250 });
    if (isActive) {
      progress.value = withRepeat(
        withTiming(progress.value + 1, { duration: CYCLE_MS, easing: Easing.linear }),
        -1,
        false,
      );
    } else {
      cancelAnimation(progress);
    }
    return () => {
      cancelAnimation(progress);
      cancelAnimation(brightness);
    };
  }, [isActive, progress, brightness]);

  const traceStyle = useAnimatedStyle(() => ({
    opacity: brightness.value,
    transform: [{ translateX: -(progress.value % 1) * width }],
  }));

  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={styles.scope}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
    >
      <Svg width="100%" height={HEIGHT} viewBox={`0 0 ${PERIOD} ${HEIGHT}`} preserveAspectRatio="none">
        {[10, 20, 30].map((y) => (
          <Line key={`h${y}`} x1={0} y1={y} x2={PERIOD} y2={y} stroke="#efede7" strokeOpacity={0.06} strokeWidth={0.5} />
        ))}
        {[0, 100, 200, 300, 400, 500, 600].map((x) => (
          <Line key={`v${x}`} x1={x} y1={0} x2={x} y2={HEIGHT} stroke="#efede7" strokeOpacity={0.05} strokeWidth={0.5} />
        ))}
        <Line x1={0} y1={20} x2={8} y2={20} stroke="#b85c32" strokeWidth={1} />
        <Line x1={PERIOD - 8} y1={20} x2={PERIOD} y2={20} stroke="#b85c32" strokeWidth={1} />
      </Svg>
      {width > 0 && (
        <Animated.View style={[styles.trace, { width: width * 2 }, traceStyle]}>
          <Svg width="100%" height={HEIGHT} viewBox={`0 0 ${PERIOD * 2} ${HEIGHT}`} preserveAspectRatio="none">
            <Path d={TRACE} fill="none" stroke="#efede7" strokeWidth={1.2} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
          </Svg>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  scope: { position: "absolute", top: 64, left: 18, right: 18, height: HEIGHT, overflow: "hidden", zIndex: 1 },
  trace: { position: "absolute", top: 0, left: 0, height: HEIGHT },
});
