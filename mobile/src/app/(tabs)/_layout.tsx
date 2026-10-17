import { Redirect, Tabs } from 'expo-router';

import { TabBar } from '@/components/navigation/TabBar';
import { useConsulta } from '@/db/conexao';
import { pref, usuario } from '@/db/perfil';

/** Abre na Início mesmo quando outra aba vem antes na barra (RF02). */
export const unstable_settings = { initialRouteName: 'index' };

/** Ordem fixa da barra (RF01): Metas · Treino · Início · Dieta · Perfil. O app abre na Início (RF02). */
export default function TabsLayout() {
  // Sem perfil ou sem consentimento (LGPD), o app começa pela entrada.
  const pronto = useConsulta(() => !!usuario() && !!pref('consentimento'));
  if (!pronto) return <Redirect href="/entrada/boas-vindas" />;
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <TabBar {...props} />}>
      <Tabs.Screen name="metas" />
      <Tabs.Screen name="treino" />
      <Tabs.Screen name="index" />
      <Tabs.Screen name="dieta" />
      <Tabs.Screen name="perfil" />
    </Tabs>
  );
}
