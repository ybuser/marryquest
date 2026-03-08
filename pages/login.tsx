import { useMemo, useState } from 'react';
import Head from 'next/head';
import { signIn, getSession } from 'next-auth/react';
import type { GetServerSideProps } from 'next';
import { Eye, EyeOff, Shuffle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { TEST_USER_ACCOUNTS } from '@/lib/testUsers';

interface LoginProps {
  callbackUrl: string;
}

export const getServerSideProps: GetServerSideProps<LoginProps> = async (context) => {
  const session = await getSession({ req: context.req });
  const callbackUrl = (context.query.callbackUrl as string) ?? '/dashboard';

  if (session?.user?.id) {
    return {
      redirect: {
        destination: callbackUrl,
        permanent: false
      }
    };
  }

  return {
    props: { callbackUrl }
  };
};

export default function Login({ callbackUrl }: LoginProps) {
  const [loginId, setLoginId] = useState(TEST_USER_ACCOUNTS[0]?.loginId ?? '');
  const [password, setPassword] = useState(TEST_USER_ACCOUNTS[0]?.password ?? '');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [vowLine, setVowLine] = useState('May your planning flow be smooth, lucky, and joyful.');

  const vows = useMemo(
    () => [
      'May your planning flow be smooth, lucky, and joyful.',
      'Today\'s test login might be tomorrow\'s perfect wedding story.',
      'Tiny edits now, unforgettable moments later.',
      'Build once, celebrate forever.',
      'A good invitation starts with one good click.'
    ],
    []
  );

  const pickRandomAccount = () => {
    const random = TEST_USER_ACCOUNTS[Math.floor(Math.random() * TEST_USER_ACCOUNTS.length)];
    if (!random) return;

    setLoginId(random.loginId);
    setPassword(random.password);
    setVowLine(vows[Math.floor(Math.random() * vows.length)]);
    setError(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!loginId.trim() || !password) {
      setError('Enter both ID and password.');
      return;
    }

    setLoading(true);
    const result = await signIn('credentials', {
      redirect: false,
      loginId,
      password,
      callbackUrl
    });

    setLoading(false);

    if (result?.error) {
      setError('Invalid ID or password. Use any test account listed below.');
      return;
    }

    if (result?.ok) {
      window.location.href = result.url ?? callbackUrl;
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_20%_0%,rgba(251,113,133,0.16),transparent_44%),radial-gradient(circle_at_90%_100%,rgba(244,114,182,0.16),transparent_40%),linear-gradient(180deg,#fff7fb,#f8fafc)] px-4 py-8">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute left-[8%] top-[10%] h-28 w-28 rounded-full border border-rose-200/60 bg-white/30 blur-[1px]" />
        <div className="absolute right-[10%] top-[22%] h-20 w-20 rounded-full border border-cyan-200/60 bg-white/30" />
        <div className="absolute left-[18%] bottom-[16%] h-24 w-24 rounded-full border border-pink-200/70 bg-white/30" />
      </div>
      <Head>
        <title>Sign in | MarryQuest</title>
      </Head>

      <div className="relative mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center gap-6 lg:grid-cols-[1.1fr,0.9fr]">
        <section className="rounded-3xl border border-rose-100 bg-white/65 p-7 shadow-[0_28px_70px_rgba(15,23,42,0.12)] backdrop-blur-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-500">MarryQuest</p>
          <h1 className="mt-2 text-4xl font-semibold leading-tight text-slate-900">
            Welcome to your
            <span className="block bg-gradient-to-r from-rose-500 via-pink-500 to-cyan-600 bg-clip-text text-transparent">
              invitation studio
            </span>
          </h1>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            Sign in with any test account and explore template design, section editing, and live preview tools.
          </p>
          <div className="mt-6 rounded-2xl border border-rose-100 bg-rose-50/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-rose-500">Today&apos;s wedding vibe</p>
            <p className="mt-2 text-sm font-medium text-slate-700">{vowLine}</p>
          </div>
          <div className="mt-5 flex flex-wrap gap-2 text-xs text-slate-500">
            <span className="rounded-full bg-white px-3 py-1 shadow-sm">10 demo users</span>
            <span className="rounded-full bg-white px-3 py-1 shadow-sm">ID/password login</span>
            <span className="rounded-full bg-white px-3 py-1 shadow-sm">Instant builder access</span>
          </div>
        </section>

        <Card className="w-full rounded-3xl border border-slate-200/80 bg-white/90 shadow-[0_24px_60px_rgba(15,23,42,0.16)]">
          <CardHeader className="pb-4">
            <CardTitle className="text-2xl">Sign in</CardTitle>
            <CardDescription>Choose a test account or enter ID/password manually.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <label htmlFor="loginId" className="text-sm font-medium text-slate-700">
                  User ID
                </label>
                <Input
                  id="loginId"
                  name="loginId"
                  type="text"
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  placeholder="guest1"
                  required
                  autoComplete="username"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-slate-700">
                  Password
                </label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="wedding1"
                    required
                    autoComplete="current-password"
                    className="pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 inline-flex w-10 items-center justify-center text-slate-500 transition hover:text-slate-700"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={pickRandomAccount}
                  className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-3 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
                >
                  <Shuffle className="h-3.5 w-3.5" />
                  Surprise me
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLoginId('');
                    setPassword('');
                    setError(null);
                  }}
                  className="inline-flex h-9 items-center justify-center rounded-full border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  Clear
                </button>
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}
              <Button className="w-full" type="submit" disabled={loading}>
                {loading ? 'Signing in...' : 'Enter MarryQuest'}
              </Button>
            </form>

            <div className="mt-5 space-y-2 rounded-2xl border border-slate-100 bg-slate-50/80 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Quick test accounts</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {TEST_USER_ACCOUNTS.map((account) => (
                  <button
                    key={account.loginId}
                    type="button"
                    onClick={() => {
                      setLoginId(account.loginId);
                      setPassword(account.password);
                      setError(null);
                    }}
                    className="rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-left text-xs transition hover:border-cyan-300 hover:bg-cyan-50"
                  >
                    <p className="font-semibold text-slate-700">{account.loginId}</p>
                    <p className="mt-0.5 text-[11px] text-slate-500">{account.password}</p>
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
