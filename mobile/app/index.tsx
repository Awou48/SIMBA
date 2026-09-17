import { Redirect } from "expo-router";
import { Image, StyleSheet, View } from "react-native";
import { useAuth } from "../src/state/auth";
import { colors } from "../src/lib/theme";

export default function Index() {
  const { ready, isAuthenticated } = useAuth();
  if (!ready) {
    return (
      <View style={styles.splash}>
        <View style={styles.logoBox}>
          <Image source={require("../assets/logo_mark.png")} style={styles.logo} resizeMode="contain" />
        </View>
      </View>
    );
  }
  return <Redirect href={isAuthenticated ? "/(tabs)" : "/login"} />;
}

const styles = StyleSheet.create({
  splash: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.yellow },
  logoBox: { width: 150, height: 150, borderRadius: 44, backgroundColor: colors.white, borderWidth: 2, borderColor: colors.ink, alignItems: "center", justifyContent: "center" },
  logo: { width: 124, height: 124 },
});
