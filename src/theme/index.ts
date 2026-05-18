// MedLink Theme System
export const Colors = {
  primary: '#1E88E5',
  primaryDark: '#1565C0',
  primaryLight: '#E3F2FD',
  secondary: '#43A047',
  accent: '#FF6B35',
  warning: '#FF9500',
  danger: '#FF3B30',
  purple: '#AF52DE',

  white: '#FFFFFF',
  background: '#F2F7FD',
  card: '#FFFFFF',
  surface: '#F8FAFF',

  text: '#0D1B2A',
  textSecondary: '#4A6080',
  textMuted: '#8FA3BC',
  border: '#DCE8F5',

  // Role colors
  patient: '#1E88E5',
  doctor: '#43A047',
  pharmacy: '#1E88E5',
  lab: '#AF52DE',
  warehouse: '#43A047',
  admin: '#0D1B2A',

  // Status
  confirmed: '#43A047',
  pending: '#FF9500',
  cancelled: '#FF3B30',
  completed: '#1E88E5',
  in_stock: '#43A047',
  out_of_stock: '#FF3B30',
  coming_soon: '#FF9500',
};

export const Typography = {
  fontSizeXs: 11,
  fontSizeSm: 13,
  fontSizeMd: 15,
  fontSizeLg: 17,
  fontSizeXl: 20,
  fontSize2xl: 24,
  fontSize3xl: 30,
  fontSize4xl: 36,

  fontWeightNormal: '400' as const,
  fontWeightMedium: '500' as const,
  fontWeightSemiBold: '600' as const,
  fontWeightBold: '700' as const,
  fontWeightExtraBold: '800' as const,
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  full: 999,
};

export const Shadow = {
  small: {
    shadowColor: '#0A84FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  medium: {
    shadowColor: '#0A84FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  large: {
    shadowColor: '#0A84FF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 10,
  },
};

export const Gradients = {
  primary: ['#1E88E5', '#43A047'],
  hero: ['#1E88E5', '#64B5F6'],
  card: ['#FFFFFF', '#F0F8FF'],
  success: ['#43A047', '#66BB6A'],
  sunset: ['#FF6B35', '#FF9500'],
};
