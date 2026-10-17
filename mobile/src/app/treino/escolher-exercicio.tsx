import { router, useLocalSearchParams } from 'expo-router';
import { Search, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { Halter } from '@/components/icons/Halter';
import { AppText, BottomActionBar, Card, Checkbox, ChipGroup, Divider, IconTile, ListRow, Radio, Screen, Tag, TextField, TopBar } from '@/components/ui';
import { useConsulta } from '@/db/conexao';
import { adicionarExerciciosNaSessao, EQUIPAMENTOS, exercicios, GRUPOS, iniciarSessao, melhorSerie, textoSerie, ultimaVez } from '@/db/treino';
import { chave, exercicioCriado, exercicioDaMeta, rascunhoPlano } from '@/lib/rascunhos';
import { space } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

type Destino = 'plano' | 'sessao' | 'livre' | 'meta';
const FILTROS = ['Todos', ...Object.values(GRUPOS)];

/** Escolher exercício da base: para o plano, o treino em andamento, um treino livre ou uma meta de carga. */
export default function EscolherExercicio() {
  const { colors } = useTheme();
  const { destino = 'plano', sessao } = useLocalSearchParams<{ destino?: Destino; sessao?: string }>();
  const unico = destino === 'meta';
  const [busca, setBusca] = useState('');
  const [grupo, setGrupo] = useState('Todos');
  const [sel, setSel] = useState<{ id: string; nome: string }[]>([]);
  const grupoId = Object.entries(GRUPOS).find(([, l]) => l === grupo)?.[0];
  const lista = useConsulta(
    () =>
      exercicios(busca, grupoId).map((e) => {
        const u = ultimaVez(e.id);
        return { ...e, ultima: u ? textoSerie(melhorSerie(u.series)) : '' };
      }),
    [busca, grupoId],
  );

  // Exercício criado agora entra já selecionado.
  const criado = exercicioCriado.useValor();
  useEffect(() => {
    if (!criado) return;
    setSel((s) => (unico ? [criado] : s.some((x) => x.id === criado.id) ? s : [...s, criado]));
    setBusca('');
    exercicioCriado.definir(null);
  }, [criado, unico]);

  const toggle = (e: { id: string; nome: string }) =>
    setSel((s) => (unico ? [e] : s.some((x) => x.id === e.id) ? s.filter((x) => x.id !== e.id) : [...s, e]));

  const confirmar = () => {
    if (!sel.length) return;
    if (destino === 'plano') {
      rascunhoPlano.definir((p) =>
        p
          ? {
              ...p,
              treinos: p.treinos.map((t, i) =>
                i === p.atual
                  ? { ...t, itens: [...t.itens, ...sel.map((e) => ({ chave: chave(), exercicio_id: e.id, nome: e.nome, tipo_aerobico: null, series: '3', reps: '10–12', carga: '', duracao: '' }))] }
                  : t,
              ),
            }
          : p,
      );
      router.back();
    } else if (destino === 'sessao' && sessao) {
      adicionarExerciciosNaSessao(sessao, sel.map((e) => e.id));
      router.back();
    } else if (destino === 'meta') {
      exercicioDaMeta.definir(sel[0]);
      router.back();
    } else {
      iniciarSessao({ exercicioIds: sel.map((e) => e.id) });
      router.replace('/treino/andamento');
    }
  };

  const rotulo =
    destino === 'livre' ? `Começar treino (${sel.length})` : destino === 'meta' ? 'Escolher' : `Adicionar ${sel.length} exercício${sel.length === 1 ? '' : 's'}`;

  return (
    <Screen
      header={<TopBar title={unico ? 'Exercício da meta' : destino === 'livre' ? 'Treino livre' : 'Escolher exercício'} leading="close" />}
      footer={
        <BottomActionBar secondary={{ label: 'Criar novo', onPress: () => router.push('/treino/novo-exercicio') }} primary={{ label: rotulo, onPress: confirmar, disabled: !sel.length }} />
      }>
      <TextField
        value={busca}
        onChangeText={setBusca}
        placeholder="Buscar exercício"
        icon={Search}
        trailing={busca ? <X size={18} color={colors.textMuted} onPress={() => setBusca('')} /> : undefined}
      />
      <ChipGroup options={FILTROS} selected={grupo} onChange={setGrupo} />
      <AppText variant="caption" color="textMuted">
        {lista.length} resultado{lista.length === 1 ? '' : 's'}
        {sel.length && !unico ? ` · ${sel.length} selecionado${sel.length === 1 ? '' : 's'}` : ''}
      </AppText>
      {lista.length ? (
        <Card gap={0} style={{ paddingVertical: space.xs }}>
          {lista.map((e, i) => {
            const on = sel.some((x) => x.id === e.id);
            return (
              <View key={e.id}>
                {i > 0 ? <Divider /> : null}
                <ListRow
                  leading={<IconTile icon={Halter} size={36} />}
                  title={e.nome}
                  subtitle={[GRUPOS[e.grupo_muscular], e.equipamento ? EQUIPAMENTOS[e.equipamento]?.toLowerCase() : '', e.ultima ? `último: ${e.ultima}` : ''].filter(Boolean).join(' · ')}
                  trailing={
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                      {e.fonte === 'usuario' ? <Tag label="Seu" tone="training" /> : null}
                      {unico ? <Radio selected={on} /> : <Checkbox checked={on} onChange={() => toggle(e)} />}
                    </View>
                  }
                  onPress={() => toggle(e)}
                />
              </View>
            );
          })}
        </Card>
      ) : null}
      <AppText variant="bodySmall" color="textMuted">
        Não achou? Crie um exercício próprio.
      </AppText>
    </Screen>
  );
}
