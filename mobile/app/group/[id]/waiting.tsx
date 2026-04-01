import { useFocusEffect } from '@react-navigation/native';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useManeCourse } from '../../../context/ManeCourseContext';
import { colors, radii, spacing } from '../../../constants/theme';

export default function WaitingScreen() {
  const { id, roundId } = useLocalSearchParams<{ id: string; roundId?: string }>();
  const { pollGroupResult } = useManeCourse();

  useFocusEffect(
    useCallback(() => {
      if (!id) return () => undefined;
      let active = true;
      const poll = async () => {
        try {
          const state = await pollGroupResult(id);
          if (!active) return;
          if (state.winner) {
            router.replace(`/group/${id}/match`);
            return;
          }
          if (state.activeRound && String(state.activeRound.id) !== String(roundId || '')) {
            router.replace(`/group/${id}/swipe`);
            return;
          }
        } catch {
          // ignore transient errors while waiting
        }
      };
      const handle = setInterval(() => {
        void poll();
      }, 2500);
      void poll();
      return () => {
        active = false;
        clearInterval(handle);
      };
    }, [id, pollGroupResult]),
  );

  const title =
    id === '1' ? 'The Roku Remotes' : id === '2' ? 'Family' : 'Group';

  return (
    <SafeAreaView style={styles.safe}>
      <Text style={styles.header}>{title}</Text>
      <View style={styles.dim}>
        <View style={styles.modal}>
          <Text style={styles.waitText}>
            Waiting for other group members to finish…
          </Text>
        </View>
      </View>
      <View style={styles.tabBar}>
        <Text style={styles.tabItem}>👥 My Groups</Text>
        <Text style={styles.tabItem}>✎ Group Settings</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  header: {
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '800',
    color: colors.brown,
    marginBottom: spacing.md,
  },
  dim: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modal: {
    backgroundColor: colors.white,
    borderRadius: radii.card,
    padding: spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  waitText: {
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '800',
    color: colors.brown,
  },
  tabBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    backgroundColor: '#EDE8E0',
  },
  tabItem: { fontSize: 12 },
});
