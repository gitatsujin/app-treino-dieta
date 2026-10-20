import { useState } from 'react';
import { View } from 'react-native';

import { AppText, BarChart, Card, Divider, ListRow, Screen, SegmentedControl, Tag, TopBar } from '@/components/ui';
import { hojeIso, useConsulta } from '@/db/conexao';
import { diasComRegistro, resumoDoDia } from '@/db/dieta';
import { escala } from '@/components/Grafico';
import { diaSemanaCurta, diaSemanaSigla, num, somarDias } from '@/lib/formato';
import { font, space } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

const PERIODOS: Record<string, number> = { '7 dias': 7, '30 dias': 30, '90 dias': 90 };

/** Histórico da dieta: média, dias na meta (±7%) e balanço de cada dia (RF21, RN10). */
export default function HistoricoDieta() {
  const { colors } = useTheme();
  const [periodo, setPeriodo] = useState('7 dias');
  const hoje = hojeIso();
  const d = useConsulta(() => {
    const desde = somarDias(hoje, -(PERIODOS[periodo] - 1));
    return diasComRegistro(desde, hoje).map((dia) => resumoDoDia(dia));
  }, [periodo, hoje]);

  const media = d.length ? d.reduce((t, x) => t + x.kcal, 0) / d.length : 0;
  const comMeta = d.filter((x) => x.meta);
  const naMeta = comMeta.filter((x) => Math.abs(x.kcal - x.meta!) <= x.meta! * 0.07).length;
  const grafico = [...d].slice(0, 14).reverse();
  const meta = d[0]?.meta ?? null;
  const e = grafico.length ? escala([...grafico.map((x) => x.kcal), ...(meta ? [meta * 0.93, meta * 1.07] : [])], 100) : null;

  return (
    <Screen header={<TopBar title="Histórico" subtitle="Dieta" />}>
      <SegmentedControl options={Object.keys(PERIODOS)} selected={periodo} onChange={setPeriodo} />
      <Card gap={space.md}>
        <AppText variant="caption" color="textMuted" style={{ fontFamily: font.medium }}>
          Média por dia registrado
        </AppText>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
          <AppText style={{ fontFamily: font.bold, fontSize: 30 }}>{num(Math.round(media), 0)}</AppText>
          <AppText color="textMuted">kcal</AppText>
        </View>
        <AppText variant="bodySmall" color="textMuted">
          {comMeta.length ? `${naMeta} de ${comMeta.length} dias dentro da meta (±7%)` : `${d.length} dia${d.length === 1 ? '' : 's'} com registro`}
        </AppText>
        {e && grafico.length > 1 ? (
          <>
            <BarChart
              data={grafico.map((x) => x.kcal)}
              labels={grafico.map((x) => diaSemanaSigla(x.data).charAt(0))}
              min={Math.max(0, e.min)}
              max={e.max}
              bandFrom={meta ? meta * 0.93 : 0}
              bandTo={meta ? meta * 1.07 : 0}
            />
            {meta ? (
              <View style={{ flexDirection: 'row', gap: 14, flexWrap: 'wrap' }}>
                {[
                  [colors.statusNear, 'Na meta'],
                  [colors.statusMid, 'Fora da margem'],
                  [colors.track, `Faixa ${num(Math.round(meta * 0.93), 0)}–${num(Math.round(meta * 1.07), 0)}`],
                ].map(([c, l]) => (
                  <View key={l} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: c }} />
                    <AppText variant="label" color="textMuted" style={{ fontFamily: font.medium }}>
                      {l}
                    </AppText>
                  </View>
                ))}
              </View>
            ) : null}
          </>
        ) : null}
      </Card>
      {d.length ? (
        <Card gap={0} style={{ paddingVertical: space.xs }}>
          {d.map((x, i) => {
            const ok = x.meta ? Math.abs(x.kcal - x.meta) <= x.meta * 0.07 : null;
            return (
              <View key={x.data}>
                {i > 0 ? <Divider /> : null}
                <ListRow
                  title={diaSemanaCurta(x.data)}
                  subtitle={`${num(x.kcal, 0)} consumidas · ${num(x.atividades, 0)} em atividades`}
                  trailing={
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <AppText variant="button">
                        {x.balanco > 0 ? '+' : x.balanco < 0 ? '−' : ''}
                        {num(Math.abs(x.balanco), 0)} kcal
                      </AppText>
                      {ok != null ? <Tag label={ok ? 'Na meta' : x.kcal > x.meta! ? 'Acima' : 'Abaixo'} tone={ok ? 'near' : 'mid'} /> : null}
                    </View>
                  }
                />
              </View>
            );
          })}
        </Card>
      ) : (
        <Card>
          <AppText color="textMuted">Nenhuma refeição registrada neste período.</AppText>
        </Card>
      )}
    </Screen>
  );
}
