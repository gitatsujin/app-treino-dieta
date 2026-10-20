import { router, useFocusEffect } from 'expo-router';
import { Flame, Pause, Play, Scale, ScanBarcode, Target, Trophy, Utensils, Weight } from 'lucide-react-native';
import { useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Halter } from '@/components/icons/Halter';
import { Semana } from '@/components/Semana';
import {
  ActivityRings,
  AppText,
  Avatar,
  Banner,
  Button,
  ButtonRow,
  Card,
  CheckCircle,
  IconTile,
  ListCard,
  ListRow,
  ProgressBar,
  Row,
  Screen,
  Shortcut,
  StatCard,
} from '@/components/ui';
import { hojeIso, useConsulta } from '@/db/conexao';
import { diasSeguidosNaDieta, dietaAtiva, marcarRefeicao, refeicoesDoDia, resumoDoDia } from '@/db/dieta';
import { metas, progresso, verificarMetas } from '@/db/metas';
import { pesoAtual, pesos, primeiroNome, usuario } from '@/db/perfil';
import { historico, iniciarSessao, planoAtivo, proximoTreino, resumoItens, sessaoAberta, sessaoCompleta, semana, tituloTreino, ultimoRecorde } from '@/db/treino';
import { dataExtensa, diasEntre, kcal, num, relativo } from '@/lib/formato';
import { font, space } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

