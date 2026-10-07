import { Stack } from 'expo-router';

export default function WebAppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="app-lock" />
    </Stack>
  );
}
