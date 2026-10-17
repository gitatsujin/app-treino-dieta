import { router, useLocalSearchParams } from 'expo-router';
import { CalendarDays, Flame, Scale, Trash2, Utensils } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { Halter } from '@/components/icons/Halter';
import { GraficoLinha } from '@/components/Grafico';
import { Semana } from '@/components/Semana';
import { AppText, Button, Card, ConfirmDialog, Divider, IconTile, ListRow, ProgressBar, Screen, Tag, TopBar } from '@/components/ui';
import { hojeIso, useConsulta } from '@/db/conexao';
import { diasDaDieta } from '@/db/dieta';
import { excluirMeta, meta, progresso, ROTULO_TIPO, semanasAnteriores, type MetaReg } from '@/db/metas';
import { pesos } from '@/db/perfil';
import { evolucao, textoSerie } from '@/db/treino';
import { dataCurta, num, paraData, somarDias } from '@/lib/formato';
import { font, space, statusColor } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

const ICONE = { carga: Halter, frequencia: CalendarDays, peso: Scale, dieta: Utensils };
const AVISO: Record<MetaReg['tipo'], string> = {
  carga: 'Excluir a meta não apaga os treinos registrados.',
  frequencia: 'Excluir a meta não apaga os treinos e aeróbicos registrados.',
  peso: 'Excluir a meta não apaga as pesagens registradas.',
  dieta: 'Excluir a meta não apaga o que você registrou na dieta.',
};

