import { router } from 'expo-router';
import { ChevronLeft, X } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { size, space } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

import { AppText } from './AppText';

type Props = {
  title: string;
  subtitle?: string;
  leading?: 'back' | 'close';
  onLeadingPress?: () => void;
  actionLabel?: string;
  onAction?: () => void;
};

/**
 * Barra das telas internas: botão circular de 40 à esquerda (voltar ou fechar),
 * título centralizado e ação em texto à direita. Laterais de 76 mantêm o título no centro.
 */
export function TopBar({ title, subtitle, leading = 'back', onLeadingPress, actionLabel, onAction }: Props) {
  const { colors } = useTheme();
  const Icon = leading === 'close' ? X : ChevronLeft;
  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={styles.side}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={leading === 'close' ? 'Fechar' : 'Voltar'}
          onPress={onLeadingPress ?? (() => router.back())}
          style={[styles.circle, { backgroundColor: colors.surface }]}>
          <Icon size={20} color={colors.text} strokeWidth={2.6} />
        </Pressable>
      </View>
      <View style={styles.center}>
        <AppText variant="cardTitle" numberOfLines={1} accessibilityRole="header">
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="caption" color="textMuted" numberOfLines={1}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      <View style={[styles.side, styles.right]}>
        {actionLabel ? (
          <Pressable accessibilityRole="button" onPress={onAction} hitSlop={8}>
            <AppText variant="itemTitle" color="accent">
              {actionLabel}
            </AppText>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.xl, paddingTop: space.sm, paddingBottom: space.xs },
  side: { width: 76 },
  right: { alignItems: 'flex-end' },
  center: { flex: 1, alignItems: 'center' },
  circle: { width: size.topButton, height: size.topButton, borderRadius: size.topButton / 2, alignItems: 'center', justifyContent: 'center' },
});
