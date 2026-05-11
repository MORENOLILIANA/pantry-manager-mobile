import { Platform } from "react-native";

export const colors = {
  // Colores principales
  white: "#FFFFFF",
  primary: "#2D6A4F", // Verde principal
  accent: "#52B788", // Verde acento
  secondary: "#F8F9FA", // Fondo secundario
  
  // Textos
  text: "#2D3436", // Texto principal
  subtext: "#636E72", // Subtexto
  
  // Estados
  error: "#E74C3C",
  errorLight: "#FADBD8",
  success: "#27AE60",
  successLight: "#D5F4E6",
  warning: "#F39C12",
  warningLight: "#FFF3E0",
  info: "#3498DB",
  
  // Neutros
  border: "#E0E0E0",
  placeholder: "#BDC3C7",
  disabled: "#95A5A6",
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
};

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999,
};

// Helper para sombras que funcionen en web y mobile
const createShadow = (web: string, elevation: number, mobile: { shadowColor: string; shadowOffset: { width: number; height: number }; shadowOpacity: number; shadowRadius: number }) => {
  if (Platform.OS === "web") {
    return { boxShadow: web } as any;
  }
  return { ...mobile, elevation } as any;
};

export const shadows = {
  sm: createShadow(
    "0 2px 4px rgba(0, 0, 0, 0.08)",
    2,
    {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 4,
    }
  ),
  md: createShadow(
    "0 4px 8px rgba(0, 0, 0, 0.12)",
    4,
    {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 8,
    }
  ),
  lg: createShadow(
    "0 8px 12px rgba(0, 0, 0, 0.15)",
    6,
    {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
    }
  ),
};

export const typography = {
  h1: {
    fontSize: 28,
    fontWeight: "700" as const,
    lineHeight: 36,
  },
  h2: {
    fontSize: 24,
    fontWeight: "700" as const,
    lineHeight: 32,
  },
  h3: {
    fontSize: 20,
    fontWeight: "700" as const,
    lineHeight: 28,
  },
  body: {
    fontSize: 16,
    fontWeight: "400" as const,
    lineHeight: 24,
  },
  bodySm: {
    fontSize: 14,
    fontWeight: "400" as const,
    lineHeight: 20,
  },
  caption: {
    fontSize: 12,
    fontWeight: "400" as const,
    lineHeight: 16,
  },
};
