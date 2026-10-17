import { router, useLocalSearchParams } from 'expo-router';
import { Calendar, Droplet, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { AppText, Banner, BottomActionBar, Button, Card, ChipGroup, ConfirmDialog, FieldLabel, FieldRow, Screen, SegmentedControl, TextField, Toggle, TopBar } from '@/components/ui';
import { hojeIso } from '@/db/conexao';
import { ciclos, excluirCiclo, salvarCiclo, SINTOMAS, sintomasDoCiclo } from '@/db/perfil';
import { campoData, lerDataBr, mascaraData } from '@/lib/formato';
import { font, space } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

const FLUXOS: [string, string][] = [
  ['leve', 'Leve'],
  ['moderado', 'Moderado'],
  ['intenso', 'Intenso'],
];

/** Registrar ou editar menstruação: início, fim, fluxo e sintomas (RF52). */
export default function RegistrarMenstruacao() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const ex = id ? ciclos().find((c) => c.id === id) : undefined;
  const [inicio, setInicio] = useState(campoData(ex?.data_inicio ?? hojeIso()));
  const [fim, setFim] = useState(campoData(ex?.data_fim));
  const [andamento, setAndamento] = useState(ex ? !ex.data_fim : true);
  const [fluxo, setFluxo] = useState(FLUXOS.find(([k]) => k === ex?.intensidade_fluxo)?.[1] ?? 'Moderado');
  const [sintomas, setSintomas] = useState<string[]>(ex ? sintomasDoCiclo(ex.id).map((s) => SINTOMAS[s]) : []);
  const [tentou, setTentou] = useState(false);
  const [apagar, setApagar] = useState(false);
  const toggle = (s: string) => setSintomas((x) => (x.includes(s) ? x.filter((y) => y !== s) : [...x, s]));
  const cal = <Calendar size={18} color={colors.textMuted} />;

  const ini = lerDataBr(inicio);
  const f = andamento ? null : lerDataBr(fim);
  const erros = { inicio: !ini || ini > hojeIso(), fim: !andamento && (!f || (ini != null && f < ini) || f > hojeIso()) };
  const salvar = () => {
    setTentou(true);
    if (erros.inicio || erros.fim) return;
    salvarCiclo(
      {
        data_inicio: ini!,
        data_fim: f,
        intensidade_fluxo: FLUXOS.find(([, l]) => l === fluxo)![0],
        sintomas: sintomas.map((l) => Object.entries(SINTOMAS).find(([, x]) => x === l)![0]),
      },
      ex?.id,
    );
    router.back();
  };

  return (
    <>
      <Screen header={<TopBar title="Menstruação" leading="close" />} footer={<BottomActionBar primary={{ label: 'Salvar', onPress: salvar }} />}>
        <FieldRow>
          <TextField label="Início" value={inicio} onChangeText={(t) => setInicio(mascaraData(t))} keyboardType="number-pad" trailing={cal} warning={tentou && erros.inicio} />
          {andamento ? (
            <TextField label="Fim" placeholder="Em andamento" readonly trailing={cal} />
          ) : (
            <TextField label="Fim" value={fim} onChangeText={(t) => setFim(mascaraData(t))} placeholder="DD/MM/AAAA" keyboardType="number-pad" trailing={cal} warning={tentou && erros.fim} />
          )}
        </FieldRow>
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.lg }}>
            <View style={{ flex: 1, gap: 2 }}>
              <AppText style={{ fontFamily: font.medium, fontSize: 15 }}>Ainda estou menstruada</AppText>
              <AppText variant="caption" color="textMuted">
                Você informa o fim depois
              </AppText>
            </View>
            <Toggle value={andamento} onChange={setAndamento} />
          </View>
        </Card>
        <FieldLabel>Intensidade do fluxo</FieldLabel>
        <SegmentedControl options={FLUXOS.map(([, l]) => l)} selected={fluxo} onChange={setFluxo} />
        <FieldLabel>Sintomas (opcional)</FieldLabel>
        <ChipGroup options={Object.values(SINTOMAS)} selected={sintomas} onChange={toggle} />
        <Banner icon={Droplet} tone="neutral" message="A próxima menstruação é prevista pela média dos seus ciclos registrados." />
        {ex ? <Button variant="danger" icon={Trash2} label="Excluir registro" onPress={() => setApagar(true)} /> : null}
      </Screen>
      <ConfirmDialog
        visible={apagar}
        icon={Trash2}
        title="Excluir este registro?"
        message="O ciclo sai do histórico e a previsão é recalculada. Essa ação não pode ser desfeita."
        confirmLabel="Excluir"
        onCancel={() => setApagar(false)}
        onConfirm={() => {
          setApagar(false);
          if (ex) excluirCiclo(ex.id);
          router.back();
        }}
      />
    </>
  );
}