/** Detalhe da meta, um layout por tipo (carga, frequência, peso corporal, dieta). Excluir pede confirmação (regra 8). */
export default function DetalheDaMeta() {
  const { colors } = useTheme();
  const { id = '' } = useLocalSearchParams<{ id?: string }>();
  const [confirmar, setConfirmar] = useState(false);
  const hoje = hojeIso();
  const m = useConsulta(() => meta(id), [id]);
  const p = useConsulta(() => (m ? progresso(m, hoje) : null), [m]);

  if (!m || !p) {
    return (
      <Screen header={<TopBar title="Meta" />}>
        <Card>
          <AppText color="textMuted">Esta meta não existe mais.</AppText>
        </Card>
      </Screen>
    );
  }

  const sub =
    m.tipo === 'frequencia' ? `Meta de frequência · desde ${dataCurta(m.data_inicio)}` : m.tipo === 'dieta' ? 'Meta de dieta · margem de ±7%' : `Meta de ${ROTULO_TIPO[m.tipo].toLowerCase()} · criada em ${dataCurta(m.data_inicio)}`;

  return (
    <>
      <Screen header={<TopBar title="Meta" actionLabel={m.status === 'ativa' ? 'Editar' : undefined} onAction={() => router.push({ pathname: '/metas/nova', params: { id: m.id } })} />}>
        <Card gap={space.md}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.lg }}>
            <IconTile icon={ICONE[m.tipo]} tone={m.tipo === 'dieta' ? 'diet' : 'training'} />
            <View style={{ flex: 1, gap: 2 }}>
              <AppText style={{ fontFamily: font.semibold, fontSize: 17 }}>{p.titulo}</AppText>
              <AppText variant="caption" color="textMuted">
                {sub}
              </AppText>
            </View>
            {m.status === 'atingida' ? <Tag label="Concluída" tone="near" /> : null}
          </View>
          {p.valor ? (
            <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                <AppText style={{ fontFamily: font.bold, fontSize: 28 }}>{p.valor}</AppText>
                <AppText color="textMuted">{p.de}</AppText>
              </View>
              <AppText style={{ fontFamily: font.bold, fontSize: 17, color: statusColor(p.p, colors) }}>{Math.round(p.p * 100)}%</AppText>
            </View>
          ) : null}
          {m.tipo !== 'frequencia' ? <ProgressBar value={p.p} max={1} /> : null}
          <AppText variant="bodySmall" color="textMuted">
            {p.frase}
            {m.prazo ? ` Prazo: ${dataCurta(m.prazo)}.` : ''}
          </AppText>
        </Card>
        {m.tipo === 'carga' ? <Carga m={m} /> : m.tipo === 'frequencia' ? <Frequencia m={m} p={p} /> : m.tipo === 'peso' ? <Peso m={m} /> : <Dieta m={m} />}
        <Card gap={space.md}>
          <AppText variant="bodySmall" color="textMuted">
            {AVISO[m.tipo]}
          </AppText>
          <Button variant="danger" icon={Trash2} label="Excluir meta" onPress={() => setConfirmar(true)} />
        </Card>
      </Screen>
      <ConfirmDialog
        visible={confirmar}
        icon={Trash2}
        title="Excluir esta meta?"
        message={`"${p.titulo}" sai da sua lista. ${AVISO[m.tipo]} Essa ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        onCancel={() => setConfirmar(false)}
        onConfirm={() => {
          setConfirmar(false);
          excluirMeta(m.id);
          router.dismissTo('/metas');
        }}
      />
    </>
  );
}

function Carga({ m }: { m: MetaReg }) {
  const pts = useConsulta(() => evolucao(m.exercicio_id!, somarDias(m.data_inicio, -90)), [m.exercicio_id, m.data_inicio]);
  const melhores = [...pts].sort((a, b) => b.melhor.carga_kg - a.melhor.carga_kg || b.melhor.repeticoes - a.melhor.repeticoes).slice(0, 3);
  return (
    <>
      {pts.length >= 2 ? (
        <Card gap={space.sm}>
          <AppText variant="itemTitle">Melhor carga por treino</AppText>
          <GraficoLinha valores={pts.map((x) => x.melhor.carga_kg)} datas={pts.map((x) => x.data)} alvo={m.carga_alvo_kg ?? undefined} formato={(v) => `${v} kg`} />
        </Card>
      ) : null}
      {melhores.length ? (
        <Card gap={0}>
          <AppText variant="itemTitle" style={{ paddingBottom: space.xs }}>
            Melhores séries
          </AppText>
          {melhores.map((x, i) => (
            <View key={`${x.data}-${i}`}>
              <Divider />
              <ListRow title={dataCurta(x.data)} trailing={<AppText variant="button">{textoSerie(x.melhor)}</AppText>} onPress={() => router.push({ pathname: '/treino/evolucao', params: { id: m.exercicio_id! } })} />
            </View>
          ))}
        </Card>
      ) : null}
    </>
  );
}

function Linha({ rotulo, valor, p }: { rotulo: string; valor: string; p: number }) {
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <AppText style={{ fontFamily: font.medium }}>{rotulo}</AppText>
        <AppText variant="button" color="textMuted">
          {valor}
        </AppText>
      </View>
      <ProgressBar value={p} max={1} />
    </View>
  );
}

function Frequencia({ m, p }: { m: MetaReg; p: ReturnType<typeof progresso> }) {
  const anteriores = useConsulta(() => semanasAnteriores(m), [m.id]);
  const batidas = anteriores.filter((s) => s.batida).length;
  const rotulo = (a: string, b: string) => `${dataCurta(a)} a ${dataCurta(b)}`;
  return (
    <>
      <Card gap={space.md}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <AppText variant="itemTitle">Esta semana</AppText>
          <AppText variant="caption" color="textMuted">
            {p.esquerda.replace('Semana de ', '')}
          </AppText>
        </View>
        {p.treinos ? <Linha rotulo="Treinos" valor={`${p.treinos.feito} de ${p.treinos.alvo}`} p={Math.min(1, p.treinos.feito / p.treinos.alvo)} /> : null}
        {p.aerobicos ? <Linha rotulo="Aeróbicos" valor={`${p.aerobicos.feito} de ${p.aerobicos.alvo}`} p={Math.min(1, p.aerobicos.feito / p.aerobicos.alvo)} /> : null}
        <Semana dieta={false} />
      </Card>
      {anteriores.length ? (
        <Card gap={0}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: space.xs }}>
            <AppText variant="itemTitle">Semanas anteriores</AppText>
            <Tag label={`${batidas} de ${anteriores.length} batidas`} tone="training" />
          </View>
          {anteriores.map((s) => (
            <View key={s.inicio}>
              <Divider />
              <ListRow
                title={rotulo(s.inicio, s.fim)}
                subtitle={`${s.treinos} treino${s.treinos === 1 ? '' : 's'} · ${s.aerobicos} aeróbico${s.aerobicos === 1 ? '' : 's'}`}
                trailing={<Tag label={s.batida ? 'Batida' : 'Não batida'} tone={s.batida ? 'near' : 'mid'} />}
                onPress={() => router.push('/treino/historico')}
              />
            </View>
          ))}
        </Card>
      ) : null}
    </>
  );
}

function Peso({ m }: { m: MetaReg }) {
  const lista = useConsulta(() => pesos().filter((x) => x.data >= somarDias(m.data_inicio, -30)), [m.data_inicio]);
  const crono = [...lista].reverse();
  return (
    <>
      {crono.length >= 2 ? (
        <Card gap={space.sm}>
          <AppText variant="itemTitle">Peso desde o início da meta</AppText>
          <GraficoLinha valores={crono.map((x) => x.peso_kg)} datas={crono.map((x) => x.data)} alvo={m.peso_alvo_kg ?? undefined} formato={(v) => `${v} kg`} />
        </Card>
      ) : null}
      {lista.length ? (
        <Card gap={0}>
          <AppText variant="itemTitle" style={{ paddingBottom: space.xs }}>
            Últimas pesagens
          </AppText>
          {lista.slice(0, 5).map((x, i) => {
            const ant = lista[i + 1];
            const d = ant ? x.peso_kg - ant.peso_kg : null;
            return (
              <View key={x.id}>
                <Divider />
                <ListRow
                  title={`${num(x.peso_kg)} kg`}
                  subtitle={dataCurta(x.data)}
                  trailing={
                    <AppText variant="caption" color="textMuted" style={{ fontFamily: font.medium }}>
                      {d == null ? '' : `${d > 0 ? '+' : d < 0 ? '−' : ''}${num(Math.abs(d))} kg`}
                    </AppText>
                  }
                />
              </View>
            );
          })}
        </Card>
      ) : null}
      <Button variant="secondary" label="Registrar peso" onPress={() => router.push('/perfil/peso')} />
    </>
  );
}

function Dieta({ m }: { m: MetaReg }) {
  const { colors } = useTheme();
  const hoje = hojeIso();
  const alvo = m.dias_dieta_alvo ?? 14;
  // Janela: os últimos "alvo" dias até hoje (ou desde o início da meta).
  const inicio = [somarDias(hoje, -(alvo - 1)), m.data_inicio].sort()[1];
  const datas = Array.from({ length: alvo }, (_, i) => somarDias(inicio, i));
  const estados = useConsulta(() => diasDaDieta(datas.filter((d) => d <= hoje)), [inicio, alvo]);
  const todos = useConsulta(() => {
    const ds: string[] = [];
    for (let d = m.data_inicio; d <= hoje; d = somarDias(d, 1)) ds.push(d);
    return diasDaDieta(ds);
  }, [m.data_inicio]);
  let atual = 0;
  let recorde = 0;
  // Hoje só conta se já estiver na margem (igual à sequência da meta).
  const considerados = todos[todos.length - 1] === true ? todos : todos.slice(0, -1);
  for (const e of considerados) {
    atual = e ? atual + 1 : 0;
    recorde = Math.max(recorde, atual);
  }
  return (
    <>
      <Card gap={space.md}>
        <AppText variant="itemTitle">Dias da meta</AppText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {datas.map((d, i) => {
            const e = d <= hoje ? estados[i] : undefined;
            return (
              <View
                key={d}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: e === true ? colors.statusNear : e === false ? colors.statusMid : 'transparent',
                  borderWidth: e === true || e === false ? 0 : 1.5,
                  borderColor: colors.track,
                }}>
                <AppText style={{ fontFamily: font.semibold, fontSize: 12, color: e === true || e === false ? colors.onAccent : colors.textMuted }}>{paraData(d).getDate()}</AppText>
              </View>
            );
          })}
        </View>
        <View style={{ flexDirection: 'row', gap: space.xl }}>
          <AppText variant="caption" style={{ color: colors.statusNear }}>
            ● Na meta
          </AppText>
          <AppText variant="caption" style={{ color: colors.statusMid }}>
            ● Fora da margem
          </AppText>
        </View>
      </Card>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.lg }}>
          <IconTile icon={Flame} tone="diet" size={40} />
          <View style={{ flex: 1, gap: 2 }}>
            <AppText variant="itemTitle">
              Sequência atual: {atual} dia{atual === 1 ? '' : 's'}
            </AppText>
            <AppText variant="caption" color="textMuted">
              Seu recorde é de {recorde} dia{recorde === 1 ? '' : 's'} seguido{recorde === 1 ? '' : 's'}
            </AppText>
          </View>
        </View>
      </Card>
      <Button variant="secondary" label="Ver histórico da dieta" onPress={() => router.push('/dieta/historico')} />
    </>
  );
}
