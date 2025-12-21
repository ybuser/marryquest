export type TemplateKey = 'mono' | 'editorial' | 'film';

export type ThemeTokens = {
  label: string;
  typography: {
    heading: string;
    subheading: string;
    body: string;
  };
  spacing: {
    section: string;
    gap: string;
  };
  gallery: {
    container: string;
    item: string;
  };
  wrapperClassName: string;
};

export const themeTokens: Record<TemplateKey, ThemeTokens> = {
  mono: {
    label: 'Mono Minimal',
    typography: {
      heading: 'text-3xl md:text-4xl font-mono tracking-tight',
      subheading: 'text-base md:text-lg font-mono text-slate-600',
      body: 'text-sm md:text-base font-mono text-slate-700'
    },
    spacing: {
      section: 'py-12 md:py-16',
      gap: 'gap-4 md:gap-6'
    },
    gallery: {
      container: 'grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4',
      item: 'rounded-xl bg-slate-100'
    },
    wrapperClassName: 'font-mono'
  },
  editorial: {
    label: 'Editorial Magazine',
    typography: {
      heading: 'text-4xl md:text-5xl font-serif tracking-tight',
      subheading: 'text-lg md:text-xl font-serif text-slate-600',
      body: 'text-base md:text-lg font-serif text-slate-700'
    },
    spacing: {
      section: 'py-16 md:py-20',
      gap: 'gap-6 md:gap-8'
    },
    gallery: {
      container: 'columns-2 md:columns-3 gap-4 space-y-4',
      item: 'rounded-2xl bg-slate-100 break-inside-avoid'
    },
    wrapperClassName: 'font-serif'
  },
  film: {
    label: 'Film Strip',
    typography: {
      heading: 'text-3xl md:text-4xl font-sans tracking-wide uppercase',
      subheading: 'text-sm md:text-base font-sans text-slate-500 uppercase',
      body: 'text-sm md:text-base font-sans text-slate-700'
    },
    spacing: {
      section: 'py-10 md:py-14',
      gap: 'gap-3 md:gap-4'
    },
    gallery: {
      container: 'flex gap-3 overflow-x-auto pb-2',
      item: 'min-w-[160px] md:min-w-[200px] rounded-lg bg-slate-100'
    },
    wrapperClassName: 'font-sans'
  }
};
