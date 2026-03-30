import { Image } from 'expo-image';
import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '../constants/theme';

export default function LandingSplashScreen() {
  const [shouldRedirect, setShouldRedirect] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShouldRedirect(true);
    }, 800);

    return () => clearTimeout(timer);
  }, []);

  if (shouldRedirect) {
    return <Redirect href="/" />;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.blob} />
      <View style={styles.content}>
        <Image
          source={require('../assets/images/Logo.png')}
          style={styles.logo}
          contentFit="contain"
        />
        <Text style={styles.title}>ManeCourse</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  blob: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.tanBlob,
    opacity: 0.85,
    transform: [{ scale: 1.4 }, { translateY: 80 }],
    borderRadius: 200,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  logo: {
    width: 180,
    height: 180,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 42,
    fontWeight: '800',
    color: colors.brown,
    fontFamily: 'Georgia',
  },
});