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
  const { groupMembersByGroupId, createGroup } = useManeCourse();
  const normalizedId = Array.isArray(id) ? id[0] : id;
  const gid = normalizedId === 'new' ? 'new' : (normalizedId ?? '1');
  const [groupName, setGroupName] = useState(
    normalizedId === 'new' ? 'New group' : 'The Roku Remotes',
  );
  const [addUser, setAddUser] = useState('');
  const [radius, setRadius] = useState(0.3);
  const [priceRange, setPriceRange] = useState(2);
  const [selectedCuisines, setSelectedCuisines] = useState<Set<string>>(
    new Set(),
  );
  const [newMembers, setNewMembers] = useState<string[]>([]);

  const members =
    groupMembersByGroupId[gid] ||
    MEMBER_USERNAMES.slice(0, 4);

  const handleToggleCuisine = (cuisine: string) => {
    setSelectedCuisines((prev) => {
      const updated = new Set(prev);
      if (updated.has(cuisine)) {
        updated.delete(cuisine);
      } else {
        updated.add(cuisine);
      }
      return updated;
    });
  };

  const handleCreateGroup = () => {
    if (!groupName.trim()) {
      alert('Please enter a group name');
      return;
    }
    const allMembers = [...members, ...newMembers];
    const newGroup = createGroup({
      name: groupName,
      members: allMembers,
    });
    router.replace(`/group/${newGroup.id}/swipe`);
  };

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
        <View style={styles.priceRow}>
          {[1, 2, 3, 4].map((level) => (
            <Pressable
              key={level}
              onPress={() => setPriceRange(level)}
              style={[
                styles.priceButton,
                priceRange >= level && styles.priceButtonActive,
              ]}
            >
              <Text
                style={[
                  styles.priceButtonText,
                  priceRange >= level && styles.priceButtonTextActive,
                ]}
              >
                $
              </Text>
            </Pressable>
          ))}
        </View>

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
            <Pressable
              key={c}
              onPress={() => handleToggleCuisine(c)}
              style={[
                styles.chip,
                selectedCuisines.has(c) && styles.chipActive,
              ]}
            >
              <Text style={selectedCuisines.has(c) ? styles.chipTextActive : {}}>
                {c}
              </Text>
            </Pressable>
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
          {newMembers.map((m) => (
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
              setNewMembers([...newMembers, addUser.trim()]);
              setAddUser('');
            }
          }}
        />

        {normalizedId === 'new' && (
          <Pressable style={styles.createButton} onPress={handleCreateGroup}>
            <Text style={styles.createButtonText}>Create Group</Text>
          </Pressable>
        )}
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
  priceRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  priceButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: radii.chip,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  priceButtonActive: {
    backgroundColor: colors.brown,
    borderColor: colors.brown,
  },
  priceButtonText: { fontSize: 16, fontWeight: '600', color: '#666' },
  priceButtonTextActive: { color: colors.cream },
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
  chipActive: {
    backgroundColor: colors.brown,
  },
  chipTextActive: { color: '#FFF', fontWeight: '600' },
  plus: { fontWeight: '800' },
  minus: { fontWeight: '800', color: '#C00' },
  hint: { fontSize: 12, color: colors.greyText, marginBottom: 8 },
  createButton: {
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
    backgroundColor: colors.brown,
    paddingVertical: spacing.md,
    borderRadius: radii.card,
    alignItems: 'center',
  },
  createButtonText: {
    color: colors.cream,
    fontWeight: '700',
    fontSize: 16,
  },
});
