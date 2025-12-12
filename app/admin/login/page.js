'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ShieldCheck } from 'lucide-react';

export default function AdminLogin() {
    const router = useRouter();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const { data, error } = await supabase
                .from('accounts')
                .select('*')
                .eq('username', username)
                .eq('password', password)
                .eq('role', 'admin') // Enforce admin role
                .single();

            if (error || !data) {
                throw new Error('관리자 정보가 일치하지 않습니다.');
            }

            // Save Admin Session
            localStorage.setItem('admin_session', JSON.stringify({
                role: data.role,
                username: data.username,
                id: data.id
            }));

            router.push('/admin/dashboard');

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: '400px', margin: '4rem auto', textAlign: 'center' }}>
            <div style={{ marginBottom: '2rem', display: 'inline-block', padding: '1rem', background: '#f0fdf4', borderRadius: '50%', color: '#16a34a' }}>
                <ShieldCheck size={40} />
            </div>

            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '2rem' }}>
                관리자 로그인
            </h1>

            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="아이디 (admin)"
                    style={{
                        padding: '0.75rem',
                        borderRadius: '0.5rem',
                        border: '1px solid #e2e8f0',
                        fontSize: '1rem'
                    }}
                    required
                />
                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="비밀번호"
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
                    className="btn"
                    style={{
                        padding: '0.75rem',
                        fontSize: '1rem',
                        backgroundColor: '#16a34a',
                        color: 'white'
                    }}
                    disabled={loading}
                >
                    {loading ? '로그인 중...' : '관리자 접속'}
                </button>
            </form>
        </div>
    );
}
