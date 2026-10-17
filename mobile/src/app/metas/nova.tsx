import { router, useLocalSearchParams } from 'expo-router';
import { Calendar, CalendarDays, ChevronDown, Info, Scale, Utensils } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Halter } from '@/components/icons/Halter';
import { AppText, Banner, BottomActionBar, Card, CounterRow, Divider, FieldLabel, FieldRow, IconTile, ProgressBar, Screen, TextField, TopBar } from '@/components/ui';
import { hojeIso, useConsulta } from '@/db/conexao';
import { metaCaloricaDoDia } from '@/db/dieta';
import { meta, progresso, salvarMeta, type MetaReg, type TipoMeta } from '@/db/metas';
import { pesoAtual } from '@/db/perfil';
import { exercicio, maiorCarga } from '@/db/treino';
import { campo, campoData, lerDataBr, lerNumero, mascaraData, num } from '@/lib/formato';
import { exercicioDaMeta } from '@/lib/rascunhos';
import { font, radius, space, statusColor } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

const TIPOS: [TipoMeta, string, string, LucideIcon, 'training' | 'diet'][] = [
  ['carga', 'Carga', 'Atingir uma carga em um exercício', Halter, 'training'],
  ['frequencia', 'Frequência', 'Treinos e aeróbicos por semana', CalendarDays, 'training'],
  ['peso', 'Peso corporal', 'Chegar a um peso', Scale, 'training'],
  ['dieta', 'Dieta', 'Dias seguidos na dieta', Utensils, 'diet'],
];
const ROTULOS: Record<string, TipoMeta> = { Carga: 'carga', Frequência: 'frequencia', 'Peso corporal': 'peso', Dieta: 'dieta' };

