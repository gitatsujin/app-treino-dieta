import type { LucideIcon } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { space } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

import { AppText } from './AppText';

type Props = {
  title: string;
  subtitle?: string;
  action?: { icon: LucideIcon; label: string; onPress: () => void };
};

/** Cabeçalho das abas: título 28 Bold, subtítulo e ação circular de 44 à direita. */
export function ScreenHeader({ title, subtitle, action }: Props) {
  const { colors } = useTheme();
  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={styles.texts}>
        <AppText variant="screenTitle" accessibilityRole="header">
          {title}
        </AppText>
        {subtitle ? <AppText color="textMuted">{subtitle}</AppText> : null}
      </View>
      {action ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={action.label}
          onPress={action.onPress}
          style={[styles.action, { backgroundColor: colors.accent }]}>
          <action.icon size={22} color={colors.onAccent} strokeWidth={2.6} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.xxl,
    paddingTop: space.sm,
    paddingBottom: space.lg,
  },
  texts: { gap: space.xxs, flexShrink: 1 },
  action: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
