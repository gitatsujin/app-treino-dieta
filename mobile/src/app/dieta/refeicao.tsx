import { router, useLocalSearchParams } from 'expo-router';
import { Plus, Utensils } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { EditarConsumo } from '@/components/Consumos';
import { AppText, BottomActionBar, BottomSheet, Button, Card, CheckCircle, Divider, IconTile, ListRow, NutrientBox, Row, Screen, StepButton, Tag, TextField, TopBar } from '@/components/ui';
import { hojeIso, useConsulta } from '@/db/conexao';
import { adicionarConsumo, desmarcarRefeicao, marcarRefeicao, proporcao, refeicoesDoDia, valoresDoAlimento, type Consumo, type ItemDieta } from '@/db/dieta';
import { campo, diaSemanaCurta, kcal, lerNumero, num } from '@/lib/formato';
import { font, space } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

/** Detalhe da refeição: consumida (Desmarcar) ou pendente (Marcar como consumida). Tocar num alimento abre a edição (painel). */
export default function DetalheDaRefeicao() {
  const { colors } = useTheme();
  const { id = '', data = hojeIso() } = useLocalSearchParams<{ id?: string; data?: string }>();
  const r = useConsulta(() => refeicoesDoDia(data).find((x) => x.id === id) ?? null, [id, data]);
  const [editando, setEditando] = useState<Consumo | null>(null);
  const [consumir, setConsumir] = useState<ItemDieta | null>(null);

  if (!r) {
    return (
      <Screen header={<TopBar title="Refeição" />}>
        <Card>
          <AppText color="textMuted">Esta refeição não está mais na dieta.</AppText>
        </Card>
      </Screen>
    );
  }

  const consumida = r.status === 'consumida';
  const algum = r.consumos.length + r.avulsos.length > 0;
  const mostrar = algum ? r.consumido : r.valores;
  const quando = data === hojeIso() ? 'Hoje' : diaSemanaCurta(data);
  const status = { consumida: ['Consumida', 'near'], parcial: ['Parcial', 'mid'], proxima: ['Próxima', 'diet'], pendente: ['Pendente', 'neutral'] }[r.status] as [string, 'near' | 'mid' | 'diet' | 'neutral'];

  return (
    <>
      <Screen
        header={<TopBar title={r.nome} subtitle={`${quando}${r.horario ? ` · previsto ${r.horario}` : ''}`} />}
        footer={
          algum ? (
            <BottomActionBar
              secondary={{ label: 'Desmarcar', onPress: () => desmarcarRefeicao(r.id, data) }}
              primary={consumida ? { label: 'OK', onPress: () => router.back() } : { label: 'Marcar o restante', onPress: () => marcarRefeicao(r.id, data) }}
            />
          ) : (
            <BottomActionBar secondary={{ label: 'OK', onPress: () => router.back() }} primary={{ label: 'Marcar como consumida', onPress: () => marcarRefeicao(r.id, data) }} />
          )
        }>
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.lg }}>
            <IconTile icon={Utensils} tone="diet" />
            <View style={{ flex: 1, gap: 2 }}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                <AppText style={{ fontFamily: font.bold, fontSize: 24 }}>{num(mostrar.energia ?? 0, 0)}</AppText>
                <AppText color="textMuted">kcal</AppText>
              </View>
              <AppText variant="caption" color="textMuted">
                {algum ? `Consumida às ${r.horaConsumo ?? r.avulsos[0]?.horario ?? '—'}` : 'Ainda não consumida'}
              </AppText>
            </View>
            <Tag label={status[0]} tone={status[1]} />
          </View>
          <Row gap={space.sm}>
            {[
              ['Proteína', 'proteina'],
              ['Carbo', 'carboidrato'],
              ['Gordura', 'gordura'],
              ['Fibras', 'fibra'],
            ].map(([l, k]) => (
              <NutrientBox key={k} value={`${num(mostrar[k] ?? 0)} g`} label={l} />
            ))}
          </Row>
        </Card>
        <AppText variant="itemTitle">Alimentos</AppText>
        <Card gap={0} style={{ paddingVertical: space.xs }}>
          {r.itens.map((it, i) => {
            const c = r.consumos.find((x) => x.refeicao_modelo_item_id === it.id);
            const v = c?.valores ?? it.valores;
            const g = c?.quantidade_g ?? it.quantidade_g;
            return (
              <View key={it.id}>
                {i > 0 ? <Divider /> : null}
                <ListRow
                  leading={<CheckCircle done={!!c} size={24} />}
                  title={it.nome}
                  subtitle={`${num(g, 0)} g${it.medida_caseira && it.porcao_padrao_g === it.quantidade_g ? ` · ${it.medida_caseira}` : ''}${c && c.quantidade_g !== it.quantidade_g ? ` · previsto ${num(it.quantidade_g, 0)} g` : ''}`}
                  trailing={
                    <AppText variant="button" style={{ fontSize: 13 }}>
                      {kcal(v.energia ?? 0)}
                    </AppText>
                  }
                  chevron
                  onPress={() => (c ? setEditando(c) : setConsumir(it))}
                />
              </View>
            );
          })}
          {r.avulsos.map((c) => (
            <View key={c.id}>
              <Divider />
              <ListRow
                leading={<CheckCircle done size={24} />}
                title={c.nome}
                subtitle={`${num(c.quantidade_g, 0)} g · fora da dieta`}
                trailing={
                  <AppText variant="button" style={{ fontSize: 13 }}>
                    {kcal(c.valores.energia ?? 0)}
                  </AppText>
                }
                chevron
                onPress={() => setEditando(c)}
              />
            </View>
          ))}
        </Card>
        <Pressable
          onPress={() => router.push({ pathname: '/dieta/adicionar', params: { refeicao: r.nome, data } })}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: space.xs }}>
          <Plus size={18} color={colors.accent} />
          <AppText variant="button" color="accent">
            Adicionar alimento a esta refeição
          </AppText>
        </Pressable>
        <AppText variant="caption" color="textMuted">
          Toque em um alimento para marcar só ele, mudar a quantidade ou remover.
        </AppText>
      </Screen>

      <EditarConsumo consumo={editando} onClose={() => setEditando(null)} contexto={r.nome} />
      <ConsumirItem item={consumir} refeicao={r.nome} data={data} onClose={() => setConsumir(null)} />
    </>
  );
}

