import { StyleSheet, View, type ViewProps } from "react-native";
import { LinearGradient as ExpoLinearGradient } from "expo-linear-gradient";
import { colors } from "@/constants/theme";

/** Soft paper atmosphere for auth screens. */
export function AuthGradient({ children, style, ...rest }: ViewProps) {
  return (
    <View style={[styles.root, style]} {...rest}>
      <ExpoLinearGradient
        colors={[colors.paper, "#E8E2D6", colors.accentSoft]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
