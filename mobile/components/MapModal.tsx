import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { colors, radii } from '../constants/theme';

type Props = {
  visible: boolean;
  onClose: () => void;
  restaurantName: string;
  miles: number;
  address: string;
};

export function MapModal({
  visible,
  onClose,
  restaurantName,
  miles,
  address,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={12}>
            <Text style={styles.closeText}>×</Text>
          </Pressable>
          <Text style={styles.distanceTitle}>{miles} miles away</Text>
          <View style={styles.mapBox}>
            <Text style={styles.mapHint}>Map preview (Gainesville area)</Text>
            <Text style={styles.pinLabel}>{restaurantName}</Text>
          </View>
          <Text style={styles.address}>{address}</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.card,
    padding: 20,
  },
  closeBtn: {
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  closeText: {
    fontSize: 28,
    color: colors.red,
    fontWeight: '300',
  },
  distanceTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.brown,
    marginBottom: 12,
  },
  mapBox: {
    height: 200,
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  mapHint: {
    color: colors.greyText,
    fontSize: 14,
  },
  pinLabel: {
    marginTop: 8,
    fontWeight: '600',
    color: colors.brown,
  },
  address: {
    fontSize: 16,
    fontFamily: 'Georgia',
    color: '#111',
  },
});
