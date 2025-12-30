import Head from 'next/head';
import Image from 'next/image';
import type { GetServerSideProps } from 'next';
import { useTheme } from '@/components/theme/ThemeProvider';
import type { TemplateKey } from '@/components/theme/tokens';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';

interface HomeProps {
  templateKey: TemplateKey;
}

export const getServerSideProps: GetServerSideProps<HomeProps> = async (ctx) => {
  const template = ctx.query.template as TemplateKey | undefined;
  const templateKey = template ?? 'mono';
  return { props: { templateKey } };
};

export default function Home({ templateKey }: HomeProps) {
  const { theme } = useTheme();

  return (
    <>
      <Head>
        <title>MarryQuest</title>
      </Head>
      <main
        className="min-h-screen"
        style={{
          background: theme.palette.background,
          color: theme.palette.foreground,
          padding: `calc(var(--mq-spacing-section) * 1px)`,
          fontFamily: theme.typography.fontFamily,
          letterSpacing: theme.typography.letterSpacing
        }}
      >
        <header className="max-w-6xl mx-auto flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-4">
            <Badge className="bg-white/10 text-sm text-current ring-1 ring-inset ring-white/20">
              Template: {templateKey}
            </Badge>
            <div className="space-y-3">
              <p style={{ fontSize: 'var(--mq-eyebrow)', textTransform: 'uppercase', opacity: 0.8 }}>Online Invitation Builder</p>
              <h1
                style={{
                  fontSize: 'var(--mq-h1)',
                  fontWeight: theme.typography.headingWeight,
                  letterSpacing: theme.typography.letterSpacing
                }}
                className="leading-[1.05]"
              >
                MarryQuest
              </h1>
              <p style={{ fontSize: 'var(--mq-body)' }} className="max-w-2xl text-white/80 lg:text-lg">
                Create cinematic wedding invitations with interactive games, personal galleries, and effortless sharing.
                Pick from curated templates without changing your content or flow.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button>Launch Builder</Button>
              <Button variant="ghost">View Demo Invitation</Button>
            </div>
          </div>
          <div className="relative w-full max-w-sm lg:max-w-md aspect-[4/5] overflow-hidden rounded-3xl border border-white/10 shadow-2xl">
            <Image
              src="https://images.unsplash.com/photo-1520854221050-0f4caff449fb?auto=format&fit=crop&w=1200&q=80"
              alt="Couple"
              fill
              priority
              className="object-cover"
            />
          </div>
        </header>

        <section className="max-w-6xl mx-auto mt-16 space-y-8">
          <div className="section-grid">
            <Card className="lg:col-span-5">
              <CardHeader>
                <CardTitle>Templates as Theme Tokens</CardTitle>
                <CardDescription>
                  Swap tokens at runtime using the invitation templateKey. Typography, spacing, and galleries stay synced
                  across the experience.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm leading-relaxed text-slate-700">
                <ul className="list-disc space-y-2 pl-5">
                  <li>Mono Minimal: monospaced, compact rhythm, technical feel.</li>
                  <li>Editorial Magazine: serif headlines, airy white space.</li>
                  <li>Film Strip: cinematic frames with panoramic galleries.</li>
                </ul>
                <p className="text-slate-600">All themes reuse the same UI components.</p>
              </CardContent>
            </Card>
            <Card className="lg:col-span-7">
              <CardHeader>
                <CardTitle>Interactive Gallery</CardTitle>
                <CardDescription>Gallery grid adapts per template columns and aspect ratios.</CardDescription>
              </CardHeader>
              <CardContent>
                <div
                  className="grid"
                  style={{
                    gridTemplateColumns: `repeat(var(--mq-gallery-columns), minmax(0, 1fr))`,
                    gap: 'var(--mq-gallery-gap)'
                  }}
                >
                  {[1, 2, 3, 4, 5, 6].map((item) => (
                    <div key={item} className="relative overflow-hidden rounded-xl" style={{ aspectRatio: 'var(--mq-gallery-aspect)' }}>
                      <Image
                        src={`https://images.unsplash.com/photo-150${20 + item}0589-9e3b4e5303d7?auto=format&fit=crop&w=800&q=60`}
                        alt={`Gallery ${item}`}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="max-w-6xl mx-auto mt-16 grid gap-6 md:grid-cols-3">
          {[
            {
              title: 'Secure by default',
              body: 'CSP, HSTS, and strict policies are applied to every route.',
              action: 'View headers'
            },
            {
              title: 'Validated inputs',
              body: 'Centralized Zod helpers keep API contracts trustworthy.',
              action: 'Review schemas'
            },
            {
              title: 'Rate limited APIs',
              body: 'Wrap API handlers to protect against abusive bursts.',
              action: 'Inspect middleware'
            }
          ].map((feature) => (
            <Card key={feature.title}>
              <CardHeader>
                <CardTitle>{feature.title}</CardTitle>
                <CardDescription>{feature.body}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" size="sm">
                  {feature.action}
                </Button>
              </CardContent>
            </Card>
          ))}
        </section>
      </main>
    </>
  );
}
