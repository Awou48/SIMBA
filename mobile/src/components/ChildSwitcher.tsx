import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useChildren } from "../state/child";
import { formatAge } from "../lib/format";
import { colors, font, INK_BORDER, radius, spacing } from "../lib/theme";
import { Bounce, Hard, Icon } from "./ui";

export function ChildSwitcher() {
  const { children, active, select } = useChildren();
  const [open, setOpen] = useState(false);
  const router = useRouter();

  if (!active) return null;

  return (
    <>
      <Bounce onPress={() => setOpen(true)} accessibilityLabel="Ganti anak" style={{ marginBottom: spacing.md }}>
        <Hard r={radius.md} offset={3}>
          <View style={styles.trigger}>
            <Avatar gender={active.gender} />
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{active.name}</Text>
              <Text style={styles.meta}>{formatAge(active.birth_date)}</Text>
            </View>
            {children.length > 1 ? (
              <View style={styles.switch}>
                <Text style={styles.switchText}>Ganti anak</Text>
                <Icon name="chevron-down" size={18} color={colors.coral} />
              </View>
            ) : (
              <Icon name="chevron-down" size={18} color={colors.muted} />
            )}
          </View>
        </Hard>
      </Bounce>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>Anak siapa yang ingin dilihat?</Text>
            {children.map((c) => (
              <Bounce
                key={c.id}
                onPress={() => {
                  select(c.id);
                  setOpen(false);
                }}
                style={{ marginBottom: spacing.sm }}
              >
                <Hard r={radius.md} offset={3} bg={c.id === active.id ? colors.yellowSoft : colors.white}>
                  <View style={styles.option}>
                    <Avatar gender={c.gender} size={46} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.name}>{c.name}</Text>
                      <Text style={styles.meta}>
                        {formatAge(c.birth_date)}
                        {c.region ? ` · ${c.region}` : ""}
                      </Text>
                    </View>
                    {c.id === active.id ? <Icon name="checkmark-circle" size={24} color={colors.green} /> : null}
                  </View>
                </Hard>
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
                <Icon name="add" size={24} color={colors.coral} />
              </View>
              <Text style={styles.addText}>Tambah anak</Text>
            </Bounce>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

export function Avatar({ gender, size = 42 }: { gender: "male" | "female"; size?: number }) {
  const bg = gender === "female" ? colors.coral : colors.teal;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, borderWidth: INK_BORDER, borderColor: colors.ink, alignItems: "center", justifyContent: "center" }}>
      <Icon name="happy-outline" size={size * 0.56} color={colors.white} />
    </View>
  );
}

const styles = StyleSheet.create({
  trigger: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md },
  name: { fontFamily: font.extra, fontSize: 16, color: colors.ink },
  meta: { fontFamily: font.regular, fontSize: 13, color: colors.muted, marginTop: 1 },
  switch: { flexDirection: "row", alignItems: "center", gap: 2 },
  switchText: { fontFamily: font.extra, fontSize: 13, color: colors.coral },
  backdrop: { flex: 1, backgroundColor: "rgba(43,33,24,0.5)", justifyContent: "flex-end" },
  sheet: { backgroundColor: colors.cream, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, borderTopWidth: INK_BORDER, borderColor: colors.ink, padding: spacing.lg, paddingBottom: spacing.xxl },
  handle: { alignSelf: "center", width: 44, height: 5, borderRadius: 3, backgroundColor: colors.ink, marginBottom: spacing.md, opacity: 0.3 },
  sheetTitle: { fontFamily: font.display, fontSize: 20, color: colors.ink, marginBottom: spacing.md },
  option: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md },
  addRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.sm, marginTop: spacing.xs },
  addIcon: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.coralSoft, borderWidth: INK_BORDER, borderColor: colors.ink, alignItems: "center", justifyContent: "center" },
  addText: { color: colors.coral, fontFamily: font.extra, fontSize: 16 },
});
