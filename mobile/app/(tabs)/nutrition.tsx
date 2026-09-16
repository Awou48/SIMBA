import { useCallback, useEffect, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api, errorMessage, MEAL_TYPES, type DailyMealSummary } from "../../src/lib/api";
import { useChildren } from "../../src/state/child";
import { ChildSwitcher } from "../../src/components/ChildSwitcher";
import { Bounce, Button, Card, Empty, ErrorBox, Header, Loading, Progress, Ring, Row, Screen, SectionTitle, VerdictCard } from "../../src/components/ui";
import { fmtDate, toDateString } from "../../src/lib/format";
import { MEAL_EMOJI, nutritionVerdict } from "../../src/lib/friendly";
import { colors, font, spacing } from "../../src/lib/theme";

const NUTRIENTS = [
  { key: "energy", label: "Energy", color: colors.orange, unit: "kcal", emoji: "🔥" },
  { key: "protein", label: "Protein", color: colors.teal, unit: "g", emoji: "🥚" },
  { key: "carbs", label: "Carbs", color: colors.yellow, unit: "g", emoji: "🍚" },
  { key: "fat", label: "Fat", color: colors.pink, unit: "g", emoji: "🥑" },
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
    Alert.alert("Remove this meal?", name, [
      { text: "Keep", style: "cancel" },
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
  const pctOf = (k: (typeof NUTRIENTS)[number]["key"]) => (t && targets && targets[k] > 0 ? (t[k] / targets[k]) * 100 : 0);
  const verdict = nutritionVerdict(targets ? pctOf("energy") : null, (summary?.meals.length ?? 0) > 0);

  return (
    <Screen refreshing={refreshing} onRefresh={() => load(true)}>
      <Header title="Meals" emoji="🍽️" subtitle="What your child ate and what they still need" />
      <ChildSwitcher />

      <Card style={styles.dateBar}>
        <Bounce onPress={() => setDate(shiftDate(date, -1))} style={styles.dateBtn}>
          <Ionicons name="chevron-back" size={20} color={colors.orange} />
        </Bounce>
        <Bounce onPress={() => setDate(today)} style={{ flex: 1, alignItems: "center" }} haptic={false}>
          <Text style={styles.dateText}>{date === today ? "Today" : date === shiftDate(today, -1) ? "Yesterday" : fmtDate(date, { weekday: "long", day: "numeric", month: "short" })}</Text>
          {date !== today ? <Text style={styles.dateHint}>tap to jump to today</Text> : null}
        </Bounce>
        <Bounce onPress={() => date < today && setDate(shiftDate(date, 1))} style={[styles.dateBtn, date >= today && { opacity: 0.3 }]} disabled={date >= today}>
          <Ionicons name="chevron-forward" size={20} color={colors.orange} />
        </Bounce>
      </Card>

      <ErrorBox message={error} onRetry={() => load()} />
      {loading ? (
        <Loading />
      ) : (
        <>
          <VerdictCard {...verdict} />

          <Card>
            <Row style={{ justifyContent: "space-around", marginBottom: spacing.md }}>
              {NUTRIENTS.slice(0, 2).map((n) => (
                <Ring key={n.key} value={pctOf(n.key)} color={n.color} label={`${Math.round(pctOf(n.key))}%`} sub={n.label.toLowerCase()} size={96} />
              ))}
            </Row>
            {NUTRIENTS.map((n) => {
              const p = pctOf(n.key);
              return (
                <View key={n.key} style={{ marginTop: spacing.sm }}>
                  <Row style={{ justifyContent: "space-between", marginBottom: 5 }}>
                    <Text style={styles.nutrient}>
                      {n.emoji} {n.label}
                    </Text>
                    <Text style={styles.meta}>
                      <Text style={{ fontFamily: font.black, color: colors.text }}>{Math.round(t?.[n.key] ?? 0)}</Text>
                      {targets ? ` of ${Math.round(targets[n.key])} ${n.unit}` : ` ${n.unit}`}
                    </Text>
                  </Row>
                  <Progress value={p} color={n.color} height={8} />
                </View>
              );
            })}
            {summary?.akg_bracket ? <Text style={styles.akg}>Daily needs for age {summary.akg_bracket} (AKG 2019)</Text> : null}
          </Card>

          <Button title="Add a meal" emoji="🍲" onPress={() => router.push(`/meal?date=${date}`)} />

          <SectionTitle title="Meals this day" emoji="🥣" />
          {!summary || summary.meals.length === 0 ? (
            <Card>
              <Empty emoji="🍽️" title="Nothing logged yet" body="Tap “Add a meal” and search for what your child ate — even a snack counts." />
            </Card>
          ) : (
            MEAL_TYPES.filter((mt) => summary.meals.some((m) => m.meal_type === mt)).map((mt) => (
              <Card key={mt} style={{ paddingVertical: spacing.sm }}>
                <Row style={{ marginBottom: 4 }}>
                  <Text style={{ fontSize: 18 }}>{MEAL_EMOJI[mt]}</Text>
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
                      <Bounce onPress={() => remove(m.id, m.food_name)} hitSlop={8} accessibilityLabel="Remove meal" style={styles.trash}>
                        <Ionicons name="close" size={16} color={colors.muted} />
                      </Bounce>
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
  dateBar: { flexDirection: "row", alignItems: "center", paddingVertical: spacing.sm, paddingHorizontal: spacing.sm },
  dateBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.orangeSoft, alignItems: "center", justifyContent: "center" },
  dateText: { fontFamily: font.black, fontSize: 16, color: colors.text },
  dateHint: { fontFamily: font.regular, fontSize: 10, color: colors.muted },
  meta: { fontFamily: font.regular, fontSize: 12, color: colors.muted },
  nutrient: { fontFamily: font.extra, fontSize: 13, color: colors.text },
  akg: { fontFamily: font.regular, fontSize: 11, color: colors.muted, marginTop: spacing.md, textAlign: "center" },
  mealType: { fontFamily: font.extra, fontSize: 14, color: colors.text },
  mealRow: { paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.line },
  mealName: { fontFamily: font.extra, fontSize: 14, color: colors.text },
  trash: { width: 30, height: 30, borderRadius: 15, backgroundColor: "#F4F1EC", alignItems: "center", justifyContent: "center" },
});
