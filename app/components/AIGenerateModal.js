```
'use client';

import { useState } from 'react';
import { generatePromptsAction } from '@/app/actions/ai';
import { X, Sparkles, Loader2, Save, RefreshCw, Bot, CheckCircle, Circle } from 'lucide-react';

// ... (lines 8-250)

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
        </div >
    );
}
```
