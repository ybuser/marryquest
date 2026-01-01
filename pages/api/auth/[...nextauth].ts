import NextAuth from 'next-auth';
import { withRateLimit } from '@/lib/security/rateLimit';
import { authOptions } from '@/lib/auth';

const handler = NextAuth(authOptions);

export default withRateLimit(handler, { windowMs: 60_000, max: 10 });
