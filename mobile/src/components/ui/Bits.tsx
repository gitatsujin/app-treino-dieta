import type { LucideIcon } from 'lucide-react-native';
import { Check, ChevronRight } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { radius, space, type ColorName } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

import { AppText } from './AppText';

/** Linha divisória de 1 em `track`. */
export function Divider({ inset = 0 }: { inset?: number }) {
  const { colors } = useTheme();
  return <View style={{ height: 1, backgroundColor: colors.track, marginLeft: inset }} />;
}

export type Tone = 'training' | 'diet' | 'neutral' | 'near' | 'mid' | 'far' | 'accent';

/** Pares de fundo/texto por tom (cores por domínio, regra 3 do guia). */
export function useTone(tone: Tone): { bg: string; fg: string } {
  const { colors: c } = useTheme();
  return {
    training: { bg: c.tileTraining, fg: c.accent },
    diet: { bg: c.tileDiet, fg: c.dietStrong },
    neutral: { bg: c.track, fg: c.textMuted },
    near: { bg: c.track, fg: c.statusNear },
    mid: { bg: c.track, fg: c.statusMid },
    far: { bg: c.track, fg: c.statusFar },
    accent: { bg: c.accent, fg: c.onAccent },
  }[tone];
}

/** Etiqueta: canto 8, padding 8 × 3, texto 11 Semi Bold. */
export function Tag({ label, tone = 'neutral' }: { label: string; tone?: Tone }) {
  const t = useTone(tone);
  return (
    <View style={[styles.tag, { backgroundColor: t.bg }]}>
      <AppText variant="label" style={{ color: t.fg }}>
        {label}
      </AppText>
    </View>
  );
}

/** Chip de filtro: canto 18. Selecionado = fundo accent. */
export function Chip({ label, selected, onPress }: { label: string; selected?: boolean; onPress?: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        styles.chip,
        selected
          ? { backgroundColor: colors.accent, borderColor: colors.accent }
          : { backgroundColor: colors.surface, borderColor: colors.track },
      ]}>
      <AppText variant="button" style={{ fontSize: 13, color: selected ? colors.onAccent : colors.text }}>
        {label}
      </AppText>
    </Pressable>
  );
}

/** Grupo de chips com quebra de linha (um ou vários selecionados). */
export function ChipGroup({
  options,
  selected,
  onChange,
  scroll,
}: {
  options: string[];
  selected: string | string[];
  onChange?: (value: string) => void;
  scroll?: boolean;
}) {
  const isSel = (o: string) => (Array.isArray(selected) ? selected.includes(o) : selected === o);
  return (
    <View style={[styles.chips, scroll && { flexWrap: 'nowrap' }]}>
      {options.map((o) => (
        <Chip key={o} label={o} selected={isSel(o)} onPress={() => onChange?.(o)} />
      ))}
    </View>
  );
}

