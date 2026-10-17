import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { space } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

import { Button, ButtonRow } from './Button';

type Action = { label: string; onPress?: () => void; disabled?: boolean };

/** Rodapé fixo das telas de ação (salvar, criar, iniciar). Telas de consulta não usam (regra 9). */
export function BottomActionBar({ primary, secondary }: { primary: Action; secondary?: Action }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.root,
        { backgroundColor: colors.surface, borderTopColor: colors.track, paddingBottom: Math.max(insets.bottom, space.xl) + space.sm },
      ]}>
      {secondary ? <ButtonRow secondary={secondary} primary={primary} /> : <Button {...primary} />}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { paddingHorizontal: space.xl, paddingTop: space.lg, borderTopWidth: 1 },
});
