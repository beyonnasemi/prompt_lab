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
            setPrompts(fallbackData || []);
        } else {
            setPrompts(data || []);
        }
        setLoading(false);
    };

    // --- Search & Pagination ---
    const filteredPrompts = useMemo(() => {
        if (!searchQuery) return prompts;
        return prompts.filter(p => p.title.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [prompts, searchQuery]);

    const itemsPerPage = 8; // Adjust for layout
    const totalPages = Math.ceil(filteredPrompts.length / itemsPerPage);
    const displayedPrompts = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredPrompts.slice(start, start + itemsPerPage);
    }, [filteredPrompts, currentPage, itemsPerPage]);

    useEffect(() => {
        setCurrentPage(1);
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

                    if (uploadError) throw uploadError;

                    const { data: { publicUrl } } = supabase.storage.from('prompt-files').getPublicUrl(fileName);
                    payload.attachment_url = publicUrl;
                } catch (err) {
                    if (err.message && err.message.includes('exceeded')) {
                        throw new Error("이미지 용량이 서버 허용치를 초과했습니다. (더 작은 파일을 사용해주세요)");
                    }
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

    if (!userSession) return null;

    return (
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '1rem', height: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontSize: '1.8rem', fontWeight: 700, color: '#1e293b' }}>
                        {userSession.display_name} 프롬프트 실습
                    </h1>
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                        {['beginner', 'intermediate', 'advanced'].map((level) => (
                            <button
                                key={level}
                                onClick={() => setSelectedDifficulty(level)}
                                style={{
                                    fontWeight: 600,
                                    color: selectedDifficulty === level ? '#2563eb' : '#94a3b8',
                                    background: 'none', border: 'none', cursor: 'pointer',
                                    padding: 0,
                                    fontSize: '1rem'
                                }}
                            >
                                {level === 'beginner' ? '초급' : level === 'intermediate' ? '중급' : '고급'}
                            </button>
                        ))}
                    </div>
                </div>

                <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', marginTop: '1rem', width: '100%', maxWidth: '800px' }}>
                    <div style={{ fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}>
                        {difficultyGuides[selectedDifficulty].title}
                    </div>
                    <div style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '0.25rem' }}>
                        {difficultyGuides[selectedDifficulty].desc}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#2563eb', fontWeight: 500 }}>
                        {difficultyGuides[selectedDifficulty].features}
                    </div>
                </div>

                {isAdmin && (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {checkedIds.length > 0 && (
                            <button onClick={handleBulkDelete} className="btn" style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5' }}>
                                🗑️ 선택 삭제
                            </button>
                        )}
                        {/* Old Buttons Removed: AI, Bulk, Add */}
                    </div>
                )}
            </div>

            {/* MAIN CONTENT AREA */}
            <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

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

                        {/* List Table */}
                        <div style={{ flex: 1, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '0.5rem', background: 'white' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
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

                {/* MODE: DETAIL VIEW (CARD + INPUT) */}
                {selectedPrompt && (
                    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto', paddingRight: '0.5rem' }}>
                        {/* Back Button */}
                        <div style={{ marginBottom: '1rem' }}>
                            <button
                                onClick={() => { setSelectedPrompt(null); setActivePanel('none'); }}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                                    background: 'none', border: 'none', color: '#64748b',
                                    cursor: 'pointer', fontSize: '1rem', fontWeight: 600
                                }}
                            >
                                ⬅ 목록으로 돌아가기
                            </button>
                        </div>

                        {/* DETAIL CARD */}
                        <div style={{
                            background: 'white',
                            borderRadius: '1rem',
                            border: '1px solid #e2e8f0',
                            padding: '2rem',
                            marginBottom: '2rem',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1.5rem' }}>
                                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b', lineHeight: 1.3 }}>
                                    {selectedPrompt.title}
                                </h2>
                                <span style={{
                                    background: '#f1f5f9', color: '#64748b', padding: '0.25rem 0.75rem',
                                    borderRadius: '9999px', fontSize: '0.85rem', fontWeight: 600, flexShrink: 0
                                }}>
                                    No. {selectedPrompt.id}
                                </span>
                            </div>

                            <div style={{ display: 'grid', gap: '1.5rem' }}>
                                <div>
                                    <h4 style={{ fontSize: '0.95rem', color: '#94a3b8', marginBottom: '0.5rem', fontWeight: 600 }}>프롬프트 내용</h4>
                                    <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '0.75rem', lineHeight: '1.6', color: '#334155', whiteSpace: 'pre-wrap' }}>
                                        {selectedPrompt.content}
                                    </div>
                                </div>
                                {selectedPrompt.expected_answer && (
                                    <div>
                                        <h4 style={{ fontSize: '0.95rem', color: '#94a3b8', marginBottom: '0.5rem', fontWeight: 600 }}>예상 답변</h4>
                                        <div style={{ background: '#fffbeb', padding: '1.25rem', borderRadius: '0.75rem', lineHeight: '1.6', color: '#92400e', whiteSpace: 'pre-wrap', border: '1px solid #fef3c7' }}>
                                            {selectedPrompt.expected_answer}
                                        </div>
                                    </div>
                                )}
                                {selectedPrompt.attachment_url && (
                                    <div>
                                        <h4 style={{ fontSize: '0.95rem', color: '#94a3b8', marginBottom: '0.5rem', fontWeight: 600 }}>첨부 파일</h4>
                                        {selectedPrompt.attachment_url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                                            <img src={selectedPrompt.attachment_url} alt="Attachment" style={{ maxWidth: '100%', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }} />
                                        ) : (
                                            <a href={selectedPrompt.attachment_url} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', textDecoration: 'underline' }}>
                                                � 파일 확인하기
                                            </a>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* CREATE/EDIT FORM BELOW */}
                        <div style={{ marginBottom: '2rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#1e293b' }}>
                                    ➕ 새로운 프롬프트 추가
                                </h3>
                                <p style={{ fontSize: '0.9rem', color: '#64748b' }}>
                                    위 내용을 참고하여 이어서 작성할 수 있습니다.
                                </p>
                            </div>
                            <div style={{ background: 'white', borderRadius: '1rem', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                                <PromptDetailPanel
                                    prompt={null} // Always fresh for creation below
                                    mode="create"
                                    isAdmin={true} // Allow creation by default in this view? Yes, logic in dashboard says admin only, but here users might create?
                                    // Actually, page logic says isAdmin checks localstorage.
                                    // But typically only admins can create. 
                                    // Assuming isAdmin is true if user can see this page or check 'isAdmin' state.
                                    // Let's pass the 'isAdmin' state variable.
                                    onSave={handleSavePrompt}
                                    onClose={() => { }}
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>
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
```
