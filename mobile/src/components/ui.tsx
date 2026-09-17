import { useEffect, useRef, useState, type ReactNode } from "react";
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
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import DateTimePicker from "@react-native-community/datetimepicker";
import Svg, { Circle } from "react-native-svg";
import { colors, font, INK_BORDER, radius, SHADOW_OFFSET, spacing, tones, type Tone } from "../lib/theme";
import { fmtDate, isValidDate, parseDate, toDateString } from "../lib/format";

export type IconName = keyof typeof Ionicons.glyphMap;
const canVibrate = Platform.OS !== "web";

export function tap(style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light) {
  if (canVibrate) Haptics.impactAsync(style).catch(() => undefined);
}

export function success() {
  if (canVibrate) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
}

export function Icon({ name, size = 22, color = colors.ink }: { name: string; size?: number; color?: string }) {
  return <Ionicons name={name as IconName} size={size} color={color} />;
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
          refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.coral} colors={[colors.coral]} /> : undefined}
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

export function Hard({ children, style, r = radius.lg, bg = colors.white, offset = SHADOW_OFFSET }: { children: ReactNode; style?: StyleProp<ViewStyle>; r?: number; bg?: string; offset?: number }) {
  return (
    <View style={[{ marginRight: offset, marginBottom: offset }, style]}>
      <View style={{ position: "absolute", top: offset, left: offset, right: -offset, bottom: -offset, backgroundColor: colors.ink, borderRadius: r }} />
      <View style={{ backgroundColor: bg, borderRadius: r, borderWidth: INK_BORDER, borderColor: colors.ink, overflow: "hidden" }}>{children}</View>
    </View>
  );
}

export function Card({ children, style, tone, onPress, pad = spacing.lg }: { children: ReactNode; style?: StyleProp<ViewStyle>; tone?: Tone; onPress?: () => void; pad?: number }) {
  const body = (
    <Hard bg={tone ? tones[tone].bg : colors.white} style={[{ marginBottom: spacing.md }, style]}>
      <View style={{ padding: pad, gap: spacing.sm }}>{children}</View>
    </Hard>
  );
  if (!onPress) return body;
  return <Bounce onPress={onPress}>{body}</Bounce>;
}

export function YellowBar({ title, subtitle, onBack, right, children }: { title: string; subtitle?: string; onBack?: () => void; right?: ReactNode; children?: ReactNode }) {
  return (
    <View style={styles.bar}>
      <View style={styles.barRow}>
        {onBack ? (
          <Bounce onPress={onBack} accessibilityLabel="Kembali">
            <Hard r={23} offset={3}>
              <View style={styles.backBtn}>
                <Icon name="chevron-back" size={24} />
              </View>
            </Hard>
          </Bounce>
        ) : null}
        <View style={{ flex: 1 }}>
          <Text style={styles.barTitle}>{title}</Text>
          {subtitle ? <Text style={styles.barSub}>{subtitle}</Text> : null}
        </View>
        {right}
      </View>
      {children}
    </View>
  );
}

