import { router } from 'expo-router';
import { View } from 'react-native';

import { ListaConsumos } from '@/components/Consumos';
import { AppText, BottomActionBar, Card, CheckCircle, Divider, ListRow, ProgressBar, Screen, Tag, TopBar } from '@/components/ui';
import { hojeIso, useConsulta } from '@/db/conexao';
import { avulsosDoDia, dietaAtiva, marcarRefeicao, refeicoesDoDia, resumoDoDia } from '@/db/dieta';
import { diaSemanaCurta, kcal, num } from '@/lib/formato';
import { font, space, statusColor } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

/** Dieta de hoje: aberta pelo "Ver dieta" da Início, por cima, com X (regra 10). */
export default function DietaDeHoje() {
  const { colors } = useTheme();
  const hoje = hojeIso();
  const d = useConsulta(() => {
    const dieta = dietaAtiva();
    return { dieta, r: resumoDoDia(hoje), refeicoes: refeicoesDoDia(hoje, dieta), avulsos: avulsosDoDia(hoje, dieta) };
  });
  const { r } = d;
  const p = r.meta ? r.kcal / r.meta : 0;
  const proxima = d.refeicoes.find((x) => x.status === 'proxima' || x.status === 'parcial');

  return (
    <Screen
      header={<TopBar title="Dieta de hoje" subtitle={diaSemanaCurta(hoje)} leading="close" />}
      footer={
        <BottomActionBar
          secondary={proxima ? { label: 'Adicionar', onPress: () => router.push('/dieta/adicionar') } : undefined}
          primary={proxima ? { label: `Marcar ${proxima.nome.toLowerCase()}`, onPress: () => marcarRefeicao(proxima.id, hoje) } : { label: 'Adicionar alimento', onPress: () => router.push('/dieta/adicionar') }}
        />
      }>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
            <AppText style={{ fontFamily: font.bold, fontSize: 28 }}>{num(r.kcal, 0)}</AppText>
            <AppText color="textMuted">{r.meta ? `/ ${num(r.meta, 0)} kcal` : 'kcal'}</AppText>
          </View>
          {r.meta ? <AppText style={{ fontFamily: font.bold, fontSize: 15, color: statusColor(Math.min(p, 1), colors) }}>{Math.round(p * 100)}%</AppText> : null}
        </View>
        {r.meta ? <ProgressBar value={r.kcal} max={r.meta} /> : null}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          {[
            ['Proteína', 'proteina'],
            ['Carbo', 'carboidrato'],
            ['Gordura', 'gordura'],
          ].map(([l, k]) => (
            <View key={l} style={{ gap: 2 }}>
              <AppText variant="button">
                {Math.round(r.consumido[k] ?? 0)}
                {r.metasMacros ? ` / ${Math.round(r.metasMacros[k] ?? 0)}` : ''} g
              </AppText>
              <AppText variant="caption" color="textMuted">
                {l}
              </AppText>
            </View>
          ))}
        </View>
      </Card>
      {d.dieta ? (
        <>
          <AppText variant="itemTitle">
            {d.dieta.nome} · {d.refeicoes.length} refeiç{d.refeicoes.length === 1 ? 'ão' : 'ões'}
          </AppText>
          <Card gap={0} style={{ paddingVertical: space.xs }}>
            {d.refeicoes.map((ref, i) => (
              <View key={ref.id}>
                {i > 0 ? <Divider /> : null}
                <ListRow
                  leading={<CheckCircle done={ref.status === 'consumida'} highlight={ref.status === 'proxima'} />}
                  title={ref.nome}
                  subtitle={[ref.horario, ref.itens.map((x) => x.nome).join(' · ')].filter(Boolean).join(' · ')}
                  trailing={
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <AppText variant="button" style={{ fontSize: 13 }} color={ref.status === 'consumida' ? 'textMuted' : 'text'}>
                        {kcal(ref.valores.energia ?? 0)}
                      </AppText>
                      {ref.status === 'proxima' ? <Tag label="Próxima" tone="diet" /> : ref.status === 'parcial' ? <Tag label="Parcial" tone="mid" /> : null}
                    </View>
                  }
                  onPress={() => router.push({ pathname: '/dieta/refeicao', params: { id: ref.id } })}
                />
              </View>
            ))}
          </Card>
        </>
      ) : null}
      {d.avulsos.length ? (
        <>
          <AppText variant="itemTitle">{d.dieta ? 'Fora da dieta' : 'Registros de hoje'}</AppText>
          <ListaConsumos itens={d.avulsos} />
        </>
      ) : !d.dieta ? (
        <Card>
          <AppText color="textMuted">Nada registrado hoje.</AppText>
        </Card>
      ) : null}
    </Screen>
  );
}
