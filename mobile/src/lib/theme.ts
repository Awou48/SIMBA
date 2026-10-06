export const colors = {
  ink: "#2B2118",
  cream: "#FFF3D6",
  yellow: "#FFC72C",
  yellowSoft: "#FFE9A8",
  coral: "#FF5E5B",
  coralSoft: "#FFDAD8",
  teal: "#00A6A6",
  tealSoft: "#CCF0F0",
  violet: "#7B61FF",
  violetSoft: "#E3DCFF",
  green: "#1F7A4D",
  greenSoft: "#D9F5E5",
  white: "#FFFFFF",
  muted: "#7A6A5A",
  track: "#F3E7CC",
  headerSub: "#6A5320",
};

export const tones = {
  coral: { fg: "#C4302E", bg: colors.coralSoft, solid: colors.coral },
  teal: { fg: "#00777A", bg: colors.tealSoft, solid: colors.teal },
  yellow: { fg: "#7A5A00", bg: colors.yellowSoft, solid: colors.yellow },
  violet: { fg: "#5A43D6", bg: colors.violetSoft, solid: colors.violet },
  good: { fg: colors.green, bg: colors.greenSoft, solid: colors.green },
  warn: { fg: "#7A5A00", bg: colors.yellowSoft, solid: colors.yellow },
  bad: { fg: "#C4302E", bg: colors.coralSoft, solid: colors.coral },
  muted: { fg: colors.muted, bg: colors.track, solid: colors.muted },
} as const;

export type Tone = keyof typeof tones;

export const font = {
  regular: "Nunito_600SemiBold",
  bold: "Nunito_700Bold",
  extra: "Nunito_800ExtraBold",
  display: "Fredoka_700Bold",
  displayMedium: "Fredoka_600SemiBold",
};

export const radius = { sm: 14, md: 18, lg: 20, xl: 24, pill: 999 };
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const INK_BORDER = 2;
export const SHADOW_OFFSET = 4;
