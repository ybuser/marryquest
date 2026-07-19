export type TemplateKey = 'mono' | 'editorial' | 'film' | 'bloom' | 'luxe' | 'modern' | 'hanok';

export interface TypographyScale {
  h1: string;
  h2: string;
  h3: string;
  body: string;
  eyebrow: string;
}

export interface ThemeTokens {
  key: TemplateKey;
  name: string;
  description: string;
  concept: string;
  recommendedFor: string;
  typography: {
    fontFamily: string;
    headingWeight: number;
    bodyWeight: number;
    scale: TypographyScale;
    letterSpacing: string;
  };
  spacing: {
    base: number;
    section: number;
    cardPadding: string;
  };
  gallery: {
    columns: number;
    aspectRatio: string;
    gap: string;
  };
  palette: {
    background: string;
    foreground: string;
    muted: string;
    accent: string;
    surface: string;
    surfaceElevated: string;
    surfaceForeground: string;
    surfaceMutedForeground: string;
    fieldBackground: string;
    fieldForeground: string;
    fieldPlaceholder: string;
    border: string;
    controlBackground: string;
    controlForeground: string;
  };
}

export const themeTokens: Record<TemplateKey, ThemeTokens> = {
  mono: {
    key: 'mono',
    name: 'Mono Minimal',
    description: 'Calm, typographic, and precise with monospaced details.',
    concept: 'Minimal',
    recommendedFor: 'Calm weddings with restrained, minimal direction',
    typography: {
      fontFamily: 'Space Mono, ui-monospace, SFMono-Regular, Menlo, monospace',
      headingWeight: 700,
      bodyWeight: 400,
      scale: {
        h1: 'clamp(2.25rem, 4vw, 3rem)',
        h2: 'clamp(1.5rem, 3vw, 2rem)',
        h3: '1.25rem',
        body: '1rem',
        eyebrow: '0.75rem'
      },
      letterSpacing: '0.02em'
    },
    spacing: {
      base: 12,
      section: 16,
      cardPadding: '1.5rem'
    },
    gallery: {
      columns: 3,
      aspectRatio: '3 / 4',
      gap: '0.65rem'
    },
    palette: {
      background: '#0b1120',
      foreground: '#f8fafc',
      muted: '#1e293b',
      accent: '#22d3ee',
      surface: '#111827',
      surfaceElevated: '#1e293b',
      surfaceForeground: '#f8fafc',
      surfaceMutedForeground: '#cbd5e1',
      fieldBackground: '#0f172a',
      fieldForeground: '#f8fafc',
      fieldPlaceholder: '#cbd5e1',
      border: '#64748b',
      controlBackground: '#22d3ee',
      controlForeground: '#083344'
    }
  },
  editorial: {
    key: 'editorial',
    name: 'Editorial Magazine',
    description: 'Elegant serif headlines with generous whitespace.',
    concept: 'Classic',
    recommendedFor: 'Editorial wedding pages with a polished photo-led feel',
    typography: {
      fontFamily: 'Playfair Display, Georgia, serif',
      headingWeight: 700,
      bodyWeight: 500,
      scale: {
        h1: 'clamp(2.75rem, 5vw, 3.75rem)',
        h2: 'clamp(1.85rem, 3vw, 2.5rem)',
        h3: '1.35rem',
        body: '1.05rem',
        eyebrow: '0.85rem'
      },
      letterSpacing: '0.01em'
    },
    spacing: {
      base: 18,
      section: 22,
      cardPadding: '2rem'
    },
    gallery: {
      columns: 2,
      aspectRatio: '4 / 5',
      gap: '1rem'
    },
    palette: {
      background: '#f8fafc',
      foreground: '#0f172a',
      muted: '#e2e8f0',
      accent: '#7c3aed',
      surface: '#ffffff',
      surfaceElevated: '#f1f5f9',
      surfaceForeground: '#0f172a',
      surfaceMutedForeground: '#475569',
      fieldBackground: '#ffffff',
      fieldForeground: '#0f172a',
      fieldPlaceholder: '#475569',
      border: '#64748b',
      controlBackground: '#7c3aed',
      controlForeground: '#ffffff'
    }
  },
  film: {
    key: 'film',
    name: 'Film Strip',
    description: 'Cinematic layout with horizontal storytelling and bold contrasts.',
    concept: 'Cinematic',
    recommendedFor: 'Story-driven invitations built around cinematic snapshots',
    typography: {
      fontFamily: 'Inter, system-ui, -apple-system, "Segoe UI", sans-serif',
      headingWeight: 700,
      bodyWeight: 500,
      scale: {
        h1: 'clamp(2.4rem, 5vw, 3.2rem)',
        h2: 'clamp(1.6rem, 3vw, 2.2rem)',
        h3: '1.2rem',
        body: '1rem',
        eyebrow: '0.8rem'
      },
      letterSpacing: '0.04em'
    },
    spacing: {
      base: 14,
      section: 18,
      cardPadding: '1.75rem'
    },
    gallery: {
      columns: 4,
      aspectRatio: '16 / 9',
      gap: '0.5rem'
    },
    palette: {
      background: '#0f172a',
      foreground: '#e2e8f0',
      muted: '#1f2937',
      accent: '#f97316',
      surface: '#1f2937',
      surfaceElevated: '#293548',
      surfaceForeground: '#f8fafc',
      surfaceMutedForeground: '#cbd5e1',
      fieldBackground: '#111827',
      fieldForeground: '#f8fafc',
      fieldPlaceholder: '#cbd5e1',
      border: '#94a3b8',
      controlBackground: '#f97316',
      controlForeground: '#111827'
    }
  },
  bloom: {
    key: 'bloom',
    name: 'Bloom Pop',
    description: 'Cute pastel mood with playful pop-up accents and soft gradients.',
    concept: 'Cute Girly',
    recommendedFor: 'Playful couples who want bright color and romantic energy',
    typography: {
      fontFamily: 'Nunito, "Noto Sans KR", Inter, sans-serif',
      headingWeight: 700,
      bodyWeight: 500,
      scale: {
        h1: 'clamp(2.35rem, 5vw, 3.2rem)',
        h2: 'clamp(1.65rem, 3vw, 2.3rem)',
        h3: '1.2rem',
        body: '1.02rem',
        eyebrow: '0.8rem'
      },
      letterSpacing: '0.01em'
    },
    spacing: {
      base: 14,
      section: 18,
      cardPadding: '1.6rem'
    },
    gallery: {
      columns: 2,
      aspectRatio: '4 / 5',
      gap: '0.9rem'
    },
    palette: {
      background: '#fff7fb',
      foreground: '#4c1d4f',
      muted: '#fce7f3',
      accent: '#be185d',
      surface: '#ffffff',
      surfaceElevated: '#fdf2f8',
      surfaceForeground: '#4c1d4f',
      surfaceMutedForeground: '#6b214f',
      fieldBackground: '#ffffff',
      fieldForeground: '#4c1d4f',
      fieldPlaceholder: '#6b214f',
      border: '#a8557b',
      controlBackground: '#be185d',
      controlForeground: '#ffffff'
    }
  },
  luxe: {
    key: 'luxe',
    name: 'Luxe Signature',
    description: 'Premium ivory and gold palette with high-end editorial tone.',
    concept: 'Luxury',
    recommendedFor: 'Formal hotel weddings and premium ceremony styling',
    typography: {
      fontFamily: '"Cormorant Garamond", "Noto Serif KR", Georgia, serif',
      headingWeight: 700,
      bodyWeight: 500,
      scale: {
        h1: 'clamp(2.8rem, 5.2vw, 3.9rem)',
        h2: 'clamp(1.95rem, 3.2vw, 2.7rem)',
        h3: '1.35rem',
        body: '1.03rem',
        eyebrow: '0.78rem'
      },
      letterSpacing: '0.03em'
    },
    spacing: {
      base: 18,
      section: 22,
      cardPadding: '2rem'
    },
    gallery: {
      columns: 2,
      aspectRatio: '4 / 5',
      gap: '1rem'
    },
    palette: {
      background: '#13100b',
      foreground: '#f8f3ea',
      muted: '#2a241b',
      accent: '#d4af37',
      surface: '#251f17',
      surfaceElevated: '#30281e',
      surfaceForeground: '#f8f3ea',
      surfaceMutedForeground: '#ded5c7',
      fieldBackground: '#1d1812',
      fieldForeground: '#f8f3ea',
      fieldPlaceholder: '#d4c8b5',
      border: '#9c8242',
      controlBackground: '#d4af37',
      controlForeground: '#1a150d'
    }
  },
  modern: {
    key: 'modern',
    name: 'Modern Clean',
    description: 'Simple and fresh layout focused on readability and rhythm.',
    concept: 'Simple Modern',
    recommendedFor: 'Clean, information-first invitations with modern restraint',
    typography: {
      fontFamily: 'Manrope, "Noto Sans KR", Inter, sans-serif',
      headingWeight: 700,
      bodyWeight: 500,
      scale: {
        h1: 'clamp(2.2rem, 4.8vw, 3rem)',
        h2: 'clamp(1.5rem, 3vw, 2.1rem)',
        h3: '1.15rem',
        body: '0.98rem',
        eyebrow: '0.76rem'
      },
      letterSpacing: '0.01em'
    },
    spacing: {
      base: 12,
      section: 16,
      cardPadding: '1.4rem'
    },
    gallery: {
      columns: 3,
      aspectRatio: '1 / 1',
      gap: '0.7rem'
    },
    palette: {
      background: '#f8fafc',
      foreground: '#0f172a',
      muted: '#e2e8f0',
      accent: '#0369a1',
      surface: '#ffffff',
      surfaceElevated: '#f1f5f9',
      surfaceForeground: '#0f172a',
      surfaceMutedForeground: '#475569',
      fieldBackground: '#ffffff',
      fieldForeground: '#0f172a',
      fieldPlaceholder: '#475569',
      border: '#64748b',
      controlBackground: '#0369a1',
      controlForeground: '#ffffff'
    }
  },
  hanok: {
    key: 'hanok',
    name: 'Hanok Calm',
    description: 'Korean-inspired neutral palette with understated elegance.',
    concept: 'K-Modern',
    recommendedFor: 'Couples blending Korean warmth with a modern presentation',
    typography: {
      fontFamily: '"Noto Serif KR", "Noto Sans KR", serif',
      headingWeight: 600,
      bodyWeight: 500,
      scale: {
        h1: 'clamp(2.35rem, 4.8vw, 3.15rem)',
        h2: 'clamp(1.55rem, 3vw, 2.2rem)',
        h3: '1.22rem',
        body: '1rem',
        eyebrow: '0.8rem'
      },
      letterSpacing: '0.01em'
    },
    spacing: {
      base: 14,
      section: 18,
      cardPadding: '1.7rem'
    },
    gallery: {
      columns: 3,
      aspectRatio: '3 / 4',
      gap: '0.8rem'
    },
    palette: {
      background: '#f6f1e7',
      foreground: '#2d2a26',
      muted: '#e6dcc8',
      accent: '#8b5e34',
      surface: '#fffaf0',
      surfaceElevated: '#eee4d2',
      surfaceForeground: '#2d2a26',
      surfaceMutedForeground: '#5f5347',
      fieldBackground: '#fffaf0',
      fieldForeground: '#2d2a26',
      fieldPlaceholder: '#5f5347',
      border: '#7a6047',
      controlBackground: '#8b5e34',
      controlForeground: '#fffaf0'
    }
  }
};
