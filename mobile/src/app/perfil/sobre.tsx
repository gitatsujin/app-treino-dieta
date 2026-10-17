import Constants from 'expo-constants';
import { router } from 'expo-router';
import { Barcode, Calculator, Flame, Utensils } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { View } from 'react-native';

import { Halter } from '@/components/icons/Halter';
import { AppText, Card, Divider, IconTile, ListRow, Screen, TopBar } from '@/components/ui';
import { font, space } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

const FONTES: [LucideIcon, 'diet' | 'training' | 'neutral', string, string][] = [
  [Utensils, 'diet', 'TACO', 'Tabela Brasileira de Composição de Alimentos, 4ª ed. revisada e ampliada · NEPA/UNICAMP, 2011'],
  [Utensils, 'diet', 'Complementos da base', 'Alguns itens sem equivalente na TACO (ex.: whey), com valores médios de rótulos'],
  [Barcode, 'diet', 'Open Food Facts', 'Produtos por código de barras · licença ODbL'],
  [Halter, 'training', 'Exercícios', 'Catálogo próprio do app'],
  [Flame, 'training', 'Compendium of Physical Activities', 'Valores de MET para estimar o gasto'],
  [Calculator, 'neutral', 'Mifflin-St Jeor', 'Fórmula da taxa metabólica basal'],
];

/** Sobre o app: versão, créditos das fontes de dados (exigência do Open Food Facts) e documentos. A seta vai direto ao Perfil. */
export default function Sobre() {
  const { colors } = useTheme();
  return (
    <Screen header={<TopBar title="Sobre o app" onLeadingPress={() => router.dismissTo('/perfil')} />}>
      <View style={{ alignItems: 'center', gap: 6, paddingVertical: space.sm }}>
        <View style={{ width: 72, height: 72, borderRadius: 20, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}>
          <Halter size={36} color={colors.onAccent} />
        </View>
        <AppText style={{ fontFamily: font.bold, fontSize: 20 }}>Treino e Dieta</AppText>
        <AppText variant="bodySmall" color="textMuted">
          {`Versão ${Constants.expoConfig?.version ?? '1.0.0'} (MVP)`}
        </AppText>
      </View>
      <Card gap={0}>
        <AppText variant="itemTitle" style={{ paddingBottom: space.xs }}>
          Fontes de dados
        </AppText>
        {FONTES.map(([Icon, tone, t, s]) => (
          <View key={t}>
            <Divider />
            <ListRow leading={<IconTile icon={Icon} tone={tone} size={36} />} title={t} subtitle={s} />
          </View>
        ))}
      </Card>
      <Card gap={0} style={{ paddingVertical: space.xs }}>
        <ListRow title="Política de privacidade" chevron onPress={() => router.push('/perfil/politica')} />
        <Divider />
        <ListRow title="Termos de uso" chevron onPress={() => router.push('/perfil/termos')} />

      </Card>
      <AppText variant="caption" color="textMuted">
        As informações do app não substituem a orientação de médico, nutricionista ou educador físico.
      </AppText>
    </Screen>
  );
}
