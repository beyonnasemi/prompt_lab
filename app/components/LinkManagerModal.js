'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X, Plus, Pencil, Trash2, Save, GripVertical, Globe, Link2,
  Loader2,
} from 'lucide-react';
import {
  getLinksAction,
  saveLinkAction,
  deleteLinkAction,
} from '@/app/actions/linkActions';
import { cn } from '@/lib/utils';

export default function LinkManagerModal({ isOpen, onClose, onUpdate }) {
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dropTargetIndex, setDropTargetIndex] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ title: '', url: '', sort_order: 0 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (isOpen) fetchLinks();
  }, [isOpen]);

  const fetchLinks = async () => {
    setLoading(true);
    const data = await getLinksAction();
    setLinks(data || []);
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
    if (!confirm('이 링크를 삭제하시겠습니까?')) return;
    await deleteLinkAction(id);
    fetchLinks();
    onUpdate?.();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { ...formData };
    if (editingId) payload.id = editingId;
    const result = await saveLinkAction(payload);
    if (result?.error) {
      alert('오류 발생: ' + result.error);
    } else {
      handleCancelEdit();
      fetchLinks();
      onUpdate?.();
    }
  };

  // ------ Drag & drop ------
  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    // A little opacity on the drag source
    e.currentTarget.style.opacity = '0.5';
  };

  const handleDragEnd = (e) => {
    e.currentTarget.style.opacity = '1';
    setDraggedIndex(null);
    setDropTargetIndex(null);
  };

  const handleDragEnter = (index) => {
    if (draggedIndex === null || draggedIndex === index) return;
    setDropTargetIndex(index);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e, dropIndex) => {
    e.preventDefault();
    setDropTargetIndex(null);
    if (draggedIndex === null || draggedIndex === dropIndex) return;

    const next = [...links];
    const [moved] = next.splice(draggedIndex, 1);
    next.splice(dropIndex, 0, moved);
    const updated = next.map((l, i) => ({ ...l, sort_order: i + 1 }));
    setLinks(updated);
    setLoading(true);
    await Promise.all(updated.map((l) => saveLinkAction(l)));
    setLoading(false);
    onUpdate?.();
    setDraggedIndex(null);
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
      >
        {/* Decorative gradient */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-gradient-to-br from-brand-500/20 via-violet-500/15 to-accent-400/10 blur-3xl"
        />

        {/* Header */}
        <div className="relative flex items-center justify-between border-b border-border px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-violet-500 text-white shadow-sm">
              <Link2 size={18} />
            </div>
            <div>
              <h2 className="font-display text-xl tracking-tight text-foreground">
                Useful Links 관리
              </h2>
              <p className="text-xs text-muted-foreground">
                사이드바에 표시되는 외부 링크를 관리합니다.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <X size={16} />
          </button>
        </div>

        <div className="relative flex-1 overflow-y-auto px-6 py-5">
          {/* Form */}
          <form
            onSubmit={handleSubmit}
            className="mb-6 rounded-2xl border border-border bg-muted/30 p-4"
          >
            <div className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {editingId ? (
                <>
                  <Pencil size={11} /> 링크 수정
                </>
              ) : (
                <>
                  <Plus size={11} /> 새 링크 추가
                </>
              )}
            </div>
            <div className="flex flex-col gap-3">
              <input
                type="text"
                required
                placeholder="표시 이름 (예: ChatGPT)"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
              />
              <input
                type="url"
                required
                placeholder="https://..."
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
              />
              <div className="flex justify-end gap-2">
                {editingId && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
                  >
                    취소
                  </button>
                )}
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-brand-600 to-violet-500 px-3 py-1.5 text-xs font-bold text-white shadow-sm"
                >
                  <Save size={12} /> {editingId ? '수정 저장' : '추가하기'}
                </button>
              </div>
            </div>
          </form>

          {/* List */}
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              현재 링크 ({links.length})
            </span>
            {loading && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Loader2 size={12} className="animate-spin" /> 동기화 중...
              </span>
            )}
          </div>

          {links.length === 0 && !loading ? (
            <div className="rounded-xl border border-dashed border-border bg-muted/30 py-10 text-center text-sm text-muted-foreground">
              등록된 링크가 없습니다.
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {links.map((link, index) => {
                const isDropTarget =
                  draggedIndex !== null &&
                  draggedIndex !== index &&
                  dropTargetIndex === index;
                const faviconSrc =
                  link.icon_key && link.icon_key.startsWith('http')
                    ? link.icon_key
                    : `https://www.google.com/s2/favicons?domain=${encodeURIComponent(
                        link.url,
                      )}&sz=64`;
                return (
                  <li
                    key={link.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragEnd={handleDragEnd}
                    onDragOver={handleDragOver}
                    onDragEnter={() => handleDragEnter(index)}
                    onDrop={(e) => handleDrop(e, index)}
                    className={cn(
                      'group flex items-center gap-3 rounded-xl border bg-card p-3 shadow-sm transition',
                      isDropTarget
                        ? 'border-t-[3px] border-t-brand-500'
                        : 'border-border hover:border-brand-400',
                      draggedIndex === index && 'cursor-grabbing',
                    )}
                  >
                    <span
                      className="cursor-grab text-muted-foreground transition hover:text-foreground active:cursor-grabbing"
                      title="드래그로 순서 변경"
                    >
                      <GripVertical size={15} />
                    </span>

                    <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted">
                      {!link.icon_key ||
                      link.icon_key === 'default' ||
                      link.icon_key === 'auto' ||
                      link.icon_key.startsWith('http') ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={faviconSrc}
                          alt=""
                          className="h-full w-full object-contain"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                        <Globe size={14} className="text-muted-foreground" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-foreground">
                        {link.title}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        {link.url}
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        onClick={() => handleEdit(link)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-brand-600"
                        title="수정"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => handleDelete(link.id)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                        title="삭제"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
