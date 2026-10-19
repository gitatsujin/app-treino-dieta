import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';

import { AppText, BottomActionBar, Card, FieldRow, Screen, Shortcut, TextField, TopBar } from '@/components/ui';
import { criarAlimento, type Valores } from '@/db/dieta';
import { Camera } from 'lucide-react-native';

import { campo, lerNumero } from '@/lib/formato';
import { concluirImportacao } from '@/lib/leitura';
import { alimentoCriado, rotuloLido } from '@/lib/rascunhos';

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
  // Tabela nutricional lida por foto: preenche o cadastro; o usuário confere antes de salvar (RN01).
  const [lido] = useState(() => {
    const l = rotuloLido.ler();
    rotuloLido.definir(null);
    return l;
  });
  const salvoRef = useRef(false);
  useEffect(
    () => () => {
      if (lido && !salvoRef.current) concluirImportacao(lido.importacaoId, false);
    },
    [lido],
  );
  const R = lido?.dados;
  const [nome, setNome] = useState(p.nome || R?.nome || '');
  const [marca, setMarca] = useState(p.marca || R?.marca || '');
  const [porcao, setPorcao] = useState(R?.porcao_g ? campo(R.porcao_g) : '100');
  const [medida, setMedida] = useState(R?.medida_caseira ?? '');
  const [v, setV] = useState<Record<string, string>>(() => {
    const pp = R?.por_porcao;
    if (!pp) return {};
    const m: Record<string, number | null> = { energia: pp.energia_kcal, proteina: pp.proteina_g, carboidrato: pp.carboidrato_g, gordura: pp.gordura_g, fibra: pp.fibra_g, sodio: pp.sodio_mg };
    return Object.fromEntries(Object.entries(m).filter(([, x]) => x != null).map(([k, x]) => [k, campo(x)]));
  });
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
      fonte: p.codigo || lido ? 'rotulo' : 'manual',
      codigo_barras: p.codigo ?? null,
      porcao_padrao_g: g,
      medida_caseira: medida.trim() || null,
      valores,
    });
    if (lido) {
      salvoRef.current = true;
      concluirImportacao(lido.importacaoId, true);
    }
    alimentoCriado.definir(id);
    router.back();
  };

  return (
    <Screen header={<TopBar title="Novo alimento" subtitle={p.codigo ? `Código ${p.codigo}` : undefined} />} footer={<BottomActionBar primary={{ label: 'Salvar alimento', onPress: salvar }} />}>
      {lido ? (
        <Card>
          <AppText variant="itemTitle">Tabela lida {lido.via === 'ia' ? 'com IA' : 'no aparelho'}</AppText>
          <AppText variant="bodySmall" color="textMuted">
            Confira nome, porção e valores com a embalagem antes de salvar.
          </AppText>
        </Card>
      ) : (
        <Shortcut icon={Camera} label="Fotografar a tabela nutricional" onPress={() => router.replace({ pathname: '/dieta/origem', params: { alvo: 'rotulo', ...(p.codigo ? { codigo: p.codigo } : {}) } })} />
      )}
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
