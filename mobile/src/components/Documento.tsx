import { Check, ShieldCheck } from 'lucide-react-native';
import { View } from 'react-native';

import { AppText, Screen, TopBar } from '@/components/ui';
import { font, radius, space } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

/** Layout de documento (Política de privacidade e Termos de uso). Os textos precisam de revisão jurídica antes de publicar. */
export function Documento({ titulo, resumo, secoes }: { titulo: string; resumo: string[]; secoes: [string, string][] }) {
  const { colors } = useTheme();
  return (
    <Screen header={<TopBar title={titulo} subtitle="Atualizada em 16/10/2026" />}>
      <View style={{ backgroundColor: colors.tileTraining, borderRadius: radius.card, padding: space.xl, gap: space.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <ShieldCheck size={20} color={colors.accent} />
          <AppText variant="itemTitle">Em resumo</AppText>
        </View>
        {resumo.map((r) => (
          <View key={r} style={{ flexDirection: 'row', gap: space.sm }}>
            <Check size={16} color={colors.accent} style={{ marginTop: 2 }} />
            <AppText style={{ fontFamily: font.medium, flex: 1 }}>{r}</AppText>
          </View>
        ))}
      </View>
      {secoes.map(([h, p]) => (
        <View key={h} style={{ gap: 6, paddingTop: 6 }}>
          <AppText variant="itemTitle">{h}</AppText>
          <AppText color="textMuted" style={{ lineHeight: 20 }}>
            {p}
          </AppText>
        </View>
      ))}
    </Screen>
  );
}
