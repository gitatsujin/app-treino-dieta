import { router } from 'expo-router';
import { Calendar, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { GraficoLinha } from '@/components/Grafico';
import { AppText, BottomActionBar, Card, Divider, FieldRow, Screen, SegmentedControl, TextField, TopBar } from '@/components/ui';
import { hojeIso, useConsulta } from '@/db/conexao';
import { excluirPeso, pesoAtual, pesos, registrarPeso } from '@/db/perfil';
import { campo, campoData, dataCompleta, dataCurta, diasEntre, lerDataBr, lerNumero, mascaraData, num, somarDias } from '@/lib/formato';
import { font, space } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

const PERIODOS: Record<string, number> = { '1M': 30, '3M': 90, '6M': 182, '1A': 365 };
const sinal = (x: number) => (Math.abs(x) < 0.05 ? '0,0 kg' : `${x > 0 ? '+' : '−'}${num(Math.abs(x))} kg`);

/** Peso corporal: evolução, nova pesagem e histórico (RF31). */
export default function RegistrarPeso() {
  const { colors } = useTheme();
  const hoje = hojeIso();
  const [periodo, setPeriodo] = useState('3M');
  const lista = useConsulta(() => pesos());
  const [valor, setValor] = useState(campo(pesoAtual()?.peso_kg));
  const [data, setData] = useState(campoData(hoje));
  const [tentou, setTentou] = useState(false);

  const desde = somarDias(hoje, -PERIODOS[periodo]);
  const noPeriodo = [...lista].filter((p) => p.data >= desde).reverse();
  const atual = lista[0];
  const semana = lista.find((p) => diasEntre(p.data, hoje) >= 7);
  const primeiro = lista[lista.length - 1];
  const kg = lerNumero(valor);
  const dataIso = lerDataBr(data);
  const erros = { kg: !kg || kg < 25 || kg > 350, data: !dataIso || dataIso > hoje };

  const salvar = () => {
    setTentou(true);
    if (erros.kg || erros.data) return;
    registrarPeso(kg!, dataIso!);
    router.back();
  };

  return (
    <Screen header={<TopBar title="Peso" />} footer={<BottomActionBar primary={{ label: 'Salvar peso', onPress: salvar }} />}>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
          <AppText style={{ fontFamily: font.bold, fontSize: 34 }}>{atual ? num(atual.peso_kg) : '—'}</AppText>
          <AppText color="textMuted" style={{ fontSize: 15 }}>
            kg
          </AppText>
        </View>
        {atual ? (
          <AppText variant="bodySmall" color="textMuted">
            {[semana ? `${sinal(atual.peso_kg - semana.peso_kg)} na semana` : '', primeiro && primeiro !== atual ? `${sinal(atual.peso_kg - primeiro.peso_kg)} desde ${dataCurta(primeiro.data)}` : '']
              .filter(Boolean)
              .join(' · ') || `Registrado em ${dataCurta(atual.data)}`}
          </AppText>
        ) : null}
        <SegmentedControl options={Object.keys(PERIODOS)} selected={periodo} onChange={setPeriodo} />
        {noPeriodo.length >= 2 ? (
          <GraficoLinha valores={noPeriodo.map((p) => p.peso_kg)} datas={noPeriodo.map((p) => p.data)} />
        ) : (
          <AppText variant="bodySmall" color="textMuted">
            O gráfico aparece a partir de duas pesagens no período.
          </AppText>
        )}
      </Card>
      <Card>
        <AppText variant="itemTitle">Registrar pesagem</AppText>
        <FieldRow>
          <TextField label="Peso" value={valor} onChangeText={setValor} unit="kg" keyboardType="decimal-pad" warning={tentou && erros.kg} />
          <TextField label="Data" value={data} onChangeText={(t) => setData(mascaraData(t))} keyboardType="number-pad" trailing={<Calendar size={18} color={colors.textMuted} />} warning={tentou && erros.data} />
        </FieldRow>
      </Card>
      {lista.length ? (
        <Card gap={0} style={{ paddingVertical: space.xs }}>
          {lista.slice(0, 30).map((p, i) => {
            const anterior = lista[i + 1];
            return (
              <View key={p.id}>
                {i > 0 ? <Divider /> : null}
                <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: space.md, gap: space.lg }}>
                  <View style={{ flex: 1 }}>
                    <AppText color="textMuted">{dataCompleta(p.data)}</AppText>
                    {p.origem === 'bioimpedancia' ? (
                      <AppText variant="caption" color="textMuted">
                        pela bioimpedância
                      </AppText>
                    ) : null}
                  </View>
                  <AppText variant="itemTitle">{num(p.peso_kg)} kg</AppText>
                  <AppText variant="caption" color="textMuted" style={{ fontFamily: font.medium, width: 52, textAlign: 'right' }}>
                    {anterior ? sinal(p.peso_kg - anterior.peso_kg) : ''}
                  </AppText>
                  {p.origem === 'manual' ? (
                    <Pressable accessibilityLabel="Excluir pesagem" hitSlop={8} onPress={() => excluirPeso(p.id)}>
                      <Trash2 size={16} color={colors.textMuted} />
                    </Pressable>
                  ) : (
                    <View style={{ width: 16 }} />
                  )}
                </View>
              </View>
            );
          })}
        </Card>
      ) : null}
    </Screen>
  );
}
