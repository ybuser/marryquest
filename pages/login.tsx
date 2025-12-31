import { useState } from 'react';
import Head from 'next/head';
import { signIn, getSession } from 'next-auth/react';
import type { GetServerSideProps } from 'next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

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
  const [passphrase, setPassphrase] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (passphrase.trim().length < 12) {
      setError('Passphrase must be at least 12 characters.');
      return;
    }

    setLoading(true);
    const result = await signIn('credentials', {
      redirect: false,
      passphrase,
      callbackUrl
    });

    setLoading(false);

    if (result?.error) {
      setError('Invalid passphrase.');
      return;
    }

    if (result?.ok) {
      window.location.href = result.url ?? callbackUrl;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <Head>
        <title>Sign in · MarryQuest</title>
      </Head>
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <CardTitle>Creator Sign In</CardTitle>
          <CardDescription>Enter the admin passphrase to manage invitations.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label htmlFor="passphrase" className="text-sm font-medium text-slate-700">
                Admin passphrase
              </label>
              <Input
                id="passphrase"
                name="passphrase"
                type="password"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                placeholder="Enter the secret phrase"
                required
                minLength={12}
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button className="w-full" type="submit" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
