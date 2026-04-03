/** Gainesville fallback when permission denied or unavailable (matches swipe screen). */
const FALLBACK = { latitude: 29.6516, longitude: -82.3248 };

export async function getApproxLocation(): Promise<{ latitude: number; longitude: number }> {
  let latitude = FALLBACK.latitude;
  let longitude = FALLBACK.longitude;
  try {
    const Location = await import("expo-location");
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === "granted") {
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
    // keep fallback
  }
  return { latitude, longitude };
}
