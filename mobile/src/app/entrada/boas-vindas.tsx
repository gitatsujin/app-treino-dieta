import { router } from 'expo-router';
import { Calendar, Sparkles } from 'lucide-react-native';
import { useState } from 'react';

import { OnboardingSteps } from '@/components/OnboardingSteps';
import { AppText, BottomActionBar, FieldLabel, FieldRow, IconTile, Screen, SegmentedControl, TextField } from '@/components/ui';
import { hojeIso } from '@/db/conexao';
import { pesoAtual, salvarUsuario, usuario } from '@/db/perfil';
import { idade } from '@/lib/calculos';
import { campo, campoData, lerDataBr, lerNumero, mascaraData } from '@/lib/formato';
import { useTheme } from '@/theme/use-theme';

/** Entrada · passo 1: dados do perfil para metas e TMB (RF23, RN08). */
export default function BoasVindas() {
  const { colors } = useTheme();
  const u = usuario();
  const [nome, setNome] = useState(u?.nome ?? '');
  const [nasc, setNasc] = useState(campoData(u?.data_nascimento));
  const [sexo, setSexo] = useState(u?.sexo === 'feminino' ? 'Feminino' : 'Masculino');
  const [altura, setAltura] = useState(campo(u?.altura_cm));
  const [peso, setPeso] = useState(campo(pesoAtual()?.peso_kg));
  const [tentou, setTentou] = useState(false);

  const dataIso = lerDataBr(nasc);
  const anos = dataIso ? idade(dataIso, hojeIso()) : -1;
  const alt = lerNumero(altura);
  const kg = lerNumero(peso);
  const erros = {
    nome: !nome.trim(),
    nasc: !dataIso || anos < 13 || anos > 100,
    altura: !alt || alt < 100 || alt > 250,
    peso: !kg || kg < 25 || kg > 350,
  };
  const valido = !Object.values(erros).some(Boolean);

  const continuar = () => {
    setTentou(true);
    if (!valido) return;
    salvarUsuario({ nome: nome.trim(), data_nascimento: dataIso!, sexo: sexo === 'Feminino' ? 'feminino' : 'masculino', altura_cm: alt!, peso_kg: kg });
    router.push('/entrada/consentimento');
  };

  return (
    <Screen footer={<BottomActionBar primary={{ label: 'Continuar', onPress: continuar }} />}>
      <OnboardingSteps step={1} />
      <IconTile icon={Sparkles} size={52} />
      <AppText variant="screenTitle">Vamos começar</AppText>
      <AppText color="textMuted" style={{ fontSize: 15, lineHeight: 21 }}>
        Precisamos de alguns dados para calcular suas metas e sua taxa metabólica basal.
      </AppText>
      <TextField label="Nome" value={nome} onChangeText={setNome} placeholder="Seu nome" autoCapitalize="words" warning={tentou && erros.nome} />
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
        <TextField label="Altura" value={altura} onChangeText={setAltura} placeholder="170" unit="cm" keyboardType="number-pad" warning={tentou && erros.altura} />
        <TextField label="Peso" value={peso} onChangeText={setPeso} placeholder="70" unit="kg" keyboardType="decimal-pad" warning={tentou && erros.peso} />
      </FieldRow>
      {tentou && !valido ? (
        <AppText variant="bodySmall" color="dietStrong">
          Confira os campos destacados.
        </AppText>
      ) : null}
    </Screen>
  );
}
