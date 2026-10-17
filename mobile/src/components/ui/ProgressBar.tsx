import { View } from 'react-native';

import { radius, statusColor } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

type Props = { value: number; max: number; color?: string };

/** Barra de 8 de altura. Sem `color`, usa a cor de status pelo progresso (RNF11). */
export function ProgressBar({ value, max, color }: Props) {
  const { colors } = useTheme();
  const progress = max > 0 ? Math.min(Math.max(value / max, 0), 1) : 0;
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}
      style={{ height: 8, borderRadius: radius.bar, backgroundColor: colors.track, overflow: 'hidden' }}>
      <View
        style={{
          width: `${progress * 100}%`,
          height: '100%',
          borderRadius: radius.bar,
          backgroundColor: color ?? statusColor(progress, colors),
        }}
      />
    </View>
  );
}
