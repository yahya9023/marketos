'use client';

import { FormEvent, useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError('Invalid email or password.');
      setIsSubmitting(false);
      return;
    }

    router.replace('/dashboard');
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0c1b2a] p-4">
      <section className="w-full max-w-md rounded-2xl bg-[#f5f7f2] p-6 shadow-2xl sm:p-8">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#e1f25b] text-xl font-black text-[#0c1b2a]">
            M.
          </div>
          <div>
            <p className="text-xl font-bold tracking-tight text-[#0c1b2a]">MarketOS</p>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#5f746d]">
              Sign in
            </p>
          </div>
        </div>

        <h1 className="text-3xl font-black tracking-tight text-[#0c1b2a]">Welcome back</h1>
        <p className="mt-2 text-sm font-medium text-[#5f746d]">Sign in to continue to MarketOS.</p>

        {error && (
          <p role="alert" className="mt-5 rounded-lg bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block text-sm font-bold text-[#4f6b65]">
            Email
            <input
              required
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1 h-12 w-full rounded-lg border border-[#d6e0d9] bg-white px-3 font-semibold text-[#0c1b2a] outline-none focus:border-[#8caa4d]"
            />
          </label>
          <label className="block text-sm font-bold text-[#4f6b65]">
            Password
            <input
              required
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-1 h-12 w-full rounded-lg border border-[#d6e0d9] bg-white px-3 font-semibold text-[#0c1b2a] outline-none focus:border-[#8caa4d]"
            />
          </label>
          <button
            type="submit"
            disabled={isSubmitting}
            className="h-12 w-full rounded-lg bg-[#0c1b2a] text-sm font-black text-white transition hover:bg-[#1c354c] disabled:cursor-wait disabled:opacity-60"
          >
            {isSubmitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </section>
    </main>
  );
}