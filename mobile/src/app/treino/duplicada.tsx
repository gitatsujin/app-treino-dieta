import { router } from 'expo-router';
import { Watch } from 'lucide-react-native';
import { Modal, StyleSheet, View } from 'react-native';

import { AppText, Button, DateBadge, IconTile, ListCard, ListRow, Screen, TopBar } from '@/components/ui';
import { font, radius, space } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

/** Atividade duplicada (RN13): o relógio tem prioridade, mas o usuário escolhe. */
export default function AtividadeDuplicada() {
  const { colors } = useTheme();
  const fechar = () => router.replace('/treino/historico');
  return (
    <Screen header={<TopBar title="Histórico" />}>
      <ListCard>
        {[
          <ListRow key="1" leading={<DateBadge weekday="QUA" day="14" tone="diet" />} title="Corrida na rua" subtitle="30 min · 5,0 km · manual" trailing={<AppText variant="button">330 kcal</AppText>} />,
          <ListRow key="2" leading={<DateBadge weekday="TER" day="13" />} title="Treino B · Costas e bíceps" subtitle="56 min · 6 exercícios" trailing={<AppText variant="button">11.840 kg</AppText>} />,
        ]}
      </ListCard>
      <Modal visible transparent animationType="fade" onRequestClose={fechar}>
        <View style={styles.scrim}>
          <View style={[styles.dialog, { backgroundColor: colors.surface }]}>
            <IconTile icon={Watch} tone="diet" size={52} />
            <AppText style={{ fontFamily: font.bold, fontSize: 20 }}>Atividade duplicada</AppText>
            <AppText color="textMuted" style={{ textAlign: 'center', lineHeight: 20 }}>
              Seu relógio registrou uma corrida às 18:32 que coincide com o aeróbico que você salvou. Por padrão, ficam os dados do relógio.
            </AppText>
            <View style={{ flexDirection: 'row', gap: space.md, alignSelf: 'stretch' }}>
              {[
                ['Relógio', '31 min · 5,2 km', '342 kcal'],
                ['Seu registro', '30 min · 5,0 km', '330 kcal'],
              ].map(([t, a, b]) => (
                <View key={t} style={[styles.cmp, { backgroundColor: colors.track }]}>
                  <AppText variant="caption" color="textMuted" style={{ fontFamily: font.medium }}>
                    {t}
                  </AppText>
                  <AppText variant="button">{a}</AppText>
                  <AppText variant="caption" color="textMuted">
                    {b}
                  </AppText>
                </View>
              ))}
            </View>
            <Button label="Usar meu registro" onPress={fechar} style={{ alignSelf: 'stretch' }} />
            <Button variant="secondary" label="Manter dados do relógio" onPress={fechar} style={{ alignSelf: 'stretch' }} />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', padding: space.xxl },
  dialog: { width: '100%', maxWidth: 342, borderRadius: 24, padding: space.xxl, alignItems: 'center', gap: space.lg },
  cmp: { flex: 1, borderRadius: radius.button - 2, padding: space.md, gap: 2 },
});
