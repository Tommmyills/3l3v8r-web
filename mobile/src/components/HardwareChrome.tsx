import React from "react";
import { Pressable, Text, useWindowDimensions, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { AudioMode } from "../state/appStore";

export const hardwarePalette = {
  shell: "#dedbd5",
  shellLight: "#f1efeb",
  shellDark: "#c7c3bc",
  ink: "#161616",
  muted: "#6f6b65",
  line: "#aaa69f",
  orange: "#ff5428",
  screen: "#0b0c0d",
};

export const HardwareScrew = ({ size = 14 }: { size?: number }) => (
  <View
    style={{
      width: size,
      height: size,
      borderRadius: size / 2,
      borderWidth: 1,
      borderColor: "#74716c",
      backgroundColor: "#aaa7a1",
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.22,
      shadowRadius: 1,
    }}
  >
    <View style={{ width: size * 0.48, height: 1, backgroundColor: "#56534f", transform: [{ rotate: "45deg" }] }} />
  </View>
);

export const HardwareGrille = ({ columns = 7, rows = 4 }: { columns?: number; rows?: number }) => (
  <View
    accessibilityElementsHidden
    importantForAccessibility="no-hide-descendants"
    style={{
      width: columns * 12,
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 5,
      padding: 7,
      borderLeftWidth: 1,
      borderRightWidth: 1,
      borderColor: "rgba(95,91,85,0.22)",
    }}
  >
    {Array.from({ length: columns * rows }).map((_, index) => (
      <View
        key={index}
        style={{
          width: 7,
          height: 7,
          borderRadius: 4,
          backgroundColor: "#252525",
          shadowColor: "#fff",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.45,
          shadowRadius: 0,
        }}
      />
    ))}
  </View>
);

const raisedButton = (active: boolean) => ({
  minWidth: 78,
  minHeight: 48,
  paddingHorizontal: 16,
  paddingVertical: 12,
  borderRadius: 6,
  borderWidth: 1,
  borderColor: active ? "#d33815" : "#aaa69f",
  backgroundColor: active ? hardwarePalette.orange : "#e6e3de",
  alignItems: "center" as const,
  justifyContent: "center" as const,
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: active ? 0.34 : 0.24,
  shadowRadius: 4,
});

type HardwareHeaderProps = {
  audioMode: AudioMode;
  onModeChange: (mode: AudioMode) => void;
  onSave: () => void;
  onFavorites: () => void;
  onNotes: () => void;
  onProfile: () => void;
  onSettings: () => void;
  favoritesCount: number;
  sessionNotesCount: number;
  onClassic: () => void;
};

export const HardwareHeader = ({
  audioMode,
  onModeChange,
  onSave,
  onFavorites,
  onNotes,
  onProfile,
  onSettings,
  favoritesCount,
  sessionNotesCount,
  onClassic,
}: HardwareHeaderProps) => {
  const { width } = useWindowDimensions();
  const compact = width < 1120;
  const utilities: { label: string; icon: any; action: () => void; badge?: number }[] = [
    { label: "SAVE", icon: "save-outline", action: onSave },
    { label: "LIKES", icon: "heart", action: onFavorites, badge: favoritesCount },
    { label: "PRESETS", icon: "document-text-outline", action: onNotes, badge: sessionNotesCount },
    { label: "ACCOUNT", icon: "person-circle-outline", action: onProfile },
    { label: "SETTINGS", icon: "settings-outline", action: onSettings },
  ];

  return (
    <View
      style={{
        paddingHorizontal: 20,
        paddingVertical: 18,
        borderBottomWidth: 1,
        borderColor: hardwarePalette.line,
        backgroundColor: hardwarePalette.shellLight,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.16,
        shadowRadius: 5,
      }}
    >
      <View style={{ position: "absolute", top: 10, left: 10 }}><HardwareScrew /></View>
      <View style={{ position: "absolute", top: 10, right: 10 }}><HardwareScrew /></View>
      <View style={{ flexDirection: compact ? "column" : "row", alignItems: compact ? "stretch" : "center", justifyContent: "space-between", gap: compact ? 16 : 18 }}>
        <View style={{ minWidth: 190, alignItems: compact ? "center" : "flex-start" }}>
          <Text style={{ color: hardwarePalette.ink, fontFamily: "monospace", fontSize: 34, fontWeight: "900", letterSpacing: 1 }}>3L3V8R</Text>
          <Text style={{ color: hardwarePalette.muted, fontFamily: "monospace", fontSize: 9, letterSpacing: 4 }}>3L3V8R SYSTEMS</Text>
        </View>

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, flex: compact ? undefined : 1, justifyContent: "center", paddingTop: compact ? 8 : 0 }}>
          {(["FOCUS", "STUDY", "CHILL", "FLOW", "DEEP"] as AudioMode[]).map((mode) => {
            const active = audioMode === mode;
            return (
              <Pressable key={mode} onPress={() => onModeChange(mode)} style={raisedButton(active)}>
                <View style={{ position: "absolute", top: -11, width: 7, height: 7, borderRadius: 4, backgroundColor: active ? hardwarePalette.orange : "#343434" }} />
                <Text style={{ fontFamily: "monospace", fontSize: 12, fontWeight: "800", letterSpacing: 1.2, color: active ? "#111" : hardwarePalette.ink }}>{mode}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 10, justifyContent: compact ? "center" : "flex-end" }}>
          {utilities.map((item) => (
            <View key={item.label} style={{ alignItems: "center", gap: 5 }}>
              <Pressable onPress={item.action} style={[raisedButton(false), { minWidth: 48, minHeight: 44, paddingHorizontal: 12, paddingVertical: 9 }]}>
                <Ionicons name={item.icon} size={18} color={hardwarePalette.ink} />
                {item.badge ? (
                  <View style={{ position: "absolute", top: -5, right: -5, minWidth: 16, height: 16, borderRadius: 8, paddingHorizontal: 3, alignItems: "center", justifyContent: "center", backgroundColor: hardwarePalette.orange }}>
                    <Text style={{ color: "#111", fontSize: 8, fontWeight: "900" }}>{item.badge > 9 ? "9+" : item.badge}</Text>
                  </View>
                ) : null}
              </Pressable>
              <Text style={{ color: hardwarePalette.ink, fontFamily: "monospace", fontSize: 8, letterSpacing: 1 }}>{item.label}</Text>
            </View>
          ))}
          <HardwareGrille columns={6} rows={4} />
        </View>
      </View>

      <View style={{ marginTop: 14, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 9 }}>
          <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: hardwarePalette.orange }} />
          <Text style={{ color: hardwarePalette.muted, fontFamily: "monospace", fontSize: 9, letterSpacing: 2 }}>GOOD MUSIC · BETTER DAYS</Text>
        </View>
        <Pressable onPress={onClassic} style={{ borderWidth: 1, borderColor: hardwarePalette.line, borderRadius: 14, paddingHorizontal: 11, paddingVertical: 5, backgroundColor: "#d5d1cb" }}>
          <Text style={{ color: hardwarePalette.ink, fontFamily: "monospace", fontSize: 9, letterSpacing: 1.2 }}>CLASSIC / HARDWARE</Text>
        </Pressable>
      </View>
    </View>
  );
};

