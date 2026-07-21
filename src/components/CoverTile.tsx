import { Pressable, StyleSheet, Text, View } from "react-native";
import type { CoverKind } from "@/apps/novelcrafter/data";
import { colors, typography } from "@/constants/theme";

const COVER_LABEL: Record<CoverKind, string> = {
  gatsby: "Gatsby",
  trinity: "Trinity",
  cardinal: "Cardinal",
  plain: "Novel",
};

export function CoverTile({
  title,
  author,
  coverKind,
  updated,
  onPress,
}: {
  title: string;
  author?: string;
  coverKind: CoverKind;
  updated?: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.wrap, pressed && { opacity: 0.9 }]}>
      <View style={[styles.cover, { backgroundColor: colors.cover[coverKind] }]}>
        <Text style={styles.coverEyebrow}>{COVER_LABEL[coverKind]}</Text>
        <Text style={styles.coverTitle} numberOfLines={3}>
          {title}
        </Text>
      </View>
      <View style={styles.meta}>
        <Text style={styles.metaTitle} numberOfLines={2}>
          {title}
        </Text>
        {author ? (
          <Text style={styles.metaSub} numberOfLines={1}>
            {author}
          </Text>
        ) : null}
        {updated ? <Text style={styles.metaSub}>{updated}</Text> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "47%",
    marginBottom: 20,
  },
  cover: {
    aspectRatio: 2 / 3,
    borderRadius: 4,
    padding: 14,
    justifyContent: "flex-end",
  },
  coverEyebrow: {
    fontFamily: typography.bodyMedium,
    fontSize: 11,
    color: "rgba(255,255,255,0.7)",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 6,
  },
  coverTitle: {
    fontFamily: typography.display,
    fontSize: 18,
    lineHeight: 22,
    color: "#fff",
  },
  meta: { marginTop: 10, gap: 2 },
  metaTitle: {
    fontFamily: typography.bodyMedium,
    fontSize: 14,
    color: colors.ink,
  },
  metaSub: {
    fontFamily: typography.body,
    fontSize: 12,
    color: colors.muted,
  },
});
