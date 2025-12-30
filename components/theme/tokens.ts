export type TemplateKey = 'mono' | 'editorial' | 'film';

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
  };
}

export const themeTokens: Record<TemplateKey, ThemeTokens> = {
  mono: {
    key: 'mono',
    name: 'Mono Minimal',
    description: 'Calm, typographic, and precise with monospaced details.',
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
      accent: '#22d3ee'
    }
  },
  editorial: {
    key: 'editorial',
    name: 'Editorial Magazine',
    description: 'Elegant serif headlines with generous whitespace.',
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
      accent: '#8b5cf6'
    }
  },
  film: {
    key: 'film',
    name: 'Film Strip',
    description: 'Cinematic layout with horizontal storytelling and bold contrasts.',
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
      accent: '#f97316'
    }
  }
};