/** Tela Início (RF02, RF22): resumo do dia, atalhos, treino, próxima refeição, semana, indicadores e metas. */
export default function InicioScreen() {
  const { colors } = useTheme();
  const hoje = hojeIso();

  // Metas que chegaram a 100% desde a última visita viram comemoração.
  useFocusEffect(
    useCallback(() => {
      const novas = verificarMetas();
      if (novas[0]) router.push({ pathname: '/metas/atingida', params: { id: novas[0].id } });
    }, []),
  );

  const d = useConsulta(() => {
    const u = usuario();
    const plano = planoAtivo();
    const dieta = dietaAtiva();
    const aberta = sessaoAberta();
    const ativas = metas('ativa');
    const freq = ativas.find((m) => m.tipo === 'frequencia');
    return {
      u,
      plano,
      dieta,
      aberta: aberta ? sessaoCompleta(aberta.id) : null,
      proximo: proximoTreino(plano),
      resumo: resumoDoDia(hoje),
      refeicao: refeicoesDoDia(hoje, dieta).find((r) => r.status === 'proxima' || r.status === 'parcial') ?? null,
      semana: semana(hoje),
      metaTreinos: freq?.treinos_semana ?? null,
      sequencia: diasSeguidosNaDieta(hoje),
      peso: pesoAtual(),
      pesoSemana: pesos().find((p) => diasEntre(p.data, hoje) >= 7) ?? null,
      metas: ativas.slice(0, 2).map((m) => ({ m, p: progresso(m, hoje) })),
      recorde: ultimoRecorde(),
      temHistorico: historico().length > 0,
    };
  });

  const nome = primeiroNome(d.u);
  const hora = new Date().getHours();
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';
  const primeiroDia = !d.plano && !d.dieta && !d.metas.length && !d.temHistorico && !d.resumo.kcal;

  const header = (
    <View style={[styles.header, { backgroundColor: colors.background }]}>
      <View style={{ gap: space.xxs, flex: 1 }}>
        <AppText variant="greeting" accessibilityRole="header">
          {primeiroDia ? `Boas-vindas, ${nome}` : `${saudacao}, ${nome}`}
        </AppText>
        <AppText color="textMuted">{dataExtensa(hoje)}</AppText>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Abrir perfil" hitSlop={8} onPress={() => router.navigate('/perfil')}>
        <Avatar initial={nome.charAt(0).toUpperCase() || '?'} />
      </Pressable>
    </View>
  );

  if (primeiroDia) return <PrimeiroDia header={header} tmb={d.resumo.tmb} />;

  const r = d.resumo;
  const prot = r.consumido.proteina ?? 0;
  const protMeta = r.metasMacros?.proteina ?? null;
  const diasPeso = d.peso ? diasEntre(d.peso.data, hoje) : null;
  const iniciar = (id: string) => {
    iniciarSessao({ treinoModeloId: id });
    router.push('/treino/andamento');
  };
  const falta: string[] = [];
  if (r.meta && r.meta > r.kcal) falta.push(`${num(r.meta - r.kcal, 0)} kcal`);
  if (protMeta && protMeta > prot) falta.push(`${Math.round(protMeta - prot)} g de proteína`);

  return (
    <Screen header={header}>
      {d.aberta ? <TreinoAberto s={d.aberta} /> : null}

      {diasPeso == null || diasPeso >= 15 ? (
        <Banner
          icon={Scale}
          message={diasPeso == null ? 'Registre seu peso para acompanhar sua evolução.' : `Faz ${diasPeso} dias que você não registra seu peso.`}
          actionLabel="Registrar"
          onAction={() => router.push('/perfil/peso')}
        />
      ) : null}

      <Card gap={space.md} onPress={() => router.push('/dieta/hoje')}>
        <AppText variant="cardTitle">Seu dia</AppText>
        <View style={styles.rings}>
          <View style={{ gap: space.md, flex: 1 }}>
            <Legend color={colors.diet} label="Calorias" value={r.meta ? `${num(r.kcal, 0)} / ${num(r.meta, 0)} kcal` : kcal(r.kcal)} />
            <Legend color={colors.protein} label="Proteína" value={protMeta ? `${Math.round(prot)} / ${Math.round(protMeta)} g` : `${Math.round(prot)} g`} />
            <Legend
              color={colors.accent}
              label="Treinos"
              value={d.metaTreinos ? `${d.semana.treinos} de ${d.metaTreinos} na semana` : `${d.semana.treinos} na semana`}
            />
          </View>
          <ActivityRings
            rings={[
              { value: r.kcal, max: r.meta ?? Math.max(r.kcal, 1), color: colors.diet },
              { value: prot, max: protMeta ?? Math.max(prot, 1), color: colors.protein },
              { value: d.semana.treinos, max: d.metaTreinos ?? Math.max(d.semana.treinos, 1), color: colors.accent },
            ]}
          />
        </View>
        <AppText variant="bodySmall" color="textMuted">
          {falta.length ? `Faltam ${falta.join(' e ')} para fechar o dia.` : r.meta ? 'Meta de calorias do dia alcançada.' : 'Defina uma meta de calorias na aba Dieta.'}
        </AppText>
      </Card>

      <Row>
        <Shortcut icon={Utensils} tone="diet" label="Refeição" onPress={() => router.push('/dieta/adicionar')} />
        <Shortcut icon={ScanBarcode} tone="diet" label="Escanear" onPress={() => router.push('/dieta/escanear')} />
        <Shortcut icon={Weight} tone="training" label="Peso" onPress={() => router.push('/perfil/peso')} />
      </Row>

      {!d.aberta && d.proximo ? (
        <Card>
          <View style={styles.item}>
            <IconTile icon={Halter} />
            <View style={styles.flex}>
              <AppText variant="caption" color="textMuted">
                Próximo treino
              </AppText>
              <AppText variant="itemTitle" style={{ fontSize: 16 }}>
                {tituloTreino(d.proximo)}
              </AppText>
              <AppText variant="bodySmall" color="textMuted">
                {resumoItens(d.proximo.itens)}
              </AppText>
            </View>
          </View>
          <ButtonRow
            secondary={{ label: 'Ver treino', onPress: () => router.push('/treino/hoje') }}
            primary={{ label: 'Iniciar treino', onPress: () => d.proximo && iniciar(d.proximo.id) }}
          />
        </Card>
      ) : null}

      {d.refeicao ? (
        <Card onPress={() => router.push({ pathname: '/dieta/refeicao', params: { id: d.refeicao?.id ?? '' } })}>
          <View style={styles.item}>
            <IconTile icon={Utensils} tone="diet" />
            <View style={styles.flex}>
              <AppText variant="caption" color="textMuted">
                Próxima refeição
              </AppText>
              <AppText variant="itemTitle" style={{ fontSize: 16 }}>
                {d.refeicao.nome}
                {d.refeicao.horario ? ` · ${d.refeicao.horario}` : ''}
              </AppText>
            </View>
            <AppText variant="button" color="textMuted">
              {kcal(d.refeicao.valores.energia ?? 0)}
            </AppText>
          </View>
          <AppText variant="bodySmall" color="textMuted">
            {d.refeicao.itens.map((i) => i.nome).join(' · ')}
          </AppText>
          <ButtonRow
            secondary={{ label: 'Ver dieta', onPress: () => router.push('/dieta/hoje') }}
            primary={{ label: 'Marcar como consumida', onPress: () => d.refeicao && marcarRefeicao(d.refeicao.id, hoje) }}
          />
        </Card>
      ) : null}

      <Card gap={14} onPress={() => router.push('/treino/historico')}>
        <View style={styles.between}>
          <AppText variant="cardTitle">Sua semana</AppText>
          {d.sequencia > 0 ? (
            <View style={[styles.streak, { backgroundColor: colors.tileDiet }]}>
              <Flame size={14} color={colors.dietStrong} />
              <AppText variant="caption" style={{ fontFamily: font.semibold, color: colors.dietStrong }}>
                {d.sequencia} dia{d.sequencia === 1 ? '' : 's'} seguido{d.sequencia === 1 ? '' : 's'} na dieta
              </AppText>
            </View>
          ) : null}
        </View>
        <Semana dieta={!!d.dieta} />
        <Row gap={space.xl}>
          <Legend color={colors.accent} label="Dia de treino" />
          {d.dieta ? <Legend color={colors.diet} label="Dieta na meta" /> : null}
        </Row>
      </Card>

      <Row>
        <StatCard
          icon={Weight}
          label="Peso"
          value={d.peso ? `${num(d.peso.peso_kg)} kg` : '—'}
          detail={d.peso && d.pesoSemana ? variacao(d.peso.peso_kg - d.pesoSemana.peso_kg) : d.peso ? relativo(d.peso.data, hoje) : 'sem registro'}
          onPress={() => router.push('/perfil/peso')}
        />
        <StatCard
          icon={Flame}
          tone="diet"
          label="Balanço"
          value={`${r.balanco > 0 ? '+' : r.balanco < 0 ? '−' : ''}${num(Math.abs(r.balanco), 0)} kcal`}
          detail={`${r.balanco < 0 ? 'déficit' : r.balanco > 0 ? 'superávit' : 'equilíbrio'} até agora`}
          onPress={() => router.push('/dieta/historico')}
        />
      </Row>

      {d.metas.length ? (
        <Card onPress={() => router.push('/metas')}>
          <AppText variant="cardTitle">Metas</AppText>
          {d.metas.map(({ m, p }) => (
            <View key={m.id} style={{ gap: 6 }}>
              <View style={styles.between}>
                <AppText style={{ fontFamily: font.medium, flex: 1 }} numberOfLines={1}>
                  {p.titulo}
                </AppText>
                <AppText variant="button" color="textMuted">
                  {p.treinos ? `${p.treinos.feito} de ${p.treinos.alvo}` : `${Math.round(p.p * 100)}%`}
                </AppText>
              </View>
              <ProgressBar value={p.p} max={1} />
            </View>
          ))}
          <AppText variant="bodySmall" color="textMuted">
            {d.metas[0].p.frase}
          </AppText>
        </Card>
      ) : (
        <Card onPress={() => router.push('/metas/nova')}>
          <ListRow leading={<IconTile icon={Target} size={36} />} title="Crie sua primeira meta" subtitle="Carga, frequência, peso ou dieta" chevron style={{ paddingVertical: 0 }} />
        </Card>
      )}

      {d.recorde ? (
        <ListCard>
          {[
            <ListRow
              key="rec"
              leading={<IconTile icon={Trophy} />}
              title={`${d.recorde.nome} · ${num(d.recorde.serie.carga_kg)} kg`}
              subtitle="Novo recorde pessoal"
              trailing={
                <AppText variant="caption" color="textMuted">
                  {relativo(d.recorde.data, hoje)}
                </AppText>
              }
              onPress={() => router.push({ pathname: '/treino/evolucao', params: { id: d.recorde?.exercicio_id ?? '' } })}
            />,
          ]}
        </ListCard>
      ) : null}
    </Screen>
  );
}

