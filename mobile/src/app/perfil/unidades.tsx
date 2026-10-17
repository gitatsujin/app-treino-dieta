import { View } from 'react-native';

import { AppText, Card, Divider, ListRow, Screen, TopBar } from '@/components/ui';
import { space } from '@/theme/tokens';

/** Unidades: o MVP usa o sistema métrico (o banco guarda kg, cm, km e kcal). Outras unidades ficam para depois. */
export default function Unidades() {
  const linhas = [
    ['Peso', 'kg'],
    ['Altura e medidas', 'cm'],
    ['Distância', 'km'],
    ['Energia', 'kcal'],
  ];
  return (
    <Screen header={<TopBar title="Unidades" />}>
      <Card gap={0} style={{ paddingVertical: space.xs }}>
        {linhas.map(([l, u], i) => (
          <View key={l}>
            {i > 0 ? <Divider /> : null}
            <ListRow title={l} trailing={<AppText variant="itemTitle">{u}</AppText>} />
          </View>
        ))}
      </Card>
      <AppText variant="caption" color="textMuted">
        Nesta versão o app usa o sistema métrico. Libras, polegadas, milhas e kJ chegam numa próxima versão, só mudando a forma de exibir.
      </AppText>
    </Screen>
  );
}
