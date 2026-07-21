/** Twilda visual tokens — adapted from the former Astro/Tailwind theme. */
export const colors = {
  ink: "#1A1814",
  paper: "#F7F4EE",
  paperDeep: "#EDE7DC",
  accent: "#5B6B8C",
  accentDark: "#3E4A63",
  accentSoft: "#D6DCE8",
  secondary: "#A45A3A",
  muted: "#6B6560",
  line: "#D4CDC2",
  danger: "#9B3B3B",
  white: "#FFFEFA",
  cover: {
    gatsby: "#1C2A44",
    trinity: "#3D2A4A",
    cardinal: "#6B1E2A",
    plain: "#4A5560",
  },
} as const;

export const space = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const typography = {
  brand: "Literata_700Bold",
  display: "Literata_600SemiBold",
  body: "DMSans_400Regular",
  bodyMedium: "DMSans_500Medium",
  bodyBold: "DMSans_700Bold",
} as const;
