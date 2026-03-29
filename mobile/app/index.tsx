import { Image } from 'expo-image';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton } from '../components/PrimaryButton';
import { colors, spacing } from '../constants/theme';

export default function LandingScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.blob} />
      <View style={styles.content}>
        <Image
          source={{
            uri: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=400',
          }}
          style={styles.hero}
          contentFit="contain"
        />
        <View style={styles.dots}>
          <View style={[styles.dot, styles.dotActive]} />
          <View style={styles.dot} />
        </View>
        <Text style={styles.title}>Hay there!</Text>
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
    fontSize: 34,
    fontWeight: '800',
    color: colors.brown,
    marginBottom: 8,
    fontFamily: 'Georgia',
  },
  sub: {
    fontSize: 17,
    color: colors.brownDark,
    textAlign: 'center',
    marginBottom: spacing.xl,
    fontFamily: 'Georgia',
  },
  buttons: {
    width: '100%',
    gap: spacing.md,
    marginTop: 'auto',
    marginBottom: spacing.xl,
  },
});
