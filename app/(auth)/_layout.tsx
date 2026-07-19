import { Redirect, Stack } from "expo-router";
import { useAuth } from "@/context/AuthContext";

export default function AuthLayout() {
  const { user, loading } = useAuth();
  if (!loading && user) return <Redirect href="/novels" />;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="signup" />
      <Stack.Screen name="forgot" />
    </Stack>
  );
}