export function VerdictCard({ icon, headline, detail, tone, onPress, action }: { icon: string; headline: string; detail: string; tone: Tone; onPress?: () => void; action?: string }) {
  return (
    <Card tone={tone} onPress={onPress}>
      <View style={{ flexDirection: "row", gap: spacing.md }}>
        <View style={styles.verdictIcon}>
          <Icon name={icon} size={26} color={tones[tone].fg} />
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={[styles.verdictHeadline, { color: tones[tone].fg }]}>{headline}</Text>
          <Text style={styles.verdictDetail}>{detail}</Text>
          {action ? <Text style={[styles.verdictAction, { color: tones[tone].fg }]}>{action} ›</Text> : null}
        </View>
      </View>
    </Card>
  );
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

export function Button({ title, onPress, variant = "primary", loading, disabled, icon, style, small }: { title: string; onPress?: () => void; variant?: "primary" | "white" | "ink" | "ghost"; loading?: boolean; disabled?: boolean; icon?: string; style?: StyleProp<ViewStyle>; small?: boolean }) {
  const isDisabled = disabled || loading;
  const bg = variant === "primary" ? colors.coral : variant === "ink" ? colors.ink : colors.white;
  const fg = variant === "primary" ? colors.white : variant === "ink" ? colors.yellow : colors.ink;
  if (variant === "ghost") {
    return (
      <Bounce onPress={onPress} disabled={isDisabled} style={[styles.ghost, style]} haptic={false}>
        <Text style={[styles.btnText, { color: colors.coral, fontSize: 15 }]}>{title}</Text>
      </Bounce>
    );
  }
  return (
    <Bounce onPress={onPress} disabled={isDisabled} style={[{ opacity: isDisabled ? 0.6 : 1 }, style]} scale={0.96}>
      <Hard r={radius.pill} bg={bg}>
        <View style={[styles.btn, small && { paddingVertical: 10, paddingHorizontal: 16 }]}>
          {loading ? <ActivityIndicator color={fg} /> : icon ? <Icon name={icon} size={small ? 18 : 20} color={fg} /> : null}
          <Text style={[styles.btnText, { color: fg }, small && { fontSize: 15 }]}>{title}</Text>
        </View>
      </Hard>
    </Bounce>
  );
}

export function Field({ label, hint, error, icon, ...input }: TextInputProps & { label: string; hint?: string; error?: string; icon?: string }) {
  return (
    <View style={{ marginBottom: spacing.md }}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputWrap, error ? { borderColor: colors.coral } : null]}>
        {icon ? <Icon name={icon} size={20} color={colors.muted} /> : null}
        <TextInput placeholderTextColor="#B9AE9E" {...input} style={[styles.input, input.style]} />
      </View>
      {error ? <Text style={styles.fieldError}>{error}</Text> : hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

export function DateField({ label, value, onChange, hint, maxToday = true }: { label: string; value: string; onChange: (iso: string) => void; hint?: string; maxToday?: boolean }) {
  const [open, setOpen] = useState(false);
  const [typing, setTyping] = useState(false);
  const [draft, setDraft] = useState(value);
  const valid = isValidDate(value);
  if (Platform.OS === "web" || typing) {
    return (
      <Field
        label={label}
        icon="calendar-outline"
        value={draft}
        onChangeText={(v) => {
          setDraft(v);
          if (isValidDate(v)) onChange(v);
        }}
        onBlur={() => setTyping(false)}
        placeholder="TTTT-BB-HH"
        keyboardType="numbers-and-punctuation"
        autoFocus={typing}
        hint={hint ?? "Contoh: 2025-03-14"}
      />
    );
  }
  return (
    <View style={{ marginBottom: spacing.md }}>
      <Text style={styles.label}>{label}</Text>
      <View style={{ flexDirection: "row", gap: spacing.sm }}>
        <Bounce onPress={() => setOpen(true)} style={[styles.inputWrap, { flex: 1 }]} haptic={false}>
          <Icon name="calendar-outline" size={20} color={colors.muted} />
          <Text style={[styles.input, !valid && { color: "#B9AE9E" }]}>{valid ? fmtDate(value, "long") : "Pilih tanggal"}</Text>
        </Bounce>
        <Bounce
          onPress={() => {
            setDraft(value);
            setTyping(true);
          }}
          style={styles.typeBtn}
          accessibilityLabel="Ketik tanggal"
        >
          <Icon name="create-outline" size={20} />
        </Bounce>
      </View>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      {open ? (
        <DateTimePicker
          value={valid ? parseDate(value) : new Date()}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          maximumDate={maxToday ? new Date() : undefined}
          onChange={(_, d) => {
            setOpen(Platform.OS === "ios");
            if (d) onChange(toDateString(d));
          }}
        />
      ) : null}
      {open && Platform.OS === "ios" ? <Button title="Selesai" variant="white" small onPress={() => setOpen(false)} style={{ alignSelf: "flex-end", marginTop: spacing.sm }} /> : null}
    </View>
  );
}

export function Pill({ children, tone = "muted", style }: { children: ReactNode; tone?: Tone; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.pill, { backgroundColor: tones[tone].bg }, style]}>
      <Text style={[styles.pillText, { color: tones[tone].fg }]}>{children}</Text>
    </View>
  );
}

