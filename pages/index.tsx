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
    description: '퀴즈, 타임라인 퍼즐, 음식·음악 투표까지 한 장의 청첩장에 담아 하객의 참여를 끌어냅니다.'
  },
  {
    title: 'Live Builder Flow',
    description: '빌더에서 수정하면 미리보기에 즉시 반영되어 신랑·신부가 완성본을 빠르게 다듬을 수 있습니다.'
  },
  {
    title: 'Guest-First UX',
    description: '로그인 없이도 하객 참여가 가능하고, 안정적인 제한 정책으로 운영 부담을 줄입니다.'
  }
];

export const getServerSideProps: GetServerSideProps<HomeProps> = async (ctx) => {
  const session = await getServerSession(ctx.req, ctx.res, authOptions);
  return { props: { isAuthenticated: Boolean(session?.user?.id) } };
};

export default function Home({ isAuthenticated }: HomeProps) {
  const ctaHref = isAuthenticated ? '/dashboard' : '/login?callbackUrl=%2Fdashboard';
  const ctaLabel = isAuthenticated ? 'Dashboard 열기' : '로그인하고 시작하기';

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

        <div className="relative mx-auto flex w-full max-w-6xl flex-col px-5 pb-16 pt-8 sm:px-8 md:pt-10">
          <header className="flex items-center justify-between">
            <div className="tracking-[0.22em] text-xs uppercase text-cyan-200/80">MarryQuest</div>
            <div className="rounded-full border border-cyan-100/20 bg-white/5 px-3 py-1 text-[11px] text-cyan-100/80 backdrop-blur">
              Interactive Invitation Platform
            </div>
          </header>

          <section className="mt-14 grid items-center gap-10 lg:mt-16 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              <p className="mb-4 inline-flex rounded-full border border-cyan-300/30 bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-100">
                FUTURE WEDDING EXPERIENCE
              </p>
              <h1
                className="max-w-3xl text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl"
                style={{ fontFamily: "'Orbitron', 'Space Mono', sans-serif" }}
              >
                받는 사람도 즐거운
                <br />
                우리의 청첩장 만들기
              </h1>
              <p className="mt-6 max-w-2xl text-base text-slate-200/90 sm:text-lg" style={{ fontFamily: "'Manrope', 'Inter', sans-serif" }}>
                MarryQuest는 정보 전달형 청첩장을 넘어, 하객이 함께 놀고 반응하는 인터랙티브 청첩장 빌더입니다.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  href={ctaHref}
                  className="group inline-flex items-center rounded-full border border-cyan-100/50 bg-white px-6 py-3 text-sm font-semibold text-slate-900 shadow-[0_0_35px_rgba(56,189,248,0.4)] transition hover:-translate-y-0.5 hover:shadow-[0_0_45px_rgba(34,211,238,0.6)]"
                >
                  {ctaLabel}
                  <span className="ml-2 transition group-hover:translate-x-0.5">→</span>
                </Link>
                <Link
                  href="/login?callbackUrl=%2Fdashboard"
                  className="inline-flex items-center rounded-full border border-white/25 bg-white/5 px-5 py-3 text-sm font-medium text-white/90 backdrop-blur transition hover:bg-white/10"
                >
                  Builder 관리자 로그인
                </Link>
              </div>

              <div className="mt-8 flex flex-wrap gap-3 text-xs text-slate-200/90">
                <span className="rounded-full border border-white/20 bg-white/5 px-3 py-1">퀴즈 & 타임라인 퍼즐</span>
                <span className="rounded-full border border-white/20 bg-white/5 px-3 py-1">음악/음식 투표</span>
                <span className="rounded-full border border-white/20 bg-white/5 px-3 py-1">방명록 + RSVP</span>
              </div>
            </div>

            <div className="relative">
              <div className="h-full rounded-3xl border border-cyan-100/20 bg-white/10 p-5 backdrop-blur-xl">
                <div className="mb-4 flex items-center justify-between">
                  <div className="text-xs uppercase tracking-[0.18em] text-cyan-100/80">Invitation Pulse</div>
                  <div className="rounded-full bg-emerald-400/20 px-2 py-1 text-[11px] text-emerald-200">Live</div>
                </div>
                <div className="space-y-3">
                  <div className="rounded-2xl border border-white/15 bg-slate-950/40 p-3">
                    <p className="text-[11px] text-slate-300">참여율</p>
                    <p className="mt-2 text-2xl font-semibold text-white">87%</p>
                  </div>
                  <div className="rounded-2xl border border-white/15 bg-slate-950/40 p-3">
                    <p className="text-[11px] text-slate-300">오늘 방명록</p>
                    <p className="mt-2 text-2xl font-semibold text-white">+24</p>
                  </div>
                  <div className="rounded-2xl border border-white/15 bg-slate-950/40 p-3">
                    <p className="text-[11px] text-slate-300">최다 투표 메뉴</p>
                    <p className="mt-2 text-lg font-semibold text-cyan-100">크림 뇨끼</p>
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
