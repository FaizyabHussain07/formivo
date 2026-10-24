/**
 * Formivo brand tokens — single source of truth for the mandatory palette.
 * Source: product-documentations/16-brand-identity.md
 *
 * Prefer CSS variables (see app/globals.css) inside components; use these
 * values only where a literal color is required (charts, SVG, inline styles).
 */

export const Brand = {
  // Mandatory brand palette
  darkInk: '#0B1220',
  teal: '#0F766E',
  tealHover: '#115E59',
  mint: '#2DD4BF',
  slate: '#1E293B',
  lightSlate: '#94A3B8',
  offWhite: '#F8FAFC',
  white: '#FFFFFF',

  // Dark surfaces
  surface: '#111827',
  surfaceElevated: '#1E293B',
  surfaceMuted: '#172033',

  // Light surfaces
  lightSurfaceMuted: '#F1F5F9',
  lightBorder: '#E2E8F0',
  lightBorderStrong: '#CBD5E1',

  // Text
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#64748B',
  textOnDark: '#F8FAFC',
  textSecondaryOnDark: '#CBD5E1',

  // Semantic
  success: '#16A34A',
  warning: '#D97706',
  error: '#DC2626',
  info: '#2563EB',
} as const;

/** Chart series order (brand doc §39): teal → info → warning. */
export const CHART_SERIES = [Brand.teal, Brand.info, Brand.warning] as const;

export type BrandToken = keyof typeof Brand;