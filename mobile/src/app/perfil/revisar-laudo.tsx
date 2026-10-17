import { router } from 'expo-router';
import { Calendar, FileImage, TriangleAlert } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { AppText, Banner, BottomActionBar, Card, FieldRow, IconTile, Screen, TextField, TopBar } from '@/components/ui';
import { space } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

/** Revisar laudo de bioimpedância lido por foto ou PDF (RF50, RN01). */
export default function RevisarLaudo() {
  const { colors } = useTheme();
  return (
    <Screen
      header={<TopBar title="Revisar laudo" subtitle="Bioimpedância" />}
      footer={<BottomActionBar secondary={{ label: 'Descartar', onPress: () => router.back() }} primary={{ label: 'Salvar exame', onPress: () => router.dismissTo('/perfil') }} />}>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.lg }}>
          <IconTile icon={FileImage} size={40} />
          <View style={{ flex: 1, gap: 2 }}>
            <AppText variant="itemTitle">laudo_omron_16-10.jpg</AppText>
            <AppText variant="caption" color="textMuted">
              Foto · 9 de 9 medidas lidas
            </AppText>
          </View>
          <Pressable onPress={() => router.back()}>
            <AppText variant="button" color="accent">
              Trocar
            </AppText>
          </Pressable>
        </View>
      </Card>
      <Banner icon={TriangleAlert} message="Confira os valores. Os 2 campos marcados foram lidos com pouca confiança." />
      <TextField label="Data do exame" value="16/10/2026" trailing={<Calendar size={18} color={colors.textMuted} />} />
      <FieldRow>
        <TextField label="Peso" value="78,4" unit="kg" />
        <TextField label="Cintura" value="84" unit="cm" warning />
      </FieldRow>
      <FieldRow>
        <TextField label="Gordura corporal" value="18,2" unit="%" />
        <TextField label="Músculo esquelético" value="38,1" unit="%" />
      </FieldRow>
      <FieldRow>
        <TextField label="Gordura visceral" value="7" unit="nível" warning />
        <TextField label="Idade biológica" value="22" unit="anos" />
      </FieldRow>
      <FieldRow>
        <TextField label="Metabolismo em repouso" value="1.780" unit="kcal" />
        <TextField label="IMC (calculado)" value="24,7" readonly />
      </FieldRow>
      <AppText variant="caption" color="textMuted">
        O IMC é calculado pelo app com o peso e a altura do perfil.
      </AppText>
    </Screen>
  );
}
