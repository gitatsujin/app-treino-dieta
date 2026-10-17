import { router } from 'expo-router';
import { Check, Heart, Info, Watch } from 'lucide-react-native';
import { View } from 'react-native';

import { OnboardingSteps } from '@/components/OnboardingSteps';
import { AppText, Banner, BottomActionBar, IconTile, Screen } from '@/components/ui';
import { space } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

/** Entrada · passo 3: Apple Saúde / Health Connect (RF44, RF45). A conexão chega no app instalável (fora do Expo Go). */
export default function ConectarSaude() {
  const { colors } = useTheme();
  const entrar = () => {
    if (router.canDismiss()) router.dismissAll();
    router.replace('/');
  };
  return (
    <Screen footer={<BottomActionBar primary={{ label: 'Começar a usar', onPress: entrar }} />}>
      <OnboardingSteps step={3} />
      <View style={{ flexDirection: 'row', gap: space.sm }}>
        <IconTile icon={Heart} tone="diet" size={52} />
        <IconTile icon={Watch} size={52} />
      </View>
      <AppText variant="screenTitle">Conecte seu relógio</AppText>
      <AppText color="textMuted" style={{ fontSize: 15, lineHeight: 21 }}>
        Com o Apple Saúde ou o Health Connect, os dados do seu relógio entram no app automaticamente.
      </AppText>
      <View style={{ gap: space.md }}>
        {['Treinos e caminhadas do relógio entram sozinhos', 'Gasto calórico mais preciso no balanço do dia', 'Sem registro em dobro: o app avisa quando houver duplicidade'].map((b) => (
          <View key={b} style={{ flexDirection: 'row', gap: space.sm }}>
            <Check size={18} color={colors.accent} />
            <AppText style={{ flex: 1 }}>{b}</AppText>
          </View>
        ))}
      </View>
      <Banner
        icon={Info}
        tone="neutral"
        message="A conexão chega na versão instalável do app. Até lá, o app estima o gasto dos seus treinos, e você poderá conectar depois em Perfil › Apple Saúde."
      />
    </Screen>
  );
}
