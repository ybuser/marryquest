import { useEffect, useMemo, useState } from 'react';
import type { GetServerSideProps } from 'next';
import Head from 'next/head';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/router';
import { LanguageToggle } from '@/components/i18n/LanguageToggle';
import { useLanguage } from '@/components/i18n/LanguageProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GuidedWalkthrough, type WalkthroughStep } from '@/components/walkthrough/GuidedWalkthrough';
import prisma from '@/lib/db';
import { requirePageAuth } from '@/lib/auth';

interface InvitationListItem {
  id: string;
  title: string | null;
  slug: string;
  status: string;
  templateKey: string;
  groomName: string;
  brideName: string;
  dateTime: string;
}

interface DashboardProps {
  invitations: InvitationListItem[];
}

type StatusFilter = 'all' | 'draft' | 'published' | 'private';

export const getServerSideProps: GetServerSideProps<DashboardProps> = async (context) => {
  return requirePageAuth<DashboardProps>(context, async (userId) => {
    type InvitationRow = {
      id: string;
      title: string | null;
      slug: string;
      status: string;
      templateKey: string;
      groomName: string;
      brideName: string;
      dateTime: Date;
    };

    const invitations = (await prisma.invitation.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
        templateKey: true,
        groomName: true,
        brideName: true,
        dateTime: true
      }
    })) as InvitationRow[];

    return {
      props: {
        invitations: invitations.map((invitation: InvitationRow) => ({
          ...invitation,
          dateTime: invitation.dateTime.toISOString()
        })) as InvitationListItem[]
      }
    };
  });
};

