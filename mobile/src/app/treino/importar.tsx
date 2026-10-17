import { router } from 'expo-router';
import { ChevronRight, FileImage, TriangleAlert } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { AppText, Banner, BottomActionBar, Card, Divider, IconTile, ListRow, Screen, Tag, TextField, TopBar } from '@/components/ui';
import { font, space } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

const TREINO_A = [
  ['Supino reto', '4 × 8–10'],
  ['Supino inclinado com halteres', '3 × 10–12'],
  ['Crucifixo na máquina', '3 × 12', 'revisar'],
  ['Tríceps na polia', '3 × 12'],
  ['Tríceps francês', '3 × 10'],
];

/** Revisão da ficha importada por foto ou PDF (RF05–RF07, RN01): nada é salvo sem confirmação. */
export default function ImportarFicha() {
  const { colors } = useTheme();
  return (
    <Screen
      header={<TopBar title="Importar ficha" />}
      footer={<BottomActionBar secondary={{ label: 'Descartar', onPress: () => router.back() }} primary={{ label: 'Salvar plano', onPress: () => router.dismissTo('/treino') }} />}>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.lg }}>
          <IconTile icon={FileImage} size={40} />
          <View style={{ flex: 1, gap: 2 }}>
            <AppText variant="itemTitle">ficha_academia.jpg</AppText>
            <AppText variant="caption" color="textMuted">
              Foto · lida agora
            </AppText>
          </View>
          <Pressable onPress={() => router.push('/dieta/origem')}>
            <AppText variant="button" color="accent">
              Trocar
            </AppText>
          </Pressable>
        </View>
      </Card>
      <Banner icon={TriangleAlert} message="Confira os dados antes de salvar: a leitura automática pode errar. Itens marcados merecem atenção." />
      <TextField label="Nome do plano" value="Plano ABC · Hipertrofia" />
      <Card gap={0}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingBottom: space.sm }}>
          <AppText variant="itemTitle" style={{ fontSize: 16 }}>
            Treino A · Peito e tríceps
          </AppText>
          <AppText variant="caption" color="textMuted">
            5 exercícios
          </AppText>
        </View>
        {TREINO_A.map(([n, s, r]) => (
          <View key={n}>
            <Divider />
            <ListRow title={n} subtitle={s} trailing={r ? <Tag label="Revisar" tone="diet" /> : undefined} chevron />
          </View>
        ))}
      </Card>
      {[
        ['Treino B · Costas e bíceps', '6 exercícios + aeróbico'],
        ['Treino C · Pernas', '6 exercícios'],
      ].map(([t, s]) => (
        <Card key={t}>
          <ListRow title={t} subtitle={s} trailing={<ChevronRight size={16} color={colors.textMuted} />} style={{ paddingVertical: 0 }} />
        </Card>
      ))}
      <AppText variant="caption" color="textMuted" style={{ fontFamily: font.regular }}>
        Toque num exercício para corrigir nome, séries ou repetições.
      </AppText>
    </Screen>
  );
}
