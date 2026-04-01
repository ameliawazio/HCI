import { router } from 'expo-router';
import { useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton } from '../components/PrimaryButton';
import { colors, radii, spacing } from '../constants/theme';
import { useManeCourse } from '../context/ManeCourseContext';
import { isSampleAccount } from '../lib/sampleUsers';

export default function LoginScreen() {
  const { login, loading } = useManeCourse();
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [error, setError] = useState('');

  async function handleLogin() {
    const username = user.trim().toLowerCase();
    setError('');
    if (!isSampleAccount(username, pass)) {
      setError('Use a sample username (gator1–gator5) and password.');
      return;
    }
    try {
      await login(username, pass);
      router.replace('/home');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.bgOrbTop} pointerEvents="none" />
      <View style={styles.bgOrbBottom} pointerEvents="none" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <View style={styles.top}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Text style={styles.back}>‹</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Login</Text>
          <View style={{ width: 28 }} />
        </View>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={styles.brandWrap}>
            <View style={styles.heroCard}>
              <View style={styles.heroHead}>
                <Text style={styles.heroEyebrow}>Welcome back</Text>
                <Image
                  source={require('../assets/images/Logo.png')}
                  style={styles.heroLogo}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.appTitle}>ManeCourse</Text>
              <Text style={styles.appSub}>
                <Text style={styles.appSubRed}>Saddle up</Text> to pick the
                perfect spot for any plan.
              </Text>
            </View>
          </View>

          <View style={styles.spacer} />

          <View style={styles.formCard}>
            <View style={styles.formFields}>
              <Text style={styles.label}>Username</Text>
              <TextInput
                value={user}
                onChangeText={setUser}
                style={styles.input}
                placeholder="Enter username"
                placeholderTextColor={colors.greyText}
                autoCapitalize="none"
              />

              <Text style={styles.label}>Password</Text>
              <TextInput
                value={pass}
                onChangeText={setPass}
                style={styles.input}
                placeholder="Enter password"
                placeholderTextColor={colors.greyText}
                secureTextEntry
              />
            </View>

            <View style={styles.formBottom}>
              <PrimaryButton
                title="Login"
                onPress={() => void handleLogin()}
                style={styles.btn}
              />

              {!!error && <Text style={styles.error}>{error}</Text>}
              {loading && <Text style={styles.loadingText}>Signing in…</Text>}

              <Text style={styles.forgot}>Forgot password?</Text>

              <Text style={styles.footer}>
                Don't have an account?{' '}
                <Text
                  style={styles.footerBold}
                  onPress={() => router.replace('/signup')}
                >
                  Sign Up
                </Text>
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.cream,
    position: 'relative',
    overflow: 'hidden',
  },
  bgOrbTop: {
    position: 'absolute',
    top: -70,
    right: -40,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#F3DFCC',
  },
  bgOrbBottom: {
    position: 'absolute',
    bottom: -110,
    left: -60,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: '#F7EDE3',
  },
  flex: { flex: 1 },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  back: { fontSize: 32, color: colors.brown, fontWeight: '600' },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.brown,
    fontFamily: 'Georgia',
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    paddingTop: spacing.sm,
  },
  brandWrap: {
    paddingTop: spacing.md,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  heroCard: {
    backgroundColor: '#FFF7ED',
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: '#E8D7C5',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    shadowColor: '#2B1A0F',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  heroHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  heroEyebrow: {
    color: '#B71C1C',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  heroLogo: {
    width: 32,
    height: 32,
  },
  appTitle: {
    color: colors.brownDark,
    fontSize: 44,
    fontWeight: '800',
    fontFamily: 'Georgia',
    lineHeight: 48,
  },
  appSub: {
    color: colors.brown,
    fontSize: 16,
    lineHeight: 23,
    marginTop: 8,
  },
  appSubRed: {
    color: '#B71C1C',
    fontWeight: '700',
  },
  spacer: {
    flex: 1,
    minHeight: spacing.md,
  },
  formCard: {
    alignSelf: 'stretch',
    backgroundColor: colors.white,
    borderRadius: radii.card,
    padding: spacing.lg,
    minHeight: 340,
    borderWidth: 1,
    borderColor: '#E7DED1',
    marginBottom: spacing.sm,
    shadowColor: '#2B1A0F',
    shadowOpacity: 0.1,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 7 },
    elevation: 2,
  },
  formFields: {
    gap: 1,
  },
  formBottom: {
    paddingTop: spacing.sm,
  },
  label: {
    color: colors.brownDark,
    fontWeight: '700',
    marginBottom: 6,
    marginTop: 4,
  },
  input: {
    backgroundColor: '#FFF9F0',
    borderRadius: 10,
    padding: 14,
    color: colors.brownDark,
    borderWidth: 1,
    borderColor: '#E4D5C1',
    marginBottom: 8,
  },
  btn: {
    marginTop: 0,
    marginBottom: 8,
    backgroundColor: colors.brownDark,
    borderWidth: 1,
    borderColor: '#5E4332',
  },
  error: {
    color: '#7A1313',
    textAlign: 'center',
    fontWeight: '700',
    marginBottom: 8,
  },
  loadingText: {
    color: colors.brownDark,
    textAlign: 'center',
    marginBottom: 8,
  },
  forgot: {
    color: '#B71C1C',
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '600',
    textDecorationLine: 'underline',
    marginBottom: 10,
  },
  footer: {
    color: colors.brownDark,
    textAlign: 'center',
    fontSize: 13,
    marginTop: 0,
  },
  footerBold: {
    fontWeight: '800',
    textDecorationLine: 'underline',
    color: '#B71C1C',
  },
});
