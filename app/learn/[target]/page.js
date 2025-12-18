'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { generatePromptsAction } from '@/app/actions/ai';
import BulkUploadModal from '@/app/components/BulkUploadModal';
import AIGenerateModal from '@/app/components/AIGenerateModal';
import PromptDetailModal from '@/app/components/PromptDetailModal';
import { Check, Copy, ChevronRight, Plus, Pencil, Trash2, X, Save, ShieldCheck, FileText, Sparkles, Bot, Key, ArrowLeft, Filter, Share2, Edit2, Upload, User, Calendar, Search } from 'lucide-react';

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

    // Detail Modal State
    const [detailPrompt, setDetailPrompt] = useState(null);

    // Admin State
    const [isAdmin, setIsAdmin] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPrompt, setEditingPrompt] = useState(null);
    const [promptForm, setPromptForm] = useState({ title: '', content: '', expected_answer: '', file: null });

    // Bulk Upload & AI State
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
    const [isAIModalOpen, setIsAIModalOpen] = useState(false);

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
            setUserSession({
                ...session,
                display_name: session.display_name || session.displayName || '사용자'
            });
            fetchPrompts(targetId, selectedDifficulty);
        } catch (e) {
            console.error(e);
            localStorage.removeItem('user_session');
            router.replace(`/login?target=${targetId}`);
        }
    }, [targetId, selectedDifficulty, router]);

    const fetchPrompts = async (target, difficulty) => {
        setLoading(true);
        // Try to fetch with author name if relation exists, otherwise fallback is handled gracefully by Supabase usually returning null for relation
        // NOTE: We assume 'created_by' references 'accounts.id'
        const { data, error } = await supabase
            .from('prompts')
            .select(`
                id, title, content, expected_answer, difficulty, created_by, attachment_url, created_at,
                accounts:created_by ( display_name )
            `)
            .eq('target_group', target)
            .eq('difficulty', difficulty)
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Fetch Error:", error);
            // If relation fails (e.g., FK not set up exactly as expected), try simple fetch
            const { data: fallbackData, error: fallbackError } = await supabase
                .from('prompts')
                .select('*')
                .eq('target_group', target)
                .eq('difficulty', difficulty)
                .order('created_at', { ascending: false });

            if (fallbackError) {
                alert(`불러오기 실패: ${fallbackError.message}`);
            } else {
                setPrompts(fallbackData || []);
            }
        } else {
            setPrompts(data || []);
        }
        setLoading(false);
    };

    // Admin Functions
    const handleAddClick = () => {
        setEditingPrompt(null);
        setPromptForm({ title: '', content: '', expected_answer: '', file: null });
        setIsModalOpen(true);
    };

    const handleEditClick = (prompt) => {
        setEditingPrompt(prompt);
        setPromptForm({
            title: prompt.title,
            content: prompt.content,
            expected_answer: prompt.expected_answer || '',
            file: null
        });
        setIsModalOpen(true);
    };

    const handleDeleteClick = async (id) => {
        // Confirmation is handled in the modal or directly here if called
        if (!confirm('정말 삭제하시겠습니까?')) return;
        const { error } = await supabase.from('prompts').delete().eq('id', id);
        if (error) alert('삭제 실패: ' + error.message);
        else fetchPrompts(targetId, selectedDifficulty);
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        try {
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

            if (promptForm.file) {
                const fileExt = promptForm.file.name.split('.').pop();
                const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('prompt-files')
                    .upload(fileName, promptForm.file);

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage.from('prompt-files').getPublicUrl(fileName);
                payload.attachment_url = publicUrl;
            }

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

    const handleBulkSuccess = async () => {
        // Wait a bit for DB propagation then refresh
        setTimeout(() => {
            fetchPrompts(targetId, selectedDifficulty);
        }, 500);
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
                        난이도를 선택하고 학습 주제를 클릭하여 실습해보세요.
                    </p>
                </div>
                {isAdmin && (
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <button
                            onClick={() => setIsAIModalOpen(true)}
                            className="btn"
                            style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'white', border: '1px solid #7c3aed', color: '#7c3aed', whiteSpace: 'nowrap' }}
                        >
                            <Sparkles size={18} /> <span className="mobile-hidden">AI 자동 생성</span>
                        </button>
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

            {/* Prompts Bulletin Board (Table Layout) */}
            <div style={{ background: 'white', borderRadius: '0.5rem', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        <tr>
                            <th style={{ padding: '1rem', width: '80px', textAlign: 'center', color: '#64748b', fontWeight: 600 }}>No.</th>
                            <th style={{ padding: '1rem', color: '#64748b', fontWeight: 600 }}>주제 (제목)</th>
                            <th style={{ padding: '1rem', width: '150px', color: '#64748b', fontWeight: 600, display: 'none', smDisplay: 'table-cell' }} className="mobile-hidden">생성자</th>
                            <th style={{ padding: '1rem', width: '120px', color: '#64748b', fontWeight: 600 }} className="mobile-hidden">등록일</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan="4" style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>로딩 중...</td>
                            </tr>
                        ) : prompts.length === 0 ? (
                            <tr>
                                <td colSpan="4" style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>등록된 프롬프트가 없습니다.</td>
                            </tr>
                        ) : (
                            prompts.map((prompt, index) => (
                                <tr
                                    key={prompt.id}
                                    onClick={() => setDetailPrompt(prompt)}
                                    style={{
                                        cursor: 'pointer',
                                        borderBottom: '1px solid #f1f5f9',
                                        transition: 'background 0.2s',
                                        ':hover': { background: '#f8fafc' } // Inline hover not supported in React inline styles, handled with CSS or mouse events if needed, but simple CSS class is better.
                                    }}
                                    className="table-row-hover" // We will assume simple global CSS or just accept simple style
                                    onMouseOver={(e) => e.currentTarget.style.background = '#f8fafc'}
                                    onMouseOut={(e) => e.currentTarget.style.background = 'white'}
                                >
                                    <td style={{ padding: '1rem', textAlign: 'center', color: '#94a3b8' }}>
                                        {prompts.length - index}
                                    </td>
                                    <td style={{ padding: '1rem' }}>
                                        <div style={{ fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                                            {prompt.title}
                                        </div>
                                        <div style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            {/* Mobile Only Metadata */}
                                            <span className="desktop-hidden">
                                                {new Date(prompt.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </td>
                                    <td style={{ padding: '1rem', color: '#64748b' }} className="mobile-hidden">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <User size={16} color="#cbd5e1" />
                                            {prompt.accounts?.display_name || '관리자'}
                                        </div>
                                    </td>
                                    <td style={{ padding: '1rem', color: '#94a3b8', fontSize: '0.9rem' }} className="mobile-hidden">
                                        {new Date(prompt.created_at).toLocaleDateString()}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Detail Modal */}
            <PromptDetailModal
                isOpen={!!detailPrompt}
                onClose={() => setDetailPrompt(null)}
                prompt={detailPrompt}
                isAdmin={isAdmin}
                onEdit={handleEditClick}
                onDelete={handleDeleteClick}
            />

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

                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>첨부 파일 (선택사항)</label>
                                <input
                                    type="file"
                                    onChange={e => setPromptForm({ ...promptForm, file: e.target.files[0] })}
                                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem' }}
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
            {/* AI Generate Modal Component */}
            <AIGenerateModal
                isOpen={isAIModalOpen}
                onClose={() => setIsAIModalOpen(false)}
                targetId={targetId}
                currentDifficulty={selectedDifficulty}
                onSuccess={handleBulkSuccess}
            />
            {/* Bulk Upload Modal Component */}
            <BulkUploadModal
                isOpen={isBulkModalOpen}
                onClose={() => setIsBulkModalOpen(false)}
                targetId={targetId}
                currentDifficulty={selectedDifficulty}
                onSuccess={handleBulkSuccess}
            />
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
