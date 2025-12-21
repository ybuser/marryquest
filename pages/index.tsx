import Head from 'next/head';

import { ThemeProvider, useTheme } from '@/components/theme/theme-provider';
import type { TemplateKey } from '@/components/theme/tokens';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const invitation = {
  templateKey: 'mono' as TemplateKey
};

const LandingContent = () => {
  const theme = useTheme();

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col px-6">
      <section className={`flex flex-1 flex-col justify-center ${theme.spacing.section}`}>
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">MarryQuest</p>
        <h1 className={`mt-4 ${theme.typography.heading}`}>The quiet, elegant way to invite.</h1>
        <p className={`mt-4 max-w-2xl ${theme.typography.subheading}`}>
          Build a story-first wedding invitation with playful guest moments, RSVP clarity, and
          gallery storytelling that adapts to every theme.
        </p>
        <div className={`mt-8 flex flex-wrap ${theme.spacing.gap}`}>
          <Button>Preview invitation</Button>
          <Button variant="outline">View templates</Button>
        </div>
      </section>

      <section className={`border-t border-slate-200 ${theme.spacing.section}`}>
        <div className={`grid gap-6 md:grid-cols-2 ${theme.spacing.gap}`}>
          <Card>
            <CardHeader>
              <CardTitle>Template: {theme.label}</CardTitle>
              <CardDescription>Typography scale, spacing, and gallery rhythm stay aligned.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className={theme.typography.body}>
                Switch the invitation template key to instantly reframe the experience without
                touching components.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Shared components</CardTitle>
              <CardDescription>One system, three visual directions.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className={theme.typography.body}>
                Each template keeps the same UI building blocks while re-scaling layout and tone.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className={`border-t border-slate-200 ${theme.spacing.section}`}>
        <div className="flex items-center justify-between">
          <h2 className={theme.typography.subheading}>Gallery preview</h2>
          <span className="text-xs text-slate-400">Layout: {theme.label}</span>
        </div>
        <div className={`mt-6 ${theme.gallery.container}`}>
          {['01', '02', '03', '04', '05', '06'].map((label) => (
            <div key={label} className={`flex aspect-[4/5] items-end p-4 ${theme.gallery.item}`}>
              <span className="text-xs text-slate-500">Photo {label}</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
};

export default function Home() {
  return (
    <ThemeProvider invitation={invitation}>
      <Head>
        <title>MarryQuest</title>
        <meta name="description" content="A refined wedding invitation experience." />
      </Head>
      <LandingContent />
    </ThemeProvider>
  );
}
