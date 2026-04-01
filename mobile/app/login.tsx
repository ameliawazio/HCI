import { router } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton } from '../components/PrimaryButton';
import { colors, radii } from '../constants/theme';
import { useManeCourse } from '../context/ManeCourseContext';

export default function LoginScreen() {
  const { login, loading } = useManeCourse();
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async () => {
    try {
      setError('');
      await login(user.trim(), pass);
      router.replace('/home');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    }
  };

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
          <Text style={styles.headerTitle}>Login</Text>
          <View style={{ width: 28 }} />
        </View>
        <View style={styles.stemRow}>
          <View style={styles.stem} />
          <View style={styles.leaf} />
        </View>
        <View style={styles.apple}>
          <Text style={styles.welcome}>Welcome Back!</Text>
          <Text style={styles.label}>Username</Text>
          <TextInput
            value={user}
            onChangeText={setUser}
            style={styles.input}
            placeholderTextColor="rgba(255,255,255,0.7)"
            placeholder="Enter username"
            autoCapitalize="none"
          />
          <Text style={styles.label}>Password</Text>
          <TextInput
            value={pass}
            onChangeText={setPass}
            style={styles.input}
            placeholderTextColor="rgba(255,255,255,0.7)"
            placeholder="Enter password"
            secureTextEntry
          />
          <PrimaryButton
            title="Login"
            onPress={handleLogin}
            style={styles.loginBtn}
          />
          {!!error && <Text style={styles.errorText}>{error}</Text>}
          {loading && <Text style={styles.loadingText}>Signing in...</Text>}
          <Text style={styles.forgot}>Forgot your password?</Text>
          <Pressable onPress={() => router.push('/login')}>
            <Text style={styles.link}>Click Here</Text>
          </Pressable>
        </View>
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
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  back: { fontSize: 32, color: colors.brown, fontWeight: '600' },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.brown,
    fontFamily: 'Georgia',
  },
  stemRow: { alignItems: 'center', marginTop: 8 },
  stem: {
    width: 8,
    height: 28,
    backgroundColor: colors.brown,
    borderRadius: 4,
    transform: [{ rotate: '12deg' }],
  },
  leaf: {
    position: 'absolute',
    top: 12,
    marginLeft: -40,
    width: 28,
    height: 18,
    backgroundColor: colors.greenLeaf,
    borderRadius: 10,
  },
  apple: {
    flex: 1,
    backgroundColor: colors.redApple,
    marginTop: 16,
    borderTopLeftRadius: radii.card * 2,
    borderTopRightRadius: radii.card * 2,
    padding: 24,
    paddingTop: 32,
  },
  welcome: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.brown,
    textAlign: 'center',
    marginBottom: 24,
    fontFamily: 'Georgia',
  },
  label: {
    color: colors.white,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1.5,
    borderColor: colors.white,
    borderRadius: 8,
    padding: 14,
    color: colors.white,
    marginBottom: 16,
  },
  loginBtn: { marginTop: 8, marginBottom: 24 },
  forgot: { color: colors.white, textAlign: 'center', fontSize: 13 },
  errorText: {
    color: '#FFE3E3',
    textAlign: 'center',
    fontWeight: '700',
    marginBottom: 8,
  },
  loadingText: { color: colors.white, textAlign: 'center', marginBottom: 8 },
  link: {
    color: colors.white,
    textAlign: 'center',
    fontWeight: '700',
    marginTop: 4,
    textDecorationLine: 'underline',
  },
});
