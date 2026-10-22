import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#1B2E1B',
    background: '#F5F7F3',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#EAF4E6',
    textSecondary: '#718071',
  },
  dark: {
    text: '#FFFFFF',
    background: '#182018',
    backgroundElement: '#263026',
    backgroundSelected: '#314331',
    textSecondary: '#B8C5B8',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;

export const theme = {
  colors: {
    primary: '#2E7D32',
    primaryDark: '#1B5E20',
    secondary: '#8BC34A',
    accent: '#FF9800',
    danger: '#E53935',
    background: '#F5F7F3',
    surface: '#FFFFFF',
    text: '#1B2E1B',
    muted: '#718071',
    border: '#E7ECE4',
    paleGreen: '#EAF4E6',
    paleOrange: '#FFF3E0',
    paleRed: '#FDECEB',
  },
  radius: { small: 10, medium: 16, large: 22 },
  shadow: {
    shadowColor: '#173719',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
  },
} as const;
