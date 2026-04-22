import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useManeCourse } from '../context/ManeCourseContext';
import { colors, radii, spacing } from '../constants/theme';

export default function HomeScreen() {
  const { authHydrated, token, groups, deleteGroup, refreshGroups } = useManeCourse();
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!authHydrated) return;
      if (!token) {
        router.replace('/login');
        return;
      }
      refreshGroups().catch(() => null);
    }, [authHydrated, refreshGroups, token]),
  );

  const onRefresh = useCallback(() => {
    if (!token) return;
    setRefreshing(true);
    refreshGroups()
      .catch(() => null)
      .finally(() => setRefreshing(false));
  }, [refreshGroups, token]);

  const performDeleteGroup = useCallback(
    async (groupId: string) => {
      try {
        await deleteGroup(groupId);
      } catch (err) {
        Alert.alert(
          'Could not delete group',
          err instanceof Error ? err.message : 'Unknown error',
        );
      }
    },
    [deleteGroup],
  );

  const handleDeleteGroup = (groupId: string, groupName: string) => {
    if (Platform.OS === 'web') {
      const confirmed =
        typeof globalThis.confirm === 'function'
          ? globalThis.confirm(`Remove "${groupName}"? This cannot be undone.`)
          : false;
      if (confirmed) {
        void performDeleteGroup(groupId);
      }
      return;
    }

    Alert.alert(
      'Delete group?',
      `Remove "${groupName}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void performDeleteGroup(groupId);
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View style={{ width: 44 }} />
        <Text style={styles.title}>My Groups</Text>
        <Pressable
          style={styles.gearBtn}
          onPress={() => router.push('/personal-settings')}
        >
          <Text style={styles.gear}>⚙</Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {groups.map((g) => (
          <View key={g.id} style={styles.card}>
            <Pressable
              style={styles.cardMain}
              onPress={() => {
                router.push(`/group/${g.id}/settings`);
              }}
            >
              <Image
                source={{
                  uri:
                    g.imageKey === 'roku'
                      ? 'https://images.unsplash.com/photo-1593789196529-4a366615a65e?w=200'
                      : 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=200',
                }}
                style={styles.avatar}
                contentFit="cover"
              />
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>{g.name}</Text>
                <Text style={styles.cardSub}>{g.memberCount} members</Text>
              </View>
            </Pressable>
            {g.youAreHost === true && (
              <Pressable
                style={styles.deleteHitArea}
                onPress={() => handleDeleteGroup(g.id, g.name)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                accessibilityLabel={`Delete group ${g.name}`}
              >
                <Text style={styles.deleteIcon}>×</Text>
              </Pressable>
            )}
          </View>
        ))}
      </ScrollView>

      <Pressable
        style={styles.fab}
        onPress={() => router.push('/group/new/settings')}
      >
        <Text style={styles.fabPlus}>+</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.brown,
    fontFamily: 'Georgia',
  },
  gearBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  gear: { fontSize: 22 },
  scroll: { flex: 1 },
  list: { padding: spacing.md, gap: spacing.md, paddingBottom: 100 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radii.card,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  cardMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  deleteHitArea: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteIcon: {
    fontSize: 28,
    color: '#D84343',
    fontWeight: '300',
    lineHeight: 32,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: spacing.md,
    backgroundColor: '#EEE',
  },
  cardText: { flex: 1 },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#222' },
  cardSub: { fontSize: 14, color: colors.greyText, marginTop: 2 },
  fab: {
    position: 'absolute',
    bottom: 36,
    alignSelf: 'center',
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  fabPlus: { fontSize: 36, color: colors.brown, fontWeight: '400' },
});
