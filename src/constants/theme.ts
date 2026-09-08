export const COLORS = {
  primary: '#0F172A',      // Slate 900 (Dark Navy/Slate for headers)
  primaryLight: '#1E293B', // Slate 800 (Card headers / admin sections)
  secondary: '#2563EB',    // Blue 600 (Primary buttons and active links)
  secondaryLight: '#DBEAFE',// Blue 100 (Badge / highlight backgrounds)
  success: '#10B981',      // Emerald 500 (Collected / Paid indicators)
  successLight: '#D1FAE5',  // Emerald 100 (Success badge backgrounds)
  danger: '#EF4444',       // Red 500 (Outstanding / Overdue indicator)
  dangerLight: '#FEE2E2',   // Red 100 (Danger badge backgrounds)
  warning: '#F59E0B',      // Amber 500 (Upcoming payments due)
  warningLight: '#FEF3C7',  // Amber 100 (Warning badge backgrounds)
  background: '#F8FAFC',   // Slate 50 (App-wide background color)
  card: '#FFFFFF',         // White (Card background)
  text: '#0F172A',         // Slate 900 (Default typography color)
  textMuted: '#64748B',    // Slate 500 (Secondary/caption text)
  textLight: '#94A3B8',    // Slate 400 (Extra muted labels)
  border: '#E2E8F0',       // Slate 200 (Dividers, card borders)
  white: '#FFFFFF',
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
};

export const SHADOWS = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  lg: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 6,
  },
};

export const TYPOGRAPHY = {
  h1: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: COLORS.text,
  },
  h2: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: COLORS.text,
  },
  h3: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: COLORS.text,
  },
  bodyLarge: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: COLORS.text,
  },
  bodyMedium: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: COLORS.text,
  },
  bodyMediumBold: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: COLORS.text,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: COLORS.textMuted,
  },
  captionBold: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: COLORS.textMuted,
  },
  amountLarge: {
    fontSize: 32,
    fontWeight: '800' as const,
    color: COLORS.text,
  },
  amountMedium: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: COLORS.text,
  },
  hero: {
    fontSize: 32,
    fontWeight: '800' as const,
    color: COLORS.text,
  },
  bodySmall: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: COLORS.textMuted,
  },
};
