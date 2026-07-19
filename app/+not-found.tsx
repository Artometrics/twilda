import { Link, Stack } from "expo-router";
import { StyleSheet, View } from "react-native";
import { Body, BrandMark } from "@/components/ui";
import { colors, space, typography } from "@/constants/theme";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Not found" }} />
      <View style={styles.container}>
        <BrandMark size="sm" />
        <Body muted>This screen doesn’t exist.</Body>
        <Link href="/" style={styles.link}>
          Go home
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "flex-start",
    justifyContent: "center",
    padding: space.xl,
    gap: space.md,
  },
  link: {
    fontFamily: typography.bodyBold,
    fontSize: 16,
    color: colors.accentDark,
  },
});
