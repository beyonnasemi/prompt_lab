'use client'; // Error boundaries must be Client Components

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Error({ error, reset }) {
    const router = useRouter();

    useEffect(() => {
        // Log the error to an error reporting service
        console.error('Global Error caught:', error);
    }, [error]);

    return (
        <div style={{
            padding: '2rem',
            maxWidth: '600px',
            margin: '4rem auto',
            textAlign: 'center',
            background: 'white',
            borderRadius: '1rem',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
        }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#ef4444' }}>
                오류가 발생했습니다!
            </h2>

            <div style={{
                background: '#fef2f2',
                padding: '1rem',
                borderRadius: '0.5rem',
                color: '#b91c1c',
                marginBottom: '1.5rem',
                textAlign: 'left',
                overflow: 'auto',
                fontSize: '0.9rem',
                fontFamily: 'monospace'
            }}>
                {error.message || "Unknown Error"}
                {error.stack && (
                    <details style={{ marginTop: '0.5rem', cursor: 'pointer' }}>
                        <summary>Stack Trace</summary>
                        <pre style={{ whiteSpace: 'pre-wrap', marginTop: '0.5rem' }}>
                            {error.stack}
                        </pre>
                    </details>
                )}
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                <button
                    onClick={() => reset()}
                    className="btn"
                    style={{
                        padding: '0.75rem 1.5rem',
                        background: '#2563eb',
                        color: 'white',
                        border: 'none',
                        borderRadius: '0.5rem',
                        cursor: 'pointer'
                    }}
                >
                    다시 시도하기
                </button>
                <button
                    onClick={() => {
                        localStorage.clear();
                        window.location.href = '/login?target=business';
                    }}
                    className="btn"
                    style={{
                        padding: '0.75rem 1.5rem',
                        background: '#fff',
                        color: '#ef4444',
                        border: '1px solid #ef4444',
                        borderRadius: '0.5rem',
                        cursor: 'pointer'
                    }}
                >
                    세션 초기화 후 재로그인
                </button>
            </div>
        </div>
    );
}
