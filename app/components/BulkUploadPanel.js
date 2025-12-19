'use client';

import { useState } from 'react';
import { generatePromptsAction } from '@/app/actions/ai';

export default function BulkUploadPanel({ targetId, currentDifficulty, onSuccess, onClose }) {
    const [bulkJson, setBulkJson] = useState('');
    const [activeBulkTab, setActiveBulkTab] = useState('json'); // 'json' | 'ai'
    // Removed apiKey, added difficulty to local state (defaulting to prop)
    const [aiParams, setAiParams] = useState({ topic: '', model: 'gemini', count: 3, difficulty: currentDifficulty || 'beginner' });
    const [isGenerating, setIsGenerating] = useState(false);

    const handleBulkSubmit = async () => {
        if (!bulkJson.trim()) return alert('JSON 데이터를 입력해주세요.');
        try {
            const parsed = JSON.parse(bulkJson);
            onSuccess(parsed);
            setBulkJson('');
        } catch (e) {
            alert('등록 실패: ' + e.message + '\n\n올바른 JSON 형식인지 확인해주세요.');
        }
    };

    const handleAiGenerate = async () => {
        if (!aiParams.topic) return alert('주제를 입력해주세요.');
        setIsGenerating(true);
        try {
            // Updated action call signature
            const result = await generatePromptsAction({
                topic: aiParams.topic,
                model: aiParams.model,
                count: aiParams.count,
                difficulty: aiParams.difficulty, // Use local override
                targetGroup: targetId
            });

            if (!result.success) throw new Error(result.error);

            setBulkJson(JSON.stringify(result.data, null, 2));
            setActiveBulkTab('json');
            alert('생성 완료! 내용을 확인하고 등록 버튼을 눌러주세요.');
        } catch (e) {
            alert(e.message);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                    📂 프롬프트 대량 등록
                </h2>
                <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '1.2rem', color: '#94a3b8' }}>✖</button>
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
                    <span>✨</span> AI 자동 생성
                </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
                {activeBulkTab === 'json' ? (
                    <>
                        <div style={{ marginBottom: '1.5rem' }}>
                            <p style={{ marginBottom: '0.5rem', fontWeight: 500, color: '#334155' }}>작성 가이드</p>
                            <div style={{ background: '#f1f5f9', padding: '1rem', borderRadius: '0.5rem', fontSize: '0.85rem', color: '#475569' }}>
                                <p style={{ marginBottom: '0.5rem' }}>아래와 같은 JSON 배열 형식으로 입력해주세요. <br />(난이도를 생략하면 선택한 난이도로 자동 설정됩니다.)</p>
                                <pre style={{ background: '#1e293b', color: '#f8fafc', padding: '0.75rem', borderRadius: '4px', overflowX: 'auto', fontFamily: 'monospace' }}>
                                    {`[
  {
    "title": "예제",
    "content": "내용...",
    "difficulty": "beginner"
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
                                style={{ width: '100%', padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem', minHeight: '300px', fontFamily: 'monospace', fontSize: '0.9rem' }}
                            />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                            <button onClick={onClose} className="btn" style={{ border: '1px solid #e2e8f0', background: 'white', padding: '0.75rem 1.25rem', borderRadius: '0.5rem' }}>취소</button>
                            <button onClick={handleBulkSubmit} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#2563eb', color: 'white', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '0.5rem', cursor: 'pointer' }}>
                                <span>📄</span> 일괄 등록하기
                            </button>
                        </div>
                    </>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div style={{ background: '#f5f3ff', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #ddd6fe' }}>
                            <h4 style={{ color: '#5b21b6', fontWeight: 600, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span>🤖</span> AI 프롬프트 생성기
                            </h4>
                            <p style={{ fontSize: '0.9rem', color: '#4c1d95' }}>
                                주제 입력 -&gt; AI 생성 -&gt; JSON 자동 변환
                            </p>
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>주제 (Topic)</label>
                            <input
                                type="text"
                                placeholder="예: 신입 사원 온보딩 메일 작성"
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
                                    <option value="gemini">Google Gemini 1.5 Flash</option>
                                    <option value="gpt">OpenAI GPT-4o</option>
                                </select>
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>난이도</label>
                                <select
                                    value={aiParams.difficulty}
                                    onChange={(e) => setAiParams({ ...aiParams, difficulty: e.target.value })}
                                    style={{ width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem' }}
                                >
                                    <option value="beginner">초급</option>
                                    <option value="intermediate">중급</option>
                                    <option value="advanced">고급</option>
                                </select>
                            </div>
                            <div style={{ width: '80px' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>개수</label>
                                <input
                                    type="number"
                                    min="1" max="10"
                                    value={aiParams.count}
                                    onChange={(e) => setAiParams({ ...aiParams, count: parseInt(e.target.value) || 1 })}
                                    style={{ width: '100%', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem' }}
                                />
                            </div>
                        </div>

                        {/* API Key Input Removed */}

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
                            <button onClick={onClose} className="btn" style={{ border: '1px solid #e2e8f0', background: 'white', padding: '0.75rem 1.25rem', borderRadius: '0.5rem' }}>취소</button>
                            <button
                                onClick={handleAiGenerate}
                                disabled={isGenerating}
                                className="btn"
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                                    background: isGenerating ? '#94a3b8' : '#7c3aed',
                                    color: 'white',
                                    border: 'none',
                                    padding: '0.75rem 1.5rem',
                                    borderRadius: '0.5rem',
                                    cursor: isGenerating ? 'not-allowed' : 'pointer'
                                }}
                            >
                                {isGenerating ? (
                                    <>⏳ 생성 중...</>
                                ) : (
                                    <><span>✨</span> 생성하기</>
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div >
    );
}
