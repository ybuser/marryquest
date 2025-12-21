import type { AppProps } from 'next/app';
import Head from 'next/head';
import { ThemeProvider } from '../components/theme/ThemeProvider';
import '../styles/globals.css';
import type { ThemeKey } from '../components/theme/tokens';

interface ExtendedPageProps {
  templateKey?: ThemeKey;
}

export default function MyApp({ Component, pageProps }: AppProps<ExtendedPageProps>) {
  const templateKey = pageProps.templateKey;

  return (
    <ThemeProvider templateKey={templateKey}>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="MarryQuest – a modern invitation experience." />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Component {...pageProps} />
    </ThemeProvider>
  );
}
