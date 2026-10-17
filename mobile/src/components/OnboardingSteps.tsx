import { View } from 'react-native';

import { AppText } from '@/components/ui';
import { font, space } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

/** "Passo X de Y" com segmentos de 4 de altura (ProgressSteps do guia). */
export function OnboardingSteps({ step, total = 3 }: { step: number; total?: number }) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: space.sm }}>
      <AppText variant="caption" color="textMuted" style={{ fontFamily: font.medium }}>
        Passo {step} de {total}
      </AppText>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {Array.from({ length: total }, (_, i) => (
          <View key={i} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: i < step ? colors.accent : colors.track }} />
        ))}
      </View>
    </View>
  );
}
