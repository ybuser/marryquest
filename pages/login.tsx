import { getServerSession } from "next-auth";
import { signIn } from "next-auth/react";
import { type GetServerSideProps } from "next";
import { authOptions } from "./api/auth/[...nextauth]";
import { useState } from "react";

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getServerSession(
    context.req,
    context.res,
    authOptions,
  );

  if (session) {
    return {
      redirect: {
        destination: "/dashboard",
        permanent: false,
      },
    };
  }

  return { props: {} };
};

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);

    await signIn("email", {
      email,
      redirect: false,
      callbackUrl: "/dashboard",
    });

    setSent(true);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-8 shadow-xl">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Creator Login</h1>
          <p className="text-sm text-slate-300">
            Enter your email to receive a magic link.
          </p>
        </div>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-purple-400 focus:outline-none"
              placeholder="you@example.com"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-purple-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Sending..." : "Send magic link"}
          </button>
        </form>
        {sent && (
          <p className="text-sm text-emerald-400">
            Check your inbox for the sign-in link.
          </p>
        )}
      </div>
    </div>
  );
}
