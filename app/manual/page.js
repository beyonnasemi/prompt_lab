import {
  GraduationCap, Copy, CheckCircle2, Shield, Sparkles,
  MousePointerClick, ClipboardCheck, ArrowRight,
} from 'lucide-react';
import Link from 'next/link';

export const metadata = {
  title: '사용 가이드 · Prompt Lab',
};

export default function ManualPage() {
  return (
    <div className="mx-auto w-full max-w-3xl">
      {/* Header */}
      <div className="mb-10">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:border-brand-900 dark:bg-brand-900/40 dark:text-brand-200">
          <Sparkles size={12} /> 사용 가이드
        </span>
        <h1 className="mt-4 font-display text-3xl tracking-tight text-foreground sm:text-4xl">
          Prompt Lab, 처음이세요?
        </h1>
        <p className="mt-2 text-base text-muted-foreground">
          3단계만 따라하면 누구나 AI와 대화를 시작할 수 있어요.
        </p>
      </div>

      {/* Step cards */}
      <div className="grid grid-cols-1 gap-4">
        <StepCard
          step="01"
          Icon={GraduationCap}
          gradient="from-brand-500 to-violet-500"
          title="학습 시작하기"
          items={[
            <>
              메인 화면에서 본인의 <b className="text-foreground">대상 그룹</b>
              (비즈니스 · 대학 · 공공기관 등)을 선택하세요.
            </>,
            <>
              운영 담당자로부터 받은 <b className="text-foreground">비밀번호</b>
              를 입력하여 로그인합니다.
            </>,
            <>
              상단 <b className="text-foreground">난이도 탭</b>(초급 · 중급 ·
              고급)을 눌러 내 수준에 맞는 프롬프트를 확인합니다.
            </>,
          ]}
        />

        <StepCard
          step="02"
          Icon={MousePointerClick}
          gradient="from-violet-500 to-accent-400"
          title="프롬프트 실습"
          items={[
            <>
              원하는 주제의 프롬프트를 열고{' '}
              <InlineBtn icon={Copy}>프롬프트 복사</InlineBtn> 버튼을
              클릭합니다.
            </>,
            <>
              사용 중인 AI 서비스(ChatGPT · Gemini · Claude 등)의 채팅창에{' '}
              <b className="text-foreground">붙여넣기 (Ctrl + V)</b> 합니다.
            </>,
            <>
              AI의 답변을 확인하고,{' '}
              <InlineBtn icon={CheckCircle2}>예상 답변 보기</InlineBtn>{' '}
              버튼으로 비교해봅니다.
            </>,
          ]}
        />

        <StepCard
          step="03"
          Icon={Shield}
          gradient="from-success-500 to-brand-500"
          title="관리자 기능"
          badge="운영자 전용"
          items={[
            <>
              사이드바의 <b className="text-foreground">관리자</b> 메뉴에서
              프롬프트 등록 · 수정 · 삭제를 관리할 수 있어요.
            </>,
            <>
              JSON 포맷을 이용한{' '}
              <b className="text-foreground">대량 등록</b> 기능도 지원합니다.
            </>,
            <>
              <b className="text-foreground">AI 자동 생성</b> 기능으로 주제만
              입력하면 실전 프롬프트를 즉시 제안받을 수 있습니다.
            </>,
          ]}
        />
      </div>

      {/* Bottom CTA */}
      <div className="mt-12 overflow-hidden rounded-2xl border border-border bg-gradient-to-r from-brand-500/10 via-violet-500/10 to-accent-400/10 p-6 text-center">
        <h3 className="font-display text-xl tracking-tight text-foreground">
          이제 시작해볼까요?
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          실전 프롬프트가 여러분을 기다리고 있어요.
        </p>
        <Link
          href="/"
          className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-brand-500/20 transition hover:scale-[1.02]"
        >
          학습 시작하기 <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
}

function StepCard({ step, Icon, gradient, title, items, badge }) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-sm transition hover:border-brand-400 hover:shadow-md">
      <div
        aria-hidden
        className={`absolute -right-16 -top-16 h-40 w-40 rounded-full bg-gradient-to-br ${gradient} opacity-10 blur-2xl`}
      />
      <div className="relative flex items-start gap-4">
        <div className="shrink-0">
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} text-white shadow-md`}
          >
            <Icon size={22} />
          </div>
          <div className="mt-2 text-center font-display text-xs tracking-wider text-muted-foreground">
            {step}
          </div>
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-xl tracking-tight text-foreground">
              {title}
            </h2>
            {badge && (
              <span className="rounded-full bg-accent-400/10 px-2 py-0.5 text-[11px] font-semibold text-accent-500 dark:bg-accent-400/20">
                {badge}
              </span>
            )}
          </div>
          <ol className="mt-3 space-y-2.5">
            {items.map((t, i) => (
              <li
                key={i}
                className="flex gap-3 text-sm leading-relaxed text-muted-foreground"
              >
                <span
                  className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${gradient} text-[11px] font-bold text-white`}
                >
                  {i + 1}
                </span>
                <span>{t}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}

function InlineBtn({ icon: Icon, children }) {
  return (
    <span className="mx-0.5 inline-flex items-center gap-1 rounded-md border border-border bg-muted px-1.5 py-0.5 text-[12px] font-semibold text-foreground">
      <Icon size={11} /> {children}
    </span>
  );
}
