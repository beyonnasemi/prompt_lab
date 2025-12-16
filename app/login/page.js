'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Lock } from 'lucide-react';

function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const targetId = searchParams.get('target');

    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [targetName, setTargetName] = useState('');

    // Map IDs to Names for display
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
        if (targetId && targetNames[targetId]) {
            setTargetName(targetNames[targetId]);
        }
    }, [targetId]);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            // Custom Login Logic: Check accounts table
            const { data, error } = await supabase
                .from('accounts')
                .select('*')
                .eq('username', targetId) // Login with targetId (e.g. 'business')
                .eq('password', password) // Simple password check
                .single();

            if (error || !data) {
                throw new Error('비밀번호가 올바르지 않습니다.');
            }

            // Login Success: Save to localStorage for simple session
            try {
                localStorage.setItem('user_session', JSON.stringify({
                    role: data.role,
                    username: data.username,
                    displayName: data.display_name
                }));
            } catch (e) {
                console.error("Local storage save error:", e);
                // Can decide to warn user or proceed (session might not persist)
            }

            // Redirect to Learn page
            router.push(`/learn/${targetId}`);

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!targetId) return <div className="p-8">잘못된 접근입니다.</div>;

    return (
        <div style={{ maxWidth: '400px', margin: '4rem auto', textAlign: 'center' }}>
            <div style={{ marginBottom: '2rem', display: 'inline-block', padding: '1rem', background: '#eff6ff', borderRadius: '50%', color: '#2563eb' }}>
                <Lock size={40} />
            </div>

            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                {targetName} 로그인
            </h1>
            <p style={{ color: '#64748b', marginBottom: '2rem' }}>
                교육용 접근 코드를 입력해주세요.
            </p>

            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <input
                    type="password"
                    autoFocus
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="비밀번호 입력"
                    style={{
                        padding: '0.75rem',
                        borderRadius: '0.5rem',
                        border: '1px solid #e2e8f0',
                        fontSize: '1rem'
                    }}
                    required
                />

                {error && <div style={{ color: '#ef4444', fontSize: '0.9rem' }}>{error}</div>}

                <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ padding: '0.75rem', fontSize: '1rem' }}
                    disabled={loading}
                >
                    {loading ? '확인 중...' : '입력 완료'}
                </button>
            </form>
        </div>
    );
}

export default function Login() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <LoginForm />
        </Suspense>
    );
}
