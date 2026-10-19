import { router } from 'expo-router';
import { ChevronDown, ChevronUp, Clock, FileCheck, Plus, SearchX, Trash2 } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { AppText, Banner, BottomActionBar, Button, Card, ConfirmDialog, Divider, FieldRow, Screen, Tag, TextField, TopBar } from '@/components/ui';
import { concluirImportacao } from '@/lib/leitura';
import { dietaAtiva, excluirDieta, salvarDieta, valoresDoAlimento } from '@/db/dieta';
import { campo, horaValida, kcal, lerNumero, mascaraHora, num } from '@/lib/formato';
import { chave, rascunhoDieta, type DietaRascunho, type RefeicaoRascunho } from '@/lib/rascunhos';
import { font, radius, space } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

const PADRAO = [
  ['Café da manhã', '07:30'],
  ['Almoço', '12:30'],
  ['Lanche da tarde', '16:00'],
  ['Jantar', '20:00'],
];

function montar(): DietaRascunho {
  const d = dietaAtiva();
  if (!d) return { nome: 'Minha dieta', atual: 0, refeicoes: PADRAO.map(([nome, horario]) => ({ chave: chave(), nome, horario, itens: [] })) };
  return {
    nome: d.nome,
    atual: 0,
    refeicoes: d.refeicoes.map((r) => ({
      chave: chave(),
      id: r.id,
      nome: r.nome,
      horario: r.horario ?? '',
      itens: r.itens.map((i) => ({ chave: chave(), alimento_id: i.alimento_id, nome: i.nome, gramas: campo(i.quantidade_g), kcal100: (i.valores.energia ?? 0) * (100 / i.quantidade_g) })),
    })),
  };
}

