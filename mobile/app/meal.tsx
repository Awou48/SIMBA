import { useEffect, useState } from "react";
import { FlatList, StyleSheet, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api, errorMessage, MEAL_TYPES, type FoodItem, type MealType } from "../src/lib/api";
import { useChildren } from "../src/state/child";
import { toDateString } from "../src/lib/format";
import { MEAL_EMOJI } from "../src/lib/friendly";
import { Bounce, Button, Card, Celebrate, Chips, ErrorBox, Header, Pill, Row, Screen, Stepper } from "../src/components/ui";
import { colors, font, radius, spacing } from "../src/lib/theme";

const SUGGESTIONS = ["Bubur", "Nasi", "Telur", "Ayam", "Ikan", "Tempe", "Tahu", "Pisang", "Susu", "Sayur"];

function defaultMealType(): MealType {
  const h = new Date().getHours();
  return h < 10 ? "Breakfast" : h < 15 ? "Lunch" : h < 18 ? "Snack" : "Dinner";
}

export default function NewMeal() {
  const { active } = useChildren();
  const router = useRouter();
  const params = useLocalSearchParams<{ date?: string }>();
  const date = params.date ?? toDateString(new Date());
  const [q, setQ] = useState("");
  const [results, setResults] = useState<FoodItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [food, setFood] = useState<FoodItem | null>(null);
  const [mealType, setMealType] = useState<MealType>(defaultMealType());
  const [servings, setServings] = useState(1);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    const handle = setTimeout(async () => {
      setSearching(true);
      try {
        setResults(await api.searchFoods({ q: q.trim(), limit: 30 }));
      } catch (err) {
        setError(errorMessage(err));
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => clearTimeout(handle);
  }, [q]);

  const save = async () => {
    if (!active || !food) return;
    setBusy(true);
    setError("");
    try {
      await api.logMeal(active.id, { food_id: food.id, meal_type: mealType, date, servings });
      setSaved(true);
      setTimeout(() => router.back(), 1100);
    } catch (err) {
      setError(errorMessage(err, "Could not log the meal."));
    } finally {
      setBusy(false);
    }
  };

  if (saved && food) {
    return (
      <Screen edges={["top", "bottom"]}>
        <Celebrate emoji={MEAL_EMOJI[mealType]} title="Yum, logged!" body={`${food.name} · ${servings} serving${servings === 1 ? "" : "s"}`} />
      </Screen>
    );
  }

  if (food) {
    return (
      <Screen edges={["top", "bottom"]}>
        <Header title="Add meal" emoji="🍲" subtitle={date} onBack={() => setFood(null)} />
        <ErrorBox message={error} />
        <Card>
          <Row style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
            <Text style={styles.foodName}>{food.name}</Text>
            <Pill tone={food.safe ? "good" : "warn"} small>
              {food.safe ? "Toddler-friendly" : "Check age"}
            </Pill>
          </Row>
          <Text style={styles.meta}>
            {food.category} · one serving has {Math.round(food.energy)} kcal and {food.protein.toFixed(1)} g protein
          </Text>
        </Card>

        <Text style={styles.label}>Which meal?</Text>
        <Chips options={MEAL_TYPES.map((m) => ({ value: m, label: m, emoji: MEAL_EMOJI[m] }))} value={mealType} onChange={setMealType} />

        <Text style={styles.label}>How much?</Text>
        <Card>
          <Stepper value={servings} onChange={setServings} step={0.5} min={0.5} max={10} unit={servings === 1 ? "serving" : "servings"} big />
          <Text style={styles.totals}>
            ≈ {Math.round(food.energy * servings)} kcal · {(food.protein * servings).toFixed(1)} g protein
          </Text>
        </Card>
        <Button title="Log this meal" emoji="✅" onPress={save} loading={busy} />
      </Screen>
    );
  }

  return (
    <Screen scroll={false} edges={["top", "bottom"]} style={{ flex: 1 }}>
      <Header title="What did they eat?" emoji="🍽️" onBack={() => router.back()} />
      <View style={styles.search}>
        <Ionicons name="search" size={20} color={colors.muted} />
        <TextInput value={q} onChangeText={setQ} placeholder="Search a food…" placeholderTextColor="#C4C9D6" style={styles.searchInput} autoFocus autoCorrect={false} />
        {q ? (
          <Bounce onPress={() => setQ("")} hitSlop={8} haptic={false}>
            <Ionicons name="close-circle" size={20} color={colors.muted} />
          </Bounce>
        ) : null}
      </View>
      {!q ? (
        <View style={styles.suggest}>
          {SUGGESTIONS.map((s) => (
            <Bounce key={s} onPress={() => setQ(s)} style={styles.suggestChip}>
              <Text style={styles.suggestText}>{s}</Text>
            </Bounce>
          ))}
        </View>
      ) : null}
      <ErrorBox message={error} />
      <FlatList
        data={results}
        keyExtractor={(f) => String(f.id)}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: spacing.xxl }}
        ListEmptyComponent={<Text style={[styles.meta, { textAlign: "center", marginTop: spacing.xl }]}>{!q.trim() ? "Type a food or tap a suggestion above 👆" : searching ? "Searching…" : "No foods match. Try a simpler word."}</Text>}
        renderItem={({ item }) => (
          <Bounce onPress={() => setFood(item)} style={styles.result} scale={0.98}>
            <View style={styles.resultIcon}>
              <Text style={{ fontSize: 20 }}>{item.safe ? "🥣" : "⚠️"}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.resultName}>{item.name}</Text>
              <Text style={styles.meta}>
                {item.category} · {Math.round(item.energy)} kcal
              </Text>
            </View>
            <Ionicons name="add-circle" size={24} color={colors.orange} />
          </Bounce>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  search: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: colors.white, borderRadius: radius.pill, paddingHorizontal: 16, paddingVertical: 12, marginBottom: spacing.md },
  searchInput: { flex: 1, fontSize: 16, color: colors.text, fontFamily: font.bold },
  suggest: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: spacing.md },
  suggestChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: colors.orangeSoft },
  suggestText: { fontFamily: font.extra, fontSize: 13, color: colors.orange },
  result: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, paddingHorizontal: 12, borderRadius: radius.md, backgroundColor: colors.white, marginBottom: 8 },
  resultIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.cream, alignItems: "center", justifyContent: "center" },
  resultName: { fontFamily: font.extra, fontSize: 15, color: colors.text },
  meta: { fontFamily: font.regular, fontSize: 12, color: colors.muted, marginTop: 2 },
  foodName: { fontFamily: font.black, fontSize: 18, color: colors.text, flex: 1, marginRight: 8 },
  label: { fontFamily: font.extra, fontSize: 14, color: colors.text, marginBottom: 8 },
  totals: { fontFamily: font.bold, fontSize: 13, color: colors.muted, textAlign: "center", marginTop: spacing.sm },
});
