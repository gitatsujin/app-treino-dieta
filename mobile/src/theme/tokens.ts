/**
 * Tokens de design do app (ver docs/guia-de-interface.md).
 * Tema claro = "Verde vital" · Tema escuro = "Energia esportiva".
 * Os componentes usam só estes valores — nunca cores soltas no layout.
 */
export const colors = {
  light: {
    background: '#F6F8F7', surface: '#FFFFFF', text: '#13201B', textMuted: '#5E6E67',
    track: '#E6ECE9', accent: '#0B8457', onAccent: '#FFFFFF',
    diet: '#F59E0B', dietStrong: '#B45309', protein: '#3B82F6',
    tileTraining: '#E3F4EC', tileDiet: '#FEF3E2',
    navActive: '#0B8457', navActiveBg: '#E3F4EC', navInactive: '#8A9A93',
    avatar: '#0B8457', onAvatar: '#FFFFFF',
    statusFar: '#D93A3A', statusMid: '#E5A100', statusNear: '#1E9E5A',
  },
  dark: {
    background: '#0B0D10', surface: '#16191E', text: '#F4F5F6', textMuted: '#9AA3AE',
    track: '#262A31', accent: '#C6F432', onAccent: '#0B0D10',
    diet: '#FF7A1A', dietStrong: '#FF7A1A', protein: '#38BDF8',
    tileTraining: '#2A3313', tileDiet: '#3A2414',
    navActive: '#C6F432', navActiveBg: '#23290F', navInactive: '#6B7380',
    avatar: '#C6F432', onAvatar: '#0B0D10',
    statusFar: '#FF4D4F', statusMid: '#FFB020', statusNear: '#3DDC84',
  },
} as const;

export type ColorName = keyof typeof colors.light;
export type ThemeColors = Record<ColorName, string>;

export const font = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

export const type = {
  display: { fontFamily: font.bold, fontSize: 30 },
  screenTitle: { fontFamily: font.bold, fontSize: 28 },
  greeting: { fontFamily: font.bold, fontSize: 24 },
  value: { fontFamily: font.bold, fontSize: 18 },
  cardTitle: { fontFamily: font.semibold, fontSize: 17 },
  itemTitle: { fontFamily: font.semibold, fontSize: 15 },
  button: { fontFamily: font.semibold, fontSize: 14 },
  body: { fontFamily: font.regular, fontSize: 14 },
  bodySmall: { fontFamily: font.regular, fontSize: 13, lineHeight: 18 },
  caption: { fontFamily: font.regular, fontSize: 12 },
  label: { fontFamily: font.semibold, fontSize: 11 },
} as const;

export type TypeName = keyof typeof type;

export const space = { xxs: 2, xs: 4, sm: 8, md: 10, lg: 12, xl: 16, xxl: 20 } as const;

export const radius = {
  bar: 4, tag: 8, button: 14, shortcut: 16, chip: 18, card: 20, full: 999,
} as const;

export const size = { button: 44, tabIcon: 22, iconTile: 44, ring: 112, topButton: 40 } as const;

/** Cor da barra de meta conforme o progresso (RNF11): <40% longe, 40–79% meio, ≥80% perto. */
export const statusColor = (progress: number, c: ThemeColors) =>
  progress >= 0.8 ? c.statusNear : progress >= 0.4 ? c.statusMid : c.statusFar;
