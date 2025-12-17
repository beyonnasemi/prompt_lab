'use client';

import { useState, useEffect } from 'react';

import { Menu, X, Layout, Users, BookOpen, Settings, ShieldCheck, LogOut, User } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import LinkManagerModal from '@/app/components/LinkManagerModal';
import { getLinksAction } from '@/app/actions/linkActions';

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [links, setLinks] = useState([]);
  const [isLinkManagerOpen, setIsLinkManagerOpen] = useState(false);

  const targetNames = {
    'business': '비즈니스',
    'public': '공공기관',
    'univ': '대학',
    'elem': '초등학교',
    'middle': '중학교',
    'high': '고등학교',
    'adult': '일반성인',
  };

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
          const userSession = JSON.parse(userSessionStr);
          const displayName = targetNames[userSession.username] || userSession.displayName || '학습자';
          setSession({ type: 'user', name: displayName });
          return;
        }
        setSession(null);
      } catch (e) {
        console.error("Session check error:", e);
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
    } catch (e) {
      console.error("Logout error:", e);
      router.push('/');
    }
    setSession(null);
    setIsOpen(false);
  };

  const toggleSidebar = () => setIsOpen(!isOpen);

  return (
    <>
      <div className="mobile-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', position: 'relative', paddingRight: '1.5rem', paddingTop: '0.5rem', paddingBottom: '0.5rem' }}>
        <button className="btn" onClick={toggleSidebar} style={{ position: 'absolute', left: '1rem' }}>
          <Menu size={24} />
        </button>
        <Image
          src="https://img.aicec.kr/web_images/prompt_lab_logo_withoutbg.png"
          alt="Prompt Lab"
          width={180}
          height={30}
          style={{ height: '30px', width: 'auto' }}
          priority
        />
      </div>

      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="logo-container">
          <Link href="/" style={{ cursor: 'pointer' }} onClick={() => setIsOpen(false)}>
            <Image
              src="https://img.aicec.kr/web_images/prompt_lab_logo_withoutbg.png"
              alt="Prompt Lab"
              width={220}
              height={35}
              className="logo-img"
              style={{ width: 'auto', height: 'auto' }}
              priority
            />
          </Link>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <Link
            href="/"
            className={`nav-item ${pathname === '/' ? 'active' : ''}`}
            onClick={() => setIsOpen(false)}
          >
            <Layout size={20} />
            <span>프롬프트 실습</span>
          </Link>
          <Link
            href="/manual"
            className={`nav-item ${pathname === '/manual' ? 'active' : ''}`}
            onClick={() => setIsOpen(false)}
          >
            <BookOpen size={20} />
            <span>사용 가이드</span>
          </Link>
          <Link
            href="/admin/login"
            className={`nav-item ${pathname.includes('/admin') ? 'active' : ''}`}
            onClick={() => setIsOpen(false)}
          >
            <Settings size={20} />
            <span>관리자</span>
          </Link>
        </nav>

        <div style={{ padding: '0 1rem', marginTop: '2rem', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Useful Links
          </span>
          {session && session.type === 'admin' && (
            <button
              onClick={() => setIsLinkManagerOpen(true)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 0 }}
              title="링크 관리"
            >
              <Settings size={14} />
            </button>
          )}
        </div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {links.length > 0 ? (
            links.map(link => {
              // Icon Mapping
              let iconSrc = '/globe.svg';
              let isAuto = false;

              if (link.icon_key === 'chatgpt') iconSrc = '/icons/chatgpt.svg';
              else if (link.icon_key === 'gemini') iconSrc = '/icons/gemini.svg';
              else if (link.icon_key === 'claude') iconSrc = '/icons/claude.svg';
              else if (link.icon_key === 'perplexity') iconSrc = '/icons/perplexity.svg';
              else if (link.icon_key === 'aistudio') iconSrc = '/icons/gemini.svg';
              else if (link.icon_key === 'antigravity') iconSrc = '/favicon.png';
              else if (link.icon_key === 'auto' || (!link.icon_key && link.url)) {
                // Use Google S2 Favicon service
                try {
                  const domain = new URL(link.url).hostname;
                  iconSrc = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
                  isAuto = true;
                } catch (e) {
                  iconSrc = '/globe.svg';
                }
              }

              return (
                <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer" className="nav-item" onClick={() => setIsOpen(false)}>
                  <Image
                    src={iconSrc}
                    alt={link.title}
                    width={16}
                    height={16}
                    style={{ opacity: (link.icon_key === 'default' && !isAuto) ? 0.6 : 1, objectFit: 'contain' }}
                  />
                  <span style={{ fontSize: '0.9rem' }}>{link.title}</span>
                </a>
              );
            })
          ) : (
            <div style={{ padding: '0 1rem', fontSize: '0.8rem', color: '#cbd5e1' }}>등록된 링크가 없습니다.</div>
          )}
        </nav>

        <LinkManagerModal
          isOpen={isLinkManagerOpen}
          onClose={() => setIsLinkManagerOpen(false)}
          onUpdate={() => {
            getLinksAction().then(setLinks);
          }}
        />

        {session && (
          <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.75rem 1rem', marginBottom: '0.5rem',
              background: session.type === 'admin' ? '#fff7ed' : '#eff6ff',
              color: session.type === 'admin' ? '#c2410c' : '#1d4ed8',
              borderRadius: '0.5rem', fontSize: '0.9rem', fontWeight: 600
            }}>
              {session.type === 'admin' ? <ShieldCheck size={16} /> : <User size={16} />}
              {session.name}
            </div>
            <button
              onClick={handleLogout}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.75rem 1rem', background: 'white', border: '1px solid #e2e8f0',
                borderRadius: '0.5rem', cursor: 'pointer', color: '#64748b', fontWeight: 500
              }}
            >
              <LogOut size={18} /> 로그아웃
            </button>
          </div>
        )}
      </aside>

      {/* Overlay for mobile when sidebar is open */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 45
          }}
          className="mobile-overlay"
        />
      )}
    </>
  );
}
