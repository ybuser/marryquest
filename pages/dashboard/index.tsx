import { useEffect, useMemo, useState } from 'react';
import type { GetServerSideProps } from 'next';
import Head from 'next/head';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/router';
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
    () => [
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
    []
  );

  const createInvitation = async () => {
    setCreating(true);
    try {
      const response = await fetch('/api/invitations', {
        method: 'POST'
      });

      if (!response.ok) {
        const message = await response.json();
        throw new Error(message.error ?? 'Unable to create invitation');
      }

      const invitation: InvitationListItem = await response.json();
      setInvitations((prev) => [invitation, ...prev]);
      await router.push(`/builder/${invitation.slug ?? invitation.id}`);
    } catch (error) {
      console.error(error);
      alert('Failed to create invitation');
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
      alert('Unable to copy URL');
    }
  }

  return (
    <div className="min-h-screen bg-slate-100/70">
      <Head>
        <title>Dashboard | MarryQuest</title>
      </Head>
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-10 sm:px-6">
        <section data-tour="dashboard-summary" className="rounded-2xl border border-slate-200 bg-white px-6 py-6 shadow-sm">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-slate-900">Dashboard</h1>
              <p className="mt-1 text-slate-600">Build and manage interactive invitations.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="ghost" onClick={() => void signOut({ callbackUrl: '/login' })} disabled={creating} size="lg">
                Sign out
              </Button>
              <Button
                data-tour="dashboard-walkthrough"
                variant="outline"
                onClick={() => setWalkthroughOpen(true)}
                disabled={creating}
                size="lg"
              >
                Walkthrough
              </Button>
              <Button data-tour="dashboard-create" onClick={createInvitation} disabled={creating} size="lg">
                {creating ? 'Creating...' : 'New invitation'}
              </Button>
            </div>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Total', value: summary.total },
              { label: 'Draft', value: summary.draft },
              { label: 'Published', value: summary.published },
              { label: 'Private', value: summary.private }
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{item.label}</p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">{item.value}</p>
              </div>
            ))}
          </div>
        </section>

        <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle>Invitations</CardTitle>
            <CardDescription>Search and jump into builder quickly.</CardDescription>
            <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <Input
                data-tour="dashboard-search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by title, couple names, slug..."
                className="h-11 max-w-lg"
              />
              <div data-tour="dashboard-filters" className="flex flex-wrap gap-2">
                {(['all', 'draft', 'published', 'private'] as const).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setStatusFilter(status)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition ${
                      statusFilter === status
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredInvitations.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-slate-600">
                {invitations.length === 0
                  ? 'No invitations yet. Create your first one to get started.'
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
                          <h3 className="text-lg font-semibold text-slate-900">{invitation.title || 'Untitled invitation'}</h3>
                          <p className="text-sm text-slate-600">
                            {invitation.groomName} &amp; {invitation.brideName}
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                            invitation.status === 'published'
                              ? 'bg-emerald-100 text-emerald-700'
                              : invitation.status === 'draft'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {invitation.status}
                        </span>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-500">
                        <div className="rounded-md bg-slate-50 px-3 py-2">
                          <p className="uppercase tracking-wide">Date</p>
                          <p className="mt-1 text-sm text-slate-700">{new Date(invitation.dateTime).toLocaleDateString()}</p>
                        </div>
                        <div className="rounded-md bg-slate-50 px-3 py-2">
                          <p className="uppercase tracking-wide">Slug</p>
                          <p className="mt-1 truncate text-sm text-slate-700">{invitation.slug}</p>
                        </div>
                      </div>

                      <div data-tour={index === 0 ? 'dashboard-card-actions' : undefined} className="mt-4 flex flex-wrap gap-2">
                        <Button size="sm" onClick={() => router.push(builderHref)}>
                          Open builder
                        </Button>
                        {isPublished && (
                          <>
                            <a
                              href={publicHref}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex h-9 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                            >
                              Open public page
                            </a>
                            <button
                              type="button"
                              onClick={() => copyPublicUrl(invitation.slug, invitation.id)}
                              className="inline-flex h-9 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                            >
                              {copiedId === invitation.id ? 'Copied!' : 'Copy URL'}
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
        title="Dashboard Guide"
        subtitle="Learn the core controls in under a minute."
        steps={walkthroughSteps}
        onClose={() => setWalkthroughOpen(false)}
      />
    </div>
  );
}

