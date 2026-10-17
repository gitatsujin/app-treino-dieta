import { Check, Heart, Watch } from 'lucide-react-native';
import { Platform, View } from 'react-native';

import { AppText, Card, Divider, IconTile, ListRow, Screen, Tag, TopBar } from '@/components/ui';
import { font, space } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

/**
 * Integração com o Apple Saúde / Health Connect (RF44, RF45, RF55). Depende de módulos nativos que não
 * rodam no Expo Go: entra com a versão instalável do app (build próprio). Até lá o gasto é estimado (RF46).
 */
export default function AppleSaude() {
  const { colors } = useTheme();
  const nome = Platform.OS === 'android' ? 'Health Connect' : 'Apple Saúde';
  return (
    <Screen header={<TopBar title={nome} subtitle="Integração" />}>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.lg }}>
          <IconTile icon={Heart} tone="diet" />
          <View style={{ flex: 1, gap: 2 }}>
            <AppText style={{ fontFamily: font.semibold, fontSize: 17 }}>Em breve</AppText>
            <AppText variant="caption" color="textMuted">
              Chega na versão instalável do app
            </AppText>
          </View>
          <Tag label="Não conectado" />
        </View>
      </Card>
      <Card gap={0}>
        <AppText variant="itemTitle" style={{ paddingBottom: space.xs }}>
          Quando conectar, o app vai ler
        </AppText>
        {[
          ['Treinos e atividades', 'Inclui os do relógio'],
          ['Energia ativa', 'Deixa o gasto do dia mais preciso'],
          ['Peso', 'Entra no histórico de pesagens'],
          ['Ciclo menstrual', 'Só se o registro do ciclo estiver ativo'],
        ].map(([t, s]) => (
          <View key={t}>
            <Divider />
            <ListRow title={t} subtitle={s} trailing={<Check size={18} color={colors.textMuted} />} />
          </View>
        ))}
      </Card>
      <Card gap={space.sm}>
        <ListRow leading={<IconTile icon={Watch} tone="neutral" size={36} />} title="Relógios" subtitle="Apple Watch, Galaxy Watch, Garmin e outros que gravam no app de saúde" style={{ paddingVertical: 0 }} />
        <AppText variant="caption" color="textMuted">
          Enquanto isso, o gasto dos treinos e aeróbicos é estimado pelo app com a tabela de METs (Compendium of Physical Activities).
        </AppText>
      </Card>
    </Screen>
  );
}
