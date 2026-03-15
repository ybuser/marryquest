import type { AppProps } from 'next/app';
import type { Session } from 'next-auth';
import Head from 'next/head';
import { SessionProvider } from 'next-auth/react';
import { LanguageProvider } from '@/components/i18n/LanguageProvider';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import type { TemplateKey } from '@/components/theme/tokens';
import '../styles/globals.css';

interface ExtendedPageProps {
  templateKey?: TemplateKey;
  session?: Session;
}

export default function MyApp({ Component, pageProps }: AppProps<ExtendedPageProps>) {
  const templateKey = pageProps.templateKey;

  return (
    <SessionProvider session={pageProps.session}>
      <LanguageProvider>
        <ThemeProvider templateKey={templateKey}>
          <Head>
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <meta name="description" content="MarryQuest | 인터랙티브 모바일 청첩장 빌더" />
            <link rel="icon" href="/favicon.ico" />
          </Head>
          <Component {...pageProps} />
        </ThemeProvider>
      </LanguageProvider>
    </SessionProvider>
  );
}