export function Chips<T extends string>({ options, value, onChange }: { options: { value: T; label: string; icon?: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <View style={styles.chips}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Bounce key={o.value} onPress={() => onChange(o.value)} style={[styles.chip, on && styles.chipOn]}>
            {o.icon ? <Icon name={o.icon} size={16} color={on ? colors.yellow : colors.ink} /> : null}
            <Text style={[styles.chipText, on && { color: colors.yellow }]}>{o.label}</Text>
          </Bounce>
        );
      })}
    </View>
  );
}

export function Stepper({ value, onChange, step = 0.1, min = 0, max = 100, unit, color = colors.coral }: { value: number; onChange: (v: number) => void; step?: number; min?: number; max?: number; unit: string; color?: string }) {
  const decimals = step < 1 ? String(step).split(".")[1]?.length ?? 1 : 0;
  const clamp = (v: number) => Math.min(max, Math.max(min, +v.toFixed(decimals)));
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const shown = value.toFixed(decimals).replace(".", ",");
  const commit = () => {
    const n = parseFloat(draft.replace(",", "."));
    if (!Number.isNaN(n)) onChange(clamp(n));
    setEditing(false);
  };
  return (
    <View style={styles.stepper}>
      <Bounce onPress={() => onChange(clamp(value - step))} scale={0.9} accessibilityLabel="Kurangi">
        <Hard r={26} offset={3}>
          <View style={styles.stepBtn}>
            <Icon name="remove" size={26} />
          </View>
        </Hard>
      </Bounce>
      <Pressable
        onPress={() => {
          setDraft(shown);
          setEditing(true);
        }}
        style={{ alignItems: "center", minWidth: 130 }}
        accessibilityLabel="Ketik angka"
      >
        {editing ? (
          <TextInput value={draft} onChangeText={setDraft} onBlur={commit} onSubmitEditing={commit} keyboardType="decimal-pad" autoFocus selectTextOnFocus style={[styles.stepValue, styles.stepInput]} />
        ) : (
          <Text style={styles.stepValue}>{shown}</Text>
        )}
        <Text style={styles.stepUnit}>{unit} · ketuk untuk ketik</Text>
      </Pressable>
      <Bounce onPress={() => onChange(clamp(value + step))} scale={0.9} accessibilityLabel="Tambah">
        <Hard r={26} offset={3} bg={color}>
          <View style={styles.stepBtn}>
            <Icon name="add" size={26} color={colors.white} />
          </View>
        </Hard>
      </Bounce>
    </View>
  );
}

export function Progress({ value, color = colors.coral, height = 12 }: { value: number; color?: string; height?: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  const v = Math.max(0, Math.min(100, value || 0));
  useEffect(() => {
    Animated.timing(anim, { toValue: v, duration: 700, useNativeDriver: false }).start();
  }, [v, anim]);
  return (
    <View style={[styles.progress, { height, borderRadius: height / 2 }]}>
      <Animated.View style={{ height: "100%", backgroundColor: color, width: anim.interpolate({ inputRange: [0, 100], outputRange: ["0%", "100%"] }), borderRightWidth: v > 0 && v < 100 ? INK_BORDER : 0, borderColor: colors.ink }} />
    </View>
  );
}

export function Ring({ value, size = 96, stroke = 12, color = colors.coral, label, sub }: { value: number; size?: number; stroke?: number; color?: string; label?: string; sub?: string }) {
  const r = (size - stroke) / 2 - 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, value || 0));
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={{ position: "absolute", transform: [{ rotate: "-90deg" }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.ink} strokeWidth={stroke + 4} fill="none" />
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.track} strokeWidth={stroke} fill="none" />
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeDasharray={`${c} ${c}`} strokeDashoffset={c * (1 - v / 100)} strokeLinecap="round" />
      </Svg>
      {label ? <Text style={[styles.ringLabel, { fontSize: size * 0.21 }]}>{label}</Text> : null}
      {sub ? <Text style={styles.ringSub}>{sub}</Text> : null}
    </View>
  );
}

