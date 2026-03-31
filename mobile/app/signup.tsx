import { router } from 'expo-router';
import { useState } from 'react';
import {
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

export default function SignUpScreen() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <View style={styles.top}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Text style={styles.back}>‹</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Create Account</Text>
          <View style={{ width: 28 }} />
        </View>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={styles.hero}>
            <Text style={styles.heroEyebrow}>ManeCourse</Text>
            <Text style={styles.heroTitle}>Join The Stable</Text>
            <Text style={styles.heroSub}>
              Set up your profile and start matching your group with great food.
            </Text>
          </View>

          <View style={styles.formCard}>
            <View style={styles.formFields}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                value={fullName}
                onChangeText={setFullName}
                style={styles.input}
                placeholder="Enter your full name"
                placeholderTextColor={colors.greyText}
                autoCapitalize="words"
              />

              <Text style={styles.label}>Email</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                style={styles.input}
                placeholder="Enter your email"
                placeholderTextColor={colors.greyText}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Text style={styles.label}>Username</Text>
              <TextInput
                value={user}
                onChangeText={setUser}
                style={styles.input}
                placeholder="Choose a username"
                placeholderTextColor={colors.greyText}
                autoCapitalize="none"
              />

              <Text style={styles.label}>Password</Text>
              <TextInput
                value={pass}
                onChangeText={setPass}
                style={styles.input}
                placeholder="Create a password"
                placeholderTextColor={colors.greyText}
                secureTextEntry
              />
            </View>

            <View style={styles.formBottom}>
              <PrimaryButton
                title="Create Account"
                onPress={() => router.replace('/home')}
                style={styles.btn}
              />

              <Text style={styles.footer}>
                Already have an account?{' '}
                <Text
                  style={styles.footerBold}
                  onPress={() => router.replace('/login')}
                >
                  Login
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
  safe: { flex: 1, backgroundColor: colors.cream },
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
    paddingHorizontal: spacing.lg,
    paddingBottom: 0,
    gap: spacing.md,
  },
  hero: {
    backgroundColor: colors.brownDark,
    borderRadius: radii.card,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.sm,
  },
  heroEyebrow: {
    color: colors.creamAlt,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  heroTitle: {
    color: colors.white,
    fontSize: 28,
    fontWeight: '800',
    fontFamily: 'Georgia',
    marginBottom: 6,
  },
  heroSub: {
    color: colors.creamAlt,
    fontSize: 14,
    lineHeight: 20,
  },
  formCard: {
    flex: 1,
    backgroundColor: colors.tanBlob,
    borderRadius: radii.card,
    padding: spacing.lg,
    paddingBottom: spacing.md,
    borderWidth: 1,
    borderColor: '#E7CCAC',
    marginBottom: spacing.sm,
    justifyContent: 'flex-start',
  },
  formFields: {
    gap: 2,
  },
  formBottom: {
    flex: 1,
    justifyContent: 'center',
    paddingTop: spacing.sm,
  },
  label: {
    color: colors.brownDark,
    fontWeight: '700',
    marginBottom: 6,
    marginTop: 6,
  },
  input: {
    backgroundColor: colors.white,
    borderRadius: 10,
    padding: 14,
    color: colors.brownDark,
    borderWidth: 1,
    borderColor: '#E7DED1',
  },
  btn: {
    marginTop: 0,
    marginBottom: 6,
    backgroundColor: colors.brownDark,
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
    color: colors.brown,
  },
});
