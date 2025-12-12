'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Copy, Check, ChevronRight, Plus, Pencil, Trash2, X, Save } from 'lucide-react';

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

    useEffect(() => {
        // 1. Auth Check
        const adminSessionStr = localStorage.getItem('admin_session');
        if (adminSessionStr) {
            const adminSession = JSON.parse(adminSessionStr);
            setUserSession({ display_name: '관리자', username: targetId, role: 'admin' }); // Mock session for admin view
            setIsAdmin(true);
            fetchPrompts(targetId, selectedDifficulty);
            return;
        }

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

    // Admin Functions
    const handleAddClick = () => {
        setEditingPrompt(null);
        setPromptForm({ title: '', content: '', expected_answer: '' });
        setIsModalOpen(true);
    };

    const handleEditClick = (prompt) => {
        setEditingPrompt(prompt);
        setPromptForm({
            title: prompt.title,
            content: prompt.content,
            expected_answer: prompt.expected_answer || ''
        });
        setIsModalOpen(true);
    };

    const handleDeleteClick = async (id) => {
        if (!confirm('정말 삭제하시겠습니까?')) return;
        const { error } = await supabase.from('prompts').delete().eq('id', id);
        if (error) alert('삭제 실패: ' + error.message);
        else fetchPrompts(targetId, selectedDifficulty);
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        try {
            // Get admin ID
            const adminSession = JSON.parse(localStorage.getItem('admin_session') || '{}');
            // Assuming admin table id is needed, but we used a seed script before. 
            // In a real flow, we might need to fetch the admin's UUID from the accounts table using the username from session
            // For simplicity, let's fetch the admin account ID first.
            const { data: adminAccount } = await supabase.from('accounts').select('id').eq('username', 'admin').single();

            const payload = {
                target_group: targetId,
                difficulty: selectedDifficulty,
                title: promptForm.title,
                content: promptForm.content,
                expected_answer: promptForm.expected_answer,
                created_by: adminAccount?.id
            };

            if (editingPrompt) {
                const { error } = await supabase.from('prompts').update(payload).eq('id', editingPrompt.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('prompts').insert([payload]);
                if (error) throw error;
            }
            setIsModalOpen(false);
            fetchPrompts(targetId, selectedDifficulty);
        } catch (error) {
            alert('저장 실패: ' + error.message);
        }
    };

    // Difficulty Guide Text
    const difficultyGuides = {
        beginner: {
            title: "초급 (Beginner)",
            desc: "생성형 AI와 친해지는 단계입니다. 간단하고 명확한 지시로 AI에게 기초적인 작업을 요청하는 방법을 익힙니다.",
            features: "핵심 특징: 명확한 지시어(명령), 짧고 간결한 문장"
        },
        intermediate: {
            title: "중급 (Intermediate)",
            desc: "구체적인 상황(Context)을 설정하고 AI에게 역할(Persona)을 부여하여, 업무에 바로 활용 가능한 실무형 답변을 얻는 단계입니다.",
            features: "핵심 특징: 역할 부여(Role), 구체적 상황 설명, 목적 명시"
        },
        advanced: {
            title: "고급 (Advanced)",
            desc: "복잡한 논리적 추론이나 창의적 결과물이 필요할 때 사용합니다. 예시(Few-shot)를 제공하거나 출력 형식을 지정하여 전문가 수준의 결과를 도출합니다.",
            features: "핵심 특징: 예시 제공(Few-shot), 출력 형식 지정(Format), 단계별 사고 유도"
        }
    };

    if (!userSession) return null;

    return (
        <div className="centered-container" style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '4rem' }}>
            <div style={{ marginBottom: '3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                        {userSession.display_name} 학습 과정
                    </h1>
                    <p style={{ color: '#64748b' }}>
                        난이도를 선택하고 제공되는 프롬프트를 복사하여 실습해보세요.
                    </p>
                </div>
                {isAdmin && (
                    <button
                        onClick={handleAddClick}
                        className="btn btn-primary"
                        style={{ padding: '0.75rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                        <Plus size={18} /> 프롬프트 추가
                    </button>
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
