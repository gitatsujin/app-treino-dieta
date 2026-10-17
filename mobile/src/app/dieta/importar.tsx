import { router } from 'expo-router';
import { ChevronRight, FileText, TriangleAlert } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { AppText, Banner, BottomActionBar, Card, Divider, IconTile, ListRow, Screen, Tag, TextField, TopBar } from '@/components/ui';
import { font, space } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

/** Revisão da dieta importada (RF15–RF17, RN01). */
export default function ImportarDieta() {
  const { colors } = useTheme();
  return (
    <Screen
      header={<TopBar title="Importar dieta" />}
      footer={<BottomActionBar secondary={{ label: 'Descartar', onPress: () => router.dismissTo('/dieta') }} primary={{ label: 'Salvar dieta', onPress: () => router.dismissTo('/dieta') }} />}>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.lg }}>
          <IconTile icon={FileText} tone="diet" size={40} />
          <View style={{ flex: 1, gap: 2 }}>
            <AppText variant="itemTitle">dieta_nutricionista.pdf</AppText>
            <AppText variant="caption" color="textMuted">
              PDF · 3 páginas · lido agora
            </AppText>
          </View>
          <Pressable onPress={() => router.push('/dieta/origem')}>
            <AppText variant="button" color="accent">
              Trocar
            </AppText>
          </Pressable>
        </View>
      </Card>
      <Banner icon={TriangleAlert} message="Confira os alimentos e quantidades antes de salvar. Itens marcados não foram lidos com certeza." />
      <TextField label="Nome da dieta" value="Plano Hipertrofia" />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <AppText style={{ fontFamily: font.medium }}>5 refeições</AppText>
        <AppText variant="button" style={{ color: colors.dietStrong }}>
          2.300 kcal por dia (TBCA)
        </AppText>
      </View>
      <Card gap={0}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingBottom: space.sm }}>
          <AppText variant="itemTitle" style={{ fontSize: 16 }}>
            Café da manhã · 07:30
          </AppText>
          <AppText variant="button" color="textMuted" style={{ fontSize: 13 }}>
            480 kcal
          </AppText>
        </View>
        {[
          ['Pão integral', '2 fatias (50 g)', '125 kcal'],
          ['Ovos mexidos', '2 unidades (100 g)', '180 kcal'],
          ['Tapioca', '2 colheres (?)', ''],
          ['Café com leite', '200 ml', '120 kcal'],
        ].map(([n, q, k]) => (
          <View key={n}>
            <Divider />
            <ListRow
              title={n}
              subtitle={q}
              trailing={
                k ? (
                  <AppText variant="bodySmall" color="textMuted" style={{ fontFamily: font.medium }}>
                    {k}
                  </AppText>
                ) : (
                  <Tag label="Revisar" tone="diet" />
                )
              }
            />
          </View>
        ))}
      </Card>
      <Card gap={0} style={{ paddingVertical: space.xs }}>
        {[
          ['Lanche da manhã · 10:00', '350 kcal'],
          ['Almoço · 12:30', '720 kcal'],
          ['Lanche da tarde · 16:00', '320 kcal'],
          ['Jantar · 20:00', '430 kcal'],
        ].map(([n, k], i) => (
          <View key={n}>
            {i > 0 ? <Divider /> : null}
            <ListRow
              title={n}
              trailing={
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <AppText variant="bodySmall" color="textMuted" style={{ fontFamily: font.medium }}>
                    {k}
                  </AppText>
                  <ChevronRight size={16} color={colors.textMuted} />
                </View>
              }
            />
          </View>
        ))}
      </Card>
    </Screen>
  );
}
