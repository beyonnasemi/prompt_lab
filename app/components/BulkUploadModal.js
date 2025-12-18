'use client';

// ... (imports)
import { useState } from 'react';
import { generatePromptsAction } from '@/app/actions/ai';

export default function BulkUploadModal({ isOpen, onClose, targetId, currentDifficulty, onSuccess }) {
    const [bulkJson, setBulkJson] = useState('');
    const [activeBulkTab, setActiveBulkTab] = useState('json'); // 'json' | 'ai'
    const [aiParams, setAiParams] = useState({ topic: '', model: 'gemini', count: 3, apiKey: '' });
    const [isGenerating, setIsGenerating] = useState(false);

    if (!isOpen) return null;

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
            const result = await generatePromptsAction({
                ...aiParams,
                difficulty: currentDifficulty,
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

    return (
        <div className="mobile-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60 }}>
            <div style={{ background: 'white', padding: '2rem', borderRadius: '0.5rem', width: '100%', maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                        📂 프롬프트 대량 등록
                    </h2>
                    <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer' }}><span>✖</span></button>
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

                {activeBulkTab === 'json' ? (
                    <>
                        <div style={{ marginBottom: '1.5rem' }}>
                            <p style={{ marginBottom: '0.5rem', fontWeight: 500, color: '#334155' }}>작성 가이드</p>
                            <div style={{ background: '#f1f5f9', padding: '1rem', borderRadius: '0.5rem', fontSize: '0.9rem', color: '#475569' }}>
                                <p style={{ marginBottom: '0.5rem' }}>아래와 같은 JSON 배열 형식으로 입력해주세요. <br />(난이도를 생략하면 현재 페이지의 난이도({currentDifficulty})로 자동 설정됩니다.)</p>
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
                            <button onClick={onClose} className="btn" style={{ border: '1px solid #e2e8f0' }}>취소</button>
                            <button onClick={handleBulkSubmit} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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
                                <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>🔑</span>
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
                            <button onClick={onClose} className="btn" style={{ border: '1px solid #e2e8f0' }}>취소</button>
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
                                    <><span>✨</span> 생성하기</>
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
