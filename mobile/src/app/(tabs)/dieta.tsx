import { router } from 'expo-router';
import { ChevronLeft, ChevronRight, Download, Plus, ScanBarcode, Utensils } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ListaConsumos } from '@/components/Consumos';
import {
  AppText,
  Button,
  ButtonRow,
  Card,
  Divider,
  IconTile,
  ProgressBar,
  Row,
  Screen,
  ScreenHeader,
  SectionHeader,
  SegmentedControl,
  Shortcut,
  Tag,
  TextField,
} from '@/components/ui';
import { hojeIso, useConsulta } from '@/db/conexao';
import { avulsosDoDia, dietaAtiva, marcarRefeicao, nutrientes, refeicoesDoDia, resumoDoDia, type Consumo, type ResumoDia } from '@/db/dieta';
import { definirMetaCalorias, usuario } from '@/db/perfil';
import { campo, diaSemanaCurta, kcal, lerNumero, num, somarDias } from '@/lib/formato';
import { font, space } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

const MICROS_RESUMO = ['ferro', 'calcio', 'vitamina_c', 'fibra'];

/** Aba Dieta (RF14–RF21, RF34–RF37). */
export default function DietaScreen() {
  const { colors } = useTheme();
  const hoje = hojeIso();
  const [data, setData] = useState(hoje);
  const d = useConsulta(() => {
    const dieta = dietaAtiva();
    return { dieta, r: resumoDoDia(data), refeicoes: refeicoesDoDia(data, dieta), avulsos: avulsosDoDia(data, dieta), nut: nutrientes() };
  }, [data]);

  const rotulo = data === hoje ? `Hoje, ${diaSemanaCurta(data).toLowerCase()}` : data === somarDias(hoje, -1) ? `Ontem, ${diaSemanaCurta(data).toLowerCase()}` : diaSemanaCurta(data);
  const seletor = (
    <View style={styles.date}>
      <Pressable accessibilityLabel="Dia anterior" hitSlop={10} onPress={() => setData(somarDias(data, -1))}>
        <ChevronLeft size={20} color={colors.textMuted} />
      </Pressable>
      <AppText variant="itemTitle">{rotulo}</AppText>
      <Pressable accessibilityLabel="Próximo dia" hitSlop={10} disabled={data >= hoje} onPress={() => setData(somarDias(data, 1))}>
        <ChevronRight size={20} color={data >= hoje ? colors.track : colors.textMuted} />
      </Pressable>
    </View>
  );

  if (!d.dieta) return <SemPlano seletor={seletor} data={data} r={d.r} avulsos={d.avulsos} />;

  const { r } = d;
  const abrir = (id: string) => router.push({ pathname: '/dieta/refeicao', params: { id, data } });
  const macros = [
    ['Proteína', 'proteina'],
    ['Carboidrato', 'carboidrato'],
    ['Gordura', 'gordura'],
  ];

  return (
    <Screen
      header={
        <ScreenHeader
          title="Dieta"
          subtitle={`${d.dieta.nome} · ${kcal(r.meta ?? 0)}`}
          action={{ icon: Plus, label: 'Adicionar alimento', onPress: () => router.push({ pathname: '/dieta/adicionar', params: { data } }) }}
        />
      }>
      {seletor}

      <Card onPress={() => router.push('/dieta/historico')}>
        <View style={styles.between}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
            <AppText variant="display">{num(r.kcal, 0)}</AppText>
            <AppText color="textMuted">/ {num(r.meta ?? 0, 0)} kcal</AppText>
          </View>
          {r.meta ? (
            <Tag
              label={r.naDieta ? 'Na meta' : r.kcal < r.meta ? `Faltam ${num(r.meta - r.kcal, 0)} kcal` : `${num(r.kcal - r.meta, 0)} kcal acima`}
              tone={r.naDieta ? 'near' : r.kcal < r.meta ? 'diet' : 'mid'}
            />
          ) : null}
        </View>
        <ProgressBar value={r.kcal} max={r.meta || 1} color={colors.diet} />
        <BalancoDoDia r={r} />
        <Divider />
        <View style={{ flexDirection: 'row', gap: space.lg }}>
          {macros.map(([nome, id]) => {
            const atual = r.consumido[id] ?? 0;
            const meta = r.metasMacros?.[id] ?? 0;
            return (
              <View key={id} style={{ flex: 1, gap: 4 }}>
                <AppText variant="caption" color="textMuted" style={{ fontFamily: font.medium }}>
                  {nome}
                </AppText>
                <AppText variant="button" style={{ fontSize: 13 }}>
                  {Math.round(atual)} / {Math.round(meta)} g
                </AppText>
                <ProgressBar value={atual} max={meta || 1} color={id === 'proteina' ? colors.protein : colors.textMuted} />
              </View>
            );
          })}
        </View>
      </Card>

      <Card onPress={() => router.push({ pathname: '/dieta/micronutrientes', params: { data } })} gap={space.md}>
        <View style={styles.between}>
          <AppText variant="itemTitle">Micronutrientes</AppText>
          <AppText variant="button" color="accent" style={{ fontSize: 13 }}>
            Ver todos
          </AppText>
        </View>
        {MICROS_RESUMO.map((id) => {
          const n = d.nut.find((x) => x.id === id)!;
          const atual = r.consumido[id] ?? 0;
          return (
            <View key={id} style={styles.micro}>
              <AppText variant="bodySmall" style={{ width: 80 }}>
                {n.nome}
              </AppText>
              <View style={{ flex: 1 }}>
                <ProgressBar value={atual} max={n.recomendado_dia ?? 1} color={colors.protein} />
              </View>
              <AppText variant="caption" color="textMuted" style={{ fontFamily: font.medium, width: 92, textAlign: 'right' }}>
                {num(atual)} / {num(n.recomendado_dia ?? 0, 0)} {n.unidade}
              </AppText>
            </View>
          );
        })}
      </Card>

      <SectionHeader title={data === hoje ? 'Refeições de hoje' : 'Refeições do dia'} actionLabel="Editar dieta" onAction={() => router.push('/dieta/editar')} />
      {d.refeicoes.map((ref) => {
        const consumida = ref.status === 'consumida';
        return (
          <Card key={ref.id} gap={space.md} onPress={() => abrir(ref.id)}>
            <View style={styles.item}>
              <IconTile icon={Utensils} tone={consumida ? 'training' : 'diet'} size={36} />
              <View style={{ flex: 1, gap: 2 }}>
                <AppText variant="itemTitle">{ref.nome}</AppText>
                <AppText variant="caption" color={ref.status === 'proxima' ? 'dietStrong' : 'textMuted'}>
                  {[ref.horario, { consumida: 'consumida', parcial: 'parcial', proxima: 'próxima', pendente: 'pendente' }[ref.status]].filter(Boolean).join(' · ')}
                </AppText>
              </View>
              <AppText variant="button" color={consumida ? 'text' : 'textMuted'}>
                {kcal(consumida || ref.status === 'parcial' ? (ref.consumido.energia ?? 0) : (ref.valores.energia ?? 0))}
              </AppText>
            </View>
            <AppText variant="bodySmall" color="textMuted">
              {ref.itens.map((i) => i.nome).join(' · ')}
            </AppText>
            {ref.status === 'proxima' || ref.status === 'parcial' ? (
              <ButtonRow secondary={{ label: 'Ver', onPress: () => abrir(ref.id) }} primary={{ label: 'Marcar como consumida', onPress: () => marcarRefeicao(ref.id, data) }} />
            ) : null}
          </Card>
        );
      })}

      <SectionHeader title="Fora da dieta" actionLabel="Adicionar" onAction={() => router.push({ pathname: '/dieta/adicionar', params: { data } })} />
      {d.avulsos.length ? <ListaConsumos itens={d.avulsos} /> : (
        <AppText variant="bodySmall" color="textMuted">
          Nada registrado fora da dieta.
        </AppText>
      )}

      <Row>
        <Shortcut icon={Plus} tone="diet" label="Adicionar" onPress={() => router.push({ pathname: '/dieta/adicionar', params: { data } })} />
        <Shortcut icon={ScanBarcode} tone="diet" label="Escanear" onPress={() => router.push('/dieta/escanear')} />
        <Shortcut icon={Download} tone="diet" label="Importar dieta" onPress={() => router.push({ pathname: '/dieta/origem', params: { alvo: 'dieta' } })} />
      </Row>
    </Screen>
  );
}

