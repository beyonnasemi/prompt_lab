'use client';

import { useState, useEffect } from 'react';
import {
  Sparkles, X, Loader2, Wand2, RefreshCw, Save, AlertCircle,
  KeyRound, Eye, EyeOff, Image as ImageIcon, Info, CheckCircle2, Circle,
  ExternalLink,
} from 'lucide-react';
import { generatePromptsAction } from '@/app/actions/ai';
import { cn } from '@/lib/utils';

const MODELS = [
  {
    value: 'gemini',
    label: 'Google Gemini 1.5 Flash',
    shortLabel: 'Gemini',
    keyName: 'GEMINI_API_KEY',
    getKeyUrl: 'https://aistudio.google.com/apikey',
  },
  {
    value: 'gpt',
    label: 'OpenAI GPT-4o mini',
    shortLabel: 'GPT',
    keyName: 'OPENAI_API_KEY',
    getKeyUrl: 'https://platform.openai.com/api-keys',
  },
];

export default function AIGeneratePanel({
  targetId,
  currentDifficulty,
  onSuccess,
  onClose,
}) {
  const [topic, setTopic] = useState('');
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generatedPrompts, setGeneratedPrompts] = useState([]);
  const [selectedIndices, setSelectedIndices] = useState([]);
  const [error, setError] = useState('');

  const [selectedModel, setSelectedModel] = useState('gemini');
  const [difficulty, setDifficulty] = useState(currentDifficulty || 'beginner');
  const [count, setCount] = useState(3);

  // Per-model API key state + "show key" toggle
  const [apiKeys, setApiKeys] = useState({ gemini: '', gpt: '' });
  const [useOwnKey, setUseOwnKey] = useState(false);
  const [showKey, setShowKey] = useState(false);

  // Load saved keys from localStorage
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('ai_api_keys') || '{}');
      if (saved.gemini || saved.gpt) {
        setApiKeys({
          gemini: saved.gemini || '',
          gpt: saved.gpt || '',
        });
        setUseOwnKey(!!(saved.gemini || saved.gpt));
      }
    } catch {}
  }, []);

  const currentModel = MODELS.find((m) => m.value === selectedModel) || MODELS[0];

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      setError('이미지 용량은 4MB 이하여야 합니다.');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setImage(reader.result);
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const clearImage = () => {
    setImage(null);
    setImagePreview(null);
  };

  const persistApiKeys = (next) => {
    setApiKeys(next);
    try {
      localStorage.setItem('ai_api_keys', JSON.stringify(next));
    } catch {}
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setGeneratedPrompts([]);

    try {
      const keyToUse = useOwnKey ? apiKeys[selectedModel] : undefined;
      if (useOwnKey && !keyToUse) {
        throw new Error(
          `${currentModel.shortLabel} API 키를 입력해주세요.`,
        );
      }

      const result = await generatePromptsAction({
        targetGroup: targetId,
        difficulty,
        topic,
        image,
        model: selectedModel,
        count,
        apiKey: keyToUse,
      });

      if (!result.success) throw new Error(result.error);
      setGeneratedPrompts(result.data);
      setSelectedIndices(result.data.map((_, i) => i));
    } catch (err) {
      let msg = err.message || '생성 실패. 다시 시도해주세요.';
      if (typeof msg === 'string' && msg.includes('Server Components render')) {
        msg = '이미지 용량이 너무 큽니다. 더 작은 이미지를 사용하거나 제거해주세요.';
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelection = (index) => {
    setSelectedIndices((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index],
    );
  };

  const handleSave = () => {
    const promptsToSave = selectedIndices.map((i) => ({
      ...generatedPrompts[i],
      difficulty,
    }));
    onSuccess(promptsToSave);
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-3 border-b border-border pb-5">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/40 bg-violet-500/10 px-2.5 py-0.5 text-xs font-semibold text-violet-600 dark:text-violet-300">
            <Wand2 size={11} /> AI Generator
          </span>
          <h2 className="mt-3 font-display text-2xl tracking-tight text-foreground sm:text-3xl">
            AI 자동 생성
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            주제와 상황을 입력하면 교육용 프롬프트를 자동으로 설계해드려요.
          </p>
        </div>
        <button
          onClick={onClose}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition hover:text-foreground"
          title="닫기"
        >
          <X size={16} />
        </button>
      </div>

      {generatedPrompts.length === 0 ? (
        // =========================================================
        //                       FORM
        // =========================================================
        <form onSubmit={handleGenerate} className="flex flex-col gap-5">
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
              학습 주제 / 상황 *
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="예: 초등학생 대상 환경 보호 캠페인 기획"
              required
              className="w-full rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm text-foreground outline-none transition focus:border-brand-500 focus:bg-card focus:ring-2 focus:ring-brand-500/20"
            />
          </div>

          {/* Model + difficulty + count */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_110px]">
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                AI 모델
              </label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full rounded-xl border border-border bg-muted/40 px-3 py-3 text-sm text-foreground outline-none focus:border-brand-500 focus:bg-card"
              >
                {MODELS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                난이도
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="w-full rounded-xl border border-border bg-muted/40 px-3 py-3 text-sm text-foreground outline-none focus:border-brand-500 focus:bg-card"
              >
                <option value="beginner">초급</option>
                <option value="intermediate">중급</option>
                <option value="advanced">고급</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                생성 개수
              </label>
              <input
                type="number"
                min="1"
                max="5"
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                className="w-full rounded-xl border border-border bg-muted/40 px-3 py-3 text-sm text-foreground outline-none focus:border-brand-500 focus:bg-card"
              />
            </div>
          </div>

          {/* API key section */}
          <div className="rounded-2xl border border-border bg-muted/30 p-4">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={useOwnKey}
                onChange={(e) => setUseOwnKey(e.target.checked)}
                className="mt-0.5 accent-brand-600"
              />
              <div className="flex-1">
                <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                  <KeyRound size={13} /> 내 API 키 사용하기
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  서버 공용 키 대신 개인 API 키로 호출합니다. 키는 <b>이 브라우저에만</b>{' '}
                  저장돼요.
                </p>
              </div>
            </label>

            {useOwnKey && (
              <div className="mt-3 flex flex-col gap-2">
                <div className="relative">
                  <KeyRound
                    size={14}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  />
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={apiKeys[selectedModel] || ''}
                    onChange={(e) =>
                      persistApiKeys({ ...apiKeys, [selectedModel]: e.target.value })
                    }
                    placeholder={`${currentModel.shortLabel} API Key (${currentModel.keyName})`}
                    className="w-full rounded-lg border border-border bg-card py-2.5 pl-9 pr-10 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                    autoComplete="off"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                    title={showKey ? '숨기기' : '보이기'}
                  >
                    {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                <a
                  href={currentModel.getKeyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-fit items-center gap-1 text-xs font-semibold text-brand-600 hover:underline dark:text-brand-300"
                >
                  <ExternalLink size={11} /> {currentModel.shortLabel} API 키 발급받기
                </a>
                <div className="flex items-start gap-1.5 rounded-lg bg-brand-500/5 p-2 text-[11px] text-muted-foreground">
                  <Info size={12} className="mt-0.5 shrink-0 text-brand-600 dark:text-brand-300" />
                  <span>
                    Gemini는 무료 할당량 내에서 테스트 가능하고, GPT는 유료 요금이 부과될
                    수 있어요.
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Optional image */}
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
              참고 이미지 (선택)
            </label>
            {imagePreview ? (
              <div className="relative overflow-hidden rounded-xl border border-border">
                <img
                  src={imagePreview}
                  alt="preview"
                  className="block max-h-56 w-full object-contain bg-muted/40"
                />
                <button
                  type="button"
                  onClick={clearImage}
                  className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-background/80 text-muted-foreground backdrop-blur hover:text-foreground"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-border bg-card p-3 text-sm text-muted-foreground transition hover:border-brand-400 hover:text-foreground">
                <ImageIcon size={16} />
                <span>이미지를 선택하세요 (최대 4MB · 이미지 기반 프롬프트 생성)</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
              <AlertCircle size={14} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !topic}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 via-brand-500 to-accent-400 px-4 py-3.5 text-base font-bold text-white shadow-lg shadow-violet-500/25 transition hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" /> AI가 생각 중...
              </>
            ) : (
              <>
                <Sparkles size={16} /> 프롬프트 {count}개 생성하기
              </>
            )}
          </button>
        </form>
      ) : (
        // =========================================================
        //                      PREVIEW
        // =========================================================
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-1.5 text-base font-bold text-foreground">
              <Sparkles size={15} className="text-accent-400" />
              <span className="font-display">{generatedPrompts.length}개의 결과</span>
              <span className="text-xs font-normal text-muted-foreground">
                · {selectedIndices.length}개 선택됨
              </span>
            </h3>
            <button
              onClick={() => setGeneratedPrompts([])}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:border-brand-400 hover:text-foreground"
            >
              <RefreshCw size={12} /> 다시 만들기
            </button>
          </div>

          <div className="flex flex-col gap-3">
            {generatedPrompts.map((item, idx) => {
              const isSelected = selectedIndices.includes(idx);
              return (
                <button
                  type="button"
                  key={idx}
                  onClick={() => toggleSelection(idx)}
                  className={cn(
                    'group relative flex w-full flex-col gap-2 rounded-2xl border p-4 text-left transition',
                    isSelected
                      ? 'border-violet-500/60 bg-violet-500/5 shadow-md shadow-violet-500/10'
                      : 'border-border bg-card hover:border-brand-400',
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="pr-6 text-sm font-bold text-foreground">
                      {idx + 1}. {item.title}
                    </h4>
                    <span className="absolute right-3 top-3">
                      {isSelected ? (
                        <CheckCircle2 className="text-violet-500" size={18} />
                      ) : (
                        <Circle className="text-muted-foreground" size={18} />
                      )}
                    </span>
                  </div>
                  <div className="rounded-lg border border-dashed border-border bg-muted/30 p-2.5 text-xs text-foreground/80">
                    {item.content}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    <b className="text-foreground/80">예상 답변:</b>{' '}
                    {(item.expected_answer || '').substring(0, 100)}
                    {(item.expected_answer || '').length > 100 && '...'}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-2 flex items-center justify-end gap-2 border-t border-border pt-4">
            <button
              onClick={() => setGeneratedPrompts([])}
              className="rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-muted-foreground hover:border-brand-400 hover:text-foreground"
            >
              취소
            </button>
            <button
              onClick={handleSave}
              disabled={loading || selectedIndices.length === 0}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-success-500 to-brand-500 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-success-500/20 transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save size={14} /> {selectedIndices.length}개 저장하기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
