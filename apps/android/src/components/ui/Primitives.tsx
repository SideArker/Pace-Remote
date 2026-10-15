import type { ReactNode } from 'react';
import { Pressable, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, common } from '../../theme/tokens';

export function Button({ title, onPress, disabled, secondary }: { title: string; onPress: () => void; disabled?: boolean; secondary?: boolean }) {
  return <Pressable accessibilityRole="button" onPress={onPress} disabled={disabled} style={[secondary ? common.secondaryButton : common.button, disabled && { opacity: 0.45 }]}>
    <Text style={secondary ? { color: colors.text, fontWeight: '600' } : common.buttonText}>{title}</Text>
  </Pressable>;
}
export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[common.card, style]}>{children}</View>;
}
export function Label({ children, color = colors.muted }: { children: ReactNode; color?: string }) {
  return <Text style={{ color, fontSize: 12, fontWeight: '600' }}>{children}</Text>;
}
