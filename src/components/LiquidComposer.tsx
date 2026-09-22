import React, { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, TextInputProps } from "react-native";
import { liquidIce } from "../theme/liquidIce";
import { GlassSurface } from "./GlassSurface";

type Props = Pick<TextInputProps, "value" | "onChangeText" | "onSubmitEditing" | "onFocus" | "onBlur" | "accessibilityLabel"> & {
  placeholder?: string;
  onSend: () => void;
};

export function LiquidComposer({
  value,
  onChangeText,
  onSubmitEditing,
  onFocus,
  onBlur,
  accessibilityLabel,
  placeholder = "Was soll für dich passieren?",
  onSend
}: Props) {
  const [focused, setFocused] = useState(false);

  return (
    <GlassSurface variant="floating" style={[styles.shell, focused && styles.shellFocused]}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={liquidIce.color.textTertiary}
        returnKeyType="send"
        onSubmitEditing={onSubmitEditing}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        style={styles.input}
        accessibilityLabel={accessibilityLabel}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Frage senden"
        onPress={onSend}
        hitSlop={6}
        style={({ pressed }) => [styles.send, pressed && styles.sendPressed]}
      >
        <Text style={styles.sendText}>↑</Text>
      </Pressable>
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  shell: {
    height: 60,
    borderRadius: 30,
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 18,
    paddingRight: 6,
    overflow: "hidden"
  },
  shellFocused: {
    borderColor: "#B8B8B8"
  },
  input: {
    flex: 1,
    height: 54,
    paddingRight: 12,
    ...liquidIce.type.bodyLarge,
    color: liquidIce.color.textPrimary
  },
  send: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: liquidIce.color.textPrimary
  },
  sendPressed: {
    transform: [{ scale: liquidIce.motion.pressScale }],
    backgroundColor: "#2A2D32"
  },
  sendText: {
    color: "#FFFFFF",
    fontSize: 22,
    lineHeight: 25,
    fontWeight: "700"
  }
});
