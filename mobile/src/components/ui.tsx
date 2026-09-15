import { type ReactNode } from "react";
import {
  ActivityIndicator,
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
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, shadow, spacing, tones, type Tone } from "../lib/theme";

export function Screen({
  children,
  scroll = true,
  padded = true,
  refreshing,
  onRefresh,
  style,
  edges = ["top"],
}: {
  children: ReactNode;
  scroll?: boolean;
  padded?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  style?: StyleProp<ViewStyle>;
  edges?: ("top" | "bottom")[];
}) {
  const inner = <View style={[padded && styles.padded, style]}>{children}</View>;
  return (
    <SafeAreaView style={styles.screen} edges={edges}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.primary} /> : undefined}
        >
          {inner}
        </ScrollView>
      ) : (
        inner
      )}
    </SafeAreaView>
  );
}

export function Header({ title, subtitle, right, onBack }: { title: string; subtitle?: string; right?: ReactNode; onBack?: () => void }) {
  return (
    <View style={styles.header}>
      {onBack && (
        <Pressable onPress={onBack} hitSlop={10} style={styles.backBtn} accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
      )}
      <View style={{ flex: 1 }}>
        <Text style={styles.headerTitle}>{title}</Text>
        {subtitle ? <Text style={styles.headerSubtitle}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}

export function Card({ children, style, tone }: { children: ReactNode; style?: StyleProp<ViewStyle>; tone?: Tone }) {
  return <View style={[styles.card, tone && { backgroundColor: tones[tone].bg, borderColor: "transparent" }, style]}>{children}</View>;
}

export function SectionTitle({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.sectionRow}>
      <Text style={styles.sectionTitle}>{title}</Text>
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
  style,
  ...rest
}: PressableProps & { title: string; variant?: "primary" | "secondary" | "ghost" | "danger"; loading?: boolean; icon?: keyof typeof Ionicons.glyphMap; style?: StyleProp<ViewStyle> }) {
  const isDisabled = disabled || loading;
  const bg = variant === "primary" ? colors.primary : variant === "danger" ? colors.bad : variant === "secondary" ? colors.primarySoft : "transparent";
  const fg = variant === "primary" || variant === "danger" ? colors.white : colors.primary;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [styles.btn, { backgroundColor: bg, opacity: isDisabled ? 0.6 : pressed ? 0.85 : 1 }, variant === "ghost" && styles.btnGhost, style]}
      {...rest}
    >
      {loading ? <ActivityIndicator color={fg} /> : icon ? <Ionicons name={icon} size={16} color={fg} /> : null}
      <Text style={[styles.btnText, { color: fg }]}>{title}</Text>
    </Pressable>
  );
}

