'use client';

import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const INACTIVITY_LIMIT = 30 * 60 * 1000; // 30 minutes

export default function AutoLogout() {
    const router = useRouter();

    const handleLogout = useCallback(() => {
        // Check if any session exists before alerting
        try {
            const adminSession = localStorage.getItem('admin_session');
            const userSession = localStorage.getItem('user_session');

            if (adminSession || userSession) {
                localStorage.removeItem('admin_session');
                localStorage.removeItem('user_session');
                alert('장시간 미사용으로 인해 자동 로그아웃 되었습니다.');
                router.push('/');
                window.location.reload(); // Force refresh to update UI state
            }
        } catch (e) {
            console.error("AutoLogout error:", e);
        }
    }, [router]);

    useEffect(() => {
        let timeoutId;

        const resetTimer = () => {
            if (timeoutId) clearTimeout(timeoutId);
            timeoutId = setTimeout(handleLogout, INACTIVITY_LIMIT);
        };

        // Events to monitor
        const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];

        // Initial timer
        resetTimer();

        // Attach listeners
        events.forEach(event => {
            window.addEventListener(event, resetTimer);
        });

        // Cleanup
        return () => {
            if (timeoutId) clearTimeout(timeoutId);
            events.forEach(event => {
                window.removeEventListener(event, resetTimer);
            });
        };
    }, [handleLogout]);

    return null; // This component renders nothing
}
