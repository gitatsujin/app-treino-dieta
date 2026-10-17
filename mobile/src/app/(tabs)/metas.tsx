import { router } from 'expo-router';
import { CalendarDays, Plus, Scale, Target, Trophy, Utensils } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Halter } from '@/components/icons/Halter';
import { AppText, Button, Card, ChipGroup, IconTile, ListCard, ListRow, ProgressBar, Screen, ScreenHeader, SectionHeader, Tag } from '@/components/ui';
import { hojeIso, useConsulta } from '@/db/conexao';
import { metas, progresso, ROTULO_TIPO, type TipoMeta } from '@/db/metas';
import { dataCurta } from '@/lib/formato';
import { font, space, statusColor } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

const FILTRO: Record<string, TipoMeta[]> = {
  Todas: ['carga', 'frequencia', 'peso', 'dieta'],
  Treino: ['carga', 'frequencia'],
  Peso: ['peso'],
  Dieta: ['dieta'],
};
const ICONE = { carga: Halter, frequencia: CalendarDays, peso: Scale, dieta: Utensils };

/** Aba Metas (RF12, RF13, RF28–RF33). Barra e percentual pela cor de status (RNF11). */
export default function MetasScreen() {
  const { colors } = useTheme();
  const [filtro, setFiltro] = useState('Todas');
  const hoje = hojeIso();
  const d = useConsulta(() => ({ ativas: metas('ativa').map((m) => ({ m, p: progresso(m, hoje) })), concluidas: metas('atingida') }));
  const ativas = d.ativas.filter(({ m }) => FILTRO[filtro].includes(m.tipo));
  const concluidas = d.concluidas.filter((m) => FILTRO[filtro].includes(m.tipo));

  return (
    <Screen
      header={
        <ScreenHeader
          title="Metas"
          subtitle={`${d.ativas.length} ativa${d.ativas.length === 1 ? '' : 's'} · ${d.concluidas.length} concluída${d.concluidas.length === 1 ? '' : 's'}`}
          action={{ icon: Plus, label: 'Nova meta', onPress: () => router.push('/metas/nova') }}
        />
      }>
      <ChipGroup options={Object.keys(FILTRO)} selected={filtro} onChange={setFiltro} />

      {!d.ativas.length ? (
        <Card style={{ alignItems: 'center' }}>
          <IconTile icon={Target} size={52} />
          <AppText style={{ fontFamily: font.semibold, fontSize: 18 }}>Nenhuma meta ativa</AppText>
          <AppText color="textMuted" style={{ textAlign: 'center' }}>
            Defina uma carga para bater, quantos treinos por semana, um peso ou dias seguidos na dieta.
          </AppText>
          <Button label="Criar meta" style={{ alignSelf: 'stretch' }} onPress={() => router.push('/metas/nova')} />
        </Card>
      ) : null}

      {ativas.map(({ m, p }) => (
        <Card key={m.id} gap={space.md} onPress={() => router.push({ pathname: '/metas/detalhe', params: { id: m.id } })}>
          <View style={styles.item}>
            <IconTile icon={ICONE[m.tipo]} tone={m.tipo === 'dieta' ? 'diet' : 'training'} size={36} />
            <View style={{ flex: 1, gap: 2 }}>
              <AppText variant="caption" color="textMuted" style={{ fontFamily: font.medium }}>
                {ROTULO_TIPO[m.tipo]}
              </AppText>
              <AppText variant="itemTitle" style={{ fontSize: 16 }}>
                {p.titulo}
              </AppText>
            </View>
            {m.tipo !== 'frequencia' ? <AppText style={{ fontFamily: font.bold, fontSize: 16, color: statusColor(p.p, colors) }}>{Math.round(p.p * 100)}%</AppText> : null}
          </View>
          {m.tipo === 'frequencia' ? (
            <>
              {p.treinos ? <Linha rotulo="Treinos" valor={`${p.treinos.feito} de ${p.treinos.alvo}`} p={Math.min(1, p.treinos.feito / p.treinos.alvo)} /> : null}
              {p.aerobicos ? <Linha rotulo="Aeróbicos" valor={`${p.aerobicos.feito} de ${p.aerobicos.alvo}`} p={Math.min(1, p.aerobicos.feito / p.aerobicos.alvo)} /> : null}
            </>
          ) : (
            <ProgressBar value={p.p} max={1} />
          )}
          <View style={styles.between}>
            <AppText variant="bodySmall" color="textMuted">
              {p.esquerda}
            </AppText>
            <AppText variant="caption" color="textMuted">
              {p.direita}
            </AppText>
          </View>
          <AppText variant="bodySmall">{p.frase}</AppText>
        </Card>
      ))}

      {concluidas.length ? (
        <>
          <SectionHeader title="Concluídas" actionLabel="Ver todas" onAction={() => router.push('/metas/concluidas')} />
          <ListCard>
            {concluidas.slice(0, 3).map((m) => (
              <ListRow
                key={m.id}
                leading={<IconTile icon={Trophy} tone={m.tipo === 'dieta' ? 'diet' : 'training'} size={36} />}
                title={progresso(m).titulo}
                subtitle={m.atingida_em ? `Atingida em ${dataCurta(m.atingida_em)}` : 'Atingida'}
                trailing={<Tag label="Concluída" tone="training" />}
                onPress={() => router.push({ pathname: '/metas/atingida', params: { id: m.id } })}
              />
            ))}
          </ListCard>
        </>
      ) : null}
    </Screen>
  );
}

function Linha({ rotulo, valor, p }: { rotulo: string; valor: string; p: number }) {
  return (
    <View style={{ gap: 6 }}>
      <View style={styles.between}>
        <AppText variant="bodySmall" style={{ fontFamily: font.medium }}>
          {rotulo}
        </AppText>
        <AppText variant="button" color="textMuted" style={{ fontSize: 13 }}>
          {valor}
        </AppText>
      </View>
      <ProgressBar value={p} max={1} />
    </View>
  );
}

const styles = StyleSheet.create({
  item: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
});
