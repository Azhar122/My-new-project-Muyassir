// Muyassir Design System - Global Theme
// Based on Figma Design: Dark blue wave pattern with modern card-based UI

export const colors = {
  // Primary palette
  primary: {
    main: '#1A237E',      // Deep navy blue - main brand color
    dark: '#0D1342',      // Darker shade for headers
    light: '#3949AB',     // Lighter blue for accents
    wave: '#283593',      // Wave pattern color
  },
  
  // Secondary palette  
  secondary: {
    purple: '#5C6BC0',    // Purple-blue for gradients
    accent: '#7C4DFF',    // Accent purple
  },
  
  // Background colors
  background: {
    primary: '#F5F7FA',   // Light gray background
    card: '#FFFFFF',      // White card background
    dark: '#1A237E',      // Dark blue background
    wave: '#283593',      // Wave overlay
  },
  
  // Text colors
  text: {
    primary: '#1F2937',   // Dark gray - main text
    secondary: '#6B7280', // Medium gray - secondary text
    light: '#9CA3AF',     // Light gray - placeholder text
    white: '#FFFFFF',     // White text on dark backgrounds
    link: '#3949AB',      // Link color
  },
  
  // Status colors
  status: {
    success: '#10B981',   // Green
    warning: '#F59E0B',   // Amber
    error: '#EF4444',     // Red
    info: '#3B82F6',      // Blue
  },
  
  // Rating
  rating: '#FBBF24',      // Gold star
  
  // Border colors
  border: {
    light: '#E5E7EB',
    medium: '#D1D5DB',
    dark: '#9CA3AF',
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 9999,
};

export const typography = {
  // Font sizes
  size: {
    xs: 10,
    sm: 12,
    md: 14,
    lg: 16,
    xl: 18,
    xxl: 20,
    xxxl: 24,
    display: 28,
  },
  
  // Font weights
  weight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
  
  // Line heights
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
};

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
};

export default {
  colors,
  spacing,
  borderRadius,
  typography,
  shadows,
};