/** Aba Dieta sem plano alimentar (RF20, RF36). */
function SemPlano({ seletor, data, r, avulsos }: { seletor: React.ReactNode; data: string; r: ResumoDia; avulsos: Consumo[] }) {
  const kcalDia = r.kcal;
  const meta = useConsulta(() => usuario()?.meta_calorias_kcal ?? null);
  const [modo, setModo] = useState(meta ? 'Definir valor' : 'Sem meta');
  const [valor, setValor] = useState(campo(meta) || '');
  const salvarMeta = (m: string, v: string) => {
    const n = lerNumero(v);
    definirMetaCalorias(m === 'Sem meta' ? null : n && n >= 800 && n <= 8000 ? Math.round(n) : meta);
  };
  return (
    <Screen
      header={<ScreenHeader title="Dieta" subtitle="Sem plano alimentar" action={{ icon: Plus, label: 'Adicionar alimento', onPress: () => router.push({ pathname: '/dieta/adicionar', params: { data } }) }} />}>
      {seletor}
      <Card gap={space.sm} onPress={() => router.push('/dieta/historico')}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
          <AppText variant="display">{num(kcalDia, 0)}</AppText>
          <AppText color="textMuted">{meta ? `/ ${num(meta, 0)} kcal` : 'kcal consumidas'}</AppText>
        </View>
        {meta ? <ProgressBar value={kcalDia} max={meta} /> : null}
        <BalancoDoDia r={r} />
      </Card>
      <Card>
        <AppText variant="itemTitle">Meta diária de calorias</AppText>
        <SegmentedControl
          options={['Sem meta', 'Definir valor']}
          selected={modo}
          onChange={(m) => {
            setModo(m);
            salvarMeta(m, valor);
          }}
        />
        {modo === 'Definir valor' ? (
          <TextField value={valor} onChangeText={setValor} onBlur={() => salvarMeta(modo, valor)} placeholder="2.000" unit="kcal por dia" keyboardType="number-pad" />
        ) : null}
        <AppText variant="caption" color="textMuted">
          Quando você cadastrar uma dieta, a meta passa a vir dela.
        </AppText>
      </Card>
      <Card style={{ alignItems: 'center' }}>
        <IconTile icon={Utensils} tone="diet" size={52} />
        <AppText style={{ fontFamily: font.semibold, fontSize: 18 }}>Você ainda não tem uma dieta</AppText>
        <AppText color="textMuted" style={{ textAlign: 'center' }}>
          Monte a dieta do nutricionista no app. Você também pode só registrar o que come.
        </AppText>
        <View style={{ alignSelf: 'stretch' }}>
          <ButtonRow secondary={{ label: 'Importar', onPress: () => router.push({ pathname: '/dieta/origem', params: { alvo: 'dieta' } }) }} primary={{ label: 'Criar dieta', onPress: () => router.push('/dieta/editar') }} />
        </View>
      </Card>
      <SectionHeader title="Registros do dia" actionLabel="Adicionar" onAction={() => router.push({ pathname: '/dieta/adicionar', params: { data } })} />
      {avulsos.length ? <ListaConsumos itens={avulsos} /> : <Button variant="secondary" label="Registrar refeição" onPress={() => router.push({ pathname: '/dieta/adicionar', params: { data } })} />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  date: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.xs },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  item: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  micro: { flexDirection: 'row', alignItems: 'center', gap: space.md },
});

