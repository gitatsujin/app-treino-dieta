import { router, useLocalSearchParams } from 'expo-router';
import { Plus, ScanBarcode, Search, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';

import { AppText, BottomActionBar, Card, ChipGroup, Divider, FieldLabel, ListRow, NutrientBox, Row, Screen, Shortcut, StepButton, Tag, TextField, TopBar } from '@/components/ui';
import { hojeIso, useConsulta } from '@/db/conexao';
import { adicionarConsumo, alimento, buscarAlimentos, dietaAtiva, FONTES, nutrientes, proporcao, valoresDoAlimento } from '@/db/dieta';
import { campo, lerNumero, num } from '@/lib/formato';
import { alimentoCriado, chave, rascunhoDieta } from '@/lib/rascunhos';
import { font, space } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

const FILTROS: [string, 'todos' | 'base' | 'meus' | 'recentes'][] = [
  ['Todos', 'todos'],
  ['Base do app', 'base'],
  ['Meus', 'meus'],
  ['Recentes', 'recentes'],
];
const REFEICOES_LIVRES = ['Café da manhã', 'Almoço', 'Lanche', 'Jantar', 'Outro'];

/** Refeição mais provável pelo horário (para quem não escolheu). */
function refeicaoPeloHorario(nomes: { nome: string; horario: string | null }[]): string {
  const agora = new Date().getHours() * 60 + new Date().getMinutes();
  const comHora = nomes.filter((n) => n.horario);
  if (!comHora.length) {
    const h = new Date().getHours();
    return h < 10 ? 'Café da manhã' : h < 15 ? 'Almoço' : h < 19 ? 'Lanche' : 'Jantar';
  }
  const min = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
  return comHora.reduce((m, n) => (Math.abs(min(n.horario!) - agora) < Math.abs(min(m.horario!) - agora) ? n : m)).nome;
}

/**
 * Adicionar alimento: busca na base do app e nos alimentos do usuário (RF19, RF20, RNF06).
 * Com destino=dieta, o alimento entra na refeição da dieta em edição em vez do consumo do dia.
 */
export default function AdicionarAlimento() {
  const { colors } = useTheme();
  const p = useLocalSearchParams<{ refeicao?: string; data?: string; destino?: 'dieta'; alimento?: string }>();
  const paraDieta = p.destino === 'dieta';
  const rasc = rascunhoDieta.useValor();
  const opcoes = useConsulta(() => {
    const d = dietaAtiva();
    return d ? d.refeicoes.map((r) => ({ nome: r.nome, horario: r.horario })) : REFEICOES_LIVRES.map((nome) => ({ nome, horario: null }));
  });
  const [refeicao, setRefeicao] = useState(p.refeicao ?? refeicaoPeloHorario(opcoes));
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState<(typeof FILTROS)[number][1]>('todos');
  const [sel, setSel] = useState<string | null>(p.alimento ?? null);
  const [g, setG] = useState('');

  const lista = useConsulta(() => buscarAlimentos(busca, filtro).slice(0, 40), [busca, filtro]);
  const a = useConsulta(() => (sel ? { a: alimento(sel), v: valoresDoAlimento(sel), nut: nutrientes() } : null), [sel]);

  // Alimento recém-cadastrado ou lido no código de barras entra já selecionado.
  const criado = alimentoCriado.useValor();
  useEffect(() => {
    if (criado) {
      escolher(criado);
      alimentoCriado.definir(null);
    }
  }, [criado]);

  function escolher(id: string) {
    const x = alimento(id);
    setSel(id);
    setG(campo(x?.porcao_padrao_g ?? 100));
  }
  useEffect(() => {
    if (p.alimento) escolher(p.alimento);
  }, [p.alimento]);

  const gramas = lerNumero(g) ?? 0;
  const v = a ? proporcao(a.v, gramas) : {};
  const destaque = a?.nut.filter((n) => n.categoria === 'micro' && (v[n.id] ?? 0) > 0).slice(0, 3) ?? [];
  const passo = a?.a?.porcao_padrao_g && a.a.porcao_padrao_g <= 60 ? a.a.porcao_padrao_g : 10;
  const nomeRefeicaoDieta = rasc?.refeicoes[rasc.atual]?.nome;

  const adicionar = () => {
    if (!sel || gramas <= 0 || !a?.a) return;
    if (paraDieta) {
      rascunhoDieta.definir((d) =>
        d
          ? {
              ...d,
              refeicoes: d.refeicoes.map((r, i) =>
                i === d.atual ? { ...r, itens: [...r.itens, { chave: chave(), alimento_id: sel, nome: a.a?.nome ?? '', gramas: campo(gramas), kcal100: a.v.energia ?? 0 }] } : r,
              ),
            }
          : d,
      );
    } else {
      adicionarConsumo({ alimento_id: sel, quantidade_g: gramas, data: p.data ?? hojeIso(), refeicao_nome: refeicao });
    }
    router.back();
  };

  return (
    <Screen
      header={<TopBar title="Adicionar alimento" subtitle={paraDieta ? nomeRefeicaoDieta : refeicao} />}
      footer={<BottomActionBar primary={{ label: sel ? `Adicionar ${num(gramas, 0)} g` : 'Escolha um alimento', onPress: adicionar, disabled: !sel || gramas <= 0 }} />}>
      <TextField value={busca} onChangeText={setBusca} placeholder="Buscar alimento" icon={Search} trailing={busca ? <X size={18} color={colors.textMuted} onPress={() => setBusca('')} /> : undefined} />
      {!paraDieta ? (
        <>
          <Row>
            <Shortcut icon={ScanBarcode} tone="diet" label="Escanear código" onPress={() => router.push('/dieta/escanear')} />
            <Shortcut icon={Plus} tone="diet" label="Cadastrar alimento" onPress={() => router.push('/dieta/novo-alimento')} />
          </Row>
          {!p.refeicao ? (
            <>
              <FieldLabel>Refeição</FieldLabel>
              <ChipGroup options={opcoes.map((o) => o.nome)} selected={refeicao} onChange={setRefeicao} />
            </>
          ) : null}
        </>
      ) : null}

      {a?.a ? (
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm }}>
            <AppText variant="itemTitle" style={{ fontSize: 16, flex: 1 }}>
              {a.a.nome}
              {a.a.marca ? ` · ${a.a.marca}` : ''}
            </AppText>
            <Tag label={FONTES[a.a.fonte]} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: space.sm }}>
            <TextField label="Quantidade" value={g} onChangeText={setG} unit="g" keyboardType="decimal-pad" />
            <StepButton kind="minus" onPress={() => setG(campo(Math.max(passo, gramas - passo)))} />
            <StepButton kind="plus" onPress={() => setG(campo(gramas + passo))} />
          </View>
          {a.a.medida_caseira && a.a.porcao_padrao_g ? (
            <AppText variant="caption" color="textMuted">
              {a.a.medida_caseira} = {num(a.a.porcao_padrao_g, 0)} g
            </AppText>
          ) : null}
          <Row gap={space.sm}>
            <NutrientBox value={num(v.energia ?? 0, 0)} label="kcal" />
            <NutrientBox value={`${num(v.proteina ?? 0)} g`} label="Proteína" />
            <NutrientBox value={`${num(v.carboidrato ?? 0)} g`} label="Carbo" />
            <NutrientBox value={`${num(v.gordura ?? 0)} g`} label="Gordura" />
          </Row>
          {destaque.length ? (
            <AppText variant="caption" color="textMuted">
              {destaque.map((n) => `${n.nome} ${num(v[n.id])} ${n.unidade}`).join(' · ')}
            </AppText>
          ) : null}
        </Card>
      ) : null}

      <ChipGroup options={FILTROS.map(([l]) => l)} selected={FILTROS.find(([, f]) => f === filtro)![0]} onChange={(l) => setFiltro(FILTROS.find(([x]) => x === l)![1])} />
      {lista.length ? (
        <Card gap={0} style={{ paddingVertical: space.xs }}>
          {lista.map((x, i) => (
            <View key={x.id}>
              {i > 0 ? <Divider /> : null}
              <ListRow
                title={x.marca ? `${x.nome} · ${x.marca}` : x.nome}
                subtitle={`${FONTES[x.fonte]} · ${num(x.kcal100, 0)} kcal / 100 g`}
                trailing={
                  <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: x.id === sel ? colors.accent : colors.tileDiet, alignItems: 'center', justifyContent: 'center' }}>
                    <Plus size={16} color={x.id === sel ? colors.onAccent : colors.dietStrong} />
                  </View>
                }
                onPress={() => escolher(x.id)}
              />
            </View>
          ))}
        </Card>
      ) : (
        <AppText variant="bodySmall" color="textMuted">
          {filtro === 'recentes' ? 'Os alimentos que você registrar aparecem aqui.' : 'Nenhum alimento encontrado.'}
        </AppText>
      )}
      <Pressable onPress={() => router.push('/dieta/novo-alimento')}>
        <AppText variant="bodySmall" color="textMuted">
          Não achou?{' '}
          <AppText variant="bodySmall" color="accent" style={{ fontFamily: font.semibold }}>
            Cadastrar alimento
          </AppText>
        </AppText>
      </Pressable>
    </Screen>
  );
}