/** Nova meta ou edição (RF12, RF28–RF33). Trocar o tipo troca o formulário na mesma tela. */
export default function NovaMeta() {
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ tipo?: string; exercicio?: string; id?: string }>();
  const ex = params.id ? meta(params.id) : null;
  const [tipo, setTipo] = useState<TipoMeta>(ex?.tipo ?? ROTULOS[params.tipo ?? ''] ?? (params.tipo as TipoMeta) ?? 'carga');
  const [exId, setExId] = useState<string | null>(ex?.exercicio_id ?? params.exercicio ?? null);
  const [carga, setCarga] = useState(campo(ex?.carga_alvo_kg));
  const [treinos, setTreinos] = useState(ex?.treinos_semana ?? 4);
  const [aerobicos, setAerobicos] = useState(ex?.aerobicos_semana ?? 2);
  const [peso, setPeso] = useState(campo(ex?.peso_alvo_kg));
  const [dias, setDias] = useState(campo(ex?.dias_dieta_alvo ?? 14));
  const [prazo, setPrazo] = useState(campoData(ex?.prazo));
  const [tentou, setTentou] = useState(false);
  const hoje = hojeIso();

  // Exercício escolhido na busca.
  const escolhido = exercicioDaMeta.useValor();
  useEffect(() => {
    if (escolhido) {
      setExId(escolhido.id);
      exercicioDaMeta.definir(null);
    }
  }, [escolhido]);

  const info = useConsulta(() => ({ ex: exId ? exercicio(exId) : null, atual: exId ? maiorCarga(exId) : null, peso: pesoAtual()?.peso_kg ?? null, metaKcal: metaCaloricaDoDia() }), [exId]);
  const prazoIso = prazo ? lerDataBr(prazo) : null;
  const erros = {
    ex: tipo === 'carga' && !exId,
    carga: tipo === 'carga' && !(lerNumero(carga)! > 0 && lerNumero(carga)! < 1000),
    freq: tipo === 'frequencia' && treinos + aerobicos === 0,
    peso: tipo === 'peso' && (!(lerNumero(peso)! >= 25 && lerNumero(peso)! <= 350) || !info.peso),
    dias: tipo === 'dieta' && !(Number(dias) >= 1 && Number(dias) <= 365),
    prazo: !!prazo && (!prazoIso || prazoIso <= hoje),
  };

  const entrada = {
    tipo,
    exercicio_id: tipo === 'carga' ? exId : null,
    carga_alvo_kg: tipo === 'carga' ? lerNumero(carga) : null,
    treinos_semana: tipo === 'frequencia' ? treinos || null : null,
    aerobicos_semana: tipo === 'frequencia' ? aerobicos || null : null,
    peso_alvo_kg: tipo === 'peso' ? lerNumero(peso) : null,
    dias_dieta_alvo: tipo === 'dieta' ? Number(dias) || null : null,
    prazo: tipo === 'frequencia' ? null : prazoIso,
  };
  const valida = !Object.values(erros).some(Boolean);
  const previa = valida
    ? progresso({ ...entrada, id: 'previa', data_inicio: ex?.data_inicio ?? hoje, status: 'ativa', atingida_em: null, peso_inicial_kg: ex?.peso_inicial_kg ?? info.peso } as MetaReg, hoje)
    : null;

  const criar = () => {
    setTentou(true);
    if (!valida) return;
    salvarMeta(entrada, ex?.id);
    router.dismissTo('/metas');
  };
  const cal = <Calendar size={18} color={colors.textMuted} />;
  const campoPrazo = (
    <TextField label="Prazo (opcional)" value={prazo} onChangeText={(t) => setPrazo(mascaraData(t))} placeholder="Sem prazo" keyboardType="number-pad" trailing={cal} warning={tentou && erros.prazo} />
  );

  return (
    <Screen header={<TopBar title={ex ? 'Editar meta' : 'Nova meta'} />} footer={<BottomActionBar primary={{ label: ex ? 'Salvar meta' : 'Criar meta', onPress: criar }} />}>
      {!ex ? (
        <>
          <FieldLabel>Tipo de meta</FieldLabel>
          <View style={styles.grid}>
            {TIPOS.map(([t, rot, desc, Icon, tone]) => {
              const on = t === tipo;
              return (
                <Pressable
                  key={t}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                  onPress={() => setTipo(t)}
                  style={[styles.type, { backgroundColor: colors.surface, borderColor: on ? colors.accent : 'transparent' }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                    <IconTile icon={Icon} tone={tone} size={32} />
                    <AppText variant="itemTitle" style={{ fontSize: 14 }}>
                      {rot}
                    </AppText>
                  </View>
                  <AppText variant="caption" color="textMuted">
                    {desc}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </>
      ) : null}

      {tipo === 'carga' ? (
        <>
          <Pressable onPress={() => router.push({ pathname: '/treino/escolher-exercicio', params: { destino: 'meta' } })}>
            <View pointerEvents="none">
              <TextField label="Exercício" value={info.ex?.nome ?? ''} placeholder="Escolher exercício" readonly trailing={<ChevronDown size={18} color={colors.textMuted} />} warning={tentou && erros.ex} />
            </View>
          </Pressable>
          <FieldRow>
            <TextField label="Melhor carga" value={info.atual != null ? num(info.atual) : '—'} unit="kg" readonly />
            <TextField label="Carga alvo" value={carga} onChangeText={setCarga} placeholder="80" unit="kg" keyboardType="decimal-pad" warning={tentou && erros.carga} />
          </FieldRow>
          {campoPrazo}
        </>
      ) : tipo === 'frequencia' ? (
        <>
          <Card gap={14}>
            <CounterRow label="Treinos de musculação" caption="por semana" value={treinos} onChange={(v) => setTreinos(Math.min(v, 14))} />
            <Divider />
            <CounterRow label="Aeróbicos" caption="por semana" value={aerobicos} onChange={(v) => setAerobicos(Math.min(v, 14))} />
          </Card>
          <AppText variant="caption" color={tentou && erros.freq ? 'dietStrong' : 'textMuted'}>
            A semana vai de segunda a domingo e a meta renova automaticamente.
          </AppText>
        </>
      ) : tipo === 'peso' ? (
        <>
          <FieldRow>
            <TextField label="Peso atual" value={info.peso ? num(info.peso) : '—'} unit="kg" readonly />
            <TextField label="Peso alvo" value={peso} onChangeText={setPeso} placeholder="75" unit="kg" keyboardType="decimal-pad" warning={tentou && erros.peso} />
          </FieldRow>
          {campoPrazo}
        </>
      ) : (
        <>
          <TextField label="Dias seguidos na dieta" value={dias} onChangeText={setDias} unit="dias" keyboardType="number-pad" warning={tentou && erros.dias} />
          <Banner
            icon={Info}
            tone="neutral"
            message={
              info.metaKcal.origem === 'dieta' && info.metaKcal.kcal
                ? `Um dia conta quando as calorias ficam dentro de ±7% da meta da dieta: entre ${num(Math.round(info.metaKcal.kcal * 0.93), 0)} e ${num(Math.round(info.metaKcal.kcal * 1.07), 0)} kcal.`
                : 'A sequência conta os dias dentro de ±7% da meta da dieta. Cadastre sua dieta na aba Dieta para começar.'
            }
          />
          {campoPrazo}
        </>
      )}

      {previa ? (
        <Card gap={space.sm}>
          <AppText variant="caption" color="textMuted" style={{ fontFamily: font.medium }}>
            Prévia
          </AppText>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.sm }}>
            <AppText variant="itemTitle" style={{ flex: 1 }}>
              {previa.titulo}
            </AppText>
            <AppText style={{ fontFamily: font.bold, fontSize: 15, color: statusColor(previa.p, colors) }}>{Math.round(previa.p * 100)}%</AppText>
          </View>
          <ProgressBar value={previa.p} max={1} />
          <AppText variant="caption" color="textMuted">
            {previa.frase}
          </AppText>
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  type: { width: '48%', flexGrow: 1, borderRadius: radius.card, padding: space.lg, gap: 6, borderWidth: 2 },
});