/**
 * Consumido, gasto em atividades e balanço do dia (RN06). O gasto mostra só as atividades (com relógio,
 * a energia ativa medida); o metabolismo basal entra no balanço — hoje, só a parte do dia que já passou.
 */
function BalancoDoDia({ r }: { r: ResumoDia }) {
  const sinal = r.balanco > 0 ? '+' : r.balanco < 0 ? '−' : '';
  const agora = new Date();
  const hh = `${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}`;
  const colunas: [string, string, string][] = [
    ['Consumido', kcal(r.kcal), 'alimentação'],
    ['Gasto', kcal(r.atividades), r.atividadesOrigem === 'relogio' ? 'pelo relógio' : 'estimado'],
    ['Balanço', `${sinal}${kcal(Math.abs(r.balanco))}`, r.parcial ? 'até agora' : 'do dia'],
  ];
  return (
    <View style={{ gap: space.sm }}>
      <View style={styles.between}>
        {colunas.map(([l, v, d]) => (
          <View key={l} style={{ gap: 2 }}>
            <AppText variant="caption" color="textMuted">
              {l}
            </AppText>
            <AppText variant="itemTitle">{v}</AppText>
            <AppText variant="caption" color="textMuted">
              {d}
            </AppText>
          </View>
        ))}
      </View>
      <AppText variant="caption" color="textMuted">
        Balanço = consumido − gasto − metabolismo basal ({kcal(r.tmbAteAgora)}
        {r.parcial ? ` até as ${hh}, de ${kcal(r.tmb)} no dia` : ''}).
      </AppText>
    </View>
  );
}
