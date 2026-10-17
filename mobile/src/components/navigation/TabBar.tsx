import type { Tabs } from 'expo-router';
import { Apple, House, User } from 'lucide-react-native';
import type { ComponentProps, ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Halter } from '@/components/icons/Halter';
import { AppText } from '@/components/ui';
import { radius, size, space } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

import { MetasIcon } from './MetasIcon';

type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

type TabInfo = { label: string; icon: (color: string) => ReactNode };

const TABS: Record<string, TabInfo> = {
  metas: { label: 'Metas', icon: (c) => <MetasIcon color={c} size={size.tabIcon} /> },
  treino: { label: 'Treino', icon: (c) => <Halter size={size.tabIcon + 2} color={c} strokeWidth={2.6} /> },
  index: { label: 'Início', icon: (c) => <House size={size.tabIcon} color={c} strokeWidth={2.6} /> },
  dieta: { label: 'Dieta', icon: (c) => <Apple size={size.tabIcon} color={c} strokeWidth={2.6} /> },
  perfil: { label: 'Perfil', icon: (c) => <User size={size.tabIcon} color={c} strokeWidth={2.6} /> },
};

/**
 * Barra de navegação (RF01–RF03): 5 atalhos, o ativo com ícone numa pílula 56 × 30.
 * Fica fixa embaixo; o conteúdo da tela rola por cima dela.
 */
export function TabBar({ state, navigation }: TabBarProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.root,
        { backgroundColor: colors.surface, borderTopColor: colors.track, paddingBottom: Math.max(insets.bottom, space.sm) },
      ]}>
      {state.routes.map((route, i) => {
        const tab = TABS[route.name];
        if (!tab) return null;
        const active = state.index === i;
        const color = active ? colors.navActive : colors.navInactive;
        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={tab.label}
            onPress={() => {
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!active && !event.defaultPrevented) navigation.navigate(route.name);
            }}
            style={styles.item}>
            <View style={[styles.pill, active && { backgroundColor: colors.navActiveBg }]}>{tab.icon(color)}</View>
            <AppText variant="label" style={{ color }}>
              {tab.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flexDirection: 'row', borderTopWidth: 1, paddingTop: space.sm },
  item: { flex: 1, alignItems: 'center', gap: space.xs },
  pill: { width: 56, height: 30, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
});
