import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { api, errorMessage, type ArticleView } from "../../src/lib/api";
import { ErrorBox, Loading, Pill, Screen, YellowBar } from "../../src/components/ui";
import { fmtDate } from "../../src/lib/format";
import { CATEGORY_LABEL } from "../../src/lib/friendly";
import { colors, font, spacing } from "../../src/lib/theme";

export default function Article() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [article, setArticle] = useState<ArticleView | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .article(Number(id))
      .then(setArticle)
      .catch((err) => setError(errorMessage(err, "Artikel tidak ditemukan.")));
  }, [id]);

  return (
    <Screen padded={false} edges={["top", "bottom"]}>
      <YellowBar title="Artikel" onBack={() => router.back()} />
      <View style={styles.body}>
        <ErrorBox message={error} />
        {!article && !error ? (
          <Loading />
        ) : article ? (
          <>
            <Pill tone="coral">{CATEGORY_LABEL[article.category] ?? article.category}</Pill>
            <Text style={styles.title}>{article.title}</Text>
            <Text style={styles.meta}>
              {article.author} · {article.read_time_min} menit baca · {fmtDate(article.updated_at)}
            </Text>
            <Text style={styles.summary}>{article.summary}</Text>
            {(article.body ?? "")
              .split(/\n\s*\n/)
              .filter(Boolean)
              .map((p, i) => (
                <Text key={i} style={styles.para}>
                  {p.trim()}
                </Text>
              ))}
          </>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  title: { fontSize: 26, fontFamily: font.display, color: colors.ink, marginTop: spacing.sm, lineHeight: 33 },
  meta: { fontSize: 13, fontFamily: font.regular, color: colors.muted, marginTop: 6 },
  summary: { fontSize: 17, fontFamily: font.extra, color: colors.ink, marginTop: spacing.lg, lineHeight: 25 },
  para: { fontSize: 16, fontFamily: font.regular, color: colors.ink, marginTop: spacing.md, lineHeight: 26 },
});
