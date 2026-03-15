import Head from 'next/head';
import Link from 'next/link';
import type { GetServerSideProps } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

interface HomeProps {
  isAuthenticated: boolean;
}

const featureCards = [
  {
    title: 'Playable Invitation',
    description: 'Turn one wedding page into a guest experience with quiz badges, timeline puzzles, RSVP, and voting.'
  },
  {
    title: 'Live Builder',
    description: 'Edit in the builder and watch the preview respond instantly, so couples can tune the final flow fast.'
  },
  {
    title: 'Guest-Safe Interactions',
    description: 'Rate limits, publish controls, and lightweight guest actions keep the experience fun without creating admin noise.'
  }
];

const launchSteps = [
  {
    label: '01',
    title: 'Create the base invitation',
    description: 'Start from a template, set the couple, date, venue, and core sections.'
  },
  {
    label: '02',
    title: 'Tune the interactive sections',
    description: 'Add quizzes, timeline cards, music votes, food votes, guestbook rules, and preview them live.'
  },
  {
    label: '03',
    title: 'Publish and share',
    description: 'Lock in the slug, open the public page, and send a link that feels more alive than a static card.'
  }
];

export const getServerSideProps: GetServerSideProps<HomeProps> = async (ctx) => {
  const session = await getServerSession(ctx.req, ctx.res, authOptions);
  return { props: { isAuthenticated: Boolean(session?.user?.id) } };
};

