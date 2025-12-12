'use client';

import { useState, useEffect } from 'react'; // Added useEffect

// ... inside component ...
useEffect(() => {
    const session = localStorage.getItem('admin_session');
    if (session) {
        router.push('/admin/dashboard');
    }
}, [router]);

// ... rest of code ...

return (
    <div style={{
        minHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start', // Start from top
        paddingTop: '15vh', // Push down slightly, but higher than center
        alignItems: 'center'
    }}>
        <div style={{ width: '100%', maxWidth: '400px', textAlign: 'center', margin: '0 auto' }}>
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
                    placeholder="아이디"
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
    </div>
);
}
