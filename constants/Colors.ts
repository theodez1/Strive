export const Colors = {
  primary: '#0C3B2E',      // Vert foncé
  secondary: '#F0F7F4',    // Vert clair
  accent: '#FF6B35',       // Orange
  background: '#FFFFFF',   // Blanc
  surface: '#F8F9FA',      // Gris très clair
  text: '#333333',         // Gris foncé
  textSecondary: '#666666', // Gris moyen
  error: '#DC3545',        // Rouge
  success: '#28A745',      // Vert
  warning: '#FFC107',      // Jaune
};

// Couleurs supplémentaires pour l'interface
export const ExtendedColors = {
  ...Colors,
  
  // Variantes du primary
  primaryLight: '#1A5A4A',
  primaryDark: '#0A2B21',
  
  // Variantes du secondary
  secondaryDark: '#E0F0EA',
  
  // Variantes de l'accent
  accentLight: '#FF8A65',
  accentDark: '#E64A19',
  
  // Couleurs neutres
  white: '#FFFFFF',
  black: '#000000',
  gray50: '#FAFAFA',
  gray100: '#F5F5F5',
  gray200: '#EEEEEE',
  gray300: '#E0E0E0',
  gray400: '#BDBDBD',
  gray500: '#9E9E9E',
  gray600: '#757575',
  gray700: '#616161',
  gray800: '#424242',
  gray900: '#212121',
  
  // Couleurs pour les états
  info: '#17A2B8',
  light: '#F8F9FA',
  dark: '#343A40',
  
  // Transparences
  overlay: 'rgba(0, 0, 0, 0.5)',
  primaryAlpha: 'rgba(12, 59, 46, 0.1)',
  accentAlpha: 'rgba(255, 107, 53, 0.1)',
};

export default Colors;
