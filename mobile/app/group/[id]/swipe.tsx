import { useFocusEffect } from '@react-navigation/native';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MapModal } from '../../../components/MapModal';
import { useManeCourse } from '../../../context/ManeCourseContext';
import { colors, radii, spacing } from '../../../constants/theme';

export default function SwipeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const normalizedId = Array.isArray(id) ? id[0] : id;
  const {
    groups,
    activeRound,
    roundVotes,
    ensureActiveRound,
    recordSwipe,
    getRestaurantsByIds,
    submitAllVotes,
    completeRound,
  } = useManeCourse();
  const [index, setIndex] = useState(0);
  const [mapOpen, setMapOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!normalizedId || normalizedId === 'new') return;
      let mounted = true;
      const loadRound = async () => {
        try {
          setLoading(true);
          let latitude = 29.6516;
          let longitude = -82.3248;
          try {
            const Location = await import('expo-location');
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status === 'granted') {
              const loc = await Promise.race([
                Location.getCurrentPositionAsync({
                  accuracy: Location.Accuracy.Balanced,
                  timeInterval: 1000,
                }),
                new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000)),
              ]);
              if (loc) {
                latitude = loc.coords.latitude;
                longitude = loc.coords.longitude;
              } else {
                const last = await Location.getLastKnownPositionAsync();
                if (last) {
                  latitude = last.coords.latitude;
                  longitude = last.coords.longitude;
                }
              }
            }
          } catch {
            // Keep Gainesville fallback when location module/permission is unavailable.
          }
          await ensureActiveRound(normalizedId, { latitude, longitude });
        } catch (err) {
          Alert.alert('Could not load restaurants', err instanceof Error ? err.message : 'Unknown error');
        } finally {
          if (mounted) setLoading(false);
        }
      };
      void loadRound();
      return () => {
        mounted = false;
      };
    }, [ensureActiveRound, normalizedId]),
  );

  useEffect(() => {
    setIndex(0);
  }, [activeRound?.id, activeRound?.deck.length]);

  const deck = getRestaurantsByIds(activeRound?.deck.map((d) => d.placeId) || []);
  const current = deck[index];
  const groupTitle =
    groups.find((g) => g.id === normalizedId)?.name ?? 'Group';

  const onChoice = async (like: boolean) => {
    if (!current) return;
    recordSwipe(current.id, like);
    if (index >= deck.length - 1) {
      try {
        setSubmitting(true);
        await submitAllVotes();
        const result = await completeRound();
        if (result.status === 'next_round') {
          router.replace(`/group/${normalizedId}/swipe`);
        } else if (result.status === 'resolved') {
          router.replace(`/group/${normalizedId}/match`);
        } else {
          const rid = activeRound?.id;
          if (rid != null && normalizedId) {
            router.replace({
              pathname: '/group/[id]/waiting',
              params: { id: normalizedId, roundId: String(rid) },
            });
          }
        }
      } catch (err) {
        Alert.alert('Failed to submit votes', err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setSubmitting(false);
      }
    } else {
      setIndex((i) => i + 1);
    }
  };

  if (loading || !activeRound) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.brown} />
          <Text style={styles.loading}>Loading real nearby restaurants…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!current) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.headerTitle}>{groupTitle}</Text>
        <Text style={styles.loading}>
          No restaurants match your filters.{'\n'}Try adjusting settings.
        </Text>
        <Pressable
          style={styles.settingsLink}
          onPress={() => router.push(`/group/${normalizedId}/settings`)}
        >
          <Text style={styles.settingsLinkText}>Edit Group Settings</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const filled = Math.min(current.priceLevel, 4);

  return (
    <SafeAreaView style={styles.safe}>
      <Text style={styles.headerTitle}>{groupTitle}</Text>

      <View style={styles.card}>
        <Image source={{ uri: current.imageUri }} style={styles.photo} />
        <Text style={styles.restName}>{current.name}</Text>
        <Text style={styles.cuisine}>{current.cuisine}</Text>
        <Text style={styles.stars}>☆ ☆ ☆ ☆ ☆</Text>
        <Pressable onPress={() => setMapOpen(true)}>
          <Text style={styles.distance}>↗ {current.miles} miles away</Text>
        </Pressable>
        <View style={styles.priceRow}>
          {[1, 2, 3, 4].map((i) => (
            <Text
              key={i}
              style={[
                styles.dollar,
                i <= filled ? styles.dollarOn : styles.dollarOff,
              ]}
            >
              $
            </Text>
          ))}
        </View>
        <Pressable
          style={styles.moreDetailsBtn}
          onPress={() =>
            router.push({
              pathname: '/RestaurantDetails',
              params: { restaurantId: current.id },
            })
          }
        >
          <Text style={styles.moreDetailsText}>More Details <Text style={{ fontWeight: 'bold' }}>+</Text></Text>
        </Pressable>
        {!!roundVotes[current.id] && (
          <Text style={styles.selectedHint}>Selected: Like</Text>
        )}
        {roundVotes[current.id] === false && (
          <Text style={styles.selectedHint}>Selected: Pass</Text>
        )}
        <View style={styles.actions}>
          <Pressable
            style={[styles.circle, styles.no]}
            onPress={() => void onChoice(false)}
            disabled={submitting}
          >
            <Text style={styles.arrow}>←</Text>
          </Pressable>
          <Pressable
            style={[styles.circle, styles.yes]}
            onPress={() => void onChoice(true)}
            disabled={submitting}
          >
            <Text style={styles.arrow}>→</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.tabBar}>
        <Pressable
          style={styles.tabItem}
          onPress={() => router.replace('/home')}
        >
          <Text style={styles.tabIcon}>👥</Text>
          <Text style={styles.tabLabel}>My Groups</Text>
        </Pressable>
        <Pressable
          style={styles.tabItem}
          onPress={() => router.push(`/group/${normalizedId}/settings`)}
        >
          <Text style={styles.tabIcon}>✎</Text>
          <Text style={styles.tabLabel}>Group Settings</Text>
        </Pressable>
      </View>

      <MapModal
        visible={mapOpen}
        onClose={() => setMapOpen(false)}
        restaurantName={current.name}
        miles={current.miles}
        address={current.address || 'Address unavailable'}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  loading: {
    textAlign: 'center',
    marginTop: 24,
    fontSize: 16,
    color: '#555',
    paddingHorizontal: 32,
    lineHeight: 24,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  settingsLink: {
    alignSelf: 'center',
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 24,
    backgroundColor: colors.brown,
    borderRadius: 20,
  },
  settingsLinkText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  moreDetailsBtn: {
    marginTop: 10,
    paddingVertical: 6,
    paddingHorizontal: 18,
    backgroundColor: '#f3f3f3',
    borderRadius: 18,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  moreDetailsText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    color: colors.brown,
    fontFamily: 'Georgia',
    marginBottom: spacing.md,
  },
  card: {
    flex: 1,
    marginHorizontal: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radii.card,
    padding: spacing.lg,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 5,
  },
  photo: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 3,
    borderColor: colors.red,
    marginBottom: spacing.md,
  },
  restName: {
    fontSize: 26,
    fontWeight: '800',
    fontFamily: 'Georgia',
    color: '#111',
  },
  cuisine: { fontSize: 15, color: '#333', marginTop: 4 },
  stars: { fontSize: 18, marginVertical: 8, letterSpacing: 4 },
  distance: {
    color: colors.blueLink,
    fontSize: 15,
    textDecorationLine: 'underline',
  },
  priceRow: { flexDirection: 'row', gap: 4, marginTop: 12 },
  dollar: { fontSize: 22, fontWeight: '800' },
  dollarOn: { color: '#2E7D32' },
  dollarOff: { color: '#111' },
  selectedHint: { marginTop: 8, color: colors.greyText },
  actions: {
    flexDirection: 'row',
    gap: 40,
    marginTop: 'auto',
    paddingBottom: spacing.lg,
  },
  circle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  no: { backgroundColor: colors.redDislike },
  yes: { backgroundColor: colors.greenLike },
  arrow: { fontSize: 28, color: colors.white, fontWeight: '700' },
  tabBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    backgroundColor: '#EDE8E0',
    borderTopWidth: 1,
    borderTopColor: '#DDD',
  },
  tabItem: { alignItems: 'center' },
  tabIcon: { fontSize: 22 },
  tabLabel: { fontSize: 12, marginTop: 4, fontFamily: 'Georgia' },
});
