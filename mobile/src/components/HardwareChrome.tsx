import React from "react";
import { Animated, Pressable, Text, useWindowDimensions, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { AudioMode } from "../state/appStore";

export const hardwarePalette = {
  shell: "#b9b8b4",
  shellLight: "#c9c8c4",
  shellDark: "#92918d",
  ink: "#090909",
  muted: "#4d4c49",
  line: "#777671",
  orange: "#ff4f24",
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

export const hardwareRaisedButton = (active: boolean) => ({
  minWidth: 78,
  minHeight: 48,
  paddingHorizontal: 16,
  paddingVertical: 12,
  borderRadius: 6,
  borderWidth: 1,
  borderColor: active ? "#d33815" : "#74736f",
  backgroundColor: active ? hardwarePalette.orange : "#bbb9b4",
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
    { label: "SAVE MIX", icon: "save-outline", action: onSave },
    { label: "LIKES", icon: "heart", action: onFavorites, badge: favoritesCount },
    { label: "NOTES", icon: "document-text-outline", action: onNotes, badge: sessionNotesCount },
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
          <Text
            style={{
              color: hardwarePalette.ink,
              fontFamily: "Arial Black",
              fontSize: 38,
              fontWeight: "900",
              letterSpacing: 2,
              lineHeight: 42,
            }}
          >
            3L3V8R
          </Text>
          <Text
            style={{
              color: hardwarePalette.muted,
              fontFamily: "monospace",
              fontSize: 9,
              fontWeight: "700",
              letterSpacing: 3,
            }}
          >
            3L3V8R SYSTEMS
          </Text>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 10, justifyContent: compact ? "center" : "flex-end" }}>
          {utilities.map((item) => (
            <View key={item.label} style={{ alignItems: "center", gap: 5 }}>
              <Pressable onPress={item.action} style={[hardwareRaisedButton(false), { minWidth: 48, minHeight: 44, paddingHorizontal: 12, paddingVertical: 9 }]}>
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
          <Text style={{ color: hardwarePalette.muted, fontFamily: "monospace", fontSize: 9, letterSpacing: 2 }}>L3V3L UP</Text>
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


export const SynthwaveIdleDisplay = () => {
  const motion = React.useRef(new Animated.Value(0)).current;
  const pulse = React.useRef(new Animated.Value(0)).current;
  const drift = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const gridLoop = Animated.loop(
      Animated.timing(motion, {
        toValue: 1,
        duration: 3200,
        useNativeDriver: true,
      })
    );

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1800,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1800,
          useNativeDriver: true,
        }),
      ])
    );

    const driftLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(drift, {
          toValue: 1,
          duration: 5200,
          useNativeDriver: true,
        }),
        Animated.timing(drift, {
          toValue: 0,
          duration: 5200,
          useNativeDriver: true,
        }),
      ])
    );

    gridLoop.start();
    pulseLoop.start();
    driftLoop.start();

    return () => {
      gridLoop.stop();
      pulseLoop.stop();
      driftLoop.stop();
    };
  }, [motion, pulse, drift]);

  const gridShift = motion.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 24],
  });

  const sunOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.72, 1],
  });

  const sunScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.97, 1.03],
  });

  const sunDrift = drift.interpolate({
    inputRange: [0, 1],
    outputRange: [-10, 10],
  });

  const scanDrift = drift.interpolate({
    inputRange: [0, 1],
    outputRange: [-18, 18],
  });

  return (
    <View
      style={{
        minHeight: 250,
        overflow: "hidden",
        backgroundColor: "#020207",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* tiny stars */}
      {[
        [12, 16], [25, 25], [42, 13], [68, 22], [83, 14], [91, 30],
      ].map(([left, top], index) => (
        <Animated.View
          key={`star-${index}`}
          style={{
            position: "absolute",
            left: `${left}%`,
            top,
            width: index % 2 ? 2 : 3,
            height: index % 2 ? 2 : 3,
            borderRadius: 2,
            backgroundColor: index % 3 === 0 ? hardwarePalette.orange : "#7850a5",
            opacity: pulse.interpolate({
              inputRange: [0, 1],
              outputRange: [
                0.25 + (index % 3) * 0.1,
                0.8 - (index % 2) * 0.15,
              ],
            }),
            transform: [
              {
                translateX: drift.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-(index + 1) * 0.8, (index + 1) * 0.8],
                }),
              },
            ],
          }}
        />
      ))}

      {/* glowing sunset */}
      <Animated.View
        style={{
          position: "absolute",
          top: 36,
          width: 118,
          height: 118,
          borderRadius: 59,
          backgroundColor: "#ef4d28",
          opacity: sunOpacity,
          transform: [
            { translateX: sunDrift },
            { scale: sunScale },
          ],
          shadowColor: hardwarePalette.orange,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.75,
          shadowRadius: 28,
        }}
      />

      {/* sunset stripes */}
      {[0, 1, 2, 3, 4].map((i) => (
        <View
          key={`sun-line-${i}`}
          style={{
            position: "absolute",
            top: 74 + i * 10,
            width: 126,
            height: 4,
            backgroundColor: "#020207",
            opacity: 0.9,
          }}
        />
      ))}

      {/* foreground text */}
      <View
        style={{
          zIndex: 10,
          alignItems: "center",
          paddingHorizontal: 22,
          marginTop: 44,
        }}
      >
        <Text
          style={{
            fontFamily: "Arial Black",
            color: "#ff6a50",
            fontSize: 22,
            fontWeight: "900",
            letterSpacing: 3,
            textShadowColor: "#ff4422",
            textShadowOffset: { width: 0, height: 0 },
            textShadowRadius: 12,
          }}
        >
          SOUNDTRACK
        </Text>

        <Text
          style={{
            marginTop: 5,
            fontFamily: "monospace",
            color: "#96969b",
            fontSize: 10,
            letterSpacing: 3,
          }}
        >
          NO SOURCE SELECTED
        </Text>

        <View
          style={{
            marginTop: 25,
            minWidth: 220,
            paddingHorizontal: 24,
            paddingVertical: 13,
            borderWidth: 1,
            borderStyle: "dashed",
            borderColor: "#db4d2d",
            borderRadius: 13,
            backgroundColor: "rgba(6,7,10,0.84)",
            alignItems: "center",
          }}
        >
          <Text
            style={{
              fontFamily: "monospace",
              color: "#ef744d",
              fontSize: 10,
              letterSpacing: 3,
            }}
          >
            CHOOSE SOURCE
          </Text>
        </View>
      </View>
    </View>
  );
};


