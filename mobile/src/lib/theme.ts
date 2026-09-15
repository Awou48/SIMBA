export const colors = {
  navy: "#1e2a5a",
  primary: "#4f46e5",
  primaryDark: "#3730a3",
  primarySoft: "#eef2ff",
  orange: "#f47b20",
  orangeSoft: "#fff1e6",
  teal: "#5cc8c2",
  tealSoft: "#e6f7f6",
  bg: "#f5f6fb",
  card: "#ffffff",
  text: "#151a33",
  muted: "#6b7190",
  border: "#e4e7f2",
  good: "#10b981",
  goodSoft: "#ecfdf5",
  warn: "#f59e0b",
  warnSoft: "#fffbeb",
  bad: "#e53535",
  badSoft: "#fef2f2",
  white: "#ffffff",
};

export const tones = {
  good: { fg: colors.good, bg: colors.goodSoft },
  warn: { fg: "#b45309", bg: colors.warnSoft },
  bad: { fg: colors.bad, bg: colors.badSoft },
  muted: { fg: colors.muted, bg: "#f1f2f8" },
  primary: { fg: colors.primary, bg: colors.primarySoft },
  orange: { fg: "#c2410c", bg: colors.orangeSoft },
  teal: { fg: "#0f766e", bg: colors.tealSoft },
} as const;

export type Tone = keyof typeof tones;

export const radius = { sm: 10, md: 14, lg: 20, xl: 28 };
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

export const shadow = {
  shadowColor: colors.navy,
  shadowOpacity: 0.08,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 6 },
  elevation: 3,
};
