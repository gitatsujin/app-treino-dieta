import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { AppText, Card, Divider, ProgressBar, Screen, SegmentedControl, TopBar } from '@/components/ui';
import { hojeIso, useConsulta } from '@/db/conexao';
import { nutrientes, resumoDoDia } from '@/db/dieta';
import { dataCurta, num } from '@/lib/formato';
import { font, space } from '@/theme/tokens';

const ABAS: Record<string, string[]> = {
  Vitaminas: ['vitamina_a', 'vitamina_c', 'tiamina', 'riboflavina', 'niacina', 'vitamina_b6'],
  Minerais: ['calcio', 'ferro', 'magnesio', 'fosforo', 'potassio', 'sodio', 'zinco'],
  Outros: ['fibra'],
};

/** Micronutrientes do dia (RF34). Barras pela cor de status (RNF11). */
export default function Micronutrientes() {
  const { data = hojeIso() } = useLocalSearchParams<{ data?: string }>();
  const [aba, setAba] = useState('Minerais');
  const d = useConsulta(() => ({ nut: nutrientes(), r: resumoDoDia(data) }), [data]);
  return (
    <Screen header={<TopBar title="Micronutrientes" subtitle={data === hojeIso() ? `Hoje, ${dataCurta(data)}` : dataCurta(data)} />}>
      <SegmentedControl options={Object.keys(ABAS)} selected={aba} onChange={setAba} />
      <Card gap={space.md}>
        {ABAS[aba].map((id, i) => {
          const n = d.nut.find((x) => x.id === id)!;
          const atual = d.r.consumido[id] ?? 0;
          const ref = n.recomendado_dia ?? 1;
          const p = atual / ref;
          return (
            <View key={id} style={{ gap: space.sm }}>
              {i > 0 ? <Divider /> : null}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <AppText style={{ fontFamily: font.medium }}>{n.nome}</AppText>
                <AppText variant="bodySmall" color="textMuted">
                  {num(atual)} / {num(ref)} {n.unidade === 'mcg' ? 'µg' : n.unidade}
                  {'  ·  '}
                  {Math.round(p * 100)}%{id === 'sodio' ? ' do limite' : ''}
                </AppText>
              </View>
              <ProgressBar value={Math.min(p, 1)} max={1} />
            </View>
          );
        })}
      </Card>
      <AppText variant="caption" color="textMuted">
        Referência: valores diários para adultos (ANVISA, IN 75/2020). Para o sódio, o valor é um limite máximo. Os valores dependem dos dados de cada alimento: alimentos
        cadastrados só com calorias e macros não somam micronutrientes.
      </AppText>
    </Screen>
  );
}
