import type { LucideIcon } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { font, radius, space } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

import { AppText } from './AppText';
import { Button } from './Button';
import { ALTURA_BARRA_TECLADO, BarraTeclado } from './Teclado';

/** Painel que sobe de baixo, com fundo escurecido (BottomSheet). */
export function BottomSheet({ visible, onClose, children }: { visible: boolean; onClose: () => void; children: ReactNode }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      {/* O painel sobe junto com o teclado; a barra "Concluído" fica entre os dois. */}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding" keyboardVerticalOffset={ALTURA_BARRA_TECLADO}>
        <Pressable style={styles.scrim} onPress={onClose} accessibilityLabel="Fechar" />
        <View style={[styles.sheet, { backgroundColor: colors.surface, paddingBottom: Math.max(insets.bottom, space.xl) + space.md }]}>
          <View style={[styles.handle, { backgroundColor: colors.track }]} />
          {children}
        </View>
        <BarraTeclado />
      </KeyboardAvoidingView>
    </Modal>
  );
}

/** Confirmação de ação destrutiva (ConfirmDialog). */
export function ConfirmDialog({
  visible,
  icon: Icon,
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  icon: LucideIcon;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={[styles.scrim, styles.center]}>
        <View style={[styles.dialog, { backgroundColor: colors.surface }]}>
          <View style={[styles.icon, { backgroundColor: colors.track }]}>
            <Icon size={26} color={colors.statusFar} />
          </View>
          <AppText style={{ fontFamily: font.bold, fontSize: 19 }}>{title}</AppText>
          <AppText color="textMuted" style={{ textAlign: 'center', lineHeight: 20 }}>
            {message}
          </AppText>
          <View style={styles.buttons}>
            <Button variant="secondary" label="Cancelar" onPress={onCancel} style={{ width: 112 }} />
            <Button variant="dangerFilled" label={confirmLabel} onPress={onConfirm} style={{ flex: 1 }} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  center: { alignItems: 'center', justifyContent: 'center', padding: space.xxl },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: space.xl, paddingTop: space.md, gap: 14 },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: space.xs },
  dialog: { width: '100%', maxWidth: 342, borderRadius: 24, padding: space.xxl, paddingTop: 24, alignItems: 'center', gap: space.lg },
  icon: { width: 52, height: 52, borderRadius: radius.shortcut, alignItems: 'center', justifyContent: 'center' },
  buttons: { flexDirection: 'row', gap: space.sm, alignSelf: 'stretch', marginTop: space.sm },
});
