'use client';

import { useState } from 'react';
import { X, Copy, Check, Upload, Pencil, Trash2 } from 'lucide-react';

export default function PromptDetailModal({ isOpen, onClose, prompt, isAdmin, onEdit, onDelete }) {
    const [copiedId, setCopiedId] = useState(null);

    if (!isOpen || !prompt) return null;

    const handleCopy = (text) => {
        navigator.clipboard.writeText(text);
        setCopiedId(prompt.id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    return (
        <div className="mobile-overlay" style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 70
        }} onClick={onClose}>
            <div style={{
                background: 'white',
                padding: '2rem',
                borderRadius: '0.75rem',
                width: '100%',
                maxWidth: '700px',
                maxHeight: '85vh',
                overflowY: 'auto',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                position: 'relative'
            }} onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
                    <div style={{ paddingRight: '2rem' }}>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b', lineHeight: 1.3 }}>
                            {prompt.title}
                        </h2>
                        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', fontSize: '0.9rem', color: '#64748b' }}>
                            <span>생성일: {new Date(prompt.created_at).toLocaleDateString()}</span>
                            <span>난이도: {prompt.difficulty === 'beginner' ? '초급' : prompt.difficulty === 'intermediate' ? '중급' : '고급'}</span>
                        </div>
                    </div>
                    <button onClick={onClose} style={{ padding: '0.5rem', borderRadius: '0.25rem', color: '#94a3b8' }}>
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                    {/* Prompt Box */}
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#334155' }}>📝 프롬프트</h3>
                            <button
                                onClick={() => handleCopy(prompt.content)}
                                className="btn"
                                style={{
                                    fontSize: '0.85rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.4rem',
                                    border: '1px solid #cbd5e1',
                                    padding: '0.4rem 0.8rem',
                                    color: copiedId === prompt.id ? '#16a34a' : '#475569'
                                }}
                            >
                                {copiedId === prompt.id ? <Check size={14} /> : <Copy size={14} />}
                                {copiedId === prompt.id ? '복사됨' : '복사하기'}
                            </button>
                        </div>
                        <div style={{
                            background: '#f8fafc',
                            padding: '1.5rem',
                            borderRadius: '0.5rem',
                            whiteSpace: 'pre-wrap',
                            lineHeight: '1.6',
                            color: '#334155',
                            fontFamily: 'monospace',
                            border: '1px solid #e2e8f0',
                            fontSize: '1rem'
                        }}>
                            {prompt.content}
                        </div>
                    </div>

                    {/* Expected Answer */}
                    {prompt.expected_answer && (
                        <div>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#334155', marginBottom: '0.75rem' }}>💡 예상 답변 / 결과</h3>
                            <div style={{
                                padding: '1.25rem',
                                background: '#eff6ff',
                                borderRadius: '0.5rem',
                                color: '#1e3a8a',
                                lineHeight: '1.7',
                                border: '1px solid #dbeafe',
                                whiteSpace: 'pre-wrap'
                            }}>
                                {prompt.expected_answer}
                            </div>
                        </div>
                    )}

                    {/* Attachment */}
                    {prompt.attachment_url && (
                        <div>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#334155', marginBottom: '0.75rem' }}>💾 첨부 자료</h3>
                            <a
                                href={prompt.attachment_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn"
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    padding: '0.75rem 1.25rem',
                                    background: 'white',
                                    border: '1px solid #cbd5e1',
                                    color: '#2563eb',
                                    textDecoration: 'none',
                                    borderRadius: '0.5rem',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <Upload size={18} style={{ transform: 'rotate(180deg)' }} /> 자료 다운로드
                            </a>
                        </div>
                    )}

                    {/* Admin Actions */}
                    {isAdmin && (
                        <div style={{
                            marginTop: '2rem',
                            paddingTop: '1.5rem',
                            borderTop: '1px solid #e2e8f0',
                            display: 'flex',
                            justifyContent: 'flex-end',
                            gap: '0.75rem'
                        }}>
                            <button
                                onClick={() => { onEdit(prompt); onClose(); }} // Close detail, open edit
                                style={{
                                    padding: '0.6rem 1rem',
                                    borderRadius: '0.375rem',
                                    border: '1px solid #94a3b8',
                                    background: 'white',
                                    color: '#475569',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.4rem',
                                    fontSize: '0.9rem'
                                }}
                            >
                                <Pencil size={16} /> 수정
                            </button>
                            <button
                                onClick={() => {
                                    if (confirm('정말 삭제하시겠습니까?')) {
                                        onDelete(prompt.id);
                                        onClose();
                                    }
                                }}
                                style={{
                                    padding: '0.6rem 1rem',
                                    borderRadius: '0.375rem',
                                    border: '1px solid #f87171',
                                    background: '#fef2f2',
                                    color: '#dc2626',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.4rem',
                                    fontSize: '0.9rem'
                                }}
                            >
                                <Trash2 size={16} /> 삭제
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
