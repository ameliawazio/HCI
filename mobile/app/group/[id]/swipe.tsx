import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import {
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
    session,
    startSwipeSession,
    recordSwipe,
    getRestaurantsByIds,
  } = useManeCourse();
  const [index, setIndex] = useState(0);
  const [mapOpen, setMapOpen] = useState(false);

  // Restart the session every time this screen is focused so that
  // any group setting changes (price, radius, cuisines) are applied.
  useFocusEffect(
    useCallback(() => {
      if (!normalizedId || normalizedId === 'new') return;
      startSwipeSession(normalizedId);
    }, [normalizedId, startSwipeSession]),
  );

  useEffect(() => {
    setIndex(0);
  }, [session.deckIds.join(',')]);

  const deck = getRestaurantsByIds(session.deckIds);
  const current = deck[index];
  const groupTitle =
    groups.find((g) => g.id === normalizedId)?.name ?? 'Group';

  const onChoice = (like: boolean) => {
    if (!current) return;
    recordSwipe(current.id, like);
    if (index >= deck.length - 1) {
      router.push(`/group/${normalizedId}/waiting`);
    } else {
      setIndex((i) => i + 1);
    }
  };

  if (!current) {
    const sessionReady = session.groupId === normalizedId;
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.headerTitle}>{groupTitle}</Text>
        <Text style={styles.loading}>
          {sessionReady
            ? 'No restaurants match your filters.\nTry adjusting settings.'
            : 'Loading deck…'}
        </Text>
        {sessionReady && (
          <Pressable
            style={styles.settingsLink}
            onPress={() => router.push(`/group/${normalizedId}/settings`)}
          >
            <Text style={styles.settingsLinkText}>Edit Group Settings</Text>
          </Pressable>
        )}
      </SafeAreaView>
    );
  }

  const filled = Math.min(current.priceLevel, 3);

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
          {[1, 2, 3].map((i) => (
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
          onPress={() => router.push({ pathname: '/RestaurantDetails', params: { restaurantId: current.id } })}
        >
          <Text style={styles.moreDetailsText}>More Details <Text style={{ fontWeight: 'bold' }}>+</Text></Text>
        </Pressable>
        <View style={styles.actions}>
          <Pressable
            style={[styles.circle, styles.no]}
            onPress={() => onChoice(false)}
          >
            <Text style={styles.arrow}>←</Text>
          </Pressable>
          <Pressable
            style={[styles.circle, styles.yes]}
            onPress={() => onChoice(true)}
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
        address="1680 W University Ave, Ste 20"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
  safe: { flex: 1, backgroundColor: colors.cream },
  loading: { textAlign: 'center', marginTop: 80, fontSize: 16, color: '#555', paddingHorizontal: 32, lineHeight: 24 },
  settingsLink: { alignSelf: 'center', marginTop: 20, paddingVertical: 10, paddingHorizontal: 24, backgroundColor: colors.brown, borderRadius: 20 },
  settingsLinkText: { color: '#fff', fontWeight: '700', fontSize: 15 },
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
