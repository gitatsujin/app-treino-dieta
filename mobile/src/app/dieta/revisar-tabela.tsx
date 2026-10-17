import { router } from 'expo-router';
import { Camera } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { AppText, BottomActionBar, Card, FieldRow, IconTile, Screen, TextField, Toggle, TopBar } from '@/components/ui';
import { font, space } from '@/theme/tokens';

/** Revisão da tabela nutricional lida pela câmera (RF39, RF40). Campos laranja = pouca confiança. */
export default function RevisarTabela() {
  return (
    <Screen header={<TopBar title="Revisar tabela" />} footer={<BottomActionBar primary={{ label: 'Salvar alimento', onPress: () => router.replace('/dieta/escanear') }} />}>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.lg }}>
          <IconTile icon={Camera} tone="diet" size={40} />
          <View style={{ flex: 1, gap: 2 }}>
            <AppText style={{ fontFamily: font.medium, fontSize: 15 }}>Foto da tabela nutricional</AppText>
            <AppText variant="caption" color="dietStrong">
              2 valores lidos com pouca confiança
            </AppText>
          </View>
          <Pressable onPress={() => router.back()}>
            <AppText variant="button" color="accent">
              Trocar
            </AppText>
          </Pressable>
        </View>
      </Card>
      <TextField label="Nome" value="Iogurte natural integral" />
      <TextField label="Marca (opcional)" value="Laticínio Exemplo" />
      <FieldRow>
        <TextField label="Porção" value="170" unit="g" />
        <TextField label="Medida caseira" value="1 pote" />
      </FieldRow>
      <AppText variant="itemTitle">Informação nutricional (por porção)</AppText>
      <FieldRow>
        <TextField label="Calorias" value="112" unit="kcal" />
        <TextField label="Proteína" value="6,5" unit="g" />
      </FieldRow>
      <FieldRow>
        <TextField label="Carboidratos" value="8,6" unit="g" />
        <TextField label="Gorduras" value="5,8" unit="g" />
      </FieldRow>
      <FieldRow>
        <TextField label="Fibras" value="0" unit="g" warning />
        <TextField label="Sódio" value="95" unit="mg" warning />
      </FieldRow>
      <AppText variant="button" color="accent">
        + Adicionar micronutriente
      </AppText>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.lg }}>
          <View style={{ flex: 1, gap: 2 }}>
            <AppText style={{ fontFamily: font.medium, fontSize: 15 }}>Salvar nos meus alimentos</AppText>
            <AppText variant="caption" color="textMuted">
              Fica disponível nas próximas buscas
            </AppText>
          </View>
          <Toggle value />
        </View>
      </Card>
    </Screen>
  );
}
