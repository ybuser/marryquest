import { type GetServerSideProps } from "next";
import { getServerSession } from "next-auth";
import { useState } from "react";
import { authOptions } from "../api/auth/[...nextauth]";
import { prisma } from "../../lib/db";

type InvitationListItem = {
  id: string;
  slug: string;
  title: string;
  status: string;
  createdAt: string;
};

type DashboardProps = {
  invitations: InvitationListItem[];
  userEmail: string;
};

export const getServerSideProps: GetServerSideProps<DashboardProps> = async (
  context,
) => {
  const session = await getServerSession(
    context.req,
    context.res,
    authOptions,
  );

  if (!session?.user?.email) {
    return {
      redirect: {
        destination: "/login",
        permanent: false,
      },
    };
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) {
    return {
      props: { invitations: [], userEmail: session.user.email },
    };
  }

  const invitations = await prisma.invitation.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      slug: true,
      title: true,
      status: true,
      createdAt: true,
    },
  });

  return {
    props: {
      userEmail: session.user.email,
      invitations: invitations.map((invitation) => ({
        ...invitation,
        createdAt: invitation.createdAt.toISOString(),
      })),
    },
  };
};

export default function DashboardPage({ invitations, userEmail }: DashboardProps) {
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const response = await fetch("/api/invitations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ title, slug }),
    });

    setLoading(false);

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data?.error ?? "Unable to create invitation.");
      return;
    }

    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white px-6 py-10">
      <div className="mx-auto max-w-5xl space-y-10">
        <header className="space-y-2">
          <p className="text-sm text-slate-400">Signed in as {userEmail}</p>
          <h1 className="text-3xl font-semibold">Creator Dashboard</h1>
          <p className="text-slate-300">
            Create and manage your wedding invitations.
          </p>
        </header>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <h2 className="text-xl font-semibold">Create invitation</h2>
          <form className="mt-4 grid gap-4 md:grid-cols-3" onSubmit={handleCreate}>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="title">
                Title
              </label>
              <input
                id="title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                required
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-purple-400 focus:outline-none"
                placeholder="Avery & Jordan"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="slug">
                Slug
              </label>
              <input
                id="slug"
                value={slug}
                onChange={(event) => setSlug(event.target.value)}
                required
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-purple-400 focus:outline-none"
                placeholder="avery-jordan"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-purple-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Creating..." : "Create"}
              </button>
            </div>
          </form>
          {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <h2 className="text-xl font-semibold">Your invitations</h2>
          <div className="mt-4 space-y-3">
            {invitations.length === 0 ? (
              <p className="text-sm text-slate-400">No invitations yet.</p>
            ) : (
              invitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="flex flex-col gap-2 rounded-xl border border-slate-800 bg-slate-950/60 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-sm text-slate-400">{invitation.slug}</p>
                    <p className="text-lg font-semibold">{invitation.title}</p>
                  </div>
                  <div className="text-sm text-slate-300">
                    <p className="capitalize">{invitation.status}</p>
                    <p>
                      {new Date(invitation.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
