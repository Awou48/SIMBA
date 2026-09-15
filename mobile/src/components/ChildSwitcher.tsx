import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useChildren } from "../state/child";
import { formatAge } from "../lib/format";
import { colors, radius, spacing } from "../lib/theme";

export function ChildSwitcher() {
  const { children, active, select } = useChildren();
  const [open, setOpen] = useState(false);
  const router = useRouter();

  if (!active) return null;

  return (
    <>
      <Pressable onPress={() => setOpen(true)} style={styles.trigger} accessibilityLabel="Switch child">
        <Avatar name={active.name} gender={active.gender} />
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{active.name}</Text>
          <Text style={styles.meta}>{formatAge(active.birth_date)}</Text>
        </View>
        <Ionicons name="chevron-down" size={18} color={colors.muted} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Your children</Text>
            {children.map((c) => (
              <Pressable
                key={c.id}
                onPress={() => {
                  select(c.id);
                  setOpen(false);
                }}
                style={[styles.option, c.id === active.id && styles.optionOn]}
              >
                <Avatar name={c.name} gender={c.gender} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{c.name}</Text>
                  <Text style={styles.meta}>{formatAge(c.birth_date)}{c.region ? ` · ${c.region}` : ""}</Text>
                </View>
                {c.id === active.id ? <Ionicons name="checkmark-circle" size={20} color={colors.primary} /> : null}
              </Pressable>
            ))}
            <Pressable
              onPress={() => {
                setOpen(false);
                router.push("/add-child");
              }}
              style={styles.addRow}
            >
              <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
              <Text style={styles.addText}>Add another child</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

export function Avatar({ name, gender, size = 40 }: { name: string; gender: "male" | "female"; size?: number }) {
  const bg = gender === "female" ? "#fde2e4" : "#dbeafe";
  const fg = gender === "female" ? "#be123c" : "#1d4ed8";
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ color: fg, fontWeight: "800", fontSize: size * 0.42 }}>{name.trim().charAt(0).toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  trigger: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md },
  name: { fontSize: 15, fontWeight: "800", color: colors.text },
  meta: { fontSize: 12, color: colors.muted, marginTop: 1 },
  backdrop: { flex: 1, backgroundColor: "rgba(15,20,45,0.45)", justifyContent: "flex-end" },
  sheet: { backgroundColor: colors.white, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg, paddingBottom: spacing.xxl },
  sheetTitle: { fontSize: 16, fontWeight: "800", color: colors.text, marginBottom: spacing.sm },
  option: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, borderRadius: radius.md },
  optionOn: { backgroundColor: colors.primarySoft },
  addRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, padding: spacing.md, marginTop: spacing.xs },
  addText: { color: colors.primary, fontWeight: "700", fontSize: 14 },
});
