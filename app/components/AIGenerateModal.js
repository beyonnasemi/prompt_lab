'use client';

import { useState } from 'react';
import { generatePromptsAction } from '@/app/actions/ai';

export default function AIGenerateModal({ isOpen, onClose, targetId, currentDifficulty, onSuccess }) {
    const [topic, setTopic] = useState('');
    const [image, setImage] = useState(null);
    const [loading, setLoading] = useState(false);
    const [generatedPrompts, setGeneratedPrompts] = useState([]);
    const [selectedIndices, setSelectedIndices] = useState([]);
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImage(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleGenerate = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setGeneratedPrompts([]);

        try {
            const result = await generatePromptsAction(targetId, currentDifficulty, topic, image);
            if (!result.success) throw new Error(result.error);
            setGeneratedPrompts(result.data);
            setSelectedIndices(result.data.map((_, i) => i)); // Select all by default
        } catch (err) {
            setError(err.message || "생성 실패. 다시 시도해주세요.");
        } finally {
            setLoading(false);
        }
    };

    const toggleSelection = (index) => {
        if (selectedIndices.includes(index)) {
            setSelectedIndices(selectedIndices.filter(i => i !== index));
        } else {
            setSelectedIndices([...selectedIndices, index]);
        }
    };

    const handleSave = () => {
        const promptsToSave = selectedIndices.map(i => generatedPrompts[i]);
        onSuccess(promptsToSave);
        onClose();
        setTopic('');
        setImage(null);
        setGeneratedPrompts([]);
    };

    return (
        <div className="mobile-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
            <div style={{ background: 'white', padding: '2rem', borderRadius: '1rem', width: '90%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                    <div>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem', background: 'linear-gradient(to right, #7c3aed, #4f46e5)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                            AI 자동 생성
                        </h2>
                        <p style={{ color: '#64748b' }}>주제만 입력하면 AI가 교육용 프롬프트를 자동으로 설계해줍니다.</p>
                    </div>
                    <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '0.5rem' }}><span>✖</span></button>
                </div>

                {generatedPrompts.length === 0 ? (
                    <form onSubmit={handleGenerate} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#334155' }}>학습 주제 / 상황</label>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <input
                                    type="text"
                                    value={topic}
                                    onChange={e => setTopic(e.target.value)}
                                    placeholder="예: 초등학생 대상 환경 보호 캠페인 기획, 회사원 비즈니스 이메일 작성법"
                                    style={{ flex: 1, padding: '1rem', border: '1px solid #cbd5e1', borderRadius: '0.5rem', fontSize: '1rem' }}
                                    required
                                />
                                <label
                                    htmlFor="image-upload"
                                    style={{
                                        cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                                        padding: '0.75rem 1rem',
                                        background: 'white', border: '1px solid #cbd5e1', borderRadius: '0.5rem',
                                        color: '#475569', fontSize: '0.9rem'
                                    }}
                                >
                                    <span>📷</span> 이미지 업로드
                                </label>
                                <input
                                    id="image-upload"
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageChange}
                                    style={{ display: 'none' }}
                                />
                                <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                                    {image ? "이미지 선택됨" : "선택된 파일 없음"}
                                </span>
                            </div>
                        </div>

                        {error && (
                            <div style={{ padding: '1rem', background: '#fef2f2', color: '#b91c1c', borderRadius: '0.5rem', fontSize: '0.9rem' }}>
                                ⚠️ {error}
                            </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <button
                                type="submit"
                                disabled={loading}
                                className="btn btn-primary"
                                style={{
                                    padding: '1rem 2rem',
                                    fontSize: '1.1rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    background: loading ? '#94a3b8' : 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
                                    border: 'none',
                                    boxShadow: '0 4px 6px -1px rgba(124, 58, 237, 0.3)'
                                }}
                            >
                                {loading ? <><span>⏳</span> 전문가 모드로 생성 중...</> : <><span>✨</span> 교육 과정 설계하기</>}
                            </button>
                        </div>
                    </form>
                ) : (
                    /* PREVIEW RESULT */
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#1e293b' }}>
                                ✨ {generatedPrompts.length}개의 교육용 프롬프트가 준비되었습니다.
                            </h3>
                            <button
                                onClick={() => setGeneratedPrompts([])}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '0.4rem',
                                    padding: '0.5rem 0.75rem', fontSize: '0.9rem',
                                    background: 'white', border: '1px solid #e2e8f0', borderRadius: '0.5rem',
                                    color: '#64748b', cursor: 'pointer'
                                }}
                            >
                                <span>🔄</span> 다시 만들기
                            </button>
                        </div>

                        <div style={{ maxHeight: '50vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', paddingRight: '0.5rem' }}>
                            {generatedPrompts.map((item, idx) => {
                                const isSelected = selectedIndices.includes(idx);
                                return (
                                    <div
                                        key={idx}
                                        onClick={() => toggleSelection(idx)}
                                        style={{
                                            background: isSelected ? '#f5f3ff' : '#f8fafc',
                                            border: isSelected ? '2px solid #7c3aed' : '1px solid #e2e8f0',
                                            borderRadius: '0.75rem',
                                            padding: '1.25rem',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            position: 'relative'
                                        }}
                                    >
                                        <div style={{ position: 'absolute', top: '1rem', right: '1rem', color: isSelected ? '#7c3aed' : '#cbd5e1' }}>
                                            {isSelected ? <span>✅</span> : <span>⚪</span>}
                                        </div>

                                        <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.5rem', color: '#334155', paddingRight: '2rem' }}>
                                            {idx + 1}. {item.title}
                                        </h4>
                                        <div style={{
                                            background: 'white', padding: '0.75rem', borderRadius: '0.5rem',
                                            fontSize: '0.9rem', color: '#475569',
                                            border: '1px dashed #cbd5e1', marginBottom: '0.75rem'
                                        }}>
                                            {item.content}
                                        </div>
                                        <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                                            <strong>예상 답변:</strong> {item.expected_answer?.substring(0, 100)}...
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', borderTop: '1px solid #e2e8f0', paddingTop: '1.5rem' }}>
                            <button
                                onClick={() => setGeneratedPrompts([])}
                                className="btn"
                                style={{ background: 'white', border: '1px solid #cbd5e1', color: '#64748b' }}
                            >
                                취소
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={loading || selectedIndices.length === 0}
                                className="btn btn-primary"
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                                    background: loading ? '#94a3b8' : '#16a34a', border: 'none',
                                    boxShadow: '0 4px 6px -1px rgba(22, 163, 74, 0.3)',
                                    opacity: (loading || selectedIndices.length === 0) ? 0.5 : 1,
                                    cursor: (loading || selectedIndices.length === 0) ? 'not-allowed' : 'pointer'
                                }}
                            >
                                {loading ? <><span>⏳</span> 저장 중...</> : <><span>💾</span> {selectedIndices.length}개 선택 항목 저장하기</>}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div >
    );
}
