// ─── Brand Palette ───────────────────────────────────────

export const Colors = {
  // Brand
  primary: '#143D5C',
  primaryLight: '#4A8DA8',
  primaryDark: '#0C2D42',
  primaryContainer: '#D6E8F4',
  accent: '#4A8DA8',
  accentLight: '#DAF0F7',

  // Surfaces
  background: '#F5F6F8',
  surface: '#FFFFFF',
  surfaceVariant: '#EDF0F4',
  surfaceAlt: '#EDF0F4',

  // Feedback
  success: '#1A7A54',
  successContainer: '#D4EDDF',
  successLight: '#D4EDDF',
  warning: '#B8860B',
  warningContainer: '#FFF3CD',
  warningLight: '#FFF3CD',
  error: '#B3261E',
  errorContainer: '#F9DEDC',
  danger: '#B3261E',
  dangerLight: '#F9DEDC',

  // Text
  text: '#1A1C1E',
  onSurface: '#1A1C1E',
  textSecondary: '#44474E',
  onSurfaceVariant: '#44474E',
  textMuted: '#74777F',
  outline: '#74777F',
  outlineVariant: '#C4C6CF',
  textOnPrimary: '#FFFFFF',
  white: '#FFFFFF',

  // Borders
  border: '#C4C6CF',
  borderLight: '#EDF0F4',

  // Tier
  tierGreen: '#1A7A54',
  tierYellow: '#B8860B',
  tierRed: '#B3261E',
  tierGreenAA: '#0E7C47',
  tierAmberAA: '#8B6914',
  tierRedAA: '#C42B1C',

  // Chart
  chart1: '#143D5C',
  chart2: '#4A8DA8',
  chart3: '#1A7A54',
  chart4: '#B8860B',
  chart5: '#B3261E',

  // Gradients (header backgrounds)
  gradientDark: '#0F2440',
  gradientMid: '#1B4965',
  gradientLight: '#2A6F8E',

  // Status (complaint/notification badges)
  statusBlue: '#3B82F6',
  statusOrange: '#8B6914',
  statusGreen: '#0E7C47',
  statusGray: '#94A9B8',

  // Muted text (used across screens)
  muted: '#5C7080',
  mutedDark: '#4A6275',
  cardBorder: '#E8ECF0',
  bodyBg: '#F2F5F7',
};

// ─── Spacing (8pt grid) ──────────────────────────────────

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

// ─── Shadows ─────────────────────────────────────────────

export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 4,
  },
} as const;

// ─── Radius ──────────────────────────────────────────────

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 28,
  full: 9999,
};

// ─── Font Size ───────────────────────────────────────────

export const FontSize = {
  xs: 11,
  sm: 13,
  md: 14,
  lg: 16,
  xl: 20,
  xxl: 24,
  hero: 32,
};
