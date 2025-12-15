'use client';

import { useState, useEffect } from 'react';

import { Menu, X, Layout, Users, BookOpen, Settings, ShieldCheck, LogOut, User } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState(null);

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
    };
    checkSession();
  }, [pathname]);

  const handleLogout = () => {
    if (session?.type === 'admin') {
      localStorage.removeItem('admin_session');
      router.push('/admin/login');
    } else {
      localStorage.removeItem('user_session');
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
            <span>메인</span>
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
