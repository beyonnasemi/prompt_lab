'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { studentLoginAction } from '@/app/actions/auth';
import {
  Lock, KeyRound, Loader2, AlertCircle, ArrowLeft, GraduationCap,
} from 'lucide-react';
import Link from 'next/link';

const targetNames = {
  business: '비즈니스',
  public: '공공기관',
  univ: '대학',
  elem: '초등학교',
  middle: '중학교',
  high: '고등학교',
  adult: '일반성인',
};

const targetGradients = {
  business: 'from-brand-500 to-violet-500',
  public: 'from-brand-600 to-brand-400',
  univ: 'from-violet-500 to-accent-400',
  elem: 'from-accent-400 to-brand-400',
  middle: 'from-brand-500 to-success-500',
  high: 'from-success-500 to-brand-500',
  adult: 'from-violet-600 to-accent-500',
};

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const targetId = searchParams.get('target');

  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [targetName, setTargetName] = useState('');

  useEffect(() => {
    if (targetId && targetNames[targetId]) setTargetName(targetNames[targetId]);
  }, [targetId]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await studentLoginAction({ username: targetId, password });
      if (!result.success) throw new Error(result.error || '로그인 실패');

      localStorage.setItem('user_session', JSON.stringify(result.session));
      router.replace(`/learn/${targetId}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!targetId) {
    return (
      <div className="mx-auto mt-20 max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
        <AlertCircle className="mx-auto text-accent-500" size={40} />
        <p className="mt-4 font-semibold text-foreground">잘못된 접근입니다.</p>
        <Link
          href="/"
          className="mt-4 inline-flex items-center gap-1.5 text-sm text-brand-600 hover:underline"
        >
          <ArrowLeft size={14} /> 메인으로 돌아가기
        </Link>
      </div>
    );
  }

  const gradient = targetGradients[targetId] || 'from-brand-500 to-violet-500';

  return (
    <div className="mx-auto flex min-h-[calc(100vh-6rem)] w-full max-w-md flex-col items-center justify-center px-4 py-8">
      <Link
        href="/"
        className="mb-5 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft size={14} /> 그룹 선택으로 돌아가기
      </Link>

      <div className="relative w-full overflow-hidden rounded-3xl border border-border bg-card p-8 shadow-xl shadow-brand-500/5 sm:p-10">
        <div
          aria-hidden
          className={`pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-gradient-to-br ${gradient} opacity-30 blur-3xl`}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-gradient-to-tr from-brand-500/20 via-violet-500/10 to-transparent blur-3xl"
        />

        <div className="relative">
          <div className="mb-6 flex justify-center">
            <div className="relative">
              <div
                className={`absolute inset-0 animate-pulse rounded-2xl bg-gradient-to-br ${gradient} opacity-30 blur-md`}
              />
              <div
                className={`relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${gradient} text-white shadow-lg`}
              >
                <GraduationCap size={30} />
              </div>
            </div>
          </div>

          <div className="text-center">
            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Group Access
            </span>
            <h1 className="mt-3 font-display text-3xl tracking-tight text-foreground">
              {targetName}
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              교육용 접근 코드를 입력해주세요.
            </p>
          </div>

          <form onSubmit={handleLogin} className="mt-8 flex flex-col gap-3">
            <label className="relative block">
              <span className="sr-only">비밀번호</span>
              <KeyRound
                size={16}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                type="password"
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호 입력"
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
              className={`mt-2 inline-flex items-center justify-center rounded-xl bg-gradient-to-r ${gradient} px-4 py-3 text-sm font-bold text-white shadow-lg shadow-brand-500/25 transition-all hover:shadow-xl hover:shadow-brand-500/35 disabled:cursor-not-allowed disabled:opacity-70`}
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin" /> 확인 중...
                </span>
              ) : (
                <span className="inline-flex items-center gap-2">
                  <Lock size={16} /> 학습 시작하기
                </span>
              )}
            </button>
          </form>
        </div>
      </div>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        비밀번호를 모르시나요? 운영 담당자에게 문의하세요.
      </p>
    </div>
  );
}

export default function Login() {
  return (
    <Suspense fallback={<div className="p-8 text-muted-foreground">Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
