'use client';
import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });

    if (res?.error) {
      setError('Invalid email or password');
      setLoading(false);
    } else {
      router.push('/dashboard');
    }
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="w-10 h-10 bg-[#1d9bf0] rounded-xl flex items-center justify-center">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
              <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
            </svg>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-[#e7e9ea] text-center mb-2">
          Sign in to Draftbox
        </h1>
        <p className="text-[#71767b] text-center text-sm mb-8">
          Draft, refine, and publish your content
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full bg-transparent border border-[#2f3336] rounded-md px-4 py-3 text-[#e7e9ea] placeholder:text-[#536471] focus:border-[#1d9bf0] transition-colors text-sm"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full bg-transparent border border-[#2f3336] rounded-md px-4 py-3 text-[#e7e9ea] placeholder:text-[#536471] focus:border-[#1d9bf0] transition-colors text-sm"
          />

          {error && (
            <p className="text-[#f4212e] text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#1d9bf0] hover:bg-[#1a8cd8] disabled:opacity-50 text-white font-bold rounded-full py-3 text-sm transition-colors"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p className="text-[#71767b] text-center text-sm mt-6">
          Don't have an account?{' '}
          <Link href="/register" className="text-[#1d9bf0] hover:underline">
            Sign up
          </Link>
        </p>

      </div>
    </div>
  );
}