/** Cadastro e edição manual da dieta (RF14): refeições, horários, alimentos e quantidades. */
export default function EditarDieta() {
  const { colors } = useTheme();
  // Vindo de uma importação, o rascunho já está pronto; senão, parte da dieta atual.
  const [importacao] = useState(() => {
    const atual = rascunhoDieta.ler();
    if (atual?.importacao) return atual.importacao;
    rascunhoDieta.definir(montar());
    return null;
  });
  const salvoRef = useRef(false);
  const r = rascunhoDieta.useValor();
  const [tentou, setTentou] = useState(false);
  const [apagar, setApagar] = useState(false);
  const existe = !!dietaAtiva();
  useEffect(
    () => () => {
      rascunhoDieta.definir(null);
      if (importacao && !salvoRef.current) concluirImportacao(importacao.id, false);
    },
    [importacao],
  );
  if (!r) return null;

  const mudar = (fn: (d: DietaRascunho) => DietaRascunho) => rascunhoDieta.definir((d) => (d ? fn(d) : d));
  const mudarRef = (k: string, patch: Partial<RefeicaoRascunho>) => mudar((d) => ({ ...d, refeicoes: d.refeicoes.map((x) => (x.chave === k ? { ...x, ...patch } : x)) }));
  const mover = (i: number, dir: -1 | 1) =>
    mudar((d) => {
      const j = i + dir;
      if (j < 0 || j >= d.refeicoes.length) return d;
      const refs = [...d.refeicoes];
      [refs[i], refs[j]] = [refs[j], refs[i]];
      return { ...d, refeicoes: refs };
    });

  // Totais (meta do dia vem da dieta, RF35).
  const tot = { energia: 0, proteina: 0, carboidrato: 0, gordura: 0 };
  for (const ref of r.refeicoes)
    for (const i of ref.itens) {
      const v = valoresDoAlimento(i.alimento_id);
      const g = lerNumero(i.gramas) ?? 0;
      for (const k of Object.keys(tot) as (keyof typeof tot)[]) tot[k] += ((v[k] ?? 0) * g) / 100;
    }

  const invalida = r.refeicoes.some((x) => !x.nome.trim() || (x.horario && !horaValida(x.horario)) || x.itens.some((i) => !(lerNumero(i.gramas)! > 0)));
  const vazia = !r.refeicoes.some((x) => x.itens.length);
  const salvar = () => {
    setTentou(true);
    if (invalida || vazia || !r.nome.trim()) return;
    salvarDieta({
      nome: r.nome.trim(),
      refeicoes: r.refeicoes
        .filter((x) => x.itens.length)
        .map((x) => ({ id: x.id, nome: x.nome.trim(), horario: x.horario || null, itens: x.itens.map((i) => ({ alimento_id: i.alimento_id, quantidade_g: lerNumero(i.gramas)! })) })),
    }, importacao ? { importacao_id: importacao.id } : {});
    salvoRef.current = true;
    if (importacao) {
      concluirImportacao(importacao.id, true);
      router.dismissTo('/dieta');
    } else router.back();
  };

  return (
    <>
      <Screen header={<TopBar title={existe ? 'Editar dieta' : 'Nova dieta'} />} footer={<BottomActionBar primary={{ label: 'Salvar dieta', onPress: salvar }} />}>
        {importacao ? (
          <Banner
            icon={FileCheck}
            tone="neutral"
            title={importacao.via === 'ia' ? 'Dieta lida com IA' : 'Dieta lida no aparelho'}
            message={`Confira alimentos e quantidades antes de salvar. Itens com "Revisar" merecem atenção.${existe ? ' Salvar substitui a sua dieta atual.' : ''}`}
          />
        ) : null}
        {r.naoEncontrados?.length ? (
          <Card gap={space.sm}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
              <SearchX size={18} color={colors.dietStrong} />
              <AppText variant="itemTitle">Não encontrados na base ({r.naoEncontrados.length})</AppText>
            </View>
            <AppText variant="caption" color="textMuted">
              Adicione manualmente com "+ Adicionar alimento" na refeição certa:
            </AppText>
            {r.naoEncontrados.map((n) => (
              <AppText key={n} variant="bodySmall">
                • {n}
              </AppText>
            ))}
          </Card>
        ) : null}
        <TextField label="Nome da dieta" value={r.nome} onChangeText={(v) => mudar((d) => ({ ...d, nome: v }))} warning={tentou && !r.nome.trim()} />
        <Card gap={space.xs}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <AppText variant="bodySmall" color="textMuted" style={{ fontFamily: font.medium }}>
              Total do dia (meta)
            </AppText>
            <AppText style={{ fontFamily: font.bold, fontSize: 17, color: colors.dietStrong }}>{kcal(tot.energia)}</AppText>
          </View>
          <AppText variant="caption" color="textMuted">
            Proteína {num(tot.proteina, 0)} g · Carboidrato {num(tot.carboidrato, 0)} g · Gordura {num(tot.gordura, 0)} g
          </AppText>
        </Card>

        {r.refeicoes.map((ref, n) => (
          <Card key={ref.chave} gap={0}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingBottom: space.sm }}>
              <TextInput
                value={ref.nome}
                onChangeText={(v) => mudarRef(ref.chave, { nome: v })}
                placeholder="Nome da refeição"
                placeholderTextColor={colors.textMuted}
                style={{ flex: 1, minWidth: 0, fontFamily: font.semibold, fontSize: 16, color: colors.text, paddingVertical: 4 }}
              />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: radius.tag, borderWidth: 1, borderColor: tentou && ref.horario && !horaValida(ref.horario) ? colors.dietStrong : colors.track, paddingHorizontal: space.sm }}>
                <Clock size={14} color={colors.textMuted} />
                <TextInput
                  value={ref.horario}
                  onChangeText={(v) => mudarRef(ref.chave, { horario: mascaraHora(v) })}
                  placeholder="--:--"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad"
                  style={{ fontFamily: font.medium, fontSize: 13, color: colors.text, width: 44, paddingVertical: 4 }}
                />
              </View>
              <Pressable accessibilityLabel="Subir" hitSlop={6} onPress={() => mover(n, -1)}>
                <ChevronUp size={18} color={n === 0 ? colors.track : colors.textMuted} />
              </Pressable>
              <Pressable accessibilityLabel="Descer" hitSlop={6} onPress={() => mover(n, 1)}>
                <ChevronDown size={18} color={n === r.refeicoes.length - 1 ? colors.track : colors.textMuted} />
              </Pressable>
              <Pressable accessibilityLabel="Remover refeição" hitSlop={6} onPress={() => mudar((d) => ({ ...d, refeicoes: d.refeicoes.filter((x) => x.chave !== ref.chave) }))}>
                <Trash2 size={18} color={colors.textMuted} />
              </Pressable>
            </View>
            {ref.itens.map((i) => (
              <View key={i.chave}>
                <Divider />
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: space.sm }}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <AppText style={{ fontFamily: font.medium, flexShrink: 1 }}>{i.nome}</AppText>
                      {i.revisar ? <Tag label="Revisar" tone="diet" /> : null}
                    </View>
                    <AppText variant="caption" color="textMuted">
                      {kcal(((lerNumero(i.gramas) ?? 0) * i.kcal100) / 100)}
                      {i.lido ? ` · lido: ${i.lido}` : ''}
                    </AppText>
                  </View>
                  <View style={{ width: 96 }}>
                    <FieldRow>
                      <TextField
                        value={i.gramas}
                        onChangeText={(v) => mudarRef(ref.chave, { itens: ref.itens.map((x) => (x.chave === i.chave ? { ...x, gramas: v } : x)) })}
                        unit="g"
                        keyboardType="decimal-pad"
                        warning={tentou && !(lerNumero(i.gramas)! > 0)}
                      />
                    </FieldRow>
                  </View>
                  <Pressable accessibilityLabel="Remover alimento" hitSlop={6} onPress={() => mudarRef(ref.chave, { itens: ref.itens.filter((x) => x.chave !== i.chave) })}>
                    <Trash2 size={16} color={colors.textMuted} />
                  </Pressable>
                </View>
              </View>
            ))}
            <Divider />
            <Pressable
              onPress={() => {
                mudar((d) => ({ ...d, atual: n }));
                router.push({ pathname: '/dieta/adicionar', params: { destino: 'dieta' } });
              }}
              style={{ paddingTop: space.md }}>
              <AppText variant="button" color="accent">
                + Adicionar alimento
              </AppText>
            </Pressable>
          </Card>
        ))}

        <Pressable
          onPress={() => mudar((d) => ({ ...d, refeicoes: [...d.refeicoes, { chave: chave(), nome: '', horario: '', itens: [] }] }))}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: space.sm }}>
          <Plus size={18} color={colors.accent} />
          <AppText variant="button" color="accent">
            Adicionar refeição
          </AppText>
        </Pressable>
        {tentou && (invalida || vazia) ? (
          <AppText variant="bodySmall" color="dietStrong">
            {vazia ? 'Adicione ao menos um alimento.' : 'Confira nomes, horários (HH:MM) e quantidades.'} Refeições sem alimentos não são salvas.
          </AppText>
        ) : null}
        {existe ? <Button variant="danger" icon={Trash2} label="Excluir dieta" onPress={() => setApagar(true)} /> : null}
      </Screen>
      <ConfirmDialog
        visible={apagar}
        icon={Trash2}
        title="Excluir esta dieta?"
        message="A meta de calorias deixa de vir da dieta. O que você já registrou como consumido continua no histórico."
        confirmLabel="Excluir"
        onCancel={() => setApagar(false)}
        onConfirm={() => {
          setApagar(false);
          excluirDieta();
          router.back();
        }}
      />
    </>
  );
}
