import { router } from 'expo-router';
import { Calendar } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { AppText, Avatar, BottomActionBar, Card, FieldLabel, FieldRow, Screen, SegmentedControl, TextField, Toggle, TopBar } from '@/components/ui';
import { hojeIso } from '@/db/conexao';
import { definirCicloAtivo, pesoAtual, salvarUsuario, usuario } from '@/db/perfil';
import { idade } from '@/lib/calculos';
import { campo, campoData, lerDataBr, lerNumero, mascaraData } from '@/lib/formato';
import { font, space } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

/** Editar perfil (RF23). Mudar o peso cria uma nova pesagem com a data de hoje (RN09). */
export default function EditarPerfil() {
  const { colors } = useTheme();
  const u = usuario();
  const [nome, setNome] = useState(u?.nome ?? '');
  const [nasc, setNasc] = useState(campoData(u?.data_nascimento));
  const [sexo, setSexo] = useState(u?.sexo === 'feminino' ? 'Feminino' : 'Masculino');
  const [altura, setAltura] = useState(campo(u?.altura_cm));
  const [peso, setPeso] = useState(campo(pesoAtual()?.peso_kg));
  const [ciclo, setCiclo] = useState(!!u?.ciclo_ativo);
  const [tentou, setTentou] = useState(false);

  const dataIso = lerDataBr(nasc);
  const anos = dataIso ? idade(dataIso, hojeIso()) : -1;
  const alt = lerNumero(altura);
  const kg = lerNumero(peso);
  const erros = { nome: !nome.trim(), nasc: !dataIso || anos < 13 || anos > 100, altura: !alt || alt < 100 || alt > 250, peso: !kg || kg < 25 || kg > 350 };

  const salvar = () => {
    setTentou(true);
    if (Object.values(erros).some(Boolean)) return;
    const fem = sexo === 'Feminino';
    salvarUsuario({ nome: nome.trim(), data_nascimento: dataIso!, sexo: fem ? 'feminino' : 'masculino', altura_cm: alt!, peso_kg: kg });
    if (fem) definirCicloAtivo(ciclo);
    router.back();
  };

  return (
    <Screen header={<TopBar title="Editar perfil" />} footer={<BottomActionBar primary={{ label: 'Salvar', onPress: salvar }} />}>
      <View style={{ alignItems: 'center', gap: space.sm }}>
        <Avatar initial={nome.charAt(0).toUpperCase() || '?'} size={72} />
      </View>
      <TextField label="Nome" value={nome} onChangeText={setNome} autoCapitalize="words" warning={tentou && erros.nome} />
      <TextField
        label="Data de nascimento"
        value={nasc}
        onChangeText={(t) => setNasc(mascaraData(t))}
        placeholder="DD/MM/AAAA"
        keyboardType="number-pad"
        trailing={<Calendar size={18} color={colors.textMuted} />}
        warning={tentou && erros.nasc}
      />
      <FieldLabel>Sexo</FieldLabel>
      <SegmentedControl options={['Masculino', 'Feminino']} selected={sexo} onChange={setSexo} />
      <FieldRow>
        <TextField label="Altura" value={altura} onChangeText={setAltura} unit="cm" keyboardType="number-pad" warning={tentou && erros.altura} />
        <TextField label="Peso" value={peso} onChangeText={setPeso} unit="kg" keyboardType="decimal-pad" warning={tentou && erros.peso} />
      </FieldRow>
      <AppText variant="caption" color="textMuted">
        Alterar o peso aqui cria uma nova pesagem com a data de hoje.
      </AppText>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.lg }}>
          <View style={{ flex: 1, gap: 2 }}>
            <AppText style={{ fontFamily: font.medium, fontSize: 15 }}>Registrar ciclo menstrual</AppText>
            <AppText variant="caption" color="textMuted">
              {sexo === 'Feminino' ? 'Relaciona as fases do ciclo com seus treinos' : 'Disponível para o sexo feminino'}
            </AppText>
          </View>
          <Toggle value={sexo === 'Feminino' && ciclo} disabled={sexo !== 'Feminino'} onChange={setCiclo} />
        </View>
      </Card>
    </Screen>
  );
}