/** Marca um item da dieta como consumido, com a quantidade de fato comida (RF18). */
function ConsumirItem({ item, refeicao, data, onClose }: { item: ItemDieta | null; refeicao: string; data: string; onClose: () => void }) {
  const [g, setG] = useState<string | null>(null);
  const valor = g ?? campo(item?.quantidade_g);
  const gramas = lerNumero(valor) ?? 0;
  const v = item ? proporcao(valoresDoAlimento(item.alimento_id), gramas) : {};
  const fechar = () => {
    setG(null);
    onClose();
  };
  return (
    <BottomSheet visible={!!item} onClose={fechar}>
      <AppText style={{ fontFamily: font.semibold, fontSize: 17 }}>{item?.nome}</AppText>
      <AppText variant="caption" color="textMuted">
        {refeicao} · previsto {num(item?.quantidade_g ?? 0, 0)} g
      </AppText>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: space.sm }}>
        <TextField label="Quantidade consumida" value={valor} onChangeText={setG} unit="g" keyboardType="decimal-pad" />
        <StepButton kind="minus" onPress={() => setG(campo(Math.max(10, gramas - 10)))} />
        <StepButton kind="plus" onPress={() => setG(campo(gramas + 10))} />
      </View>
      <Row gap={space.sm}>
        <NutrientBox value={num(v.energia ?? 0, 0)} label="kcal" />
        <NutrientBox value={`${num(v.proteina ?? 0)} g`} label="Proteína" />
        <NutrientBox value={`${num(v.carboidrato ?? 0)} g`} label="Carbo" />
        <NutrientBox value={`${num(v.gordura ?? 0)} g`} label="Gordura" />
      </Row>
      <Button
        label="Marcar como consumido"
        disabled={gramas <= 0}
        onPress={() => {
          if (item) adicionarConsumo({ alimento_id: item.alimento_id, quantidade_g: gramas, data, refeicao_nome: refeicao, refeicao_modelo_item_id: item.id });
          fechar();
        }}
      />
    </BottomSheet>
  );
}
