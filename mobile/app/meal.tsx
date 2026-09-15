import { useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api, errorMessage, MEAL_TYPES, type FoodItem, type MealType } from "../src/lib/api";
import { useChildren } from "../src/state/child";
import { toDateString } from "../src/lib/format";
import { Button, Card, ErrorBox, Header, Pill, Row, Screen, Segmented } from "../src/components/ui";
import { colors, radius, spacing } from "../src/lib/theme";

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

  useEffect(() => {
    const handle = setTimeout(async () => {
      setSearching(true);
      try {
        setResults(await api.searchFoods({ q: q.trim() || undefined, limit: 30 }));
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
      router.back();
    } catch (err) {
      setError(errorMessage(err, "Could not log the meal."));
    } finally {
      setBusy(false);
    }
  };

  if (food) {
    return (
      <Screen edges={["top", "bottom"]}>
        <Header title="Add meal" subtitle={date} onBack={() => setFood(null)} />
        <ErrorBox message={error} />
        <Card>
          <Row style={{ justifyContent: "space-between" }}>
            <Text style={styles.foodName}>{food.name}</Text>
            <Pill tone={food.safe ? "good" : "warn"} small>{food.safe ? "Toddler-safe" : "Check age"}</Pill>
          </Row>
          <Text style={styles.meta}>{food.category} · per serving: {Math.round(food.energy)} kcal · {food.protein.toFixed(1)} g protein · {food.carbs.toFixed(1)} g carbs · {food.fat.toFixed(1)} g fat</Text>
        </Card>
        <Text style={styles.label}>Meal</Text>
        <Segmented options={MEAL_TYPES.map((m) => ({ value: m, label: m }))} value={mealType} onChange={setMealType} />
        <Text style={styles.label}>Servings</Text>
        <Card style={styles.stepper}>
          <Pressable onPress={() => setServings((s) => Math.max(0.5, +(s - 0.5).toFixed(1)))} style={styles.stepBtn}>
            <Ionicons name="remove" size={20} color={colors.primary} />
          </Pressable>
          <View style={{ alignItems: "center", flex: 1 }}>
            <Text style={styles.servings}>{servings}</Text>
            <Text style={styles.meta}>{Math.round(food.energy * servings)} kcal · {(food.protein * servings).toFixed(1)} g protein</Text>
          </View>
          <Pressable onPress={() => setServings((s) => Math.min(10, +(s + 0.5).toFixed(1)))} style={styles.stepBtn}>
            <Ionicons name="add" size={20} color={colors.primary} />
          </Pressable>
        </Card>
        <Button title="Log meal" onPress={save} loading={busy} />
      </Screen>
    );
  }

  return (
    <Screen scroll={false} edges={["top", "bottom"]} style={{ flex: 1 }}>
      <Header title="Find a food" subtitle="1,600+ items from the toddler-safe food database" onBack={() => router.back()} />
      <View style={styles.search}>
        <Ionicons name="search" size={18} color={colors.muted} />
        <TextInput value={q} onChangeText={setQ} placeholder="Search e.g. bubur, telur, pisang" placeholderTextColor="#a2a7bf" style={styles.searchInput} autoFocus autoCorrect={false} />
        {q ? (
          <Pressable onPress={() => setQ("")} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={colors.muted} />
          </Pressable>
        ) : null}
      </View>
      <ErrorBox message={error} />
      <FlatList
        data={results}
        keyExtractor={(f) => String(f.id)}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: spacing.xxl }}
        ListEmptyComponent={<Text style={[styles.meta, { textAlign: "center", marginTop: spacing.xl }]}>{searching ? "Searching…" : "No foods match."}</Text>}
        renderItem={({ item }) => (
          <Pressable onPress={() => setFood(item)} style={({ pressed }) => [styles.result, pressed && { backgroundColor: colors.primarySoft }]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.resultName}>{item.name}</Text>
              <Text style={styles.meta}>{item.category} · {Math.round(item.energy)} kcal · {item.protein.toFixed(1)} g protein</Text>
            </View>
            {item.safe ? <Ionicons name="checkmark-circle" size={18} color={colors.good} /> : <Ionicons name="alert-circle-outline" size={18} color={colors.warn} />}
          </Pressable>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  search: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 10, marginBottom: spacing.md },
  searchInput: { flex: 1, fontSize: 16, color: colors.text },
  result: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12, paddingHorizontal: 10, borderRadius: radius.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  resultName: { fontSize: 15, fontWeight: "700", color: colors.text },
  meta: { fontSize: 12, color: colors.muted, marginTop: 2 },
  foodName: { fontSize: 17, fontWeight: "800", color: colors.text, flex: 1, marginRight: 8 },
  label: { fontSize: 12, fontWeight: "700", color: colors.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.4 },
  stepper: { flexDirection: "row", alignItems: "center", paddingVertical: spacing.sm },
  stepBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
  servings: { fontSize: 28, fontWeight: "800", color: colors.text },
});