export function Row({ children, style, gap = spacing.sm }: { children: ReactNode; style?: StyleProp<ViewStyle>; gap?: number }) {
  return <View style={[{ flexDirection: "row", alignItems: "center", gap }, style]}>{children}</View>;
}

export function ListItem({ title, subtitle, right, onPress, icon, tone = "coral", last }: { title: string; subtitle?: string; right?: ReactNode; onPress?: () => void; icon: string; tone?: Tone; last?: boolean }) {
  const body = (
    <View style={[styles.listItem, !last && styles.listDivider]}>
      <View style={[styles.listIcon, { backgroundColor: tones[tone].bg }]}>
        <Icon name={icon} size={22} color={tones[tone].fg} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.listTitle}>{title}</Text>
        {subtitle ? <Text style={styles.listSubtitle}>{subtitle}</Text> : null}
      </View>
      {right ?? (onPress ? <Icon name="chevron-forward" size={20} color={colors.muted} /> : null)}
    </View>
  );
  return onPress ? <Bounce onPress={onPress}>{body}</Bounce> : body;
}

export function Empty({ icon = "sunny-outline", title, body, action }: { icon?: string; title: string; body?: string; action?: ReactNode }) {
  return (
    <View style={styles.empty}>
      <Icon name={icon} size={44} color={colors.muted} />
      <Text style={styles.emptyTitle}>{title}</Text>
      {body ? <Text style={styles.emptyBody}>{body}</Text> : null}
      {action ? <View style={{ marginTop: spacing.md, alignSelf: "stretch" }}>{action}</View> : null}
    </View>
  );
}

