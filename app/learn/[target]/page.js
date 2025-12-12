'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Copy, Check, ChevronRight } from 'lucide-react';

function LearnContent() {
    const params = useParams();
    const router = useRouter();
    const targetId = params.target;

    const [userSession, setUserSession] = useState(null);
    const [prompts, setPrompts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDifficulty, setSelectedDifficulty] = useState('beginner');
    const [copiedId, setCopiedId] = useState(null);

    const difficulties = [
        { id: 'beginner', label: '초급' },
        { id: 'intermediate', label: '중급' },
        { id: 'advanced', label: '고급' },
    ];

    useEffect(() => {
        // 1. Auth Check
        const sessionStr = localStorage.getItem('user_session');
        if (!sessionStr) {
            router.push(`/login?target=${targetId}`);
            return;
        }
        const session = JSON.parse(sessionStr);
        if (session.username !== targetId && session.role !== 'admin') {
            alert('접근 권한이 없습니다.');
            router.push('/');
            return;
        }
        setUserSession(session);

        // 2. Fetch Data
        fetchPrompts(targetId, selectedDifficulty);
    }, [targetId, selectedDifficulty, router]);

    const fetchPrompts = async (target, difficulty) => {
        setLoading(true);
        const { data, error } = await supabase
            .from('prompts')
            .select('*')
            .eq('target_group', target)
            .eq('difficulty', difficulty)
            .order('created_at', { ascending: false });

        if (!error) {
            setPrompts(data || []);
        }
        setLoading(false);
    };

    const handleCopy = (text, id) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    if (!userSession) return null;

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <header style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                    {userSession.displayName} 학습 과정
                </h1>
                <p style={{ color: '#64748b' }}>
                    난이도를 선택하고 제공되는 프롬프트를 복사하여 실습해보세요.
                </p>
            </header>

            {/* Difficulty Tabs */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1px' }}>
                {difficulties.map(lvl => (
                    <button
                        key={lvl.id}
                        onClick={() => setSelectedDifficulty(lvl.id)}
                        style={{
                            padding: '0.75rem 1.5rem',
                            borderRadius: '0.5rem 0.5rem 0 0',
                            border: '1px solid transparent',
                            borderBottom: selectedDifficulty === lvl.id ? '2px solid #2563eb' : 'none',
                            background: selectedDifficulty === lvl.id ? '#eff6ff' : 'transparent',
                            color: selectedDifficulty === lvl.id ? '#2563eb' : '#64748b',
                            fontWeight: 600,
                            cursor: 'pointer'
                        }}
                    >
                        {lvl.label}
                    </button>
                ))}
            </div>

            {/* Prompts Grid */}
            {loading ? (
                <div>로딩 중...</div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                    {prompts.map(prompt => (
                        <div key={prompt.id} style={{
                            background: 'white',
                            border: '1px solid #e2e8f0',
                            borderRadius: '0.5rem',
                            padding: '1.5rem',
                            display: 'flex',
                            flexDirection: 'column'
                        }}>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>{prompt.title}</h3>

                            <div style={{
                                background: '#f8fafc',
                                padding: '1rem',
                                borderRadius: '0.25rem',
                                marginBottom: '1rem',
                                fontSize: '0.9rem',
                                color: '#334155',
                                maxHeight: '150px',
                                overflowY: 'auto',
                                whiteSpace: 'pre-wrap'
                            }}>
                                {prompt.content}
                            </div>

                            <div style={{ marginTop: 'auto', display: 'flex', gap: '0.5rem' }}>
                                <button
                                    onClick={() => handleCopy(prompt.content, prompt.id)}
                                    className="btn"
                                    style={{
                                        flex: 1,
                                        background: copiedId === prompt.id ? '#dcfce7' : 'white',
                                        border: '1px solid #e2e8f0',
                                        color: copiedId === prompt.id ? '#16a34a' : 'inherit'
                                    }}
                                >
                                    {copiedId === prompt.id ? (
                                        <><Check size={16} style={{ marginRight: '0.5rem' }} /> 복사됨</>
                                    ) : (
                                        <><Copy size={16} style={{ marginRight: '0.5rem' }} /> 프롬프트 복사</>
                                    )}
                                </button>
                            </div>

                            {/* Accordion for Expected Answer could go here */}
                            {prompt.expected_answer && (
                                <details style={{ marginTop: '1rem', borderTop: '1px solid #f1f5f9', paddingTop: '0.5rem' }}>
                                    <summary style={{ cursor: 'pointer', color: '#64748b', fontSize: '0.85rem' }}>예상 답변 확인하기</summary>
                                    <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: '#475569', background: '#f8fafc', padding: '0.5rem' }}>
                                        {prompt.expected_answer}
                                    </p>
                                </details>
                            )}
                        </div>
                    ))}

                    {prompts.length === 0 && (
                        <div style={{ gridColumn: '1 / -1', padding: '3rem', textAlign: 'center', color: '#94a3b8', background: '#f8fafc', borderRadius: '0.5rem' }}>
                            등록된 프롬프트가 없습니다.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default function LearnPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <LearnContent />
        </Suspense>
    );
}
