'use client';

import { useState, useEffect, Suspense, useMemo } from 'react';
import { useRouter, useParams, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Plus, Sparkles, FolderUp, Trash2, Search, ChevronLeft, ChevronRight,
  ArrowUpToLine, Loader2, Inbox, Leaf, TreePine, TreeDeciduous, Shield,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import BulkUploadPanel from '@/app/components/BulkUploadPanel';
import AIGeneratePanel from '@/app/components/AIGeneratePanel';
import PromptDetailPanel from '@/app/components/PromptDetailPanel';
import { cn } from '@/lib/utils';

const targetNames = {
  business: '비즈니스',
  public: '공공기관',
  univ: '대학',
  elem: '초등학교',
  middle: '중학교',
  high: '고등학교',
  adult: '일반성인 (기초)',
};

const difficultyGuides = {
  beginner: {
    title: '초급 (Beginner)',
    Icon: Leaf,
    gradient: 'from-success-500 to-brand-400',
    desc: '생성형 AI와 친해지는 단계입니다. 간단하고 명확한 지시로 AI에게 기초적인 작업을 요청하는 방법을 익힙니다.',
    features: '명확한 지시어(명령), 짧고 간결한 문장',
  },
  intermediate: {
    title: '중급 (Intermediate)',
    Icon: TreeDeciduous,
    gradient: 'from-brand-500 to-violet-500',
    desc: '구체적인 상황(Context)을 설정하고 AI에게 역할(Persona)을 부여하여, 업무에 바로 활용 가능한 실무형 답변을 얻는 단계입니다.',
    features: '역할 부여(Role), 구체적 상황 설명, 목적 명시',
  },
  advanced: {
    title: '고급 (Advanced)',
    Icon: TreePine,
    gradient: 'from-violet-600 to-accent-500',
    desc: '복잡한 논리적 추론이나 창의적 결과물이 필요할 때 사용합니다. 예시(Few-shot)를 제공하거나 출력 형식을 지정하여 전문가 수준의 결과를 도출합니다.',
    features: '예시 제공(Few-shot), 출력 형식 지정(Format), 단계별 사고 유도',
  },
};

function LearnContent() {
  const params = useParams();
  const router = useRouter();
  const targetId = params.target;

  const [userSession, setUserSession] = useState(null);
  const [prompts, setPrompts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState('beginner');

  const [activePanel, setActivePanel] = useState('none');
  const [selectedPrompt, setSelectedPrompt] = useState(null);
  const [checkedIds, setCheckedIds] = useState([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const promptId = searchParams.get('promptId');
    if (promptId && prompts.length > 0) {
      const prompt = prompts.find((p) => p.id === promptId);
      if (prompt) {
        setSelectedPrompt(prompt);
        setActivePanel('detail');
      }
    } else {
      setSelectedPrompt(null);
      setActivePanel('none');
    }
  }, [searchParams, prompts]);

  const handlePromptClick = (prompt) => {
    const p = new URLSearchParams(searchParams);
    p.set('promptId', prompt.id);
    router.push(`${pathname}?${p.toString()}`);
  };

  const handleCloseDetail = () => {
    const p = new URLSearchParams(searchParams);
    p.delete('promptId');
    router.push(`${pathname}?${p.toString()}`);
  };

  useEffect(() => {
    if (!targetId) return;

    const adminSessionStr = localStorage.getItem('admin_session');
    if (adminSessionStr) {
      const targetName = targetNames[targetId] || targetId;
      setUserSession({
        display_name: targetName,
        username: targetId,
        role: 'admin',
      });
      setIsAdmin(true);
      fetchPrompts(targetId, selectedDifficulty);
      return;
    }

    const sessionStr = localStorage.getItem('user_session');
    if (!sessionStr) {
      router.replace(`/login?target=${targetId}`);
      return;
    }

    try {
      const session = JSON.parse(sessionStr);
      if (session.username !== targetId && session.role !== 'admin') {
        alert('접근 권한이 없습니다.');
        router.replace('/');
        return;
      }
      setUserSession({
        ...session,
        display_name: session.display_name || session.displayName || '사용자',
      });
      fetchPrompts(targetId, selectedDifficulty);
    } catch (e) {
      console.error(e);
      localStorage.removeItem('user_session');
      router.replace(`/login?target=${targetId}`);
    }
  }, [targetId, selectedDifficulty, router]);

  const fetchPrompts = async (target, difficulty) => {
    setLoading(true);
    setFetchError(null);
    setCheckedIds([]);

    try {
      const { data, error } = await supabase
        .from('prompts')
        .select(
          `id, title, content, expected_answer, difficulty, created_by, attachment_url, created_at,
           accounts:created_by ( display_name )`,
        )
        .eq('target_group', target)
        .eq('difficulty', difficulty)
        .order('created_at', { ascending: false });

      if (error) {
        // Try fallback without join
        const { data: fallback, error: fallbackErr } = await supabase
          .from('prompts')
          .select('*')
          .eq('target_group', target)
          .eq('difficulty', difficulty)
          .order('created_at', { ascending: false });
        if (fallbackErr) throw fallbackErr;
        const filtered = (fallback || []).filter(
          (p) => !p.expected_answer?.includes('<!--THREAD-->'),
        );
        setPrompts(filtered);
      } else {
        const filtered = (data || []).filter(
          (p) => !p.expected_answer?.includes('<!--THREAD-->'),
        );
        setPrompts(filtered);
      }
    } catch (err) {
      console.error('fetchPrompts error:', err);
      setFetchError(
        err?.message?.includes('fetch')
          ? '서버 연결이 일시적으로 끊겼어요. 잠시 후 다시 시도해주세요.'
          : `데이터 불러오기 실패: ${err.message || '알 수 없는 오류'}`,
      );
      setPrompts([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredPrompts = useMemo(() => {
    let result = prompts.filter(
      (p) => !p.expected_answer?.includes('<!--THREAD-->'),
    );
    if (!searchQuery) return result;
    return result.filter((p) =>
      p.title.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [prompts, searchQuery]);

  const itemsPerPage = 10;
  const totalPages = Math.ceil(filteredPrompts.length / itemsPerPage);
  const displayedPrompts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredPrompts.slice(start, start + itemsPerPage);
  }, [filteredPrompts, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedPrompt(null);
    setActivePanel('none');
  }, [selectedDifficulty, searchQuery]);

  const handleSavePrompt = async (formData, file, id) => {
    try {
      const { data: adminAccount } = await supabase
        .from('accounts')
        .select('id')
        .eq('username', 'admin')
        .single();

      const payload = {
        target_group: targetId,
        difficulty: formData.difficulty || selectedDifficulty,
        title: formData.title,
        content: formData.content,
        expected_answer: formData.expected_answer,
        created_by: adminAccount?.id,
      };

      if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random()
          .toString(36)
          .substr(2, 9)}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('prompt-files')
          .upload(fileName, file);
        if (uploadError)
          throw new Error(
            `이미지 업로드 실패: ${uploadError.message || '권한 부족'}`,
          );
        const {
          data: { publicUrl },
        } = supabase.storage.from('prompt-files').getPublicUrl(fileName);
        payload.attachment_url = publicUrl;
      } else if (formData.attachment_url) {
        payload.attachment_url = formData.attachment_url;
      }

      let resultData = null;
      if (id) {
        const { data, error } = await supabase
          .from('prompts')
          .update(payload)
          .eq('id', id)
          .select()
          .single();
        if (error) throw error;
        resultData = data;
        if (selectedPrompt?.id === id) {
          setSelectedPrompt({ ...selectedPrompt, ...payload });
        }
      } else {
        const { data, error } = await supabase
          .from('prompts')
          .insert([payload])
          .select()
          .single();
        if (error) throw error;
        resultData = data;
      }
      fetchPrompts(targetId, selectedDifficulty);
      return resultData;
    } catch (error) {
      console.error('Save failed', error);
      throw error;
    }
  };

  const handleBulkSave = async (dataToSave) => {
    if (!dataToSave?.length) return;
    try {
      const { data: adminAccount } = await supabase
        .from('accounts')
        .select('id')
        .eq('username', 'admin')
        .single();

      const rows = dataToSave.map((item) => ({
        target_group: targetId,
        difficulty: item.difficulty || selectedDifficulty,
        title: item.title,
        content: item.content,
        expected_answer: item.expected_answer,
        created_by: adminAccount?.id,
      }));

      const { error } = await supabase.from('prompts').insert(rows);
      if (error) throw error;

      alert(`${rows.length}개의 프롬프트가 성공적으로 등록되었습니다.`);
      fetchPrompts(targetId, selectedDifficulty);
      setActivePanel('none');
    } catch (error) {
      alert('저장 중 오류가 발생했습니다: ' + error.message);
    }
  };

  const handleDeleteClick = async (id) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    const { error } = await supabase.from('prompts').delete().eq('id', id);
    if (error) alert('삭제 실패: ' + error.message);
    else {
      fetchPrompts(targetId, selectedDifficulty);
      if (selectedPrompt?.id === id) {
        setSelectedPrompt(null);
        setActivePanel('none');
      }
    }
  };

  const handleBulkDelete = async () => {
    if (checkedIds.length === 0) return;
    if (
      !confirm(`선택한 ${checkedIds.length}개의 프롬프트를 삭제하시겠습니까?`)
    )
      return;
    const { error } = await supabase.from('prompts').delete().in('id', checkedIds);
    if (error) alert('일괄 삭제 실패: ' + error.message);
    else {
      fetchPrompts(targetId, selectedDifficulty);
      setCheckedIds([]);
    }
  };

  const handleCheck = (e, id) => {
    e.stopPropagation();
    if (e.target.checked) setCheckedIds((prev) => [...prev, id]);
    else setCheckedIds((prev) => prev.filter((i) => i !== id));
  };

  const handleCheckAll = (e) => {
    if (e.target.checked) setCheckedIds(displayedPrompts.map((p) => p.id));
    else setCheckedIds([]);
  };

  const handleMoveToTop = async (e, id) => {
    e.stopPropagation();
    if (!confirm('이 게시글을 최상단으로 올리시겠습니까?')) return;
    const { error } = await supabase
      .from('prompts')
      .update({ created_at: new Date().toISOString() })
      .eq('id', id);
    if (error) alert('순서 변경 실패');
    else fetchPrompts(targetId, selectedDifficulty);
  };

  if (!userSession) return null;

  const guide = difficultyGuides[selectedDifficulty];
  const GuideIcon = guide.Icon;

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col">
      {/* ---------- Header (hidden in detail view) ---------- */}
      {!selectedPrompt && (
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          {isAdmin && (
            <span className="mb-2 inline-flex items-center gap-1 rounded-full border border-accent-400/40 bg-accent-400/10 px-2 py-0.5 text-[11px] font-semibold text-accent-500">
              <Shield size={10} /> 관리자 모드
            </span>
          )}
          <h1 className="font-display text-3xl tracking-tight text-foreground sm:text-4xl">
            {userSession.display_name}{' '}
            <span className="bg-gradient-to-r from-brand-600 via-violet-500 to-accent-400 bg-clip-text text-transparent">
              프롬프트 실습
            </span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            난이도를 선택하고, 마음에 드는 프롬프트를 직접 실습해보세요.
          </p>
        </div>

        {isAdmin && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActivePanel('create')}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground shadow-md shadow-brand-500/20 transition hover:shadow-lg"
            >
              <Plus size={14} /> 새 프롬프트
            </button>
            <button
              onClick={() => setActivePanel('ai')}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-500 to-accent-400 px-3.5 py-2 text-sm font-semibold text-white shadow-md shadow-violet-500/20 transition hover:shadow-lg"
            >
              <Sparkles size={14} /> AI 자동 생성
            </button>
            <button
              onClick={() => setActivePanel('bulk')}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-sm font-semibold text-foreground transition hover:border-brand-400"
            >
              <FolderUp size={14} /> 대량 등록
            </button>
            {checkedIds.length > 0 && (
              <button
                onClick={handleBulkDelete}
                className="inline-flex items-center gap-1.5 rounded-xl border border-red-300 bg-red-50 px-3.5 py-2 text-sm font-semibold text-red-600 hover:bg-red-100 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
              >
                <Trash2 size={14} /> 선택 삭제 ({checkedIds.length})
              </button>
            )}
          </div>
        )}
      </div>
      )}

      {/* ---------- Fetch error banner ---------- */}
      {fetchError && !selectedPrompt && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          <span className="mt-0.5">⚠️</span>
          <div className="flex-1">
            <div className="font-semibold">{fetchError}</div>
          </div>
          <button
            onClick={() => fetchPrompts(targetId, selectedDifficulty)}
            className="rounded-lg border border-red-400/40 bg-card px-3 py-1 text-xs font-semibold text-red-700 transition hover:bg-red-50 dark:text-red-300"
          >
            다시 시도
          </button>
        </div>
      )}

      {/* ---------- Difficulty Tabs (hidden in detail view) ---------- */}
      {!selectedPrompt && (
      <div className="mb-4 grid grid-cols-3 gap-2 rounded-2xl border border-border bg-muted/40 p-1.5">
        {['beginner', 'intermediate', 'advanced'].map((level) => {
          const g = difficultyGuides[level];
          const LevelIcon = g.Icon;
          const active = selectedDifficulty === level;
          return (
            <button
              key={level}
              onClick={() => setSelectedDifficulty(level)}
              className={cn(
                'relative flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all',
                active
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <span
                className={cn(
                  'flex h-6 w-6 items-center justify-center rounded-md transition',
                  active
                    ? `bg-gradient-to-br ${g.gradient} text-white shadow`
                    : 'bg-muted text-muted-foreground',
                )}
              >
                <LevelIcon size={13} />
              </span>
              {level === 'beginner' ? '초급' : level === 'intermediate' ? '중급' : '고급'}
            </button>
          );
        })}
      </div>
      )}

      {/* ---------- Difficulty Description Card (hidden in detail view) ---------- */}
      {!selectedPrompt && (
      <div className="relative mb-6 overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div
          aria-hidden
          className={cn(
            'absolute -right-16 -top-16 h-40 w-40 rounded-full bg-gradient-to-br opacity-15 blur-3xl',
            guide.gradient,
          )}
        />
        <div className="relative flex items-start gap-3">
          <div
            className={cn(
              'hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md sm:flex',
              guide.gradient,
            )}
          >
            <GuideIcon size={20} />
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-display text-lg tracking-tight text-foreground">
                {guide.title}
              </h3>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {selectedDifficulty}
              </span>
            </div>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {guide.desc}
            </p>
            <div className="mt-2.5 flex items-start gap-1.5 text-xs">
              <span className="shrink-0 font-semibold text-success-600 dark:text-success-500">
                💡 핵심 특징:
              </span>
              <span className="text-muted-foreground">{guide.features}</span>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* ---------- Full-screen panels (create/edit/ai/bulk) ---------- */}
      {activePanel === 'ai' && (
        <div className="fixed inset-0 z-30 overflow-y-auto bg-background md:absolute md:inset-0">
          <AIGeneratePanel
            targetId={targetId}
            currentDifficulty={selectedDifficulty}
            onSuccess={handleBulkSave}
            onClose={() => setActivePanel('none')}
          />
        </div>
      )}
      {activePanel === 'bulk' && (
        <div className="fixed inset-0 z-30 overflow-y-auto bg-background md:absolute md:inset-0">
          <BulkUploadPanel
            targetId={targetId}
            onSave={handleBulkSave}
            onClose={() => setActivePanel('none')}
          />
        </div>
      )}
      {activePanel === 'create' && (
        <div className="fixed inset-0 z-30 flex flex-col overflow-y-auto bg-background md:absolute md:inset-0">
          <PromptDetailPanel
            mode="create"
            isAdmin={true}
            onSave={handleSavePrompt}
            onClose={() => setActivePanel('none')}
            initialDifficulty={selectedDifficulty}
          />
        </div>
      )}
      {activePanel === 'edit' && selectedPrompt && (
        <div className="fixed inset-0 z-30 flex flex-col overflow-y-auto bg-background md:absolute md:inset-0">
          <PromptDetailPanel
            prompt={selectedPrompt}
            mode="edit"
            isAdmin={true}
            onSave={handleSavePrompt}
            onDelete={handleDeleteClick}
            onClose={() => setActivePanel('detail')}
          />
        </div>
      )}

      {/* ---------- List view ---------- */}
      {!selectedPrompt && (
        <div className="flex flex-col">
          {/* Search */}
          <div className="mb-4 relative">
            <Search
              size={16}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="text"
              placeholder="주제 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-border bg-card py-3 pl-10 pr-4 text-sm text-foreground outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
            />
          </div>

          {/* List table (desktop) / cards (mobile) */}
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            {/* Desktop */}
            <table className="hidden w-full md:table">
              <thead className="bg-muted/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <tr>
                  {isAdmin && (
                    <th className="w-12 px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        onChange={handleCheckAll}
                        checked={
                          displayedPrompts.length > 0 &&
                          checkedIds.length === displayedPrompts.length
                        }
                        className="accent-brand-600"
                      />
                    </th>
                  )}
                  <th className="w-16 px-4 py-3 text-center">No.</th>
                  <th className="px-4 py-3 text-left">주제</th>
                  <th className="w-36 px-4 py-3 text-right">등록일</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={isAdmin ? 4 : 3}
                      className="py-12 text-center text-muted-foreground"
                    >
                      <Loader2 className="mx-auto animate-spin" size={20} />
                    </td>
                  </tr>
                ) : displayedPrompts.length === 0 ? (
                  <tr>
                    <td
                      colSpan={isAdmin ? 4 : 3}
                      className="py-16 text-center text-muted-foreground"
                    >
                      <Inbox className="mx-auto mb-3" size={28} />
                      등록된 프롬프트가 없습니다.
                    </td>
                  </tr>
                ) : (
                  displayedPrompts.map((prompt, idx) => (
                    <tr
                      key={prompt.id}
                      onClick={() => handlePromptClick(prompt)}
                      className="cursor-pointer border-t border-border transition hover:bg-muted/40"
                    >
                      {isAdmin && (
                        <td
                          className="px-4 py-3 text-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={checkedIds.includes(prompt.id)}
                            onChange={(e) => handleCheck(e, prompt.id)}
                            className="accent-brand-600"
                          />
                        </td>
                      )}
                      <td className="px-4 py-3 text-center text-sm text-muted-foreground">
                        {filteredPrompts.length -
                          (currentPage - 1) * itemsPerPage -
                          idx}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-foreground line-clamp-1">
                            {prompt.title}
                          </span>
                          {isAdmin && (
                            <button
                              onClick={(e) => handleMoveToTop(e, prompt.id)}
                              title="맨 위로 올리기"
                              className="shrink-0 rounded-md p-1 text-muted-foreground opacity-0 transition group-hover:opacity-100 hover:bg-muted hover:text-brand-600"
                            >
                              <ArrowUpToLine size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-muted-foreground">
                        {new Date(prompt.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* Mobile cards */}
            <div className="flex flex-col divide-y divide-border md:hidden">
              {loading ? (
                <div className="py-10 text-center text-muted-foreground">
                  <Loader2 className="mx-auto animate-spin" size={20} />
                </div>
              ) : displayedPrompts.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <Inbox className="mx-auto mb-2" size={26} />
                  등록된 프롬프트가 없습니다.
                </div>
              ) : (
                displayedPrompts.map((prompt) => (
                  <Link
                    key={prompt.id}
                    href={`${pathname}?promptId=${prompt.id}`}
                    className="block p-4 transition hover:bg-muted/40"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="line-clamp-2 text-[15px] font-semibold text-foreground">
                        {prompt.title}
                      </h3>
                      {isAdmin && (
                        <input
                          type="checkbox"
                          onClick={(e) => handleCheck(e, prompt.id)}
                          checked={checkedIds.includes(prompt.id)}
                          onChange={() => {}}
                          className="mt-1 accent-brand-600"
                        />
                      )}
                    </div>
                    <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground">
                      {(prompt.content || '').replace(/<[^>]+>/g, '')}
                    </p>
                    <div className="mt-2.5 flex items-center justify-between text-[11px] text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <span>📅 {new Date(prompt.created_at).toLocaleDateString()}</span>
                        {isAdmin && (
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              handleMoveToTop(e, prompt.id);
                            }}
                            className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-1.5 py-0.5 text-[10px]"
                          >
                            <ArrowUpToLine size={10} /> 위로
                          </button>
                        )}
                      </div>
                      <span className="text-brand-600">자세히 보기 →</span>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-5 flex items-center justify-center gap-3">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((c) => c - 1)}
                className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-semibold text-foreground transition hover:border-brand-400 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft size={14} /> 이전
              </button>
              <span className="text-sm text-muted-foreground">
                <b className="text-foreground">{currentPage}</b> / {totalPages}
              </span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((c) => c + 1)}
                className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-semibold text-foreground transition hover:border-brand-400 disabled:cursor-not-allowed disabled:opacity-40"
              >
                다음 <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ---------- Detail view ---------- */}
      {selectedPrompt && (
        <div>
          <PromptDetailPanel
            mode="view"
            prompt={selectedPrompt}
            isAdmin={isAdmin}
            onClose={handleCloseDetail}
            onSave={handleSavePrompt}
            onDelete={handleDeleteClick}
            enableThreadCreation={true}
            initialDifficulty={selectedDifficulty}
          />
        </div>
      )}
    </div>
  );
}

export default function LearnPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-muted-foreground">
          <Loader2 className="inline animate-spin" size={16} /> Loading...
        </div>
      }
    >
      <LearnContent />
    </Suspense>
  );
}
