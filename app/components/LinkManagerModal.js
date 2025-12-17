'use client';

import { useState, useEffect } from 'react';
import { X, Save, Trash2, Plus, GripVertical, Globe } from 'lucide-react';
import { getLinksAction, saveLinkAction, deleteLinkAction } from '@/app/actions/linkActions';
import Image from 'next/image';

const ICON_OPTIONS = [
    { key: 'auto', label: '자동 (사이트 파비콘)' },
    { key: 'default', label: '기본 (Globe)' },
    { key: 'chatgpt', label: 'ChatGPT' },
    { key: 'gemini', label: 'Gemini' },
    { key: 'claude', label: 'Claude/Anthropic' },
    { key: 'perplexity', label: 'Perplexity' },
    { key: 'aistudio', label: 'AI Studio' },
    { key: 'antigravity', label: 'Antigravity' },
];

export default function LinkManagerModal({ isOpen, onClose, onUpdate }) {
    const [links, setLinks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({ title: '', url: '', icon_key: 'auto', sort_order: 0 });

    useEffect(() => {
        if (isOpen) {
            fetchLinks();
        }
    }, [isOpen]);

    const fetchLinks = async () => {
        setLoading(true);
        const data = await getLinksAction();
        setLinks(data);
        setLoading(false);
    };

    const handleEdit = (link) => {
        setEditingId(link.id);
        setFormData({ title: link.title, url: link.url, icon_key: link.icon_key, sort_order: link.sort_order });
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setFormData({ title: '', url: '', icon_key: 'auto', sort_order: links.length + 1 });
    };

    const handleDelete = async (id) => {
        if (!confirm('삭제하시겠습니까?')) return;
        await deleteLinkAction(id);
        fetchLinks();
        onUpdate(); // Refresh parent
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const payload = { ...formData };
        if (editingId) payload.id = editingId;

        const result = await saveLinkAction(payload);
        if (result.error) {
            alert('오류 발생: ' + result.error);
        } else {
            handleCancelEdit();
            fetchLinks();
            onUpdate();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="mobile-overlay" style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100
        }}>
            <div style={{
                background: 'white', padding: '2rem', borderRadius: '0.5rem',
                width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>유용한 링크 관리</h2>
                    <button onClick={onClose}><X size={24} /></button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} style={{ background: '#f8fafc', padding: '1rem', borderRadius: '0.5rem', marginBottom: '2rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem' }}>제목</label>
                            <input
                                required
                                value={formData.title}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                                style={{ width: '100%', padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '0.25rem' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem' }}>아이콘</label>
                            <select
                                value={formData.icon_key}
                                onChange={e => setFormData({ ...formData, icon_key: e.target.value })}
                                style={{ width: '100%', padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '0.25rem' }}
                            >
                                {ICON_OPTIONS.map(opt => (
                                    <option key={opt.key} value={opt.key}>{opt.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem' }}>URL</label>
                        <input
                            required
                            type="url"
                            value={formData.url}
                            onChange={e => setFormData({ ...formData, url: e.target.value })}
                            placeholder="https://..."
                            style={{ width: '100%', padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '0.25rem' }}
                        />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                        {editingId && <button type="button" onClick={handleCancelEdit} className="btn">취소</button>}
                        <button type="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Save size={16} /> {editingId ? '수정 저장' : '추가하기'}
                        </button>
                    </div>
                </form>

                {/* List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {loading ? <div>로딩 중...</div> : links.map(link => (
                        <div key={link.id} style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem', background: 'white'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <span style={{ color: '#cbd5e1' }}><GripVertical size={16} /></span>
                                <div style={{ width: 24, height: 24, background: '#f1f5f9', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {/* Icon Preview */}
                                    {link.icon_key === 'default' ? <Globe size={14} /> :
                                        <span style={{ fontSize: '0.7rem' }}>{link.icon_key[0].toUpperCase()}</span>}
                                </div>
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{link.title}</div>
                                    <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{link.url}</div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button onClick={() => handleEdit(link)} style={{ padding: '0.25rem', color: '#64748b' }}>수정</button>
                                <button onClick={() => handleDelete(link.id)} style={{ padding: '0.25rem', color: '#ef4444' }}>삭제</button>
                            </div>
                        </div>
                    ))}
                    {links.length === 0 && !loading && (
                        <div style={{ textAlign: 'center', color: '#94a3b8', padding: '1rem' }}>등록된 링크가 없습니다.</div>
                    )}
                </div>
            </div>
        </div>
    );
}
