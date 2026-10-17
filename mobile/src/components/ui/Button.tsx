import type { LucideIcon } from 'lucide-react-native';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { radius, size, space } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

import { AppText } from './AppText';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'dangerFilled';

type Props = {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  icon?: LucideIcon;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * Botão padrão (RNF08): altura 44, canto 14, texto 14 Semi Bold.
 * Um primário por card; o secundário fica à esquerda (ver ButtonRow).
 */
export function Button({ label, onPress, variant = 'primary', icon: Icon, disabled, style }: Props) {
  const { colors } = useTheme();
  const palette = {
    primary: { bg: colors.accent, border: colors.accent, fg: colors.onAccent },
    secondary: { bg: colors.surface, border: colors.accent, fg: colors.accent },
    danger: { bg: colors.surface, border: colors.statusFar, fg: colors.statusFar },
    dangerFilled: { bg: colors.statusFar, border: colors.statusFar, fg: colors.onAccent },
  }[variant];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: palette.bg, borderColor: palette.border, opacity: disabled ? 0.45 : pressed ? 0.85 : 1 },
        style,
      ]}>
      <View style={styles.content}>
        {Icon ? <Icon size={18} color={palette.fg} strokeWidth={2.5} /> : null}
        <AppText variant="button" numberOfLines={1} style={{ color: palette.fg }}>
          {label}
        </AppText>
      </View>
    </Pressable>
  );
}

/** Secundário com largura fixa de 112 à esquerda + primário ocupando o resto. */
export function ButtonRow({ secondary, primary }: { secondary: Props; primary: Props }) {
  return (
    <View style={styles.row}>
      <Button variant="secondary" {...secondary} style={{ width: 112 }} />
      <Button {...primary} style={{ flex: 1 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    height: size.button,
    borderRadius: radius.button,
    borderWidth: 1.5,
    paddingHorizontal: space.xl,
    justifyContent: 'center',
  },
  content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm },
  row: { flexDirection: 'row', gap: space.sm },
});
