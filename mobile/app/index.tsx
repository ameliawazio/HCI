import { Image } from 'expo-image';
import { Redirect, router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import { PrimaryButton } from '../components/PrimaryButton';
import { colors, spacing } from '../constants/theme';

const IMAGES = [
  require('../assets/images/restaurantIcon.png'),
  require('../assets/images/gpsPointerIcon.png'),
];

let hasRedirectedToLanding = false;

export default function LandingScreen() {
  if (!hasRedirectedToLanding) {
    hasRedirectedToLanding = true;
    return <Redirect href="/landing" />;
  }

  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % IMAGES.length);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.blob} />
      <View style={styles.content}>
        <Image
          source={IMAGES[currentImageIndex]}
          style={styles.hero}
          contentFit="contain"
        />
        <View style={styles.dots}>
          {IMAGES.map((_, index) => (
            <View
              key={index}
              style={[styles.dot, index === currentImageIndex && styles.dotActive]}
            />
          ))}
        </View>
        <Text style={styles.title}>ManeCourse</Text>
        <Text style={styles.sub}>Skip the fight and get to the food!</Text>
        <View style={styles.buttons}>
          <PrimaryButton
            title="Login"
            variant="cream"
            onPress={() => router.push('/login')}
          />
          <PrimaryButton
            title="Sign Up"
            onPress={() => router.push('/signup')}
          />
        </View>
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
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    alignItems: 'center',
  },
  hero: {
    width: 220,
    height: 180,
    marginBottom: spacing.md,
  },
  dots: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: spacing.lg,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#CCC',
  },
  dotActive: {
    backgroundColor: colors.brown,
  },
  title: {
    fontSize: 45,
    fontWeight: '800',
    color: colors.brown,
    marginTop: 200,
    marginBottom: 15,
    fontFamily: 'ArialRoundedMTBold',
  },
  sub: {
    fontSize: 20,
    color: colors.brownDark,
    textAlign: 'center',
    marginBottom: spacing.xl,
    fontFamily: 'ArialRoundedMTBold',
  },
  buttons: {
    width: '100%',
    gap: spacing.md,
    marginTop: 'auto',
    marginBottom: spacing.xl,
  },
});