/** Título de seção com ação em texto à direita. */
export function SectionHeader({ title, actionLabel, onAction }: { title: string; actionLabel?: string; onAction?: () => void }) {
  return (
    <View style={styles.section}>
      <AppText variant="cardTitle">{title}</AppText>
      {actionLabel ? (
        <Pressable accessibilityRole="button" onPress={onAction} hitSlop={8}>
          <AppText variant="button" color="accent" style={{ fontSize: 13 }}>
            {actionLabel}
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Linha de lista: elemento à esquerda, título, subtítulo e elemento à direita (ou seta). */
export function ListRow({
  leading,
  title,
  subtitle,
  subtitleColor = 'textMuted',
  trailing,
  chevron,
  onPress,
  style,
}: {
  leading?: ReactNode;
  title: string;
  subtitle?: string;
  subtitleColor?: ColorName;
  trailing?: ReactNode;
  chevron?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  const body = (
    <View style={[styles.row, style]}>
      {leading}
      <View style={styles.flex}>
        <AppText variant="itemTitle" style={{ fontFamily: 'Inter_500Medium' }}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="caption" color={subtitleColor}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {trailing}
      {chevron ? <ChevronRight size={16} color={colors.textMuted} /> : null}
    </View>
  );
  return onPress ? (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
      {body}
    </Pressable>
  ) : (
    body
  );
}

/** Lista dentro de um card, com divisores entre as linhas. */
export function ListCard({ children }: { children: ReactNode[] }) {
  const { colors } = useTheme();
  const items = children.filter(Boolean);
  return (
    <View style={{ backgroundColor: colors.surface, borderRadius: radius.card, paddingHorizontal: space.xl, paddingVertical: space.xs }}>
      {items.map((c, i) => (
        <View key={i}>
          {i > 0 ? <Divider /> : null}
          {c}
        </View>
      ))}
    </View>
  );
}

/** Aviso contextual (tileDiet + dietStrong) ou informação (track + textMuted). */
export function Banner({
  icon: Icon,
  title,
  message,
  actionLabel,
  onAction,
  tone = 'diet',
}: {
  icon: LucideIcon;
  title?: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  tone?: Tone;
}) {
  const { colors } = useTheme();
  const t = useTone(tone);
  return (
    <View style={[styles.banner, { backgroundColor: t.bg }]}>
      <Icon size={20} color={t.fg} />
      <View style={styles.flex}>
        {title ? (
          <AppText variant="button" style={{ fontSize: 13, color: t.fg }}>
            {title}
          </AppText>
        ) : null}
        <AppText variant="bodySmall" style={{ color: colors.text }}>
          {message}
        </AppText>
      </View>
      {actionLabel ? (
        <Pressable accessibilityRole="button" onPress={onAction} hitSlop={8}>
          <AppText variant="button" style={{ fontSize: 13, color: t.fg }}>
            {actionLabel}
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Atalho em linhas de 3: card com IconTile 36 + texto 12. */
export function Shortcut({ icon: Icon, label, tone = 'training', onPress }: { icon: LucideIcon; label: string; tone?: Tone; onPress?: () => void }) {
  const { colors } = useTheme();
  const t = useTone(tone);
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.shortcut, { backgroundColor: colors.surface, opacity: pressed ? 0.7 : 1 }]}>
      <View style={[styles.tile36, { backgroundColor: t.bg }]}>
        <Icon size={18} color={t.fg} />
      </View>
      <AppText variant="caption" style={{ fontFamily: 'Inter_500Medium' }} numberOfLines={1}>
        {label}
      </AppText>
    </Pressable>
  );
}

export function Row({ children, gap = space.md, style }: { children: ReactNode; gap?: number; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ flexDirection: 'row', gap }, style]}>{children}</View>;
}

/** Indicador em linhas de 2: ícone, rótulo, valor e detalhe. */
export function StatCard({ icon: Icon, tone = 'training', label, value, detail, onPress }: { icon: LucideIcon; tone?: Tone; label: string; value: string; detail?: string; onPress?: () => void }) {
  const { colors } = useTheme();
  const t = useTone(tone);
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={[styles.stat, { backgroundColor: colors.surface }]}>
      <View style={styles.rowCenter}>
        <View style={[styles.tile32, { backgroundColor: t.bg }]}>
          <Icon size={16} color={t.fg} />
        </View>
        <AppText variant="bodySmall" color="textMuted" style={{ fontFamily: 'Inter_500Medium' }}>
          {label}
        </AppText>
      </View>
      <View>
        <AppText variant="value">{value}</AppText>
        {detail ? (
          <AppText variant="caption" color="textMuted">
            {detail}
          </AppText>
        ) : null}
      </View>
    </Pressable>
  );
}

/** Data em bloco (QUI / 15) usada no histórico. */
export function DateBadge({ weekday, day, tone = 'training' }: { weekday: string; day: string; tone?: Tone }) {
  const t = useTone(tone);
  return (
    <View style={[styles.date, { backgroundColor: t.bg }]}>
      <AppText style={{ fontFamily: 'Inter_600SemiBold', fontSize: 10, color: t.fg }}>{weekday}</AppText>
      <AppText style={{ fontFamily: 'Inter_700Bold', fontSize: 15, color: t.fg }}>{day}</AppText>
    </View>
  );
}

/** Círculo numerado (ordem de exercícios, passos). */
export function NumberCircle({ n, size = 28 }: { n: number | string; size?: number }) {
  const { colors } = useTheme();
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.track, alignItems: 'center', justifyContent: 'center' }}>
      <AppText variant="caption" color="textMuted" style={{ fontFamily: 'Inter_600SemiBold' }}>
        {n}
      </AppText>
    </View>
  );
}

