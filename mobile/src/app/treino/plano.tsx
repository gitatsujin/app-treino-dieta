import { router, useLocalSearchParams } from 'expo-router';
import { ChevronDown, ChevronUp, Footprints, Plus, Trash2 } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';

import { AppText, BottomActionBar, BottomSheet, Button, Card, ChipGroup, Divider, FieldLabel, FieldRow, IconTile, Screen, TextField, TopBar } from '@/components/ui';
import { AEROBICOS, letra, planoAtivo, reps, salvarPlano } from '@/db/treino';
import type { TipoAerobico } from '@/lib/calculos';
import { campo, lerNumero } from '@/lib/formato';
import { chave, lerReps, rascunhoPlano, type ItemRascunho, type PlanoRascunho } from '@/lib/rascunhos';
import { font, space } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

function montar(treinoId?: string): PlanoRascunho {
  const p = planoAtivo();
  if (!p || !p.treinos.length) return { nome: p?.nome ?? 'Meu plano', treinos: [{ chave: chave(), nome: '', itens: [] }], atual: 0 };
  return {
    nome: p.nome,
    atual: Math.max(0, p.treinos.findIndex((t) => t.id === treinoId)),
    treinos: p.treinos.map((t) => ({
      chave: chave(),
      id: t.id,
      nome: t.nome,
      itens: t.itens.map((i) => ({
        chave: chave(),
        exercicio_id: i.exercicio_id,
        nome: i.exercicio_nome ?? '',
        tipo_aerobico: i.tipo_aerobico,
        series: campo(i.series_previstas),
        reps: reps(i),
        carga: campo(i.carga_prevista_kg),
        duracao: campo(i.duracao_prevista_min),
      })),
    })),
  };
}

const TIPOS = Object.entries(AEROBICOS) as [TipoAerobico, string][];

