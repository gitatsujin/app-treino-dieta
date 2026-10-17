import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { AppText, BottomActionBar, Card, Checkbox, ChipGroup, Divider, FieldLabel, ListRow, Screen, SegmentedControl, TopBar } from '@/components/ui';
import { hojeIso, useConsulta } from '@/db/conexao';
import { contar, gerarExportacao, type Categoria } from '@/db/exportar';
import { usuario } from '@/db/perfil';
import { salvarArquivos, ultimaExportacao } from '@/lib/exportacao';
import { somarDias } from '@/lib/formato';
import { space } from '@/theme/tokens';

const PERIODOS: Record<string, number | null> = { Tudo: null, 'Últimos 12 meses': 365, 'Últimos 3 meses': 90 };
const ITENS: [Categoria, string, string][] = [
  ['treinos', 'Treinos e aeróbicos', 'Séries, cargas, repetições e aeróbicos'],
  ['dieta', 'Dieta e consumo', 'Plano alimentar e alimentos registrados'],
  ['medidas', 'Medidas', 'Pesagens e exames de bioimpedância'],
  ['metas', 'Metas', 'Ativas e concluídas'],
  ['ciclo', 'Ciclo menstrual', 'Datas, fluxo e sintomas'],
];

/** Exportar meus dados (RF67, portabilidade LGPD). */
export default function ExportarDados() {
  const ciclo = useConsulta(() => !!usuario()?.ciclo_ativo);
  const [inc, setInc] = useState<Record<Categoria, boolean>>({ treinos: true, dieta: true, medidas: true, metas: true, ciclo: false });
  const [periodo, setPeriodo] = useState('Tudo');
  const [formato, setFormato] = useState('Planilhas (CSV)');
  const [erro, setErro] = useState('');
  const dias = PERIODOS[periodo];
  const desde = dias ? somarDias(hojeIso(), -dias) : undefined;
  const contagem = useConsulta(() => Object.fromEntries(ITENS.map(([c]) => [c, contar(c, desde)])) as Record<Categoria, number>, [desde]);
  const escolhidas = ITENS.map(([c]) => c).filter((c) => inc[c] && (c !== 'ciclo' || ciclo));

  const exportar = () => {
    setErro('');
    try {
      const arquivos = gerarExportacao(escolhidas, formato.includes('JSON') ? 'json' : 'csv', desde, hojeIso());
      if (!arquivos.length) {
        setErro('Não há registros nas categorias e no período escolhidos.');
        return;
      }
      ultimaExportacao.definir(salvarArquivos(arquivos));
      router.push('/perfil/exportado');
    } catch {
      setErro('Não foi possível gerar o arquivo. Tente de novo.');
    }
  };

  return (
    <Screen header={<TopBar title="Exportar dados" />} footer={<BottomActionBar primary={{ label: 'Exportar', onPress: exportar, disabled: !escolhidas.length }} />}>
      <Card gap={0}>
        <AppText variant="itemTitle" style={{ paddingBottom: space.xs }}>
          O que incluir
        </AppText>
        {ITENS.map(([k, t, s]) => {
          const off = k === 'ciclo' && !ciclo;
          return (
            <View key={k} style={{ opacity: off ? 0.45 : 1 }}>
              <Divider />
              <ListRow
                title={t}
                subtitle={off ? 'Registro não ativado' : `${s} · ${contagem[k].toLocaleString('pt-BR')} registro${contagem[k] === 1 ? '' : 's'}`}
                trailing={<Checkbox checked={!off && inc[k]} onChange={off ? undefined : (v) => setInc({ ...inc, [k]: v })} />}
              />
            </View>
          );
        })}
      </Card>
      <FieldLabel>Período</FieldLabel>
      <ChipGroup options={Object.keys(PERIODOS)} selected={periodo} onChange={setPeriodo} />
      <FieldLabel>Formato</FieldLabel>
      <SegmentedControl options={['Planilhas (CSV)', 'Completo (JSON)']} selected={formato} onChange={setFormato} />
      <AppText variant="caption" color="textMuted">
        {formato.includes('CSV') ? 'Uma planilha por tipo de registro; abre no Excel ou no Google Planilhas.' : 'Um único arquivo com tudo, inclusive o perfil.'}
      </AppText>
      {erro ? (
        <AppText variant="bodySmall" color="dietStrong">
          {erro}
        </AppText>
      ) : null}
    </Screen>
  );
}