export const SynthwaveMediaIdleDisplay = () => {
  const motion = React.useRef(new Animated.Value(0)).current;
  const pulse = React.useRef(new Animated.Value(0)).current;
  const drift = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const gridLoop = Animated.loop(
      Animated.timing(motion, {
        toValue: 1,
        duration: 3000,
        useNativeDriver: true,
      })
    );

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1700,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1700,
          useNativeDriver: true,
        }),
      ])
    );

    const driftLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(drift, {
          toValue: 1,
          duration: 5500,
          useNativeDriver: true,
        }),
        Animated.timing(drift, {
          toValue: 0,
          duration: 5500,
          useNativeDriver: true,
        }),
      ])
    );

    gridLoop.start();
    pulseLoop.start();
    driftLoop.start();

    return () => {
      gridLoop.stop();
      pulseLoop.stop();
      driftLoop.stop();
    };
  }, [motion, pulse, drift]);

  const gridShift = motion.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 22],
  });

  const logoScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.985, 1.025],
  });

  const logoOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.82, 1],
  });

  const scanDrift = drift.interpolate({
    inputRange: [0, 1],
    outputRange: [-24, 24],
  });

  return (
    <View
      style={{
        flex: 1,
        overflow: "hidden",
        backgroundColor: "#020207",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* stars */}
      {[
        [10, 18],
        [23, 27],
        [38, 13],
        [59, 24],
        [74, 15],
        [90, 26],
      ].map(([left, top], index) => (
        <Animated.View
          key={`media-star-${index}`}
          style={{
            position: "absolute",
            left: `${left}%`,
            top,
            width: index % 2 ? 2 : 3,
            height: index % 2 ? 2 : 3,
            borderRadius: 2,
            backgroundColor:
              index % 3 === 0 ? hardwarePalette.orange : "#6b4a96",
            opacity: pulse.interpolate({
              inputRange: [0, 1],
              outputRange: [0.25 + index * 0.04, 0.8],
            }),
            transform: [
              {
                translateX: drift.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-3 - index, 3 + index],
                }),
              },
            ],
          }}
        />
      ))}

      {/* logo */}
      <Animated.Text
        style={{
          position: "absolute",
          top: "17%",
          fontFamily: "Arial Black",
          fontSize: 48,
          fontWeight: "900",
          letterSpacing: 8,
          color: "#ff5b52",
          opacity: logoOpacity,
          transform: [{ scale: logoScale }],
          textShadowColor: "rgba(255,70,55,1)",
          textShadowOffset: { width: 0, height: 0 },
          textShadowRadius: 30,
        }}
      >
        3L3V8R
      </Animated.Text>

      {/* tap prompt */}
      <View
        style={{
          position: "absolute",
          bottom: "16%",
          minWidth: 230,
          paddingHorizontal: 28,
          paddingVertical: 14,
          borderWidth: 1,
          borderStyle: "dashed",
          borderColor: "rgba(255,82,45,0.78)",
          borderRadius: 13,
          backgroundColor: "rgba(4,5,8,0.72)",
          alignItems: "center",
        }}
      >
        <Text
          style={{
            fontFamily: "monospace",
            color: "#ff9865",
            fontSize: 11,
            fontWeight: "700",
            letterSpacing: 3,
          }}
        >
          TAP TO LOAD VIDEO
        </Text>
      </View>
    </View>
  );
};