/** Cadastro e edição manual do plano (RF04): treinos A, B, C…, exercícios, séries, repetições e carga. */
export default function EditarPlano() {
  const { colors } = useTheme();
  const { treino } = useLocalSearchParams<{ treino?: string }>();
  useState(() => rascunhoPlano.definir(montar(treino)));
  const r = rascunhoPlano.useValor();
  const [aer, setAer] = useState<{ tipo: TipoAerobico; duracao: string } | null>(null);
  const [tentou, setTentou] = useState(false);
  useEffect(() => () => rascunhoPlano.definir(null), []);
  if (!r) return null;

  const t = r.treinos[r.atual] ?? r.treinos[0];
  const mudar = (fn: (p: PlanoRascunho) => PlanoRascunho) => rascunhoPlano.definir((p) => (p ? fn(p) : p));
  const mudarTreino = (patch: Partial<typeof t>) => mudar((p) => ({ ...p, treinos: p.treinos.map((x, i) => (i === p.atual ? { ...x, ...patch } : x)) }));
  const mudarItem = (k: string, patch: Partial<ItemRascunho>) => mudarTreino({ itens: t.itens.map((i) => (i.chave === k ? { ...i, ...patch } : i)) });
  const mover = (k: string, dir: -1 | 1) => {
    const i = t.itens.findIndex((x) => x.chave === k);
    const j = i + dir;
    if (j < 0 || j >= t.itens.length) return;
    const itens = [...t.itens];
    [itens[i], itens[j]] = [itens[j], itens[i]];
    mudarTreino({ itens });
  };

  const invalido = (i: ItemRascunho) =>
    i.tipo_aerobico ? !!i.duracao && !lerNumero(i.duracao) : !(Number(i.series) > 0) || !lerReps(i.reps)[0] || (!!i.carga && lerNumero(i.carga) == null);
  const vazios = r.treinos.filter((x) => !x.itens.length).length;
  const erros = r.treinos.some((x) => x.itens.some(invalido)) || !r.nome.trim();

  const salvar = () => {
    setTentou(true);
    if (erros || vazios) return;
    salvarPlano({
      nome: r.nome.trim(),
      treinos: r.treinos.map((x) => ({
        id: x.id,
        nome: x.nome.trim(),
        itens: x.itens.map((i) => {
          const [mi, ma] = lerReps(i.reps);
          return {
            exercicio_id: i.exercicio_id,
            tipo_aerobico: i.tipo_aerobico,
            series_previstas: i.tipo_aerobico ? null : Number(i.series),
            reps_min: i.tipo_aerobico ? null : mi,
            reps_max: i.tipo_aerobico ? null : ma,
            carga_prevista_kg: lerNumero(i.carga),
            duracao_prevista_min: lerNumero(i.duracao),
          };
        }),
      })),
    });
    router.back();
  };

  const letras = r.treinos.map((_, i) => letra(i));

  return (
    <>
      <Screen header={<TopBar title={planoAtivo() ? 'Editar plano' : 'Novo plano'} />} footer={<BottomActionBar primary={{ label: 'Salvar plano', onPress: salvar }} />}>
        <TextField label="Nome do plano" value={r.nome} onChangeText={(v) => mudar((p) => ({ ...p, nome: v }))} placeholder="Ex.: Plano ABC · Hipertrofia" warning={tentou && !r.nome.trim()} />
        <ChipGroup
          options={[...letras, '+ Treino']}
          selected={letras[r.atual]}
          onChange={(v) =>
            v === '+ Treino'
              ? mudar((p) => ({ ...p, treinos: [...p.treinos, { chave: chave(), nome: '', itens: [] }], atual: p.treinos.length }))
              : mudar((p) => ({ ...p, atual: letras.indexOf(v) }))
          }
        />
        <TextField label={`Nome do treino ${letra(r.atual)}`} value={t.nome} onChangeText={(v) => mudarTreino({ nome: v })} placeholder="Ex.: Peito e tríceps" />

        {t.itens.length ? (
          <Card gap={space.md}>
            {t.itens.map((i, n) => (
              <View key={i.chave} style={{ gap: space.md }}>
                {n > 0 ? <Divider /> : null}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                  {i.tipo_aerobico ? <IconTile icon={Footprints} tone="diet" size={28} /> : null}
                  <AppText variant="itemTitle" style={{ flex: 1 }}>
                    {i.tipo_aerobico ? AEROBICOS[i.tipo_aerobico] : i.nome}
                  </AppText>
                  <Pressable accessibilityLabel="Subir" hitSlop={6} onPress={() => mover(i.chave, -1)} disabled={n === 0}>
                    <ChevronUp size={20} color={n === 0 ? colors.track : colors.textMuted} />
                  </Pressable>
                  <Pressable accessibilityLabel="Descer" hitSlop={6} onPress={() => mover(i.chave, 1)} disabled={n === t.itens.length - 1}>
                    <ChevronDown size={20} color={n === t.itens.length - 1 ? colors.track : colors.textMuted} />
                  </Pressable>
                  <Pressable accessibilityLabel="Remover" hitSlop={6} onPress={() => mudarTreino({ itens: t.itens.filter((x) => x.chave !== i.chave) })}>
                    <Trash2 size={18} color={colors.textMuted} />
                  </Pressable>
                </View>
                {i.tipo_aerobico ? (
                  <TextField label="Duração" value={i.duracao} onChangeText={(v) => mudarItem(i.chave, { duracao: v })} placeholder="20" unit="min" keyboardType="number-pad" />
                ) : (
                  <FieldRow>
                    <TextField label="Séries" value={i.series} onChangeText={(v) => mudarItem(i.chave, { series: v })} keyboardType="number-pad" warning={tentou && !(Number(i.series) > 0)} />
                    <TextField label="Repetições" value={i.reps} onChangeText={(v) => mudarItem(i.chave, { reps: v })} placeholder="10–12" warning={tentou && !lerReps(i.reps)[0]} />
                    <TextField label="Carga" value={i.carga} onChangeText={(v) => mudarItem(i.chave, { carga: v })} placeholder="—" unit="kg" keyboardType="decimal-pad" />
                  </FieldRow>
                )}
              </View>
            ))}
          </Card>
        ) : (
          <Card>
            <AppText color={tentou ? 'dietStrong' : 'textMuted'}>Adicione os exercícios do treino {letra(r.atual)}.</AppText>
          </Card>
        )}

        <Pressable
          onPress={() => router.push({ pathname: '/treino/escolher-exercicio', params: { destino: 'plano' } })}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: space.xs }}>
          <Plus size={18} color={colors.accent} />
          <AppText variant="button" color="accent" style={{ fontFamily: font.semibold }}>
            Adicionar exercício
          </AppText>
        </Pressable>
        {!t.itens.some((i) => i.tipo_aerobico) ? (
          <Pressable onPress={() => setAer({ tipo: 'esteira', duracao: '20' })} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: space.xs }}>
            <Footprints size={18} color={colors.accent} />
            <AppText variant="button" color="accent" style={{ fontFamily: font.semibold }}>
              Adicionar aeróbico ao treino
            </AppText>
          </Pressable>
        ) : null}
        {r.treinos.length > 1 ? (
          <Button
            variant="danger"
            icon={Trash2}
            label={`Remover treino ${letra(r.atual)}`}
            onPress={() => mudar((p) => ({ ...p, treinos: p.treinos.filter((_, i) => i !== p.atual), atual: Math.max(0, p.atual - 1) }))}
          />
        ) : null}
        {tentou && (erros || vazios) ? (
          <AppText variant="bodySmall" color="dietStrong">
            {vazios ? 'Todo treino precisa de ao menos um exercício.' : 'Confira os campos destacados (séries e repetições são obrigatórias).'}
          </AppText>
        ) : null}
      </Screen>

      <BottomSheet visible={!!aer} onClose={() => setAer(null)}>
        <AppText style={{ fontFamily: font.semibold, fontSize: 17 }}>Aeróbico do treino</AppText>
        <FieldLabel>Tipo</FieldLabel>
        <ChipGroup options={TIPOS.map(([, l]) => l)} selected={aer ? AEROBICOS[aer.tipo] : ''} onChange={(l) => setAer((a) => a && { ...a, tipo: TIPOS.find(([, x]) => x === l)![0] })} />
        <TextField label="Duração prevista" value={aer?.duracao} onChangeText={(v) => setAer((a) => a && { ...a, duracao: v })} unit="min" keyboardType="number-pad" />
        <Button
          label="Adicionar"
          onPress={() => {
            if (aer) mudarTreino({ itens: [...t.itens, { chave: chave(), exercicio_id: null, nome: '', tipo_aerobico: aer.tipo, series: '', reps: '', carga: '', duracao: aer.duracao }] });
            setAer(null);
          }}
        />
      </BottomSheet>
    </>
  );
}
