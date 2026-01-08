import { useState } from 'react';
import type { GetServerSideProps } from 'next';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  const router = useRouter();

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
    } catch (error) {
      console.error(error);
      alert('Failed to create invitation');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Head>
        <title>Dashboard · MarryQuest</title>
      </Head>
      <div className="mx-auto max-w-5xl px-4 py-12 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900">Dashboard</h1>
            <p className="text-slate-600">Manage your invitations.</p>
          </div>
          <Button onClick={createInvitation} disabled={creating}>
            {creating ? 'Creating…' : 'New invitation'}
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Invitations</CardTitle>
            <CardDescription>Your recent invitations are listed below.</CardDescription>
          </CardHeader>
          <CardContent>
            {invitations.length === 0 ? (
              <p className="text-slate-600">No invitations yet. Create your first one to get started.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {invitations.map((invitation) => (
                  <button
                    key={invitation.id}
                    type="button"
                    onClick={() => router.push(`/builder/${invitation.slug ?? invitation.id}`)}
                    className="text-left"
                  >
                    <Card className="h-full">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">{invitation.title || 'Untitled invitation'}</CardTitle>
                        <CardDescription>
                          {invitation.groomName} &amp; {invitation.brideName}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="flex items-center justify-between text-sm text-slate-600">
                        <span className="capitalize">{invitation.status}</span>
                        <span>{new Date(invitation.dateTime).toLocaleDateString()}</span>
                      </CardContent>
                    </Card>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