export const SynthwaveMediaIdleDisplayV2 = () => {
  const grid = React.useRef(new Animated.Value(0)).current;
  const pulse = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const gridLoop = Animated.loop(
      Animated.timing(grid, {
        toValue: 1,
        duration: 2400,
        useNativeDriver: true,
      })
    );

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1600,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1600,
          useNativeDriver: true,
        }),
      ])
    );

    gridLoop.start();
    pulseLoop.start();

    return () => {
      gridLoop.stop();
      pulseLoop.stop();
    };
  }, [grid, pulse]);

  const gridMove = grid.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 22],
  });

  const logoScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.985, 1.025],
  });

  const logoOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.84, 1],
  });

  return (
    <View
      style={{
        flex: 1,
        overflow: "hidden",
        backgroundColor: "#020207",
      }}
    >
      {/* stars */}
      {[
        [11, 22],
        [27, 14],
        [44, 27],
        [63, 16],
        [79, 24],
        [91, 13],
      ].map(([left, top], i) => (
        <Animated.View
          key={`media-v2-star-${i}`}
          style={{
            position: "absolute",
            left: `${left}%`,
            top,
            width: i % 2 ? 2 : 3,
            height: i % 2 ? 2 : 3,
            borderRadius: 3,
            backgroundColor: i % 3 === 0 ? "#d8d9d6" : "#777a78",
            opacity: pulse.interpolate({
              inputRange: [0, 1],
              outputRange: [0.25 + i * 0.04, 0.85],
            }),
          }}
        />
      ))}

      {/* moving perspective grid */}
      <Animated.View
        style={{
          position: "absolute",
          left: -80,
          right: -80,
          bottom: 0,
          height: "45%",
          overflow: "hidden",
          transform: [{ translateY: gridMove }],
        }}
      >
        {/* vertical perspective lines */}
        {[-210, -150, -95, -45, 0, 45, 95, 150, 210].map((x, i) => (
          <View
            key={`media-v2-v-${i}`}
            style={{
              position: "absolute",
              bottom: -50,
              left: "50%",
              width: 1.5,
              height: 240,
              backgroundColor: "#777a78",
              opacity: 0.72,
              transform: [
                { translateX: x },
                { rotate: `${x / 8.5}deg` },
              ],
            }}
          />
        ))}

        {/* horizontal moving lines */}
        {Array.from({ length: 13 }).map((_, i) => (
          <View
            key={`media-v2-h-${i}`}
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: i * 18,
              height: i % 4 === 0 ? 1.5 : 1,
              backgroundColor: i % 4 === 0 ? "#aeb0ad" : "#555856",
              opacity: 0.82,
            }}
          />
        ))}
      </Animated.View>

      {/* logo */}
      <Animated.Text
        style={{
          position: "absolute",
          top: "17%",
          alignSelf: "center",
          fontFamily: "Arial Black",
          fontSize: 48,
          fontWeight: "900",
          letterSpacing: 8,
          color: "#e8e9e5",
          opacity: logoOpacity,
          transform: [{ scale: logoScale }],
          textShadowColor: "rgba(235,238,232,0.65)",
          textShadowOffset: { width: 0, height: 0 },
          textShadowRadius: 30,
        }}
      >
        3L3V8R
      </Animated.Text>

      {/* prompt */}
      <View
        style={{
          position: "absolute",
          bottom: "15%",
          alignSelf: "center",
          minWidth: 235,
          paddingHorizontal: 30,
          paddingVertical: 15,
          borderWidth: 1.5,
          borderStyle: "dashed",
          borderColor: "#8c8f8b",
          borderRadius: 14,
          backgroundColor: "rgba(3,3,8,0.84)",
          alignItems: "center",
        }}
      >
        <Text
          style={{
            fontFamily: "monospace",
            color: "#d7d9d5",
            fontSize: 11,
            fontWeight: "700",
            letterSpacing: 3,
          }}
        >
          TAP TO LOAD VIDEO
        </Text>
      </View>
    </View>
  );
};