export const HardwareSectionTitle = ({ title, detail }: { title: string; detail: string }) => (
  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", flex: 1 }}>
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <View style={{ width: 11, height: 11, borderRadius: 2, backgroundColor: hardwarePalette.orange, borderWidth: 1, borderColor: "#bd3414" }} />
      <Text style={{ color: hardwarePalette.ink, fontFamily: "monospace", fontWeight: "900", fontSize: 14, letterSpacing: 2 }}>{title}</Text>
      <View style={{ width: 86, height: 1, backgroundColor: "#8f8b85" }} />
    </View>
    <Text numberOfLines={1} style={{ color: hardwarePalette.muted, fontFamily: "monospace", fontSize: 8, letterSpacing: 2, flexShrink: 1, textAlign: "right" }}>{detail}</Text>
  </View>
);

export const HardwareFooter = ({ onClassic }: { onClassic: () => void }) => (
  <View style={{ paddingHorizontal: 24, paddingVertical: 15, borderTopWidth: 1, borderColor: hardwarePalette.line, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
    <Text style={{ color: hardwarePalette.muted, fontFamily: "monospace", fontSize: 9, letterSpacing: 2 }}>3L3V8R v1.0.0</Text>
    <Pressable onPress={onClassic}><Text style={{ color: hardwarePalette.muted, fontFamily: "monospace", fontSize: 9, letterSpacing: 3 }}>A MORE FOCUSED YOU · CLASSIC / HARDWARE</Text></Pressable>
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: "#29b960", borderWidth: 1, borderColor: "#17823f" }} />
      <Text style={{ color: hardwarePalette.muted, fontFamily: "monospace", fontSize: 9, letterSpacing: 2 }}>SYSTEM ACTIVE</Text>
    </View>
  </View>
);
