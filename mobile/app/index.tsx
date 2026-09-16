import { Redirect } from "expo-router";
import { Image, StyleSheet, View } from "react-native";
import { useAuth } from "../src/state/auth";
import { colors } from "../src/lib/theme";

export default function Index() {
  const { ready, isAuthenticated } = useAuth();
  if (!ready) {
    return (
      <View style={styles.splash}>
        <Image source={require("../assets/logo_mark.png")} style={styles.logo} resizeMode="contain" />
      </View>
    );
  }
  return <Redirect href={isAuthenticated ? "/(tabs)" : "/login"} />;
}

const styles = StyleSheet.create({
  splash: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.orange },
  logo: { width: 140, height: 140 },
});
