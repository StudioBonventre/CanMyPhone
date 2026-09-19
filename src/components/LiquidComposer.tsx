import React, { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, TextInputProps } from "react-native";
import { liquidIce, liquidIceShadow } from "../theme/liquidIce";
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
  placeholder = "Was soll ich dir einstellen?",
  onSend
}: Props) {
  const [focused, setFocused] = useState(false);

  return (
    <GlassSurface variant="floating" interactive style={[styles.shell, focused && styles.shellFocused]}>
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
    height: 64,
    borderRadius: 32,
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 20,
    paddingRight: 8,
    overflow: "hidden"
  },
  shellFocused: {
    borderWidth: 1,
    borderColor: "rgba(128,222,255,0.66)",
    ...liquidIceShadow.accent
  },
  input: {
    flex: 1,
    height: 56,
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
    backgroundColor: liquidIce.color.accent,
    ...liquidIceShadow.accent
  },
  sendPressed: {
    transform: [{ scale: liquidIce.motion.pressScale }],
    backgroundColor: liquidIce.color.accentPressed
  },
  sendText: {
    color: liquidIce.color.textOnAccent,
    fontSize: 23,
    lineHeight: 26,
    fontWeight: "700"
  }
});
