import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { LucideProvider } from 'lucide-react-native';
import { useEffect } from 'react';

import { abrirBancoDoAparelho } from '@/db/expo';
import { fecharSessoesAntigas } from '@/db/treino';
import { useTheme } from '@/theme/use-theme';

SplashScreen.preventAutoHideAsync();

// Banco local: abre antes da primeira tela (síncrono) e finaliza treinos esquecidos de dias anteriores (RN23).
abrirBancoDoAparelho();
fecharSessoesAntigas();

export default function RootLayout() {
  const { colors, scheme } = useTheme();
  const [fontsLoaded, fontError] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold });

  useEffect(() => {
    if (fontsLoaded || fontError) SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...base,
    colors: { ...base.colors, background: colors.background, card: colors.surface, text: colors.text, border: colors.track, primary: colors.accent },
  };

  return (
    <LucideProvider strokeWidth={2.5}>
    <ThemeProvider value={navTheme}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Screen name="(tabs)" />
        {/* Atalhos da Início abrem por cima, com X para fechar (regra 10 do guia). */}
        <Stack.Screen name="treino/hoje" options={{ presentation: 'modal' }} />
        <Stack.Screen name="dieta/hoje" options={{ presentation: 'modal' }} />
        {/* Câmera em tela cheia; o X volta para a Início (regra 13). */}
        <Stack.Screen name="dieta/escanear" options={{ presentation: 'fullScreenModal' }} />
        {/* Painel de origem da importação, por cima da tela atual. */}
        <Stack.Screen
          name="dieta/origem"
          options={{ presentation: 'transparentModal', animation: 'fade', contentStyle: { backgroundColor: 'transparent' } }}
        />
        {/* Sair do treino só pelo X (pausar ou finalizar), nunca por gesto. */}
        <Stack.Screen name="treino/andamento" options={{ gestureEnabled: false }} />
      </Stack>
    </ThemeProvider>
    </LucideProvider>
  );
}
