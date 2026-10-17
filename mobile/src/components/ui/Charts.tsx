import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Polyline, Rect, Text as SvgText } from 'react-native-svg';

import { font, space } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

import { AppText } from './AppText';

type Ring = { value: number; max: number; color: string };

/** Três anéis concêntricos (raios 50/36/22, traço 10, ponta redonda), tamanho 112. */
export function ActivityRings({ rings, size = 112 }: { rings: Ring[]; size?: number }) {
  const { colors } = useTheme();
  const radii = [50, 36, 22];
  const c = size / 2;
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {rings.slice(0, 3).map((r, i) => {
        const rad = radii[i] * (size / 112);
        const len = 2 * Math.PI * rad;
        const p = Math.min(Math.max(r.value / r.max, 0), 1);
        return [
          <Circle key={`t${i}`} cx={c} cy={c} r={rad} stroke={colors.track} strokeWidth={10} fill="none" />,
          <Circle
            key={`p${i}`}
            cx={c}
            cy={c}
            r={rad}
            stroke={r.color}
            strokeWidth={10}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${len * p} ${len}`}
            transform={`rotate(-90 ${c} ${c})`}
          />,
        ];
      })}
    </Svg>
  );
}

type Day = { label: string; day: number; trained?: boolean; dietOk?: boolean; today?: boolean; future?: boolean };

/** Semana: 7 círculos de 36; treino = accent, hoje = contorno accent, ponto de dieta na meta. */
export function WeekStrip({ days }: { days: Day[] }) {
  const { colors } = useTheme();
  return (
    <View style={styles.week}>
      {days.map((d) => (
        <View key={d.day} style={styles.dayCol}>
          <AppText variant="caption" color="textMuted" style={{ fontFamily: font.medium }}>
            {d.label}
          </AppText>
          <View
            style={[
              styles.dayCircle,
              d.trained
                ? { backgroundColor: colors.accent }
                : d.today
                  ? { borderWidth: 1.5, borderColor: colors.accent }
                  : d.future
                    ? {}
                    : { backgroundColor: colors.track },
            ]}>
            <AppText
              style={{ fontFamily: font.semibold, fontSize: 13, color: d.trained ? colors.onAccent : d.future ? colors.textMuted : colors.text }}>
              {d.day}
            </AppText>
          </View>
          <View style={[styles.dot, { backgroundColor: d.dietOk ? colors.diet : 'transparent' }]} />
        </View>
      ))}
    </View>
  );
}

/** Gráfico de linha simples (evolução de peso, carga, bioimpedância). */
export function LineChart({
  data,
  labels,
  min,
  max,
  ticks,
  format = (v: number) => String(v),
  height = 140,
}: {
  data: number[];
  labels: string[];
  min: number;
  max: number;
  ticks: number[];
  format?: (v: number) => string;
  height?: number;
}) {
  const { colors } = useTheme();
  const W = 326;
  const X0 = 40;
  const Y0 = 10;
  const Y1 = height - 22;
  const y = (v: number) => Y0 + ((max - v) / (max - min)) * (Y1 - Y0);
  const x = (i: number) => X0 + 6 + (i * (W - X0 - 18)) / Math.max(data.length - 1, 1);
  return (
    <Svg width="100%" height={height} viewBox={`0 0 ${W} ${height}`}>
      {ticks.map((t) => [
        <Line key={`l${t}`} x1={X0} x2={W} y1={y(t)} y2={y(t)} stroke={colors.track} strokeWidth={1} />,
        <SvgText key={`t${t}`} x={0} y={y(t) + 4} fontSize={11} fill={colors.textMuted} fontFamily={font.regular}>
          {format(t)}
        </SvgText>,
      ])}
      <Polyline
        points={data.map((v, i) => `${x(i)},${y(v)}`).join(' ')}
        stroke={colors.accent}
        strokeWidth={2.5}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {data.map((v, i) => (
        <Circle key={i} cx={x(i)} cy={y(v)} r={i === data.length - 1 ? 5 : 4} fill={colors.accent} stroke={colors.surface} strokeWidth={i === data.length - 1 ? 2 : 0} />
      ))}
      {labels.map((l, i) => (
        <SvgText
          key={`x${i}`}
          x={labels.length === data.length ? x(i) : X0 + 6 + (i * (W - X0 - 18)) / Math.max(labels.length - 1, 1)}
          y={height - 4}
          fontSize={11}
          fill={colors.textMuted}
          textAnchor="middle"
          fontFamily={font.regular}>
          {l}
        </SvgText>
      ))}
    </Svg>
  );
}

/** Barras por dia com a faixa da meta (±7%) ao fundo. */
export function BarChart({ data, labels, min, max, bandFrom, bandTo }: { data: number[]; labels: string[]; min: number; max: number; bandFrom: number; bandTo: number }) {
  const { colors } = useTheme();
  const W = 326;
  const H = 140;
  const BH = 120;
  const y = (v: number) => BH - ((v - min) / (max - min)) * BH;
  const step = W / data.length;
  return (
    <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
      {bandTo > bandFrom ? <Rect x={0} y={y(bandTo)} width={W} height={y(bandFrom) - y(bandTo)} fill={colors.track} opacity={0.7} /> : null}
      {data.map((v, i) => {
        const ok = v >= bandFrom && v <= bandTo;
        const bw = Math.min(24, step * 0.7);
        const fill = bandTo <= bandFrom ? colors.diet : ok ? colors.statusNear : colors.statusMid;
        return <Rect key={i} x={i * step + (step - bw) / 2} y={y(v)} width={bw} height={Math.max(0, BH - y(v))} rx={Math.min(6, bw / 3)} fill={fill} />;
      })}
      {labels.map((l, i) => (
        <SvgText key={l + i} x={i * step + step / 2} y={H - 4} fontSize={11} fill={colors.textMuted} textAnchor="middle" fontFamily={font.medium}>
          {l}
        </SvgText>
      ))}
    </Svg>
  );
}

const styles = StyleSheet.create({
  week: { flexDirection: 'row', justifyContent: 'space-between' },
  dayCol: { alignItems: 'center', gap: 6 },
  dayCircle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 6, height: 6, borderRadius: 3, marginTop: space.xxs - 2 },
});
