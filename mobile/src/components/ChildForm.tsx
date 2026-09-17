import { StyleSheet, Text, View } from "react-native";
import { Bounce, Card, DateField, Field, Hard, Icon } from "./ui";
import { colors, font, spacing } from "../lib/theme";

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
        <Field label="Nama anak" icon="happy-outline" value={value.name} onChangeText={(name) => onChange({ ...value, name })} placeholder="Contoh: Sari" />
        <Text style={styles.label}>Jenis kelamin</Text>
        <View style={styles.genderRow}>
          {(["male", "female"] as const).map((g) => {
            const on = value.gender === g;
            const solid = g === "male" ? colors.teal : colors.coral;
            return (
              <Bounce key={g} onPress={() => onChange({ ...value, gender: g })} style={{ flex: 1 }} scale={0.94}>
                <Hard r={20} bg={on ? solid : colors.white} offset={on ? 4 : 0}>
                  <View style={styles.genderCard}>
                    <Icon name={g === "male" ? "male" : "female"} size={40} color={on ? colors.white : colors.ink} />
                    <Text style={[styles.genderText, on && { color: colors.white }]}>{g === "male" ? "Laki-laki" : "Perempuan"}</Text>
                  </View>
                </Hard>
              </Bounce>
            );
          })}
        </View>
      </Card>
      <Card>
        <DateField label="Tanggal lahir" value={value.birth_date} onChange={(birth_date) => onChange({ ...value, birth_date })} hint="Grafik pertumbuhan dihitung dari tanggal lahir yang tepat." />
        <Field label="Kecamatan (boleh dikosongkan)" icon="location-outline" value={value.region} onChangeText={(region) => onChange({ ...value, region })} placeholder="Contoh: Depok" hint="Hanya dipakai untuk statistik wilayah tanpa nama." />
      </Card>
    </>
  );
}

const styles = StyleSheet.create({
  label: { fontFamily: font.extra, fontSize: 14, color: colors.ink, marginBottom: 6 },
  genderRow: { flexDirection: "row", gap: spacing.md, marginBottom: spacing.xs },
  genderCard: { alignItems: "center", paddingVertical: spacing.lg, gap: 6 },
  genderText: { fontFamily: font.extra, fontSize: 15, color: colors.ink },
});
