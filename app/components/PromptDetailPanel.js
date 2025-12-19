'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client'; // Assuming this path, will verify. If not, I'll fix.
// Actually, standard Next.js Supabase starter often usesutils/supabase/client.
// Let's safe-guard. I will use a prop for onSave and handle upload in parent if possible?
// START_UPDATE
// User complained about "max size" error. This is often because of passing base64 to server action.
// Best practice is client-side upload.
// I will implement client-side upload here.
// I'll try to import createClient from '@/utils/supabase/client'. if it fails build, I'll fix.

// Re-verified page.js in next step.

export default function PromptDetailPanel({ prompt, mode = 'view', isAdmin, onClose, onSave, onDelete }) {
    // mode: 'view' | 'edit' | 'create'
    const [sessionHistory, setSessionHistory] = useState([]); // For continuous creation "cards"

    // Reset history when mode changes away from create, OR keep it? 
    // User wants "continuously connected". Let's keep it until explicitly closed or mode changed.
    useEffect(() => {
        if (currentMode !== 'create') {
            setSessionHistory([]);
        }
    }, [currentMode]);

    useEffect(() => {
        if (prompt && mode !== 'create') {
            setFormData({
                title: prompt.title || '',
                content: prompt.content || '',
                expected_answer: prompt.expected_answer || '',
                difficulty: prompt.difficulty || 'beginner',
                attachment_url: prompt.attachment_url || null
            });
            setCurrentMode('view'); // Default to view if prompt exists
        } else if (mode === 'create') {
            // Keep existing formData if we are just switching tabs back to create? 
            // For now, reset if prompt is null.
            if (!prompt) {
                setFormData(prev => ({
                    ...prev,
                    title: '',
                    content: '',
                    expected_answer: '',
                    difficulty: 'beginner',
                    attachment_url: null
                }));
            }
            setCurrentMode('create');
        } else if (mode === 'edit') {
            setFormData({
                title: prompt.title || '',
                content: prompt.content || '',
                expected_answer: prompt.expected_answer || '',
                difficulty: prompt.difficulty || 'beginner',
                attachment_url: prompt.attachment_url || null
            });
            setCurrentMode('edit');
        }
    }, [prompt, mode]);

    const handleCopy = (text) => {
        navigator.clipboard.writeText(text);
        setCopiedId('copy');
        setTimeout(() => setCopiedId(null), 2000);
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            // 3MB Limit (Lowered to be safe against server limits)
            if (selectedFile.size > 3 * 1024 * 1024) {
                alert("이미지 용량이 너무 큽니다. (3MB 제한)\n더 작은 이미지를 선택해주세요.");
                e.target.value = ''; // Reset input
                setFile(null);
                return;
            }
            setFile(selectedFile);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Pass to parent
            const savedPrompt = await onSave({ ...formData }, file, prompt?.id);

            if (currentMode === 'create') {
                // Continuous Flow: Add to ID-less session history or use returned object
                // We assume parent returns the saved object. If not, use formData.
                const historyItem = savedPrompt || { ...formData, created_at: new Date().toISOString() };
                setSessionHistory(prev => [...prev, historyItem]);

                // Clear form for next input
                setFormData({
                    title: '',
                    content: '',
                    expected_answer: '',
                    difficulty: 'beginner',
                    attachment_url: null
                });
                setFile(null);
                // Do NOT close.
                alert("저장되었습니다. 다음 내용을 계속 작성할 수 있습니다.");
            } else {
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
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
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

                <div style={{ flex: 1, overflowY: 'auto' }}>
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
                                {prompt.expected_answer}
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
                </div>
            </div>
        );
    }

    // --- EDIT / CREATE MODE ---
    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                    {currentMode === 'create' ? '새 프롬프트 추가' : '프롬프트 수정'}
                </h2>
                <button
                    onClick={() => {
                        if (currentMode === 'create') onClose();
                        else setCurrentMode('view');
                    }}
                    style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '1.2rem', color: '#94a3b8' }}
                >
                    ✖
                </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', flex: 1, overflowY: 'auto', paddingRight: '0.5rem' }}>

                {/* Session History Cards */}
                {currentMode === 'create' && sessionHistory.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1rem', borderBottom: '2px dashed #e2e8f0', paddingBottom: '1rem' }}>
                        <h4 style={{ color: '#94a3b8', fontSize: '0.9rem', fontWeight: 600 }}>🌟 방금 작성한 프롬프트</h4>
                        {sessionHistory.map((historyItem, idx) => (
                            <div key={idx} style={{ background: '#f8fafc', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1' }}>
                                <div style={{ fontWeight: 600, color: '#334155', marginBottom: '0.5rem' }}>{historyItem.title}</div>
                                <div style={{ fontSize: '0.9rem', color: '#64748b', whiteSpace: 'pre-wrap', maxHeight: '100px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {historyItem.content}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#334155' }}>제목</label>
                    <input
                        type="text"
                        value={formData.title}
                        onChange={e => setFormData({ ...formData, title: e.target.value })}
                        style={{ width: '100%', padding: '0.8rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem', fontSize: '1rem' }}
                        required
                    />
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                    <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#334155' }}>난이도</label>
                        <select
                            value={formData.difficulty}
                            onChange={e => setFormData({ ...formData, difficulty: e.target.value })}
                            style={{ width: '100%', padding: '0.8rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem' }}
                        >
                            <option value="beginner">초급</option>
                            <option value="intermediate">중급</option>
                            <option value="advanced">고급</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#334155' }}>프롬프트 내용</label>
                    <textarea
                        value={formData.content}
                        onChange={e => setFormData({ ...formData, content: e.target.value })}
                        style={{ width: '100%', padding: '0.8rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem', minHeight: '200px', fontSize: '0.95rem', fontFamily: 'monospace' }}
                        required
                    />
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#334155' }}>예상 답변 (선택)</label>
                    <textarea
                        value={formData.expected_answer}
                        onChange={e => setFormData({ ...formData, expected_answer: e.target.value })}
                        style={{ width: '100%', padding: '0.8rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem', minHeight: '100px' }}
                    />
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#334155' }}>첨부 파일 (선택)</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <input
                            type="file"
                            onChange={handleFileChange}
                            style={{ width: '100%', padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem' }}
                        />
                    </div>
                    {formData.attachment_url && !file && (
                        <div style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: '#2563eb' }}>
                            <a href={formData.attachment_url} target="_blank" rel="noopener noreferrer">기존 파일 확인</a>
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: 'auto', paddingTop: '1rem' }}>
                    <button
                        type="button"
                        onClick={() => currentMode === 'create' ? onClose() : setCurrentMode('view')}
                        style={{ padding: '0.8rem 1.5rem', border: '1px solid #e2e8f0', background: 'white', borderRadius: '0.5rem', cursor: 'pointer' }}
                    >
                        취소
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        style={{ padding: '0.8rem 1.5rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                        {loading ? '저장 중...' : <span>💾 저장하기</span>}
                    </button>
                </div>
            </form>
        </div>
    );
}
