import { router } from 'expo-router';
import { useState } from 'react';

import { AppText, BottomActionBar, ChipGroup, FieldLabel, Screen, TextField, TopBar } from '@/components/ui';
import { criarExercicio, EQUIPAMENTOS, GRUPOS } from '@/db/treino';
import { exercicioCriado } from '@/lib/rascunhos';

const chaveDe = (mapa: Record<string, string>, rotulo: string) => Object.entries(mapa).find(([, l]) => l === rotulo)![0];

/** Criar exercício próprio (fica só na base do usuário). */
export default function NovoExercicio() {
  const [nome, setNome] = useState('');
  const [grupo, setGrupo] = useState(GRUPOS.peito);
  const [equip, setEquip] = useState(EQUIPAMENTOS.maquina);
  const [tentou, setTentou] = useState(false);
  const salvar = () => {
    setTentou(true);
    if (!nome.trim()) return;
    const id = criarExercicio({ nome: nome.trim(), grupo_muscular: chaveDe(GRUPOS, grupo), equipamento: chaveDe(EQUIPAMENTOS, equip) });
    exercicioCriado.definir({ id, nome: nome.trim() });
    router.back();
  };
  return (
    <Screen header={<TopBar title="Novo exercício" leading="close" />} footer={<BottomActionBar primary={{ label: 'Salvar exercício', onPress: salvar }} />}>
      <TextField label="Nome" value={nome} onChangeText={setNome} placeholder="Ex.: Supino na máquina articulada" autoCapitalize="sentences" warning={tentou && !nome.trim()} />
      <FieldLabel>Grupo muscular</FieldLabel>
      <ChipGroup options={Object.values(GRUPOS)} selected={grupo} onChange={setGrupo} />
      <FieldLabel>Equipamento</FieldLabel>
      <ChipGroup options={Object.values(EQUIPAMENTOS)} selected={equip} onChange={setEquip} />
      <AppText variant="caption" color="textMuted">
        O exercício fica só na sua base e aparece na busca com a etiqueta &quot;Seu&quot;.
      </AppText>
    </Screen>
  );
}
