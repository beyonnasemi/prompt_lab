'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { generatePromptsAction } from '@/app/actions/ai';
import { Copy, Check, ChevronRight, Plus, Pencil, Trash2, X, Save, ShieldCheck, FileText, Sparkles, Bot, Key } from 'lucide-react';

const targetNames = {
    'business': '비즈니스',
    'public': '공공기관',
    'univ': '대학',
    'elem': '초등학교',
    'middle': '중학교',
    'high': '고등학교',
    'adult': '일반성인 (기초)',
};

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
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
    const [editingPrompt, setEditingPrompt] = useState(null);
    const [promptForm, setPromptForm] = useState({ title: '', content: '', expected_answer: '' });
    const [bulkJson, setBulkJson] = useState('');

    // AI Gen State
    const [activeBulkTab, setActiveBulkTab] = useState('json'); // 'json' | 'ai'
    const [aiParams, setAiParams] = useState({ topic: '', model: 'gemini', count: 3, apiKey: '' });
    const [isGenerating, setIsGenerating] = useState(false);

    const difficulties = [
        { id: 'beginner', label: '초급' },
        { id: 'intermediate', label: '중급' },
        { id: 'advanced', label: '고급' },
    ];

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

    const handleBulkSubmit = async () => {
        if (!bulkJson.trim()) return alert('JSON 데이터를 입력해주세요.');
        try {
            const parsed = JSON.parse(bulkJson);
            if (!Array.isArray(parsed)) throw new Error('데이터는 배열 형식이어야 합니다.');

            const { data: adminAccount } = await supabase.from('accounts').select('id').eq('username', 'admin').single();

            const payload = parsed.map(item => ({
                target_group: targetId,
                title: item.title,
                content: item.content,
                difficulty: item.difficulty || selectedDifficulty,
                expected_answer: item.expected_answer || '',
                created_by: adminAccount?.id
            }));

            // Validate payload
            for (const item of payload) {
                if (!item.title || !item.content) throw new Error('모든 항목에 제목(title)과 내용(content)이 포함되어야 합니다.');
            }

            const { error } = await supabase.from('prompts').insert(payload);
            if (error) throw error;

            alert(`${payload.length}개의 프롬프트가 성공적으로 등록되었어요!`);
            setIsBulkModalOpen(false);
            setBulkJson('');
            fetchPrompts(targetId, selectedDifficulty);
        } catch (e) {
            alert('등록 실패: ' + e.message + '\n\n올바른 JSON 형식인지 확인해주세요.');
        }
    };

    const handleAiGenerate = async () => {
        if (!aiParams.topic) return alert('주제를 입력해주세요.');
        setIsGenerating(true);
        try {
            const result = await generatePromptsAction({
                ...aiParams,
                difficulty: selectedDifficulty,
                targetGroup: targetId
            });
            setBulkJson(JSON.stringify(result, null, 2));
            setActiveBulkTab('json');
            alert('생성 완료! 내용을 확인하고 등록 버튼을 눌러주세요.');
        } catch (e) {
            alert(e.message);
        } finally {
            setIsGenerating(false);
        }
    };

    if (!userSession) return null;

    const currentGuide = difficultyGuides[selectedDifficulty] || difficultyGuides['beginner'];

    return (
        <div className="centered-container" style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '4rem' }}>
            <div className="learn-header" style={{ marginBottom: '3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ flex: 1, minWidth: '300px' }}>
                    <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                        {userSession.display_name} 프롬프트 실습
                    </h1>
                    <p style={{ color: '#64748b' }}>
                        난이도를 선택하고 제공되는 프롬프트를 복사하여 실습해보세요.
                    </p>
                </div>
                {isAdmin && (
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <button
                            onClick={() => setIsBulkModalOpen(true)}
                            className="btn"
                            style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'white', border: '1px solid #e2e8f0', color: '#475569', whiteSpace: 'nowrap' }}
                        >
                            <FileText size={18} /> <span className="mobile-hidden">대량 등록</span>
                        </button>
                        <button
                            onClick={handleAddClick}
                            className="btn btn-primary"
                            style={{ padding: '0.75rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap' }}
                        >
                            <Plus size={18} /> <span className="mobile-hidden">프롬프트 추가</span>
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
                    {currentGuide.title}
                </h3>
                <p style={{ color: '#475569', marginBottom: '0.5rem', lineHeight: '1.6' }}>
                    {currentGuide.desc}
                </p>
                <p style={{ color: '#2563eb', fontSize: '0.9rem', fontWeight: 500 }}>
                    💡 {currentGuide.features}
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
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                            <div>
                                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                                    {editingPrompt ? '프롬프트 수정' : '새 프롬프트 추가'}
                                </h2>
                                {!editingPrompt && (
                                    <button
                                        onClick={() => {
                                            setIsModalOpen(false);
                                            setIsBulkModalOpen(true);
                                        }}
                                        style={{
                                            fontSize: '0.85rem',
                                            color: '#2563eb',
                                            background: 'none',
                                            border: 'none',
                                            padding: 0,
                                            cursor: 'pointer',
                                            textDecoration: 'underline',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.25rem'
                                        }}
                                    >
                                        <FileText size={14} /> JSON으로 대량 등록하기 (클릭)
                                    </button>
                                )}
                            </div>
                            <button onClick={() => setIsModalOpen(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '0.5rem' }}><X size={24} /></button>
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
            {/* Bulk Upload Modal */}
            {isBulkModalOpen && (
                <div className="mobile-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60 }}>
                    <div style={{ background: 'white', padding: '2rem', borderRadius: '0.5rem', width: '100%', maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                                📂 프롬프트 대량 등록
                            </h2>
                            <button onClick={() => setIsBulkModalOpen(false)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}><X size={24} /></button>
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid #e2e8f0', marginBottom: '1.5rem' }}>
                            <button
                                onClick={() => setActiveBulkTab('json')}
                                style={{
                                    padding: '0.75rem 1rem',
                                    fontWeight: 600,
                                    color: activeBulkTab === 'json' ? '#2563eb' : '#64748b',
                                    borderBottom: activeBulkTab === 'json' ? '2px solid #2563eb' : '2px solid transparent',
                                    background: 'none', border: 'none', cursor: 'pointer'
                                }}
                            >
                                JSON 직접 입력
                            </button>
                            <button
                                onClick={() => setActiveBulkTab('ai')}
                                style={{
                                    padding: '0.75rem 1rem',
                                    fontWeight: 600,
                                    color: activeBulkTab === 'ai' ? '#7c3aed' : '#64748b',
                                    borderBottom: activeBulkTab === 'ai' ? '2px solid #7c3aed' : '2px solid transparent',
                                    background: 'none', border: 'none', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', gap: '0.25rem'
                                }}
                            >
                                <Sparkles size={16} /> AI 자동 생성
                            </button>
                        </div>

                        {activeBulkTab === 'json' ? (
                            <>
                                <div style={{ marginBottom: '1.5rem' }}>
                                    <p style={{ marginBottom: '0.5rem', fontWeight: 500, color: '#334155' }}>작성 가이드</p>
                                    <div style={{ background: '#f1f5f9', padding: '1rem', borderRadius: '0.5rem', fontSize: '0.9rem', color: '#475569' }}>
                                        <p style={{ marginBottom: '0.5rem' }}>아래와 같은 JSON 배열 형식으로 입력해주세요. <br />(난이도를 생략하면 현재 페이지의 난이도({currentGuide.title})로 자동 설정됩니다.)</p>
                                        <pre style={{ background: '#1e293b', color: '#f8fafc', padding: '1rem', borderRadius: '4px', overflowX: 'auto', fontFamily: 'monospace' }}>
                                            {`[
  {
    "title": "안내 문자 작성하기",
    "content": "구직자에게 면접 안내 문자를 작성해주세요...",
    "difficulty": "beginner", 
    "expected_answer": "안녕하세요, 000님..."
  }
]`}
                                        </pre>
                                    </div>
                                </div>

                                <div style={{ marginBottom: '1.5rem' }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>JSON 데이터 입력</label>
                                    <textarea
                                        value={bulkJson}
                                        onChange={(e) => setBulkJson(e.target.value)}
                                        placeholder={`[\n  {\n    "title": "예시 프롬프트",\n    "content": "내용...",\n  }\n]`}
                                        style={{ width: '100%', padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem', minHeight: '200px', fontFamily: 'monospace', fontSize: '0.9rem' }}
                                    />
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                    <button onClick={() => setIsBulkModalOpen(false)} className="btn" style={{ border: '1px solid #e2e8f0' }}>취소</button>
                                    <button onClick={handleBulkSubmit} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <FileText size={18} /> 일괄 등록하기
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                <div style={{ background: '#f5f3ff', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #ddd6fe' }}>
                                    <h4 style={{ color: '#5b21b6', fontWeight: 600, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <Bot size={18} /> AI 프롬프트 생성기
                                    </h4>
                                    <p style={{ fontSize: '0.9rem', color: '#4c1d95' }}>
                                        원하는 주제를 입력하면 AI가 자동으로 교육용 프롬프트를 생성해줍니다.<br />
                                        생성된 결과는 JSON 탭에 자동으로 입력되며, 수정 후 등록할 수 있습니다.
                                    </p>
                                </div>

                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>주제 (Topic)</label>
                                    <input
                                        type="text"
                                        placeholder="예: 신입 사원 온보딩 메일 작성, 학부모 상담 시나리오..."
                                        value={aiParams.topic}
                                        onChange={(e) => setAiParams({ ...aiParams, topic: e.target.value })}
                                        style={{ width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem' }}
                                    />
                                </div>

                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>사용 모델</label>
                                        <select
                                            value={aiParams.model}
                                            onChange={(e) => setAiParams({ ...aiParams, model: e.target.value })}
                                            style={{ width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem' }}
                                        >
                                            <option value="gemini">Google Gemini Pro</option>
                                            <option value="gpt">OpenAI GPT-3.5</option>
                                        </select>
                                    </div>
                                    <div style={{ width: '100px' }}>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>생성 개수</label>
                                        <input
                                            type="number"
                                            min="1" max="10"
                                            value={aiParams.count}
                                            onChange={(e) => setAiParams({ ...aiParams, count: parseInt(e.target.value) || 1 })}
                                            style={{ width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem' }}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>API Key (Optional)</label>
                                    <div style={{ position: 'relative' }}>
                                        <Key size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                        <input
                                            type="password"
                                            placeholder="환경변수가 설정되어 있다면 비워두세요"
                                            value={aiParams.apiKey}
                                            onChange={(e) => setAiParams({ ...aiParams, apiKey: e.target.value })}
                                            style={{ width: '100%', padding: '0.75rem 0.75rem 0.75rem 2.2rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem' }}
                                        />
                                    </div>
                                    <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                                        * 입력하지 않으면 서버의 환경변수를 사용합니다.
                                    </p>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
                                    <button onClick={() => setIsBulkModalOpen(false)} className="btn" style={{ border: '1px solid #e2e8f0' }}>취소</button>
                                    <button
                                        onClick={handleAiGenerate}
                                        disabled={isGenerating}
                                        className="btn"
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                                            background: isGenerating ? '#94a3b8' : '#7c3aed',
                                            color: 'white',
                                            cursor: isGenerating ? 'not-allowed' : 'pointer'
                                        }}
                                    >
                                        {isGenerating ? (
                                            <>⏳ 생성 중...</>
                                        ) : (
                                            <><Sparkles size={18} /> 생성하기</>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}
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
