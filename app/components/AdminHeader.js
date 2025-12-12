'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { ShieldCheck, LogOut } from 'lucide-react';

export default function AdminHeader() {
    const [isAdmin, setIsAdmin] = useState(false);
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        // Check for admin session on mount and route change
        const checkAdmin = () => {
            const session = localStorage.getItem('admin_session');
            setIsAdmin(!!session);
        };

        checkAdmin();
        // In a real app we'd subscribe to storage events or use a context, 
        // but for now checking on render/mount is okay since we redirect on login/logout.
    }, [pathname]);

    const handleLogout = () => {
        localStorage.removeItem('admin_session');
        localStorage.removeItem('user_session'); // Optional: clear user session too if desired? Actually maybe keep user session.
        // Spec says: "Logout feature for Admin".
        setIsAdmin(false);
        router.push('/admin/login'); // Or home? User usually expects to go to login or home. 
        // Request says: "Clicking logout...". Let's go to admin login or home.
        // Given the flow, going to home or admin login is fine. Let's go to Home so they see they are out.
        // Wait, let's stick to /admin/login so they can log in again if needed, or /
        router.push('/');
    };

    if (!isAdmin) return null;

    return (
        <div style={{
            position: 'fixed',
            top: '1.5rem',
            right: '2rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            zIndex: 100
        }}>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: '#fff7ed',
                color: '#c2410c',
                padding: '0.5rem 1rem',
                borderRadius: '9999px',
                fontSize: '0.9rem',
                fontWeight: 600,
                border: '1px solid #ffedd5',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
            }}>
                <ShieldCheck size={16} />
                관리자 모드
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
    );
}
