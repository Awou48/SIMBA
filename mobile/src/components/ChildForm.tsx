import { StyleSheet, Text, View } from "react-native";
import { Bounce, Card, Field } from "./ui";
import { colors, font, radius, spacing } from "../lib/theme";

export interface ChildFormValue {
  name: string;
  gender: "male" | "female";
  birth_date: string;
  region: string;
}

export function ChildForm({ value, onChange }: { value: ChildFormValue; onChange: (v: ChildFormValue) => void }) {
  return (
    <>
      <Card>
        <Field label="Name" emoji="🧒" value={value.name} onChangeText={(name) => onChange({ ...value, name })} placeholder="e.g. Sari" />
        <Text style={styles.label}>Who are they?</Text>
        <View style={styles.genderRow}>
          {(["male", "female"] as const).map((g) => {
            const on = value.gender === g;
            return (
              <Bounce key={g} onPress={() => onChange({ ...value, gender: g })} style={[styles.genderCard, on && (g === "male" ? styles.boyOn : styles.girlOn)]} scale={0.94}>
                <Text style={{ fontSize: 40 }}>{g === "male" ? "👦" : "👧"}</Text>
                <Text style={[styles.genderText, on && { color: colors.white }]}>{g === "male" ? "Boy" : "Girl"}</Text>
              </Bounce>
            );
          })}
        </View>
      </Card>
      <Card>
        <Field label="Birth date" emoji="🎂" value={value.birth_date} onChangeText={(birth_date) => onChange({ ...value, birth_date })} placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" hint="For example 2025-03-14. Growth charts depend on the exact date." />
        <Field label="Where do you live? (optional)" emoji="📍" value={value.region} onChangeText={(region) => onChange({ ...value, region })} placeholder="e.g. Kecamatan Depok" hint="Only used for anonymous regional statistics." />
      </Card>
    </>
  );
}

const styles = StyleSheet.create({
  label: { fontFamily: font.extra, fontSize: 13, color: colors.text, marginBottom: 8 },
  genderRow: { flexDirection: "row", gap: spacing.md },
  genderCard: { flex: 1, alignItems: "center", paddingVertical: spacing.md, borderRadius: radius.lg, backgroundColor: colors.cream, gap: 4 },
  boyOn: { backgroundColor: colors.teal },
  girlOn: { backgroundColor: colors.pink },
  genderText: { fontFamily: font.extra, fontSize: 14, color: colors.text },
});
