'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { ShieldCheck, LogOut, User, Building2, GraduationCap, School, Baby } from 'lucide-react';

export default function SessionHeader() {
    const [session, setSession] = useState(null); // { type: 'admin' | 'user', name: string }
    const router = useRouter();
    const pathname = usePathname();

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
            // 1. Check Admin
            const adminSession = localStorage.getItem('admin_session');
            if (adminSession) {
                setSession({ type: 'admin', name: '관리자 모드' });
                return;
            }

            // 2. Check User
            const userSessionStr = localStorage.getItem('user_session');
            if (userSessionStr) {
                const userSession = JSON.parse(userSessionStr);
                // Map username (target id) to display name if possible, else use provided display name
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
    };

    if (!session) return null;

    return (
        <div className="admin-header">
            <div style={{
                maxWidth: '1200px',
                margin: '0 auto',
                padding: '0 2rem', // Match AdminDashboard padding
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'center',
                gap: '1rem',
                pointerEvents: 'auto'
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    background: session.type === 'admin' ? '#fff7ed' : '#eff6ff',
                    color: session.type === 'admin' ? '#c2410c' : '#1d4ed8',
                    padding: '0.5rem 1rem',
                    borderRadius: '9999px',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    border: session.type === 'admin' ? '1px solid #ffedd5' : '1px solid #dbeafe',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                }}>
                    {session.type === 'admin' ? <ShieldCheck size={16} /> : <User size={16} />}
                    {session.name}
                </div>
                <button
                    onClick={handleLogout}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.5rem 1rem',
                        background: 'white',
                        border: '1px solid #e2e8f0',
                        borderRadius: '0.5rem',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        color: '#64748b',
                        transition: 'all 0.2s',
                        fontWeight: 500
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#ef4444'; }}
                    onMouseOut={(e) => { e.currentTarget.style.background = 'white'; e.currentTarget.style.color = '#64748b'; }}
                >
                    <LogOut size={16} />
                    로그아웃
                </button>
            </div>
        </div>
    );
}
