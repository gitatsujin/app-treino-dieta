import { KeyboardToolbar } from 'react-native-keyboard-controller';

import { colors } from '@/theme/tokens';

/** Altura aproximada da barra acima do teclado (usada para deixar o campo focado logo acima dela). */
export const ALTURA_BARRA_TECLADO = 44;

const TEMA = {
  light: { primary: colors.light.accent, disabled: '#B8C4BE', background: colors.light.surface, ripple: '#0B845722' },
  dark: { primary: colors.dark.accent, disabled: '#4A505A', background: colors.dark.surface, ripple: '#C6F43222' },
};

/**
 * Barra acima do teclado: setas para ir ao campo anterior/próximo e "Concluído" para fechar.
 * Resolve os teclados numéricos do iPhone, que não têm tecla de retorno.
 */
export function BarraTeclado() {
  return (
    <KeyboardToolbar theme={TEMA}>
      <KeyboardToolbar.Prev />
      <KeyboardToolbar.Next />
      <KeyboardToolbar.Done text="Concluído" />
    </KeyboardToolbar>
  );
}
