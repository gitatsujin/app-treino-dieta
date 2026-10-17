import { router, useLocalSearchParams } from 'expo-router';
import { Droplet, Footprints, Trash2, Trophy } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { AppText, Banner, Button, Card, ConfirmDialog, Divider, IconTile, ListRow, Row, Screen, TopBar } from '@/components/ui';
import { useConsulta } from '@/db/conexao';
import { faseEm } from '@/db/perfil';
import {
  AEROBICOS,
  descreverAerobico,
  excluirSessao,
  iniciarSessao,
  recordesDaSessao,
  resumoSeries,
  segundosAtivos,
  sessaoAberta,
  sessaoCompleta,
  textoSerie,
  volume,
} from '@/db/treino';
import { diaSemanaCurta, duracao, hora, num } from '@/lib/formato';
import { font, radius, space } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

/** Detalhe da sessão: tela de consulta, sem rodapé fixo (regra 9). Editar fica no topo; OK volta. */
export default function DetalheDaSessao() {
  const { colors } = useTheme();
  const { id = '' } = useLocalSearchParams<{ id?: string }>();
  const [apagar, setApagar] = useState(false);
  const d = useConsulta(() => {
    const s = sessaoCompleta(id);
    if (!s) return null;
    const kcalAer = s.aerobicos.reduce((t, a) => t + (a.calorias_gastas_kcal ?? 0), 0);
    return {
      s,
      min: segundosAtivos(s) / 60,
      volume: volume(s.exercicios.flatMap((e) => e.series)),
      kcal: (s.calorias_gastas_kcal ?? 0) + kcalAer,
      recordes: recordesDaSessao(s.id),
      fase: faseEm(s.inicio.slice(0, 10)),
      aberta: !!sessaoAberta(),
    };
  }, [id]);

  if (!d) {
    return (
      <Screen header={<TopBar title="Treino" />}>
        <Card>
          <AppText color="textMuted">Este treino não existe mais.</AppText>
        </Card>
      </Screen>
    );
  }
  const { s } = d;
  const repetir = () => {
    if (!d.aberta) iniciarSessao(s.treino_modelo_id ? { treinoModeloId: s.treino_modelo_id } : { exercicioIds: s.exercicios.map((e) => e.exercicio_id) });
    router.dismissTo('/');
    router.push('/treino/andamento');
  };

  return (
    <>
      <Screen
        header={
          <TopBar
            title={s.titulo}
            subtitle={`${diaSemanaCurta(s.inicio.slice(0, 10))} · ${hora(s.inicio)}`}
            actionLabel="Editar"
            onAction={() => router.push({ pathname: '/treino/andamento', params: { id: s.id } })}
          />
        }>
        <Row>
          {[
            [duracao(d.min), 'duração'],
            [`${num(Math.round(d.volume), 0)} kg`, 'volume'],
            [`${num(d.kcal, 0)} kcal`, 'gasto'],
          ].map(([v, l]) => (
            <View key={l} style={{ flex: 1, alignItems: 'center', gap: 2, paddingVertical: space.md, borderRadius: radius.button - 2, backgroundColor: colors.track }}>
              <AppText style={{ fontFamily: font.bold, fontSize: 15 }}>{v}</AppText>
              <AppText variant="label" color="textMuted" style={{ fontFamily: font.medium }}>
                {l}
              </AppText>
            </View>
          ))}
        </Row>
        {d.fase ? <Banner icon={Droplet} tone="neutral" title={`Fase ${d.fase.fase.toLowerCase()} · dia ${d.fase.dia} do ciclo`} message="Compare suas cargas entre as fases no histórico de cada exercício." /> : null}
        {d.recordes.map((r) => (
          <Banner key={r.exercicio_id} icon={Trophy} tone="training" message={`Novo recorde: ${r.nome}, ${textoSerie(r.serie)}.`} />
        ))}
        {s.status === 'parcial' ? <Banner icon={Trophy} tone="neutral" message="Treino finalizado antes de todas as séries previstas (parcial)." /> : null}
        {s.exercicios.length ? (
          <Card gap={0} style={{ paddingVertical: space.xs }}>
            {s.exercicios.map((e, i) => (
              <View key={e.id}>
                {i > 0 ? <Divider /> : null}
                <ListRow
                  title={e.nome}
                  subtitle={e.series.length ? resumoSeries(e.series) : 'Não feito'}
                  chevron
                  onPress={() => router.push({ pathname: '/treino/evolucao', params: { id: e.exercicio_id } })}
                />
              </View>
            ))}
          </Card>
        ) : null}
        {s.aerobicos.map((a) => (
          <Card key={a.id}>
            <ListRow
              leading={<IconTile icon={Footprints} tone="diet" size={36} />}
              title={`${AEROBICOS[a.tipo]} · ${Math.round(a.duracao_min)} min`}
              subtitle={[descreverAerobico(a), `${a.calorias_gastas_kcal ?? 0} kcal`].filter(Boolean).join(' · ')}
              chevron
              onPress={() => router.push({ pathname: '/treino/aerobico', params: { id: a.id } })}
              style={{ paddingVertical: 0 }}
            />
          </Card>
        ))}
        <View style={{ gap: space.sm, marginTop: space.xs }}>
          <Button variant="secondary" label="Repetir treino" onPress={repetir} disabled={d.aberta} />
          <Button label="OK" onPress={() => router.back()} />
          <Button variant="danger" icon={Trash2} label="Excluir treino" onPress={() => setApagar(true)} />
        </View>
      </Screen>
      <ConfirmDialog
        visible={apagar}
        icon={Trash2}
        title="Excluir este treino?"
        message="As séries e os aeróbicos deste treino saem do histórico, das metas e do gasto do dia. Essa ação não pode ser desfeita."
        confirmLabel="Excluir"
        onCancel={() => setApagar(false)}
        onConfirm={() => {
          setApagar(false);
          excluirSessao(s.id);
          router.back();
        }}
      />
    </>
  );
}
