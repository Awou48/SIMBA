import { useCallback, useEffect, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { api, errorMessage, MEAL_TYPES, type DailyMealSummary } from "../../src/lib/api";
import { useChildren } from "../../src/state/child";
import { ChildSwitcher } from "../../src/components/ChildSwitcher";
import { Bounce, Button, Card, Empty, ErrorBox, Hard, Icon, Loading, Progress, Ring, Row, Screen, SectionTitle, VerdictCard, YellowBar } from "../../src/components/ui";
import { fmtDate, num, toDateString } from "../../src/lib/format";
import { MEAL_ICON, MEAL_LABEL, nutritionVerdict } from "../../src/lib/friendly";
import { colors, font, INK_BORDER, spacing } from "../../src/lib/theme";

const NUTRIENTS = [
  { key: "energy", label: "Energi", color: colors.coral, unit: "kkal" },
  { key: "protein", label: "Protein", color: colors.teal, unit: "g" },
] as const;

function shiftDate(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return toDateString(d);
}

export default function Nutrition() {
  const { active } = useChildren();
  const router = useRouter();
  const [date, setDate] = useState(toDateString(new Date()));
  const [summary, setSummary] = useState<DailyMealSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const today = toDateString(new Date());

  const load = useCallback(
    async (soft = false) => {
      if (!active) return;
      soft ? setRefreshing(true) : setLoading(true);
      setError("");
      try {
        setSummary(await api.dailyMeals(active.id, date));
      } catch (err) {
        setError(errorMessage(err, "Catatan makan belum bisa dimuat."));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [active, date],
  );

  useEffect(() => {
    load();
  }, [load]);

  const remove = (mealId: number, name: string) => {
    if (!active) return;
    Alert.alert("Hapus catatan ini?", name, [
      { text: "Batal", style: "cancel" },
      {
        text: "Hapus",
        style: "destructive",
        onPress: async () => {
          try {
            await api.deleteMeal(active.id, mealId);
            load(true);
          } catch (err) {
            setError(errorMessage(err));
          }
        },
      },
    ]);
  };

  const t = summary?.totals;
  const targets = summary?.targets;
  const pctOf = (k: (typeof NUTRIENTS)[number]["key"]) => (t && targets && targets[k] > 0 ? (t[k] / targets[k]) * 100 : 0);
  const verdict = nutritionVerdict(targets ? pctOf("energy") : null, (summary?.meals.length ?? 0) > 0);
  const dateLabel = date === today ? "Hari ini" : date === shiftDate(today, -1) ? "Kemarin" : fmtDate(date, "day");

  return (
    <Screen padded={false} refreshing={refreshing} onRefresh={() => load(true)}>
      <YellowBar title="Makan" subtitle={`Apa yang ${active?.name ?? "si kecil"} makan`} />
      <View style={styles.body}>
        <ChildSwitcher />

        <Hard r={999} offset={3} style={{ marginBottom: spacing.md }}>
          <Row style={styles.dateBar}>
            <Bounce onPress={() => setDate(shiftDate(date, -1))} style={styles.dateBtn} accessibilityLabel="Hari sebelumnya">
              <Icon name="chevron-back" size={22} />
            </Bounce>
            <Bounce onPress={() => setDate(today)} style={{ flex: 1, alignItems: "center" }} haptic={false}>
              <Text style={styles.dateText}>{dateLabel}</Text>
              {date !== today ? <Text style={styles.dateHint}>ketuk untuk kembali ke hari ini</Text> : null}
            </Bounce>
            <Bounce onPress={() => date < today && setDate(shiftDate(date, 1))} style={[styles.dateBtn, date >= today && { opacity: 0.3 }]} disabled={date >= today} accessibilityLabel="Hari berikutnya">
              <Icon name="chevron-forward" size={22} />
            </Bounce>
          </Row>
        </Hard>

        <ErrorBox message={error} onRetry={() => load()} />
        {loading ? (
          <Loading />
        ) : (
          <>
            <VerdictCard {...verdict} />

            <Card>
              <Row style={{ justifyContent: "center", gap: spacing.xl, marginBottom: spacing.sm }}>
                {NUTRIENTS.map((n) => (
                  <Ring key={n.key} value={pctOf(n.key)} color={n.color} label={`${Math.round(pctOf(n.key))}%`} sub={n.label.toUpperCase()} />
                ))}
              </Row>
              {NUTRIENTS.map((n) => (
                <View key={n.key} style={{ marginTop: spacing.sm, gap: 6 }}>
                  <Row style={{ justifyContent: "space-between" }}>
                    <Text style={styles.nutrient}>{n.label}</Text>
                    <Text style={styles.meta}>
                      <Text style={{ fontFamily: font.display, color: colors.ink, fontSize: 15 }}>{num(t?.[n.key] ?? 0, 0)}</Text>
                      {targets ? ` dari ${num(targets[n.key], 0)} ${n.unit}` : ` ${n.unit}`}
                    </Text>
                  </Row>
                  <Progress value={pctOf(n.key)} color={n.color} />
                </View>
              ))}
              {summary?.akg_bracket ? <Text style={styles.akg}>Kebutuhan harian usia {summary.akg_bracket} (AKG 2019)</Text> : null}
            </Card>

            <Button title="Tambah makanan" icon="add" onPress={() => router.push(`/meal?date=${date}`)} />

            <SectionTitle title="Sudah dicatat" />
            {!summary || summary.meals.length === 0 ? (
              <Card>
                <Empty icon="restaurant-outline" title="Belum ada catatan" body="Ketuk “Tambah makanan” dan cari apa yang dimakan si kecil. Camilan juga dihitung." />
              </Card>
            ) : (
              MEAL_TYPES.filter((mt) => summary.meals.some((m) => m.meal_type === mt)).map((mt) => (
                <Card key={mt} pad={spacing.md}>
                  <Row>
                    <Icon name={MEAL_ICON[mt]} size={20} color="#00777A" />
                    <Text style={styles.mealType}>{MEAL_LABEL[mt]}</Text>
                  </Row>
                  {summary.meals
                    .filter((m) => m.meal_type === mt)
                    .map((m) => (
                      <Row key={m.id} style={styles.mealRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.mealName}>{m.food_name}</Text>
                          <Text style={styles.meta}>
                            {num(m.servings)} porsi · {num(m.energy, 0)} kkal · {num(m.protein)} g protein
                          </Text>
                        </View>
                        <Bounce onPress={() => remove(m.id, m.food_name)} style={styles.trash} accessibilityLabel="Hapus">
                          <Icon name="close" size={18} />
                        </Bounce>
                      </Row>
                    ))}
                </Card>
              ))
            )}
          </>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  dateBar: { padding: spacing.sm, gap: spacing.sm },
  dateBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.yellowSoft, borderWidth: INK_BORDER, borderColor: colors.ink, alignItems: "center", justifyContent: "center" },
  dateText: { fontFamily: font.display, fontSize: 18, color: colors.ink },
  dateHint: { fontFamily: font.regular, fontSize: 12, color: colors.muted },
  meta: { fontFamily: font.regular, fontSize: 13, color: colors.muted },
  nutrient: { fontFamily: font.extra, fontSize: 15, color: colors.ink },
  akg: { fontFamily: font.regular, fontSize: 13, color: colors.muted, marginTop: spacing.md, textAlign: "center" },
  mealType: { fontFamily: font.extra, fontSize: 15, color: colors.ink },
  mealRow: { paddingTop: 10, borderTopWidth: 2, borderStyle: "dashed", borderColor: colors.track },
  mealName: { fontFamily: font.extra, fontSize: 15, color: colors.ink },
  trash: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.track, borderWidth: INK_BORDER, borderColor: colors.ink, alignItems: "center", justifyContent: "center" },
});
