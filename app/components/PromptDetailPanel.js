'use client';

import { useState, useEffect } from 'react';
import {
  ArrowLeft, Pencil, Trash2, X, Copy, CheckCircle2, Download,
  MessageCircle, Link2, CornerDownRight, ChevronUp, ChevronDown,
  Loader2, SendHorizontal, Paperclip, FileText, AlertCircle,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { deletePromptAction } from '@/app/actions/prompt-actions';
import RichEditor from '@/app/components/RichEditor';
import HtmlView from '@/app/components/HtmlView';
import { cn } from '@/lib/utils';

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------
const DIFFICULTY_META = {
  beginner:     { label: '초급', classes: 'bg-success-500/10 text-success-600 border-success-500/30 dark:text-success-500' },
  intermediate: { label: '중급', classes: 'bg-brand-500/10 text-brand-700 border-brand-500/30 dark:text-brand-300' },
  advanced:     { label: '고급', classes: 'bg-accent-400/10 text-accent-500 border-accent-400/30' },
};

function DifficultyBadge({ value }) {
  const meta = DIFFICULTY_META[value] || DIFFICULTY_META.beginner;
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold',
        meta.classes,
      )}
    >
      {meta.label}
    </span>
  );
}

function formatDate(ts) {
  if (!ts) return '';
  try {
    return new Date(ts).toLocaleDateString('ko-KR', {
      year: 'numeric', month: '2-digit', day: '2-digit',
    });
  } catch { return ''; }
}

function cleanExpected(html) {
  if (!html) return '';
  return html.replace(/<!--THREAD-->|\[PARENT:[^\]]+\]/g, '');
}

