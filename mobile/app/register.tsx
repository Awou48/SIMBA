import { useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../src/state/auth";
import { errorMessage } from "../src/lib/api";
import { Button, Card, ErrorBox, Field, Screen, YellowBar } from "../src/components/ui";
import { colors, font, spacing } from "../src/lib/theme";

export default function Register() {
  const { register } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError("Alamat email belum benar.");
    if (password.length < 6) return setError("Kata sandi minimal 6 huruf atau angka.");
    if (password !== confirm) return setError("Kata sandi yang diulang belum sama.");
    setBusy(true);
    setError("");
    try {
      await register(email, password);
      router.replace("/add-child?first=1");
    } catch (err) {
      setError(errorMessage(err, "Akun belum bisa dibuat. Coba lagi."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen padded={false} edges={["top", "bottom"]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <YellowBar title="Buat akun" subtitle="Satu akun bisa untuk semua anak Anda" onBack={() => router.back()} />
        <View style={styles.body}>
          <ErrorBox message={error} />
          <Card>
            <Field label="Email" icon="mail-outline" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="nama@email.com" />
            <Field label="Kata sandi" icon="lock-closed-outline" value={password} onChangeText={setPassword} secureTextEntry placeholder="Minimal 6 huruf atau angka" />
            <Field label="Ulangi kata sandi" icon="repeat-outline" value={confirm} onChangeText={setConfirm} secureTextEntry placeholder="Ketik sekali lagi" onSubmitEditing={submit} returnKeyType="go" />
          </Card>
          <Button title="Buat akun" icon="checkmark" onPress={submit} loading={busy} />
          <Text style={styles.terms}>Data anak hanya bisa dilihat oleh Anda. Petugas kesehatan hanya melihat angka per wilayah tanpa nama.</Text>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { padding: spacing.lg, paddingTop: spacing.lg },
  terms: { fontSize: 13, fontFamily: font.regular, color: colors.muted, textAlign: "center", marginTop: spacing.lg, lineHeight: 19 },
});
