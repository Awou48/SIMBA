import { Alert, Image, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { API_URL } from "../../src/lib/api";
import { useAuth } from "../../src/state/auth";
import { useChildren } from "../../src/state/child";
import { ChildSwitcher } from "../../src/components/ChildSwitcher";
import { Button, Card, ListItem, Screen, SectionTitle, YellowBar } from "../../src/components/ui";
import { fmtDate } from "../../src/lib/format";
import { colors, font, spacing } from "../../src/lib/theme";

export default function More() {
  const router = useRouter();
  const { signOut } = useAuth();
  const { children } = useChildren();

  const confirmSignOut = () =>
    Alert.alert("Keluar dari akun?", "Anda perlu email dan kata sandi untuk masuk lagi.", [
      { text: "Batal", style: "cancel" },
      { text: "Keluar", style: "destructive", onPress: () => signOut().then(() => router.replace("/login")) },
    ]);

  return (
    <Screen padded={false}>
      <YellowBar title="Lainnya" />
      <View style={styles.body}>
        <ChildSwitcher />

        <SectionTitle title="Kesehatan" />
        <Card pad={spacing.md}>
          <ListItem icon="medical-outline" tone="yellow" title="Imunisasi" subtitle="Jadwal dan yang sudah diberikan" onPress={() => router.push("/immunization")} />
          <ListItem icon="calendar-outline" tone="teal" title="Kalender" subtitle="Posyandu, dokter, pengingat" onPress={() => router.push("/calendar")} />
          <ListItem icon="notifications-outline" tone="coral" title="Pengingat" subtitle="Hal yang perlu diperhatikan" onPress={() => router.push("/alerts")} />
          <ListItem icon="document-text-outline" tone="violet" title="Laporan" subtitle="Bagikan PDF ke dokter atau Posyandu" onPress={() => router.push("/reports")} last />
        </Card>

        <SectionTitle title="Belajar" />
        <Card pad={spacing.md}>
          <ListItem icon="book-outline" tone="good" title="Tips & artikel" subtitle="Makanan, tumbuh kembang, imunisasi" onPress={() => router.push("/explore")} last />
        </Card>

        <SectionTitle title="Keluarga" />
        <Card pad={spacing.md}>
          {children.map((c) => (
            <ListItem key={c.id} icon={c.gender === "female" ? "female" : "male"} tone={c.gender === "female" ? "coral" : "teal"} title={c.name} subtitle={`Lahir ${fmtDate(c.birth_date)}${c.region ? ` · ${c.region}` : ""}`} onPress={() => router.push(`/child/${c.id}`)} />
          ))}
          <ListItem icon="add" tone="muted" title="Tambah anak" onPress={() => router.push("/add-child")} last />
        </Card>

        <Button title="Keluar" variant="white" icon="log-out-outline" onPress={confirmSignOut} style={{ marginTop: spacing.sm }} />
        <View style={styles.footer}>
          <Image source={require("../../assets/logo_mark.png")} style={{ width: 28, height: 28 }} resizeMode="contain" />
          <Text style={styles.footerText}>SIMBA · {API_URL.replace(/^https?:\/\//, "")}</Text>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: spacing.lg },
  footerText: { color: colors.muted, fontSize: 12, fontFamily: font.regular },
});
