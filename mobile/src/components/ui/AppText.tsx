import { Text, type TextProps } from 'react-native';

import { type ColorName, type TypeName, type as typeTokens } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

type Props = TextProps & {
  variant?: TypeName;
  color?: ColorName;
};

/** Texto com os tokens de tipografia e cor. Use sempre no lugar de <Text>. */
export function AppText({ variant = 'body', color = 'text', style, ...rest }: Props) {
  const { colors } = useTheme();
  return <Text style={[typeTokens[variant], { color: colors[color] }, style]} {...rest} />;
}
