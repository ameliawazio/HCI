import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MapModal } from '../../../components/MapModal';
import { useManeCourse } from '../../../context/ManeCourseContext';
import { colors } from '../../../constants/theme';

export default function MatchScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { lastWinner, staleTieMessage, clearWinner, pollGroupResult } = useManeCourse();
  const [mapOpen, setMapOpen] = useState(false);
  const winner = lastWinner;

  useEffect(() => {
    if (!winner && id) {
      pollGroupResult(id).catch(() => null);
    }
  }, [id, pollGroupResult, winner]);

  useEffect(() => {
    if (staleTieMessage) {
      Alert.alert(
        'Still tied',
        'The same restaurants tied again — we picked one so your group can eat!',
      );
    }
  }, [staleTieMessage]);

  if (!winner) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.miss}>No winner yet.</Text>
        <Pressable onPress={() => router.replace(`/group/${id}/swipe`)}>
          <Text style={styles.link}>Back to swiping</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <Pressable style={styles.backBtn} onPress={() => router.replace('/home')}>
        <Text style={styles.back}>‹</Text>
      </Pressable>
      <Text style={styles.banner}>Stable Connection Found!</Text>

      <View style={styles.heartArea}>
        <Text style={styles.heartGlow}>♥</Text>
        <View style={styles.avatars}>
          <Image
            source={{
              uri: 'https://images.unsplash.com/photo-1593789196529-4a366615a65e?w=200',
            }}
            style={styles.av}
          />
          <Image source={{ uri: winner.imageUri }} style={styles.av} />
        </View>
        <Text style={styles.matchLabel}>IT&apos;S A Match!</Text>
      </View>

      <Text style={styles.restName}>{winner.name}</Text>
      <Text style={styles.cuisine}>{winner.cuisine}</Text>
      <Text style={styles.stars}>★★★☆☆</Text>
      <Pressable onPress={() => setMapOpen(true)}>
        <Text style={styles.dist}>↗ {winner.miles} miles away</Text>
      </Pressable>
      <View style={styles.priceRow}>
        <Text style={styles.d1}>$</Text>
        <Text style={styles.d2}>$</Text>
        <Text style={styles.d2}>$</Text>
      </View>

      <Pressable
        style={styles.done}
        onPress={() => {
          clearWinner();
          router.replace('/home');
        }}
      >
        <Text style={styles.doneText}>Done</Text>
      </Pressable>

      <MapModal
        visible={mapOpen}
        onClose={() => setMapOpen(false)}
        restaurantName={winner.name}
        miles={winner.miles}
        address={winner.address || 'Address unavailable'}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#B71C1C',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  miss: { color: '#FFF', marginTop: 40 },
  link: { color: '#FFF', marginTop: 16, textDecorationLine: 'underline' },
  backBtn: { alignSelf: 'flex-start', marginTop: 8 },
  back: { fontSize: 36, color: '#FFF', fontWeight: '300' },
  banner: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 16,
    marginTop: 8,
  },
  heartArea: {
    alignItems: 'center',
    marginVertical: 24,
  },
  heartGlow: {
    fontSize: 180,
    color: '#E53935',
    opacity: 0.9,
    textShadowColor: '#FF8A80',
    textShadowRadius: 40,
  },
  avatars: {
    position: 'absolute',
    flexDirection: 'row',
    gap: 12,
    top: 50,
  },
  av: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    borderColor: '#FFF',
  },
  matchLabel: {
    marginTop: 100,
    fontSize: 28,
    fontWeight: '900',
    color: '#FFF',
  },
  restName: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFF',
    fontFamily: 'Georgia',
  },
  cuisine: { color: '#FFF', marginTop: 6, fontSize: 16 },
  stars: { color: colors.goldStar, fontSize: 22, marginVertical: 8 },
  dist: {
    color: '#FFF',
    textDecorationLine: 'underline',
    fontSize: 16,
    marginTop: 4,
  },
  priceRow: { flexDirection: 'row', gap: 6, marginTop: 12 },
  d1: { color: '#69F0AE', fontSize: 28, fontWeight: '800' },
  d2: { color: '#FFF', fontSize: 28, fontWeight: '800' },
  done: {
    marginTop: 'auto',
    marginBottom: 40,
    paddingVertical: 14,
    paddingHorizontal: 48,
    backgroundColor: '#FFF',
    borderRadius: 24,
  },
  doneText: { color: colors.brown, fontWeight: '800', fontSize: 16 },
});
