import Head from 'next/head';
import Link from 'next/link';
import type { GetServerSideProps } from 'next';
import { getServerSession } from 'next-auth';
import { LanguageToggle } from '@/components/i18n/LanguageToggle';
import { useLanguage } from '@/components/i18n/LanguageProvider';
import { authOptions } from '@/lib/auth';

interface HomeProps {
  isAuthenticated: boolean;
}

export const getServerSideProps: GetServerSideProps<HomeProps> = async (ctx) => {
  const session = await getServerSession(ctx.req, ctx.res, authOptions);
  return { props: { isAuthenticated: Boolean(session?.user?.id) } };
};

export default function Home({ isAuthenticated }: HomeProps) {
  const { isKorean } = useLanguage();

  const featureCards = isKorean
    ? [
        {
          title: '하객 참여형 청첩장',
          description: '방명록, 참석 여부, 퀴즈, 타임라인 퍼즐, 메뉴 투표까지 한 페이지 안에서 자연스럽게 이어집니다.'
        },
        {
          title: '실시간 미리보기 빌더',
          description: '수정하는 즉시 결과를 보면서 문구, 섹션 흐름, 템플릿 분위기를 빠르게 다듬을 수 있습니다.'
        },
        {
          title: '운영이 편한 공개 구조',
          description: '공개 상태, 투표 제한, 방명록 관리 기능이 갖춰져 있어 실제 청첩장 운영에도 부담이 적습니다.'
        }
      ]
    : [
        {
          title: 'Playable Invitation',
          description: 'Guestbook, RSVP, quizzes, timeline puzzles, and menu voting all live in one invitation flow.'
        },
        {
          title: 'Live Builder',
          description: 'Edit copy, sections, and template mood while watching the result update instantly.'
        },
        {
          title: 'Ready for real guests',
          description: 'Publish controls, vote limits, and moderation tools make the invitation practical to run.'
        }
      ];

  const launchSteps = isKorean
    ? [
        {
          label: '01',
          title: '청첩장 기본 정보 입력',
          description: '신랑 신부 이름, 예식 일시, 장소, 템플릿을 정하고 기본 구성을 빠르게 잡습니다.'
        },
        {
          label: '02',
          title: '참여형 섹션 완성',
          description: '방명록, 퀴즈, 타임라인, 식사 메뉴 투표, 식전 음악 투표까지 원하는 기능만 골라 구성합니다.'
        },
        {
          label: '03',
          title: '공개 후 링크 공유',
          description: '슬러그와 공개 상태를 정리한 뒤 하객에게 바로 보낼 수 있는 청첩장 링크를 발행합니다.'
        }
      ]
    : [
        {
          label: '01',
          title: 'Set the invitation basics',
          description: 'Choose the couple, date, venue, and template before shaping the page structure.'
        },
        {
          label: '02',
          title: 'Tune the interactive sections',
          description: 'Enable the guestbook, quiz, timeline, menu voting, and music voting as needed.'
        },
        {
          label: '03',
          title: 'Publish and share',
          description: 'Confirm the slug, review the public page, and send one clean invitation link.'
        }
      ];

  const ctaHref = isAuthenticated ? '/dashboard' : '/login?callbackUrl=%2Fdashboard';
  const ctaLabel = isAuthenticated
    ? isKorean
      ? '대시보드로 이동'
      : 'Open dashboard'
    : isKorean
      ? '로그인하고 시작하기'
      : 'Sign in and start';

  return (
    <>
      <Head>
        <title>{isKorean ? 'MarryQuest | 인터랙티브 모바일 청첩장 빌더' : 'MarryQuest | Interactive Wedding Invitation Builder'}</title>
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
            <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
              <div className="inline-flex w-fit rounded-full border border-cyan-100/20 bg-white/5 px-3 py-1 text-[11px] text-cyan-100/80 backdrop-blur">
                {isKorean ? '모바일 청첩장 빌더' : 'Interactive wedding invitation platform'}
              </div>
              <LanguageToggle variant="dark" />
            </div>
          </header>

          <section className="mt-12 grid items-start gap-8 lg:mt-16 lg:grid-cols-[1.12fr_0.88fr] lg:gap-10">
            <div>
              <p className="mb-4 inline-flex rounded-full border border-cyan-300/30 bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-100">
                {isKorean ? '하객이 반응하는 청첩장' : 'MODERN WEDDING EXPERIENCE'}
              </p>
              <h1
                className="max-w-3xl text-4xl font-bold leading-[1.05] sm:text-5xl lg:text-6xl"
                style={{ fontFamily: "'Orbitron', 'Space Mono', sans-serif" }}
              >
                {isKorean ? (
                  <>
                    초대하는 순간부터
                    <br />
                    더 재미있는 모바일 청첩장
                  </>
                ) : (
                  <>
                    Design a wedding page
                    <br />
                    guests can actually play with
                  </>
                )}
              </h1>
              <p
                className="mt-5 max-w-2xl text-base leading-7 text-slate-200/90 sm:text-lg"
                style={{ fontFamily: "'Manrope', 'Inter', sans-serif" }}
              >
                {isKorean
                  ? 'MarryQuest는 단순히 정보만 전달하는 모바일 청첩장이 아니라, 하객이 남기고 누르고 참여할 수 있는 흐름까지 함께 설계하는 청첩장 제작 도구입니다.'
                  : 'MarryQuest combines invitation design, interactive guest moments, and a live builder so couples can ship a polished invitation without juggling multiple tools.'}
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
                  {isKorean ? '관리자 로그인' : 'Owner sign-in'}
                </Link>
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                  <p className="text-xs uppercase tracking-[0.18em] text-cyan-100/70">{isKorean ? '템플릿' : 'Templates'}</p>
                  <p className="mt-2 text-2xl font-semibold text-white">7</p>
                  <p className="mt-1 text-sm text-slate-300">
                    {isKorean ? '분위기가 분명한 청첩장 템플릿을 바로 선택할 수 있습니다.' : 'Distinct visual directions with section-level motion.'}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                  <p className="text-xs uppercase tracking-[0.18em] text-cyan-100/70">{isKorean ? '빌더' : 'Builder'}</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{isKorean ? '실시간' : 'Live'}</p>
                  <p className="mt-1 text-sm text-slate-300">
                    {isKorean ? '편집과 미리보기를 오가며 완성본을 빠르게 다듬을 수 있습니다.' : 'Edit and preview side by side, with guided walkthroughs.'}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                  <p className="text-xs uppercase tracking-[0.18em] text-cyan-100/70">{isKorean ? '하객 기능' : 'Guests'}</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{isKorean ? '참여형' : 'RSVP+'}</p>
                  <p className="mt-1 text-sm text-slate-300">
                    {isKorean ? '방명록, 참석 여부, 퀴즈, 투표 기능을 한 곳에서 운영합니다.' : 'Guestbook, voting, puzzle play, and quiz badge rewards.'}
                  </p>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="rounded-[2rem] border border-cyan-100/20 bg-white/10 p-5 backdrop-blur-xl shadow-[0_24px_80px_rgba(8,15,33,0.45)] sm:p-6">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-cyan-100/80">{isKorean ? '운영 미리보기' : 'Studio snapshot'}</p>
                    <p className="mt-1 text-lg font-semibold text-white">
                      {isKorean ? '청첩장 한 장 안에서 이어지는 하객 경험' : 'One invitation, many guest touchpoints'}
                    </p>
                  </div>
                  <div className="rounded-full bg-emerald-400/20 px-2.5 py-1 text-[11px] font-semibold text-emerald-200">
                    {isKorean ? '실시간' : 'Live'}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="rounded-2xl border border-white/15 bg-slate-950/40 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.16em] text-slate-300">{isKorean ? '참여 흐름' : 'Engagement flow'}</p>
                        <p className="mt-2 text-2xl font-semibold text-white">87%</p>
                      </div>
                      <div className="rounded-full border border-cyan-300/30 bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-100">
                        {isKorean ? '방명록 + 참석 여부' : 'RSVP + polls'}
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-white/15 bg-slate-950/40 p-4">
                      <p className="text-[11px] uppercase tracking-[0.16em] text-slate-300">{isKorean ? '오늘 방명록' : 'Guestbook today'}</p>
                      <p className="mt-2 text-2xl font-semibold text-white">+24</p>
                    </div>
                    <div className="rounded-2xl border border-white/15 bg-slate-950/40 p-4">
                      <p className="text-[11px] uppercase tracking-[0.16em] text-slate-300">{isKorean ? '인기 메뉴' : 'Top menu vote'}</p>
                      <p className="mt-2 text-lg font-semibold text-cyan-100">{isKorean ? '트러플 뇨끼' : 'Truffle gnocchi'}</p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/15 bg-gradient-to-br from-cyan-400/10 to-fuchsia-400/10 p-4">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-slate-200">{isKorean ? '빌더에서 가능한 일' : 'What couples get'}</p>
                    <ul className="mt-3 space-y-2 text-sm text-slate-100/90">
                      {isKorean ? (
                        <>
                          <li>실시간 미리보기로 문구와 흐름을 바로 확인</li>
                          <li>퀴즈, 타임라인, 방명록, 투표 기능까지 한 번에 구성</li>
                          <li>공개 페이지와 링크를 바로 발행하고 공유</li>
                        </>
                      ) : (
                        <>
                          <li>Live preview that follows builder edits</li>
                          <li>Interactive guestbook, quiz, timeline, and votes</li>
                          <li>Template-specific animation and publish controls</li>
                        </>
                      )}
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
                <p className="text-xs uppercase tracking-[0.18em] text-cyan-100/70">{isKorean ? '진행 순서' : 'Launch flow'}</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">
                  {isKorean ? '처음 만드는 분도 따라가기 쉬운 청첩장 제작 흐름' : 'A clean path from draft to published invitation'}
                </h2>
              </div>
              <p className="max-w-xl text-sm leading-6 text-slate-300">
                {isKorean
                  ? '초대장 생성부터 공개 링크 발행까지 단계가 분리되어 있어 처음 만드는 사용자도 흐름을 놓치지 않습니다.'
                  : 'The builder is structured so couples can move from content entry to interactive tuning to publishing without losing context.'}
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
