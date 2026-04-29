'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { adminLoginAction } from '@/app/actions/auth';
import { ShieldCheck, KeyRound, User, Loader2, AlertCircle } from 'lucide-react';

export default function AdminLogin() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    try {
      const session = localStorage.getItem('admin_session');
      if (session) {
        router.push('/admin/dashboard');
      }
    } catch (e) {
      console.error('Session check error:', e);
    }
  }, [router]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await adminLoginAction({ username, password });
      if (!result.success) throw new Error(result.error || '로그인 실패');

      localStorage.setItem('admin_session', JSON.stringify(result.session));
      router.push('/admin/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[calc(100vh-6rem)] w-full max-w-md flex-col items-center justify-center px-4 py-8">
      <div className="relative w-full overflow-hidden rounded-3xl border border-border bg-card p-8 shadow-xl shadow-brand-500/5 sm:p-10">
        {/* Decorative gradient */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-gradient-to-br from-accent-400/30 via-violet-500/20 to-brand-500/10 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-gradient-to-tr from-brand-500/20 via-violet-500/10 to-transparent blur-3xl"
        />

        <div className="relative">
          {/* Badge */}
          <div className="mb-6 flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 animate-pulse rounded-2xl bg-gradient-to-br from-brand-500 to-accent-400 opacity-30 blur-md" />
              <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-accent-400 text-white shadow-lg">
                <ShieldCheck size={32} />
              </div>
            </div>
          </div>

          <h1 className="text-center font-display text-2xl font-bold tracking-tight text-foreground">
            관리자 로그인
          </h1>
          <p className="mt-1.5 text-center text-sm text-muted-foreground">
            Prompt Lab 운영을 위한 관리자 접속 페이지입니다.
          </p>

          <form onSubmit={handleLogin} className="mt-8 flex flex-col gap-3">
            <label className="relative block">
              <span className="sr-only">아이디</span>
              <User
                size={16}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                type="text"
                autoFocus
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="아이디"
                required
                className="w-full rounded-xl border border-border bg-muted/50 py-3 pl-10 pr-4 text-sm text-foreground outline-none transition focus:border-brand-500 focus:bg-card focus:ring-2 focus:ring-brand-500/20"
              />
            </label>

            <label className="relative block">
              <span className="sr-only">비밀번호</span>
              <KeyRound
                size={16}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호"
                required
                className="w-full rounded-xl border border-border bg-muted/50 py-3 pl-10 pr-4 text-sm text-foreground outline-none transition focus:border-brand-500 focus:bg-card focus:ring-2 focus:ring-brand-500/20"
              />
            </label>

            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                <AlertCircle size={14} />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="group relative mt-2 inline-flex items-center justify-center overflow-hidden rounded-xl bg-gradient-to-r from-brand-600 via-violet-500 to-accent-400 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-brand-500/25 transition-all hover:shadow-xl hover:shadow-brand-500/35 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <span className="relative z-10 inline-flex items-center gap-2">
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> 로그인 중...
                  </>
                ) : (
                  <>
                    <ShieldCheck size={16} /> 관리자 접속
                  </>
                )}
              </span>
            </button>
          </form>
        </div>
      </div>

      <p className="mt-6 text-xs text-muted-foreground">
        일반 학습자는 메인 화면에서 소속 그룹을 선택해주세요.
      </p>
    </div>
  );
}
