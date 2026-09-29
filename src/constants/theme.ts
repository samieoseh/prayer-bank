/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#282923',
    background: '#fffaf0',
    backgroundElement: '#f1ebde',
    backgroundSelected: '#e4e5d5',
    textSecondary: '#747468',
  },
  dark: {
    text: '#f4efe4',
    background: '#22231c',
    backgroundElement: '#2d2f25',
    backgroundSelected: '#3d432d',
    textSecondary: '#c7c2b8',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
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

/**
 * Prayer Bank's product palette is separate from the starter navigation theme.
 * Keeping it separate prevents feature screens from changing the existing tabs.
 */
export const PrayerBankTheme = {
  colors: {
    canvas: '#e9e3d6',
    surface: '#f8f3e8',
    surfaceSoft: '#f1ebde',
    surfaceRaised: '#fffaf0',
    text: '#282923',
    textMuted: '#747468',
    textFaint: '#9b9a8d',
    accent: '#6f7653',
    accentStrong: '#59603f',
    accentSoft: '#e4e5d5',
    line: '#ddd6c8',
    danger: '#9a594e',
    shadow: 'rgba(55, 50, 39, 0.12)',
  },
  typography: {
    sizes: {
      xs: 12,
      sm: 14,
      base: 16,
      lg: 19,
      xl: 26,
      hero: 38,
    },
    lineHeights: {
      compact: 18,
      body: 23,
      relaxed: 30,
    },
  },
  spacing: {
    one: 6,
    two: 10,
    three: 14,
    four: 19,
    five: 26,
    six: 35,
    seven: 48,
  },
  radii: {
    small: 10,
    medium: 16,
    large: 24,
    pill: 999,
  },
  minimumTapSize: 44,
} as const;
