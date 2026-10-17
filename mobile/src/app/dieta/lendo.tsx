import { router } from 'expo-router';
import { Check, FileSearch } from 'lucide-react-native';
import { useEffect } from 'react';
import { Pressable, View } from 'react-native';

import { AppText, Card, IconTile, ProgressBar, Screen, TopBar } from '@/components/ui';
import { font, space } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

/** Lendo arquivo: simula a leitura (OCR) e segue para a revisão. Tocar nas dicas mostra o caso de erro. */
export default function LendoArquivo() {
  const { colors } = useTheme();
  useEffect(() => {
    const t = setTimeout(() => router.replace('/dieta/importar'), 2500);
    return () => clearTimeout(t);
  }, []);
  return (
    <Screen header={<TopBar title="Importar dieta" />}>
      <View style={{ alignItems: 'center', gap: space.md, paddingVertical: space.xxl }}>
        <IconTile icon={FileSearch} tone="diet" size={52} />
        <AppText style={{ fontFamily: font.bold, fontSize: 22 }}>Lendo sua dieta…</AppText>
        <AppText color="textMuted">dieta_nutricionista.pdf · página 2 de 3</AppText>
        <View style={{ alignSelf: 'stretch' }}>
          <ProgressBar value={2} max={3} color={colors.diet} />
        </View>
        <AppText variant="bodySmall" color="textMuted">
          Reconhecendo refeições, alimentos e quantidades
        </AppText>
      </View>
      <Pressable onPress={() => router.replace('/dieta/erro')}>
        <Card gap={space.md}>
          {['Os alimentos são buscados na TBCA', 'Itens que não reconhecermos ficam marcados para revisão', 'Nada é salvo sem a sua confirmação'].map((d) => (
            <View key={d} style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
              <Check size={16} color={colors.accent} />
              <AppText variant="bodySmall" style={{ flex: 1 }}>
                {d}
              </AppText>
            </View>
          ))}
        </Card>
      </Pressable>
    </Screen>
  );
}
