'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export function AuthForms() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next');
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mode === 'register' ? { email, password, name } : { email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'something went wrong');
      router.push(next || '/account/orders');
      router.refresh();
    } catch (e: any) {
      setError(e.message || 'something went wrong');
      setBusy(false);
    }
  }

  return (
    <div className="max-w-md">
      <div className="flex gap-4 mb-8">
        {(['login', 'register'] as const).map((m) => (
          <button
            key={m}
            onClick={() => {
              setMode(m);
              setError('');
            }}
            className={`label ${mode === m ? 'text-ink' : 'text-ink/40 hover:text-ink/70'}`}
          >
            {m === 'login' ? 'Sign in' : 'Create account'}
          </button>
        ))}
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-5">
        {mode === 'register' && (
          <label className="flex flex-col gap-2">
            <span className="label text-ink/60">Name</span>
            <input className="input" type="text" value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
        )}
        <label className="flex flex-col gap-2">
          <span className="label text-ink/60">Email</span>
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </label>
        <label className="flex flex-col gap-2">
          <span className="label text-ink/60">Password</span>
          <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button type="submit" className="btn-cta self-start" disabled={busy}>
          {busy ? '…' : mode === 'login' ? 'Sign in' : 'Create account'}
        </button>
      </form>
    </div>
  );
}
