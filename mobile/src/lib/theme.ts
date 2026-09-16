export const colors = {
  orange: "#F47B20",
  orangeSoft: "#FFF0E0",
  yellow: "#FFC72C",
  yellowSoft: "#FFF8E0",
  teal: "#5CC8C2",
  tealSoft: "#E8F9F8",
  pink: "#FF7BAC",
  pinkSoft: "#FFE9F1",
  lavender: "#9B8BF4",
  lavenderSoft: "#F0EDFF",
  green: "#4CC38A",
  greenSoft: "#E6F8EF",
  red: "#F0616D",
  redSoft: "#FFEBED",
  cream: "#FFF8EF",
  card: "#FFFFFF",
  text: "#2D3047",
  muted: "#9BA3B8",
  line: "#F1EDE6",
  white: "#FFFFFF",
};

export const gradient = {
  sunrise: ["#F47B20", "#FFC72C"] as const,
  ocean: ["#5CC8C2", "#7ED9FF"] as const,
  berry: ["#FF7BAC", "#FFB199"] as const,
  grape: ["#9B8BF4", "#C3B6FF"] as const,
};

export const tones = {
  orange: { fg: colors.orange, bg: colors.orangeSoft },
  yellow: { fg: "#C98F00", bg: colors.yellowSoft },
  teal: { fg: "#2AA39C", bg: colors.tealSoft },
  pink: { fg: "#E0457F", bg: colors.pinkSoft },
  lavender: { fg: "#6F5CE0", bg: colors.lavenderSoft },
  good: { fg: "#2E9F6A", bg: colors.greenSoft },
  warn: { fg: "#C98F00", bg: colors.yellowSoft },
  bad: { fg: "#D6414E", bg: colors.redSoft },
  muted: { fg: colors.muted, bg: "#F4F1EC" },
} as const;

export type Tone = keyof typeof tones;

export const font = {
  regular: "Nunito_600SemiBold",
  bold: "Nunito_700Bold",
  extra: "Nunito_800ExtraBold",
  black: "Nunito_900Black",
};

export const radius = { sm: 14, md: 18, lg: 24, xl: 32, pill: 999 };
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

export const shadow = {
  shadowColor: "#8A6A3D",
  shadowOpacity: 0.1,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 8 },
  elevation: 4,
};
