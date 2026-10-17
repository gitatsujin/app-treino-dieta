import { router, useLocalSearchParams } from 'expo-router';
import { Trophy } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, BottomActionBar, Card, Divider, IconTile, ProgressBar, Screen, TopBar } from '@/components/ui';
import { hojeIso, useConsulta } from '@/db/conexao';
import { metas, progresso } from '@/db/metas';
import { primeiroNome, usuario } from '@/db/perfil';
import { finalizarSessao, recordesDaSessao, segundosAtivos, sessaoCompleta, textoSerie, volume } from '@/db/treino';
import { duracao, num } from '@/lib/formato';
import { font, radius, space, statusColor } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

/** Treino concluído. "Concluir" e o X voltam para a Início (regra 11 do guia). */
export default function TreinoConcluido() {
  const { colors } = useTheme();
  const { id, finalizar } = useLocalSearchParams<{ id?: string; finalizar?: string }>();
  // Finaliza uma única vez, ao abrir a tela (RF66: grava o que foi feito).
  const [resultado, setResultado] = useState<string | null | undefined>(finalizar ? undefined : (id ?? null));
  useEffect(() => {
    if (id && finalizar) setResultado(finalizarSessao(id));
  }, [id, finalizar]);
  const inicio = () => router.dismissTo('/');

  const d = useConsulta(() => {
    const s = resultado ? sessaoCompleta(resultado) : null;
    if (!s) return null;
    const series = s.exercicios.flatMap((e) => e.series);
    const kcalAer = s.aerobicos.reduce((t, a) => t + (a.calorias_gastas_kcal ?? 0), 0);
    const freq = metas('ativa').find((m) => m.tipo === 'frequencia');
    return {
      s,
      nome: primeiroNome(usuario()),
      min: segundosAtivos(s) / 60 + s.aerobicos.reduce((t, a) => t + a.duracao_min, 0),
      volume: volume(series),
      series: series.length,
      kcal: (s.calorias_gastas_kcal ?? 0) + kcalAer,
      recordes: recordesDaSessao(s.id),
      freq: freq ? progresso(freq, hojeIso()) : null,
    };
  }, [resultado]);

  if (resultado === undefined) return null;
  if (!d) {
    return (
      <Screen header={<TopBar title="Treino finalizado" leading="close" onLeadingPress={inicio} />} footer={<BottomActionBar primary={{ label: 'OK', onPress: inicio }} />}>
        <Card>
          <AppText color="textMuted">Nenhuma série foi marcada como feita, então este treino não entrou no histórico.</AppText>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen
      header={<TopBar title={d.s.status === 'parcial' ? 'Treino finalizado' : 'Treino concluído'} leading="close" onLeadingPress={inicio} />}
      footer={
        <BottomActionBar
          secondary={{ label: 'Ver detalhes', onPress: () => router.push({ pathname: '/treino/sessao', params: { id: d.s.id } }) }}
          primary={{ label: 'Concluir', onPress: inicio }}
        />
      }>
      <View style={{ alignItems: 'center', gap: space.sm, paddingVertical: space.lg }}>
        <IconTile icon={Trophy} size={52} />
        <AppText style={{ fontFamily: font.bold, fontSize: 26 }}>{d.nome ? `Mandou bem, ${d.nome}!` : 'Mandou bem!'}</AppText>
        <AppText color="textMuted">
          {d.s.letra ? `${d.s.titulo} · ${d.s.subtitulo}` : d.s.titulo}
          {d.s.status === 'parcial' ? ' · parcial' : ''}
        </AppText>
      </View>
      {[
        [
          [duracao(d.min), 'duração'],
          [`${num(Math.round(d.volume), 0)} kg`, 'volume'],
        ],
        [
          [String(d.series), d.series === 1 ? 'série' : 'séries'],
          [`${num(d.kcal, 0)} kcal`, 'gasto estimado'],
        ],
      ].map((row, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: space.md }}>
          {row.map(([v, l]) => (
            <View key={l} style={[styles.stat, { backgroundColor: colors.track }]}>
              <AppText style={{ fontFamily: font.bold, fontSize: 15 }}>{v}</AppText>
              <AppText variant="label" color="textMuted" style={{ fontFamily: font.medium }}>
                {l}
              </AppText>
            </View>
          ))}
        </View>
      ))}
      {d.recordes.length ? (
        <Card gap={space.md}>
          <AppText variant="itemTitle">
            {d.recordes.length} recorde{d.recordes.length === 1 ? '' : 's'} pessoa{d.recordes.length === 1 ? 'l' : 'is'}
          </AppText>
          {d.recordes.map((r) => (
            <View key={r.exercicio_id} style={{ gap: space.md }}>
              <Divider />
              <View style={styles.row}>
                <Trophy size={16} color={colors.accent} />
                <AppText style={{ fontFamily: font.medium, flex: 1 }}>{r.nome}</AppText>
                <AppText variant="button">{textoSerie(r.serie)}</AppText>
              </View>
            </View>
          ))}
        </Card>
      ) : null}
      {d.freq?.treinos ? (
        <Card gap={space.sm} onPress={() => router.push('/metas')}>
          <View style={styles.row}>
            <AppText style={{ fontFamily: font.medium, flex: 1 }}>
              {d.freq.treinos.alvo} treino{d.freq.treinos.alvo === 1 ? '' : 's'} na semana
            </AppText>
            <AppText variant="button" style={{ color: statusColor(d.freq.treinos.feito / d.freq.treinos.alvo, colors) }}>
              {Math.min(d.freq.treinos.feito, d.freq.treinos.alvo)} de {d.freq.treinos.alvo}
            </AppText>
          </View>
          <ProgressBar value={Math.min(d.freq.treinos.feito, d.freq.treinos.alvo)} max={d.freq.treinos.alvo} />
          <AppText variant="bodySmall" color="textMuted">
            {d.freq.treinos.feito >= d.freq.treinos.alvo ? 'Meta da semana batida!' : d.freq.frase}
          </AppText>
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  stat: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: space.md, borderRadius: radius.button - 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
});