const variacao = (x: number) => (Math.abs(x) < 0.05 ? 'estável na semana' : `${x > 0 ? '+' : '−'}${num(Math.abs(x))} kg na semana`);

/** Treino em andamento ou pausado: continuar ou finalizar (RN22). */
function TreinoAberto({ s }: { s: NonNullable<ReturnType<typeof sessaoCompleta>> }) {
  const { colors } = useTheme();
  const feitos = s.exercicios.filter((e) => e.series.length).length;
  const series = s.exercicios.reduce((t, e) => t + e.series.length, 0);
  const pausada = s.status === 'pausada';
  const ha = pausada && s.pausada_em ? Math.round((Date.now() - new Date(s.pausada_em).getTime()) / 60000) : null;
  return (
    <Card style={{ borderWidth: 1.5, borderColor: colors.accent }}>
      <View style={styles.item}>
        <IconTile icon={pausada ? Pause : Play} />
        <View style={styles.flex}>
          <AppText variant="itemTitle" style={{ fontSize: 17 }}>
            {s.titulo} {pausada ? 'pausado' : 'em andamento'}
          </AppText>
          <AppText variant="bodySmall" color="textMuted">
            {feitos} de {s.exercicios.length} exercícios · {series} série{series === 1 ? '' : 's'} feita{series === 1 ? '' : 's'}
            {ha != null ? ` · há ${ha < 60 ? `${ha} min` : `${Math.floor(ha / 60)} h`}` : ''}
          </AppText>
        </View>
      </View>
      <ProgressBar value={feitos} max={Math.max(s.exercicios.length, 1)} color={colors.accent} />
      <ButtonRow
        secondary={{ label: 'Finalizar', onPress: () => router.push({ pathname: '/treino/concluido', params: { id: s.id, finalizar: '1' } }) }}
        primary={{ label: 'Continuar treino', onPress: () => router.push('/treino/andamento') }}
      />
    </Card>
  );
}

