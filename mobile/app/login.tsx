import { useState } from "react";
import { Image, KeyboardAvoidingView, Platform, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../src/state/auth";
import { errorMessage } from "../src/lib/api";
import { Bounce, Button, Card, ErrorBox, Field, Hard, Screen } from "../src/components/ui";
import { colors, font, INK_BORDER, spacing } from "../src/lib/theme";

export default function Login() {
  const { signIn } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!email.trim() || !password) {
      setError("Isi email dan kata sandi dulu, ya.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await signIn(email, password);
      router.replace("/(tabs)");
    } catch (err) {
      setError(errorMessage(err, "Tidak bisa masuk. Periksa email dan kata sandi."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen padded={false} edges={["bottom"]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.hero}>
          <Hard r={34} bg={colors.white}>
            <View style={styles.logoBox}>
              <Image source={require("../assets/logo_mark.png")} style={styles.logo} resizeMode="contain" />
            </View>
          </Hard>
          <Text style={styles.brand}>SIMBA</Text>
          <Text style={styles.tagline}>Pantau tumbuh kembang si kecil dengan tenang</Text>
        </View>
        <View style={styles.body}>
          <Text style={styles.title}>Selamat datang kembali</Text>
          <Text style={styles.subtitle}>Masuk untuk melihat kabar si kecil hari ini.</Text>
          <ErrorBox message={error} />
          <Card>
            <Field label="Email" icon="mail-outline" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" placeholder="nama@email.com" />
            <Field label="Kata sandi" icon="lock-closed-outline" value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" placeholder="••••••••" onSubmitEditing={submit} returnKeyType="go" />
          </Card>
          <Button title="Masuk" onPress={submit} loading={busy} />
          <Bounce onPress={() => router.push("/register")} style={styles.footer} haptic={false}>
            <Text style={styles.footerText}>
              Belum punya akun? <Text style={styles.footerLink}>Daftar di sini</Text>
            </Text>
          </Bounce>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: "center", backgroundColor: colors.yellow, paddingTop: 76, paddingBottom: 40, paddingHorizontal: spacing.xl, borderBottomWidth: INK_BORDER, borderColor: colors.ink, gap: 6 },
  logoBox: { width: 108, height: 108, alignItems: "center", justifyContent: "center" },
  logo: { width: 92, height: 92 },
  brand: { color: colors.ink, fontSize: 40, fontFamily: font.display, letterSpacing: 1, marginTop: spacing.sm },
  tagline: { color: colors.headerSub, fontSize: 15, fontFamily: font.bold, textAlign: "center" },
  body: { padding: spacing.xl, paddingBottom: spacing.xxl },
  title: { fontSize: 26, fontFamily: font.display, color: colors.ink },
  subtitle: { fontSize: 15, fontFamily: font.regular, color: colors.muted, marginTop: 4, marginBottom: spacing.lg },
  footer: { alignItems: "center", marginTop: spacing.lg },
  footerText: { color: colors.muted, fontSize: 15, fontFamily: font.bold },
  footerLink: { color: colors.coral, fontFamily: font.extra },
});
