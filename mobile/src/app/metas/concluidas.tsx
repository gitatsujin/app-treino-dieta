import { router } from 'expo-router';
import { Trophy } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { AppText, Card, ChipGroup, IconTile, ListCard, ListRow, Screen, Tag, TopBar } from '@/components/ui';
import { useConsulta } from '@/db/conexao';
import { metas, progresso, ROTULO_TIPO, type MetaReg } from '@/db/metas';
import { dataCurta, diasEntre, nomeMes } from '@/lib/formato';

const FILTRO: Record<string, MetaReg['tipo'][]> = { Todas: ['carga', 'frequencia', 'peso', 'dieta'], Treino: ['carga', 'frequencia'], Peso: ['peso'], Dieta: ['dieta'] };

/** Metas concluídas, agrupadas por mês. */
export default function MetasConcluidas() {
  const [filtro, setFiltro] = useState('Todas');
  const lista = useConsulta(() => metas('atingida').map((m) => ({ m, titulo: progresso(m).titulo })));
  const vis = lista.filter(({ m }) => FILTRO[filtro].includes(m.tipo));
  const grupos: [string, typeof vis][] = [];
  for (const x of vis) {
    const chave = x.m.atingida_em ? `${nomeMes(x.m.atingida_em)} de ${x.m.atingida_em.slice(0, 4)}` : 'Sem data';
    const g = grupos.find(([k]) => k === chave);
    if (g) g[1].push(x);
    else grupos.push([chave, [x]]);
  }
  return (
    <Screen header={<TopBar title="Concluídas" subtitle={`${lista.length} meta${lista.length === 1 ? '' : 's'}`} />}>
      <ChipGroup options={Object.keys(FILTRO)} selected={filtro} onChange={setFiltro} />
      {grupos.length ? (
        grupos.map(([mes, itens]) => (
          <View key={mes} style={{ gap: 10 }}>
            <AppText variant="itemTitle">{mes}</AppText>
            <ListCard>
              {itens.map(({ m, titulo }) => {
                const sem = m.atingida_em ? Math.max(1, Math.round(diasEntre(m.data_inicio, m.atingida_em) / 7)) : null;
                return (
                  <ListRow
                    key={m.id}
                    leading={<IconTile icon={Trophy} tone={m.tipo === 'dieta' ? 'diet' : 'training'} size={36} />}
                    title={titulo}
                    subtitle={[ROTULO_TIPO[m.tipo], m.atingida_em ? `atingida em ${dataCurta(m.atingida_em)}` : '', sem ? `em ${sem} semana${sem === 1 ? '' : 's'}` : ''].filter(Boolean).join(' · ')}
                    trailing={<Tag label="Concluída" tone="near" />}
                    onPress={() => router.push({ pathname: '/metas/detalhe', params: { id: m.id } })}
                  />
                );
              })}
            </ListCard>
          </View>
        ))
      ) : (
        <Card>
          <AppText color="textMuted">Nenhuma meta concluída ainda.</AppText>
        </Card>
      )}
    </Screen>
  );
}
