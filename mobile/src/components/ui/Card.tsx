import { Pressable, View, type ViewProps } from 'react-native';

import { radius, space } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

type Props = ViewProps & { gap?: number; padding?: number; onPress?: () => void };

/** Base de quase todos os blocos: fundo surface, canto 20, padding 16, espaço interno 12. Com `onPress`, o card inteiro é tocável. */
export function Card({ gap = space.lg, padding = space.xl, style, onPress, ...rest }: Props) {
  const { colors } = useTheme();
  const s = [{ backgroundColor: colors.surface, borderRadius: radius.card, padding, gap }, style];
  if (onPress)
    return (
      <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [s, { opacity: pressed ? 0.85 : 1 }]}>
        {rest.children}
      </Pressable>
    );
  return <View style={s} {...rest} />;
}