export function Loading({ label }: { label?: string }) {
  return (
    <View style={styles.loading}>
      <ActivityIndicator size="large" color={colors.coral} />
      {label ? <Text style={styles.hint}>{label}</Text> : null}
    </View>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  if (!message) return null;
  return (
    <View style={styles.errorBox}>
      <Icon name="alert-circle-outline" size={22} color={tones.bad.fg} />
      <Text style={styles.errorText}>{message}</Text>
      {onRetry ? (
        <Pressable onPress={onRetry} hitSlop={8}>
          <Text style={[styles.sectionAction, { color: tones.bad.fg }]}>Coba lagi</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function Celebrate({ icon = "star", title, body }: { icon?: string; title: string; body?: string }) {
  const scale = useRef(new Animated.Value(0.3)).current;
  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    success();
    Animated.parallel([Animated.spring(scale, { toValue: 1, useNativeDriver: true, bounciness: 14 }), Animated.timing(fade, { toValue: 1, duration: 400, useNativeDriver: true })]).start();
  }, [scale, fade]);
  return (
    <Animated.View style={[styles.celebrate, { opacity: fade, transform: [{ scale }] }]}>
      <Hard r={75} bg={colors.yellow}>
        <View style={{ width: 146, height: 146, alignItems: "center", justifyContent: "center" }}>
          <Icon name={icon} size={84} />
        </View>
      </Hard>
      <Text style={styles.celebrateTitle}>{title}</Text>
      {body ? <Text style={styles.celebrateBody}>{body}</Text> : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scrollContent: { paddingBottom: spacing.xxl + 56 },
  padded: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  bar: { backgroundColor: colors.yellow, paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.lg, borderBottomWidth: INK_BORDER, borderColor: colors.ink, gap: spacing.md },
  barRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  backBtn: { width: 46, height: 46, alignItems: "center", justifyContent: "center" },
  barTitle: { fontFamily: font.display, fontSize: 26, color: colors.ink, lineHeight: 31 },
  barSub: { fontFamily: font.bold, fontSize: 14, color: colors.headerSub, marginTop: 2 },
  verdictIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.white, borderWidth: INK_BORDER, borderColor: colors.ink, alignItems: "center", justifyContent: "center" },
  verdictHeadline: { fontFamily: font.display, fontSize: 19, lineHeight: 24 },
  verdictDetail: { fontFamily: font.regular, fontSize: 14, color: colors.ink, opacity: 0.85, lineHeight: 20 },
  verdictAction: { fontFamily: font.extra, fontSize: 14, marginTop: 4 },
  sectionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: spacing.sm, marginBottom: spacing.sm },
  sectionTitle: { fontFamily: font.display, fontSize: 19, color: colors.ink },
  sectionAction: { fontFamily: font.extra, fontSize: 14, color: colors.coral },
  btn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 15, paddingHorizontal: 20 },
  btnText: { fontFamily: font.display, fontSize: 18 },
  ghost: { alignItems: "center", paddingVertical: 12 },
  label: { fontFamily: font.extra, fontSize: 14, color: colors.ink, marginBottom: 6 },
  inputWrap: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: colors.white, borderWidth: INK_BORDER, borderColor: colors.ink, borderRadius: radius.md, paddingHorizontal: 14, minHeight: 54 },
  input: { flex: 1, fontSize: 16, color: colors.ink, fontFamily: font.bold, paddingVertical: 12 },
  typeBtn: { width: 54, height: 54, borderRadius: radius.md, backgroundColor: colors.yellowSoft, borderWidth: INK_BORDER, borderColor: colors.ink, alignItems: "center", justifyContent: "center" },
  hint: { fontFamily: font.regular, fontSize: 13, color: colors.muted, marginTop: 6, lineHeight: 18 },
  fieldError: { fontFamily: font.bold, fontSize: 13, color: tones.bad.fg, marginTop: 6 },
  pill: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, borderWidth: INK_BORDER, borderColor: colors.ink },
  pillText: { fontFamily: font.extra, fontSize: 12 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: spacing.md },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, paddingVertical: 11, borderRadius: radius.pill, backgroundColor: colors.white, borderWidth: INK_BORDER, borderColor: colors.ink },
  chipOn: { backgroundColor: colors.ink },
  chipText: { fontFamily: font.extra, fontSize: 14, color: colors.ink },
  stepper: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.lg },
  stepBtn: { width: 52, height: 52, alignItems: "center", justifyContent: "center" },
  stepValue: { fontFamily: font.display, fontSize: 44, color: colors.ink, textAlign: "center" },
  stepInput: { minWidth: 130, padding: 0, borderBottomWidth: 2, borderColor: colors.coral },
  stepUnit: { fontFamily: font.bold, fontSize: 13, color: colors.muted, marginTop: -2 },
  progress: { backgroundColor: colors.track, overflow: "hidden", width: "100%", borderWidth: INK_BORDER, borderColor: colors.ink },
  ringLabel: { fontFamily: font.display, color: colors.ink },
  ringSub: { fontFamily: font.extra, fontSize: 12, color: colors.muted },
  listItem: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: 12 },
  listDivider: { borderBottomWidth: 2, borderStyle: "dashed", borderColor: colors.track },
  listIcon: { width: 46, height: 46, borderRadius: 14, borderWidth: INK_BORDER, borderColor: colors.ink, alignItems: "center", justifyContent: "center" },
  listTitle: { fontFamily: font.extra, fontSize: 16, color: colors.ink },
  listSubtitle: { fontFamily: font.regular, fontSize: 13, color: colors.muted, marginTop: 2 },
  empty: { alignItems: "center", paddingVertical: spacing.xl, paddingHorizontal: spacing.md, gap: 8 },
  emptyTitle: { fontFamily: font.display, fontSize: 18, color: colors.ink, textAlign: "center" },
  emptyBody: { fontFamily: font.regular, fontSize: 14, color: colors.muted, textAlign: "center", lineHeight: 20 },
  loading: { padding: spacing.xxl, alignItems: "center", gap: spacing.sm },
  errorBox: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: colors.coralSoft, borderRadius: radius.md, borderWidth: INK_BORDER, borderColor: colors.ink, padding: 14, marginBottom: spacing.md },
  errorText: { flex: 1, color: tones.bad.fg, fontFamily: font.bold, fontSize: 14, lineHeight: 19 },
  celebrate: { alignItems: "center", paddingVertical: spacing.xl, gap: 12 },
  celebrateTitle: { fontFamily: font.display, fontSize: 34, color: colors.ink, textAlign: "center" },
  celebrateBody: { fontFamily: font.bold, fontSize: 15, color: colors.muted, textAlign: "center", lineHeight: 21, paddingHorizontal: spacing.lg },
});
