'use client';

import { useState } from 'react';
import {
  FolderUp, X, Upload, Sparkles, Loader2, AlertCircle, Code2,
  Wand2,
} from 'lucide-react';
import { generatePromptsAction } from '@/app/actions/ai';
import { cn } from '@/lib/utils';

const SAMPLE = `[
  {
    "title": "예제 프롬프트",
    "content": "여기에 프롬프트 내용을 작성하세요.",
    "expected_answer": "예상 답변 내용입니다.",
    "difficulty": "beginner"
  }
]`;

export default function BulkUploadPanel({
  targetId,
  currentDifficulty,
  onSave,
  onClose,
}) {
  const [bulkJson, setBulkJson] = useState('');
  const [tab, setTab] = useState('json'); // 'json' | 'ai'
  const [aiParams, setAiParams] = useState({
    topic: '',
    model: 'gemini',
    count: 3,
    difficulty: currentDifficulty || 'beginner',
  });
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  const handleBulkSubmit = async () => {
    setError('');
    if (!bulkJson.trim()) {
      setError('JSON 데이터를 입력해주세요.');
      return;
    }
    try {
      const parsed = JSON.parse(bulkJson);
      if (!Array.isArray(parsed)) {
        throw new Error('JSON 배열([...]) 형식으로 입력해주세요.');
      }
      onSave?.(parsed);
      setBulkJson('');
    } catch (e) {
      setError('등록 실패: ' + e.message);
    }
  };

  const handleAiGenerate = async () => {
    setError('');
    if (!aiParams.topic) {
      setError('주제를 입력해주세요.');
      return;
    }
    setGenerating(true);
    try {
      const result = await generatePromptsAction({
        topic: aiParams.topic,
        model: aiParams.model,
        count: aiParams.count,
        difficulty: aiParams.difficulty,
        targetGroup: targetId,
      });
      if (!result.success) throw new Error(result.error);
      setBulkJson(JSON.stringify(result.data, null, 2));
      setTab('json');
    } catch (e) {
      setError(e.message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-3 border-b border-border pb-5">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-500/40 bg-brand-500/10 px-2.5 py-0.5 text-xs font-semibold text-brand-700 dark:text-brand-300">
            <FolderUp size={11} /> Bulk Upload
          </span>
          <h2 className="mt-3 font-display text-2xl tracking-tight text-foreground sm:text-3xl">
            프롬프트 대량 등록
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            JSON 포맷으로 한번에 여러 프롬프트를 등록하거나, AI로 JSON을 생성할 수 있어요.
          </p>
        </div>
        <button
          onClick={onClose}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition hover:text-foreground"
        >
          <X size={16} />
        </button>
      </div>

      {/* Tabs */}
      <div className="mb-5 flex gap-1 rounded-xl border border-border bg-muted/50 p-1">
        <button
          onClick={() => setTab('json')}
          className={cn(
            'flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition',
            tab === 'json'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <Code2 size={14} /> JSON 직접 입력
        </button>
        <button
          onClick={() => setTab('ai')}
          className={cn(
            'flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition',
            tab === 'ai'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <Wand2 size={14} /> AI 자동 생성
        </button>
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* JSON TAB */}
      {tab === 'json' && (
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-border bg-muted/30 p-4">
            <div className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <Code2 size={11} /> 작성 가이드
            </div>
            <p className="text-sm text-foreground/80">
              아래와 같은 JSON 배열로 입력하세요. <code className="rounded bg-muted px-1 py-0.5 text-xs">difficulty</code>를 생략하면 현재 선택된 난이도로 자동 지정됩니다.
            </p>
            <pre className="mt-3 overflow-x-auto rounded-lg bg-ink-900 p-3 text-xs text-ink-50 dark:bg-ink-950">
{SAMPLE}
            </pre>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
              JSON 데이터
            </label>
            <textarea
              value={bulkJson}
              onChange={(e) => setBulkJson(e.target.value)}
              placeholder={SAMPLE}
              className="min-h-[320px] w-full rounded-xl border border-border bg-muted/40 p-4 font-mono text-xs text-foreground outline-none transition focus:border-brand-500 focus:bg-card focus:ring-2 focus:ring-brand-500/20"
            />
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
            <button
              onClick={onClose}
              className="rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-muted-foreground hover:border-brand-400 hover:text-foreground"
            >
              취소
            </button>
            <button
              onClick={handleBulkSubmit}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-violet-500 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-brand-500/20 transition hover:shadow-lg"
            >
              <Upload size={14} /> 일괄 등록하기
            </button>
          </div>
        </div>
      )}

      {/* AI TAB */}
      {tab === 'ai' && (
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-violet-500/30 bg-violet-500/5 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-accent-400 text-white">
                <Sparkles size={14} />
              </div>
              <div className="text-sm text-foreground/90">
                <p className="font-bold">AI 프롬프트 생성기</p>
                <p className="text-muted-foreground">
                  주제 입력 → AI 생성 → JSON 자동 변환 후 &quot;JSON 직접 입력&quot; 탭에서 확인 · 등록
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
              주제 (Topic)
            </label>
            <input
              type="text"
              placeholder="예: 신입 사원 온보딩 메일 작성"
              value={aiParams.topic}
              onChange={(e) => setAiParams({ ...aiParams, topic: e.target.value })}
              className="w-full rounded-xl border border-border bg-muted/40 px-3 py-2.5 text-sm text-foreground outline-none focus:border-brand-500 focus:bg-card focus:ring-2 focus:ring-brand-500/20"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_80px]">
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                사용 모델
              </label>
              <select
                value={aiParams.model}
                onChange={(e) => setAiParams({ ...aiParams, model: e.target.value })}
                className="w-full rounded-xl border border-border bg-muted/40 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:bg-card"
              >
                <option value="gemini">Google Gemini 1.5 Flash</option>
                <option value="gpt">OpenAI GPT-4o mini</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                난이도
              </label>
              <select
                value={aiParams.difficulty}
                onChange={(e) => setAiParams({ ...aiParams, difficulty: e.target.value })}
                className="w-full rounded-xl border border-border bg-muted/40 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:bg-card"
              >
                <option value="beginner">초급</option>
                <option value="intermediate">중급</option>
                <option value="advanced">고급</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                개수
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={aiParams.count}
                onChange={(e) =>
                  setAiParams({ ...aiParams, count: parseInt(e.target.value) || 1 })
                }
                className="w-full rounded-xl border border-border bg-muted/40 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:bg-card"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
            <button
              onClick={onClose}
              className="rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-muted-foreground hover:border-brand-400 hover:text-foreground"
            >
              취소
            </button>
            <button
              onClick={handleAiGenerate}
              disabled={generating || !aiParams.topic}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-accent-400 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-violet-500/20 transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
            >
              {generating ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> 생성 중...
                </>
              ) : (
                <>
                  <Sparkles size={14} /> 생성하기
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
