import React from 'react';
import { View, Text, Image, StyleSheet, Linking, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useManeCourse } from '../context/ManeCourseContext';

const PRICE_LABELS: Record<1 | 2 | 3 | 4, string> = {
  1: '$1-$10',
  2: '$10-$20',
  3: '$20-$30',
  4: '$30+',
};

// Props: expects a restaurantId passed via navigation params
export default function RestaurantDetails() {
  const { restaurantId } = useLocalSearchParams<{ restaurantId: string }>();
  const { getRestaurantsByIds } = useManeCourse();
  const restaurant = restaurantId ? getRestaurantsByIds([restaurantId])[0] : undefined;
  const priceLevel = ((restaurant?.priceLevel || 1) as 1 | 2 | 3 | 4);

  if (!restaurant) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.topRow}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Text style={styles.back}>‹</Text>
          </Pressable>
        </View>
        <Text style={styles.notFound}>Restaurant not found.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topRow}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.back}>‹</Text>
        </Pressable>
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={styles.container}>
          <Text style={styles.name}>{restaurant.name}</Text>
          {restaurant.imageUri && (
            <Image
              source={{ uri: restaurant.imageUri }}
              style={styles.menuImg}
              resizeMode="contain"
            />
          )}
          {restaurant.placeUrl && (
            <Pressable
              style={styles.websiteBtn}
              onPress={() => Linking.openURL(restaurant.placeUrl!)}
            >
              <Text style={styles.websiteText}>Open in Maps</Text>
            </Pressable>
          )}
          <View style={styles.dietaryBox}>
            <Text style={styles.dietaryTitle}>Cuisine:</Text>
            <Text style={styles.dietaryText}>{restaurant.cuisine}</Text>
          </View>
          <View style={styles.dietaryBox}>
            <Text style={styles.dietaryTitle}>Price:</Text>
            <Text style={styles.dietaryText}>{'$'.repeat(priceLevel)} ({PRICE_LABELS[priceLevel]})</Text>
          </View>
          {!!restaurant.address && (
            <View style={styles.dietaryBox}>
              <Text style={styles.dietaryTitle}>Address:</Text>
              <Text style={styles.dietaryText}>{restaurant.address}</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 24 },
  topRow: {
    paddingHorizontal: 16,
    paddingTop: 8,
    alignItems: 'flex-start',
  },
  back: { fontSize: 32, color: '#2a3eb1', fontWeight: '600' },
  container: { alignItems: 'center', padding: 24 },
  photo: { width: 220, height: 220, borderRadius: 110, marginBottom: 18 },
  name: { fontSize: 28, fontWeight: 'bold', marginBottom: 18, textAlign: 'center' },
  menuImg: {
    width: '100%',
    maxWidth: 600,
    height: 320,
    borderRadius: 16,
    marginVertical: 24,
    alignSelf: 'center',
    backgroundColor: '#fff',
  },
  dietaryBox: { backgroundColor: '#f3f3f3', padding: 14, borderRadius: 10, marginTop: 18, width: '100%' },
  websiteBtn: {
    marginTop: 10,
    marginBottom: 10,
    paddingVertical: 10,
    paddingHorizontal: 24,
    backgroundColor: '#e3e3ff',
    borderRadius: 8,
    alignSelf: 'center',
  },
  websiteText: {
    color: '#2a3eb1',
    fontWeight: 'bold',
    fontSize: 17,
    textDecorationLine: 'underline',
  },
  dietaryTitle: { fontWeight: 'bold', marginBottom: 4, fontSize: 16 },
  dietaryText: { color: '#333', fontSize: 15 },
  notFound: { textAlign: 'center', marginTop: 40, fontSize: 18 },
});
