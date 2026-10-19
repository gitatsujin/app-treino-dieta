import { Watch } from 'lucide-react-native';
import { View } from 'react-native';

import { AppText, ButtonRow, Card, IconTile } from '@/components/ui';
import { useConsulta } from '@/db/conexao';
import { AEROBICOS } from '@/db/treino';
import { dataCurta, hora, num } from '@/lib/formato';
import { duplicidadesPendentes, resolverDuplicidade } from '@/lib/saude';
import type { TipoAerobico } from '@/lib/calculos';
import { space } from '@/theme/tokens';

const resumo = (a: { tipo: string; duracao_min: number; distancia_km: number | null; calorias_gastas_kcal: number | null }) =>
  [`${AEROBICOS[a.tipo as TipoAerobico] ?? a.tipo} ${num(a.duracao_min, 0)} min`, a.distancia_km ? `${num(a.distancia_km)} km` : '', a.calorias_gastas_kcal != null ? `${num(a.calorias_gastas_kcal, 0)} kcal` : '']
    .filter(Boolean)
    .join(' · ');

/**
 * RN13: atividade do relógio no mesmo horário de uma registrada pelo usuário. O app guardou a do relógio
 * e pergunta se o usuário quer usar o que ele registrou.
 */
export function Duplicidades() {
  const lista = useConsulta(() => duplicidadesPendentes());
  if (!lista.length) return null;
  return (
    <>
      {lista.map(({ relogio, manual }) => (
        <Card key={manual.id} gap={space.md}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
            <IconTile icon={Watch} tone="diet" size={36} />
            <View style={{ flex: 1, gap: 2 }}>
              <AppText variant="itemTitle">Atividade registrada duas vezes</AppText>
              <AppText variant="caption" color="textMuted">
                {dataCurta(relogio.inicio.slice(0, 10))} às {hora(relogio.inicio)}
              </AppText>
            </View>
          </View>
          <View style={{ gap: 4 }}>
            <AppText variant="bodySmall">
              <AppText variant="bodySmall" style={{ fontFamily: 'Inter_600SemiBold' }}>
                Relógio:{' '}
              </AppText>
              {resumo(relogio)}
            </AppText>
            <AppText variant="bodySmall">
              <AppText variant="bodySmall" style={{ fontFamily: 'Inter_600SemiBold' }}>
                Você:{' '}
              </AppText>
              {resumo(manual)}
            </AppText>
          </View>
          <AppText variant="caption" color="textMuted">
            Por enquanto vale a do relógio. Quer usar o que você registrou?
          </AppText>
          <ButtonRow secondary={{ label: 'Manter relógio', onPress: () => resolverDuplicidade(manual.id, false) }} primary={{ label: 'Usar o meu', onPress: () => resolverDuplicidade(manual.id, true) }} />
        </Card>
      ))}
    </>
  );
}
