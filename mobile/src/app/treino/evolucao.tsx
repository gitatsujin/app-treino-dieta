import { router, useLocalSearchParams } from 'expo-router';
import { Target } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { GraficoLinha } from '@/components/Grafico';
import { AppText, Card, Divider, IconTile, ProgressBar, Screen, SegmentedControl, TopBar } from '@/components/ui';
import { hojeIso, useConsulta } from '@/db/conexao';
import { metas, progresso } from '@/db/metas';
import { evolucao, exercicio, GRUPOS, melhorDeTodos, textoSerie } from '@/db/treino';
import { dataCurta, num, somarDias } from '@/lib/formato';
import { font, space } from '@/theme/tokens';

const PERIODOS: Record<string, number> = { '1M': 30, '3M': 90, '6M': 182, '1A': 365 };

/** Evolução do exercício: melhor série, 1RM estimado, gráfico e registros. */
export default function EvolucaoExercicio() {
  const { id = '' } = useLocalSearchParams<{ id?: string }>();
  const [periodo, setPeriodo] = useState('3M');
  const desde = somarDias(hojeIso(), -PERIODOS[periodo]);
  const d = useConsulta(() => {
    const meta = metas('ativa').find((m) => m.tipo === 'carga' && m.exercicio_id === id);
    return { ex: exercicio(id), pts: evolucao(id, desde), geral: melhorDeTodos(id), meta: meta ? { m: meta, p: progresso(meta) } : null };
  }, [id, desde]);

  return (
    <Screen header={<TopBar title={d.ex?.nome ?? 'Exercício'} subtitle={d.ex ? GRUPOS[d.ex.grupo_muscular] : undefined} />}>
      <Card>
        <View style={{ flexDirection: 'row' }}>
          {[
            ['Melhor série', d.geral.melhor ? textoSerie(d.geral.melhor) : '—'],
            ['1RM estimado', d.geral.umRm ? `${num(Math.round(d.geral.umRm))} kg` : '—'],
          ].map(([l, v]) => (
            <View key={l} style={{ flex: 1, gap: 2 }}>
              <AppText variant="caption" color="textMuted">
                {l}
              </AppText>
              <AppText style={{ fontFamily: font.bold, fontSize: 20 }}>{v}</AppText>
            </View>
          ))}
        </View>
        <SegmentedControl options={Object.keys(PERIODOS)} selected={periodo} onChange={setPeriodo} />
        <AppText variant="caption" color="textMuted" style={{ fontFamily: font.medium }}>
          Maior carga por treino (kg)
        </AppText>
        {d.pts.length >= 2 ? (
          <GraficoLinha valores={d.pts.map((p) => p.melhor.carga_kg)} datas={d.pts.map((p) => p.data)} />
        ) : (
          <AppText variant="bodySmall" color="textMuted">
            {d.pts.length ? 'Registre mais um treino com este exercício para ver o gráfico.' : 'Nenhum registro neste período.'}
          </AppText>
        )}
      </Card>
      {d.pts.length ? (
        <Card gap={0} style={{ paddingVertical: space.xs }}>
          {[...d.pts]
            .reverse()
            .slice(0, 10)
            .map((p, i) => (
              <View key={`${p.data}-${i}`}>
                {i > 0 ? <Divider /> : null}
                <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: space.md, gap: space.lg }}>
                  <AppText color="textMuted" style={{ width: 48 }}>
                    {dataCurta(p.data)}
                  </AppText>
                  <AppText variant="itemTitle" style={{ flex: 1 }}>
                    {textoSerie(p.melhor)}
                  </AppText>
                  <AppText variant="caption" color="textMuted">
                    {num(Math.round(p.volume), 0)} kg
                  </AppText>
                </View>
              </View>
            ))}
        </Card>
      ) : null}
      {d.meta ? (
        <Card gap={space.sm} onPress={() => router.push({ pathname: '/metas/detalhe', params: { id: d.meta?.m.id ?? '' } })}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <AppText variant="itemTitle">{d.meta.p.titulo}</AppText>
            <AppText variant="button">{Math.round(d.meta.p.p * 100)}%</AppText>
          </View>
          <ProgressBar value={d.meta.p.p} max={1} />
        </Card>
      ) : (
        <Card onPress={() => router.push({ pathname: '/metas/nova', params: { tipo: 'carga', exercicio: id } })}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.lg }}>
            <IconTile icon={Target} size={36} />
            <AppText style={{ fontFamily: font.medium, flex: 1 }}>Sem meta para este exercício</AppText>
            <AppText variant="button" color="accent">
              Criar meta
            </AppText>
          </View>
        </Card>
      )}
    </Screen>
  );
}
