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
  };
}

export const themeTokens: Record<TemplateKey, ThemeTokens> = {
  mono: {
    key: 'mono',
    name: 'Mono Minimal',
    description: 'Calm, typographic, and precise with monospaced details.',
    concept: 'Minimal',
    recommendedFor: '차분하고 절제된 무드의 웨딩',
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
    concept: 'Classic',
    recommendedFor: '웨딩 화보 느낌의 정제된 구성',
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
    concept: 'Cinematic',
    recommendedFor: '영화 같은 스냅 중심의 청첩장',
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
  },
  bloom: {
    key: 'bloom',
    name: 'Bloom Pop',
    description: 'Cute pastel mood with playful pop-up accents and soft gradients.',
    concept: 'Cute Girly',
    recommendedFor: '발랄하고 사랑스러운 무드, 일러스트/컬러 스냅',
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
      accent: '#f472b6'
    }
  },
  luxe: {
    key: 'luxe',
    name: 'Luxe Signature',
    description: 'Premium ivory and gold palette with high-end editorial tone.',
    concept: 'Luxury',
    recommendedFor: '호텔 예식, 격식 있는 프리미엄 웨딩',
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
      accent: '#d4af37'
    }
  },
  modern: {
    key: 'modern',
    name: 'Modern Clean',
    description: 'Simple and fresh layout focused on readability and rhythm.',
    concept: 'Simple Modern',
    recommendedFor: '깔끔한 정보 전달 중심, 미니멀 웨딩',
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
      accent: '#0ea5e9'
    }
  },
  hanok: {
    key: 'hanok',
    name: 'Hanok Calm',
    description: 'Korean-inspired neutral palette with understated elegance.',
    concept: 'K-Modern',
    recommendedFor: '전통+모던 혼합 무드, 담백한 한국적 감성',
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
      accent: '#8b5e34'
    }
  }
};
