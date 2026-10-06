import { Redirect, Tabs } from "expo-router";
import { Platform, View } from "react-native";
import { useAuth } from "../../src/state/auth";
import { useChildren } from "../../src/state/child";
import { Icon, Loading } from "../../src/components/ui";
import { colors, font, INK_BORDER } from "../../src/lib/theme";

const TAB_ICON: Record<string, string> = { index: "home", growth: "resize", nutrition: "restaurant", development: "extension-puzzle", more: "grid" };

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  return (
    <View style={{ width: 46, height: 32, borderRadius: 16, backgroundColor: focused ? colors.yellow : "transparent", borderWidth: INK_BORDER, borderColor: focused ? colors.ink : "transparent", alignItems: "center", justifyContent: "center" }}>
      <Icon name={focused ? TAB_ICON[name] : `${TAB_ICON[name]}-outline`} size={22} color={focused ? colors.ink : colors.muted} />
    </View>
  );
}

export default function TabsLayout() {
  const { ready, isAuthenticated } = useAuth();
  const { loading, children } = useChildren();

  if (!ready) return null;
  if (!isAuthenticated) return <Redirect href="/login" />;
  if (loading) return <Loading label="Menyiapkan…" />;
  if (children.length === 0) return <Redirect href="/add-child?first=1" />;

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontSize: 12, fontFamily: font.extra, marginTop: 2 },
        tabBarStyle: {
          borderTopWidth: INK_BORDER,
          borderTopColor: colors.ink,
          backgroundColor: colors.white,
          height: Platform.OS === "ios" ? 92 : 74,
          paddingTop: 8,
          paddingBottom: Platform.OS === "ios" ? 26 : 10,
          elevation: 0,
        },
        tabBarIcon: ({ focused }) => <TabIcon name={route.name} focused={focused} />,
      })}
    >
      <Tabs.Screen name="index" options={{ title: "Beranda" }} />
      <Tabs.Screen name="growth" options={{ title: "Tumbuh" }} />
      <Tabs.Screen name="nutrition" options={{ title: "Makan" }} />
      <Tabs.Screen name="development" options={{ title: "Kembang" }} />
      <Tabs.Screen name="more" options={{ title: "Lainnya" }} />
    </Tabs>
  );
}