/** Marcação redonda de feito/pendente (refeições, primeiros passos). */
export function CheckCircle({ done, highlight, size = 28 }: { done?: boolean; highlight?: boolean; size?: number }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: done ? colors.accent : 'transparent',
        borderWidth: done ? 0 : 2,
        borderColor: highlight ? colors.dietStrong : colors.track,
      }}>
      {done ? <Check size={16} color={colors.onAccent} strokeWidth={3} /> : null}
    </View>
  );
}

/** Interruptor 44 × 26 (Toggle do guia). */
export function Toggle({ value, onChange, disabled }: { value: boolean; onChange?: (v: boolean) => void; disabled?: boolean }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      onPress={() => onChange?.(!value)}
      style={{ width: 44, height: 26, borderRadius: 13, padding: 3, backgroundColor: value ? colors.accent : colors.track, opacity: disabled ? 0.5 : 1, alignItems: value ? 'flex-end' : 'flex-start' }}>
      <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: value ? colors.onAccent : colors.surface }} />
    </Pressable>
  );
}

/** Caixa de seleção 24 (consentimentos, listas). */
export function Checkbox({ checked, onChange }: { checked: boolean; onChange?: (v: boolean) => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      onPress={() => onChange?.(!checked)}
      hitSlop={8}
      style={{ width: 24, height: 24, borderRadius: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: checked ? colors.accent : 'transparent', borderWidth: checked ? 0 : 1.5, borderColor: colors.textMuted }}>
      {checked ? <Check size={16} color={colors.onAccent} strokeWidth={3} /> : null}
    </Pressable>
  );
}

/** Opção de escolha única (Radio). */
export function Radio({ selected }: { selected: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: selected ? 2 : 1.5, borderColor: selected ? colors.accent : colors.textMuted, alignItems: 'center', justifyContent: 'center' }}>
      {selected ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.accent }} /> : null}
    </View>
  );
}

export function Avatar({ initial, size = 44 }: { initial: string; size?: number }) {
  const { colors } = useTheme();
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.avatar, alignItems: 'center', justifyContent: 'center' }}>
      <AppText style={{ fontFamily: 'Inter_600SemiBold', fontSize: Math.round(size * 0.4), color: colors.onAvatar }}>{initial}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: space.xxs },
  tag: { borderRadius: radius.tag, paddingHorizontal: space.sm, paddingVertical: 3, alignSelf: 'flex-start' },
  chip: { borderRadius: radius.chip, paddingHorizontal: 14, paddingVertical: space.sm, borderWidth: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  section: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.lg, paddingVertical: space.md },
  rowCenter: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  banner: { flexDirection: 'row', alignItems: 'center', gap: space.md, borderRadius: radius.shortcut, paddingHorizontal: 14, paddingVertical: space.lg },
  shortcut: { flex: 1, alignItems: 'center', gap: space.sm, borderRadius: radius.shortcut, padding: space.lg },
  tile36: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  tile32: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  stat: { flex: 1, borderRadius: radius.card, padding: 14, gap: space.sm },
  date: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
