import { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api, errorMessage, MEAL_TYPES, type DailyMealSummary, type MealType } from "../../src/lib/api";
import { useChildren } from "../../src/state/child";
import { ChildSwitcher } from "../../src/components/ChildSwitcher";
import { Button, Card, Empty, ErrorBox, Header, Loading, Progress, Row, Screen, SectionTitle } from "../../src/components/ui";
import { fmtDate, toDateString } from "../../src/lib/format";
import { colors, spacing, tones, type Tone } from "../../src/lib/theme";

const MEAL_ICON: Record<MealType, keyof typeof Ionicons.glyphMap> = { Breakfast: "sunny", Lunch: "partly-sunny", Dinner: "moon", Snack: "ice-cream" };

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
        setError(errorMessage(err, "Could not load meals."));
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
    Alert.alert("Remove meal", `Remove "${name}" from this day?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
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
  const pctOf = (k: keyof NonNullable<typeof t>) => (t && targets && targets[k] > 0 ? (t[k] / targets[k]) * 100 : 0);
  const toneFor = (p: number): Tone => (p === 0 ? "muted" : p < 70 ? "warn" : p > 130 ? "bad" : "good");

  return (
    <Screen refreshing={refreshing} onRefresh={() => load(true)}>
      <Header title="Nutrition" subtitle="Daily intake vs AKG 2019 targets" />
      <ChildSwitcher />

      <Card style={styles.dateBar}>
        <Pressable onPress={() => setDate(shiftDate(date, -1))} hitSlop={10}>
          <Ionicons name="chevron-back" size={20} color={colors.primary} />
        </Pressable>
        <Pressable onPress={() => setDate(today)} style={{ flex: 1, alignItems: "center" }}>
          <Text style={styles.dateText}>{date === today ? "Today" : fmtDate(date, { weekday: "short", day: "numeric", month: "short" })}</Text>
          {date !== today ? <Text style={styles.dateHint}>tap for today</Text> : null}
        </Pressable>
        <Pressable onPress={() => date < today && setDate(shiftDate(date, 1))} hitSlop={10} disabled={date >= today}>
          <Ionicons name="chevron-forward" size={20} color={date >= today ? colors.border : colors.primary} />
        </Pressable>
      </Card>

      <ErrorBox message={error} onRetry={() => load()} />
      {loading ? (
        <Loading />
      ) : (
        <>
          <Card>
            <Row style={{ justifyContent: "space-between" }}>
              <Text style={styles.cardTitle}>Daily totals</Text>
              <Text style={styles.meta}>{summary?.akg_bracket ? `AKG ${summary.akg_bracket}` : "no AKG bracket"}</Text>
            </Row>
            {(["energy", "protein", "carbs", "fat"] as const).map((k) => {
              const p = pctOf(k);
              const unit = k === "energy" ? "kcal" : "g";
              return (
                <View key={k} style={{ marginTop: spacing.md }}>
                  <Row style={{ justifyContent: "space-between" }}>
                    <Text style={styles.nutrient}>{k === "energy" ? "Energy" : k === "protein" ? "Protein" : k === "carbs" ? "Carbohydrate" : "Fat"}</Text>
                    <Text style={styles.meta}>
                      <Text style={{ fontWeight: "800", color: colors.text }}>{Math.round(t?.[k] ?? 0)}</Text>
                      {targets ? ` / ${Math.round(targets[k])} ${unit}` : ` ${unit}`}
                      {targets ? <Text style={{ color: tones[toneFor(p)].fg, fontWeight: "800" }}> · {Math.round(p)}%</Text> : null}
                    </Text>
                  </Row>
                  <View style={{ marginTop: 6 }}>
                    <Progress value={p} tone={toneFor(p)} />
                  </View>
                </View>
              );
            })}
          </Card>

          <Button title="Add a meal" icon="add" onPress={() => router.push(`/meal?date=${date}`)} />

          <SectionTitle title={`Meals · ${summary?.meals.length ?? 0}`} />
          {!summary || summary.meals.length === 0 ? (
            <Card>
              <Empty title="Nothing logged" body="Search the toddler-safe food database and add what your child ate." />
            </Card>
          ) : (
            MEAL_TYPES.filter((mt) => summary.meals.some((m) => m.meal_type === mt)).map((mt) => (
              <Card key={mt} style={{ paddingVertical: spacing.sm }}>
                <Row style={{ marginBottom: 4 }}>
                  <Ionicons name={MEAL_ICON[mt]} size={16} color={colors.orange} />
                  <Text style={styles.mealType}>{mt}</Text>
                </Row>
                {summary.meals
                  .filter((m) => m.meal_type === mt)
                  .map((m) => (
                    <Row key={m.id} style={styles.mealRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.mealName}>{m.food_name}</Text>
                        <Text style={styles.meta}>
                          {m.servings} serving{m.servings === 1 ? "" : "s"} · {Math.round(m.energy)} kcal · {m.protein.toFixed(1)} g protein
                        </Text>
                      </View>
                      <Pressable onPress={() => remove(m.id, m.food_name)} hitSlop={8} accessibilityLabel="Remove meal">
                        <Ionicons name="trash-outline" size={18} color={colors.muted} />
                      </Pressable>
                    </Row>
                  ))}
              </Card>
            ))
          )}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  dateBar: { flexDirection: "row", alignItems: "center", paddingVertical: spacing.sm },
  dateText: { fontSize: 15, fontWeight: "800", color: colors.text },
  dateHint: { fontSize: 10, color: colors.muted },
  cardTitle: { fontSize: 14, fontWeight: "800", color: colors.text },
  meta: { fontSize: 12, color: colors.muted },
  nutrient: { fontSize: 13, fontWeight: "700", color: colors.text },
  mealType: { fontSize: 13, fontWeight: "800", color: colors.text },
  mealRow: { paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.border },
  mealName: { fontSize: 14, fontWeight: "700", color: colors.text },
});
