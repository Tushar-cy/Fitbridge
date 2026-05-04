// ─────────────────────────────────────────────────────────────────────────────
// FitBridge Design Tokens — Official Brand Palette (v2)
// Documentation: Electric Blue + Fitness Green + Energy Orange
// ─────────────────────────────────────────────────────────────────────────────

export const COLORS = {
  // ── Core Brand ─────────────────────────────────────────────────────────────
  PRIMARY:          '#4F46E5',   // Electric Blue — CTAs, AI elements, links, active states
  PRIMARY_LIGHT:    '#7C3AED',   // Violet tint — gradient end, hover/pressed
  PRIMARY_DARK:     '#3730A3',   // Deep blue — pressed states, shadows

  SECONDARY:        '#22C55E',   // Fitness Green — success states, user chat bubbles, workout completion
  SECONDARY_LIGHT:  '#4ADE80',   // Light green — hover tints
  SECONDARY_DARK:   '#16A34A',   // Dark green — gradient end, pressed

  ACCENT:           '#F97316',   // Energy Orange — alerts, urgency, badges (use sparingly)
  ACCENT_LIGHT:     '#FB923C',   // Light orange — hover tints
  ACCENT_DARK:      '#EA580C',   // Deep orange — pressed states

  // ── Backgrounds ────────────────────────────────────────────────────────────
  DARK_BG:          '#0F172A',   // Deep Navy — chat screen bg, dark mode primary
  LIGHT_BG:         '#F8FAFC',   // Off White — general UI screens, light mode background
  SURFACE_1:        '#1E293B',   // Slate — cards in dark mode, secondary containers
  SURFACE_2:        '#253347',   // Mid slate — elevated surfaces
  SURFACE_3:        '#2D3F55',   // High slate — tertiary surfaces
  CARD_BG:          '#1E293B',   // = SURFACE_1
  CARD_BORDER:      '#334155',   // Neutral Gray — dividers, input borders, tab underlines
  TAB_BAR_BG:       '#0F172A',   // = DARK_BG

  // ── Text ───────────────────────────────────────────────────────────────────
  TEXT_PRIMARY:     '#F1F5F9',   // Light Gray — main text in dark mode
  TEXT_SECONDARY:   '#94A3B8',   // Gray — subtext, captions, timestamps
  TEXT_MUTED:       '#64748B',   // Muted — placeholders, disabled text
  TEXT_INVERSE:     '#0F172A',   // Dark text — for use on light/colored backgrounds

  // ── State / Semantic ────────────────────────────────────────────────────────
  SUCCESS:          '#22C55E',   // = SECONDARY (Fitness Green)
  WARNING:          '#F59E0B',   // Amber — warnings, moderation pending states
  ERROR:            '#EF4444',   // Red — errors and destructive actions
  INFO:             '#06B6D4',   // Cyan — informational messages, AI system bubbles

  // ── Semantic aliases (used across screens) ────────────────────────────────────
  ACCENT_GREEN:     '#22C55E',   // alias → SECONDARY
  ACCENT_PINK:      '#EC4899',   // Hot Pink — brand/social highlights

  // ── Borders / Dividers ──────────────────────────────────────────────────────
  BORDER:           '#334155',   // = CARD_BORDER
  DIVIDER:          '#1E293B',   // = SURFACE_1

  // ── Misc ───────────────────────────────────────────────────────────────────
  WHITE:            '#FFFFFF',
  BLACK:            '#000000',
  TRANSPARENT:      'transparent',
  OVERLAY:          'rgba(0,0,0,0.6)',
  OVERLAY_DARK:     'rgba(0,0,0,0.85)',

  // ── Gradients ──────────────────────────────────────────────────────────────
  GRADIENT_PRIMARY:   ['#4F46E5', '#7C3AED'] as const,   // Electric Blue → Violet
  GRADIENT_SECONDARY: ['#22C55E', '#16A34A'] as const,   // Fitness Green → Dark Green
  GRADIENT_DARK:      ['#0F172A', '#1E293B'] as const,   // Deep Navy → Slate
  GRADIENT_CARD:      ['#1E293B', '#334155'] as const,   // Slate → Border Gray
  GRADIENT_HERO:      ['rgba(0,0,0,0)', 'rgba(0,0,0,0.7)', '#0F172A'] as const,
  GRADIENT_VIOLET:    ['#4F46E5', '#7C3AED'] as const,   // Same as PRIMARY (Electric Blue family)
  GRADIENT_FIRE:      ['#F97316', '#EF4444'] as const,   // Energy Orange → Red
  GRADIENT_GREEN:     ['#22C55E', '#06B6D4'] as const,   // Fitness Green → Cyan
  GRADIENT_SPLASH:    ['#0F172A', '#1e1040', '#0F172A'] as const,

  // ── Charts ─────────────────────────────────────────────────────────────────
  CHART_1: '#4F46E5',   // PRIMARY (Electric Blue)
  CHART_2: '#F97316',   // ACCENT (Energy Orange)
  CHART_3: '#22C55E',   // SECONDARY (Fitness Green)
  CHART_4: '#F59E0B',   // WARNING (Amber)
};

export default COLORS;
