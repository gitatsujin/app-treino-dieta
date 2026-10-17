import { router } from 'expo-router';
import { FileWarning, Lightbulb } from 'lucide-react-native';
import { View } from 'react-native';

import { AppText, ButtonRow, Card, IconTile, Screen, TopBar } from '@/components/ui';
import { font, space } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

/** Erro na leitura do arquivo importado. */
export default function ErroLeitura() {
  const { colors } = useTheme();
  return (
    <Screen header={<TopBar title="Importar dieta" />}>
      <View style={{ alignItems: 'center', gap: space.md, paddingVertical: space.xxl }}>
        <IconTile icon={FileWarning} tone="neutral" size={52} />
        <AppText style={{ fontFamily: font.bold, fontSize: 20 }}>Não conseguimos ler o arquivo</AppText>
        <AppText color="textMuted" style={{ textAlign: 'center' }}>
          A foto está desfocada ou o texto ficou pequeno demais para reconhecer.
        </AppText>
      </View>
      <Card gap={space.md}>
        <AppText variant="itemTitle">Para uma leitura melhor</AppText>
        {['Fotografe em um lugar bem iluminado', 'Enquadre só a folha, sem cortar as bordas', 'Se tiver o PDF original, prefira enviá-lo'].map((d) => (
          <View key={d} style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
            <Lightbulb size={16} color={colors.dietStrong} />
            <AppText variant="bodySmall" style={{ flex: 1 }}>
              {d}
            </AppText>
          </View>
        ))}
      </Card>
      <ButtonRow secondary={{ label: 'Tentar outra foto', onPress: () => router.replace('/dieta/origem') }} primary={{ label: 'Cadastrar manualmente', onPress: () => router.replace('/dieta/editar') }} />
    </Screen>
  );
}
