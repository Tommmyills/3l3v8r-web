import React from "react";
import { StyleSheet } from "react-native";
import type { SliderProps } from "@react-native-community/slider";

// The installed native slider's web implementation uses ReactDOM.findDOMNode,
// which React 19 removed. Keep the same controls with the browser's range input.
export default function PlaybackSlider(props: SliderProps) {
  const { minimumValue = 0, maximumValue = 1, value = 0, step = 0 } = props;
  return <input type="range" aria-label={props.accessibilityLabel} disabled={props.disabled}
    min={minimumValue} max={maximumValue} step={step || "any"} value={value}
    onChange={(event) => props.onValueChange?.(Number(event.currentTarget.value))}
    onPointerDown={() => props.onSlidingStart?.(value)}
    onPointerUp={(event) => props.onSlidingComplete?.(Number(event.currentTarget.value))}
    onKeyUp={(event) => props.onSlidingComplete?.(Number(event.currentTarget.value))}
    style={{ ...StyleSheet.flatten(props.style) as React.CSSProperties,
      margin: 0, accentColor: String(props.minimumTrackTintColor ?? "#FF9A5A"), cursor: "pointer" }} />;
}
