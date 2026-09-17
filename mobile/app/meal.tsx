import { useEffect, useState } from "react";
import { FlatList, StyleSheet, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { api, errorMessage, MEAL_TYPES, type FoodItem, type MealType } from "../src/lib/api";
import { useChildren } from "../src/state/child";
import { fmtDate, num, toDateString } from "../src/lib/format";
import { MEAL_ICON, MEAL_LABEL } from "../src/lib/friendly";
import { Bounce, Button, Card, Celebrate, Chips, ErrorBox, Hard, Icon, Pill, Row, Screen, Stepper, YellowBar } from "../src/components/ui";
import { colors, font, INK_BORDER, spacing } from "../src/lib/theme";

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
      setError(errorMessage(err, "Makanan belum bisa dicatat."));
    } finally {
      setBusy(false);
    }
  };

  if (saved && food) {
    return (
      <Screen edges={["top", "bottom"]}>
        <Celebrate icon="restaurant" title="Tercatat!" body={`${food.name} · ${num(servings)} porsi`} />
      </Screen>
    );
  }

  if (food) {
    return (
      <Screen padded={false} edges={["top", "bottom"]}>
        <YellowBar title="Tambah makanan" subtitle={date === toDateString(new Date()) ? "Hari ini" : fmtDate(date, "day")} onBack={() => setFood(null)} />
        <View style={styles.body}>
          <ErrorBox message={error} />
          <Card>
            <Row style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
              <Text style={styles.foodName}>{food.name}</Text>
              <Pill tone={food.safe ? "good" : "warn"}>{food.safe ? "Aman untuk balita" : "Cek usia"}</Pill>
            </Row>
            <Text style={styles.meta}>
              1 porsi = {num(food.energy, 0)} kkal dan {num(food.protein)} g protein
            </Text>
          </Card>
          <Text style={styles.label}>Makan yang mana?</Text>
          <Chips options={MEAL_TYPES.map((m) => ({ value: m, label: MEAL_LABEL[m], icon: MEAL_ICON[m] }))} value={mealType} onChange={setMealType} />
          <Text style={styles.label}>Berapa banyak?</Text>
          <Card>
            <Stepper value={servings} onChange={setServings} step={0.5} min={0.5} max={10} unit="porsi" color={colors.teal} />
            <Text style={styles.totals}>
              = {num(food.energy * servings, 0)} kkal · {num(food.protein * servings)} g protein
            </Text>
          </Card>
          <Button title="Catat" icon="checkmark" onPress={save} loading={busy} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll={false} padded={false} edges={["top", "bottom"]} style={{ flex: 1 }}>
      <YellowBar title="Apa yang dimakan?" subtitle="Ketik nama makanan atau pilih di bawah" onBack={() => router.back()} />
      <View style={[styles.body, { flex: 1 }]}>
        <Hard r={999} offset={3} style={{ marginBottom: spacing.md }}>
          <Row style={styles.search}>
            <Icon name="search" size={22} color={colors.muted} />
            <TextInput value={q} onChangeText={setQ} placeholder="Contoh: bubur ayam" placeholderTextColor="#B9AE9E" style={styles.searchInput} autoFocus autoCorrect={false} />
            {q ? (
              <Bounce onPress={() => setQ("")} hitSlop={8} haptic={false} accessibilityLabel="Hapus pencarian">
                <Icon name="close-circle" size={22} color={colors.muted} />
              </Bounce>
            ) : null}
          </Row>
        </Hard>
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
          ListEmptyComponent={<Text style={[styles.meta, { textAlign: "center", marginTop: spacing.xl }]}>{!q.trim() ? "Ketik nama makanan atau ketuk pilihan di atas." : searching ? "Mencari…" : "Tidak ditemukan. Coba kata yang lebih sederhana."}</Text>}
          renderItem={({ item }) => (
            <Bounce onPress={() => setFood(item)} scale={0.98} style={{ marginBottom: spacing.sm }}>
              <Hard r={18} offset={3}>
                <Row style={styles.result}>
                  <View style={[styles.resultIcon, { backgroundColor: item.safe ? colors.tealSoft : colors.yellowSoft }]}>
                    <Icon name={item.safe ? "restaurant-outline" : "alert-circle-outline"} size={24} color={item.safe ? "#00777A" : "#7A5A00"} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.resultName}>{item.name}</Text>
                    <Text style={styles.meta}>{num(item.energy, 0)} kkal per porsi</Text>
                  </View>
                  <View style={styles.addBtn}>
                    <Icon name="add" size={22} color={colors.white} />
                  </View>
                </Row>
              </Hard>
            </Bounce>
          )}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  search: { gap: 10, paddingHorizontal: 16, minHeight: 56 },
  searchInput: { flex: 1, fontSize: 17, color: colors.ink, fontFamily: font.bold, paddingVertical: 12 },
  suggest: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: spacing.md },
  suggestChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999, backgroundColor: colors.white, borderWidth: INK_BORDER, borderColor: colors.ink },
  suggestText: { fontFamily: font.extra, fontSize: 14, color: colors.ink },
  result: { gap: 12, padding: 12 },
  resultIcon: { width: 46, height: 46, borderRadius: 14, borderWidth: INK_BORDER, borderColor: colors.ink, alignItems: "center", justifyContent: "center" },
  resultName: { fontFamily: font.extra, fontSize: 16, color: colors.ink },
  addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.coral, borderWidth: INK_BORDER, borderColor: colors.ink, alignItems: "center", justifyContent: "center" },
  meta: { fontFamily: font.regular, fontSize: 13, color: colors.muted, marginTop: 2 },
  foodName: { fontFamily: font.display, fontSize: 22, color: colors.ink, flex: 1, marginRight: 8 },
  label: { fontFamily: font.extra, fontSize: 16, color: colors.ink, marginBottom: 8 },
  totals: { fontFamily: font.bold, fontSize: 14, color: colors.muted, textAlign: "center", marginTop: spacing.sm },
});
