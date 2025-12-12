'use client';

import { useState } from 'react';
import { Menu, X, Layout, Users, BookOpen, Settings } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const toggleSidebar = () => setIsOpen(!isOpen);

  return (
    <>
      <div className="mobile-header">
        <button className="btn" onClick={toggleSidebar}>
          <Menu size={24} />
        </button>
        <span style={{ fontWeight: 600 }}>Prompt Lab</span>
      </div>

      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="logo-container">
          <Link href="/" style={{ cursor: 'pointer' }}>
            <img
              src="https://img.aicec.kr/web_images/prompt_lab.png"
              alt="Prompt Lab"
              className="logo-img"
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
