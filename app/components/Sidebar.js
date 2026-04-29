'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import {
  Home, BookOpen, Settings2, LogOut, Menu, X,
  Shield, UserCircle2, Sparkles,
} from 'lucide-react';
import LinkManagerModal from '@/app/components/LinkManagerModal';
import ThemeToggle from '@/app/components/ThemeToggle';
import Logo from '@/app/components/Logo';
import { getLinksAction } from '@/app/actions/linkActions';
import { cn } from '@/lib/utils';

const targetNames = {
  business: '비즈니스',
  public: '공공기관',
  univ: '대학',
  elem: '초등학교',
  middle: '중학교',
  high: '고등학교',
  adult: '일반성인',
};

const navItems = [
  { href: '/', label: '프롬프트 실습', icon: Home, match: (p) => p === '/' },
  { href: '/manual', label: '사용 가이드', icon: BookOpen, match: (p) => p === '/manual' },
  { href: '/admin/login', label: '관리자', icon: Settings2, match: (p) => p.includes('/admin') },
];

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [links, setLinks] = useState([]);
  const [isLinkManagerOpen, setIsLinkManagerOpen] = useState(false);

  useEffect(() => {
    const checkSession = () => {
      try {
        const adminSession = localStorage.getItem('admin_session');
        if (adminSession) {
          setSession({ type: 'admin', name: '관리자 모드' });
          return;
        }
        const userSessionStr = localStorage.getItem('user_session');
        if (userSessionStr) {
          const u = JSON.parse(userSessionStr);
          const display = targetNames[u.username] || u.displayName || '학습자';
          setSession({ type: 'user', name: display });
          return;
        }
        setSession(null);
      } catch {
        setSession(null);
      }
    };
    checkSession();
  }, [pathname]);

  useEffect(() => {
    getLinksAction().then(setLinks);
  }, []);

  const handleLogout = () => {
    try {
      if (session?.type === 'admin') {
        localStorage.removeItem('admin_session');
        router.push('/admin/login');
      } else {
        localStorage.removeItem('user_session');
        router.push('/');
      }
    } catch {
      router.push('/');
    }
    setSession(null);
    setIsOpen(false);
  };

  return (
    <>
      {/* ---------- Mobile header ---------- */}
      <div className="mobile-header">
        <button
          onClick={() => setIsOpen((v) => !v)}
          aria-label="메뉴 열기"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-foreground hover:bg-muted"
        >
          {isOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
        <Logo size="sm" showSubtitle={false} />
        <ThemeToggle compact />
      </div>

      {/* ---------- Sidebar ---------- */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-50 flex h-screen w-[280px] flex-col overflow-hidden border-r border-border transition-transform duration-300',
          'bg-card md:translate-x-0',
          isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full',
        )}
      >
        {/* Decorative gradient glow at top */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-brand-500/15 via-violet-500/5 to-transparent dark:from-brand-500/20 dark:via-violet-500/10"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 top-16 h-40 w-40 rounded-full bg-accent-400/20 blur-3xl dark:bg-accent-400/10"
        />

        {/* ---- Logo ---- */}
        <div className="relative flex items-center justify-between border-b border-border px-5 py-5">
          <Link
            href="/"
            onClick={() => setIsOpen(false)}
            className="outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-brand-500 rounded-md"
          >
            <Logo size="md" showSubtitle />
          </Link>
          <button
            onClick={() => setIsOpen(false)}
            aria-label="메뉴 닫기"
            className="md:hidden inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
          >
            <X size={16} />
          </button>
        </div>

        {/* ---- Nav ---- */}
        <div className="relative px-3 py-4">
          <div className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
            메뉴
          </div>
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => {
              const active = item.match(pathname);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all',
                    active
                      ? 'bg-gradient-to-r from-brand-500/15 via-brand-500/5 to-transparent text-brand-700 dark:from-brand-500/25 dark:via-brand-500/10 dark:text-brand-200'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground hover:translate-x-0.5',
                  )}
                >
                  {/* Left indicator bar when active */}
                  <span
                    aria-hidden
                    className={cn(
                      'absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-gradient-to-b from-brand-500 to-accent-400 transition-opacity',
                      active ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  <Icon
                    size={18}
                    className={cn(
                      'transition-transform',
                      active
                        ? 'text-brand-600 dark:text-brand-300'
                        : 'group-hover:scale-110',
                    )}
                  />
                  <span className="flex-1">{item.label}</span>
                  {active && (
                    <Sparkles size={12} className="text-accent-400 animate-pulse" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* ---- Useful Links ---- */}
        <div className="relative px-3 pb-2">
          <div className="mb-2 flex items-center justify-between px-3">
            <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
              Useful Links
            </span>
            {session?.type === 'admin' && (
              <button
                onClick={() => setIsLinkManagerOpen(true)}
                className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                title="링크 관리"
              >
                <Settings2 size={14} />
              </button>
            )}
          </div>
          <nav className="flex max-h-[28vh] flex-col gap-0.5 overflow-y-auto">
            {links.length > 0 ? (
              links.map((link) => {
                let iconSrc = '/globe.svg';
                let isAuto = false;
                if (link.icon_key === 'chatgpt') iconSrc = '/icons/chatgpt.svg';
                else if (link.icon_key === 'gemini') iconSrc = '/icons/gemini.svg';
                else if (link.icon_key === 'claude') iconSrc = '/icons/claude.svg';
                else if (link.icon_key === 'perplexity') iconSrc = '/icons/perplexity.svg';
                else if (link.icon_key === 'aistudio') iconSrc = '/icons/gemini.svg';
                else if (link.icon_key === 'antigravity') iconSrc = '/favicon.png';
                else if (link.icon_key && link.icon_key.startsWith('http')) {
                  iconSrc = link.icon_key;
                } else if (link.icon_key === 'auto' || (!link.icon_key && link.url)) {
                  try {
                    const domain = new URL(link.url).hostname;
                    iconSrc = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
                    isAuto = true;
                  } catch {
                    iconSrc = '/globe.svg';
                  }
                }

                return (
                  <a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setIsOpen(false)}
                    className="group flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-all hover:bg-muted hover:text-foreground hover:translate-x-0.5"
                  >
                    <Image
                      src={iconSrc}
                      alt={link.title}
                      width={16}
                      height={16}
                      className="h-4 w-4 rounded object-contain"
                      style={{ opacity: link.icon_key === 'default' && !isAuto ? 0.6 : 1 }}
                    />
                    <span className="truncate">{link.title}</span>
                  </a>
                );
              })
            ) : (
              <div className="px-3 py-2 text-xs italic text-muted-foreground">
                등록된 링크 없음
              </div>
            )}
          </nav>
        </div>

        <LinkManagerModal
          isOpen={isLinkManagerOpen}
          onClose={() => setIsLinkManagerOpen(false)}
          onUpdate={() => getLinksAction().then(setLinks)}
        />

        {/* ---- Bottom: theme + session ---- */}
        <div className="relative mt-auto border-t border-border px-4 pb-4 pt-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
              테마
            </span>
            <ThemeToggle />
          </div>

          {session ? (
            <div
              className={cn(
                'relative overflow-hidden rounded-xl border p-0.5',
                session.type === 'admin'
                  ? 'border-accent-400/40 bg-gradient-to-br from-accent-400/15 via-brand-500/10 to-violet-500/15'
                  : 'border-brand-400/30 bg-gradient-to-br from-brand-500/10 via-violet-500/5 to-transparent',
              )}
            >
              <div className="rounded-[10px] bg-card px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white shadow-sm',
                      session.type === 'admin'
                        ? 'bg-gradient-to-br from-accent-400 to-accent-600'
                        : 'bg-gradient-to-br from-brand-500 to-violet-500',
                    )}
                  >
                    {session.type === 'admin' ? (
                      <Shield size={14} />
                    ) : (
                      <UserCircle2 size={14} />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold text-foreground">
                      {session.name}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {session.type === 'admin' ? '모든 권한' : '학습자 세션'}
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-xs font-semibold text-muted-foreground transition hover:border-accent-400 hover:bg-accent-400/10 hover:text-accent-500"
                >
                  <LogOut size={12} /> 로그아웃
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border px-3 py-3 text-center text-xs text-muted-foreground">
              비로그인 상태
            </div>
          )}
        </div>
      </aside>

      {/* Mobile overlay */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
          aria-hidden
        />
      )}
    </>
  );
}
