'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Copy, Check, ChevronRight, Plus, Pencil, Trash2, X, Save, ShieldCheck } from 'lucide-react';

function LearnContent() {
    const params = useParams();
    const router = useRouter();
    const targetId = params.target;

    const [userSession, setUserSession] = useState(null);
    const [prompts, setPrompts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDifficulty, setSelectedDifficulty] = useState('beginner');
    const [copiedId, setCopiedId] = useState(null);

    // Admin State
    const [isAdmin, setIsAdmin] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPrompt, setEditingPrompt] = useState(null);
    const [promptForm, setPromptForm] = useState({ title: '', content: '', expected_answer: '' });

    const difficulties = [
        { id: 'beginner', label: '초급' },
        { id: 'intermediate', label: '중급' },
        { id: 'advanced', label: '고급' },
    ];

    // Map IDs to Names for display
    const targetNames = {
        'business': '비즈니스',
        'public': '공공기관',
        'univ': '대학',
        'elem': '초등학교',
        'middle': '중학교',
        'high': '고등학교',
        'adult': '일반성인 (기초)',
    };

    useEffect(() => {
        if (!targetId) return;

        // 1. Auth Check
        const adminSessionStr = localStorage.getItem('admin_session');
        if (adminSessionStr) {
            const targetName = targetNames[targetId] || targetId;
            setUserSession({ display_name: targetName, username: targetId, role: 'admin' });
            setIsAdmin(true);
            fetchPrompts(targetId, selectedDifficulty);
            return;
        }

        const sessionStr = localStorage.getItem('user_session');
        // Delay redirect slightly to avoid race conditions or use router.replace
        if (!sessionStr) {
            router.replace(`/login?target=${targetId}`);
            return;
        }

        try {
            const session = JSON.parse(sessionStr);
            if (session.username !== targetId && session.role !== 'admin') {
                alert('접근 권한이 없습니다.');
                router.replace('/');
                return;
            }
            setUserSession(session);
            fetchPrompts(targetId, selectedDifficulty);
        } catch (e) {
            console.error(e);
            localStorage.removeItem('user_session');
            router.replace(`/login?target=${targetId}`);
        }
    }, [targetId, selectedDifficulty, router]);

    // ... (fetchPrompts and other functions remain same) ...

    if (!userSession) return null;

    return (
        <div className="centered-container" style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '4rem' }}>
            <div style={{ marginBottom: '3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                        {userSession.display_name} 프롬프트 실습
                    </h1>
                    <p style={{ color: '#64748b' }}>
                        난이도를 선택하고 제공되는 프롬프트를 복사하여 실습해보세요.
                    </p>
                </div>
                {isAdmin && (
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <button
                            onClick={handleAddClick}
                            className="btn btn-primary"
                            style={{ padding: '0.75rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                        >
                            <Plus size={18} /> 프롬프트 추가
                        </button>
                    </div>
                )}
            </div>

            {/* Difficulty Tabs */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1px' }}>
                {['beginner', 'intermediate', 'advanced'].map((level) => (
                    <button
                        key={level}
                        onClick={() => setSelectedDifficulty(level)}
                        style={{
                            padding: '0.75rem 1.5rem',
                            fontWeight: 600,
                            color: selectedDifficulty === level ? '#2563eb' : '#64748b',
                            borderBottom: selectedDifficulty === level ? '2px solid #2563eb' : 'none',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            borderBottomWidth: selectedDifficulty === level ? '2px' : '0',
                            marginBottom: '-1px'
                        }}
                    >
                        {level === 'beginner' ? '초급' : level === 'intermediate' ? '중급' : '고급'}
                    </button>
                ))}
            </div>

            {/* Difficulty Guide Box */}
            <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '0.5rem',
                padding: '1.5rem',
                marginBottom: '3rem'
            }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem', color: '#1e293b' }}>
                    {difficultyGuides[selectedDifficulty].title}
                </h3>
                <p style={{ color: '#475569', marginBottom: '0.5rem', lineHeight: '1.6' }}>
                    {difficultyGuides[selectedDifficulty].desc}
                </p>
                <p style={{ color: '#2563eb', fontSize: '0.9rem', fontWeight: 500 }}>
                    💡 {difficultyGuides[selectedDifficulty].features}
                </p>
            </div>

            {/* Prompts List View */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {loading ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>로딩 중...</div>
                ) : prompts.length === 0 ? (
                    <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8', background: '#f8fafc', borderRadius: '0.5rem' }}>
                        등록된 프롬프트가 없습니다.
                    </div>
                ) : (
                    prompts.map((prompt) => (
                        <div key={prompt.id} style={{
                            background: 'white',
                            border: '1px solid #e2e8f0',
                            borderRadius: '0.5rem',
                            overflow: 'hidden',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                        }}>
                            {/* Prompt Header & Content */}
                            <div style={{ padding: '1.5rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                    <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1e293b' }}>{prompt.title}</h3>
                                    {isAdmin && (
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <button
                                                onClick={() => handleEditClick(prompt)}
                                                style={{ padding: '0.4rem', borderRadius: '4px', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', color: '#64748b' }}
                                                title="수정"
                                            >
                                                <Pencil size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteClick(prompt.id)}
                                                style={{ padding: '0.4rem', borderRadius: '4px', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', color: '#ef4444' }}
                                                title="삭제"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div style={{
                                    background: '#f1f5f9',
                                    padding: '1.25rem',
                                    borderRadius: '0.5rem',
                                    marginBottom: '1rem',
                                    whiteSpace: 'pre-wrap',
                                    lineHeight: '1.6',
                                    color: '#334155',
                                    fontFamily: 'monospace',
                                    border: '1px solid #e2e8f0'
                                }}>
                                    {prompt.content}
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                    <button
                                        onClick={() => handleCopy(prompt.content, prompt.id)}
                                        className="btn"
                                        style={{
                                            fontSize: '0.9rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.5rem',
                                            border: '1px solid #cbd5e1',
                                            color: copiedId === prompt.id ? '#16a34a' : '#475569'
                                        }}
                                    >
                                        {copiedId === prompt.id ? <Check size={16} /> : <Copy size={16} />}
                                        {copiedId === prompt.id ? '복사됨!' : '프롬프트 복사'}
                                    </button>
                                </div>
                            </div>

                            {/* Expected Answer Toggle */}
                            <div style={{ borderTop: '1px solid #f1f5f9' }}>
                                <details style={{ width: '100%' }}>
                                    <summary style={{
                                        padding: '1rem 1.5rem',
                                        cursor: 'pointer',
                                        color: '#64748b',
                                        fontSize: '0.95rem',
                                        fontWeight: 500,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        listStyle: 'none'
                                    }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            👉 예상 답변 확인하기
                                        </span>
                                    </summary>
                                    <div style={{
                                        padding: '0 1.5rem 1.5rem 1.5rem',
                                        color: '#475569',
                                        lineHeight: '1.7',
                                        borderTop: '1px dashed #e2e8f0',
                                        marginTop: '-0.5rem',
                                        paddingTop: '1.5rem',
                                        whiteSpace: 'pre-wrap'
                                    }}>
                                        {prompt.expected_answer || '등록된 예상 답변이 없습니다.'}
                                    </div>
                                </details>
                            </div>
                        </div>
                    ))
                )}
            </div>
            {/* Add/Edit Modal */}
            {isModalOpen && (
                <div className="mobile-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60 }}>
                    <div style={{ background: 'white', padding: '2rem', borderRadius: '0.5rem', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                                {editingPrompt ? '프롬프트 수정' : '새 프롬프트 추가'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}><X size={24} /></button>
                        </div>

                        <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>제목</label>
                                    <input
                                        type="text"
                                        value={promptForm.title}
                                        onChange={e => setPromptForm({ ...promptForm, title: e.target.value })}
                                        style={{ width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem' }}
                                        required
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>난이도</label>
                                    <select
                                        value={selectedDifficulty}
                                        disabled
                                        style={{ width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem', background: '#f1f5f9' }}
                                    >
                                        <option value="beginner">초급</option>
                                        <option value="intermediate">중급</option>
                                        <option value="advanced">고급</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>프롬프트 내용</label>
                                <textarea
                                    value={promptForm.content}
                                    onChange={e => setPromptForm({ ...promptForm, content: e.target.value })}
                                    style={{ width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem', minHeight: '150px' }}
                                    required
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>예상 답변 (선택사항)</label>
                                <textarea
                                    value={promptForm.expected_answer}
                                    onChange={e => setPromptForm({ ...promptForm, expected_answer: e.target.value })}
                                    style={{ width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem', minHeight: '100px' }}
                                />
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
                                <button type="button" onClick={() => setIsModalOpen(false)} className="btn" style={{ border: '1px solid #e2e8f0' }}>취소</button>
                                <button type="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Save size={18} /> 저장하기
                                </button>
                            </div>
                        </form>
                    </div>
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
