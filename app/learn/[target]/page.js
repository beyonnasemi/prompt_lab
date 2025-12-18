'use client';

import { useState, useEffect, Suspense, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import BulkUploadModal from '@/app/components/BulkUploadModal';
import AIGenerateModal from '@/app/components/AIGenerateModal';
import PromptDetailPanel from '@/app/components/PromptDetailPanel';
import { Plus, Pencil, Trash2, X, Save, FileText, Sparkles, User, Search } from 'lucide-react';

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

    // Selection & Detail Panel State
    const [selectedPrompt, setSelectedPrompt] = useState(null);
    const [checkedIds, setCheckedIds] = useState([]);

    // Search & Pagination State
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);

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
        setSelectedPrompt(null);
        setCheckedIds([]);
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
            // Fallback fetch
            const { data: fallbackData } = await supabase.from('prompts').select('*').eq('target_group', target).eq('difficulty', difficulty).order('created_at', { ascending: false });
            setPrompts(fallbackData || []);
        } else {
            setPrompts(data || []);
        }
        setLoading(false);
    };

    // --- Computed Data: Search & Pagination ---
    const itemsPerPage = selectedPrompt ? 5 : 10;

    const filteredPrompts = useMemo(() => {
        if (!searchQuery) return prompts;
        return prompts.filter(p => p.title.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [prompts, searchQuery]);

    const totalPages = Math.ceil(filteredPrompts.length / itemsPerPage);
    const displayedPrompts = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredPrompts.slice(start, start + itemsPerPage);
    }, [filteredPrompts, currentPage, itemsPerPage]);

    // Reset page on search or category change
    useEffect(() => {
        setCurrentPage(1);
    }, [selectedDifficulty, searchQuery]);

    // Auto-switch page to find the selected item is tricky because "selected" might not be in the new filtered list or might be on a diff page.
    // For now, simpler UX: If I select an item, I stay on the same page index (User might lose sight of the item if it moves to next page due to resizing 10->5).
    // Let's implement auto-page logic when selecting.
    useEffect(() => {
        if (selectedPrompt) {
            const index = filteredPrompts.findIndex(p => p.id === selectedPrompt.id);
            if (index !== -1) {
                const newPage = Math.ceil((index + 1) / 5); // When selecting, size becomes 5
                if (newPage !== currentPage) setCurrentPage(newPage);
            }
        }
    }, [selectedPrompt]);


    // --- Handlers ---

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
        if (!confirm('정말 삭제하시겠습니까?')) return;
        const { error } = await supabase.from('prompts').delete().eq('id', id);
        if (error) alert('삭제 실패: ' + error.message);
        else fetchPrompts(targetId, selectedDifficulty);
    };

    const handleBulkDelete = async () => {
        if (checkedIds.length === 0) return;
        if (!confirm(`선택한 ${checkedIds.length}개의 프롬프트를 삭제하시겠습니까?`)) return;

        const { error } = await supabase.from('prompts').delete().in('id', checkedIds);
        if (error) {
            alert('일괄 삭제 실패: ' + error.message);
        } else {
            alert('삭제되었습니다.');
            fetchPrompts(targetId, selectedDifficulty);
        }
    };

    const handleCheckAll = (e) => {
        if (e.target.checked) {
            const allIds = displayedPrompts.map(p => p.id);
            setCheckedIds(allIds);
        } else {
            setCheckedIds([]);
        }
    };

    const handleCheck = (e, id) => {
        e.stopPropagation(); // prevent row click
        if (e.target.checked) {
            setCheckedIds(prev => [...prev, id]);
        } else {
            setCheckedIds(prev => prev.filter(item => item !== id));
        }
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
                // If we edited the currently selected prompt, update it in view too
                if (selectedPrompt?.id === editingPrompt.id) {
                    setSelectedPrompt({ ...selectedPrompt, ...payload });
                }
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

    const handleDataSave = async (dataToSave) => {
        if (!dataToSave || !Array.isArray(dataToSave) || dataToSave.length === 0) return;

        try {
            const adminSession = JSON.parse(localStorage.getItem('admin_session') || '{}');
            const { data: adminAccount } = await supabase.from('accounts').select('id').eq('username', 'admin').single();

            const rows = dataToSave.map(item => ({
                target_group: targetId,
                difficulty: item.difficulty || selectedDifficulty,
                title: item.title,
                content: item.content,
                expected_answer: item.expected_answer,
                created_by: adminAccount?.id
            }));

            const { error } = await supabase.from('prompts').insert(rows);
            if (error) throw error;

            alert(`${rows.length}개의 프롬프트가 성공적으로 등록되었습니다.`);
            fetchPrompts(targetId, selectedDifficulty);
            setIsAIModalOpen(false);
            setIsBulkModalOpen(false);
        } catch (error) {
            console.error("Save Error:", error);
            alert('저장 중 오류가 발생했습니다: ' + error.message);
        }
    };

    if (!userSession) return null;

    const currentGuide = difficultyGuides[selectedDifficulty] || difficultyGuides['beginner'];

    return (
        <div className="centered-container" style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '4rem' }}>
            {/* Header */}
            <div className="learn-header" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ flex: 1, minWidth: '300px' }}>
                    <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                        {userSession.display_name} 프롬프트 실습
                    </h1>
                    <p style={{ color: '#64748b' }}>
                        난이도를 선택하고 학습 주제를 클릭하여 내용을 확인하세요.
                    </p>
                </div>
                {isAdmin && (
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <button
                            onClick={() => setIsAIModalOpen(true)}
                            className="btn"
                            style={{ padding: '0.6rem 0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem', background: 'white', border: '1px solid #7c3aed', color: '#7c3aed', fontSize: '0.9rem' }}
                        >
                            <Sparkles size={16} /> AI생성
                        </button>
                        <button
                            onClick={() => setIsBulkModalOpen(true)}
                            className="btn"
                            style={{ padding: '0.6rem 0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem', background: 'white', border: '1px solid #e2e8f0', color: '#475569', fontSize: '0.9rem' }}
                        >
                            <FileText size={16} /> 대량등록
                        </button>

                        {/* Consistent Buttons: Delete Selected & Create */}
                        {checkedIds.length > 0 && (
                            <button
                                onClick={handleBulkDelete}
                                className="btn"
                                style={{ padding: '0.6rem 1rem', display: 'flex', alignItems: 'center', gap: '0.3rem', background: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626', fontSize: '0.9rem' }}
                            >
                                <Trash2 size={16} /> 선택 삭제 ({checkedIds.length})
                            </button>
                        )}
                        <button
                            onClick={handleAddClick}
                            className="btn btn-primary"
                            style={{ padding: '0.6rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap' }}
                        >
                            <Plus size={18} /> 프롬프트 추가
                        </button>
                    </div>
                )}
            </div>

            {/* Difficulty Tabs */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1px' }}>
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

            {/* Top Section: Guide Box + Detail View */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
                {/* Guide (Smaller) */}
                {/* <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.5rem', padding: '1rem' }}>
                    <p style={{ color: '#475569', fontSize: '0.9rem' }}>💡 {currentGuide.features}</p>
                </div> */}

                {/* Detail Panel */}
                {selectedPrompt && (
                    <PromptDetailPanel
                        prompt={selectedPrompt}
                        isAdmin={isAdmin}
                        onEdit={handleEditClick}
                        onDelete={handleDeleteClick}
                        onClose={() => setSelectedPrompt(null)}
                    />
                )}
            </div>

            {/* Bottom Section: Search & List Table */}
            <div>
                {/* Search Bar */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
                    <div style={{ position: 'relative', maxWidth: '300px', width: '100%' }}>
                        <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                        <input
                            type="text"
                            placeholder="주제(제목) 검색..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{ width: '100%', padding: '0.6rem 0.6rem 0.6rem 2.5rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem' }}
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8' }}
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Table */}
                <div style={{ background: 'white', borderRadius: '0.5rem', border: '1px solid #e2e8f0', overflow: 'hidden', minHeight: '300px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                            <tr>
                                {isAdmin && (
                                    <th style={{ padding: '1rem', width: '50px', textAlign: 'center' }}>
                                        <input
                                            type="checkbox"
                                            onChange={handleCheckAll}
                                            checked={displayedPrompts.length > 0 && checkedIds.length === displayedPrompts.length}
                                        />
                                    </th>
                                )}
                                <th style={{ padding: '1rem', width: '60px', textAlign: 'center', color: '#64748b', fontWeight: 600 }}>No.</th>
                                <th style={{ padding: '1rem', color: '#64748b', fontWeight: 600 }}>주제 (제목)</th>
                                <th style={{ padding: '1rem', width: '120px', color: '#64748b', fontWeight: 600 }} className="mobile-hidden">생성자</th>
                                <th style={{ padding: '1rem', width: '100px', color: '#64748b', fontWeight: 600 }} className="mobile-hidden">등록일</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={isAdmin ? 5 : 4} style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>로딩 중...</td>
                                </tr>
                            ) : displayedPrompts.length === 0 ? (
                                <tr>
                                    <td colSpan={isAdmin ? 5 : 4} style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
                                        {searchQuery ? '검색 결과가 없습니다.' : '등록된 프롬프트가 없습니다.'}
                                    </td>
                                </tr>
                            ) : (
                                displayedPrompts.map((prompt, index) => {
                                    const realIndex = filteredPrompts.length - ((currentPage - 1) * itemsPerPage) - index;
                                    return (
                                        <tr
                                            key={prompt.id}
                                            onClick={() => setSelectedPrompt(prompt)}
                                            style={{
                                                cursor: 'pointer',
                                                borderBottom: '1px solid #f1f5f9',
                                                background: selectedPrompt?.id === prompt.id ? '#eff6ff' : 'white', // Highlight selected
                                                transition: 'background 0.2s',
                                            }}
                                            className="table-row-hover"
                                        >
                                            {isAdmin && (
                                                <td style={{ padding: '1rem', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                                                    <input
                                                        type="checkbox"
                                                        checked={checkedIds.includes(prompt.id)}
                                                        onChange={(e) => handleCheck(e, prompt.id)}
                                                    />
                                                </td>
                                            )}
                                            <td style={{ padding: '1rem', textAlign: 'center', color: '#94a3b8' }}>
                                                {realIndex}
                                            </td>
                                            <td style={{ padding: '1rem' }}>
                                                <div style={{ fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                                                    {prompt.title}
                                                </div>
                                                <div style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1.5rem' }}>
                        <button
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            style={{ padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '0.25rem', background: 'white', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', color: currentPage === 1 ? '#cbd5e1' : '#64748b' }}
                        >
                            <span>◀</span>
                        </button>

                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                            <button
                                key={page}
                                onClick={() => setCurrentPage(page)}
                                style={{
                                    padding: '0.5rem 1rem',
                                    border: page === currentPage ? '1px solid #2563eb' : '1px solid #e2e8f0',
                                    borderRadius: '0.25rem',
                                    background: page === currentPage ? '#2563eb' : 'white',
                                    color: page === currentPage ? 'white' : '#64748b',
                                    cursor: 'pointer',
                                    fontWeight: page === currentPage ? '600' : '400'
                                }}
                            >
                                {page}
                            </button>
                        ))}

                        <button
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            style={{ padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '0.25rem', background: 'white', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', color: currentPage === totalPages ? '#cbd5e1' : '#64748b' }}
                        >
                            <span>▶</span>
                        </button>
                    </div>
                )}
            </div>

            {/* Add/Edit Modal (Can be kept as modal for editing) */}
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

            {/* AI Generate Modal */}
            <AIGenerateModal
                isOpen={isAIModalOpen}
                onClose={() => setIsAIModalOpen(false)}
                targetId={targetId}
                currentDifficulty={selectedDifficulty}
                onSuccess={handleDataSave}
            />
            {/* Bulk Upload Modal */}
            <BulkUploadModal
                isOpen={isBulkModalOpen}
                onClose={() => setIsBulkModalOpen(false)}
                targetId={targetId}
                currentDifficulty={selectedDifficulty}
                onSuccess={handleDataSave}
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
