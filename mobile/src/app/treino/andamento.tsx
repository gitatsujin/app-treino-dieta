import { router, useLocalSearchParams } from 'expo-router';
import { Check, Clock, Droplet, Footprints, History, Pause, Plus } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Halter } from '@/components/icons/Halter';
import { AppText, BottomActionBar, BottomSheet, Button, Card, IconTile, ProgressBar, Screen, Tag, TopBar } from '@/components/ui';
import { hojeIso, useConsulta } from '@/db/conexao';
import { faseEm } from '@/db/perfil';
import {
  AEROBICOS,
  desmarcarSerie,
  marcarSerie,
  pausarSessao,
  reps,
  resumoSeries,
  retomarSessao,
  segundosAtivos,
  sessaoAberta,
  sessaoCompleta,
  ultimaVez,
  type ExercicioDaSessao,
} from '@/db/treino';
import { campo, cronometro, dataCurta, lerNumero } from '@/lib/formato';
import { font, radius, space } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

const DESCANSO = 90;

/** Treino em andamento (RF08, RF09, RF11, RF65, RF66). Cada série marcada é salva na hora. */
export default function TreinoEmAndamento() {
  const { colors } = useTheme();
  // Com ?id de um treino já finalizado, a tela corrige as séries (Editar no detalhe da sessão).
  const { id } = useLocalSearchParams<{ id?: string }>();
  const s = useConsulta(() => {
    const a = id ? { id } : sessaoAberta();
    return a ? sessaoCompleta(a.id) : null;
  }, [id]);
  const editando = s?.status === 'concluida' || s?.status === 'parcial';
  const fase = useConsulta(() => faseEm(s?.inicio.slice(0, 10) ?? hojeIso()), [s?.inicio]);
  const [sair, setSair] = useState(false);
  const [idx, setIdx] = useState<number | null>(null);
  const [agora, setAgora] = useState(Date.now());
  const [descansoAte, setDescansoAte] = useState<number | null>(null);

  // Abrir um treino pausado retoma o cronômetro (só ao entrar na tela, não ao pausar para sair).
  const aoAbrir = useRef(s);
  useEffect(() => {
    if (aoAbrir.current?.status === 'pausada') retomarSessao(aoAbrir.current.id);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  if (!s) {
    return (
      <Screen header={<TopBar title="Treino" leading="close" onLeadingPress={() => router.dismissTo('/')} />}>
        <Card style={{ alignItems: 'center' }}>
          <IconTile icon={Halter} size={52} />
          <AppText style={{ fontFamily: font.semibold, fontSize: 18 }}>Nenhum treino em andamento</AppText>
          <Button label="Voltar" style={{ alignSelf: 'stretch' }} onPress={() => router.dismissTo('/')} />
        </Card>
      </Screen>
    );
  }

  const exs = s.exercicios;
  const primeiroPendente = exs.findIndex((e) => e.series.length < (e.previsto?.series_previstas ?? 3));
  const atualIdx = Math.min(idx ?? (primeiroPendente < 0 ? Math.max(exs.length - 1, 0) : primeiroPendente), Math.max(exs.length - 1, 0));
  const ex = exs[atualIdx];
  const ultimo = atualIdx >= exs.length - 1;
  const feitosEx = exs.filter((e) => e.series.length).length;
  const totalSeries = exs.reduce((t, e) => t + e.series.length, 0);
  const descanso = descansoAte ? Math.ceil((descansoAte - agora) / 1000) : 0;
  const concluir = () => (editando ? router.back() : router.replace({ pathname: '/treino/concluido', params: { id: s.id, finalizar: '1' } }));

  return (
    <>
      <Screen
        header={
          editando ? (
            <TopBar title={`Editar ${s.titulo.toLowerCase()}`} subtitle={s.subtitulo} actionLabel="OK" onAction={concluir} />
          ) : (
            <TopBar title={s.titulo} subtitle={s.subtitulo} leading="close" onLeadingPress={() => setSair(true)} actionLabel="Concluir" onAction={concluir} />
          )
        }
        footer={
          <BottomActionBar
            secondary={{ label: 'Anterior', onPress: () => setIdx(Math.max(0, atualIdx - 1)), disabled: atualIdx === 0 }}
            primary={ultimo ? { label: editando ? 'Salvar' : 'Concluir treino', onPress: concluir } : { label: 'Próximo exercício', onPress: () => setIdx(atualIdx + 1) }}
          />
        }>
        <Card>
          <View style={styles.between}>
            <View>
              <AppText variant="caption" color="textMuted">
                Duração
              </AppText>
              <AppText style={{ fontFamily: font.bold, fontSize: 26 }}>{cronometro(segundosAtivos(s, new Date(agora)))}</AppText>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <AppText variant="caption" color="textMuted">
                Exercício
              </AppText>
              <AppText variant="value">{exs.length ? `${atualIdx + 1} de ${exs.length}` : '—'}</AppText>
            </View>
          </View>
          <ProgressBar value={feitosEx} max={Math.max(exs.length, 1)} color={colors.accent} />
          {fase ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Droplet size={14} color={colors.dietStrong} />
              <Tag label={`Fase ${fase.fase.toLowerCase()} · dia ${fase.dia}`} tone="diet" />
            </View>
          ) : null}
        </Card>

        {ex ? <Exercicio key={ex.id} ex={ex} sessaoId={s.id} fase={!!fase} onFeita={() => !editando && setDescansoAte(Date.now() + DESCANSO * 1000)} /> : null}

        {descanso > 0 ? (
          <View style={[styles.rest, { backgroundColor: colors.tileTraining }]}>
            <Clock size={20} color={colors.accent} />
            <View style={{ flex: 1 }}>
              <AppText variant="caption" color="textMuted">
                Descanso
              </AppText>
              <AppText variant="value">{cronometro(descanso)}</AppText>
            </View>
            <Pressable onPress={() => setDescansoAte(null)} hitSlop={8}>
              <AppText variant="button" color="accent">
                Pular
              </AppText>
            </Pressable>
          </View>
        ) : null}

        {ultimo && s.aerobicoPrevisto ? (
          <Card>
            <View style={styles.item}>
              <IconTile icon={Footprints} tone="diet" size={36} />
              <View style={{ flex: 1, gap: 2 }}>
                <AppText variant="itemTitle">
                  {AEROBICOS[s.aerobicoPrevisto.tipo_aerobico!]}
                  {s.aerobicoPrevisto.duracao_prevista_min ? ` · ${s.aerobicoPrevisto.duracao_prevista_min} min` : ''}
                </AppText>
                <AppText variant="caption" color="textMuted">
                  {s.aerobicos.length ? 'Registrado neste treino' : 'Aeróbico do treino'}
                </AppText>
              </View>
              {s.aerobicos.length ? (
                <Tag label="Feito" tone="near" />
              ) : (
                <Pressable
                  onPress={() =>
                    router.push({
                      pathname: '/treino/aerobico',
                      params: { sessao: s.id, tipo: s.aerobicoPrevisto?.tipo_aerobico ?? 'outro', duracao: String(s.aerobicoPrevisto?.duracao_prevista_min ?? '') },
                    })
                  }
                  hitSlop={8}>
                  <AppText variant="button" color="accent">
                    Registrar
                  </AppText>
                </Pressable>
              )}
            </View>
          </Card>
        ) : null}

        {exs.length > atualIdx + 1 ? (
          <Card gap={space.md}>
            <AppText variant="caption" color="textMuted" style={{ fontFamily: font.medium }}>
              A seguir
            </AppText>
            {exs.slice(atualIdx + 1, atualIdx + 4).map((e) => (
              <Pressable key={e.id} onPress={() => setIdx(exs.indexOf(e))} style={styles.between}>
                <AppText style={{ fontFamily: font.medium }}>{e.nome}</AppText>
                <AppText variant="bodySmall" color="textMuted">
                  {e.previsto ? `${e.previsto.series_previstas ?? 3} × ${reps(e.previsto)}` : `${e.series.length} séries`}
                </AppText>
              </Pressable>
            ))}
          </Card>
        ) : null}

        <Pressable
          onPress={() => router.push({ pathname: '/treino/escolher-exercicio', params: { destino: 'sessao', sessao: s.id } })}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: space.xs }}>
          <Plus size={18} color={colors.accent} />
          <AppText variant="button" color="accent">
            Adicionar exercício ao treino
          </AppText>
        </Pressable>
      </Screen>

      {/* Sair do treino (RF66, RN22): nunca descarta o que foi feito. */}
      <BottomSheet visible={sair} onClose={() => setSair(false)}>
        <View style={{ alignItems: 'center', gap: space.lg }}>
          <IconTile icon={Pause} size={52} />
          <AppText style={{ fontFamily: font.bold, fontSize: 19 }}>Sair do treino?</AppText>
          <AppText color="textMuted" style={{ textAlign: 'center', lineHeight: 20 }}>
            {totalSeries
              ? `Seu progresso já está salvo: ${totalSeries} série${totalSeries === 1 ? '' : 's'} em ${feitosEx} exercício${feitosEx === 1 ? '' : 's'}. Pause para continuar de onde parou ou finalize com o que já fez.`
              : 'Nenhuma série feita ainda. Pause para começar depois; se finalizar agora, o treino não entra no histórico.'}
          </AppText>
        </View>
        <Button
          label="Pausar e sair"
          onPress={() => {
            setSair(false);
            pausarSessao(s.id);
            router.dismissTo('/');
          }}
        />
        <Button
          variant="secondary"
          label="Finalizar agora"
          onPress={() => {
            setSair(false);
            concluir();
          }}
        />
        <Pressable onPress={() => setSair(false)} style={{ alignItems: 'center', paddingVertical: space.sm }}>
          <AppText variant="itemTitle" color="accent">
            Continuar treinando
          </AppText>
        </Pressable>
      </BottomSheet>
    </>
  );
}

