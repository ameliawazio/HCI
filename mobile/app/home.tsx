import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useManeCourse } from '../context/ManeCourseContext';
import { colors, radii, spacing } from '../constants/theme';

export default function HomeScreen() {
  const { token, groups, deleteGroup, refreshGroups } = useManeCourse();

  useFocusEffect(
    useCallback(() => {
      if (!token) {
        router.replace('/login');
        return;
      }
      refreshGroups().catch(() => null);
    }, [refreshGroups, token]),
  );

  const handleDeleteGroup = (groupId: string, groupName: string) => {
    Alert.alert(
      'Delete group?',
      `Remove ${groupName}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteGroup(groupId),
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

      <View style={styles.list}>
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
            <Pressable
              style={styles.deleteHitArea}
              onPress={() => handleDeleteGroup(g.id, g.name)}
            >
              <View style={styles.deleteLine} />
            </Pressable>
          </View>
        ))}
      </View>

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
  list: { padding: spacing.md, gap: spacing.md },
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
    width: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteLine: {
    width: 14,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#D84343',
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