export default function Home({ isAuthenticated }: HomeProps) {
  const ctaHref = isAuthenticated ? '/dashboard' : '/login?callbackUrl=%2Fdashboard';
  const ctaLabel = isAuthenticated ? 'Open dashboard' : 'Sign in and start';

  return (
    <>
      <Head>
        <title>MarryQuest | Interactive Wedding Invitation Builder</title>
      </Head>
      <main className="relative min-h-screen overflow-hidden bg-[#030712] text-white">
        <div className="pointer-events-none absolute inset-0">
          <div className="orb orb-cyan" />
          <div className="orb orb-pink" />
          <div className="orb orb-blue" />
          <div className="grid-overlay" />
        </div>

        <div className="relative mx-auto flex w-full max-w-6xl flex-col px-4 pb-16 pt-6 sm:px-6 sm:pt-8 lg:px-8">
          <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="tracking-[0.22em] text-xs uppercase text-cyan-200/80">MarryQuest</div>
            <div className="inline-flex w-fit rounded-full border border-cyan-100/20 bg-white/5 px-3 py-1 text-[11px] text-cyan-100/80 backdrop-blur">
              Interactive wedding invitation platform
            </div>
          </header>

          <section className="mt-12 grid items-start gap-8 lg:mt-16 lg:grid-cols-[1.12fr_0.88fr] lg:gap-10">
            <div>
              <p className="mb-4 inline-flex rounded-full border border-cyan-300/30 bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-100">
                MODERN WEDDING EXPERIENCE
              </p>
              <h1
                className="max-w-3xl text-4xl font-bold leading-[1.05] sm:text-5xl lg:text-6xl"
                style={{ fontFamily: "'Orbitron', 'Space Mono', sans-serif" }}
              >
                Design a wedding page
                <br />
                guests can actually play with
              </h1>
              <p
                className="mt-5 max-w-2xl text-base leading-7 text-slate-200/90 sm:text-lg"
                style={{ fontFamily: "'Manrope', 'Inter', sans-serif" }}
              >
                MarryQuest combines invitation design, interactive guest moments, and a live builder so couples can ship
                a polished invitation without juggling multiple tools.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <Link
                  href={ctaHref}
                  className="group inline-flex items-center justify-center rounded-full border border-cyan-100/50 bg-white px-6 py-3 text-sm font-semibold text-slate-900 shadow-[0_0_35px_rgba(56,189,248,0.4)] transition hover:-translate-y-0.5 hover:shadow-[0_0_45px_rgba(34,211,238,0.6)]"
                >
                  {ctaLabel}
                  <span className="ml-2 transition group-hover:translate-x-0.5">→</span>
                </Link>
                <Link
                  href="/login?callbackUrl=%2Fdashboard"
                  className="inline-flex items-center justify-center rounded-full border border-white/25 bg-white/5 px-5 py-3 text-sm font-medium text-white/90 backdrop-blur transition hover:bg-white/10"
                >
                  Open test-user login
                </Link>
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                  <p className="text-xs uppercase tracking-[0.18em] text-cyan-100/70">Templates</p>
                  <p className="mt-2 text-2xl font-semibold text-white">7</p>
                  <p className="mt-1 text-sm text-slate-300">Distinct visual directions with section-level motion.</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                  <p className="text-xs uppercase tracking-[0.18em] text-cyan-100/70">Builder</p>
                  <p className="mt-2 text-2xl font-semibold text-white">Live</p>
                  <p className="mt-1 text-sm text-slate-300">Edit and preview side by side, with guided walkthroughs.</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                  <p className="text-xs uppercase tracking-[0.18em] text-cyan-100/70">Guests</p>
                  <p className="mt-2 text-2xl font-semibold text-white">RSVP+</p>
                  <p className="mt-1 text-sm text-slate-300">Guestbook, voting, puzzle play, and quiz badge rewards.</p>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="rounded-[2rem] border border-cyan-100/20 bg-white/10 p-5 backdrop-blur-xl shadow-[0_24px_80px_rgba(8,15,33,0.45)] sm:p-6">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-cyan-100/80">Studio snapshot</p>
                    <p className="mt-1 text-lg font-semibold text-white">One invitation, many guest touchpoints</p>
                  </div>
                  <div className="rounded-full bg-emerald-400/20 px-2.5 py-1 text-[11px] font-semibold text-emerald-200">
                    Live
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="rounded-2xl border border-white/15 bg-slate-950/40 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.16em] text-slate-300">Engagement flow</p>
                        <p className="mt-2 text-2xl font-semibold text-white">87%</p>
                      </div>
                      <div className="rounded-full border border-cyan-300/30 bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-100">
                        RSVP + polls
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-white/15 bg-slate-950/40 p-4">
                      <p className="text-[11px] uppercase tracking-[0.16em] text-slate-300">Guestbook today</p>
                      <p className="mt-2 text-2xl font-semibold text-white">+24</p>
                    </div>
                    <div className="rounded-2xl border border-white/15 bg-slate-950/40 p-4">
                      <p className="text-[11px] uppercase tracking-[0.16em] text-slate-300">Top menu vote</p>
                      <p className="mt-2 text-lg font-semibold text-cyan-100">Truffle gnocchi</p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/15 bg-gradient-to-br from-cyan-400/10 to-fuchsia-400/10 p-4">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-slate-200">What couples get</p>
                    <ul className="mt-3 space-y-2 text-sm text-slate-100/90">
                      <li>Live preview that follows builder edits</li>
                      <li>Interactive guestbook, quiz, timeline, and votes</li>
                      <li>Template-specific animation and publish controls</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="mt-12 grid gap-4 md:grid-cols-3">
            {featureCards.map((card) => (
              <article
                key={card.title}
                className="group rounded-2xl border border-white/15 bg-white/5 p-5 backdrop-blur transition duration-300 hover:-translate-y-1 hover:border-cyan-200/50 hover:bg-white/10"
              >
                <h2 className="text-base font-semibold text-cyan-100">{card.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-200/90">{card.description}</p>
              </article>
            ))}
          </section>

          <section className="mt-10 rounded-[2rem] border border-white/10 bg-white/5 p-5 backdrop-blur sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-cyan-100/70">Launch flow</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">A clean path from draft to published invitation</h2>
              </div>
              <p className="max-w-xl text-sm leading-6 text-slate-300">
                The builder is structured so couples can move from content entry to interactive tuning to publishing
                without losing context.
              </p>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-3">
              {launchSteps.map((step) => (
                <article key={step.label} className="rounded-2xl border border-white/10 bg-slate-950/30 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100/70">{step.label}</p>
                  <h3 className="mt-2 text-lg font-semibold text-white">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{step.description}</p>
                </article>
              ))}
            </div>
          </section>
        </div>

        <style jsx>{`
          .orb {
            position: absolute;
            filter: blur(65px);
            border-radius: 9999px;
            opacity: 0.6;
          }

          .orb-cyan {
            width: 24rem;
            height: 24rem;
            top: -8rem;
            left: -6rem;
            background: radial-gradient(circle, #22d3ee 0%, rgba(34, 211, 238, 0) 70%);
            animation: driftA 13s ease-in-out infinite;
          }

          .orb-pink {
            width: 26rem;
            height: 26rem;
            top: 35%;
            right: -10rem;
            background: radial-gradient(circle, #fb7185 0%, rgba(251, 113, 133, 0) 70%);
            animation: driftB 15s ease-in-out infinite;
          }

          .orb-blue {
            width: 20rem;
            height: 20rem;
            bottom: -6rem;
            left: 35%;
            background: radial-gradient(circle, #6366f1 0%, rgba(99, 102, 241, 0) 70%);
            animation: driftA 17s ease-in-out infinite;
          }

          .grid-overlay {
            position: absolute;
            inset: 0;
            background-image:
              linear-gradient(rgba(148, 163, 184, 0.14) 1px, transparent 1px),
              linear-gradient(90deg, rgba(148, 163, 184, 0.14) 1px, transparent 1px);
            background-size: 42px 42px;
            mask-image: radial-gradient(circle at center, rgba(0, 0, 0, 0.65), transparent 80%);
          }

          @keyframes driftA {
            0%,
            100% {
              transform: translateY(0) translateX(0) scale(1);
            }
            50% {
              transform: translateY(24px) translateX(-20px) scale(1.08);
            }
          }

          @keyframes driftB {
            0%,
            100% {
              transform: translateY(0) translateX(0) scale(1);
            }
            50% {
              transform: translateY(-18px) translateX(18px) scale(1.06);
            }
          }
        `}</style>
      </main>
    </>
  );
}
