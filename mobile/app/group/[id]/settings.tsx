import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useEffect, useMemo, useState } from 'react';
import {
  PanResponder,
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
  'Asian',
  'Italian',
  'Latin',
  'Mediterranean',
  'European',
  'Mexican',
  'Indian',
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
  const existingGroup = groups.find((g) => g.id === gid);
  const [groupName, setGroupName] = useState(
    existingGroup?.name ?? (normalizedId === 'new' ? 'New group' : 'The Roku Remotes'),
  );
  const [addUser, setAddUser] = useState('');
  const [radius, setRadius] = useState(existingGroup?.radius ?? 2);
  const [priceRange, setPriceRange] = useState(existingGroup?.priceRange ?? 4);
  const [selectedCuisines, setSelectedCuisines] = useState<Set<string>>(
    new Set(existingGroup?.cuisines ?? CUISINES),
  );
  const [newMembers, setNewMembers] = useState<string[]>([]);

  // Slider
  const trackWidthRef = useRef(0);
  const radiusAtGestureStart = useRef(radius);
  const sliderPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        if (trackWidthRef.current === 0) return;
        // Snap thumb to the tap position immediately
        const x = Math.max(0, Math.min(trackWidthRef.current, e.nativeEvent.locationX));
        const newVal = Math.round((x / trackWidthRef.current) * 20) / 10;
        radiusAtGestureStart.current = newVal;
        setRadius(newVal);
      },
      onPanResponderMove: (_e, gestureState) => {
        if (trackWidthRef.current === 0) return;
        // Use dx (delta from gesture start) so dragging is smooth regardless of which
        // view the finger is over
        const delta = (gestureState.dx / trackWidthRef.current) * 2;
        const newVal = Math.round(
          Math.max(0, Math.min(2, radiusAtGestureStart.current + delta)) * 10,
        ) / 10;
        setRadius(newVal);
      },
    }),
  ).current;

  const members =
    groupMembersByGroupId[gid] ||
    MEMBER_USERNAMES.slice(0, 4);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(normalizedId !== 'new');
  const [trackWidth, setTrackWidth] = useState(1);

  const members = groupMembersByGroupId[gid] || MEMBER_USERNAMES.slice(0, 4);
  const priceMax = priceRange;

  useEffect(() => {
    if (!normalizedId || normalizedId === 'new') return;
    let mounted = true;
    setLoading(true);
    getGroupSettings(normalizedId)
      .then((res) => {
        if (!mounted) return;
        setGroupName(res.group.name);
        setRadius(res.group.settings.radiusMiles);
        setPriceRange(res.group.settings.priceMax);
        setPriceMin(res.group.settings.priceMin);
        setSelectedCuisines(new Set(res.group.settings.cuisines));
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
  }, [getGroupSettings, normalizedId]);

  const radiusPercent = useMemo(
    () => Math.max(0, Math.min(1, (radius - 1) / 19)),
    [radius],
  );

  const handleSaveSettings = () => {
    updateGroupSettings?.(gid, {
      priceRange,
      radius,
      cuisines: Array.from(selectedCuisines),
    });
    router.back();
  };

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
        <View style={styles.radiusControls}>
          <Pressable
            style={styles.radiusButton}
            onPress={() => setRadius((r) => Math.max(1, r - 1))}
          >
            <Text style={styles.radiusButtonText}>-</Text>
          </Pressable>
          <Text style={styles.radiusValue}>{radius} mi</Text>
          <Pressable
            style={styles.radiusButton}
            onPress={() => setRadius((r) => Math.min(20, r + 1))}
          >
            <Text style={styles.radiusButtonText}>+</Text>
          </Pressable>
        </View>
        <View style={styles.sliderRow}>
          <Pressable
            style={[styles.track, { flex: 1 }]}
            onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width || 1)}
            onPressIn={(e) => {
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
          <View
            style={[styles.track, { flex: 1 }]}
            onLayout={(e) => { trackWidthRef.current = e.nativeEvent.layout.width; }}
            {...sliderPanResponder.panHandlers}
          >
            <View style={[styles.thumb, { left: `${(radius / 2) * 100}%` as any }]} />
          </View>
        </View>
        <View style={styles.sliderLabels}>
          <Text style={styles.hintText}>0 mi</Text>
          <Text style={styles.hintText}>2 mi</Text>
        </View>

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

        {normalizedId === 'new' && (
          <Pressable style={styles.createButton} onPress={handleCreateGroup} disabled={saving}>
            <Text style={styles.createButtonText}>{saving ? 'Creating...' : 'Create Group'}</Text>
          </Pressable>
        )}
        {normalizedId !== 'new' && (
          <Pressable style={styles.createButton} onPress={handleSaveExisting} disabled={saving}>
            <Text style={styles.createButtonText}>{saving ? 'Saving...' : 'Save & Start Swiping'}</Text>
          </Pressable>
        ) : (
          <Pressable style={styles.createButton} onPress={handleSaveSettings}>
            <Text style={styles.createButtonText}>Save Settings</Text>
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
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
});