// -----------------------------------------------------------------------------
// Main component
// -----------------------------------------------------------------------------
export default function PromptDetailPanel({
  prompt,
  mode = 'view',
  isAdmin,
  onClose,
  onSave,
  onDelete = () => {},
  isThread = false,
  initialDifficulty = 'beginner',
  enableThreadCreation = false,
}) {
  const [currentMode, setCurrentMode] = useState(mode);
  const [isCreatingThread, setIsCreatingThread] = useState(false);
  const [sessionHistory, setSessionHistory] = useState([]);
  const [formData, setFormData] = useState({
    title: (mode === 'create' || mode === 'collapsed') ? '' : (prompt?.title || ''),
    content: (mode === 'create' || mode === 'collapsed') ? '' : (prompt?.content || ''),
    expected_answer: (mode === 'create' || mode === 'collapsed') ? '' : cleanExpected(prompt?.expected_answer),
    difficulty: prompt?.difficulty || initialDifficulty,
    attachment_url: (mode === 'create' || mode === 'collapsed') ? null : (prompt?.attachment_url || null),
  });
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState(null);
  const [copied, setCopied] = useState(false);
  const [editingThreadId, setEditingThreadId] = useState(null);
  const [inlineEditingId, setInlineEditingId] = useState(null);
  const [inlineFormData, setInlineFormData] = useState({});
  const [threadItems, setThreadItems] = useState([]);
  const [triggerRefetch, setTriggerRefetch] = useState(0);

  // Reset history when mode changes away from create flow
  useEffect(() => {
    if (!['create', 'continuous', 'collapsed'].includes(currentMode)) {
      setSessionHistory([]);
      setIsCreatingThread(false);
    }
  }, [currentMode]);

  // Clear form when entering continuous mode
  useEffect(() => {
    if (currentMode === 'continuous') {
      setFormData({
        title: '',
        content: '',
        expected_answer: '',
        difficulty: initialDifficulty,
        attachment_url: null,
      });
    }
  }, [currentMode, initialDifficulty]);

  // Fetch threads when viewing / continuous
  useEffect(() => {
    if ((currentMode === 'view' || currentMode === 'continuous') && prompt?.id) {
      supabase
        .from('prompts')
        .select('*')
        .ilike('expected_answer', `%[PARENT:${prompt.id}]%`)
        .order('created_at', { ascending: true })
        .then(({ data }) => setThreadItems(data || []));
    } else if (!prompt?.id) {
      setThreadItems([]);
    }
  }, [currentMode, prompt?.id, triggerRefetch]);

  // Sync form data with incoming prompt
  useEffect(() => {
    if (prompt && mode !== 'create' && mode !== 'collapsed' && !isCreatingThread) {
      setFormData({
        title: prompt.title || '',
        content: prompt.content || '',
        expected_answer: cleanExpected(prompt.expected_answer),
        difficulty: prompt.difficulty || 'beginner',
        attachment_url: prompt.attachment_url || null,
      });
      setCurrentMode('view');
    } else if (mode === 'create' || mode === 'collapsed') {
      setFormData({
        title: '',
        content: '',
        expected_answer: '',
        difficulty: initialDifficulty,
        attachment_url: null,
      });
      setCurrentMode(mode);
    } else if (mode === 'edit') {
      setFormData({
        title: prompt.title || '',
        content: prompt.content || '',
        expected_answer: cleanExpected(prompt.expected_answer),
        difficulty: prompt.difficulty || 'beginner',
        attachment_url: prompt.attachment_url || null,
      });
      setCurrentMode('edit');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prompt, mode, initialDifficulty, isCreatingThread]);

  // ---- Handlers ----
  const handleCopy = (text) => {
    const plain = (text || '').replace(/<[^>]+>/g, '');
    navigator.clipboard.writeText(plain);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFileChange = (e) => {
    if (e.target.files?.[0]) {
      const f = e.target.files[0];
      if (f.size > 3 * 1024 * 1024) {
        alert('이미지 용량이 너무 큽니다. (3MB 제한)');
        e.target.value = '';
        setFile(null);
        return;
      }
      setFile(f);
    }
  };

  const handleDeleteThread = async (id) => {
    if (!window.confirm('정말 이 프롬프트를 삭제하시겠습니까?')) return;
    try {
      setLoading(true);
      const sessionStr = localStorage.getItem('admin_session');
      const adminId = sessionStr ? JSON.parse(sessionStr).id : null;
      if (!adminId) throw new Error('관리자 로그인 정보가 없습니다 (세션 만료).');
      await deletePromptAction(id, adminId);
      setThreadItems((prev) => prev.filter((i) => i.id !== id));
      setSessionHistory((prev) => prev.filter((i) => i.id !== id));
      setTriggerRefetch((p) => p + 1);
    } catch (error) {
      alert('삭제 실패: ' + (error.message || error));
    } finally {
      setLoading(false);
    }
  };

  const handleEditThread = (item) => {
    console.log('[PromptDetailPanel] Edit thread:', item.id);
    setInlineFormData({
      title: item.title || '',
      content: item.content || '',
      expected_answer: cleanExpected(item.expected_answer),
      difficulty: item.difficulty || 'beginner',
      attachment_url: item.attachment_url || null,
    });
    setInlineEditingId(item.id);
    // Scroll the card into view so user sees the edit form
    setTimeout(() => {
      document
        .querySelector(`[data-thread-id="${item.id}"]`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 50);
  };

  const handleInlineCancel = () => {
    setInlineEditingId(null);
    setInlineFormData({});
  };

  const handleInlineSave = async (id) => {
    // Validate: title and content (HTML may have just empty <p></p> tags)
    const titleEmpty = !inlineFormData.title || !inlineFormData.title.trim();
    const contentText = (inlineFormData.content || '').replace(/<[^>]+>/g, '').trim();
    const contentEmpty = !contentText;
    if (titleEmpty || contentEmpty) {
      alert(
        `다음 항목을 입력해주세요:\n${titleEmpty ? '· 제목\n' : ''}${contentEmpty ? '· 프롬프트 내용' : ''}`,
      );
      return;
    }
    if (!window.confirm('수정하시겠습니까?')) return;
    setLoading(true);
    try {
      const payload = { ...inlineFormData };
      const parentTag = prompt?.id ? `[PARENT:${prompt.id}]` : '';
      payload.expected_answer = `<!--THREAD-->${parentTag}` + (payload.expected_answer || '');
      await onSave(payload, null, id);
      setThreadItems((prev) =>
        prev.map((i) =>
          i.id === id ? { ...i, ...inlineFormData, expected_answer: payload.expected_answer } : i,
        ),
      );
      setInlineEditingId(null);
      setInlineFormData({});
    } catch (error) {
      alert('수정 실패: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate
    const titleEmpty = !formData.title || !formData.title.trim();
    const contentText = (formData.content || '').replace(/<[^>]+>/g, '').trim();
    const contentEmpty = !contentText;
    if (titleEmpty || contentEmpty) {
      alert(
        `다음 항목을 입력해주세요:\n${titleEmpty ? '· 제목\n' : ''}${contentEmpty ? '· 프롬프트 내용' : ''}`,
      );
      return;
    }

    setLoading(true);
    try {
      const payload = { ...formData };
      const isThreadMode = isThread || isCreatingThread;
      if (isThreadMode) {
        const parentTag = prompt?.id ? `[PARENT:${prompt.id}]` : '';
        payload.expected_answer = `<!--THREAD-->${parentTag}` + (payload.expected_answer || '');
      }

      let targetId = currentMode === 'edit' ? prompt?.id : null;
      if (editingThreadId) targetId = editingThreadId;

      const savedPrompt = await onSave(payload, file, targetId);

      // Standalone create: close
      if (!isThreadMode && (currentMode === 'create' || currentMode === 'continuous')) {
        onClose();
        return;
      }

      // Thread continuous flow
      if (currentMode === 'create' || currentMode === 'continuous') {
        const historyItem = savedPrompt || { ...formData, created_at: new Date().toISOString() };
        setSessionHistory((prev) => [...prev, historyItem]);
        setFormData((prev) => ({
          title: '',
          content: '',
          expected_answer: '',
          difficulty: prev.difficulty,
          attachment_url: null,
        }));
        setFile(null);
        setEditingThreadId(null);

        if (isThreadMode) {
          setTriggerRefetch((p) => p + 1);
          setCurrentMode('collapsed');
        } else if (currentMode !== 'continuous') {
          setCurrentMode('continuous');
        }
      } else {
        setTriggerRefetch((p) => p + 1);
        setCurrentMode('view');
      }
    } catch (error) {
      alert('저장 실패: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!prompt && currentMode === 'view') return null;

  // ---------------------------------------------------------------------------
  // VIEW MODE
  // ---------------------------------------------------------------------------
  if (currentMode === 'view') {
    return (
      <article className="mx-auto w-full max-w-3xl">
        {/* Top bar */}
        <div className="mb-5 flex items-center justify-between">
          <button
            onClick={onClose}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-semibold text-muted-foreground transition hover:border-brand-400 hover:text-foreground"
          >
            <ArrowLeft size={14} /> 목록으로
          </button>
          <div className="flex items-center gap-1">
            {isAdmin && (
              <>
                <IconBtn onClick={() => setCurrentMode('edit')} title="수정">
                  <Pencil size={15} />
                </IconBtn>
                <IconBtn onClick={() => onDelete(prompt.id)} title="삭제" tone="danger">
                  <Trash2 size={15} />
                </IconBtn>
              </>
            )}
            <IconBtn onClick={onClose} title="닫기">
              <X size={16} />
            </IconBtn>
          </div>
        </div>

        {/* Title header */}
        <header className="mb-6 border-b border-border pb-5">
          <h1 className="font-display text-2xl tracking-tight text-foreground sm:text-[2rem] leading-tight">
            {prompt.title}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <DifficultyBadge value={prompt.difficulty} />
            <span>📅 {formatDate(prompt.created_at)}</span>
            {prompt.accounts?.display_name && (
              <span>👤 {prompt.accounts.display_name}</span>
            )}
          </div>
        </header>

        {/* Prompt content */}
        <section className="mb-6">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="flex items-center gap-1.5 text-sm font-bold text-foreground">
              <FileText size={14} className="text-brand-600 dark:text-brand-300" /> 프롬프트
            </h3>
            <button
              onClick={() => handleCopy(prompt.content)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-semibold text-muted-foreground transition hover:border-brand-400 hover:text-foreground"
            >
              {copied ? (
                <>
                  <CheckCircle2 size={12} className="text-success-600" /> 복사됨
                </>
              ) : (
                <>
                  <Copy size={12} /> 복사하기
                </>
              )}
            </button>
          </div>
          <div className="rounded-xl border border-border bg-muted/40 p-5">
            <HtmlView html={prompt.content} />
          </div>
        </section>

        {/* Expected answer */}
        {prompt.expected_answer && cleanExpected(prompt.expected_answer) && (
          <section className="mb-6">
            <h3 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-foreground">
              <span className="text-accent-500">💡</span> 예상 답변
            </h3>
            <div className="rounded-xl border border-brand-200 bg-brand-50/60 p-5 dark:border-brand-900 dark:bg-brand-900/10">
              <HtmlView html={prompt.expected_answer} tone="brand" />
            </div>
          </section>
        )}

        {/* Attachment */}
        {prompt.attachment_url && (
          <section className="mb-6">
            <h3 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-foreground">
              <Paperclip size={14} /> 첨부 자료
            </h3>
            {/\.(jpg|jpeg|png|gif|webp)$/i.test(prompt.attachment_url) && (
              <div className="mb-3 overflow-hidden rounded-xl border border-border">
                <img
                  src={prompt.attachment_url}
                  alt="첨부 이미지"
                  className="block h-auto w-full"
                />
              </div>
            )}
            <a
              href={`${prompt.attachment_url}?download=`}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm font-semibold text-brand-600 transition hover:border-brand-400 dark:text-brand-300"
            >
              <Download size={14} /> 자료 다운로드
            </a>
          </section>
        )}

        {/* Threaded replies */}
        {threadItems.length > 0 && (
          <section className="mt-10 border-t border-dashed border-border pt-8">
            <h3 className="mb-5 flex items-center gap-1.5 text-base font-bold text-foreground">
              <Link2 size={16} className="text-brand-600 dark:text-brand-300" />
              이어지는 프롬프트
              <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {threadItems.length}
              </span>
            </h3>

            <div className="relative ml-2 flex flex-col gap-5 border-l-2 border-border pl-6">
              {threadItems.map((item) => (
                <ThreadCard
                  key={item.id}
                  item={item}
                  isAdmin={isAdmin}
                  isEditing={inlineEditingId === item.id}
                  inlineFormData={inlineFormData}
                  setInlineFormData={setInlineFormData}
                  onEdit={() => handleEditThread(item)}
                  onDelete={() => handleDeleteThread(item.id)}
                  onSave={() => handleInlineSave(item.id)}
                  onCancel={handleInlineCancel}
                  loading={loading}
                />
              ))}
            </div>
          </section>
        )}

        {/* Comment-style "add thread" input */}
        {isAdmin && (enableThreadCreation || isThread) && (
          <section className="mt-10 border-t border-border pt-6">
            <button
              onClick={() => {
                setIsCreatingThread(true);
                setCurrentMode('continuous');
              }}
              className="group flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left transition hover:border-brand-400 hover:bg-muted/40"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-violet-500 text-white">
                <MessageCircle size={16} />
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-foreground">
                  이어지는 프롬프트 작성
                </div>
                <div className="text-xs text-muted-foreground">
                  이 프롬프트와 연결된 후속 질문을 댓글처럼 추가할 수 있어요.
                </div>
              </div>
              <CornerDownRight
                size={16}
                className="text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-brand-600"
              />
            </button>
          </section>
        )}

        {/* Bottom back */}
        <div className="mt-8 border-t border-border pt-5">
          <button
            onClick={onClose}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold text-muted-foreground transition hover:border-brand-400 hover:text-foreground"
          >
            <ArrowLeft size={15} /> 목록으로 돌아가기
          </button>
        </div>
      </article>
    );
  }

  // ---------------------------------------------------------------------------
  // EDIT / CREATE / CONTINUOUS / COLLAPSED MODE
  // ---------------------------------------------------------------------------
  const isThreadMode = isThread || isCreatingThread;

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="relative flex flex-col gap-6 py-4">
        {/* Floating close */}
        <button
          onClick={onClose}
          className="absolute right-0 top-0 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm transition hover:scale-110 hover:text-accent-500"
          title="닫기"
        >
          <X size={16} />
        </button>

        {/* Parent reference card (in thread mode) */}
        {isThreadMode && prompt && (
          <div className="rounded-2xl border border-border bg-muted/30 p-5">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <CornerDownRight size={12} /> 원문 프롬프트
            </div>
            <h2 className="font-display text-lg tracking-tight text-foreground">
              {prompt.title}
            </h2>
            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <DifficultyBadge value={prompt.difficulty} />
              <span>📅 {formatDate(prompt.created_at)}</span>
            </div>
            <div className="mt-3 rounded-lg border border-border bg-card p-3">
              <HtmlView html={prompt.content} tone="muted" />
            </div>
          </div>
        )}

        {/* Existing DB threads (shown in continuous mode so you see context) */}
        {threadItems.length > 0 && isThreadMode && (
          <div className="relative ml-2 flex flex-col gap-4 border-l-2 border-border pl-6">
            {threadItems.map((item) => (
              <ThreadCard
                key={item.id}
                item={item}
                isAdmin={isAdmin}
                isEditing={inlineEditingId === item.id}
                inlineFormData={inlineFormData}
                setInlineFormData={setInlineFormData}
                onEdit={() => handleEditThread(item)}
                onDelete={() => handleDeleteThread(item.id)}
                onSave={() => handleInlineSave(item.id)}
                onCancel={handleInlineCancel}
                loading={loading}
                compact
              />
            ))}
          </div>
        )}

        {/* In-session history cards */}
        {sessionHistory.length > 0 && (
          <div
            className={cn(
              'flex flex-col gap-4',
              isThreadMode && 'ml-2 border-l-2 border-success-500/40 pl-6',
            )}
          >
            {sessionHistory.map((historyItem, idx) => (
              <SessionHistoryCard
                key={idx}
                item={historyItem}
                isAdmin={isAdmin}
                onEdit={historyItem.id ? () => handleEditThread(historyItem) : null}
                onDelete={historyItem.id ? () => handleDeleteThread(historyItem.id) : null}
              />
            ))}
          </div>
        )}

        {/* Collapsed button (comment-style add) OR form */}
        {currentMode === 'collapsed' ? (
          <button
            onClick={() => setCurrentMode('continuous')}
            className="group flex w-full items-center gap-3 rounded-2xl border border-dashed border-border bg-card p-5 text-left transition hover:border-brand-400 hover:bg-muted/40"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-violet-500 text-white">
              <MessageCircle size={18} />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-foreground">새로운 프롬프트 추가하기</div>
              <div className="text-xs text-muted-foreground">
                이 스레드에 연결되는 후속 질문을 작성합니다.
              </div>
            </div>
            <CornerDownRight
              size={16}
              className="text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-brand-600"
            />
          </button>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="relative flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6"
          >
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-border pb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-violet-500 text-white shadow-sm">
                <Pencil size={16} />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">
                  {currentMode === 'edit'
                    ? '프롬프트 수정'
                    : sessionHistory.length > 0
                      ? '추가 프롬프트 작성'
                      : '새 프롬프트 작성'}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {isThreadMode
                    ? '이 프롬프트는 원문에 이어집니다.'
                    : '제목과 내용을 입력한 뒤 저장해주세요.'}
                </p>
              </div>
            </div>

            {/* Title + difficulty (non-thread only) */}
            {!isThreadMode && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_140px]">
                <div>
                  <Label>제목</Label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="이번 프롬프트의 핵심 주제"
                    required
                    className="w-full rounded-xl border border-border bg-muted/40 px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-brand-500 focus:bg-card focus:ring-2 focus:ring-brand-500/20"
                  />
                </div>
                <div>
                  <Label>난이도</Label>
                  <select
                    value={formData.difficulty}
                    onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                    className="w-full rounded-xl border border-border bg-muted/40 px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-brand-500 focus:bg-card"
                  >
                    <option value="beginner">초급</option>
                    <option value="intermediate">중급</option>
                    <option value="advanced">고급</option>
                  </select>
                </div>
              </div>
            )}

            {/* Thread title (simpler) */}
            {isThreadMode && (
              <div>
                <Label>이어지는 프롬프트 제목</Label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="이어지는 질문의 제목"
                  required
                  className="w-full rounded-xl border border-border bg-muted/40 px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-brand-500 focus:bg-card focus:ring-2 focus:ring-brand-500/20"
                />
              </div>
            )}

            {/* Content editor */}
            <div>
              <Label>프롬프트 내용</Label>
              <RichEditor
                value={formData.content}
                onChange={(val) => setFormData({ ...formData, content: val })}
                placeholder="프롬프트 내용을 작성하거나 붙여넣으세요. 이미지는 드래그·붙여넣기로 삽입할 수 있어요."
                minHeight={180}
              />
            </div>

            {/* Expected answer + attachment (collapsible) */}
            <details className="group rounded-xl border border-border bg-muted/30 open:bg-muted/40">
              <summary className="flex cursor-pointer items-center gap-2 list-none px-4 py-3 text-sm font-semibold text-muted-foreground hover:text-foreground">
                <ChevronDown
                  size={14}
                  className="transition group-open:rotate-180"
                />
                예상 답변 및 첨부 파일 <span className="text-xs">(선택)</span>
              </summary>
              <div className="flex flex-col gap-4 border-t border-border px-4 py-4">
                <div>
                  <Label>예상 답변</Label>
                  <p className="mb-1.5 text-[11px] text-muted-foreground">
                    리치 에디터로 작성하면 HTML 태그 없이 서식 그대로 저장돼요.
                  </p>
                  <RichEditor
                    value={formData.expected_answer}
                    onChange={(val) =>
                      setFormData({ ...formData, expected_answer: val })
                    }
                    placeholder="예상 답변을 서식과 함께 작성하세요..."
                    minHeight={140}
                  />
                </div>

                <div>
                  <Label>첨부 파일</Label>
                  <div className="flex items-center gap-3 rounded-xl border border-dashed border-border bg-card p-3 text-sm">
                    <Paperclip size={14} className="text-muted-foreground" />
                    <input
                      type="file"
                      onChange={handleFileChange}
                      className="flex-1 text-xs text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-brand-500/15 file:px-2 file:py-1 file:text-xs file:font-semibold file:text-brand-700 hover:file:bg-brand-500/25 dark:file:text-brand-300"
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    최대 3MB · jpg · png · gif · webp
                  </p>
                </div>
              </div>
            </details>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
              <button
                type="button"
                onClick={() => {
                  if (sessionHistory.length === 0 && (currentMode === 'create' || currentMode === 'continuous')) {
                    onClose();
                  } else if (isThreadMode) {
                    setCurrentMode('collapsed');
                  } else {
                    onClose();
                  }
                }}
                className="rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-muted-foreground transition hover:border-brand-400 hover:text-foreground"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-violet-500 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-brand-500/20 transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> 저장 중...
                  </>
                ) : (
                  <>
                    <SendHorizontal size={14} />
                    {currentMode === 'edit' ? '수정 완료' : '등록하기'}
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Sub-components
// -----------------------------------------------------------------------------

function IconBtn({ onClick, title, children, tone = 'default' }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        'inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted',
        tone === 'danger' && 'hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40',
        tone === 'default' && 'hover:text-foreground',
      )}
    >
      {children}
    </button>
  );
}

function Label({ children }) {
  return (
    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
      {children}
    </label>
  );
}

function ThreadCard({
  item,
  isAdmin,
  isEditing,
  inlineFormData,
  setInlineFormData,
  onEdit,
  onDelete,
  onSave,
  onCancel,
  loading,
  compact,
}) {
  return (
    <div className="relative" data-thread-id={item.id}>
      {/* Dot connector */}
      <span
        aria-hidden
        className="absolute -left-[calc(1.5rem+5px)] top-5 h-2.5 w-2.5 rounded-full bg-gradient-to-br from-brand-500 to-violet-500 ring-2 ring-card"
      />
      <div
        className={cn(
          'rounded-2xl border border-border bg-card shadow-sm',
          compact ? 'p-4' : 'p-5',
        )}
      >
        {isEditing ? (
          // Inline edit form
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <span className="inline-flex items-center gap-1.5 text-sm font-bold text-brand-600 dark:text-brand-300">
                <Pencil size={13} /> 수정 중...
              </span>
            </div>
            <div>
              <Label>제목</Label>
              <input
                type="text"
                value={inlineFormData.title || ''}
                onChange={(e) =>
                  setInlineFormData({ ...inlineFormData, title: e.target.value })
                }
                className="w-full rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:bg-card"
              />
            </div>
            <div>
              <Label>내용</Label>
              <RichEditor
                value={inlineFormData.content || ''}
                onChange={(val) =>
                  setInlineFormData({ ...inlineFormData, content: val })
                }
                placeholder="내용을 수정하세요..."
                minHeight={120}
                toolbar="compact"
              />
            </div>
            <div>
              <Label>예상 답변</Label>
              <RichEditor
                value={inlineFormData.expected_answer || ''}
                onChange={(val) =>
                  setInlineFormData({ ...inlineFormData, expected_answer: val })
                }
                placeholder="예상 답변 (선택)"
                minHeight={100}
                toolbar="compact"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={onCancel}
                className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
              >
                취소
              </button>
              <button
                onClick={onSave}
                disabled={loading}
                className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-brand-600 to-violet-500 px-3 py-1.5 text-xs font-bold text-white"
              >
                {loading ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                수정 완료
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-3 flex items-start justify-between gap-2 border-b border-border pb-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-brand-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-600 dark:text-brand-300">
                  Thread
                </span>
                <span className="text-sm font-semibold text-foreground">{item.title}</span>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {isAdmin && (
                  <>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit?.();
                      }}
                      title="수정"
                      className="inline-flex h-8 items-center gap-1 rounded-lg border border-border bg-card px-2 text-xs font-semibold text-muted-foreground transition hover:border-brand-400 hover:bg-brand-500/10 hover:text-brand-600 dark:hover:text-brand-300"
                    >
                      <Pencil size={13} /> 수정
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete?.();
                      }}
                      title="삭제"
                      className="inline-flex h-8 items-center gap-1 rounded-lg border border-border bg-card px-2 text-xs font-semibold text-muted-foreground transition hover:border-red-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-300"
                    >
                      <Trash2 size={13} /> 삭제
                    </button>
                  </>
                )}
                <span className="ml-1 text-[11px] text-muted-foreground">
                  {formatDate(item.created_at)}
                </span>
              </div>
            </div>

            <div className="mb-3">
              <div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                프롬프트 내용
              </div>
              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <HtmlView html={item.content} />
              </div>
            </div>

            {cleanExpected(item.expected_answer) && (
              <div>
                <div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-brand-700 dark:text-brand-300">
                  💡 예상 답변
                </div>
                <div className="rounded-lg border border-brand-200 bg-brand-50/60 p-3 dark:border-brand-900 dark:bg-brand-900/10">
                  <HtmlView html={item.expected_answer} tone="brand" />
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function SessionHistoryCard({ item, isAdmin, onEdit, onDelete }) {
  return (
    <div className="relative">
      <span
        aria-hidden
        className="absolute -left-[calc(1.5rem+5px)] top-5 hidden h-2.5 w-2.5 rounded-full bg-success-500 ring-2 ring-card"
      />
      <div className="rounded-2xl border border-success-500/30 bg-card p-4 shadow-sm">
        <div className="mb-2 flex items-center justify-between gap-2 border-b border-border pb-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-success-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-success-600 dark:text-success-500">
              방금 등록
            </span>
            <span className="text-sm font-semibold text-foreground">{item.title}</span>
          </div>
          <div className="flex items-center gap-1">
            {isAdmin && onEdit && (
              <button
                onClick={onEdit}
                className="rounded-md p-1 text-muted-foreground hover:bg-muted"
                title="수정"
              >
                <Pencil size={12} />
              </button>
            )}
            {isAdmin && onDelete && (
              <button
                onClick={onDelete}
                className="rounded-md p-1 text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                title="삭제"
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>
        </div>
        <div className="mb-2">
          <div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            프롬프트 내용
          </div>
          <div className="rounded-lg bg-muted/40 p-3">
            <HtmlView html={item.content} />
          </div>
        </div>
        {cleanExpected(item.expected_answer) && (
          <div>
            <div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-brand-700 dark:text-brand-300">
              💡 예상 답변
            </div>
            <div className="rounded-lg border border-brand-200 bg-brand-50/60 p-3 dark:border-brand-900 dark:bg-brand-900/10">
              <HtmlView html={item.expected_answer} tone="brand" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
