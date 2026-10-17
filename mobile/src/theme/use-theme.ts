import { useColorScheme } from 'react-native';

import { useConsulta } from '@/db/conexao';
import { pref } from '@/db/perfil';

import { colors, type ThemeColors } from './tokens';

function temaSalvo(): string | null {
  try {
    return pref('tema');
  } catch {
    return null; // banco ainda não aberto
  }
}

/** Cores do tema ativo: a escolha do usuário em Perfil › Tema, ou o tema do sistema. */
export function useTheme(): { colors: ThemeColors; scheme: 'light' | 'dark' } {
  const sistema = useColorScheme() === 'dark' ? 'dark' : 'light';
  const escolha = useConsulta(temaSalvo);
  const scheme = escolha === 'claro' ? 'light' : escolha === 'escuro' ? 'dark' : sistema;
  return { colors: colors[scheme], scheme };
}
