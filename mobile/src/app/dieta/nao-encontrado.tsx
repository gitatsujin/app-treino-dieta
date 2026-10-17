import { router, useLocalSearchParams } from 'expo-router';
import { Pencil, ScanBarcode, Search } from 'lucide-react-native';
import { View } from 'react-native';

import { AppText, BottomActionBar, Card, Divider, IconTile, ListRow, Screen, Tag, TopBar } from '@/components/ui';
import { font, space } from '@/theme/tokens';

/** Produto não encontrado no Open Food Facts. */
export default function ProdutoNaoEncontrado() {
  const { codigo } = useLocalSearchParams<{ codigo?: string }>();
  const cadastrar = () => router.replace({ pathname: '/dieta/novo-alimento', params: codigo ? { codigo } : {} });
  return (
    <Screen
      header={<TopBar title="Escanear" />}
      footer={<BottomActionBar secondary={{ label: 'Escanear outro', onPress: () => router.replace('/dieta/escanear') }} primary={{ label: 'Cadastrar produto', onPress: cadastrar }} />}>
      <View style={{ alignItems: 'center', gap: space.sm, paddingTop: space.xxl }}>
        <IconTile icon={ScanBarcode} tone="neutral" size={52} />
        <AppText style={{ fontFamily: font.bold, fontSize: 20 }}>Produto não encontrado</AppText>
        <AppText color="textMuted" style={{ textAlign: 'center' }}>
          {codigo ? `O código ${codigo} não está no Open Food Facts.` : 'O produto não está no Open Food Facts.'} Você pode cadastrar o produto de outro jeito.
        </AppText>
      </View>
      <Card gap={0} style={{ paddingVertical: space.xs }}>
        <ListRow leading={<IconTile icon={Pencil} tone="diet" size={36} />} title="Cadastrar com a tabela da embalagem" subtitle="Digite os valores; o código fica ligado ao produto" trailing={<Tag label="Recomendado" tone="diet" />} onPress={cadastrar} />
        <Divider />
        <ListRow leading={<IconTile icon={Search} tone="neutral" size={36} />} title="Buscar na base do app" subtitle="Para alimentos sem marca, como frutas e arroz" chevron onPress={() => router.replace('/dieta/adicionar')} />
      </Card>
      <AppText variant="caption" color="textMuted">
        O produto cadastrado fica salvo na sua base para a próxima vez.
      </AppText>
    </Screen>
  );
}
