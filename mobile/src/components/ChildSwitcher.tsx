import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useChildren } from "../state/child";
import { formatAge } from "../lib/format";
import { childEmoji } from "../lib/friendly";
import { colors, font, radius, spacing } from "../lib/theme";
import { Bounce } from "./ui";

export function ChildSwitcher({ light }: { light?: boolean }) {
  const { children, active, select } = useChildren();
  const [open, setOpen] = useState(false);
  const router = useRouter();

  if (!active) return null;

  return (
    <>
      <Bounce onPress={() => setOpen(true)} style={[styles.trigger, light && styles.triggerLight]} accessibilityLabel="Switch child">
        <Avatar gender={active.gender} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.name, light && { color: colors.white }]}>{active.name}</Text>
          <Text style={[styles.meta, light && { color: "rgba(255,255,255,0.85)" }]}>
            {formatAge(active.birth_date)}
            {children.length > 1 ? ` · ${children.length} children` : ""}
          </Text>
        </View>
        <Ionicons name="chevron-down" size={18} color={light ? colors.white : colors.muted} />
      </Bounce>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>Who are we looking at?</Text>
            {children.map((c) => (
              <Bounce
                key={c.id}
                onPress={() => {
                  select(c.id);
                  setOpen(false);
                }}
                style={[styles.option, c.id === active.id && styles.optionOn]}
              >
                <Avatar gender={c.gender} size={46} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{c.name}</Text>
                  <Text style={styles.meta}>
                    {formatAge(c.birth_date)}
                    {c.region ? ` · ${c.region}` : ""}
                  </Text>
                </View>
                {c.id === active.id ? <Ionicons name="checkmark-circle" size={22} color={colors.orange} /> : null}
              </Bounce>
            ))}
            <Bounce
              onPress={() => {
                setOpen(false);
                router.push("/add-child");
              }}
              style={styles.addRow}
            >
              <View style={styles.addIcon}>
                <Ionicons name="add" size={22} color={colors.orange} />
              </View>
              <Text style={styles.addText}>Add another child</Text>
            </Bounce>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

export function Avatar({ gender, size = 42 }: { gender: "male" | "female"; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.white, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ fontSize: size * 0.55 }}>{childEmoji(gender)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  trigger: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md },
  triggerLight: { backgroundColor: "rgba(255,255,255,0.25)" },
  name: { fontFamily: font.extra, fontSize: 16, color: colors.text },
  meta: { fontFamily: font.regular, fontSize: 12, color: colors.muted, marginTop: 1 },
  backdrop: { flex: 1, backgroundColor: "rgba(45,48,71,0.45)", justifyContent: "flex-end" },
  sheet: { backgroundColor: colors.cream, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg, paddingBottom: spacing.xxl },
  handle: { alignSelf: "center", width: 44, height: 5, borderRadius: 3, backgroundColor: "#E4DED4", marginBottom: spacing.md },
  sheetTitle: { fontFamily: font.black, fontSize: 18, color: colors.text, marginBottom: spacing.sm },
  option: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.white, marginBottom: 8 },
  optionOn: { backgroundColor: colors.orangeSoft },
  addRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.sm, marginTop: spacing.xs },
  addIcon: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.orangeSoft, alignItems: "center", justifyContent: "center" },
  addText: { color: colors.orange, fontFamily: font.extra, fontSize: 15 },
});
