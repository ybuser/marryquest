import { randomBytes } from 'node:crypto';
import type { GetServerSidePropsContext, GetServerSidePropsResult } from 'next';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession, type NextAuthOptions } from 'next-auth';
import type { JWT } from 'next-auth/jwt';
import CredentialsProvider from 'next-auth/providers/credentials';
import prisma from './db';
import { isConfiguredServerSecret } from './security/configValue';
import { verifyOwnerCredentials } from './security/ownerAuth';
import { sanitizeInternalCallbackUrl, toSafeAbsoluteRedirect } from './security/internalRedirect';

const configuredNextAuthSecret = process.env.NEXTAUTH_SECRET;
const nextAuthSecretIsValid = isConfiguredServerSecret(configuredNextAuthSecret);
// An invalid public/missing value must never become a usable JWT key. This process-local
// key preserves generic failure responses while authorize/readiness remain fail-closed.
const nextAuthSessionSecret = nextAuthSecretIsValid
  ? configuredNextAuthSecret
  : randomBytes(32).toString('base64url');

export const authOptions: NextAuthOptions = {
  secret: nextAuthSessionSecret,
  providers: [
    CredentialsProvider({
      name: 'MarryQuest Owner',
      credentials: {
        loginId: { label: 'Login ID', type: 'text' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        const verification = await verifyOwnerCredentials(credentials?.loginId, credentials?.password);

        if (!verification.success || !nextAuthSecretIsValid) {
          if (!verification.success && verification.reason === 'configuration') {
            console.error('[auth] OWNER_CONFIGURATION_INVALID');
          }
          if (!nextAuthSecretIsValid) {
            console.error('[auth] NEXTAUTH_SECRET_INVALID');
          }
          return null;
        }

        try {
          const user = await prisma.user.upsert({
            where: { email: verification.owner.email },
            update: { name: verification.owner.name },
            create: {
              email: verification.owner.email,
              name: verification.owner.name
            }
          });

          return {
            id: user.id,
            email: user.email,
            name: user.name
          };
        } catch {
          console.error('[auth] OWNER_USER_UPSERT_FAILED');
          return null;
        }
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
    redirect({ url, baseUrl }) {
      return toSafeAbsoluteRedirect(url, baseUrl);
    },
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
    const callbackUrl = sanitizeInternalCallbackUrl(context.resolvedUrl);
    return {
      redirect: {
        destination: `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`,
        permanent: false
      }
    };
  }

  return handler(session.user.id);
}