export const SynthwaveIdleDisplayV2 = () => {
  const grid = React.useRef(new Animated.Value(0)).current;
  const pulse = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const gridLoop = Animated.loop(
      Animated.timing(grid, {
        toValue: 1,
        duration: 2500,
        useNativeDriver: true,
      })
    );

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1800,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1800,
          useNativeDriver: true,
        }),
      ])
    );

    gridLoop.start();
    pulseLoop.start();

    return () => {
      gridLoop.stop();
      pulseLoop.stop();
    };
  }, [grid, pulse]);

  const gridMove = grid.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 22],
  });

  const sunScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.98, 1.025],
  });

  return (
    <View
      style={{
        minHeight: 250,
        overflow: "hidden",
        backgroundColor: "#020207",
      }}
    >
      {/* stars */}
      {[
        [9, 17],
        [24, 29],
        [43, 12],
        [66, 23],
        [82, 14],
        [92, 27],
      ].map(([left, top], i) => (
        <View
          key={`sound-v2-star-${i}`}
          style={{
            position: "absolute",
            left: `${left}%`,
            top,
            width: i % 2 ? 2 : 3,
            height: i % 2 ? 2 : 3,
            borderRadius: 3,
            backgroundColor: i % 3 === 0 ? "#d8d9d6" : "#777a78",
            opacity: 0.65,
          }}
        />
      ))}

      {/* pulsing synthwave sun — NO horizon line */}
      <Animated.View
        style={{
          position: "absolute",
          top: 28,
          alignSelf: "center",
          width: 120,
          height: 120,
          borderRadius: 60,
          backgroundColor: "#b7b9b5",
          opacity: 0.9,
          transform: [{ scale: sunScale }],
          shadowColor: "#e5e7e2",
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.6,
          shadowRadius: 24,
        }}
      />

      {/* sun stripes */}
      {[0, 1, 2, 3].map((i) => (
        <View
          key={`sound-v2-sunstripe-${i}`}
          style={{
            position: "absolute",
            alignSelf: "center",
            top: 67 + i * 12,
            width: 128,
            height: 5,
            backgroundColor: "#020207",
          }}
        />
      ))}

      {/* moving grid only — no orange overlays */}
      <Animated.View
        style={{
          position: "absolute",
          left: -80,
          right: -80,
          bottom: 0,
          height: "36%",
          overflow: "hidden",
          transform: [{ translateY: gridMove }],
        }}
      >
        {[-210, -150, -95, -45, 0, 45, 95, 150, 210].map((x, i) => (
          <View
            key={`sound-v2-v-${i}`}
            style={{
              position: "absolute",
              bottom: -50,
              left: "50%",
              width: 1.5,
              height: 220,
              backgroundColor: "#777a78",
              opacity: 0.72,
              transform: [
                { translateX: x },
                { rotate: `${x / 8.5}deg` },
              ],
            }}
          />
        ))}

        {Array.from({ length: 12 }).map((_, i) => (
          <View
            key={`sound-v2-h-${i}`}
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: i * 18,
              height: i % 4 === 0 ? 1.5 : 1,
              backgroundColor: i % 4 === 0 ? "#aeb0ad" : "#555856",
              opacity: 0.82,
            }}
          />
        ))}
      </Animated.View>

      <View
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 92,
          alignItems: "center",
        }}
      >
        <Text
          style={{
            fontFamily: "Arial Black",
            color: "#e8e9e5",
            fontSize: 21,
            fontWeight: "900",
            letterSpacing: 3,
            textShadowColor: "#e5e7e2",
            textShadowOffset: { width: 0, height: 0 },
            textShadowRadius: 18,
          }}
        >
          SOUNDTRACK
        </Text>

        <Text
          style={{
            marginTop: 5,
            fontFamily: "monospace",
            color: "#a09da5",
            fontSize: 10,
            letterSpacing: 3,
          }}
        >
          NO SOURCE SELECTED
        </Text>
      </View>

      <View
        style={{
          position: "absolute",
          alignSelf: "center",
          bottom: 24,
          minWidth: 220,
          paddingHorizontal: 28,
          paddingVertical: 14,
          borderWidth: 1.5,
          borderStyle: "dashed",
          borderColor: "#8c8f8b",
          borderRadius: 14,
          backgroundColor: "rgba(3,3,8,0.84)",
          alignItems: "center",
        }}
      >
        <Text
          style={{
            fontFamily: "monospace",
            color: "#d7d9d5",
            fontSize: 10,
            letterSpacing: 3,
          }}
        >
          CHOOSE SOURCE
        </Text>
      </View>
    </View>
  );
};
