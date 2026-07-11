// Theme system supporting 5 aesthetics. Each theme keeps the SAME shape so any
// screen can consume it via useTheme() without conditionals.
export type ThemeName = 'luxe' | 'light' | 'genz' | 'millennial' | 'genx';

export type Theme = {
  name: ThemeName;
  isDark: boolean;
  color: {
    surface: string;
    onSurface: string;
    surfaceSecondary: string;
    onSurfaceSecondary: string;
    surfaceTertiary: string;
    onSurfaceTertiary: string;
    surfaceInverse: string;
    onSurfaceInverse: string;
    brand: string;
    brandPrimary: string;
    onBrandPrimary: string;
    brandSecondary: string;
    brandTertiary: string;
    onBrandTertiary: string;
    success: string;
    warning: string;
    error: string;
    info: string;
    border: string;
    borderStrong: string;
    divider: string;
    muted: string;
  };
  spacing: { xs: number; sm: number; md: number; lg: number; xl: number; xxl: number; xxxl: number };
  radius: { sm: number; md: number; lg: number; pill: number };
  font: { display: string; text: any };
};

const SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 };
const RADIUS = { sm: 6, md: 12, lg: 20, pill: 999 };

// 6 Glass / Luxe DARK — antique gold on charcoal (current default)
const luxe: Theme = {
  name: 'luxe', isDark: true,
  color: {
    surface: '#0F0E0D', onSurface: '#F7F5F0',
    surfaceSecondary: '#1C1A18', onSurfaceSecondary: '#DCD6CC',
    surfaceTertiary: '#2B2824', onSurfaceTertiary: '#A8A39C',
    surfaceInverse: '#F7F5F0', onSurfaceInverse: '#0F0E0D',
    brand: '#D6A848', brandPrimary: '#D6A848', onBrandPrimary: '#1A1405',
    brandSecondary: '#B28B38', brandTertiary: '#332917', onBrandTertiary: '#D6A848',
    success: '#3E6649', warning: '#C27A2F', error: '#9E3E3E', info: '#66635D',
    border: '#2B2824', borderStrong: '#4A453F', divider: '#1F1D1A', muted: '#7A756E',
  },
  spacing: SPACING, radius: RADIUS, font: { display: 'serif', text: undefined },
};

// Clean Ivory Light — soft warm white with deep espresso ink
const light: Theme = {
  name: 'light', isDark: false,
  color: {
    surface: '#FBF9F4', onSurface: '#1A1712',
    surfaceSecondary: '#F1EDE3', onSurfaceSecondary: '#3A342A',
    surfaceTertiary: '#E4DED0', onSurfaceTertiary: '#6E6858',
    surfaceInverse: '#1A1712', onSurfaceInverse: '#FBF9F4',
    brand: '#8B5E1C', brandPrimary: '#8B5E1C', onBrandPrimary: '#FBF9F4',
    brandSecondary: '#B28B38', brandTertiary: '#EBD9AC', onBrandTertiary: '#5A3E0F',
    success: '#3E6649', warning: '#C27A2F', error: '#9E3E3E', info: '#66635D',
    border: '#DCD5C4', borderStrong: '#B8AF98', divider: '#EAE3D2', muted: '#8E8676',
  },
  spacing: SPACING, radius: RADIUS, font: { display: 'serif', text: undefined },
};

// Gen Z — punchy magenta + electric cyan on graphite, y2k vibes
const genz: Theme = {
  name: 'genz', isDark: true,
  color: {
    surface: '#0E0E14', onSurface: '#FFFFFF',
    surfaceSecondary: '#1A1A26', onSurfaceSecondary: '#E6E6EE',
    surfaceTertiary: '#26263A', onSurfaceTertiary: '#9A9AB2',
    surfaceInverse: '#FFFFFF', onSurfaceInverse: '#0E0E14',
    brand: '#FF2E88', brandPrimary: '#FF2E88', onBrandPrimary: '#FFFFFF',
    brandSecondary: '#00E6D0', brandTertiary: '#3A1030', onBrandTertiary: '#FF7BB4',
    success: '#00E6A0', warning: '#FFB020', error: '#FF3B5C', info: '#7A7AA0',
    border: '#26263A', borderStrong: '#4A4A66', divider: '#1F1F2E', muted: '#6E6E88',
  },
  spacing: SPACING, radius: { sm: 8, md: 16, lg: 24, pill: 999 }, font: { display: 'serif', text: undefined },
};

