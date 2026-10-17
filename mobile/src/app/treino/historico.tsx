import { useState } from 'react';
import { View } from 'react-native';

import { LinhaHistorico } from '@/components/Historico';
import { AppText, Card, ListCard, Row, Screen, SegmentedControl, Tag, TopBar } from '@/components/ui';
import { hojeIso, useConsulta } from '@/db/conexao';
import { usuario } from '@/db/perfil';
import { historico, type ItemHistorico } from '@/db/treino';
import { duracao, inicioDaSemana, nomeMes, somarDias } from '@/lib/formato';
import { font, radius, space } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

/** Histórico de treinos e aeróbicos (RF10, RF27). Com o ciclo ativo, mostra a fase de cada sessão (RF54). */
export default function HistoricoTreinos() {
  const { colors } = useTheme();
  const [periodo, setPeriodo] = useState('Mês');
  const hoje = hojeIso();
  const desde = periodo === 'Semana' ? inicioDaSemana(hoje) : periodo === 'Mês' ? somarDias(hoje, -30) : undefined;
  const d = useConsulta(() => ({ itens: historico(desde), ciclo: !!usuario()?.ciclo_ativo }), [desde]);
  const treinos = d.itens.filter((i) => i.tipo === 'treino').length;
  const aerobicos = d.itens.filter((i) => i.tipo === 'aerobico').length;
  const minutos = d.itens.reduce((t, i) => t + i.minutos, 0);

  // Agrupa por mês.
  const grupos: [string, ItemHistorico[]][] = [];
  for (const i of d.itens) {
    const chave = `${nomeMes(i.inicio.slice(0, 10))}${i.inicio.slice(0, 4) === hoje.slice(0, 4) ? '' : ` de ${i.inicio.slice(0, 4)}`}`;
    const g = grupos.find(([k]) => k === chave);
    if (g) g[1].push(i);
    else grupos.push([chave, [i]]);
  }

  return (
    <Screen header={<TopBar title="Histórico" />}>
      <SegmentedControl options={['Semana', 'Mês', 'Tudo']} selected={periodo} onChange={setPeriodo} />
      <Row>
        {[
          [String(treinos), treinos === 1 ? 'treino' : 'treinos'],
          [String(aerobicos), aerobicos === 1 ? 'aeróbico' : 'aeróbicos'],
          [duracao(minutos), 'de atividade'],
        ].map(([v, l]) => (
          <View key={l} style={{ flex: 1, alignItems: 'center', gap: 2, paddingVertical: space.md, borderRadius: radius.button - 2, backgroundColor: colors.track }}>
            <AppText style={{ fontFamily: font.bold, fontSize: 15 }}>{v}</AppText>
            <AppText variant="label" color="textMuted" style={{ fontFamily: font.medium }}>
              {l}
            </AppText>
          </View>
        ))}
      </Row>
      {d.ciclo ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <AppText variant="caption" color="textMuted" style={{ fontFamily: font.medium }}>
            Fases do ciclo:
          </AppText>
          <Tag label="Menstrual" tone="diet" />
          <Tag label="Folicular" tone="training" />
          <Tag label="Lútea" />
        </View>
      ) : null}
      {grupos.length ? (
        grupos.map(([mes, itens]) => (
          <View key={mes} style={{ gap: 10 }}>
            <AppText variant="itemTitle">{mes}</AppText>
            <ListCard>
              {itens.map((s) => (
                <LinhaHistorico key={s.id} s={s} ciclo={d.ciclo} />
              ))}
            </ListCard>
          </View>
        ))
      ) : (
        <Card>
          <AppText color="textMuted">Nenhum treino ou aeróbico registrado neste período.</AppText>
        </Card>
      )}
    </Screen>
  );
}
