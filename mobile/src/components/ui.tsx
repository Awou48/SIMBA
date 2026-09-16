import { useEffect, useRef, type ReactNode } from "react";
import {
  ActivityIndicator,
  Animated,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type PressableProps,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Svg, { Circle } from "react-native-svg";
import { colors, font, gradient, radius, shadow, spacing, tones, type Tone } from "../lib/theme";

const canVibrate = Platform.OS !== "web";

export function tap(style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light) {
  if (canVibrate) Haptics.impactAsync(style).catch(() => undefined);
}

export function success() {
  if (canVibrate) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
}

export function Screen({
  children,
  scroll = true,
  padded = true,
  refreshing,
  onRefresh,
  style,
  edges = ["top"],
  background = colors.cream,
}: {
  children: ReactNode;
  scroll?: boolean;
  padded?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  style?: StyleProp<ViewStyle>;
  edges?: ("top" | "bottom")[];
  background?: string;
}) {
  const inner = <View style={[padded && styles.padded, style]}>{children}</View>;
  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: background }]} edges={edges}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.orange} colors={[colors.orange]} /> : undefined}
        >
          {inner}
        </ScrollView>
      ) : (
        inner
      )}
    </SafeAreaView>
  );
}

export function Bounce({ children, onPress, style, disabled, scale = 0.97, haptic = true, ...rest }: PressableProps & { children: ReactNode; style?: StyleProp<ViewStyle>; scale?: number; haptic?: boolean }) {
  const anim = useRef(new Animated.Value(1)).current;
  const to = (v: number) => Animated.spring(anim, { toValue: v, useNativeDriver: true, speed: 40, bounciness: 6 }).start();
  const flat = (StyleSheet.flatten(style) ?? {}) as ViewStyle;
  const outer = { flex: flat.flex, flexGrow: flat.flexGrow, flexShrink: flat.flexShrink, flexBasis: flat.flexBasis, width: flat.width, alignSelf: flat.alignSelf, margin: flat.margin, marginTop: flat.marginTop, marginBottom: flat.marginBottom, marginLeft: flat.marginLeft, marginRight: flat.marginRight, marginHorizontal: flat.marginHorizontal, marginVertical: flat.marginVertical };
  return (
    <Animated.View style={[outer, { transform: [{ scale: anim }] }]}>
      <Pressable
        onPressIn={() => to(scale)}
        onPressOut={() => to(1)}
        onPress={(e) => {
          if (haptic) tap();
          onPress?.(e);
        }}
        disabled={disabled}
        style={[style, { margin: 0, marginTop: 0, marginBottom: 0, marginLeft: 0, marginRight: 0, marginHorizontal: 0, marginVertical: 0, alignSelf: undefined, width: flat.width !== undefined ? "100%" : undefined }]}
        {...rest}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

export function GradientHeader({ children, colors: c = gradient.sunrise, style }: { children: ReactNode; colors?: readonly [string, string]; style?: StyleProp<ViewStyle> }) {
  return (
    <LinearGradient colors={[c[0], c[1]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.gradientHeader, style]}>
      {children}
    </LinearGradient>
  );
}

export function Header({ title, subtitle, emoji, right, onBack, light }: { title: string; subtitle?: string; emoji?: string; right?: ReactNode; onBack?: () => void; light?: boolean }) {
  const color = light ? colors.white : colors.text;
  return (
    <View style={styles.header}>
      {onBack && (
        <Bounce onPress={onBack} style={[styles.backBtn, light && { backgroundColor: "rgba(255,255,255,0.3)" }]} accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={22} color={color} />
        </Bounce>
      )}
      <View style={{ flex: 1 }}>
        <Text style={[styles.headerTitle, { color }]}>
          {emoji ? `${emoji} ` : ""}
          {title}
        </Text>
        {subtitle ? <Text style={[styles.headerSubtitle, light && { color: "rgba(255,255,255,0.85)" }]}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}

export function Card({ children, style, tone, onPress }: { children: ReactNode; style?: StyleProp<ViewStyle>; tone?: Tone; onPress?: () => void }) {
  const body = <View style={[styles.card, tone && { backgroundColor: tones[tone].bg }, style]}>{children}</View>;
  if (!onPress) return body;
  return <Bounce onPress={onPress}>{body}</Bounce>;
}

export function VerdictCard({ emoji, headline, detail, tone, onPress, action }: { emoji: string; headline: string; detail: string; tone: Tone; onPress?: () => void; action?: string }) {
  return (
    <Card tone={tone} onPress={onPress} style={styles.verdict}>
      <Text style={styles.verdictEmoji}>{emoji}</Text>
      <View style={{ flex: 1 }}>
        <Text style={[styles.verdictHeadline, { color: tones[tone].fg }]}>{headline}</Text>
        <Text style={styles.verdictDetail}>{detail}</Text>
        {action ? <Text style={[styles.verdictAction, { color: tones[tone].fg }]}>{action} ›</Text> : null}
      </View>
    </Card>
  );
}

export function SectionTitle({ title, emoji, action, onAction }: { title: string; emoji?: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.sectionRow}>
      <Text style={styles.sectionTitle}>
        {emoji ? `${emoji} ` : ""}
        {title}
      </Text>
      {action && onAction ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={styles.sectionAction}>{action} ›</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function Button({
  title,
  onPress,
  variant = "primary",
  loading,
  disabled,
  icon,
  emoji,
  style,
  ...rest
}: PressableProps & { title: string; variant?: "primary" | "secondary" | "ghost" | "danger" | "white"; loading?: boolean; icon?: keyof typeof Ionicons.glyphMap; emoji?: string; style?: StyleProp<ViewStyle> }) {
  const isDisabled = disabled || loading;
  const fg = variant === "primary" || variant === "danger" ? colors.white : variant === "white" ? colors.orange : colors.orange;
  const inner = (
    <>
      {loading ? <ActivityIndicator color={fg} /> : emoji ? <Text style={{ fontSize: 16 }}>{emoji}</Text> : icon ? <Ionicons name={icon} size={18} color={fg} /> : null}
      <Text style={[styles.btnText, { color: fg }]}>{title}</Text>
    </>
  );
  return (
    <Bounce onPress={onPress} disabled={isDisabled} style={[{ opacity: isDisabled ? 0.6 : 1 }, style]} scale={0.96} {...rest}>
      {variant === "primary" ? (
        <LinearGradient colors={[gradient.sunrise[0], gradient.sunrise[1]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.btn, styles.btnShadow]}>
          {inner}
        </LinearGradient>
      ) : (
        <View style={[styles.btn, variant === "danger" && { backgroundColor: colors.red }, variant === "secondary" && { backgroundColor: colors.orangeSoft }, variant === "white" && { backgroundColor: colors.white, ...shadow }, variant === "ghost" && { backgroundColor: "transparent", paddingVertical: 10 }]}>
          {inner}
        </View>
      )}
    </Bounce>
  );
}

export function Field({ label, hint, error, emoji, ...input }: TextInputProps & { label: string; hint?: string; error?: string; emoji?: string }) {
  return (
    <View style={{ marginBottom: spacing.md }}>
      <Text style={styles.label}>
        {emoji ? `${emoji} ` : ""}
        {label}
      </Text>
      <TextInput placeholderTextColor="#C4C9D6" {...input} style={[styles.input, error ? { borderColor: colors.red } : null, input.style]} />
      {error ? <Text style={styles.fieldError}>{error}</Text> : hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

export function Pill({ children, tone = "muted", small, style }: { children: ReactNode; tone?: Tone; small?: boolean; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.pill, { backgroundColor: tones[tone].bg }, small && { paddingVertical: 3, paddingHorizontal: 9 }, style]}>
      <Text style={[styles.pillText, { color: tones[tone].fg }, small && { fontSize: 11 }]}>{children}</Text>
    </View>
  );
}

export function Chips<T extends string>({ options, value, onChange }: { options: { value: T; label: string; emoji?: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <View style={styles.chips}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Bounce
            key={o.value}
            onPress={() => onChange(o.value)}
            style={[styles.chip, on && styles.chipOn]}
          >
            <Text style={[styles.chipText, on && { color: colors.white }]}>
              {o.emoji ? `${o.emoji} ` : ""}
              {o.label}
            </Text>
          </Bounce>
        );
      })}
    </View>
  );
}

export function Stepper({ value, onChange, step = 0.1, min = 0, max = 100, unit, big }: { value: number; onChange: (v: number) => void; step?: number; min?: number; max?: number; unit: string; big?: boolean }) {
  const decimals = step < 1 ? String(step).split(".")[1]?.length ?? 1 : 0;
  const clamp = (v: number) => Math.min(max, Math.max(min, +v.toFixed(decimals)));
  return (
    <View style={styles.stepper}>
      <Bounce onPress={() => onChange(clamp(value - step))} style={styles.stepBtn} scale={0.9}>
        <Ionicons name="remove" size={22} color={colors.orange} />
      </Bounce>
      <View style={{ alignItems: "center", minWidth: 110 }}>
        <Text style={[styles.stepValue, big && { fontSize: 40 }]}>{value.toFixed(decimals)}</Text>
        <Text style={styles.stepUnit}>{unit}</Text>
      </View>
      <Bounce onPress={() => onChange(clamp(value + step))} style={styles.stepBtn} scale={0.9}>
        <Ionicons name="add" size={22} color={colors.orange} />
      </Bounce>
    </View>
  );
}

export function Progress({ value, tone = "orange", height = 10, color }: { value: number; tone?: Tone; height?: number; color?: string }) {
  const anim = useRef(new Animated.Value(0)).current;
  const v = Math.max(0, Math.min(100, value || 0));
  useEffect(() => {
    Animated.timing(anim, { toValue: v, duration: 700, useNativeDriver: false }).start();
  }, [v, anim]);
  return (
    <View style={[styles.progress, { height, borderRadius: height / 2 }]}>
      <Animated.View style={[styles.progressFill, { borderRadius: height / 2, backgroundColor: color ?? tones[tone].fg, width: anim.interpolate({ inputRange: [0, 100], outputRange: ["0%", "100%"] }) }]} />
    </View>
  );
}

export function Ring({ value, size = 84, stroke = 10, color = colors.orange, track = "#F4F1EC", label, sub, emoji }: { value: number; size?: number; stroke?: number; color?: string; track?: string; label?: string; sub?: string; emoji?: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, value || 0));
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={{ position: "absolute", transform: [{ rotate: "-90deg" }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeDasharray={`${c} ${c}`} strokeDashoffset={c * (1 - v / 100)} strokeLinecap="round" />
      </Svg>
      {emoji ? <Text style={{ fontSize: size * 0.28 }}>{emoji}</Text> : null}
      {label ? <Text style={[styles.ringLabel, { fontSize: size * 0.2 }]}>{label}</Text> : null}
      {sub ? <Text style={styles.ringSub}>{sub}</Text> : null}
    </View>
  );
}

export function Row({ children, style, gap = spacing.sm }: { children: ReactNode; style?: StyleProp<ViewStyle>; gap?: number }) {
  return <View style={[{ flexDirection: "row", alignItems: "center", gap }, style]}>{children}</View>;
}

export function ListItem({ title, subtitle, right, onPress, emoji, icon, tone = "orange", last }: { title: string; subtitle?: string; right?: ReactNode; onPress?: () => void; emoji?: string; icon?: keyof typeof Ionicons.glyphMap; tone?: Tone; last?: boolean }) {
  const body = (
    <View style={[styles.listItem, !last && styles.listDivider]}>
      {emoji || icon ? (
        <View style={[styles.listIcon, { backgroundColor: tones[tone].bg }]}>{emoji ? <Text style={{ fontSize: 20 }}>{emoji}</Text> : <Ionicons name={icon!} size={20} color={tones[tone].fg} />}</View>
      ) : null}
      <View style={{ flex: 1 }}>
        <Text style={styles.listTitle}>{title}</Text>
        {subtitle ? <Text style={styles.listSubtitle}>{subtitle}</Text> : null}
      </View>
      {right ?? (onPress ? <Ionicons name="chevron-forward" size={18} color={colors.muted} /> : null)}
    </View>
  );
  return onPress ? <Bounce onPress={onPress}>{body}</Bounce> : body;
}

export function Empty({ emoji = "🌤️", title, body, action }: { emoji?: string; title: string; body?: string; action?: ReactNode }) {
  return (
    <View style={styles.empty}>
      <Text style={{ fontSize: 44 }}>{emoji}</Text>
      <Text style={styles.emptyTitle}>{title}</Text>
      {body ? <Text style={styles.emptyBody}>{body}</Text> : null}
      {action ? <View style={{ marginTop: spacing.md, alignSelf: "stretch" }}>{action}</View> : null}
    </View>
  );
}

export function Loading({ label }: { label?: string }) {
  return (
    <View style={styles.loading}>
      <ActivityIndicator size="large" color={colors.orange} />
      {label ? <Text style={styles.hint}>{label}</Text> : null}
    </View>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  if (!message) return null;
  return (
    <View style={styles.errorBox}>
      <Text style={{ fontSize: 18 }}>😕</Text>
      <Text style={styles.errorText}>{message}</Text>
      {onRetry ? (
        <Pressable onPress={onRetry} hitSlop={8}>
          <Text style={[styles.sectionAction, { color: tones.bad.fg }]}>Retry</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function Celebrate({ emoji = "🎉", title, body }: { emoji?: string; title: string; body?: string }) {
  const scale = useRef(new Animated.Value(0.3)).current;
  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    success();
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, bounciness: 14 }),
      Animated.timing(fade, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, [scale, fade]);
  return (
    <Animated.View style={[styles.celebrate, { opacity: fade, transform: [{ scale }] }]}>
      <Text style={{ fontSize: 64 }}>{emoji}</Text>
      <Text style={styles.celebrateTitle}>{title}</Text>
      {body ? <Text style={styles.celebrateBody}>{body}</Text> : null}
    </Animated.View>
  );
}

export const text: Record<string, TextStyle> = {
  title: { fontFamily: font.black, fontSize: 24, color: colors.text },
  h2: { fontFamily: font.extra, fontSize: 17, color: colors.text },
  body: { fontFamily: font.regular, fontSize: 14, color: colors.text, lineHeight: 20 },
  muted: { fontFamily: font.regular, fontSize: 12, color: colors.muted },
  big: { fontFamily: font.black, fontSize: 30, color: colors.text },
};

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scrollContent: { paddingBottom: spacing.xxl + 48 },
  padded: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  gradientHeader: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xl + 8, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: spacing.md },
  backBtn: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: colors.white, ...shadow, shadowOpacity: 0.06 },
  headerTitle: { fontFamily: font.black, fontSize: 24 },
  headerSubtitle: { fontFamily: font.regular, fontSize: 13, color: colors.muted, marginTop: 2 },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md, ...shadow },
  verdict: { flexDirection: "row", gap: spacing.md, alignItems: "flex-start" },
  verdictEmoji: { fontSize: 36, marginTop: -2 },
  verdictHeadline: { fontFamily: font.extra, fontSize: 17, lineHeight: 22 },
  verdictDetail: { fontFamily: font.regular, fontSize: 13, color: colors.text, opacity: 0.8, marginTop: 4, lineHeight: 19 },
  verdictAction: { fontFamily: font.extra, fontSize: 13, marginTop: 8 },
  sectionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: spacing.md, marginBottom: spacing.sm },
  sectionTitle: { fontFamily: font.extra, fontSize: 17, color: colors.text },
  sectionAction: { fontFamily: font.extra, fontSize: 13, color: colors.orange },
  btn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 15, paddingHorizontal: 20, borderRadius: radius.pill },
  btnShadow: { shadowColor: colors.orange, shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
  btnText: { fontFamily: font.extra, fontSize: 16 },
  label: { fontFamily: font.extra, fontSize: 13, color: colors.text, marginBottom: 8 },
  input: { backgroundColor: colors.white, borderWidth: 2, borderColor: colors.line, borderRadius: radius.md, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: colors.text, fontFamily: font.bold },
  hint: { fontFamily: font.regular, fontSize: 12, color: colors.muted, marginTop: 6 },
  fieldError: { fontFamily: font.bold, fontSize: 12, color: colors.red, marginTop: 6 },
  pill: { alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 5, borderRadius: radius.pill },
  pillText: { fontFamily: font.extra, fontSize: 12 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: spacing.md },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: radius.pill, backgroundColor: colors.white, borderWidth: 2, borderColor: colors.line },
  chipOn: { backgroundColor: colors.orange, borderColor: colors.orange },
  chipText: { fontFamily: font.extra, fontSize: 13, color: colors.text },
  stepper: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.lg },
  stepBtn: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.orangeSoft, alignItems: "center", justifyContent: "center" },
  stepValue: { fontFamily: font.black, fontSize: 32, color: colors.text },
  stepUnit: { fontFamily: font.bold, fontSize: 13, color: colors.muted, marginTop: -2 },
  progress: { backgroundColor: "#F4F1EC", overflow: "hidden", width: "100%" },
  progressFill: { height: "100%" },
  ringLabel: { fontFamily: font.black, color: colors.text },
  ringSub: { fontFamily: font.bold, fontSize: 10, color: colors.muted },
  listItem: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: 13 },
  listDivider: { borderBottomWidth: 1, borderBottomColor: colors.line },
  listIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  listTitle: { fontFamily: font.extra, fontSize: 15, color: colors.text },
  listSubtitle: { fontFamily: font.regular, fontSize: 12, color: colors.muted, marginTop: 2 },
  empty: { alignItems: "center", paddingVertical: spacing.xl, paddingHorizontal: spacing.md, gap: 6 },
  emptyTitle: { fontFamily: font.extra, fontSize: 17, color: colors.text, textAlign: "center" },
  emptyBody: { fontFamily: font.regular, fontSize: 13, color: colors.muted, textAlign: "center", lineHeight: 19 },
  loading: { padding: spacing.xxl, alignItems: "center", gap: spacing.sm },
  errorBox: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: colors.redSoft, borderRadius: radius.md, padding: 14, marginBottom: spacing.md },
  errorText: { flex: 1, color: tones.bad.fg, fontFamily: font.bold, fontSize: 13, lineHeight: 18 },
  celebrate: { alignItems: "center", paddingVertical: spacing.xl, gap: 8 },
  celebrateTitle: { fontFamily: font.black, fontSize: 24, color: colors.text, textAlign: "center" },
  celebrateBody: { fontFamily: font.regular, fontSize: 14, color: colors.muted, textAlign: "center", lineHeight: 20, paddingHorizontal: spacing.lg },
});
