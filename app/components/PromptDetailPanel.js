'use client';

import { useState } from 'react';
import { X, Copy, Check, Upload, Pencil, Trash2, Calendar, User, AlignLeft } from 'lucide-react';

export default function PromptDetailPanel({ prompt, isAdmin, onEdit, onDelete, onClose }) {
    const [copiedId, setCopiedId] = useState(null);

    // If no prompt is selected, valid parent logic should prevent rendering, but we return null just in case
    if (!prompt) return null;

    const handleCopy = (text) => {
        navigator.clipboard.writeText(text);
        setCopiedId(prompt.id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    return (
        <div style={{
            background: 'white',
            border: '1px solid #e2e8f0',
            borderRadius: '0.75rem',
            padding: '2rem',
            marginBottom: '2rem',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            transition: 'all 0.3s ease'
        }}>
            {/* Header Area */}
            <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '1.5rem', marginBottom: '1.5rem' }}>
                {/* Navigation Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <button
                        onClick={onClose}
                        className="btn"
                        style={{
                            padding: '0.5rem 0.75rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            fontSize: '0.9rem',
                            color: '#64748b',
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0'
                        }}
                    >
                        <span>⬅️</span> 목록으로
                    </button>

                    <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '0.5rem', color: '#94a3b8' }} title="닫기">
                        <X size={24} />
                    </button>
                </div>

                {/* Title & Metadata Row */}
                <div>
                    <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b', lineHeight: 1.3, marginBottom: '0.75rem' }}>
                        {prompt.title}
                    </h2>
                    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', fontSize: '0.9rem', color: '#64748b' }}>
                        <span style={{
                            background: prompt.difficulty === 'beginner' ? '#dbeafe' : prompt.difficulty === 'intermediate' ? '#fce7f3' : '#ffedd5',
                            color: prompt.difficulty === 'beginner' ? '#1e40af' : prompt.difficulty === 'intermediate' ? '#9d174d' : '#9a3412',
                            fontSize: '0.75rem', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 600
                        }}>
                            {prompt.difficulty === 'beginner' ? '초급' : prompt.difficulty === 'intermediate' ? '중급' : '고급'}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Calendar size={14} /> {new Date(prompt.created_at).toLocaleDateString()}
                        </span>
                        {prompt.accounts?.display_name && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                <User size={14} /> {prompt.accounts.display_name}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                {/* Prompt Box */}
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            📝 프롬프트
                        </h3>
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
                                color: copiedId === prompt.id ? '#16a34a' : '#475569',
                                background: 'white'
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
                        fontSize: '1rem',
                        maxHeight: '400px',
                        overflowY: 'auto'
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
                            whiteSpace: 'pre-wrap',
                            maxHeight: '300px',
                            overflowY: 'auto'
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
                                transition: 'all 0.2s',
                                fontWeight: 500
                            }}
                        >
                            <Upload size={18} style={{ transform: 'rotate(180deg)' }} />자료 다운로드
                        </a>
                    </div>
                )}

                {/* Admin Actions */}
                {isAdmin && (
                    <div style={{
                        marginTop: '1rem',
                        paddingTop: '1.5rem',
                        borderTop: '1px solid #e2e8f0',
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: '0.75rem'
                    }}>
                        <button
                            onClick={() => { onEdit(prompt); }}
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
    );
}
