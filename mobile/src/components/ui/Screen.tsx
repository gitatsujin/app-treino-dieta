import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { space } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

type Props = {
  /** Cabeçalho fixo (ScreenHeader nas abas, TopBar nas telas internas). */
  header?: ReactNode;
  /** Rodapé fixo (BottomActionBar). Nas abas, a TabBar já fica fixa pelo navegador. */
  footer?: ReactNode;
  children: ReactNode;
  scroll?: boolean;
};

/**
 * Estrutura de toda tela (regra 12 do guia): cabeçalho e rodapé fixos,
 * só o conteúdo do meio rola. Cards empilhados com 10 de espaço e margens de 16.
 */
export function Screen({ header, footer, children, scroll = true }: Props) {
  const { colors } = useTheme();
  return (
    <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: colors.background }]}>
      {header}
      {scroll ? (
        <ScrollView style={styles.body} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.body, styles.content]}>{children}</View>
      )}
      {footer}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  body: { flex: 1 },
  content: { paddingHorizontal: space.xl, paddingTop: space.sm, paddingBottom: space.xxl, gap: space.md },
});