export function Field({ label, hint, error, ...input }: TextInputProps & { label: string; hint?: string; error?: string }) {
  return (
    <View style={{ marginBottom: spacing.md }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput placeholderTextColor="#a2a7bf" {...input} style={[styles.input, error ? { borderColor: colors.bad } : null, input.style]} />
      {error ? <Text style={styles.fieldError}>{error}</Text> : hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

export function Pill({ children, tone = "muted", small }: { children: ReactNode; tone?: Tone; small?: boolean }) {
  return (
    <View style={[styles.pill, { backgroundColor: tones[tone].bg }, small && { paddingVertical: 2, paddingHorizontal: 8 }]}>
      <Text style={[styles.pillText, { color: tones[tone].fg }, small && { fontSize: 11 }]}>{children}</Text>
    </View>
  );
}

export function Segmented<T extends string>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <View style={styles.segment}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable key={o.value} onPress={() => onChange(o.value)} style={[styles.segmentItem, on && styles.segmentOn]}>
            <Text style={[styles.segmentText, on && { color: colors.white }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Stat({ label, value, hint, tone = "primary", icon }: { label: string; value: string | number; hint?: string; tone?: Tone; icon?: keyof typeof Ionicons.glyphMap }) {
  return (
    <Card style={styles.stat}>
      {icon ? (
        <View style={[styles.statIcon, { backgroundColor: tones[tone].bg }]}>
          <Ionicons name={icon} size={16} color={tones[tone].fg} />
        </View>
      ) : null}
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {hint ? <Text style={styles.statHint}>{hint}</Text> : null}
    </Card>
  );
}

export function Row({ children, style, gap = spacing.sm }: { children: ReactNode; style?: StyleProp<ViewStyle>; gap?: number }) {
  return <View style={[{ flexDirection: "row", alignItems: "center", gap }, style]}>{children}</View>;
}

export function ListItem({ title, subtitle, right, onPress, icon, iconTone = "primary" }: { title: string; subtitle?: string; right?: ReactNode; onPress?: () => void; icon?: keyof typeof Ionicons.glyphMap; iconTone?: Tone }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => [styles.listItem, pressed && onPress ? { backgroundColor: colors.bg } : null]}>
      {icon ? (
        <View style={[styles.listIcon, { backgroundColor: tones[iconTone].bg }]}>
          <Ionicons name={icon} size={18} color={tones[iconTone].fg} />
        </View>
      ) : null}
      <View style={{ flex: 1 }}>
        <Text style={styles.listTitle}>{title}</Text>
        {subtitle ? <Text style={styles.listSubtitle}>{subtitle}</Text> : null}
      </View>
      {right ?? (onPress ? <Ionicons name="chevron-forward" size={18} color={colors.muted} /> : null)}
    </Pressable>
  );
}

export function Empty({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>{title}</Text>
      {body ? <Text style={styles.emptyBody}>{body}</Text> : null}
      {action ? <View style={{ marginTop: spacing.md }}>{action}</View> : null}
    </View>
  );
}

export function Loading({ label }: { label?: string }) {
  return (
    <View style={styles.loading}>
      <ActivityIndicator size="large" color={colors.primary} />
      {label ? <Text style={styles.hint}>{label}</Text> : null}
    </View>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  if (!message) return null;
  return (
    <View style={styles.errorBox}>
      <Ionicons name="alert-circle" size={18} color={colors.bad} />
      <Text style={styles.errorText}>{message}</Text>
      {onRetry ? (
        <Pressable onPress={onRetry} hitSlop={8}>
          <Text style={[styles.sectionAction, { color: colors.bad }]}>Retry</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function Progress({ value, tone = "primary" }: { value: number; tone?: Tone }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <View style={styles.progress}>
      <View style={[styles.progressFill, { width: `${v}%`, backgroundColor: tones[tone].fg }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  scrollContent: { paddingBottom: spacing.xxl + 40 },
  padded: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: spacing.md },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  headerTitle: { fontSize: 22, fontWeight: "800", color: colors.text },
  headerSubtitle: { fontSize: 13, color: colors.muted, marginTop: 2 },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md, ...shadow },
  sectionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: spacing.sm, marginBottom: spacing.sm },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: colors.text },
  sectionAction: { fontSize: 13, fontWeight: "700", color: colors.primary },
  btn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, paddingHorizontal: 18, borderRadius: radius.md },
  btnGhost: { paddingVertical: 10 },
  btnText: { fontSize: 15, fontWeight: "700" },
  label: { fontSize: 12, fontWeight: "700", color: colors.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.4 },
  input: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: colors.text },
  hint: { fontSize: 12, color: colors.muted, marginTop: 6 },
  fieldError: { fontSize: 12, color: colors.bad, marginTop: 6, fontWeight: "600" },
  pill: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  pillText: { fontSize: 12, fontWeight: "700" },
  segment: { flexDirection: "row", backgroundColor: "#e9ebf5", borderRadius: radius.md, padding: 3, marginBottom: spacing.md },
  segmentItem: { flex: 1, paddingVertical: 9, borderRadius: radius.sm, alignItems: "center" },
  segmentOn: { backgroundColor: colors.primary },
  segmentText: { fontSize: 13, fontWeight: "700", color: colors.muted },
  stat: { flex: 1, padding: spacing.md, minWidth: 0 },
  statIcon: { width: 30, height: 30, borderRadius: 10, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  statValue: { fontSize: 22, fontWeight: "800", color: colors.text },
  statLabel: { fontSize: 12, color: colors.muted, fontWeight: "600", marginTop: 2 },
  statHint: { fontSize: 11, color: colors.muted, marginTop: 2 },
  listItem: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: 12, paddingHorizontal: 4, borderRadius: radius.sm },
  listIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  listTitle: { fontSize: 15, fontWeight: "700", color: colors.text },
  listSubtitle: { fontSize: 12, color: colors.muted, marginTop: 2 },
  empty: { alignItems: "center", paddingVertical: spacing.xl, paddingHorizontal: spacing.lg },
  emptyTitle: { fontSize: 16, fontWeight: "800", color: colors.text, textAlign: "center" },
  emptyBody: { fontSize: 13, color: colors.muted, textAlign: "center", marginTop: 6, lineHeight: 19 },
  loading: { padding: spacing.xxl, alignItems: "center", gap: spacing.sm },
  errorBox: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.badSoft, borderRadius: radius.md, padding: 12, marginBottom: spacing.md },
  errorText: { flex: 1, color: "#991b1b", fontSize: 13, fontWeight: "600" },
  progress: { height: 8, borderRadius: 4, backgroundColor: "#e9ebf5", overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 4 },
});
