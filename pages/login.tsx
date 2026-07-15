import { useState } from 'react';
import Head from 'next/head';
import type { GetServerSideProps } from 'next';
import { getServerSession } from 'next-auth';
import { signIn } from 'next-auth/react';
import { Eye, EyeOff } from 'lucide-react';
import { LanguageToggle } from '@/components/i18n/LanguageToggle';
import { useLanguage } from '@/components/i18n/LanguageProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { authOptions } from '@/lib/auth';
import { sanitizeInternalRedirect } from '@/lib/security/internalRedirect';

interface LoginProps {
  callbackUrl: string;
}

export const getServerSideProps: GetServerSideProps<LoginProps> = async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions);
  const callbackUrl = sanitizeInternalRedirect(context.query.callbackUrl, process.env.NEXTAUTH_URL);

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
  const { isKorean } = useLanguage();
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const vowLine = isKorean
    ? '오늘의 청첩장이 더 예쁘게 완성되도록, 부드럽고 기분 좋은 작업 흐름을 준비했어요.'
    : 'May your planning flow be smooth, lucky, and joyful.';
  const genericLoginError = isKorean ? '아이디 또는 비밀번호가 올바르지 않습니다.' : 'Invalid ID or password.';

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!loginId.trim() || !password || loginId.length > 128 || password.length > 512) {
      setError(genericLoginError);
      return;
    }

    setLoading(true);
    try {
      const result = await signIn('credentials', {
        redirect: false,
        loginId,
        password,
        callbackUrl
      });

      if (!result?.ok || result.error) {
        setError(genericLoginError);
        return;
      }

      const destination = sanitizeInternalRedirect(result.url ?? callbackUrl, window.location.origin);
      window.location.assign(destination);
    } catch {
      setError(genericLoginError);
    } finally {
      setLoading(false);
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
        <title>{isKorean ? '로그인 | MarryQuest' : 'Sign in | MarryQuest'}</title>
      </Head>

      <div className="relative mx-auto mb-4 flex w-full max-w-6xl justify-end">
        <LanguageToggle />
      </div>

      <div className="relative mx-auto grid min-h-[calc(100vh-5.5rem)] w-full max-w-6xl items-start gap-4 lg:items-center lg:gap-6 lg:grid-cols-[1.1fr,0.9fr]">
        <Card className="order-1 w-full rounded-3xl border border-slate-200/80 bg-white/90 shadow-[0_24px_60px_rgba(15,23,42,0.16)] lg:order-2">
          <CardHeader className="pb-4">
            <CardTitle className="text-2xl">{isKorean ? '관리자 로그인' : 'Owner sign-in'}</CardTitle>
            <CardDescription>
              {isKorean ? '관리자 계정의 아이디와 비밀번호를 입력해 주세요.' : 'Enter the owner account ID and password.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit} noValidate>
              <div className="space-y-2">
                <label htmlFor="loginId" className="text-sm font-medium text-slate-700">
                  {isKorean ? '아이디' : 'User ID'}
                </label>
                <Input
                  id="loginId"
                  name="loginId"
                  type="text"
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  required
                  maxLength={128}
                  autoComplete="username"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-slate-700">
                  {isKorean ? '비밀번호' : 'Password'}
                </label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    maxLength={512}
                    autoComplete="current-password"
                    className="pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 inline-flex w-10 items-center justify-center text-slate-500 transition hover:text-slate-700"
                    aria-label={showPassword ? (isKorean ? '비밀번호 숨기기' : 'Hide password') : isKorean ? '비밀번호 보기' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}
              <Button className="h-12 w-full" type="submit" disabled={loading}>
                {loading ? (isKorean ? '로그인 중...' : 'Signing in...') : isKorean ? 'MarryQuest 들어가기' : 'Enter MarryQuest'}
              </Button>
            </form>

          </CardContent>
        </Card>

        <section className="order-2 rounded-3xl border border-rose-100 bg-white/65 p-5 shadow-[0_28px_70px_rgba(15,23,42,0.12)] backdrop-blur-sm sm:p-7 lg:order-1">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-500">MarryQuest</p>
          <h1 className="mt-2 text-3xl font-semibold leading-tight text-slate-900 sm:text-4xl">
            {isKorean ? '청첩장 관리 화면으로' : 'Welcome to your'}
            <span className="block bg-gradient-to-r from-rose-500 via-pink-500 to-cyan-600 bg-clip-text text-transparent">
              {isKorean ? '바로 들어가 보세요' : 'invitation studio'}
            </span>
          </h1>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            {isKorean
              ? '관리자 계정으로 로그인해 템플릿, 섹션, 미리보기, 공개 설정을 한곳에서 관리하세요.'
              : 'Sign in with the owner account to manage templates, sections, live previews, and publishing.'}
          </p>
          <div className="mt-6 rounded-2xl border border-rose-100 bg-rose-50/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-rose-500">
              {isKorean ? '오늘의 작업 무드' : 'Today\'s wedding vibe'}
            </p>
            <p className="mt-2 text-sm font-medium text-slate-700">{vowLine}</p>
          </div>
          <div className="mt-5 flex flex-wrap gap-2 text-xs text-slate-500">
            <span className="rounded-full bg-white px-3 py-1 shadow-sm">{isKorean ? '단일 관리자 계정' : 'Single owner account'}</span>
            <span className="rounded-full bg-white px-3 py-1 shadow-sm">{isKorean ? '아이디/비밀번호 로그인' : 'ID/password login'}</span>
            <span className="rounded-full bg-white px-3 py-1 shadow-sm">{isKorean ? '빌더 바로가기' : 'Direct builder access'}</span>
          </div>
        </section>
      </div>
    </div>
  );
}
