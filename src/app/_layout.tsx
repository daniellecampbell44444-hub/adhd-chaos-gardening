import { Stack } from 'expo-router';
import { GardenProvider } from '../context/GardenContext';

export default function RootLayout() {
  return (
    <GardenProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
    </GardenProvider>
  );
}
