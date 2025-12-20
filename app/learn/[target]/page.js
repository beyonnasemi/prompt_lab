'use client';

import { useState, useEffect, Suspense, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import BulkUploadPanel from '@/app/components/BulkUploadPanel';
import AIGeneratePanel from '@/app/components/AIGeneratePanel';
import PromptDetailPanel from '@/app/components/PromptDetailPanel';

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

    // State for Right Panel
    // 'none' (or 'placeholder'), 'detail', 'create', 'edit', 'ai', 'bulk'
    const [activePanel, setActivePanel] = useState('none');

    // Selection State
    const [selectedPrompt, setSelectedPrompt] = useState(null);
    const [checkedIds, setCheckedIds] = useState([]);

    // Search & Pagination State
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        if (!targetId) return;

        const adminSessionStr = localStorage.getItem('admin_session');
        console.log("PromptLab Version: ThreadFix_v2");
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
        setCheckedIds([]);
        // We do NOT reset selectedPrompt here to preserve view if refreshing, 
        // but if difficulty changes, the prompt works might be filtered out? 
        // For now let's keep it.

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
            // Fallback fetch
            const { data: fallbackData } = await supabase.from('prompts').select('*').eq('target_group', target).eq('difficulty', difficulty).order('created_at', { ascending: false });
            const filteredFallback = (fallbackData || []).filter(p => !p.expected_answer?.includes('<!--THREAD-->'));
            setPrompts(filteredFallback);
        } else {
            // Safety Filter: Ensure threaded prompts are removed before setting state
            const filteredData = (data || []).filter(p => !p.expected_answer?.includes('<!--THREAD-->'));
            setPrompts(filteredData);
        }
        setLoading(false);
    };


    // --- Search & Pagination ---
    const filteredPrompts = useMemo(() => {
        let result = prompts;
        // Filter out threaded/reply prompts (hidden from main list)
        result = result.filter(p => !p.expected_answer?.includes('<!--THREAD-->'));

        if (!searchQuery) return result;
        return result.filter(p => p.title.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [prompts, searchQuery]);

    const itemsPerPage = 10; // Increased to 10 as requested
    const totalPages = Math.ceil(filteredPrompts.length / itemsPerPage);
    const displayedPrompts = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredPrompts.slice(start, start + itemsPerPage);
    }, [filteredPrompts, currentPage, itemsPerPage]);

    useEffect(() => {
        setCurrentPage(1);
        setSelectedPrompt(null);
        setActivePanel('none'); // Also reset activePanel
    }, [selectedDifficulty, searchQuery]);


    // --- Handlers ---

    // --- Handlers ---

    const handlePromptClick = (prompt) => {
        setSelectedPrompt(prompt);
        setActivePanel('detail');
    };

    const handleCreateTabClick = () => {
        setSelectedPrompt(null);
        setActivePanel('create');
    };

    // This handles single prompt save (create/edit)
    const handleSavePrompt = async (formData, file, id) => {
        try {
            const adminSession = JSON.parse(localStorage.getItem('admin_session') || '{}');
            const { data: adminAccount } = await supabase.from('accounts').select('id').eq('username', 'admin').single();

            const payload = {
                target_group: targetId,
                difficulty: formData.difficulty || selectedDifficulty,
                title: formData.title,
                content: formData.content,
                expected_answer: formData.expected_answer,
                created_by: adminAccount?.id
            };

            // File Upload Logic
            if (file) {
                const fileExt = file.name.split('.').pop();
                const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;

                try {
                    const { error: uploadError } = await supabase.storage
                        .from('prompt-files')
                        .upload(fileName, file);

                    if (uploadError) {
                        console.error("Upload error detail:", uploadError);
                        throw new Error(`이미지 업로드 실패: ${uploadError.message || '권한 부족 또는 네트워크 오류'}`);
                    }

                    const { data: { publicUrl } } = supabase.storage.from('prompt-files').getPublicUrl(fileName);
                    payload.attachment_url = publicUrl;
                } catch (err) {
                    // Specific handling for common upload errors
                    if (err.message && err.message.includes('exceeded')) {
                        throw new Error("이미지 용량이 서버 허용치를 초과했습니다.");
                    }
                    // Re-throw to block save, because user expects image
                    throw err;
                }
            } else if (formData.attachment_url) {
                payload.attachment_url = formData.attachment_url;
            }

            let resultData = null;

            if (id) {
                // Update
                const { data, error } = await supabase.from('prompts').update(payload).eq('id', id).select().single();
                if (error) throw error;
                resultData = data;

                // Update local state if needed
                if (selectedPrompt?.id === id) {
                    setSelectedPrompt({ ...selectedPrompt, ...payload });
                }
            } else {
                // Insert
                const { data, error } = await supabase.from('prompts').insert([payload]).select().single();
                if (error) throw error;
                resultData = data;
            }

            fetchPrompts(targetId, selectedDifficulty);
            // We do NOT change panel here if creating, to allow continuous flow.
            // PromptDetailPanel handles the UI feedback.

            return resultData;

        } catch (error) {
            console.error("Save failed", error);
            throw error;
        }
    };

    // This handles bulk save
    const handleBulkSave = async (dataToSave) => {
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
            setActivePanel('none'); // Or back to list?
        } catch (error) {
            console.error("Save Error:", error);
            alert('저장 중 오류가 발생했습니다: ' + error.message);
        }
    };

    const handleDeleteClick = async (id) => {
        // Redundant confirm removed here since PromptDetailPanel already asks? 
        // Wait, PromptDetailPanel asks. I should remove confirm here if called from there?
        // Actually, PromptDetailPanel code I fixed earlier: <button onClick={() => onDelete(prompt.id)}>
        // So the confirm IS removed from PromptDetailPanel. It MUST be here.
        if (!confirm('정말 삭제하시겠습니까?')) return;
        const { error } = await supabase.from('prompts').delete().eq('id', id);
        if (error) alert('삭제 실패: ' + error.message);
        else {
            fetchPrompts(targetId, selectedDifficulty);
            if (selectedPrompt?.id === id) {
                setSelectedPrompt(null);
                setActivePanel('none');
            }
        }
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
            setCheckedIds([]);
        }
    };

    const handleCheck = (e, id) => {
        e.stopPropagation();
        if (e.target.checked) setCheckedIds(prev => [...prev, id]);
        else setCheckedIds(prev => prev.filter(item => item !== id));
    };

    const handleCheckAll = (e) => {
        if (e.target.checked) setCheckedIds(displayedPrompts.map(p => p.id));
        else setCheckedIds([]);
    };

    // New: Reorder functionality (Bump to Top)
    const handleMoveToTop = async (e, id) => {
        e.stopPropagation();
        if (!confirm('이 게시글을 최상단으로 올리시겠습니까? (등록일시가 현재로 변경됩니다)')) return;

        try {
            const { error } = await supabase
                .from('prompts')
                .update({ created_at: new Date().toISOString() })
                .eq('id', id);

            if (error) throw error;
            fetchPrompts(targetId, selectedDifficulty);
        } catch (err) {
            console.error(err);
            alert('순서 변경 실패');
        }
    };

    if (!userSession) return null;

    return (
        <div className="learn-page-container" style={{ maxWidth: '1400px', margin: '0 auto', minHeight: '100vh', display: 'flex', flexDirection: 'column', padding: '1rem' }}>
            {/* Header */}
            <div style={{ marginBottom: '1rem' }}>
                <div className="responsive-header">
                    <h1 style={{ fontSize: '1.8rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>
                        {userSession.display_name} 프롬프트 실습
                    </h1>
                    {isAdmin && (
                        <div className="actions">
                            {/* NEW: Admin Actions */}
                            <button
                                onClick={() => setActivePanel('create')}
                                className="btn"
                                style={{ background: '#2563eb', color: 'white', border: 'none', padding: '0.6rem 1rem', borderRadius: '0.375rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, fontSize: '0.9rem', whiteSpace: 'nowrap' }}
                            >
                                <span>➕</span> 새 프롬프트
                            </button>
                            <button
                                onClick={() => setActivePanel('ai')}
                                className="btn"
                                style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)', color: 'white', border: 'none', padding: '0.6rem 1rem', borderRadius: '0.375rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, fontSize: '0.9rem', whiteSpace: 'nowrap' }}
                            >
                                <span>✨</span> AI 자동 생성
                            </button>
                            <button
                                onClick={() => setActivePanel('bulk')}
                                className="btn"
                                style={{ background: 'white', color: '#475569', border: '1px solid #cbd5e1', padding: '0.6rem 1rem', borderRadius: '0.375rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, fontSize: '0.9rem', whiteSpace: 'nowrap' }}
                            >
                                <span>📂</span> 대량 등록
                            </button>

                            {/* Separator - Hidden on mobile if needed or kept */}
                            <div style={{ width: '1px', height: '24px', background: '#e2e8f0', margin: '0 0.5rem' }} className="desktop-only"></div>

                            {checkedIds.length > 0 && (
                                <button onClick={handleBulkDelete} className="btn" style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5', padding: '0.5rem 1rem', borderRadius: '0.375rem', cursor: 'pointer' }}>
                                    🗑️ 선택 삭제 ({checkedIds.length})
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Difficulty Tabs */}
            <div style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
                    {['beginner', 'intermediate', 'advanced'].map((level) => (
                        <button
                            key={level}
                            onClick={() => setSelectedDifficulty(level)}
                            style={{
                                flex: 1,
                                textAlign: 'center',
                                padding: '0.75rem 0.5rem',
                                borderBottom: selectedDifficulty === level ? '3px solid #3b82f6' : '3px solid transparent',
                                color: selectedDifficulty === level ? '#2563eb' : '#64748b',
                                fontWeight: selectedDifficulty === level ? 700 : 500,
                                cursor: 'pointer',
                                background: 'none',
                                borderTop: 'none', borderLeft: 'none', borderRight: 'none',
                                fontSize: '1rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            {level === 'beginner' ? '초급' : level === 'intermediate' ? '중급' : '고급'}
                        </button>
                    ))}
                </div>
            </div>



            {/* Difficulty Description Box (Compact) */}
            <div style={{
                background: '#f8fafc',
                padding: '0.8rem 1rem',
                borderRadius: '0 0.5rem 0.5rem 0.5rem',
                border: '1px solid #e2e8f0',
                marginBottom: '0.5rem',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                fontSize: '0.9rem'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>
                            {difficultyGuides[selectedDifficulty].title}
                        </h3>
                        <span style={{ fontSize: '0.75rem', color: '#64748b', background: '#e2e8f0', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                            {selectedDifficulty.toUpperCase()}
                        </span>
                    </div>
                </div>
                {/* Hide description on very small screens if needed, or keep it short */}
                <p style={{ margin: '0 0 0.4rem 0', color: '#475569', lineHeight: '1.4', display: 'none' }} className="desktop-only-block">
                    {difficultyGuides[selectedDifficulty].desc}
                </p>
                <div style={{ color: '#0f766e', fontWeight: 600, display: 'flex', alignItems: 'flex-start', gap: '0.3rem', fontSize: '0.85rem' }}>
                    <span style={{ whiteSpace: 'nowrap' }}>💡 핵심:</span>
                    <span>{difficultyGuides[selectedDifficulty].features}</span>
                </div>
            </div>


            {/* MAIN CONTENT AREA */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>

                {/* MODE: AI GENERATE PANEL */}
                {activePanel === 'ai' && (
                    <div style={{ position: 'absolute', inset: 0, background: 'white', zIndex: 20, overflowY: 'auto' }}>
                        <AIGeneratePanel
                            targetId={targetId}
                            currentDifficulty={selectedDifficulty}
                            onSuccess={handleBulkSave}
                            onClose={() => setActivePanel('none')}
                        />
                    </div>
                )}

                {/* MODE: BULK UPLOAD PANEL */}
                {activePanel === 'bulk' && (
                    <div style={{ position: 'absolute', inset: 0, background: 'white', zIndex: 20, overflowY: 'auto' }}>
                        <BulkUploadPanel
                            targetId={targetId}
                            onSave={handleBulkSave}
                            onClose={() => setActivePanel('none')}
                        />
                    </div>
                )}

                {/* MODE: CREATE STANDALONE PANEL */}
                {activePanel === 'create' && (
                    <div style={{ position: 'absolute', inset: 0, background: 'white', zIndex: 20, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                        <PromptDetailPanel
                            mode="create"
                            isAdmin={true}
                            onSave={handleSavePrompt}
                            onClose={() => setActivePanel('none')}
                            initialDifficulty={selectedDifficulty}
                        />
                    </div>
                )}

                {/* MODE: EDIT STANDALONE PANEL */}
                {activePanel === 'edit' && selectedPrompt && (
                    <div style={{ position: 'absolute', inset: 0, background: 'white', zIndex: 20, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                        <PromptDetailPanel
                            prompt={selectedPrompt}
                            mode="edit"
                            isAdmin={true}
                            onSave={handleSavePrompt}
                            onDelete={handleDeleteClick}
                            onClose={() => setActivePanel('detail')}
                        />
                    </div>
                )}

                {/* MODE: LIST VIEW */}
                {!selectedPrompt && (
                    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
                        {/* Search */}
                        <div style={{ marginBottom: '1rem' }}>
                            <input
                                type="text"
                                placeholder="주제 검색..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{ width: '100%', padding: '0.8rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem', fontSize: '1rem' }}
                            />
                        </div>

                        {/* List Table & Mobile Card View */}
                        <div style={{ border: '1px solid #e2e8f0', borderRadius: '0.5rem', background: '#f8fafc' }}>
                            {/* Desktop Table */}
                            <table className="desktop-table" style={{ width: '100%', borderCollapse: 'collapse', background: 'white' }}>
                                <thead style={{ position: 'sticky', top: 0, background: '#f8fafc', borderBottom: '1px solid #e2e8f0', zIndex: 10 }}>
                                    <tr>
                                        {isAdmin && <th style={{ padding: '1rem', width: '50px', textAlign: 'center' }}><input type="checkbox" onChange={handleCheckAll} checked={displayedPrompts.length > 0 && checkedIds.length === displayedPrompts.length} /></th>}
                                        <th style={{ padding: '1rem', textAlign: 'center', width: '80px', color: '#64748b' }}>No.</th>
                                        <th style={{ padding: '1rem', textAlign: 'left', color: '#64748b' }}>주제</th>
                                        <th style={{ padding: '1rem', textAlign: 'right', width: '150px', color: '#64748b' }}>등록일</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr><td colSpan="4" style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>로딩 중...</td></tr>
                                    ) : displayedPrompts.length === 0 ? (
                                        <tr><td colSpan="4" style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>등록된 프롬프트가 없습니다.</td></tr>
                                    ) : (
                                        displayedPrompts.map((prompt, idx) => (
                                            <tr
                                                key={prompt.id}
                                                onClick={() => { setSelectedPrompt(prompt); setActivePanel('detail'); }}
                                                style={{
                                                    cursor: 'pointer',
                                                    background: 'white',
                                                    borderBottom: '1px solid #f1f5f9',
                                                    transition: 'background 0.2s'
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                                                onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                                            >
                                                {isAdmin && (
                                                    <td style={{ padding: '1rem', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                                                        <input type="checkbox" checked={checkedIds.includes(prompt.id)} onChange={e => handleCheck(e, prompt.id)} />
                                                    </td>
                                                )}
                                                <td style={{ padding: '1rem', textAlign: 'center', color: '#94a3b8' }}>
                                                    {filteredPrompts.length - ((currentPage - 1) * itemsPerPage) - idx}
                                                </td>
                                                <td style={{ padding: '1rem', fontWeight: 600, color: '#334155', fontSize: '1.05rem' }}>
                                                    {prompt.title}
                                                </td>
                                                <td style={{ padding: '1rem', textAlign: 'right', color: '#94a3b8', fontSize: '0.9rem' }}>
                                                    {new Date(prompt.created_at).toLocaleDateString()}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>

                            {/* Mobile Card View */}
                            <div className="mobile-list-view" style={{ padding: '0.5rem' }}>
                                {loading ? (
                                    <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>로딩 중...</div>
                                ) : displayedPrompts.length === 0 ? (
                                    <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>등록된 프롬프트가 없습니다.</div>
                                ) : (
                                    displayedPrompts.map((prompt) => (
                                        <div key={prompt.id} className="mobile-card" onClick={() => setSelectedPrompt(prompt)}>
                                            <div className="mobile-card-header">
                                                <div className="mobile-card-title">{prompt.title}</div>
                                                {isAdmin && (
                                                    <input
                                                        type="checkbox"
                                                        onClick={(e) => handleCheck(e, prompt.id)}
                                                        checked={checkedIds.includes(prompt.id)}
                                                        style={{ transform: 'scale(1.2)' }}
                                                    />
                                                )}
                                            </div>
                                            <div className="mobile-card-content">
                                                {prompt.content.replace(/<[^>]+>/g, '') /* Simple Safe Strip for preview */}
                                            </div>
                                            <div className="mobile-card-meta">
                                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                    <span>📅 {new Date(prompt.created_at).toLocaleDateString()}</span>
                                                    {isAdmin && (
                                                        <button
                                                            onClick={(e) => handleMoveToTop(e, prompt.id)}
                                                            style={{ border: '1px solid #e2e8f0', background: 'white', borderRadius: '4px', fontSize: '0.7rem', padding: '2px 6px' }}
                                                        >
                                                            🔼 위로
                                                        </button>
                                                    )}
                                                </div>
                                                <span style={{ color: '#2563eb' }}>자세히 보기 &gt;</span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1.5rem' }}>
                                <button disabled={currentPage === 1} onClick={() => setCurrentPage(c => c - 1)} className="btn" style={{ border: '1px solid #e2e8f0', padding: '0.5rem 1rem' }}>◀ 이전</button>
                                <span style={{ display: 'flex', alignItems: 'center', color: '#64748b', margin: '0 1rem' }}>{currentPage} / {totalPages}</span>
                                <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(c => c + 1)} className="btn" style={{ border: '1px solid #e2e8f0', padding: '0.5rem 1rem' }}>다음 ▶</button>
                            </div>
                        )}
                    </div>
                )}

                {/* MODE: DETAIL VIEW (UNIFIED) */}
                {selectedPrompt && (
                    <div style={{}}>
                        <PromptDetailPanel
                            mode="view"
                            prompt={selectedPrompt}
                            isAdmin={isAdmin}
                            onClose={() => { setSelectedPrompt(null); setActivePanel('none'); }}
                            onSave={handleSavePrompt}
                            onDelete={handleDeleteClick}
                            enableThreadCreation={true}
                            initialDifficulty={selectedDifficulty}
                        // Note: isThread is false by default for the ROOT view
                        />
                    </div>
                )}
            </div>
        </div >
    );
}

export default function LearnPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <LearnContent />
        </Suspense>
    );
}

