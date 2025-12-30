import React, { createContext, useContext, useMemo } from 'react';
import type { TemplateKey, ThemeTokens } from './tokens';
import { themeTokens } from './tokens';

interface ThemeContextValue {
  theme: ThemeTokens;
  templateKey: TemplateKey;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

interface ThemeProviderProps {
  templateKey?: TemplateKey;
  children: React.ReactNode;
}

export function ThemeProvider({ templateKey = 'mono', children }: ThemeProviderProps) {
  const selected = useMemo(() => themeTokens[templateKey] ?? themeTokens.mono, [templateKey]);

  const cssVars: React.CSSProperties = {
    '--mq-heading-font': selected.typography.fontFamily,
    '--mq-heading-weight': selected.typography.headingWeight.toString(),
    '--mq-body-weight': selected.typography.bodyWeight.toString(),
    '--mq-letter-spacing': selected.typography.letterSpacing,
    '--mq-h1': selected.typography.scale.h1,
    '--mq-h2': selected.typography.scale.h2,
    '--mq-h3': selected.typography.scale.h3,
    '--mq-body': selected.typography.scale.body,
    '--mq-eyebrow': selected.typography.scale.eyebrow,
    '--mq-spacing-base': `${selected.spacing.base}px`,
    '--mq-spacing-section': `${selected.spacing.section}px`,
    '--mq-card-padding': selected.spacing.cardPadding,
    '--mq-gallery-columns': selected.gallery.columns.toString(),
    '--mq-gallery-gap': selected.gallery.gap,
    '--mq-gallery-aspect': selected.gallery.aspectRatio,
    '--mq-bg': selected.palette.background,
    '--mq-fg': selected.palette.foreground,
    '--mq-muted': selected.palette.muted,
    '--mq-accent': selected.palette.accent
  } as React.CSSProperties;

  const value: ThemeContextValue = {
    theme: selected,
    templateKey: selected.key
  };

  return (
    <ThemeContext.Provider value={value}>
      <div style={cssVars} className="min-h-screen" data-template={selected.key}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
