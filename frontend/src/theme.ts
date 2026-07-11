export const theme = {
  color: {
    surface: '#0F0E0D',
    onSurface: '#F7F5F0',
    surfaceSecondary: '#1C1A18',
    onSurfaceSecondary: '#DCD6CC',
    surfaceTertiary: '#2B2824',
    onSurfaceTertiary: '#A8A39C',
    surfaceInverse: '#F7F5F0',
    onSurfaceInverse: '#0F0E0D',
    brand: '#D6A848',
    brandPrimary: '#D6A848',
    onBrandPrimary: '#1A1405',
    brandSecondary: '#B28B38',
    brandTertiary: '#332917',
    onBrandTertiary: '#D6A848',
    success: '#3E6649',
    warning: '#C27A2F',
    error: '#9E3E3E',
    info: '#66635D',
    border: '#2B2824',
    borderStrong: '#4A453F',
    divider: '#1F1D1A',
    muted: '#7A756E',
  },
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 },
  radius: { sm: 6, md: 12, lg: 20, pill: 999 },
  font: {
    display: 'serif',
    text: undefined as any,
  },
} as const;

export const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';
