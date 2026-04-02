/**
 * CHMS Mobile Color Scheme
 * Based on FE web design (Blue & Cyan primary)
 */

export const colors = {
  // Primary colors (Blue & Cyan)
  primary: {
    50: "#eff6ff",
    100: "#dbeafe",
    200: "#bfdbfe",
    300: "#93c5fd",
    400: "#60a5fa",
    500: "#3b82f6", // Main Blue
    600: "#2563eb",
    700: "#1d4ed8",
    800: "#1e40af",
    900: "#1e3a8a",
  },

  cyan: {
    50: "#ecf8ff",
    100: "#cffafe",
    200: "#a5f3fc",
    300: "#67e8f9",
    400: "#22d3ee",
    500: "#06b6d4", // Main Cyan
    600: "#0891b2",
    700: "#0e7490",
    800: "#155e75",
    900: "#164e63",
  },

  // Neutrals
  gray: {
    50: "#f9fafb",
    100: "#f3f4f6",
    200: "#e5e7eb",
    300: "#d1d5db",
    400: "#9ca3af",
    500: "#6b7280",
    600: "#4b5563",
    700: "#374151",
    800: "#1f2937",
    900: "#111827",
  },

  // Status colors
  success: "#10b981",
  warning: "#f59e0b",
  error: "#ef4444",
  info: "#3b82f6",

  // Semantic colors
  background: "#ffffff",
  surface: "#f9fafb",
  border: "#e5e7eb",
  text: {
    primary: "#111827",
    secondary: "#6b7280",
    tertiary: "#9ca3af",
    light: "#ffffff",
  },

  // Gradients (CSS strings for React Native)
  gradient: {
    primary: ["#3b82f6", "#06b6d4"], // Blue to Cyan
    primaryReverse: ["#06b6d4", "#3b82f6"], // Cyan to Blue
  },
};

// Status badge colors
export const statusColors = {
  PENDING: { bg: "#fef3c7", text: "#d97706" },
  CONFIRMED: { bg: "#d1fae5", text: "#059669" },
  COMPLETED: { bg: "#cffafe", text: "#0891b2" },
  CANCELLED: { bg: "#fee2e2", text: "#dc2626" },
  CHECKED_IN: { bg: "#d1fae5", text: "#059669" },
  REJECTED: { bg: "#fee2e2", text: "#dc2626" },
};
