import crypto from 'crypto';
import type { GetServerSidePropsContext, GetServerSidePropsResult } from 'next';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession, type NextAuthOptions } from 'next-auth';
import type { JWT } from 'next-auth/jwt';
import CredentialsProvider from 'next-auth/providers/credentials';
import prisma from './db';

export const ADMIN_EMAIL = 'admin@marryquest.local';

function secureCompare(provided: string, expected: string) {
  if (provided.length !== expected.length) return false;
  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);
  return crypto.timingSafeEqual(providedBuffer, expectedBuffer);
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: 'Passphrase',
      credentials: {
        passphrase: { label: 'Passphrase', type: 'password' }
      },
      async authorize(credentials) {
        const candidate = credentials?.passphrase?.trim() ?? '';
        const adminPassphrase = process.env.ADMIN_PASSPHRASE;

        if (!adminPassphrase) {
          throw new Error('ADMIN_PASSPHRASE is not configured');
        }

        if (candidate.length < 12) {
          return null;
        }

        if (!secureCompare(candidate, adminPassphrase)) {
          return null;
        }

        const user = await prisma.user.upsert({
          where: { email: ADMIN_EMAIL },
          update: {},
          create: {
            email: ADMIN_EMAIL,
            name: 'Admin'
          }
        });

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
