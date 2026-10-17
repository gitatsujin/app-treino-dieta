import type { LucideIcon } from 'lucide-react-native';
import { View } from 'react-native';

import { useTheme } from '@/theme/use-theme';

type Props = { icon: LucideIcon; tone?: 'training' | 'diet' | 'neutral'; size?: 28 | 32 | 36 | 40 | 44 | 52 };

/** Quadrado de ícone: canto de 30% do lado, ícone com metade do tamanho. */
export function IconTile({ icon: Icon, tone = 'training', size = 44 }: Props) {
  const { colors } = useTheme();
  const bg = { training: colors.tileTraining, diet: colors.tileDiet, neutral: colors.track }[tone];
  const fg = { training: colors.accent, diet: colors.dietStrong, neutral: colors.textMuted }[tone];
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.3),
        backgroundColor: bg,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Icon size={Math.round(size / 2)} color={fg} strokeWidth={2.6} />
    </View>
  );
}
