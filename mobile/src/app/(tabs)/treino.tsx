import { router } from 'expo-router';
import { Camera, Clock, Droplet, Footprints, Pause, Play, Plus } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Halter } from '@/components/icons/Halter';
import { Duplicidades } from '@/components/Duplicidades';
import { Recentes } from '@/components/Historico';
import {
  AppText,
  Banner,
  Button,
  ButtonRow,
  Card,
  ChipGroup,
  Divider,
  IconTile,
  ListRow,
  NumberCircle,
  ProgressBar,
  Row,
  Screen,
  ScreenHeader,
  Shortcut,
  Tag,
} from '@/components/ui';
import { hojeIso, useConsulta } from '@/db/conexao';
import { faseEm } from '@/db/perfil';
import {
  AEROBICOS,
  historico,
  iniciarSessao,
  planoAtivo,
  prescricao,
  proximoTreino,
  resumoItens,
  melhorSerie,
  sessaoAberta,
  sessaoCompleta,
  textoSerie,
  tituloTreino,
  ultimaVez,
  type ItemHistorico,
} from '@/db/treino';
import { space } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

/** Aba Treino (RF04–RF11, RF24–RF27, RF54, RF64). */
export default function TreinoScreen() {
  const { colors } = useTheme();
  const hoje = hojeIso();
  const d = useConsulta(() => {
    const plano = planoAtivo();
    const aberta = sessaoAberta();
    const ultimas: Record<string, string> = {};
    for (const t of plano?.treinos ?? [])
      for (const i of t.itens) {
        const u = i.exercicio_id ? ultimaVez(i.exercicio_id) : null;
        if (u) ultimas[i.exercicio_id!] = textoSerie(melhorSerie(u.series));
      }
    return { plano, proximo: proximoTreino(plano), aberta: aberta ? sessaoCompleta(aberta.id) : null, recentes: historico().slice(0, 3), fase: faseEm(hoje), ultimas };
  });
  const [escolhido, setEscolhido] = useState<string | null>(null);

  if (!d.plano || !d.plano.treinos.length) return <SemPlano recentes={d.recentes} />;

  const treino = d.plano.treinos.find((t) => t.id === escolhido) ?? d.proximo ?? d.plano.treinos[0];
  const ultimas = d.ultimas;
  const aerobico = treino.itens.find((i) => i.tipo_aerobico);
  const iniciar = () => {
    iniciarSessao({ treinoModeloId: treino.id });
    router.push('/treino/andamento');
  };

  return (
    <Screen
      header={
        <ScreenHeader
          title="Treino"
          subtitle={d.plano.nome}
          action={{ icon: Plus, label: 'Registrar aeróbico', onPress: () => router.push('/treino/aerobico') }}
        />
      }>
      <Duplicidades />
      {d.fase?.fase === 'Menstrual' ? (
        <Banner
          icon={Droplet}
          title={`Menstruação · dia ${d.fase.dia}`}
          message="Nesse período lembre-se de se cuidar, suas forças estão menores, portanto pegue leve hoje."
          onAction={() => router.push('/perfil/ciclo')}
          actionLabel="Ciclo"
        />
      ) : null}

      {d.aberta ? (
        <Card style={{ borderWidth: 1.5, borderColor: colors.accent }}>
          <View style={styles.item}>
            <IconTile icon={d.aberta.status === 'pausada' ? Pause : Play} />
            <View style={styles.flex}>
              <AppText variant="itemTitle" style={{ fontSize: 16 }}>
                {d.aberta.titulo} {d.aberta.status === 'pausada' ? 'pausado' : 'em andamento'}
              </AppText>
              <AppText variant="bodySmall" color="textMuted">
                {d.aberta.exercicios.filter((e) => e.series.length).length} de {d.aberta.exercicios.length} exercícios feitos
              </AppText>
            </View>
          </View>
          <ProgressBar value={d.aberta.exercicios.filter((e) => e.series.length).length} max={Math.max(d.aberta.exercicios.length, 1)} color={colors.accent} />
          <ButtonRow
            secondary={{ label: 'Finalizar', onPress: () => router.push({ pathname: '/treino/concluido', params: { id: d.aberta?.id ?? '', finalizar: '1' } }) }}
            primary={{ label: 'Continuar treino', onPress: () => router.push('/treino/andamento') }}
          />
        </Card>
      ) : null}

      {d.plano.treinos.length > 1 ? (
        <ChipGroup
          options={d.plano.treinos.map((t) => `${t.letra} · ${t.nome || 'Treino'}`)}
          selected={`${treino.letra} · ${treino.nome || 'Treino'}`}
          onChange={(v) => setEscolhido(d.plano?.treinos.find((t) => `${t.letra} · ${t.nome || 'Treino'}` === v)?.id ?? null)}
        />
      ) : null}

      <Card gap={0}>
        <View style={[styles.item, { paddingBottom: space.lg }]}>
          <IconTile icon={Halter} />
          <View style={styles.flex}>
            <AppText variant="cardTitle">{tituloTreino(treino)}</AppText>
            <AppText variant="bodySmall" color="textMuted">
              {resumoItens(treino.itens)}
              {treino.id === d.proximo?.id ? ' · próximo' : ''}
            </AppText>
          </View>
        </View>
        {treino.itens
          .filter((i) => !i.tipo_aerobico)
          .map((e, i) => (
            <View key={e.id}>
              <Divider />
              <ListRow
                leading={<NumberCircle n={i + 1} />}
                title={e.exercicio_nome ?? ''}
                subtitle={`${prescricao(e)}${ultimas[e.exercicio_id!] ? `  ·  Última vez: ${ultimas[e.exercicio_id!]}` : ''}`}
                chevron
                onPress={() => router.push({ pathname: '/treino/evolucao', params: { id: e.exercicio_id! } })}
              />
            </View>
          ))}
        {aerobico ? (
          <>
            <Divider />
            <ListRow
              leading={<IconTile icon={Footprints} tone="diet" size={28} />}
              title={`${AEROBICOS[aerobico.tipo_aerobico!]}${aerobico.duracao_prevista_min ? ` · ${aerobico.duracao_prevista_min} min` : ''}`}
              subtitle={aerobico.observacao ?? undefined}
              trailing={<Tag label="Aeróbico" tone="diet" />}
            />
          </>
        ) : null}
        <View style={{ marginTop: space.lg }}>
          <ButtonRow
            secondary={{ label: 'Editar', onPress: () => router.push({ pathname: '/treino/plano', params: { treino: treino.id } }) }}
            primary={{ label: `Iniciar treino ${treino.letra}`, onPress: iniciar, disabled: !!d.aberta }}
          />
        </View>
      </Card>

      <Row>
        <Shortcut icon={Footprints} tone="diet" label="Aeróbico avulso" onPress={() => router.push('/treino/aerobico')} />
        <Shortcut icon={Halter} label="Treino livre" onPress={() => router.push({ pathname: '/treino/escolher-exercicio', params: { destino: 'livre' } })} />
        <Shortcut icon={Clock} label="Histórico" onPress={() => router.push('/treino/historico')} />
      </Row>

      <Recentes itens={d.recentes} ciclo={!!d.fase} />
    </Screen>
  );
}

