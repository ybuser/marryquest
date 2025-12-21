import React, { createContext, useContext } from 'react';

import { themeTokens, type TemplateKey, type ThemeTokens } from './tokens';
import { cn } from '@/lib/utils';

type Invitation = {
  templateKey: TemplateKey;
};

type ThemeProviderProps = {
  invitation: Invitation;
  children: React.ReactNode;
  className?: string;
};

const ThemeContext = createContext<ThemeTokens>(themeTokens.mono);

export const ThemeProvider = ({ invitation, children, className }: ThemeProviderProps) => {
  const tokens = themeTokens[invitation.templateKey] ?? themeTokens.mono;

  return (
    <ThemeContext.Provider value={tokens}>
      <div className={cn('min-h-screen bg-white text-slate-900', tokens.wrapperClassName, className)}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
