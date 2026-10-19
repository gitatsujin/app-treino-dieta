import type { LucideIcon } from 'lucide-react-native';
import { Minus, Plus, TriangleAlert } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, TextInput, View, type KeyboardTypeOptions } from 'react-native';

import { font, radius, space } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

import { AppText } from './AppText';

/** Campo de texto: altura 48, canto 12. Estados: padrão, foco, somente leitura e atenção. */
export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  unit,
  icon: Icon,
  trailing,
  readonly,
  warning,
  keyboardType,
  multiline,
  autoCapitalize,
  secureTextEntry,
  maxLength,
  onBlur,
}: {
  label?: string;
  value?: string;
  onChangeText?: (t: string) => void;
  placeholder?: string;
  unit?: string;
  icon?: LucideIcon;
  trailing?: ReactNode;
  readonly?: boolean;
  warning?: boolean;
  keyboardType?: KeyboardTypeOptions;
  multiline?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  secureTextEntry?: boolean;
  maxLength?: number;
  onBlur?: () => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.field}>
      {label ? (
        <AppText variant="caption" style={{ fontFamily: font.medium, color: warning ? colors.dietStrong : colors.textMuted }}>
          {label}
        </AppText>
      ) : null}
      <View
        style={[
          styles.input,
          multiline && { height: 72, alignItems: 'flex-start', paddingTop: 12 },
          { backgroundColor: readonly ? colors.track : colors.surface, borderColor: warning ? colors.dietStrong : colors.track, borderWidth: warning ? 1.5 : 1 },
        ]}>
        {Icon ? <Icon size={18} color={colors.textMuted} /> : null}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          editable={!readonly}
          keyboardType={keyboardType}
          multiline={multiline}
          autoCapitalize={autoCapitalize}
          secureTextEntry={secureTextEntry}
          maxLength={maxLength}
          onBlur={onBlur}
          style={[styles.text, { color: colors.text }]}
        />
        {unit ? (
          <AppText variant="bodySmall" color="textMuted">
            {unit}
          </AppText>
        ) : null}
        {warning ? <TriangleAlert size={16} color={colors.dietStrong} /> : trailing}
      </View>
    </View>
  );
}

/** Dois ou três campos lado a lado. */
export function FieldRow({ children }: { children: ReactNode }) {
  return <View style={{ flexDirection: 'row', gap: space.md }}>{children}</View>;
}

/** Rótulo de grupo de opções. */
export function FieldLabel({ children }: { children: string }) {
  return (
    <AppText variant="caption" color="textMuted" style={{ fontFamily: font.medium }}>
      {children}
    </AppText>
  );
}

/** Controle segmentado: trilho track, opção ativa em surface. */
export function SegmentedControl({ options, selected, onChange }: { options: string[]; selected: string; onChange?: (v: string) => void }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.seg, { backgroundColor: colors.track }]}>
      {options.map((o) => {
        const on = o === selected;
        return (
          <Pressable
            key={o}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            onPress={() => onChange?.(o)}
            style={[styles.segItem, on && { backgroundColor: colors.surface }]}>
            <AppText style={{ fontFamily: on ? font.semibold : font.medium, fontSize: 13, color: on ? colors.text : colors.textMuted }} numberOfLines={1}>
              {o}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Botões − / + (quantidade, contador). */
export function StepButton({ kind, onPress, size = 48 }: { kind: 'minus' | 'plus'; onPress?: () => void; size?: number }) {
  const { colors } = useTheme();
  const Icon = kind === 'minus' ? Minus : Plus;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={kind === 'minus' ? 'Diminuir' : 'Aumentar'}
      onPress={onPress}
      style={{ width: size, height: size, borderRadius: 12, backgroundColor: colors.track, alignItems: 'center', justifyContent: 'center' }}>
      <Icon size={18} color={colors.text} />
    </Pressable>
  );
}

/** Linha com contador: título e legenda à esquerda, − valor + à direita. */
export function CounterRow({ label, caption, value, onChange }: { label: string; caption: string; value: number; onChange: (v: number) => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="itemTitle" style={{ fontFamily: font.medium }}>
          {label}
        </AppText>
        <AppText variant="caption" color="textMuted">
          {caption}
        </AppText>
      </View>
      <StepButton kind="minus" size={40} onPress={() => onChange(Math.max(0, value - 1))} />
      <AppText style={{ fontFamily: font.bold, fontSize: 20, width: 28, textAlign: 'center' }}>{value}</AppText>
      <StepButton kind="plus" size={40} onPress={() => onChange(value + 1)} />
    </View>
  );
}

/** Caixa de nutriente (valor + rótulo), em linhas de 3 ou 4. */
export function NutrientBox({ value, label }: { value: string; label: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.nbox, { backgroundColor: colors.track }]}>
      <AppText style={{ fontFamily: font.bold, fontSize: 15 }}>{value}</AppText>
      <AppText variant="label" color="textMuted" style={{ fontFamily: font.medium }}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { flex: 1, gap: 6 },
  input: { height: 48, borderRadius: 12, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: space.sm },
  text: { flex: 1, minWidth: 0, fontFamily: font.medium, fontSize: 15, paddingVertical: 0 },
  seg: { flexDirection: 'row', borderRadius: 12, padding: 4, gap: 4 },
  segItem: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: space.sm, borderRadius: 9 },
  nbox: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: space.md, borderRadius: radius.button - 2 },
});
