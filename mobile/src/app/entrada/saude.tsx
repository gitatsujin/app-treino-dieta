import { router } from 'expo-router';
import { Check, CircleAlert, Heart, Info, Watch } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { OnboardingSteps } from '@/components/OnboardingSteps';
import { AppText, Banner, BottomActionBar, IconTile, Screen } from '@/components/ui';
import { conectarSaude, NOME_SAUDE, saudeDisponivel } from '@/lib/saude';
import { space } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

/** Entrada · passo 3: Apple Saúde / Health Connect (RF44, RF45). Só conecta no app instalável (fora do Expo Go). */
export default function ConectarSaude() {
  const { colors } = useTheme();
  const [disponivel, setDisponivel] = useState<boolean | null>(null);
  const [conectando, setConectando] = useState(false);
  const [erro, setErro] = useState('');
  useEffect(() => {
    saudeDisponivel().then(setDisponivel);
  }, []);
  const entrar = () => {
    if (router.canDismiss()) router.dismissAll();
    router.replace('/');
  };
  const conectar = async () => {
    setErro('');
    setConectando(true);
    try {
      await conectarSaude();
      entrar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível conectar.');
    } finally {
      setConectando(false);
    }
  };
  return (
    <Screen
      footer={
        <BottomActionBar
          primary={disponivel ? { label: conectando ? 'Conectando…' : `Conectar ao ${NOME_SAUDE}`, onPress: conectar, disabled: conectando } : { label: 'Começar a usar', onPress: entrar }}
          secondary={disponivel ? { label: 'Agora não', onPress: entrar } : undefined}
        />
      }>
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
      {conectando ? <ActivityIndicator color={colors.accent} /> : null}
      {erro ? (
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          <CircleAlert size={18} color={colors.dietStrong} />
          <AppText color="dietStrong" style={{ flex: 1 }}>
            {erro}
          </AppText>
        </View>
      ) : null}
      {disponivel === false ? (
        <Banner
          icon={Info}
          tone="neutral"
          message={`O ${NOME_SAUDE} não está disponível aqui (no Expo Go ou sem o app de saúde). O app estima o gasto dos seus treinos, e você pode conectar depois em Perfil › ${NOME_SAUDE}.`}
        />
      ) : (
        <AppText variant="caption" color="textMuted">
          O app só lê os dados; nada sai do seu celular. Você pode desconectar quando quiser em Perfil.
        </AppText>
      )}
    </Screen>
  );
}