// Millennial — muted sage & terracotta on warm cream, minimal aesthetic
const millennial: Theme = {
  name: 'millennial', isDark: false,
  color: {
    surface: '#F5F0E8', onSurface: '#2A2620',
    surfaceSecondary: '#EAE3D5', onSurfaceSecondary: '#4A443A',
    surfaceTertiary: '#DDD3C0', onSurfaceTertiary: '#7A7264',
    surfaceInverse: '#2A2620', onSurfaceInverse: '#F5F0E8',
    brand: '#7A9070', brandPrimary: '#7A9070', onBrandPrimary: '#FFFFFF',
    brandSecondary: '#C97B5F', brandTertiary: '#E4E8D9', onBrandTertiary: '#3E5236',
    success: '#7A9070', warning: '#C97B5F', error: '#B0554A', info: '#8A8272',
    border: '#D2C8B4', borderStrong: '#A89E88', divider: '#E0D8C6', muted: '#8E8676',
  },
  spacing: SPACING, radius: RADIUS, font: { display: 'serif', text: undefined },
};

// Gen X — classic navy + burgundy on parchment, distinguished
const genx: Theme = {
  name: 'genx', isDark: false,
  color: {
    surface: '#F0EBE1', onSurface: '#1E2130',
    surfaceSecondary: '#E4DED0', onSurfaceSecondary: '#2E3244',
    surfaceTertiary: '#D6CFBB', onSurfaceTertiary: '#5A5F72',
    surfaceInverse: '#1E2130', onSurfaceInverse: '#F0EBE1',
    brand: '#1F3A5F', brandPrimary: '#1F3A5F', onBrandPrimary: '#F0EBE1',
    brandSecondary: '#8C2A2A', brandTertiary: '#C7D2E0', onBrandTertiary: '#0F2340',
    success: '#3F6650', warning: '#B4772E', error: '#8C2A2A', info: '#5A5F72',
    border: '#CFC6B0', borderStrong: '#9A9080', divider: '#DDD5C0', muted: '#7A7062',
  },
  spacing: SPACING, radius: { sm: 4, md: 8, lg: 14, pill: 999 }, font: { display: 'serif', text: undefined },
};

export const THEMES: Record<ThemeName, Theme> = { luxe, light, genz, millennial, genx };

export const THEME_META: {
  name: ThemeName;
  label: string;
  tagline: string;
  swatches: [string, string, string];
}[] = [
  { name: 'luxe',       label: 'Luxe',        tagline: 'Signature charcoal & gold',        swatches: ['#0F0E0D', '#D6A848', '#332917'] },
  { name: 'light',      label: 'Ivory',       tagline: 'Warm minimal light',               swatches: ['#FBF9F4', '#8B5E1C', '#EBD9AC'] },
  { name: 'genz',       label: 'Gen Z',       tagline: 'Y2K neon · magenta pop',           swatches: ['#0E0E14', '#FF2E88', '#00E6D0'] },
  { name: 'millennial', label: 'Millennial',  tagline: 'Sage · terracotta aesthetic',      swatches: ['#F5F0E8', '#7A9070', '#C97B5F'] },
  { name: 'genx',       label: 'Gen X',       tagline: 'Navy · burgundy classic',          swatches: ['#F0EBE1', '#1F3A5F', '#8C2A2A'] },
];

// Legacy default export for backwards-compat with any file still importing { theme }
export const theme = luxe;
export const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';