export default function Dashboard({ invitations: initialInvitations }: DashboardProps) {
  const { isKorean } = useLanguage();
  const [invitations, setInvitations] = useState(initialInvitations);
  const [creating, setCreating] = useState(false);
  const [walkthroughOpen, setWalkthroughOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [origin, setOrigin] = useState('');
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
  }, []);

  const summary = useMemo(() => {
    const counts = {
      total: invitations.length,
      draft: 0,
      published: 0,
      private: 0
    };

    for (const invitation of invitations) {
      if (invitation.status === 'draft') counts.draft += 1;
      if (invitation.status === 'published') counts.published += 1;
      if (invitation.status === 'private') counts.private += 1;
    }

    return counts;
  }, [invitations]);

  const filteredInvitations = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return invitations.filter((invitation) => {
      const matchesStatus = statusFilter === 'all' ? true : invitation.status === statusFilter;
      if (!matchesStatus) return false;
      if (!keyword) return true;

      const haystack = [
        invitation.title ?? '',
        invitation.groomName,
        invitation.brideName,
        invitation.slug,
        invitation.status
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(keyword);
    });
  }, [invitations, search, statusFilter]);

  const walkthroughSteps = useMemo<WalkthroughStep[]>(
    () =>
      isKorean
        ? [
            {
              id: 'create',
              title: '새 청첩장 만들기',
              description: '새 청첩장 버튼을 누르면 초안이 생성되고, 바로 편집 화면으로 이동합니다.',
              selector: '[data-tour="dashboard-create"]',
              placement: 'bottom'
            },
            {
              id: 'summary',
              title: '진행 현황 한눈에 보기',
              description: '전체, 임시저장, 공개, 비공개 청첩장 수를 빠르게 확인할 수 있습니다.',
              selector: '[data-tour="dashboard-summary"]',
              placement: 'bottom'
            },
            {
              id: 'search',
              title: '찾고 싶은 청첩장 바로 검색',
              description: '제목, 신랑신부 이름, 링크 주소, 상태를 기준으로 원하는 청첩장을 바로 찾을 수 있습니다.',
              selector: '[data-tour="dashboard-search"]',
              placement: 'bottom'
            },
            {
              id: 'filters',
              title: '상태별로 모아보기',
              description: '초안만 따로 보거나, 이미 공개한 청첩장만 골라 관리할 수 있습니다.',
              selector: '[data-tour="dashboard-filters"]',
              placement: 'bottom'
            },
            {
              id: 'actions',
              title: '카드별 바로가기',
              description: '각 카드마다 편집 열기, 공개 페이지 보기, 링크 복사 버튼을 빠르게 사용할 수 있습니다.',
              selector: '[data-tour="dashboard-card-actions"]',
              placement: 'top'
            },
            {
              id: 'reopen',
              title: '가이드 다시 열기',
              description: '작업 흐름이 헷갈릴 때는 가이드 보기 버튼으로 이 안내를 다시 확인할 수 있습니다.',
              selector: '[data-tour="dashboard-walkthrough"]',
              placement: 'bottom'
            }
          ]
        : [
            {
              id: 'create',
              title: 'Create quickly',
              description: 'Use New invitation to create a draft and open its builder immediately.',
              selector: '[data-tour="dashboard-create"]',
              placement: 'bottom'
            },
            {
              id: 'summary',
              title: 'Track your pipeline',
              description: 'These counters show how many invitations are total, draft, published, and private.',
              selector: '[data-tour="dashboard-summary"]',
              placement: 'bottom'
            },
            {
              id: 'search',
              title: 'Find invitations fast',
              description: 'Search by title, couple names, slug, or status to jump straight to the right record.',
              selector: '[data-tour="dashboard-search"]',
              placement: 'bottom'
            },
            {
              id: 'filters',
              title: 'Filter by status',
              description: 'Quick filters narrow the list by publication state in one click.',
              selector: '[data-tour="dashboard-filters"]',
              placement: 'bottom'
            },
            {
              id: 'actions',
              title: 'Card action shortcuts',
              description: 'Each card offers one-click actions for builder access, public view, and URL copy.',
              selector: '[data-tour="dashboard-card-actions"]',
              placement: 'top'
            },
            {
              id: 'reopen',
              title: 'Reopen any time',
              description: 'Use this walkthrough button whenever you need a quick refresher.',
              selector: '[data-tour="dashboard-walkthrough"]',
              placement: 'bottom'
            }
          ],
    [isKorean]
  );

  const statusLabels: Record<StatusFilter | 'draft' | 'published' | 'private', string> = isKorean
    ? { all: '전체', draft: '임시저장', published: '공개', private: '비공개' }
    : { all: 'All', draft: 'Draft', published: 'Published', private: 'Private' };

  const summaryCards = [
    { label: statusLabels.all, value: summary.total },
    { label: statusLabels.draft, value: summary.draft },
    { label: statusLabels.published, value: summary.published },
    { label: statusLabels.private, value: summary.private }
  ];

  const createInvitation = async () => {
    setCreating(true);
    try {
      const response = await fetch('/api/invitations', {
        method: 'POST'
      });

      if (!response.ok) {
        const message = await response.json().catch(() => null);
        throw new Error(message?.error ?? 'Unable to create invitation');
      }

      const invitation: InvitationListItem = await response.json();
      setInvitations((prev) => [invitation, ...prev]);
      await router.push(`/builder/${invitation.slug ?? invitation.id}`);
    } catch (error) {
      console.error(error);
      alert(isKorean ? '새 청첩장을 만들지 못했습니다.' : 'Failed to create invitation');
    } finally {
      setCreating(false);
    }
  };

  async function copyPublicUrl(slug: string, invitationId: string) {
    const url = origin ? `${origin}/${slug}` : `/${slug}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(invitationId);
      window.setTimeout(() => setCopiedId((prev) => (prev === invitationId ? null : prev)), 1500);
    } catch (error) {
      console.error(error);
      alert(isKorean ? '링크를 복사하지 못했습니다.' : 'Unable to copy URL');
    }
  }

  const pageTitle = isKorean ? '대시보드 | MarryQuest' : 'Dashboard | MarryQuest';
  const dateFormatter = new Intl.DateTimeFormat(isKorean ? 'ko-KR' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="min-h-screen bg-slate-100/70">
      <Head>
        <title>{pageTitle}</title>
      </Head>
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-10 sm:px-6">
        <section data-tour="dashboard-summary" className="rounded-2xl border border-slate-200 bg-white px-6 py-6 shadow-sm">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">MarryQuest</p>
              <h1 className="mt-2 text-3xl font-semibold text-slate-900">{isKorean ? '청첩장 대시보드' : 'Dashboard'}</h1>
              <p className="mt-1 text-slate-600">
                {isKorean
                  ? '만든 청첩장을 한곳에서 보고, 새 초안을 만들고, 공개 상태를 정리할 수 있습니다.'
                  : 'Build, review, and manage your invitation publishing flow.'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <LanguageToggle />
              <Button variant="ghost" onClick={() => void signOut({ callbackUrl: '/login' })} disabled={creating} size="lg">
                {isKorean ? '로그아웃' : 'Sign out'}
              </Button>
              <Button
                data-tour="dashboard-walkthrough"
                variant="outline"
                onClick={() => setWalkthroughOpen(true)}
                disabled={creating}
                size="lg"
              >
                {isKorean ? '가이드 보기' : 'Walkthrough'}
              </Button>
              <Button data-tour="dashboard-create" onClick={createInvitation} disabled={creating} size="lg">
                {creating ? (isKorean ? '생성 중…' : 'Creating...') : isKorean ? '새 청첩장 만들기' : 'New invitation'}
              </Button>
            </div>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {summaryCards.map((item) => (
              <div key={item.label} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold tracking-wide text-slate-500">{item.label}</p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">{item.value}</p>
              </div>
            ))}
          </div>
        </section>

        <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle>{isKorean ? '청첩장 목록' : 'Invitations'}</CardTitle>
            <CardDescription>
              {isKorean
                ? '청첩장을 검색하고, 편집 화면이나 공개 페이지로 바로 이동할 수 있습니다.'
                : 'Search and jump into builder quickly.'}
            </CardDescription>
            <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <Input
                data-tour="dashboard-search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={isKorean ? '제목, 이름, 링크 주소, 상태로 검색' : 'Search by title, couple names, slug...'}
                className="h-11 max-w-lg"
              />
              <div data-tour="dashboard-filters" className="flex flex-wrap gap-2">
                {(['all', 'draft', 'published', 'private'] as const).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setStatusFilter(status)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold tracking-wide transition ${
                      statusFilter === status
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {statusLabels[status]}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredInvitations.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-slate-600">
                {invitations.length === 0
                  ? isKorean
                    ? '아직 만든 청첩장이 없습니다. 새 청첩장을 만들어 첫 화면부터 시작해 보세요.'
                    : 'No invitations yet. Create your first one to get started.'
                  : isKorean
                    ? '검색하거나 선택한 상태에 맞는 청첩장이 없습니다.'
                    : 'No invitations match your filters.'}
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {filteredInvitations.map((invitation, index) => {
                  const builderHref = `/builder/${invitation.slug ?? invitation.id}`;
                  const isPublished = invitation.status === 'published';
                  const publicHref = `/${invitation.slug}`;

                  return (
                    <article
                      key={invitation.id}
                      className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <h3 className="text-lg font-semibold text-slate-900">
                            {invitation.title || (isKorean ? '제목 없는 청첩장' : 'Untitled invitation')}
                          </h3>
                          <p className="text-sm text-slate-600">
                            {invitation.groomName} &amp; {invitation.brideName}
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide ${
                            invitation.status === 'published'
                              ? 'bg-emerald-100 text-emerald-700'
                              : invitation.status === 'draft'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {statusLabels[invitation.status as 'draft' | 'published' | 'private'] ?? invitation.status}
                        </span>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-500">
                        <div className="rounded-md bg-slate-50 px-3 py-2">
                          <p className="tracking-wide">{isKorean ? '예식 일시' : 'Date'}</p>
                          <p className="mt-1 text-sm text-slate-700">{dateFormatter.format(new Date(invitation.dateTime))}</p>
                        </div>
                        <div className="rounded-md bg-slate-50 px-3 py-2">
                          <p className="tracking-wide">{isKorean ? '링크 주소' : 'Slug'}</p>
                          <p className="mt-1 truncate text-sm text-slate-700">{invitation.slug}</p>
                        </div>
                      </div>

                      <div data-tour={index === 0 ? 'dashboard-card-actions' : undefined} className="mt-4 flex flex-wrap gap-2">
                        <Button size="sm" onClick={() => void router.push(builderHref)}>
                          {isKorean ? '편집 열기' : 'Open builder'}
                        </Button>
                        {isPublished && (
                          <>
                            <a
                              href={publicHref}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex h-9 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                            >
                              {isKorean ? '공개 페이지 보기' : 'Open public page'}
                            </a>
                            <button
                              type="button"
                              onClick={() => void copyPublicUrl(invitation.slug, invitation.id)}
                              className="inline-flex h-9 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                            >
                              {copiedId === invitation.id ? (isKorean ? '복사됨' : 'Copied!') : isKorean ? '링크 복사' : 'Copy URL'}
                            </button>
                          </>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <GuidedWalkthrough
        open={walkthroughOpen}
        title={isKorean ? '대시보드 가이드' : 'Dashboard Guide'}
        subtitle={
          isKorean
            ? '새 청첩장을 만들고 관리하는 흐름을 1분 안에 빠르게 살펴볼 수 있습니다.'
            : 'Learn the core controls in under a minute.'
        }
        steps={walkthroughSteps}
        onClose={() => setWalkthroughOpen(false)}
      />
    </div>
  );
}