type Linha = { carga: string; reps: string };

/** Séries de um exercício: carga e repetições editáveis; o check grava a série. */
function Exercicio({ ex, sessaoId, fase, onFeita }: { ex: ExercicioDaSessao; sessaoId: string; fase: boolean; onFeita: () => void }) {
  const { colors } = useTheme();
  const ult = useConsulta(() => ultimaVez(ex.exercicio_id, sessaoId), [ex.exercicio_id, sessaoId]);
  const faseUlt = useConsulta(() => (ult && fase ? faseEm(ult.data)?.fase : undefined), [ult?.data, fase]);
  const previstas = ex.previsto?.series_previstas ?? Math.max(ult?.series.length ?? 3, 1);
  const [extras, setExtras] = useState(0);
  const total = Math.max(previstas + extras, ex.series.length);
  const [edits, setEdits] = useState<Record<number, Linha>>({});

  const sugestao = useMemo(
    () => (n: number): Linha => {
      // Ordem: série anterior deste treino › mesma série da última vez › previsto no plano.
      const nesteTreino = [...ex.series].filter((x) => x.numero < n).sort((a, b) => b.numero - a.numero)[0];
      const daUltimaVez = ult?.series.find((x) => x.numero === n) ?? ult?.series[ult.series.length - 1];
      const ref = nesteTreino ?? daUltimaVez;
      const carga = ref?.carga_kg ?? ex.previsto?.carga_prevista_kg ?? null;
      const r = ref?.repeticoes ?? ex.previsto?.reps_max ?? ex.previsto?.reps_min ?? null;
      return { carga: campo(carga), reps: r == null ? '' : String(r) };
    },
    [ult, ex.previsto, ex.series],
  );

  const feita = (n: number) => ex.series.find((x) => x.numero === n);
  const valor = (n: number): Linha => {
    const f = feita(n);
    if (edits[n]) return edits[n];
    return f ? { carga: campo(f.carga_kg), reps: String(f.repeticoes) } : { carga: '', reps: '' };
  };
  const atual = Array.from({ length: total }, (_, i) => i + 1).find((n) => !feita(n));

  const marcar = (n: number) => {
    if (feita(n)) {
      desmarcarSerie(ex.id, n);
      return;
    }
    const v = valor(n);
    const sug = sugestao(n);
    const carga = lerNumero(v.carga) ?? lerNumero(sug.carga) ?? 0;
    const r = lerNumero(v.reps) ?? lerNumero(sug.reps);
    if (!r || r <= 0) return;
    marcarSerie(ex.id, n, carga, Math.round(r));
    setEdits((e) => Object.fromEntries(Object.entries(e).filter(([k]) => Number(k) !== n)));
    onFeita();
  };

  const editar = (n: number, k: keyof Linha, t: string) => {
    const base = valor(n);
    setEdits((e) => ({ ...e, [n]: { ...base, [k]: t } }));
    if (feita(n)) {
      const nv = { ...base, [k]: t };
      const carga = lerNumero(nv.carga);
      const r = lerNumero(nv.reps);
      if (carga != null && r) marcarSerie(ex.id, n, carga, Math.round(r));
    }
  };

  return (
    <Card>
      <View style={styles.item}>
        <IconTile icon={Halter} />
        <View style={{ flex: 1, gap: 2 }}>
          <AppText style={{ fontFamily: font.semibold, fontSize: 18 }}>{ex.nome}</AppText>
          <AppText variant="bodySmall" color="textMuted">
            {ex.previsto ? `${previstas} × ${reps(ex.previsto) || '—'}  ·  ` : ''}descanso de {DESCANSO} s
          </AppText>
        </View>
      </View>
      <View style={[styles.last, { backgroundColor: colors.track }]}>
        <History size={16} color={colors.textMuted} />
        <AppText variant="bodySmall" style={{ fontFamily: font.medium, flex: 1 }}>
          {ult ? `Última vez (${dataCurta(ult.data)}${faseUlt ? ` · fase ${faseUlt.toLowerCase()}` : ''}): ${resumoSeries(ult.series)}` : 'Primeira vez com este exercício'}
        </AppText>
      </View>
      <View style={styles.tableHead}>
        {['Série', 'Carga (kg)', 'Repetições', 'Feita'].map((h, i) => (
          <AppText key={h} variant="caption" color="textMuted" style={[{ fontFamily: font.medium }, i === 0 ? { width: 36 } : i === 3 ? { width: 40, textAlign: 'center' } : { flex: 1 }]}>
            {h}
          </AppText>
        ))}
      </View>
      {Array.from({ length: total }, (_, i) => i + 1).map((n) => {
        const f = !!feita(n);
        const cur = n === atual;
        const v = valor(n);
        const sug = sugestao(n);
        const box = (k: keyof Linha) => (
          <TextInput
            value={v[k]}
            placeholder={k === 'reps' ? sug.reps || (ex.previsto ? reps(ex.previsto) : '') : sug.carga}
            placeholderTextColor={colors.textMuted}
            onChangeText={(t) => editar(n, k, t)}
            keyboardType={k === 'reps' ? 'number-pad' : 'decimal-pad'}
            accessibilityLabel={`${k === 'reps' ? 'Repetições' : 'Carga'} da série ${n}`}
            style={[
              styles.input,
              { color: colors.text, backgroundColor: f ? colors.track : colors.surface, borderColor: cur ? colors.accent : colors.track, borderWidth: f ? 0 : cur ? 1.5 : 1 },
            ]}
          />
        );
        return (
          <View key={n} style={styles.setRow}>
            <View style={[styles.num, { backgroundColor: f ? colors.tileTraining : colors.track }]}>
              <AppText style={{ fontFamily: font.semibold, fontSize: 14, color: f ? colors.accent : colors.text }}>{n}</AppText>
            </View>
            {box('carga')}
            {box('reps')}
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: f }}
              accessibilityLabel={`Série ${n} feita`}
              onPress={() => marcar(n)}
              style={[styles.done, f ? { backgroundColor: colors.accent } : { borderWidth: 1.5, borderColor: colors.track }]}>
              {f ? <Check size={18} color={colors.onAccent} strokeWidth={2.5} /> : null}
            </Pressable>
          </View>
        );
      })}
      <Pressable onPress={() => setExtras((x) => x + 1)} style={styles.addSet}>
        <Plus size={16} color={colors.accent} />
        <AppText variant="button" color="accent">
          Adicionar série
        </AppText>
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  item: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  last: { flexDirection: 'row', alignItems: 'center', gap: space.sm, borderRadius: radius.button - 2, padding: space.md },
  tableHead: { flexDirection: 'row', gap: space.sm, alignItems: 'center' },
  setRow: { flexDirection: 'row', gap: space.sm, alignItems: 'center' },
  num: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  input: { flex: 1, minWidth: 0, height: 40, borderRadius: 10, textAlign: 'center', fontFamily: font.semibold, fontSize: 15 },
  done: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  addSet: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: space.xs },
  rest: { flexDirection: 'row', alignItems: 'center', gap: space.md, borderRadius: radius.shortcut, padding: space.lg },
});