function Legend({ color, label, value }: { color: string; label: string; value?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }} />
      <View style={{ flexShrink: 1 }}>
        <AppText variant="caption" color="textMuted">
          {label}
        </AppText>
        {value ? <AppText variant="button">{value}</AppText> : null}
      </View>
    </View>
  );
}

/** Início no primeiro dia (sem plano, dieta nem metas). */
function PrimeiroDia({ header, tmb }: { header: React.ReactNode; tmb: number }) {
  const passos = [
    { t: 'Criar seu perfil', s: 'Feito', done: true },
    { t: 'Montar ou importar seu treino', s: 'Por foto, PDF ou manualmente', href: '/treino' as const },
    { t: 'Montar ou importar sua dieta', s: 'Ou só definir uma meta de calorias', href: '/dieta' as const },
    { t: 'Criar sua primeira meta', s: 'Carga, frequência, peso ou dieta', href: '/metas/nova' as const },
  ];
  return (
    <Screen header={header}>
      <Card gap={space.md}>
        <View style={styles.between}>
          <AppText variant="cardTitle">Primeiros passos</AppText>
          <AppText variant="button" color="accent">
            1 de 4
          </AppText>
        </View>
        <ProgressBar value={1} max={4} />
        {passos.map((p) => (
          <ListRow
            key={p.t}
            leading={<CheckCircle done={p.done} />}
            title={p.t}
            subtitle={p.s}
            chevron={!p.done}
            onPress={p.href ? () => router.push(p.href) : undefined}
          />
        ))}
      </Card>
      <Card gap={space.sm}>
        <AppText variant="cardTitle">Seu dia</AppText>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
          <AppText variant="display">0</AppText>
          <AppText color="textMuted">kcal consumidas</AppText>
        </View>
        <AppText variant="bodySmall" color="textMuted">
          Seu gasto em repouso: {kcal(tmb)} por dia (metabolismo basal)
        </AppText>
        <Button label="Registrar refeição" onPress={() => router.push('/dieta/adicionar')} />
      </Card>
      <Card>
        <AppText variant="cardTitle">Sua semana</AppText>
        <Semana dieta={false} />
        <AppText variant="bodySmall" color="textMuted">
          Seus treinos e os dias na dieta aparecem aqui conforme você registra.
        </AppText>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.xxl, paddingTop: space.sm, paddingBottom: space.lg },
  item: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  flex: { flex: 1, gap: space.xxs },
  rings: { flexDirection: 'row', alignItems: 'center', gap: space.xxl },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  streak: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 12, paddingHorizontal: space.sm, paddingVertical: 4 },
});
