import crypto from 'crypto';
import type { GetServerSidePropsContext, GetServerSidePropsResult } from 'next';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession, type NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import prisma from './db';

export const ADMIN_EMAIL = 'admin@marryquest.local';

function secureCompare(provided: string, expected: string) {
  if (provided.length !== expected.length) return false;
  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);
  return crypto.timingSafeEqual(providedBuffer, expectedBuffer);
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
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
    strategy: 'database'
  },
  pages: {
    signIn: '/login'
  },
  callbacks: {
    session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
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
