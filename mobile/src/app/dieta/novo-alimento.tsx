import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { AppText, BottomActionBar, FieldRow, Screen, TextField, TopBar } from '@/components/ui';
import { criarAlimento, type Valores } from '@/db/dieta';
import { lerNumero } from '@/lib/formato';
import { alimentoCriado } from '@/lib/rascunhos';

const CAMPOS: [id: string, rotulo: string, unidade: string][] = [
  ['energia', 'Calorias', 'kcal'],
  ['proteina', 'Proteína', 'g'],
  ['carboidrato', 'Carboidratos', 'g'],
  ['gordura', 'Gorduras', 'g'],
  ['fibra', 'Fibras', 'g'],
  ['sodio', 'Sódio', 'mg'],
];

/**
 * Cadastrar alimento manualmente ou a partir do rótulo (RF39, RF40). Os valores são digitados por porção,
 * como aparecem na embalagem, e gravados por 100 g. Com ?codigo, o alimento fica ligado ao código de barras.
 */
export default function NovoAlimento() {
  const p = useLocalSearchParams<{ codigo?: string; nome?: string; marca?: string }>();
  const [nome, setNome] = useState(p.nome ?? '');
  const [marca, setMarca] = useState(p.marca ?? '');
  const [porcao, setPorcao] = useState('100');
  const [medida, setMedida] = useState('');
  const [v, setV] = useState<Record<string, string>>({});
  const [tentou, setTentou] = useState(false);

  const g = lerNumero(porcao);
  const kcal = lerNumero(v.energia);
  const erros = { nome: !nome.trim(), porcao: !g || g <= 0, kcal: kcal == null || kcal < 0 };

  const salvar = () => {
    setTentou(true);
    if (Object.values(erros).some(Boolean)) return;
    const valores: Valores = {};
    for (const [id] of CAMPOS) {
      const x = lerNumero(v[id]);
      if (x != null && x >= 0) valores[id] = (x * 100) / g!;
    }
    const id = criarAlimento({
      nome: nome.trim(),
      marca: marca.trim() || null,
      fonte: p.codigo ? 'rotulo' : 'manual',
      codigo_barras: p.codigo ?? null,
      porcao_padrao_g: g,
      medida_caseira: medida.trim() || null,
      valores,
    });
    alimentoCriado.definir(id);
    router.back();
  };

  return (
    <Screen header={<TopBar title="Novo alimento" subtitle={p.codigo ? `Código ${p.codigo}` : undefined} />} footer={<BottomActionBar primary={{ label: 'Salvar alimento', onPress: salvar }} />}>
      <TextField label="Nome" value={nome} onChangeText={setNome} placeholder="Ex.: Pão de queijo caseiro" autoCapitalize="sentences" warning={tentou && erros.nome} />
      <TextField label="Marca (opcional)" value={marca} onChangeText={setMarca} placeholder="Ex.: nome do fabricante" />
      <FieldRow>
        <TextField label="Porção" value={porcao} onChangeText={setPorcao} unit="g" keyboardType="decimal-pad" warning={tentou && erros.porcao} />
        <TextField label="Medida caseira" value={medida} onChangeText={setMedida} placeholder="1 unidade" />
      </FieldRow>
      <AppText variant="itemTitle">Informação nutricional (por porção)</AppText>
      {[0, 2, 4].map((i) => (
        <FieldRow key={i}>
          {CAMPOS.slice(i, i + 2).map(([id, rot, un]) => (
            <TextField
              key={id}
              label={rot}
              value={v[id] ?? ''}
              onChangeText={(t) => setV((x) => ({ ...x, [id]: t }))}
              placeholder="0"
              unit={un}
              keyboardType="decimal-pad"
              warning={tentou && id === 'energia' && erros.kcal}
            />
          ))}
        </FieldRow>
      ))}
      <AppText variant="caption" color="textMuted">
        Copie os valores da tabela nutricional da embalagem. O alimento fica salvo nos seus alimentos para as próximas buscas.
      </AppText>
    </Screen>
  );
}
