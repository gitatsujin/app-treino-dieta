import type { LucideIcon } from 'lucide-react-native';
import Svg, { Path, Rect } from 'react-native-svg';

type Props = { size?: number; color?: string; strokeWidth?: number };

/** Halter na horizontal (substitui o Dumbbell inclinado do Lucide), com anilhas em dois tamanhos. */
function HalterBase({ size = 24, color = 'currentColor', strokeWidth = 2.5 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Rect x={4} y={5} width={4} height={14} rx={1.5} />
      <Rect x={16} y={5} width={4} height={14} rx={1.5} />
      <Rect x={1.5} y={8.5} width={2.5} height={7} rx={1} />
      <Rect x={20} y={8.5} width={2.5} height={7} rx={1} />
      <Path d="M8 12h8" />
    </Svg>
  );
}

/** Mesmo formato de um ícone do Lucide, para usar em IconTile, Shortcut etc. */
export const Halter = HalterBase as unknown as LucideIcon;
