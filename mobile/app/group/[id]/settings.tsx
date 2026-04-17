import { useFocusEffect } from '@react-navigation/native';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  ActivityIndicator,
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
  'American',
  'Mexican',
  'Italian',
  'Chinese',
  'Japanese',
  'Thai',
  'Indian',
  'Mediterranean',
  'Seafood',
  'Barbecue',
];

const PRICE_LEVELS = [
  { level: 1, symbols: '$', annotation: '($1-$10)' },
  { level: 2, symbols: '$$', annotation: '($10-$20)' },
  { level: 3, symbols: '$$$', annotation: '($20-$30)' },
  { level: 4, symbols: '$$$$', annotation: '($30+)' },
];

export default function GroupSettingsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    groupMembersByGroupId,
    createGroup,
    getGroupSettings,
    saveGroupSettings,
    addMemberToGroup,
  } = useManeCourse();
  const normalizedId = Array.isArray(id) ? id[0] : id;
  const gid = normalizedId === 'new' ? 'new' : (normalizedId ?? '1');
  const [groupName, setGroupName] = useState(
    normalizedId === 'new' ? 'New group' : '',
  );
  const [addUser, setAddUser] = useState('');
  const [radius, setRadius] = useState(5);
  const [priceRange, setPriceRange] = useState(2);
  const [priceMin, setPriceMin] = useState(1);
  const [selectedCuisines, setSelectedCuisines] = useState<Set<string>>(
    () => new Set(CUISINES),
  );
  const [newMembers, setNewMembers] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(normalizedId !== 'new');
  const [trackWidth, setTrackWidth] = useState(1);
  const [youAreHost, setYouAreHost] = useState(normalizedId === 'new');

  const members = groupMembersByGroupId[gid] || MEMBER_USERNAMES.slice(0, 4);
  const priceMax = priceRange;
  const controlsDisabled = normalizedId !== 'new' && !youAreHost;

  useFocusEffect(
    useCallback(() => {
      if (!normalizedId || normalizedId === 'new') {
        setLoading(false);
        return;
      }
      let mounted = true;
      setLoading(true);
      getGroupSettings(normalizedId)
        .then((res) => {
          if (!mounted) return;
          setGroupName(res.group.name);
          setRadius(res.group.settings.radiusMiles);
          setPriceRange(res.group.settings.priceMax);
          setPriceMin(res.group.settings.priceMin);
          setSelectedCuisines(new Set(res.group.settings.cuisines.filter((c: string) => CUISINES.includes(c))));
          setYouAreHost(res.group.youAreHost ?? false);
        })
        .catch((err) => {
          Alert.alert('Failed to load settings', err instanceof Error ? err.message : 'Unknown error');
        })
        .finally(() => {
          if (mounted) setLoading(false);
        });
      return () => {
        mounted = false;
      };
    }, [getGroupSettings, normalizedId]),
  );

  const radiusPercent = useMemo(
    () => Math.max(0, Math.min(1, (radius - 1) / 19)),
    [radius],
  );

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
    setSaving(true);
    createGroup({
      name: groupName.trim(),
      members: newMembers,
    })
      .then(async (newGroup) => {
        await saveGroupSettings(newGroup.id, {
          name: groupName.trim(),
          radiusMiles: radius,
          priceMin,
          priceMax,
          cuisines: [...selectedCuisines],
        });
        router.replace(`/group/${newGroup.id}/swipe`);
      })
      .catch((err) => {
        Alert.alert('Failed to create group', err instanceof Error ? err.message : 'Unknown error');
      })
      .finally(() => setSaving(false));
  };

  const handleSaveExisting = async () => {
    if (!normalizedId || normalizedId === 'new') return;
    if (!youAreHost) {
      Alert.alert('View only', 'Only the group leader can save settings and start the swipe round.');
      return;
    }
    try {
      setSaving(true);
      await saveGroupSettings(normalizedId, {
        name: groupName.trim(),
        radiusMiles: radius,
        priceMin,
        priceMax,
        cuisines: [...selectedCuisines],
      });
      router.replace(`/group/${normalizedId}/swipe`);
    } catch (err) {
      Alert.alert('Failed to save settings', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.brown} />
          <Text style={styles.hintText}>Loading group settings...</Text>
        </View>
      </SafeAreaView>
    );
  }

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
        {normalizedId !== 'new' && !youAreHost && (
          <View style={[styles.lockBanner, { borderColor: '#90CAF9', backgroundColor: '#E3F2FD' }]}>
            <Text style={[styles.lockBannerText, { color: '#1565C0' }]}>
              View only. Only the group leader can edit settings, add or remove members, or start swiping.
            </Text>
          </View>
        )}
        <Image
          source={{
            uri: 'https://images.unsplash.com/photo-1593789196529-4a366615a65e?w=400',
          }}
          style={styles.avatar}
        />
        <Text style={styles.editPic}>Edit picture</Text>

        <Text style={styles.label}>Group Name</Text>
        <TextInput
          style={[styles.input, controlsDisabled && styles.inputDisabled]}
          value={groupName}
          onChangeText={setGroupName}
          editable={!controlsDisabled}
        />

        <Text style={styles.label}>Price Range</Text>
        <View style={styles.priceRow}>
          {PRICE_LEVELS.map(({ level, symbols, annotation }) => (
            <Pressable
              key={level}
              onPress={() => setPriceRange(level)}
              disabled={controlsDisabled}
              style={[
                styles.priceButton,
                priceRange === level && styles.priceButtonActive,
              ]}
            >
              <Text
                style={[
                  styles.priceButtonText,
                  priceRange === level && styles.priceButtonTextActive,
                ]}
              >
                {symbols}
              </Text>
              <Text
                style={[
                  styles.priceAnnotation,
                  priceRange === level && styles.priceAnnotationActive,
                ]}
              >
                {annotation}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Radius</Text>
        <View style={styles.radiusControls}>
          <Pressable
            style={styles.radiusButton}
            disabled={controlsDisabled}
            onPress={() => setRadius((r) => Math.max(1, r - 1))}
          >
            <Text style={styles.radiusButtonText}>-</Text>
          </Pressable>
          <Text style={styles.radiusValue}>{radius} mi</Text>
          <Pressable
            style={styles.radiusButton}
            disabled={controlsDisabled}
            onPress={() => setRadius((r) => Math.min(20, r + 1))}
          >
            <Text style={styles.radiusButtonText}>+</Text>
          </Pressable>
        </View>
        <View style={styles.sliderRow}>
          <Pressable
            style={[styles.track, { flex: 1 }]}
            disabled={controlsDisabled}
            onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width || 1)}
            onPressIn={(e) => {
              if (controlsDisabled) return;
              const x = e.nativeEvent.locationX;
              const pct = Math.max(0, Math.min(1, x / trackWidth));
              const nextRadius = 1 + pct * 19;
              setRadius(Math.round(nextRadius));
            }}
          >
            <View
              style={[styles.thumb, { left: `${radiusPercent * 100}%` }]}
            />
          </Pressable>
        </View>
        <Text style={styles.hintText}>{radius} miles</Text>

        <Text style={styles.label}>Cuisine Types</Text>
        <View style={styles.chips}>
          {CUISINES.map((c) => (
            <Pressable
              key={c}
              onPress={() => handleToggleCuisine(c)}
              disabled={controlsDisabled}
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
          Members are added by username only.
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
          style={[styles.input, styles.addMemberInput, controlsDisabled && styles.inputDisabled]}
          placeholder="Add member..."
          placeholderTextColor={colors.greyText}
          value={addUser}
          onChangeText={setAddUser}
          editable={!controlsDisabled}
          onSubmitEditing={() => {
            if (controlsDisabled) return;
            if (addUser.trim()) {
              if (normalizedId === 'new') {
                setNewMembers([...newMembers, addUser.trim()]);
                setAddUser('');
                return;
              }
              addMemberToGroup(gid, addUser.trim())
                .then(() => setAddUser(''))
                .catch((err) => {
                  Alert.alert('Could not add member', err instanceof Error ? err.message : 'Unknown error');
                });
            }
          }}
        />

        {normalizedId === 'new' ? (
          <Pressable style={styles.createButton} onPress={handleCreateGroup} disabled={saving}>
            <Text style={styles.createButtonText}>{saving ? 'Creating...' : 'Create Group'}</Text>
          </Pressable>
        ) : (
          <Pressable
            style={[styles.createButton, styles.createButtonExisting, controlsDisabled && styles.createButtonDisabled]}
            onPress={handleSaveExisting}
            disabled={saving || controlsDisabled}
          >
            <Text style={styles.createButtonText}>
              {saving ? 'Saving...' : youAreHost ? 'Save & Start Swiping' : 'Leader starts swiping'}
            </Text>
          </Pressable>
        )}
        {normalizedId !== 'new' && (
          <Pressable
            style={styles.joinSwipeBtn}
            onPress={() => router.push(`/group/${normalizedId}/swipe`)}
          >
            <Text style={styles.joinSwipeText}>Exit</Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  lockBanner: {
    backgroundColor: '#FFF3E0',
    borderRadius: radii.card,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: '#FFCC80',
  },
  lockBannerText: {
    color: '#E65100',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  inputDisabled: { opacity: 0.55 },
  createButtonDisabled: { opacity: 0.5 },
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
    backgroundColor: '#F0F0F0',
    borderWidth: 3,
    borderColor: colors.brown,
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
  addMemberInput: {
    marginTop: spacing.lg,
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
  priceAnnotation: {
    fontSize: 11,
    marginTop: 4,
    color: colors.greyText,
    fontWeight: '500',
  },
  priceAnnotationActive: {
    color: colors.cream,
  },
  sliderRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  radiusControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 6,
  },
  radiusButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.brown,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radiusButtonText: {
    color: colors.cream,
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 22,
  },
  radiusValue: {
    minWidth: 70,
    textAlign: 'center',
    fontWeight: '700',
    color: colors.brown,
  },
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
  sliderLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
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
  joinSwipeBtn: {
    marginTop: 2,
    paddingVertical: spacing.md,
    minHeight: 52,
    borderRadius: radii.card,
    alignItems: 'center',
    backgroundColor: colors.red,
  },
  joinSwipeText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 15,
  },
  createButton: {
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
    backgroundColor: colors.brown,
    paddingVertical: spacing.md,
    minHeight: 52,
    borderRadius: radii.card,
    alignItems: 'center',
  },
  createButtonExisting: {
    marginBottom: 2,
  },
  createButtonText: {
    color: colors.cream,
    fontWeight: '700',
    fontSize: 16,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
});
