import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api, errorMessage, type ArticleView } from "../src/lib/api";
import { Card, Empty, ErrorBox, Header, Loading, Pill, Screen } from "../src/components/ui";
import { fmtDate } from "../src/lib/format";
import { colors, radius, spacing, type Tone } from "../src/lib/theme";

const CATEGORIES = ["All", "Growth", "Nutrition", "Development", "Immunization"];
const TONE: Record<string, Tone> = { Growth: "primary", Nutrition: "orange", Development: "teal", Immunization: "good" };

export default function Explore() {
  const router = useRouter();
  const [rows, setRows] = useState<ArticleView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [category, setCategory] = useState("All");
  const [q, setQ] = useState("");

  useEffect(() => {
    api.listArticles().then(setRows).catch((err) => setError(errorMessage(err))).finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(
    () => rows.filter((a) => (category === "All" || a.category === category) && (!q.trim() || `${a.title} ${a.summary}`.toLowerCase().includes(q.trim().toLowerCase()))),
    [rows, category, q],
  );

  return (
    <Screen>
      <Header title="Explore" subtitle="Articles by the SIMBA health team" onBack={() => router.back()} />
      <View style={styles.search}>
        <Ionicons name="search" size={18} color={colors.muted} />
        <TextInput value={q} onChangeText={setQ} placeholder="Search articles" placeholderTextColor="#a2a7bf" style={styles.searchInput} />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {CATEGORIES.map((c) => (
          <Pressable key={c} onPress={() => setCategory(c)} style={[styles.chip, category === c && styles.chipOn]}>
            <Text style={[styles.chipText, category === c && { color: colors.white }]}>{c}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <ErrorBox message={error} />
      {loading ? (
        <Loading />
      ) : filtered.length === 0 ? (
        <Card>
          <Empty title="No articles" body="Nothing matches this filter yet." />
        </Card>
      ) : (
        filtered.map((a) => (
          <Pressable key={a.id} onPress={() => router.push(`/article/${a.id}`)}>
            <Card>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <Pill tone={TONE[a.category] ?? "muted"} small>{a.category}</Pill>
                <Text style={styles.meta}>{a.read_time_min} min read · {fmtDate(a.updated_at)}</Text>
              </View>
              <Text style={styles.title}>{a.title}</Text>
              <Text style={styles.summary} numberOfLines={2}>{a.summary}</Text>
            </Card>
          </Pressable>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  search: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 10 },
  searchInput: { flex: 1, fontSize: 15, color: colors.text },
  chips: { gap: 8, paddingVertical: spacing.md },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, fontWeight: "700", color: colors.text },
  title: { fontSize: 16, fontWeight: "800", color: colors.text, lineHeight: 22 },
  summary: { fontSize: 13, color: colors.muted, marginTop: 4, lineHeight: 18 },
  meta: { fontSize: 11, color: colors.muted },
});
