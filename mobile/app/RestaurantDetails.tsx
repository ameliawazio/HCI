import React from 'react';
import { View, Text, Image, StyleSheet, Linking, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useRoute } from '@react-navigation/native';
import { useManeCourse } from '../context/ManeCourseContext';

// Props: expects a restaurantId passed via navigation params
export default function RestaurantDetails() {
  // You may need to adjust this if using expo-router or another router
  const route = useRoute();
  // @ts-ignore
  const { restaurantId } = route.params || {};
  const { getRestaurantsByIds } = useManeCourse();
  const restaurant = getRestaurantsByIds([restaurantId])[0];

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
      <View style={styles.container}>
        <Text style={styles.name}>{restaurant.name}</Text>
        {restaurant.menuImageUri && (
          <Image
            source={{ uri: restaurant.menuImageUri }}
            style={styles.menuImg}
            resizeMode="contain"
          />
        )}
        {restaurant.websiteUrl && (
          <Pressable
            style={styles.websiteBtn}
            onPress={() => Linking.openURL(restaurant.websiteUrl)}
          >
            <Text style={styles.websiteText}>Visit Website</Text>
          </Pressable>
        )}
        {restaurant.dietaryRestrictions && (
          <View style={styles.dietaryBox}>
            <Text style={styles.dietaryTitle}>Dietary Restrictions:</Text>
            <Text style={styles.dietaryText}>{restaurant.dietaryRestrictions}</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
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
