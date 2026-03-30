import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ManeCourseProvider } from '../context/ManeCourseContext';

export const unstable_settings = {
  initialRouteName: 'landing',
};

export default function RootLayout() {
  return (
    <ManeCourseProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />
    </ManeCourseProvider>
  );
}
