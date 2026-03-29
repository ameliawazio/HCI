import {
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { colors, radii } from '../constants/theme';

type Props = {
  title: string;
  onPress: () => void;
  variant?: 'filled' | 'cream';
  style?: StyleProp<ViewStyle>;
};

export function PrimaryButton({
  title,
  onPress,
  variant = 'filled',
  style,
}: Props) {
  const isCream = variant === 'cream';
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        isCream ? styles.cream : styles.filled,
        pressed && styles.pressed,
        style,
      ]}
    >
      <Text style={[styles.text, isCream ? styles.textBrown : styles.textWhite]}>
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  filled: {
    backgroundColor: colors.brown,
  },
  cream: {
    backgroundColor: colors.white,
  },
  pressed: {
    opacity: 0.88,
  },
  text: {
    fontSize: 18,
    fontWeight: '700',
  },
  textWhite: { color: colors.white },
  textBrown: { color: colors.brown },
});
