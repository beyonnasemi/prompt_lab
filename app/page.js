'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users, Building2, GraduationCap, School, Baby, User,
  Sparkles, Wand2, BookOpen, ShieldCheck, ArrowRight,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

const iconMap = {
  business: Building2,
  public: Users,
  univ: GraduationCap,
  elem: Baby,
  middle: School,
  high: School,
  adult: User,
};

const gradientMap = {
  business: 'from-brand-500 to-violet-500',
  public: 'from-brand-600 to-brand-400',
  univ: 'from-violet-500 to-accent-400',
  elem: 'from-accent-400 to-brand-400',
  middle: 'from-brand-500 to-success-500',
  high: 'from-success-500 to-brand-500',
  adult: 'from-violet-600 to-accent-500',
};

export default function Home() {
  const router = useRouter();
  const [targets, setTargets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const { data, error } = await supabase
          .from('accounts')
          .select('id, username, display_name')
          .neq('username', 'admin')
          .order('created_at', { ascending: true });

        if (error) throw error;

        const formatted = (data || []).map((acc) => ({
          id: acc.username,
          name: acc.display_name,
          Icon: iconMap[acc.username] || Users,
          gradient: gradientMap[acc.username] || 'from-brand-500 to-violet-500',
        }));
        setTargets(formatted);
      } catch (err) {
        console.error('Failed to fetch groups:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchGroups();
  }, []);

  const handleTargetClick = (id) => {
    try {
      const adminSession = localStorage.getItem('admin_session');
      if (adminSession) {
        router.push(`/learn/${id}`);
        return;
      }
    } catch (e) {
      console.error('Local storage access failed:', e);
    }
    router.push(`/login?target=${id}`);
  };

  return (
    <div className="mx-auto max-w-6xl">
      {/* ----------- HERO ----------- */}
      <section className="relative overflow-hidden rounded-3xl border border-border bg-card p-8 shadow-sm sm:p-12">
        {/* Decorative gradient blob */}
        <div
          aria-hidden
          className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-gradient-to-br from-accent-400/40 via-violet-500/30 to-brand-500/20 blur-3xl"
        />
        <div
          aria-hidden
          className="absolute -bottom-28 -left-20 h-72 w-72 rounded-full bg-gradient-to-tr from-brand-500/30 via-violet-500/20 to-transparent blur-3xl"
        />

        <div className="relative">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:border-brand-900 dark:bg-brand-900/40 dark:text-brand-200">
            <Sparkles size={12} /> 인공지능융합교육협회 & 인공지능융합교육원
          </span>

          <h1 className="mt-5 font-display text-3xl font-bold leading-[1.15] tracking-tight text-foreground sm:text-4xl md:text-5xl">
            생각을 <span className="bg-gradient-to-r from-brand-600 via-violet-500 to-accent-400 bg-clip-text text-transparent animate-gradient">프롬프트</span>로,
            <br className="hidden sm:block" />
            프롬프트를 <span className="bg-gradient-to-r from-accent-400 via-violet-500 to-brand-600 bg-clip-text text-transparent animate-gradient">결과</span>로.
          </h1>

          <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            학습 · 생성 · 관리까지 한곳에서. 내 소속에 맞는 실전 프롬프트로
            AI 활용 능력을 단계별로 키워보세요.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <a
              href="#targets"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-brand-500/20 transition hover:scale-[1.02] hover:shadow-brand-500/30"
            >
              학습 시작하기 <ArrowRight size={16} />
            </a>
            <a
              href="/manual"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-sm font-semibold text-foreground transition hover:border-brand-400 hover:text-brand-600"
            >
              <BookOpen size={16} /> 사용 가이드
            </a>
          </div>
        </div>
      </section>

      {/* ----------- TARGET CARDS ----------- */}
      <section id="targets" className="mt-14">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground sm:text-2xl">
              어디에서 활용하고 싶으세요?
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              소속 유형을 선택하면 맞춤형 커리큘럼이 시작돼요.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="h-44 animate-pulse rounded-2xl border border-border bg-muted"
              />
            ))}
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {targets.map((t, idx) => {
              const { Icon } = t;
              return (
                <button
                  key={t.id}
                  onClick={() => handleTargetClick(t.id)}
                  style={{ animationDelay: `${idx * 60}ms` }}
                  className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 text-left shadow-sm transition-all hover:-translate-y-1 hover:border-brand-400 hover:shadow-xl animate-fade-up"
                >
                  {/* Hover gradient wash */}
                  <div
                    aria-hidden
                    className={`absolute inset-0 bg-gradient-to-br ${t.gradient} opacity-0 transition-opacity duration-300 group-hover:opacity-10`}
                  />

                  <div className="relative flex items-start justify-between">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${t.gradient} text-white shadow-md`}
                    >
                      <Icon size={24} />
                    </div>
                    <ArrowRight
                      size={18}
                      className="text-muted-foreground transition-all group-hover:translate-x-1 group-hover:text-brand-600"
                    />
                  </div>

                  <h3 className="relative mt-5 text-lg font-bold text-foreground">
                    {t.name}
                  </h3>
                  <p className="relative mt-1 text-sm text-muted-foreground">
                    초급 · 중급 · 고급 단계별 학습
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* ----------- FEATURE HIGHLIGHTS ----------- */}
      <section className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <FeatureCard
          Icon={Wand2}
          color="from-brand-500 to-violet-500"
          title="AI 자동 생성"
          desc="주제만 입력하면 Gemini / GPT가 실전 프롬프트를 즉시 제안해요."
        />
        <FeatureCard
          Icon={BookOpen}
          color="from-violet-500 to-accent-400"
          title="단계별 커리큘럼"
          desc="초급·중급·고급 단계로 체계적인 프롬프트 엔지니어링 학습."
        />
        <FeatureCard
          Icon={ShieldCheck}
          color="from-success-500 to-brand-500"
          title="안전한 관리"
          desc="그룹별 분리된 대시보드로 프롬프트 데이터를 안전하게 관리."
        />
      </section>

      <div className="mt-16 pb-8 text-center text-xs text-muted-foreground">
        Made with <span className="text-accent-400">♥</span> by AICEA
      </div>
    </div>
  );
}

function FeatureCard({ Icon, color, title, desc }) {
  return (
    <div className="group rounded-2xl border border-border bg-card p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div
        className={`mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${color} text-white shadow-sm`}
      >
        <Icon size={20} />
      </div>
      <h3 className="font-semibold text-foreground">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
        {desc}
      </p>
    </div>
  );
}
