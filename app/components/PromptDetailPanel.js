'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

// const supabase = createClient(); // Removed incorrect client creation
// Actually, standard Next.js Supabase starter often usesutils/supabase/client.
// Let's safe-guard. I will use a prop for onSave and handle upload in parent if possible?
// START_UPDATE
// User complained about "max size" error. This is often because of passing base64 to server action.
// Best practice is client-side upload.
// I will implement client-side upload here.
// I'll try to import createClient from '@/utils/supabase/client'. if it fails build, I'll fix.

// Re-verified page.js in next step.

export default function PromptDetailPanel({ prompt, mode = 'view', isAdmin, onClose, onSave, onDelete = () => { }, isThread = false, initialDifficulty = 'beginner', enableThreadCreation = false }) {
    // mode: 'view' | 'edit' | 'create'
    const [currentMode, setCurrentMode] = useState(mode);
    const [isCreatingThread, setIsCreatingThread] = useState(false); // Helper for root prompts creating threads
    const [sessionHistory, setSessionHistory] = useState([]); // For continuous creation "cards"
    const [formData, setFormData] = useState({
        title: (mode === 'create' || mode === 'collapsed') ? '' : (prompt?.title || ''),
        content: (mode === 'create' || mode === 'collapsed') ? '' : (prompt?.content || ''),
        expected_answer: (mode === 'create' || mode === 'collapsed') ? '' : (prompt?.expected_answer || ''),
        difficulty: prompt?.difficulty || 'beginner',
        attachment_url: (mode === 'create' || mode === 'collapsed') ? null : (prompt?.attachment_url || null)
    });
    const [loading, setLoading] = useState(false);
    const [file, setFile] = useState(null);
    const [copiedId, setCopiedId] = useState(null);
    const [editingThreadId, setEditingThreadId] = useState(null);

    // Reset history when mode changes away from create/continuous/collapsed (collapsed is part of flow)
    useEffect(() => {
        if (currentMode !== 'create' && currentMode !== 'continuous' && currentMode !== 'collapsed') {
            setSessionHistory([]);
            setIsCreatingThread(false);
        }
    }, [currentMode]);

    // Clear form when switching to continuous mode (User clicks the "Add" button)
    useEffect(() => {
        if (currentMode === 'continuous') {
            setFormData({
                title: '',
                content: '',
                expected_answer: '',
                difficulty: initialDifficulty, // Use initial difficulty
                attachment_url: null
            });
        }
    }, [currentMode, initialDifficulty]);

    // --- FETCH THREADED CHILDREN (VIEW MODE & CONTINUOUS MODE) ---
    const [threadItems, setThreadItems] = useState([]);
    const [triggerRefetch, setTriggerRefetch] = useState(0);

    useEffect(() => {
        // Fetch threads if viewing OR in continuous mode (so we see history while adding)
        if ((currentMode === 'view' || currentMode === 'continuous') && prompt?.id) {
            const fetchThreads = async () => {
                const { data } = await supabase
                    .from('prompts')
                    .select('*')
                    .ilike('expected_answer', `%[PARENT:${prompt.id}]%`)
                    .order('created_at', { ascending: true });
                setThreadItems(data || []);
            };
            fetchThreads();
        } else {
            // Should we clear threads? Only if changing prompts.
            // If just switching mode, maybe keep them?
            if (!prompt?.id) setThreadItems([]);
        }
    }, [currentMode, prompt?.id, triggerRefetch]);

    useEffect(() => {
        // If we are creating a thread (local state), don't reset to view even if prompt updates (e.g. refetch).
        // Only reset if we are NOT creating a thread.
        if (prompt && mode !== 'create' && mode !== 'collapsed' && !isCreatingThread) {
            setFormData({
                title: prompt.title || '',
                content: prompt.content || '',
                expected_answer: (prompt.expected_answer || '').replace('<!--THREAD-->', ''),
                difficulty: prompt.difficulty || 'beginner',
                attachment_url: prompt.attachment_url || null
            });
            setCurrentMode('view');
        } else if (mode === 'create' || mode === 'collapsed') {
            // Start fresh
            setFormData({
                title: '',
                content: '',
                expected_answer: '',
                difficulty: initialDifficulty,
                attachment_url: null
            });
            // If passed as collapsed, we stay collapsed. If create, well, create.
            if (mode === 'create') setCurrentMode('create');
            else if (mode === 'collapsed') setCurrentMode('collapsed');
        } else if (mode === 'edit') {
            setFormData({
                title: prompt.title || '',
                content: prompt.content || '',
                expected_answer: (prompt.expected_answer || '').replace('<!--THREAD-->', ''),
                difficulty: prompt.difficulty || 'beginner',
                attachment_url: prompt.attachment_url || null
            });
            setCurrentMode('edit');
        }
    }, [prompt, mode, initialDifficulty, isCreatingThread]);

    const handleCopy = (text) => {
        navigator.clipboard.writeText(text);
        setCopiedId('copy');
        setTimeout(() => setCopiedId(null), 2000);
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            if (selectedFile.size > 3 * 1024 * 1024) {
                alert("이미지 용량이 너무 큽니다. (3MB 제한)\n더 작은 이미지를 선택해주세요.");
                e.target.value = '';
                setFile(null);
                return;
            }
            setFile(selectedFile);
        }
    };

    // --- THREAD EDIT / DELETE HANDLERS ---
    const handleDeleteThread = async (id) => {
        if (!confirm('정말 삭제하시겠습니까?')) return;
        try {
            const { error } = await supabase.from('prompts').delete().eq('id', id);
            if (error) throw error;
            setTriggerRefetch(p => p + 1);
        } catch (error) {
            alert('삭제 실패: ' + error.message);
        }
    };

    const handleEditThread = (item) => {
        setFormData({
            title: item.title,
            content: item.content,
            expected_answer: (item.expected_answer || '').replace(/<!--THREAD-->|\[PARENT:[^\]]+\]/g, ''),
            difficulty: item.difficulty,
            attachment_url: item.attachment_url
        });
        setEditingThreadId(item.id);
        setCurrentMode('continuous'); // Show the form
        // Optional: Scroll to form
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Override difficulty for threaded prompts to hide them from main list
            const payload = { ...formData };
            // Check either isThread prop OR dynamic creatingThread state
            const isThreadMode = isThread || isCreatingThread;

            if (isThreadMode) {
                // DB has constraint on difficulty, so we can't use 'thread'.
                // Instead, we use a hidden marker in expected_answer + Parent ID link.
                const parentIdTag = prompt?.id ? `[PARENT:${prompt.id}]` : '';
                payload.expected_answer = `<!--THREAD-->${parentIdTag}` + (payload.expected_answer || '');
            }

            // Pass to parent
            // If creating thread child, targetId is null (new). If editing parent, targetId is prompt.id.
            // If editing thread child, targetId is editingThreadId.
            let targetId = (currentMode === 'edit') ? prompt?.id : null;

            // If we are editing a specific thread item, use its ID.
            if (editingThreadId) {
                // We handle update directly here for thread items to keep it simple, 
                // OR we can pass it to onSave. onSave logic in page.js handles update if ID provided.
                targetId = editingThreadId;
            }

            const savedPrompt = await onSave(payload, file, targetId);

            // 1. Standalone Create: Close immediately to show list
            if (!isThreadMode && (currentMode === 'create' || currentMode === 'continuous')) {
                onClose();
                return;
            }

            // 2. Thread Continuous Flow
            if (currentMode === 'create' || currentMode === 'continuous') {
                // Continuous Flow: Add to ID-less session history or use returned object
                const historyItem = savedPrompt || { ...formData, created_at: new Date().toISOString() };

                // Add to history
                setSessionHistory(prev => [...prev, historyItem]);

                // Clear form for next input, but keep difficulty/mode
                setFormData(prev => ({
                    title: '',
                    content: '',
                    expected_answer: '',
                    difficulty: prev.difficulty,
                    attachment_url: null
                }));
                setFile(null);
                setEditingThreadId(null); // Clear editing state

                // If in thread mode (either prop or dynamic), collapse back to button.
                if (isThreadMode) {
                    setTriggerRefetch(p => p + 1); // Refresh DB threads
                    setCurrentMode('collapsed');
                } else {
                    if (currentMode !== 'continuous') setCurrentMode('continuous');
                }

            } else {
                setTriggerRefetch(p => p + 1);
                setCurrentMode('view');
            }
        } catch (error) {
            alert('저장 실패: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    // If viewing and no prompt, nothing to show
    if (!prompt && currentMode === 'view') return null;

    // --- VIEW MODE ---
    if (currentMode === 'view') {
        return (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '1.5rem', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <button onClick={onClose} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.5rem 0.75rem', border: '1px solid #e2e8f0', background: 'white', borderRadius: '0.375rem', cursor: 'pointer', color: '#64748b' }}>
                            <span>⬅️</span> 목록으로
                        </button>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            {isAdmin && (
                                <>
                                    <button onClick={() => setCurrentMode('edit')} style={{ padding: '0.5rem', cursor: 'pointer', border: 'none', background: 'none', fontSize: '1.2rem' }} title="수정">
                                        ✏️
                                    </button>
                                    <button onClick={() => onDelete(prompt.id)} style={{ padding: '0.5rem', cursor: 'pointer', border: 'none', background: 'none', fontSize: '1.2rem' }} title="삭제">
                                        🗑️
                                    </button>
                                </>
                            )}
                            <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '0.5rem', fontSize: '1.2rem', color: '#94a3b8' }} title="닫기">
                                ✖
                            </button>
                        </div>
                    </div>

                    <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b', lineHeight: 1.3, marginBottom: '0.75rem' }}>
                        {prompt.title}
                    </h2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem', color: '#64748b', flexWrap: 'wrap' }}>
                        <span style={{
                            background: prompt.difficulty === 'beginner' ? '#dbeafe' : prompt.difficulty === 'intermediate' ? '#fce7f3' : '#ffedd5',
                            color: prompt.difficulty === 'beginner' ? '#1e40af' : prompt.difficulty === 'intermediate' ? '#9d174d' : '#9a3412',
                            fontSize: '0.75rem', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 600
                        }}>
                            {prompt.difficulty === 'beginner' ? '초급' : prompt.difficulty === 'intermediate' ? '중급' : '고급'}
                        </span>
                        <span>📅 {new Date(prompt.created_at).toLocaleDateString()}</span>
                        {prompt.accounts?.display_name && <span>👤 {prompt.accounts.display_name}</span>}
                    </div>
                </div>

                <div style={{}}>
                    <div style={{ marginBottom: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#334155' }}>📝 프롬프트</h3>
                            <button onClick={() => handleCopy(prompt.content)} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.3rem 0.6rem', border: '1px solid #cbd5e1', borderRadius: '0.25rem', background: 'white', cursor: 'pointer', fontSize: '0.85rem' }}>
                                {copiedId ? '✅ 복사됨' : '📋 복사하기'}
                            </button>
                        </div>
                        <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '0.5rem', whiteSpace: 'pre-wrap', lineHeight: '1.6', border: '1px solid #e2e8f0', color: '#334155', fontFamily: 'monospace' }}>
                            {prompt.content}
                        </div>
                    </div>

                    {prompt.expected_answer && (
                        <div style={{ marginBottom: '1.5rem' }}>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#334155', marginBottom: '0.5rem' }}>💡 예상 답변</h3>
                            <div style={{ background: '#eff6ff', padding: '1.25rem', borderRadius: '0.5rem', color: '#1e3a8a', lineHeight: '1.7', border: '1px solid #dbeafe', whiteSpace: 'pre-wrap' }}>
                                {prompt.expected_answer.replace(/<!--THREAD-->|\[PARENT:[^\]]+\]/g, '')}
                            </div>
                        </div>
                    )}

                    {prompt.attachment_url && (
                        <div>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#334155', marginBottom: '0.5rem' }}>💾 첨부 자료</h3>

                            {/* Image Preview */}
                            {/\.(jpg|jpeg|png|gif|webp)$/i.test(prompt.attachment_url) && (
                                <div style={{ marginBottom: '1rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem', overflow: 'hidden' }}>
                                    <img
                                        src={prompt.attachment_url}
                                        alt="첨부 이미지"
                                        style={{ maxWidth: '100%', height: 'auto', display: 'block' }}
                                    />
                                </div>
                            )}

                            <a
                                href={`${prompt.attachment_url}?download=`}
                                download
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', background: 'white', border: '1px solid #cbd5e1', borderRadius: '0.5rem', textDecoration: 'none', color: '#2563eb' }}
                            >
                                <span>📥</span> 자료 다운로드
                            </a>
                        </div>
                    )}

                    {/* --- THREADED REPLIES (PERSISTENT) --- */}
                    {threadItems.length > 0 && (
                        <div style={{ marginTop: '3rem', borderTop: '2px dashed #e2e8f0', paddingTop: '2rem' }}>
                            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#334155', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span>🔗</span> 이어지는 프롬프트
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', borderLeft: '3px solid #e2e8f0', paddingLeft: '1.5rem', marginLeft: '0.5rem' }}>
                                {threadItems.map((item, idx) => (
                                    <div key={item.id} style={{
                                        position: 'relative',
                                        background: 'white',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '1rem',
                                        padding: '1.5rem',
                                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)'
                                    }}>
                                        {/* Connector Dot */}
                                        <div style={{ position: 'absolute', left: '-1.9rem', top: '2rem', width: '12px', height: '12px', background: '#3b82f6', borderRadius: '50%', border: '2px solid white', boxShadow: '0 0 0 1px #cbd5e1' }}></div>

                                        <div style={{ fontWeight: 600, color: '#475569', marginBottom: '1rem', fontSize: '1.05rem' }}>{item.title}</div>

                                        <div style={{ marginBottom: '1rem' }}>
                                            <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.25rem', fontWeight: 600 }}>프롬프트 내용</div>
                                            <div style={{ fontSize: '0.95rem', color: '#334155', whiteSpace: 'pre-wrap', lineHeight: '1.6', background: 'white', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
                                                {item.content}
                                            </div>
                                        </div>

                                        {item.expected_answer && (
                                            <div>
                                                <div style={{ fontSize: '0.85rem', color: '#d97706', marginBottom: '0.25rem', fontWeight: 600 }}>예상 답변</div>
                                                <div style={{ fontSize: '0.95rem', color: '#92400e', whiteSpace: 'pre-wrap', lineHeight: '1.6', background: '#fffbeb', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #fcd34d' }}>
                                                    {item.expected_answer.replace(/<!--THREAD-->|\[PARENT:[^\]]+\]/g, '')}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* --- ADD NEW THREAD BUTTON (Only Admin) --- */}
                    {isAdmin && (enableThreadCreation || isThread) && (
                        <div style={{ marginTop: '3rem', borderTop: '1px solid #e2e8f0', paddingTop: '2rem', paddingBottom: '2rem' }}>
                            <button
                                onClick={() => {
                                    setIsCreatingThread(true);
                                    setCurrentMode('continuous');
                                }}
                                style={{
                                    width: '100%',
                                    padding: '1rem',
                                    background: '#f0f9ff',
                                    border: '1px dashed #0ea5e9',
                                    borderRadius: '0.75rem',
                                    color: '#0284c7',
                                    fontWeight: 600,
                                    fontSize: '1rem',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    transition: 'background 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = '#e0f2fe'}
                                onMouseLeave={(e) => e.currentTarget.style.background = '#f0f9ff'}
                            >
                                <span>➕</span> 이어지는 프롬프트 추가하기 (스레드)
                            </button>
                        </div>
                    )}

                    {/* Bottom Back Button */}
                    <div style={{ marginTop: '0', borderTop: '1px solid #e2e8f0', paddingTop: '1.5rem' }}>
                        <button
                            onClick={onClose}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '0.5rem',
                                padding: '0.75rem 1.5rem',
                                background: 'white', border: '1px solid #cbd5e1',
                                borderRadius: '0.5rem', cursor: 'pointer',
                                color: '#475569', fontWeight: 600,
                                width: '100%', justifyContent: 'center'
                            }}
                        >
                            <span>⬅️</span> 목록으로 돌아가기
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // --- RENDER HELPERS ---
    const renderCollapsedButton = () => (
        <div style={{
            background: 'white',
            borderRadius: '1rem',
            border: '1px dashed #cbd5e1',
            padding: '2rem',
            textAlign: 'center',
            transition: 'all 0.2s ease-in-out',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            alignItems: 'center',
            justifyContent: 'center'
        }}
            onClick={() => {
                // Keep existing thread state or set it?
                // If we are here, we are likely already in thread mode.
                setCurrentMode('continuous');
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.background = '#f8fafc'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.background = 'white'; }}
        >
            <div style={{
                width: '3rem', height: '3rem', borderRadius: '50%', background: '#eff6ff', color: '#2563eb',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', marginBottom: '0.5rem'
            }}>
                ➕
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#334155', margin: 0 }}>새로운 프롬프트 추가하기</h3>
            <p style={{ fontSize: '0.9rem', color: '#64748b', margin: 0 }}>
                클릭하여 스레드에 새로운 프롬프트를 연결합니다.
            </p>
        </div>
    );

    // --- EDIT / CREATE / CONTINUOUS MODE ---
    const isThreadMode = isThread || isCreatingThread;

    // --- MAIN RENDER (Edit / Create / Continuous / Collapsed) ---
    return (
        <div style={{ display: 'flex', flexDirection: 'column' }}>


            <div style={{ paddingRight: '0.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '0.5rem', position: 'relative' }}>

                {/* --- PARENT PROMPT DETAIL (CONTEXT) --- */}
                {isThreadMode && prompt && (
                    <div style={{ paddingBottom: '1.5rem', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0' }}>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b', lineHeight: 1.3, marginBottom: '0.75rem' }}>
                            {prompt.title} (원문)
                        </h2>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem', color: '#64748b', flexWrap: 'wrap', marginBottom: '1rem' }}>
                            <span style={{
                                background: prompt.difficulty === 'beginner' ? '#dbeafe' : prompt.difficulty === 'intermediate' ? '#fce7f3' : '#ffedd5',
                                color: prompt.difficulty === 'beginner' ? '#1e40af' : prompt.difficulty === 'intermediate' ? '#9d174d' : '#9a3412',
                                fontSize: '0.75rem', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 600
                            }}>
                                {prompt.difficulty === 'beginner' ? '초급' : prompt.difficulty === 'intermediate' ? '중급' : '고급'}
                            </span>
                            <span>📅 {new Date(prompt.created_at).toLocaleDateString()}</span>
                        </div>
                        <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '0.5rem', whiteSpace: 'pre-wrap', lineHeight: '1.6', border: '1px solid #e2e8f0', color: '#334155', fontSize: '0.95rem' }}>
                            {prompt.content}
                        </div>
                    </div>
                )}

                {/* Floating Close Button */}
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        right: '1rem',
                        top: '1rem',
                        zIndex: 10,
                        border: 'none',
                        background: 'white',
                        borderRadius: '50%',
                        width: '2.5rem',
                        height: '2.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        color: '#94a3b8',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                        border: '1px solid #f1f5f9',
                        fontSize: '1.2rem',
                        transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.1)'; e.currentTarget.style.color = '#ef4444'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.color = '#94a3b8'; }}
                    title="닫기"
                >
                    ✖
                </button>

                {/* Existing DB Threads (Shown in Create/Continuous Mode too) */}
                {threadItems.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '0', borderLeft: isThreadMode ? '3px solid #e2e8f0' : 'none', marginLeft: isThreadMode ? '1.5rem' : '0', paddingLeft: isThreadMode ? '2rem' : '0' }}>
                        {threadItems.map((item, idx) => (
                            <div key={item.id} style={{
                                alignSelf: 'flex-start',
                                width: '100%',
                                background: 'white',
                                border: '1px solid #e2e8f0',
                                borderRadius: '1rem',
                                padding: '1.5rem',
                                position: 'relative',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)'
                            }}>
                                {/* Thread Connector Node */}
                                {isThreadMode && (
                                    <div style={{ position: 'absolute', left: '-2.6rem', top: '1.8rem', width: '14px', height: '14px', background: '#3b82f6', borderRadius: '50%', border: '3px solid white', boxShadow: '0 0 0 2px #e2e8f0' }}></div>
                                )}
                                <div style={{ fontWeight: 600, color: '#0369a1', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.1rem' }}>
                                        <span style={{ background: '#0ea5e9', color: 'white', padding: '0.15rem 0.6rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600 }}>등록완료</span>
                                        {item.title}
                                    </span>
                                    <span style={{ fontSize: '0.8rem', fontWeight: 400, color: '#94a3b8' }}>{new Date(item.created_at).toLocaleDateString()}</span>

                                    {/* Admin Actions for Thread Item */}
                                    {isAdmin && (
                                        <div style={{ display: 'flex', gap: '0.5rem', marginLeft: '1rem' }}>
                                            <button
                                                onClick={() => handleEditThread(item)}
                                                style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.9rem', padding: '0.2rem' }}
                                                title="수정"
                                            >
                                                ✏️
                                            </button>
                                            <button
                                                onClick={() => handleDeleteThread(item.id)}
                                                style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.9rem', padding: '0.2rem' }}
                                                title="삭제"
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <div style={{ marginBottom: '1rem' }}>
                                    <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.4rem', fontWeight: 600 }}>프롬프트 내용</div>
                                    <div style={{ fontSize: '0.95rem', color: '#334155', whiteSpace: 'pre-wrap', lineHeight: '1.6', background: '#f8fafc', padding: '1rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0' }}>
                                        {item.content}
                                    </div>
                                </div>
                                {item.expected_answer && (
                                    <div>
                                        <div style={{ fontSize: '0.85rem', color: '#d97706', marginBottom: '0.4rem', fontWeight: 600 }}>예상 답변</div>
                                        <div style={{ fontSize: '0.95rem', color: '#92400e', whiteSpace: 'pre-wrap', lineHeight: '1.6', background: '#fffbeb', padding: '1rem', borderRadius: '0.75rem', border: '1px solid #fcd34d' }}>
                                            {item.expected_answer.replace(/<!--THREAD-->|\[PARENT:[^\]]+\]/g, '')}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* Session History Cards (Chat Style / Thread Style) */}
                {sessionHistory.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '1.5rem', borderLeft: isThreadMode ? '3px solid #e2e8f0' : 'none', marginLeft: isThreadMode ? '1.5rem' : '0', paddingLeft: isThreadMode ? '2rem' : '0' }}>
                        {sessionHistory.map((historyItem, idx) => (
                            <div key={idx} style={{
                                alignSelf: 'flex-start',
                                width: '100%',
                                background: 'white',
                                border: '1px solid #e2e8f0',
                                borderRadius: '1rem',
                                padding: '1.5rem',
                                position: 'relative',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)'
                            }}>
                                {/* Thread Connector Node */}
                                {isThreadMode && (
                                    <div style={{ position: 'absolute', left: '-2.6rem', top: '1.8rem', width: '14px', height: '14px', background: '#3b82f6', borderRadius: '50%', border: '3px solid white', boxShadow: '0 0 0 2px #e2e8f0' }}></div>
                                )}
                                <div style={{ fontWeight: 600, color: '#0369a1', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.1rem' }}>
                                        <span style={{ background: '#0ea5e9', color: 'white', padding: '0.15rem 0.6rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600 }}>등록완료</span>
                                        {historyItem.title}
                                    </span>
                                    <span style={{ fontSize: '0.8rem', fontWeight: 400, color: '#94a3b8' }}>방금 전</span>
                                </div>
                                <div style={{ marginBottom: '1rem' }}>
                                    <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.4rem', fontWeight: 600 }}>프롬프트 내용</div>
                                    <div style={{ fontSize: '0.95rem', color: '#334155', whiteSpace: 'pre-wrap', lineHeight: '1.6', background: '#f8fafc', padding: '1rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0' }}>
                                        {historyItem.content}
                                    </div>
                                </div>
                                {historyItem.expected_answer && (
                                    <div>
                                        <div style={{ fontSize: '0.85rem', color: '#d97706', marginBottom: '0.4rem', fontWeight: 600 }}>예상 답변</div>
                                        <div style={{ fontSize: '0.95rem', color: '#92400e', whiteSpace: 'pre-wrap', lineHeight: '1.6', background: '#fffbeb', padding: '1rem', borderRadius: '0.75rem', border: '1px solid #fcd34d' }}>
                                            {historyItem.expected_answer.replace(/<!--THREAD-->|\[PARENT:[^\]]+\]/g, '')}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* Show Collapsed Add Button OR Form */}
                {currentMode === 'collapsed' ? (
                    renderCollapsedButton()
                ) : (
                    <form onSubmit={handleSubmit} style={{
                        display: 'flex', flexDirection: 'column', gap: '1.5rem',
                        background: 'white',
                        padding: '2rem',
                        borderRadius: '1rem',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05)',
                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05)',
                        borderLeft: isThreadMode ? 'none' : 'none',
                        marginLeft: (isThreadMode && sessionHistory.length > 0) ? '1.5rem' : '0',
                        position: 'relative'
                    }}>
                        {/* Thread Connector Line for Form (Visual Only) */}
                        {isThreadMode && (
                            <div style={{ position: 'absolute', left: '-1.6rem', top: '0', bottom: '0', width: '3px', background: '#e2e8f0', display: sessionHistory.length > 0 ? 'block' : 'none' }}></div>
                        )}

                        <div style={{ position: 'relative', marginBottom: '0.5rem' }}>
                            {isThreadMode && sessionHistory.length > 0 && (
                                <div style={{ position: 'absolute', left: '-2.6rem', top: '0.5rem', width: '14px', height: '14px', background: '#cbd5e1', borderRadius: '50%', border: '3px solid white', boxShadow: '0 0 0 2px #e2e8f0' }}></div>
                            )}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <span style={{ fontSize: '1.75rem' }}>✍️</span>
                                <div>
                                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b', lineHeight: 1.2 }}>
                                        {sessionHistory.length > 0 ? '추가 프롬프트 작성' : '새 프롬프트 작성'}
                                    </h3>
                                    <p style={{ fontSize: '0.9rem', color: '#64748b', margin: 0, marginTop: '0.2rem' }}>
                                        {sessionHistory.length > 0 ? '이전 단계에 이어지는 내용을 작성해주세요.' : '새로운 주제의 프롬프트를 작성합니다.'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {!isThreadMode && (
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#334155', fontSize: '0.95rem' }}>제목</label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    placeholder="이번 단계의 핵심 주제를 입력하세요"
                                    style={{ width: '100%', padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '0.75rem', fontSize: '1rem', background: '#f8fafc', transition: 'all 0.2s', outline: 'none' }}
                                    onFocus={(e) => { e.target.style.background = 'white'; e.target.style.borderColor = '#3b82f6'; e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)'; }}
                                    onBlur={(e) => { e.target.style.background = '#f8fafc'; e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
                                    required
                                />
                            </div>
                        )}

                        {!isThreadMode && (
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#334155', fontSize: '0.95rem' }}>난이도</label>
                                    <select
                                        value={formData.difficulty}
                                        onChange={e => setFormData({ ...formData, difficulty: e.target.value })}
                                        style={{ width: '100%', padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '0.75rem', background: '#f8fafc', cursor: 'pointer', fontSize: '1rem', outline: 'none' }}
                                    >
                                        <option value="beginner">초급</option>
                                        <option value="intermediate">중급</option>
                                        <option value="advanced">고급</option>
                                    </select>
                                </div>
                            </div>
                        )}

                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#334155', fontSize: '0.95rem' }}>프롬프트 내용</label>
                            <textarea
                                value={formData.content}
                                onChange={e => setFormData({ ...formData, content: e.target.value })}
                                placeholder="프롬프트 내용을 상세히 작성하세요..."
                                style={{ width: '100%', padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '0.75rem', minHeight: '250px', fontSize: '1rem', fontFamily: 'monospace', lineHeight: '1.6', background: '#f8fafc', resize: 'vertical', outline: 'none', transition: 'all 0.2s' }}
                                onFocus={(e) => { e.target.style.background = 'white'; e.target.style.borderColor = '#3b82f6'; e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)'; }}
                                onBlur={(e) => { e.target.style.background = '#f8fafc'; e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
                                required
                            />
                        </div>

                        <details style={{ background: '#f8fafc', borderRadius: '0.75rem', padding: '0.5rem', border: '1px solid #e2e8f0' }}>
                            <summary style={{ cursor: 'pointer', padding: '0.5rem', fontWeight: 600, color: '#64748b', listStyle: 'none' }}>
                                <span style={{ marginRight: '0.5rem' }}>👉</span> 예상 답변 및 첨부 파일 (선택)
                            </summary>
                            <div style={{ padding: '1rem', borderTop: '1px dashed #e2e8f0', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#334155', fontSize: '0.95rem' }}>예상 답변</label>
                                    <textarea
                                        value={formData.expected_answer}
                                        onChange={e => setFormData({ ...formData, expected_answer: e.target.value })}
                                        placeholder="사용자가 이 프롬프트를 실행했을 때 기대하는 답변 예시를 입력하세요."
                                        style={{ width: '100%', padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '0.75rem', minHeight: '120px', fontSize: '0.95rem', background: 'white', resize: 'vertical', outline: 'none' }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#334155', fontSize: '0.95rem' }}>첨부 파일</label>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', border: '1px dashed #cbd5e1', borderRadius: '0.75rem', background: 'white' }}>
                                        <input
                                            type="file"
                                            onChange={handleFileChange}
                                            style={{ width: '100%', fontSize: '0.9rem' }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </details>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem', borderTop: '1px solid #f1f5f9', paddingTop: '1.5rem' }}>
                            <button
                                type="button"
                                onClick={() => {
                                    if (sessionHistory.length === 0 && (currentMode === 'create' || currentMode === 'continuous')) {
                                        // If canceling initial create, close.
                                        onClose();
                                    } else {
                                        // If thread or history exists, collapse
                                        if (isThreadMode) setCurrentMode('collapsed');
                                        else onClose();
                                    }
                                }}
                                style={{ padding: '0.8rem 1.5rem', background: 'white', color: '#64748b', border: '1px solid #cbd5e1', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '1rem', fontWeight: 600 }}
                            >
                                취소
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                style={{ padding: '0.8rem 2rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem', fontWeight: 600, boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.2)' }}
                            >
                                {loading ? '저장 중...' : <span>⬆️ 질문 등록하기</span>}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div >
    );
}
