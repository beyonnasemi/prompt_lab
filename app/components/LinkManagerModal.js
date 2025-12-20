'use client';

import { useState, useEffect } from 'react';
import { getLinksAction, saveLinkAction, deleteLinkAction } from '@/app/actions/linkActions';
import Image from 'next/image';

export default function LinkManagerModal({ isOpen, onClose, onUpdate }) {
    const [links, setLinks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [draggedItemIndex, setDraggedItemIndex] = useState(null);
    const [dropTargetIndex, setDropTargetIndex] = useState(null);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({ title: '', url: '', sort_order: 0 });

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
        setFormData({ title: link.title, url: link.url, sort_order: link.sort_order });
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setFormData({ title: '', url: '', sort_order: links.length + 1 });
    };

    const handleDelete = async (id) => {
        if (!confirm('삭제하시겠습니까?')) return;
        await deleteLinkAction(id);
        fetchLinks();
        onUpdate();
    };

    // --- DnD Handlers ---
    const handleDragStart = (e, index) => {
        setDraggedItemIndex(index);
        e.dataTransfer.effectAllowed = "move";
        e.target.style.opacity = '0.5';
    };

    const handleDragEnd = (e) => {
        e.target.style.opacity = '1';
        setDraggedItemIndex(null);
        setDropTargetIndex(null);
    };

    const handleDragEnter = (e, index) => {
        if (draggedItemIndex === index) return;
        setDropTargetIndex(index);
    };

    const handleDragOver = (e) => {
        e.preventDefault(); // Necessary to allow dropping
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = async (e, dropIndex) => {
        e.preventDefault();
        setDropTargetIndex(null); // Clear indicator
        if (draggedItemIndex === null || draggedItemIndex === dropIndex) return;

        const newLinks = [...links];
        const [draggedItem] = newLinks.splice(draggedItemIndex, 1);
        newLinks.splice(dropIndex, 0, draggedItem);

        const updatedLinks = newLinks.map((link, idx) => ({
            ...link,
            sort_order: idx + 1
        }));

        setLinks(updatedLinks);
        setLoading(true);
        await Promise.all(updatedLinks.map(l => saveLinkAction(l)));
        setLoading(false);
        onUpdate();
        setDraggedItemIndex(null);
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
                    <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '1.2rem' }}>✖</button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} style={{ background: '#f8fafc', padding: '1rem', borderRadius: '0.5rem', marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem' }}>제목</label>
                            <input
                                required
                                value={formData.title}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                                style={{ width: '100%', padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '0.25rem' }}
                            />
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
                        {editingId && <button type="button" onClick={handleCancelEdit} className="btn" style={{ background: 'none', border: '1px solid #e2e8f0' }}>취소</button>}
                        <button type="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <span>💾</span> {editingId ? '수정 저장' : '추가하기'}
                        </button>
                    </div>
                </form>

                {/* List with DnD */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {loading && links.length === 0 ? <div>로딩 중...</div> : links.map((link, index) => (
                        <div
                            key={link.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, index)}
                            onDragEnd={handleDragEnd}
                            onDragOver={handleDragOver}
                            onDragEnter={(e) => handleDragEnter(e, index)}
                            onDrop={(e) => handleDrop(e, index)}
                            style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                padding: '0.75rem',
                                border: '1px solid #e2e8f0',
                                borderTop: (draggedItemIndex !== null && draggedItemIndex !== index && dropTargetIndex === index)
                                    ? '3px solid #3b82f6' // Visual Line Indicator
                                    : '1px solid #e2e8f0',
                                borderRadius: '0.5rem', background: 'white',
                                cursor: 'grab',
                                opacity: draggedItemIndex === index ? 0.5 : 1,
                                transition: 'border-top 0.1s'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', paddingRight: '0.5rem', cursor: 'grab' }}>
                                    <span style={{ color: '#94a3b8', fontSize: '1.5rem', lineHeight: '1' }}>⋮⋮</span>
                                </div>
                                <div style={{ width: 24, height: 24, background: '#f1f5f9', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {(!link.icon_key || link.icon_key === 'default' || link.icon_key === 'auto') ? <span>🌐</span> :
                                        <div style={{ width: '100%', height: '100%', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <span>🌐</span>
                                        </div>}
                                </div>
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{link.title}</div>
                                    <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{link.url}</div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button onClick={() => handleEdit(link)} style={{ padding: '0.25rem', color: '#64748b', border: 'none', background: 'none', cursor: 'pointer' }}>✏️</button>
                                <button onClick={() => handleDelete(link.id)} style={{ padding: '0.25rem', color: '#ef4444', border: 'none', background: 'none', cursor: 'pointer' }}>🗑️</button>
                            </div>
                        </div>

                    ))
                    }
                    {
                        links.length === 0 && !loading && (
                            <div style={{ textAlign: 'center', color: '#94a3b8', padding: '1rem' }}>등록된 링크가 없습니다.</div>
                        )
                    }
                </div >
            </div >
        </div >
    );
}
