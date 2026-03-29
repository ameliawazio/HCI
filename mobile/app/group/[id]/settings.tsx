import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useManeCourse, MEMBER_USERNAMES } from '../../../context/ManeCourseContext';
import { colors, radii, spacing } from '../../../constants/theme';

const CUISINES = [
  'Asian',
  'Mediterranean',
  'Latin American',
  'American',
  'European',
];

export default function GroupSettingsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { addMemberToGroup, groupMembersByGroupId } = useManeCourse();
  const gid = id === 'new' ? 'new' : (id ?? '1');
  const [groupName, setGroupName] = useState(
    id === 'new' ? 'New group' : 'The Roku Remotes',
  );
  const [addUser, setAddUser] = useState('');
  const [radius, setRadius] = useState(0.3);

  const members =
    groupMembersByGroupId[gid] ||
    MEMBER_USERNAMES.slice(0, 4);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.bar}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.close}>×</Text>
        </Pressable>
        <Pressable>
          <Text style={styles.edit}>✎</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Image
          source={{
            uri: 'https://images.unsplash.com/photo-1593789196529-4a366615a65e?w=400',
          }}
          style={styles.avatar}
        />
        <Text style={styles.editPic}>Edit picture</Text>

        <Text style={styles.label}>Group Name</Text>
        <TextInput
          style={styles.input}
          value={groupName}
          onChangeText={setGroupName}
        />

        <Text style={styles.label}>Price Range</Text>
        <Text style={styles.dollars}>$ $ $</Text>

        <Text style={styles.label}>Radius</Text>
        <View style={styles.sliderRow}>
          <View style={[styles.track, { flex: 1 }]}>
            <View
              style={[styles.thumb, { left: `${radius * 100}%` }]}
            />
          </View>
        </View>
        <Pressable
          onPress={() => setRadius((r) => (r > 0.1 ? r - 0.1 : r))}
          style={styles.sliderHint}
        >
          <Text style={styles.hintText}>Tap track to adjust (demo)</Text>
        </Pressable>

        <Text style={styles.label}>Cuisine Types</Text>
        <View style={styles.chips}>
          {CUISINES.map((c) => (
            <View key={c} style={styles.chip}>
              <Text>
                {c} <Text style={styles.plus}>+</Text>
              </Text>
            </View>
          ))}
        </View>

        <Text style={styles.label}>Group Members</Text>
        <Text style={styles.hint}>
          Members are added by username only (no open join).
        </Text>
        <View style={styles.chips}>
          {members.map((m) => (
            <View key={m} style={styles.chip}>
              <Text>
                {m} <Text style={styles.minus}>−</Text>
              </Text>
            </View>
          ))}
        </View>
        <TextInput
          style={styles.input}
          placeholder="Add member..."
          placeholderTextColor={colors.greyText}
          value={addUser}
          onChangeText={setAddUser}
          onSubmitEditing={() => {
            if (addUser.trim()) {
              addMemberToGroup(gid, addUser.trim());
              setAddUser('');
            }
          }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  bar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
  },
  close: { fontSize: 28, color: colors.red },
  edit: { fontSize: 20 },
  scroll: { padding: spacing.lg },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignSelf: 'center',
  },
  editPic: {
    textAlign: 'center',
    textDecorationLine: 'underline',
    marginBottom: spacing.lg,
    color: '#333',
  },
  label: { fontWeight: '700', marginTop: spacing.md, marginBottom: 6 },
  input: {
    backgroundColor: '#FAFAFA',
    borderRadius: radii.card,
    padding: 12,
    borderWidth: 1,
    borderColor: '#EEE',
  },
  dollars: { fontSize: 28, fontWeight: '800', letterSpacing: 4 },
  sliderRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  track: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    position: 'relative',
  },
  thumb: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#999',
    marginTop: -7,
    marginLeft: -11,
  },
  sliderHint: { marginTop: 8 },
  hintText: { color: colors.greyText, fontSize: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    backgroundColor: colors.greyChip,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.chip,
  },
  plus: { fontWeight: '800' },
  minus: { fontWeight: '800', color: '#C00' },
  hint: { fontSize: 12, color: colors.greyText, marginBottom: 8 },
});
