import { router, useLocalSearchParams } from 'expo-router';
import { Trophy } from 'lucide-react-native';
import { View } from 'react-native';

import { AppText, BottomActionBar, Card, IconTile, ProgressBar, Row, Screen, Tag, TopBar } from '@/components/ui';
import { db, hojeIso, useConsulta } from '@/db/conexao';
import { meta, progresso } from '@/db/metas';
import { dataCurta, diasEntre, num } from '@/lib/formato';
import { font, space } from '@/theme/tokens';

/** Meta atingida (comemoração). */
export default function MetaAtingida() {
  const { id = '' } = useLocalSearchParams<{ id?: string }>();
  const d = useConsulta(() => {
    const m = meta(id);
    if (!m) return null;
    const fim = m.atingida_em ?? hojeIso();
    const treinos =
      db().get<{ n: number }>("SELECT COUNT(*) AS n FROM sessao_treino WHERE excluido_em IS NULL AND status IN ('concluida','parcial') AND substr(inicio,1,10) BETWEEN ? AND ?", [m.data_inicio, fim])?.n ?? 0;
    return { m, p: progresso(m), fim, treinos };
  }, [id]);

  if (!d) return null;
  const { m, p } = d;
  const semanas = Math.max(1, Math.round(diasEntre(m.data_inicio, d.fim) / 7));
  const antes = m.prazo ? diasEntre(d.fim, m.prazo) : null;
  const caixas: [string, string][] =
    m.tipo === 'peso'
      ? [
          [`${num(m.peso_inicial_kg ?? 0)} → ${num(m.peso_alvo_kg ?? 0)}`, 'kg'],
          [String(semanas), semanas === 1 ? 'semana' : 'semanas'],
          [String(d.treinos), d.treinos === 1 ? 'treino' : 'treinos'],
        ]
      : m.tipo === 'dieta'
        ? [
            [String(m.dias_dieta_alvo), 'dias seguidos'],
            [String(semanas), semanas === 1 ? 'semana' : 'semanas'],
            [String(d.treinos), d.treinos === 1 ? 'treino' : 'treinos'],
          ]
        : [
            [num(m.carga_alvo_kg ?? 0), 'kg'],
            [String(semanas), semanas === 1 ? 'semana' : 'semanas'],
            [String(d.treinos), d.treinos === 1 ? 'treino' : 'treinos'],
          ];

  return (
    <Screen
      header={<TopBar title="" leading="close" onLeadingPress={() => router.dismissTo('/metas')} />}
      footer={<BottomActionBar secondary={{ label: 'Ver metas', onPress: () => router.dismissTo('/metas') }} primary={{ label: 'Criar nova meta', onPress: () => router.replace('/metas/nova') }} />}>
      <View style={{ alignItems: 'center', gap: space.md, paddingVertical: space.xxl }}>
        <IconTile icon={Trophy} size={52} />
        <AppText style={{ fontFamily: font.bold, fontSize: 26 }}>Meta atingida!</AppText>
        <AppText variant="itemTitle" style={{ fontSize: 17, textAlign: 'center' }} color="accent">
          {p.titulo}
        </AppText>
        <AppText variant="bodySmall" color="textMuted">
          Conquistada em {dataCurta(d.fim)}
          {antes != null && antes > 0 ? `, ${antes >= 14 ? `${Math.round(antes / 7)} semanas` : `${antes} dia${antes === 1 ? '' : 's'}`} antes do prazo` : ''}
        </AppText>
      </View>
      <Row>
        {caixas.map(([v, l]) => (
          <Card key={l} gap={2} padding={14} style={{ flex: 1, alignItems: 'center' }}>
            <AppText style={{ fontFamily: font.bold, fontSize: 20 }}>{v}</AppText>
            <AppText variant="caption" color="textMuted" style={{ fontFamily: font.medium }}>
              {l}
            </AppText>
          </Card>
        ))}
      </Row>
      <Card gap={space.md}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <AppText style={{ fontFamily: font.semibold, fontSize: 17 }}>{p.valor ?? p.titulo}</AppText>
          <Tag label="Concluída" tone="training" />
        </View>
        <ProgressBar value={1} max={1} />
      </Card>
      <AppText variant="bodySmall" color="textMuted">
        A meta foi movida para Concluídas. Que tal definir o próximo objetivo?
      </AppText>
    </Screen>
  );
}
