import { Redirect, Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../src/state/auth";
import { useChildren } from "../../src/state/child";
import { Loading } from "../../src/components/ui";
import { colors } from "../../src/lib/theme";

export default function TabsLayout() {
  const { ready, isAuthenticated } = useAuth();
  const { loading, children } = useChildren();

  if (!ready) return null;
  if (!isAuthenticated) return <Redirect href="/login" />;
  if (loading) return <Loading label="Loading your family…" />;
  if (children.length === 0) return <Redirect href="/add-child?first=1" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: "700" },
        tabBarStyle: { borderTopColor: colors.border, backgroundColor: colors.white, height: 64, paddingTop: 6, paddingBottom: 8 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} /> }} />
      <Tabs.Screen name="growth" options={{ title: "Growth", tabBarIcon: ({ color, size }) => <Ionicons name="trending-up" size={size} color={color} /> }} />
      <Tabs.Screen name="nutrition" options={{ title: "Nutrition", tabBarIcon: ({ color, size }) => <Ionicons name="restaurant" size={size} color={color} /> }} />
      <Tabs.Screen name="development" options={{ title: "Growth+", tabBarIcon: ({ color, size }) => <Ionicons name="sparkles" size={size} color={color} /> }} />
      <Tabs.Screen name="more" options={{ title: "More", tabBarIcon: ({ color, size }) => <Ionicons name="grid" size={size} color={color} /> }} />
    </Tabs>
  );
}
