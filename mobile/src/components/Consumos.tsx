import { Clock, Package, Trash2, Utensils } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';

import { AppText, BottomSheet, Button, IconTile, ListCard, ListRow, NutrientBox, Row, StepButton, TextField } from '@/components/ui';
import { atualizarConsumo, FONTES, proporcao, removerConsumo, valoresDoAlimento, type Consumo } from '@/db/dieta';
import { campo, horaValida, kcal, lerNumero, mascaraHora, num } from '@/lib/formato';
import { font, space } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

/** Lista de alimentos registrados; tocar abre a edição (quantidade, horário, remover). */
export function ListaConsumos({ itens }: { itens: Consumo[] }) {
  const [editando, setEditando] = useState<Consumo | null>(null);
  return (
    <>
      <ListCard>
        {itens.map((c) => (
          <ListRow
            key={c.id}
            leading={<IconTile icon={c.fonte === 'open_food_facts' || c.fonte === 'rotulo' ? Package : Utensils} tone="neutral" size={36} />}
            title={`${c.nome} · ${num(c.quantidade_g, 0)} g`}
            subtitle={[c.horario, c.refeicao_nome, FONTES[c.fonte]].filter(Boolean).join(' · ')}
            trailing={<AppText variant="button">{kcal(c.valores.energia ?? 0)}</AppText>}
            onPress={() => setEditando(c)}
          />
        ))}
      </ListCard>
      <EditarConsumo consumo={editando} onClose={() => setEditando(null)} />
    </>
  );
}

/** Painel de edição de um alimento consumido. */
export function EditarConsumo({ consumo, onClose, contexto }: { consumo: Consumo | null; onClose: () => void; contexto?: string }) {
  const { colors } = useTheme();
  const [g, setG] = useState('');
  const [h, setH] = useState('');
  useEffect(() => {
    if (consumo) {
      setG(campo(consumo.quantidade_g));
      setH(consumo.horario ?? '');
    }
  }, [consumo]);
  const gramas = lerNumero(g) ?? 0;
  const v = consumo ? proporcao(valoresDoAlimento(consumo.alimento_id), gramas) : {};
  const passo = consumo?.porcao_padrao_g && consumo.porcao_padrao_g <= 50 ? consumo.porcao_padrao_g : 10;
  const salvar = () => {
    if (!consumo || gramas <= 0) return;
    atualizarConsumo(consumo.id, { quantidade_g: gramas, horario: horaValida(h) ? h : consumo.horario });
    onClose();
  };
  return (
    <BottomSheet visible={!!consumo} onClose={onClose}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.lg }}>
        <IconTile icon={Utensils} tone="diet" size={40} />
        <View style={{ flex: 1, gap: 2 }}>
          <AppText style={{ fontFamily: font.semibold, fontSize: 17 }}>{consumo?.nome}</AppText>
          <AppText variant="caption" color="textMuted">
            {[contexto ?? consumo?.refeicao_nome, consumo ? FONTES[consumo.fonte] : ''].filter(Boolean).join(' · ')}
          </AppText>
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: space.sm }}>
        <TextField label="Quantidade" value={g} onChangeText={setG} unit="g" keyboardType="decimal-pad" warning={gramas <= 0} />
        <StepButton kind="minus" onPress={() => setG(campo(Math.max(passo, gramas - passo)))} />
        <StepButton kind="plus" onPress={() => setG(campo(gramas + passo))} />
      </View>
      {consumo?.medida_caseira && consumo.porcao_padrao_g ? (
        <AppText variant="caption" color="textMuted">
          {consumo.medida_caseira} = {num(consumo.porcao_padrao_g, 0)} g
        </AppText>
      ) : null}
      <Row gap={space.sm}>
        <NutrientBox value={num(v.energia ?? 0, 0)} label="kcal" />
        <NutrientBox value={`${num(v.proteina ?? 0)} g`} label="Proteína" />
        <NutrientBox value={`${num(v.carboidrato ?? 0)} g`} label="Carbo" />
        <NutrientBox value={`${num(v.gordura ?? 0)} g`} label="Gordura" />
      </Row>
      <TextField label="Horário" value={h} onChangeText={(t) => setH(mascaraHora(t))} keyboardType="number-pad" trailing={<Clock size={18} color={colors.textMuted} />} />
      <Pressable
        onPress={() => {
          if (consumo) removerConsumo(consumo.id);
          onClose();
        }}
        style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 }}>
        <Trash2 size={16} color={colors.statusFar} />
        <AppText variant="button" style={{ color: colors.statusFar }}>
          Remover do dia
        </AppText>
      </Pressable>
      <View style={{ flexDirection: 'row', gap: space.sm }}>
        <Button variant="secondary" label="Cancelar" style={{ width: 112 }} onPress={onClose} />
        <Button label="Salvar" style={{ flex: 1 }} onPress={salvar} disabled={gramas <= 0} />
      </View>
    </BottomSheet>
  );
}
