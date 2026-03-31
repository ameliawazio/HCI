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
      <View style={styles.blobContainer}>
        <View style={styles.blob} />
        <View style={styles.blobSecondary} />
      </View>
      <View style={styles.content}>
        <View style={styles.heroContainer}>
          <Image
            source={IMAGES[currentImageIndex]}
            style={styles.hero}
            contentFit="contain"
          />
        </View>
        <View style={styles.dots}>
          {IMAGES.map((_, index) => (
            <View
              key={index}
              style={[styles.dot, index === currentImageIndex && styles.dotActive]}
            />
          ))}
        </View>
        <View style={styles.titleSection}>
          <Text style={styles.title}>ManeCourse</Text>
          <Text style={styles.sub}>Skip the fight and get to the food!</Text>
        </View>
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
  blobContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  blob: {
    width: 300,
    height: 300,
    backgroundColor: colors.brown,
    opacity: 0.15,
    borderRadius: 160,
    position: 'absolute',
    top: 50,
    left: '50%',
    marginLeft: -150,
  },
  blobSecondary: {
    width: 150,
    height: 150,
    backgroundColor: colors.creamAlt,
    opacity: 0.6,
    borderRadius: 75,
    position: 'absolute',
    bottom: 20,
    left: -40,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 1,
  },
  heroContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.lg,
  },
  hero: {
    width: 240,
    height: 200,
    marginBottom: spacing.md,
  },
  dots: {
    flexDirection: 'row',
    gap: 10,
    marginVertical: spacing.lg,
    justifyContent: 'center',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(75, 54, 33, 0.2)',
    transition: 'all 0.3s ease',
  },
  dotActive: {
    backgroundColor: colors.brown,
    width: 28,
    borderRadius: 5,
  },
  titleSection: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 48,
    fontWeight: '900',
    color: colors.brown,
    marginBottom: spacing.md,
    fontFamily: 'ArialRoundedMTBold',
    letterSpacing: 0.5,
  },
  sub: {
    fontSize: 18,
    color: colors.brown,
    textAlign: 'center',
    fontFamily: 'ArialRoundedMTBold',
    lineHeight: 26,
    paddingHorizontal: spacing.md,
  },
  buttons: {
    width: '100%',
    gap: spacing.md,
    paddingHorizontal: spacing.sm,
  },
});
