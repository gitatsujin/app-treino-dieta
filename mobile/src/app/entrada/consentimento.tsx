import { router } from 'expo-router';
import { Lock, ShieldCheck } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { OnboardingSteps } from '@/components/OnboardingSteps';
import { AppText, BottomActionBar, Card, Checkbox, Divider, IconTile, Screen, Tag } from '@/components/ui';
import { agoraIso } from '@/db/conexao';
import { definirCicloAtivo, definirPref, pref, usuario } from '@/db/perfil';
import { font, radius, space } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

/** Entrada · passo 2: consentimento para dados sensíveis de saúde (LGPD). */
export default function Consentimento() {
  const { colors } = useTheme();
  const feminino = usuario()?.sexo === 'feminino';
  const [ciclo, setCiclo] = useState(pref('consentimento_ciclo') === '1');
  const itens: [string, string, boolean, boolean][] = [
    ['Dados de saúde', 'Peso, bioimpedância, treinos e alimentação. Necessários para o app funcionar.', true, true],
    ['Fotos e PDFs importados', 'Usados só para ler fichas, dietas, laudos e rótulos. Com internet, o arquivo é enviado à IA escolhida só para a leitura; sem internet, o próprio celular lê.', true, true],
  ];
  if (feminino) itens.push(['Ciclo menstrual', 'Para relacionar fases do ciclo com o desempenho nos treinos.', ciclo, false]);
  const aceitar = () => {
    definirPref('consentimento', agoraIso());
    definirPref('consentimento_ciclo', feminino && ciclo ? '1' : '0');
    if (feminino) definirCicloAtivo(ciclo);
    router.push('/entrada/saude');
  };
  return (
    <Screen footer={<BottomActionBar primary={{ label: 'Aceitar e continuar', onPress: aceitar }} />}>
      <OnboardingSteps step={2} />
      <IconTile icon={ShieldCheck} size={52} />
      <AppText variant="screenTitle">Seus dados, suas regras</AppText>
      <AppText color="textMuted" style={{ fontSize: 15, lineHeight: 21 }}>
        Dados de saúde são sensíveis pela LGPD. Escolha o que o app pode usar.
      </AppText>
      <Card gap={space.md}>
        {itens.map(([t, s, on, obrig], i) => (
          <View key={t} style={{ gap: space.md }}>
            {i > 0 ? <Divider /> : null}
            <View style={{ flexDirection: 'row', gap: space.lg }}>
              <Checkbox checked={on} onChange={obrig ? undefined : setCiclo} />
              <View style={{ flex: 1, gap: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                  <AppText variant="itemTitle">{t}</AppText>
                  <Tag label={obrig ? 'Obrigatório' : 'Opcional'} tone={obrig ? 'training' : 'neutral'} />
                </View>
                <AppText variant="bodySmall" color="textMuted">
                  {s}
                </AppText>
              </View>
            </View>
          </View>
        ))}
      </Card>
      <View style={{ flexDirection: 'row', gap: space.md, backgroundColor: colors.track, borderRadius: radius.shortcut, padding: 14 }}>
        <Lock size={20} color={colors.textMuted} />
        <View style={{ flex: 1, gap: 4 }}>
          <AppText variant="bodySmall">Seus dados ficam só neste aparelho. Você pode exportar ou apagar tudo em Perfil › Privacidade e dados.</AppText>
          <Pressable onPress={() => router.push('/perfil/politica')}>
            <AppText variant="bodySmall" color="accent" style={{ fontFamily: font.semibold }}>
              Ler a política de privacidade
            </AppText>
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}
