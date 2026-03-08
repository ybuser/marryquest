import type { GetServerSidePropsContext, GetServerSidePropsResult } from 'next';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession, type NextAuthOptions } from 'next-auth';
import type { JWT } from 'next-auth/jwt';
import CredentialsProvider from 'next-auth/providers/credentials';
import prisma from './db';
import { findTestUserAccount } from './testUsers';

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: 'Test Accounts',
      credentials: {
        loginId: { label: 'Login ID', type: 'text' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        const loginId = credentials?.loginId?.trim() ?? '';
        const password = credentials?.password ?? '';
        const account = findTestUserAccount(loginId, password);

        if (!account) {
          return null;
        }

        const user = await prisma.user
          .upsert({
            where: { email: account.email },
            update: { name: account.name },
            create: {
              email: account.email,
              name: account.name
            }
          })
          .catch((err) => {
            const label = err?.constructor?.name || 'PrismaError';
            const message = err instanceof Error ? err.message : 'Unknown error';
            console.error(
              `[auth] Failed to upsert test user (${label}): ${message}. Check database connectivity or pooling configuration.`
            );
            return null;
          });

        if (!user) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name
        };
      }
    })
  ],
  session: {
    strategy: 'jwt'
  },
  pages: {
    signIn: '/login'
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) {
        const enrichedToken = token as JWT & { userId?: string };
        token.sub = user.id;
        // Preserve explicit userId for clarity in session callback
        // because some providers may not set `sub`.
        enrichedToken.userId = user.id;
      }
      return token;
    },
    session({ session, token }) {
      const userId = (token as { sub?: string; userId?: string }).userId || token.sub;
      if (session.user && userId) {
        session.user.id = userId;
      }
      return session;
    }
  }
};

export async function requireApiAuth(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }
  return session;
}

export async function requirePageAuth<T>(
  context: GetServerSidePropsContext,
  handler: (userId: string) => Promise<GetServerSidePropsResult<T>>
): Promise<GetServerSidePropsResult<T>> {
  const session = await getServerSession(context.req, context.res, authOptions);

  if (!session?.user?.id) {
    return {
      redirect: {
        destination: `/login?callbackUrl=${encodeURIComponent(context.resolvedUrl)}`,
        permanent: false
      }
    };
  }

  return handler(session.user.id);
}