/** Aba Treino sem plano ativo. */
function SemPlano({ recentes }: { recentes: ItemHistorico[] }) {
  return (
    <Screen header={<ScreenHeader title="Treino" subtitle="Nenhum plano ativo" />}>
      <Duplicidades />
      <Card style={{ alignItems: 'center' }}>
        <IconTile icon={Halter} size={52} />
        <AppText style={{ fontFamily: 'Inter_600SemiBold', fontSize: 18 }}>Você ainda não tem um plano</AppText>
        <AppText color="textMuted" style={{ textAlign: 'center' }}>
          Monte seus treinos (A, B, C…) com os exercícios, séries e repetições da sua ficha.
        </AppText>
        <Button label="Criar plano" style={{ alignSelf: 'stretch' }} onPress={() => router.push('/treino/plano')} />
        <Button variant="secondary" icon={Camera} label="Importar ficha" style={{ alignSelf: 'stretch' }} onPress={() => router.push({ pathname: '/dieta/origem', params: { alvo: 'treino' } })} />
      </Card>
      <Card gap={0}>
        <AppText variant="itemTitle" style={{ paddingBottom: space.xs }}>
          Ou registre sem plano
        </AppText>
        <ListRow
          leading={<IconTile icon={Halter} size={36} />}
          title="Treino livre"
          subtitle="Escolha os exercícios na hora"
          chevron
          onPress={() => router.push({ pathname: '/treino/escolher-exercicio', params: { destino: 'livre' } })}
        />
        <Divider />
        <ListRow leading={<IconTile icon={Footprints} tone="diet" size={36} />} title="Aeróbico avulso" subtitle="Corrida, bicicleta, esteira…" chevron onPress={() => router.push('/treino/aerobico')} />
      </Card>
      <Recentes itens={recentes} ciclo={false} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  item: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  flex: { flex: 1, gap: space.xxs },
});
