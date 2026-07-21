import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import { colors, space, typography } from "@/constants/theme";

export function Screen({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.screen, style]}>{children}</View>;
}

export function BrandMark({ size = "lg" }: { size?: "sm" | "lg" }) {
  return (
    <Text style={[styles.brand, size === "sm" ? styles.brandSm : styles.brandLg]} accessibilityRole="header">
      Twilda
    </Text>
  );
}

export function Heading({ children }: { children: ReactNode }) {
  return <Text style={styles.heading}>{children}</Text>;
}

export function Body({ children, muted }: { children: ReactNode; muted?: boolean }) {
  return <Text style={[styles.body, muted && styles.muted]}>{children}</Text>;
}

export function Field(props: TextInputProps) {
  return (
    <TextInput
      placeholderTextColor={colors.muted}
      {...props}
      style={[styles.field, props.style]}
    />
  );
}

export function Button({
  label,
  onPress,
  variant = "primary",
  disabled,
  loading,
}: {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.btn,
        variant === "primary" && styles.btnPrimary,
        variant === "secondary" && styles.btnSecondary,
        variant === "ghost" && styles.btnGhost,
        variant === "danger" && styles.btnDanger,
        (disabled || loading) && styles.btnDisabled,
        pressed && styles.btnPressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === "ghost" ? colors.ink : colors.white} />
      ) : (
        <Text
          style={[
            styles.btnLabel,
            (variant === "ghost" || variant === "secondary") && styles.btnLabelDark,
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Body muted>{body}</Body>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  brand: {
    fontFamily: typography.brand,
    color: colors.ink,
    letterSpacing: -0.5,
  },
  brandSm: { fontSize: 22 },
  brandLg: { fontSize: 42, lineHeight: 48 },
  heading: {
    fontFamily: typography.display,
    fontSize: 28,
    lineHeight: 34,
    color: colors.ink,
  },
  body: {
    fontFamily: typography.body,
    fontSize: 16,
    lineHeight: 24,
    color: colors.ink,
  },
  muted: { color: colors.muted },
  field: {
    fontFamily: typography.body,
    fontSize: 16,
    color: colors.ink,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    paddingHorizontal: space.md,
    paddingVertical: 14,
  },
  btn: {
    minHeight: 48,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space.lg,
  },
  btnPrimary: { backgroundColor: colors.accentDark },
  btnSecondary: {
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.line,
  },
  btnGhost: { backgroundColor: "transparent" },
  btnDanger: { backgroundColor: colors.danger },
  btnDisabled: { opacity: 0.5 },
  btnPressed: { opacity: 0.85 },
  btnLabel: {
    fontFamily: typography.bodyBold,
    fontSize: 16,
    color: colors.white,
  },
  btnLabelDark: { color: colors.ink },
  empty: {
    padding: space.xl,
    gap: space.sm,
    alignItems: "flex-start",
  },
  emptyTitle: {
    fontFamily: typography.display,
    fontSize: 20,
    color: colors.ink,
  },
});
