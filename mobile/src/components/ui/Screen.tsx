import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';

import { space } from '@/theme/tokens';

import { ALTURA_BARRA_TECLADO } from './Teclado';

/** Folga entre o campo focado e a barra do teclado: mostra o campo e um pouco do que vem abaixo dele. */
const ESPACO_ACIMA_DO_TECLADO = 72;
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
        // Ao focar um campo, rola só o necessário para ele ficar logo acima do teclado (e da barra "Concluído").
        <KeyboardAwareScrollView
          style={styles.body}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          bottomOffset={ALTURA_BARRA_TECLADO + ESPACO_ACIMA_DO_TECLADO}>
          {children}
        </KeyboardAwareScrollView>
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
