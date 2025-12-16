'use client';

import { useState } from 'react';
import { generatePromptsAction } from '@/app/actions/ai';
import { X, Sparkles, Loader2, Save, RefreshCw, Bot, CheckCircle, Circle } from 'lucide-react';

export default function AIGenerateModal({ isOpen, onClose, targetId, currentDifficulty, onSuccess }) {
    const [topic, setTopic] = useState('');
    const [model, setModel] = useState('gpt'); // 'gpt' or 'gemini'
    const [count, setCount] = useState(3);
    const [difficulty, setDifficulty] = useState(currentDifficulty || 'beginner'); // Add state
    const [loading, setLoading] = useState(false);
    const [generatedPrompts, setGeneratedPrompts] = useState([]);
    const [error, setError] = useState('');
    const [selectedIndices, setSelectedIndices] = useState([]);

    if (!isOpen) return null;

    const handleGenerate = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setGeneratedPrompts([]);
        setSelectedIndices([]);

        try {
            const result = await generatePromptsAction({
                model,
                topic,
                count: parseInt(count),
                difficulty, // Use selected difficulty
                targetGroup: targetId
            });

            if (result && result.error) {
                if (result.error.includes("401") || result.error.includes("Key")) {
                    throw new Error("API 키 오류: Vercel 환경 변수 설정을 확인해주세요.");
                }
                throw new Error(result.error);
            }

            if (result && Array.isArray(result)) {
                setGeneratedPrompts(result);
                // Default: Select all for convenience
                setSelectedIndices(result.map((_, i) => i));
            } else {
                throw new Error("AI가 유효한 응답을 주지 않았습니다.");
            }
        } catch (err) {
            setError(err.message);
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

    const handleSave = async () => {
        if (selectedIndices.length === 0) {
            alert("저장할 프롬프트를 최소 1개 이상 선택해주세요.");
            return;
        }

        setLoading(true); // Show loading state on button
        try {
            const promptsToSave = generatedPrompts.filter((_, i) => selectedIndices.includes(i));
            await onSuccess(promptsToSave); // Wait for parent to save & refresh
            // Reset state after save
            setGeneratedPrompts([]);
            setTopic('');
            onClose(); // Close only after success
        } catch (e) {
            console.error(e);
            alert("저장 중 오류가 발생했습니다.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="mobile-overlay" style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 60
        }}>
            <div style={{
                background: 'white',
                padding: '2rem',
                borderRadius: '1rem',
                width: '100%',
                maxWidth: '700px',
                maxHeight: '90vh',
                overflowY: 'auto',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
            }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                    <div>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#7c3aed' }}>
                            <Sparkles size={24} /> AI 프롬프트 자동 생성 (v2)
                        </h2>
                        <p style={{ color: '#64748b' }}>
                            주제만 입력하면 AI가 교육용 프롬프트를 자동으로 설계해드립니다.
                        </p>
                    </div>
                    <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '0.5rem' }}>
                        <X size={24} />
                    </button>
                </div>

                {generatedPrompts.length === 0 ? (
                    /* INPUT FORM */
                    <form onSubmit={handleGenerate} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#1e293b' }}>
                                주제 (Topic)
                            </label>
                            <input
                                type="text"
                                value={topic}
                                onChange={e => setTopic(e.target.value)}
                                placeholder="예: 신입사원 이메일 예절, 엑셀 기초 함수, 학부모 상담 시나리오..."
                                style={{ width: '100%', padding: '1rem', border: '1px solid #cbd5e1', borderRadius: '0.5rem', fontSize: '1rem' }}
                                required
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#1e293b' }}>
                                    사용할 AI 모델
                                </label>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button
                                        type="button"
                                        onClick={() => setModel('gpt')}
                                        style={{
                                            flex: 1, padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid',
                                            borderColor: model === 'gpt' ? '#10a37f' : '#e2e8f0',
                                            background: model === 'gpt' ? '#f0fdf9' : 'white',
                                            color: model === 'gpt' ? '#115e59' : '#64748b',
                                            fontWeight: model === 'gpt' ? 600 : 400,
                                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
                                        }}
                                    >
                                        <Bot size={18} /> GPT-4o
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setModel('gemini')}
                                        style={{
                                            flex: 1, padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid',
                                            borderColor: model === 'gemini' ? '#2563eb' : '#e2e8f0',
                                            background: model === 'gemini' ? '#eff6ff' : 'white',
                                            color: model === 'gemini' ? '#1e40af' : '#64748b',
                                            fontWeight: model === 'gemini' ? 600 : 400,
                                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
                                        }}
                                    >
                                        <Sparkles size={18} /> Gemini
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#1e293b' }}>
                                    생성 개수
                                </label>
                                <select
                                    value={count}
                                    onChange={e => setCount(e.target.value)}
                                    style={{ width: '100%', padding: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '0.5rem', background: 'white' }}
                                >
                                    <option value="1">1개</option>
                                    <option value="3">3개</option>
                                    <option value="5">5개</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#1e293b' }}>
                                난이도 (Difficulty)
                            </label>
                            <select
                                value={difficulty}
                                onChange={e => setDifficulty(e.target.value)}
                                style={{ width: '100%', padding: '1rem', border: '1px solid #cbd5e1', borderRadius: '0.5rem', background: 'white', fontSize: '1rem' }}
                            >
                                <option value="beginner">초급 (Beginner)</option>
                                <option value="intermediate">중급 (Intermediate)</option>
                                <option value="advanced">고급 (Advanced)</option>
                            </select>
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
                                {loading ? <><Loader2 className="spin" size={20} /> 전문가 모드로 생성 중...</> : <><Sparkles size={20} /> 교육 과정 설계하기</>}
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
                                <RefreshCw size={14} /> 다시 만들기
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
                                            {isSelected ? <CheckCircle size={24} fill="white" /> : <Circle size={24} />}
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
                                {loading ? <><Loader2 className="spin" size={18} /> 저장 중...</> : <><Save size={18} /> {selectedIndices.length}개 선택 항목 저장하기</>}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
