import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack screenOptions={{ 
      headerShown: false,
      animation: 'fade',
      animationDuration: 600,
    }}>
      <Stack.Screen name="gradient-splash" />
      <Stack.Screen name="login" />
    </Stack>
  );
}