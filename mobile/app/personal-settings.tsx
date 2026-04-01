import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useManeCourse } from '../context/ManeCourseContext';
import { colors, radii, spacing } from '../constants/theme';

export default function PersonalSettingsScreen() {
  const { currentUser, logout } = useManeCourse();
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState(currentUser?.fullName || '');
  const [username, setUsername] = useState(currentUser?.username || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [password, setPassword] = useState('********');

  useEffect(() => {
    setFullName(currentUser?.fullName || '');
    setUsername(currentUser?.username || '');
    setEmail(currentUser?.email || '');
  }, [currentUser]);

  const handleSave = () => {
    // Profile updates are not wired to backend yet.
    setIsEditing(false);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.bar}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.close}>×</Text>
        </Pressable>
        <Pressable hitSlop={12} onPress={() => setIsEditing(true)}>
          <Text style={styles.edit}>✎</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.avatar}>
          <Text style={styles.avatarIcon}>👤</Text>
        </View>
        <Field
          label="Full Name"
          value={fullName}
          onChangeText={setFullName}
          editable={isEditing}
        />
        <Field
          label="Username"
          value={username}
          onChangeText={setUsername}
          editable={isEditing}
        />
        <Field
          label="Email"
          value={email}
          onChangeText={setEmail}
          editable={isEditing}
        />
        <Field
          label="Password"
          value={password}
          onChangeText={setPassword}
          secure
          editable={isEditing}
        />
        {isEditing && (
          <Pressable style={styles.saveBtn} onPress={handleSave}>
            <Text style={styles.saveBtnText}>Save Changes</Text>
          </Pressable>
        )}
        <Pressable
          style={styles.logoutBtn}
          onPress={() => {
            logout();
            router.replace('/');
          }}
        >
          <Text style={styles.logoutBtnText}>Logout</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({
  label,
  value,
  onChangeText,
  editable,
  secure,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  editable: boolean;
  secure?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        style={[styles.input, !editable && styles.inputDisabled]}
        editable={editable}
        secureTextEntry={secure}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F0E8' },
  bar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  close: { fontSize: 32, color: colors.red, fontWeight: '300' },
  edit: { fontSize: 22 },
  scroll: {
    padding: spacing.lg,
    paddingTop: 8,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#555',
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  avatarIcon: { fontSize: 48, color: colors.white },
  field: { marginBottom: spacing.lg },
  label: { fontWeight: '700', marginBottom: 6, color: '#111' },
  input: {
    backgroundColor: colors.white,
    borderRadius: radii.card,
    padding: 14,
    fontSize: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  inputDisabled: {
    opacity: 0.7,
  },
  saveBtn: {
    backgroundColor: colors.brown,
    borderRadius: radii.pill,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  saveBtnText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  logoutBtn: {
    backgroundColor: colors.red,
    borderRadius: radii.pill,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  logoutBtnText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
});
