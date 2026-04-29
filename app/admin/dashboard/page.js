'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Shield, Users, FileText, KeyRound, Plus, Trash2, Eye, EyeOff,
  ArrowRight, Sparkles, AlertCircle, Loader2, UserPlus, Lock,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {
  createAccountAction,
  changePasswordAction,
  migratePlainPasswordsAction,
} from '@/app/actions/auth';
import { cn } from '@/lib/utils';

export default function AdminDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('prompts');

  const [accounts, setAccounts] = useState([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [passwords, setPasswords] = useState({});
  const [showPasswords, setShowPasswords] = useState({});

  const [isCreating, setIsCreating] = useState(false);
  const [newAccount, setNewAccount] = useState({
    username: '',
    password: '',
    display_name: '',
  });

  useEffect(() => {
    try {
      const session = localStorage.getItem('admin_session');
      if (!session) {
        router.push('/admin/login');
        return;
      }
      fetchAccounts();
    } catch {
      router.push('/admin/login');
    }
  }, [router]);

  const fetchAccounts = async () => {
    setLoadingAccounts(true);
    const { data, error } = await supabase
      .from('accounts')
      .select('id, username, display_name, role, created_at')
      .neq('role', 'admin')
      .order('created_at');
    if (!error) {
      setAccounts(data || []);
      // Don't pre-fill the input with the hashed password — show empty,
      // admin types a new password to change it.
      const init = {};
      data?.forEach((a) => (init[a.id] = ''));
      setPasswords(init);
    }
    setLoadingAccounts(false);
  };

  const handlePasswordChange = async (userId) => {
    const newPassword = passwords[userId];
    if (!newPassword || newPassword.length < 4) {
      alert('비밀번호는 4자리 이상이어야 합니다.');
      return;
    }
    if (!confirm('해당 사용자의 비밀번호를 변경하시겠습니까?')) return;
    const result = await changePasswordAction({ userId, newPassword });
    if (!result.success) alert('변경 실패: ' + result.error);
    else {
      alert('비밀번호가 성공적으로 변경되었습니다 (해시 저장).');
      // Clear the input so the (now hashed) password isn't visible
      setPasswords((p) => ({ ...p, [userId]: '' }));
    }
  };

  const handleDeleteAccount = async (userId, username) => {
    if (
      !confirm(
        `정말로 '${username}' 그룹을 삭제하시겠습니까?\n\n※ 주의: 해당 그룹에 속한 모든 프롬프트가 함께 영구 삭제됩니다.`,
      )
    )
      return;

    await supabase.from('prompts').delete().eq('created_by', userId);
    await supabase.from('prompts').delete().eq('target_group', username);
    const { error } = await supabase.from('accounts').delete().eq('id', userId);
    if (error) alert('계정 삭제 실패: ' + error.message);
    else {
      alert('그룹 및 관련 프롬프트가 모두 삭제되었습니다.');
      fetchAccounts();
    }
  };

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    if (!newAccount.username || !newAccount.password) return;
    const result = await createAccountAction({
      username: newAccount.username,
      password: newAccount.password,
      display_name: newAccount.display_name || newAccount.username,
      role: 'student',
    });
    if (!result.success) {
      alert('생성 실패: ' + result.error + '\n(ID 중복 혹은 시스템 오류)');
      return;
    }
    alert('새로운 그룹(계정)이 생성되었습니다.');
    setIsCreating(false);
    setNewAccount({ username: '', password: '', display_name: '' });
    fetchAccounts();
  };

  const handleAdminPasswordChange = async () => {
    const newPassword = prompt('새로운 관리자 비밀번호를 입력하세요:');
    if (!newPassword) return;
    try {
      const session = JSON.parse(localStorage.getItem('admin_session'));
      const result = await changePasswordAction({
        userId: session.id,
        newPassword,
      });
      if (!result.success) alert('비밀번호 변경 실패: ' + result.error);
      else alert('관리자 비밀번호가 변경되었습니다.');
    } catch {
      alert('관리자 세션 오류');
    }
  };

  const handleMigratePasswords = async () => {
    if (!confirm('아직 평문으로 저장된 모든 계정의 비밀번호를 일괄 해시합니다.\n진행하시겠습니까?')) return;
    const result = await migratePlainPasswordsAction();
    if (result.success) {
      alert(`완료: ${result.total}개 중 ${result.migrated}개를 해시 처리했습니다.`);
    } else {
      alert('마이그레이션 실패: ' + result.error);
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl pb-16">
      {/* -------- Header -------- */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-accent-400/40 bg-accent-400/10 px-3 py-1 text-xs font-semibold text-accent-500">
            <Shield size={12} /> Admin
          </span>
          <h1 className="mt-3 font-display text-3xl tracking-tight text-foreground sm:text-4xl">
            관리자 대시보드
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            프롬프트 및 사용자 계정을 관리합니다.
          </p>
        </div>
      </div>

      {/* -------- Stats -------- */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard
          Icon={Users}
          label="등록된 그룹"
          value={accounts.length}
          gradient="from-brand-500 to-violet-500"
        />
        <StatCard
          Icon={FileText}
          label="활성 상태"
          value={accounts.length ? '정상' : '없음'}
          gradient="from-violet-500 to-accent-400"
        />
        <StatCard
          Icon={Sparkles}
          label="시스템"
          value="Prompt Lab"
          gradient="from-success-500 to-brand-500"
          className="col-span-2 sm:col-span-1"
        />
      </div>

      {/* -------- Tabs -------- */}
      <div className="mb-6 flex gap-1 rounded-xl border border-border bg-muted/50 p-1">
        <TabButton active={activeTab === 'prompts'} onClick={() => setActiveTab('prompts')}>
          <FileText size={14} /> 프롬프트 관리
        </TabButton>
        <TabButton active={activeTab === 'accounts'} onClick={() => setActiveTab('accounts')}>
          <Users size={14} /> 계정 관리
        </TabButton>
      </div>

      {/* =========================================================== */}
      {/*                     PROMPTS TAB                              */}
      {/* =========================================================== */}
      {activeTab === 'prompts' && (
        <section>
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-brand-200 bg-brand-50 p-5 dark:border-brand-900 dark:bg-brand-900/20">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-white shadow-sm">
              <Sparkles size={16} />
            </div>
            <div className="text-sm leading-relaxed text-brand-900 dark:text-brand-100">
              <p className="mb-1 font-semibold">프롬프트 관리 방법</p>
              <p>
                관리를 원하는 대상 유형을 선택하면 해당 학습 페이지로 이동합니다.
                이동한 페이지에서{' '}
                <span className="inline-flex items-center gap-1 rounded-md border border-accent-400/40 bg-accent-400/10 px-1.5 py-0.5 text-[11px] font-semibold text-accent-500">
                  <Shield size={10} /> 관리자 모드
                </span>{' '}
                가 활성화되며, 자유롭게 프롬프트를 추가 · 수정 · 삭제할 수 있습니다.
              </p>
            </div>
          </div>

          {loadingAccounts ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="h-36 animate-pulse rounded-2xl border border-border bg-muted"
                />
              ))}
            </div>
          ) : accounts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-muted/30 py-16 text-center text-muted-foreground">
              <UserPlus className="mx-auto mb-3 text-muted-foreground" size={32} />
              생성된 그룹이 없습니다.
              <br />
              <button
                onClick={() => setActiveTab('accounts')}
                className="mt-3 text-sm font-semibold text-brand-600 underline-offset-2 hover:underline"
              >
                계정 관리에서 그룹을 추가
              </button>
              해주세요.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {accounts.map((account, idx) => {
                const gradients = [
                  'from-brand-500 to-violet-500',
                  'from-violet-500 to-accent-400',
                  'from-accent-400 to-brand-400',
                  'from-success-500 to-brand-500',
                  'from-brand-600 to-brand-400',
                  'from-violet-600 to-accent-500',
                ];
                const gradient = gradients[idx % gradients.length];
                return (
                  <button
                    key={account.id}
                    onClick={() => router.push(`/learn/${account.username}`)}
                    className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 text-left shadow-sm transition-all hover:-translate-y-1 hover:border-brand-400 hover:shadow-xl"
                  >
                    <div
                      aria-hidden
                      className={cn(
                        'absolute inset-0 bg-gradient-to-br opacity-0 transition-opacity duration-300 group-hover:opacity-10',
                        gradient,
                      )}
                    />
                    <div className="relative flex items-start justify-between">
                      <div
                        className={cn(
                          'flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md',
                          gradient,
                        )}
                      >
                        <Users size={20} />
                      </div>
                      <ArrowRight
                        size={16}
                        className="text-muted-foreground transition-all group-hover:translate-x-1 group-hover:text-brand-600"
                      />
                    </div>
                    <h3 className="relative mt-4 text-base font-bold text-foreground">
                      {account.display_name}
                    </h3>
                    <p className="relative mt-0.5 text-xs text-muted-foreground">
                      @{account.username}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* =========================================================== */}
      {/*                    ACCOUNTS TAB                              */}
      {/* =========================================================== */}
      {activeTab === 'accounts' && (
        <section className="space-y-6">
          {/* Admin password card */}
          <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-border bg-card p-5 sm:flex-row sm:items-center">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-accent-400 to-accent-600 text-white shadow-sm">
                <Lock size={18} />
              </div>
              <div>
                <h3 className="font-bold text-foreground">관리자 계정 설정</h3>
                <p className="text-xs text-muted-foreground">
                  관리자 계정의 비밀번호를 안전하게 관리하세요.
                </p>
              </div>
            </div>
            <button
              onClick={handleAdminPasswordChange}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm font-semibold text-foreground transition hover:border-accent-400 hover:bg-accent-400/10 hover:text-accent-500"
            >
              <KeyRound size={14} /> 관리자 비밀번호 변경
            </button>
          </div>

          {/* Security migration card */}
          <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-success-500/30 bg-success-500/5 p-5 sm:flex-row sm:items-center">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-success-500 to-brand-500 text-white shadow-sm">
                <Shield size={18} />
              </div>
              <div>
                <h3 className="font-bold text-foreground">비밀번호 일괄 해시화</h3>
                <p className="text-xs text-muted-foreground">
                  과거에 평문으로 저장된 모든 계정 비밀번호를 한 번에 bcrypt 해시로 변환합니다.
                  로그인할 때마다 자동으로도 변환되지만, 한 번에 마무리하려면 클릭하세요.
                </p>
              </div>
            </div>
            <button
              onClick={handleMigratePasswords}
              className="inline-flex items-center gap-1.5 rounded-lg border border-success-500/40 bg-card px-3 py-2 text-sm font-semibold text-success-600 transition hover:bg-success-500/10 dark:text-success-500"
            >
              <Shield size={14} /> 일괄 해시 실행
            </button>
          </div>

          {/* Add group button */}
          <div className="flex justify-end">
            <button
              onClick={() => setIsCreating((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-brand-600 to-violet-500 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-brand-500/25 transition hover:shadow-xl"
            >
              <Plus size={16} /> 그룹(계정) 추가
            </button>
          </div>

          {/* Create form */}
          {isCreating && (
            <div className="rounded-2xl border border-border bg-muted/30 p-5">
              <h4 className="font-bold text-foreground">새 그룹(계정) 생성</h4>
              <p className="mt-1 text-xs text-muted-foreground">
                영문/한글 ID 사용이 가능합니다. 주소창에 입력할 ID로 사용됩니다.
                (예: &#39;영업팀&#39; 생성 시 → /learn/영업팀)
              </p>
              <form
                onSubmit={handleCreateAccount}
                className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
              >
                <div>
                  <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                    그룹 ID (이름)
                  </label>
                  <input
                    type="text"
                    value={newAccount.username}
                    onChange={(e) =>
                      setNewAccount({ ...newAccount, username: e.target.value })
                    }
                    placeholder="예: 영업팀"
                    required
                    className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                    비밀번호
                  </label>
                  <input
                    type="text"
                    value={newAccount.password}
                    onChange={(e) =>
                      setNewAccount({ ...newAccount, password: e.target.value })
                    }
                    required
                    className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="rounded-lg bg-gradient-to-r from-brand-600 to-violet-500 px-4 py-2 text-sm font-bold text-white shadow-md"
                  >
                    생성
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCreating(false)}
                    className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
                  >
                    취소
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Accounts list */}
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            {/* Desktop table */}
            <table className="hidden w-full md:table">
              <thead className="bg-muted/50 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">아이디 (그룹명)</th>
                  <th className="px-4 py-3">표시 이름</th>
                  <th className="px-4 py-3">비밀번호 관리</th>
                  <th className="w-20 px-4 py-3 text-center">작업</th>
                </tr>
              </thead>
              <tbody>
                {loadingAccounts ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-muted-foreground">
                      <Loader2 className="mx-auto animate-spin" size={20} />
                    </td>
                  </tr>
                ) : accounts.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-muted-foreground">
                      등록된 그룹이 없습니다.
                    </td>
                  </tr>
                ) : (
                  accounts.map((acc) => (
                    <AccountRow
                      key={acc.id}
                      account={acc}
                      password={passwords[acc.id] ?? acc.password}
                      show={!!showPasswords[acc.id]}
                      onPasswordChange={(v) =>
                        setPasswords({ ...passwords, [acc.id]: v })
                      }
                      onToggleShow={() =>
                        setShowPasswords((p) => ({ ...p, [acc.id]: !p[acc.id] }))
                      }
                      onSave={() => handlePasswordChange(acc.id)}
                      onDelete={() => handleDeleteAccount(acc.id, acc.username)}
                    />
                  ))
                )}
              </tbody>
            </table>

            {/* Mobile cards */}
            <div className="flex flex-col gap-3 p-3 md:hidden">
              {loadingAccounts ? (
                <div className="py-8 text-center text-muted-foreground">
                  <Loader2 className="mx-auto animate-spin" size={20} />
                </div>
              ) : accounts.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  등록된 그룹이 없습니다.
                </div>
              ) : (
                accounts.map((acc) => (
                  <div
                    key={acc.id}
                    className="rounded-xl border border-border bg-card p-3"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-bold text-foreground">
                          {acc.display_name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          @{acc.username}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteAccount(acc.id, acc.username)}
                        className="rounded-lg p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                        title="계정 삭제"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <div className="relative flex-1">
                        <input
                          type={showPasswords[acc.id] ? 'text' : 'password'}
                          value={passwords[acc.id] ?? acc.password}
                          onChange={(e) =>
                            setPasswords({
                              ...passwords,
                              [acc.id]: e.target.value,
                            })
                          }
                          className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2 pr-8 text-sm outline-none focus:border-brand-500"
                        />
                        <button
                          onClick={() =>
                            setShowPasswords((p) => ({
                              ...p,
                              [acc.id]: !p[acc.id],
                            }))
                          }
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                          type="button"
                        >
                          {showPasswords[acc.id] ? (
                            <EyeOff size={14} />
                          ) : (
                            <Eye size={14} />
                          )}
                        </button>
                      </div>
                      <button
                        onClick={() => handlePasswordChange(acc.id)}
                        className="rounded-lg border border-border bg-muted px-3 py-2 text-xs font-semibold text-foreground hover:border-brand-400"
                      >
                        변경
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function StatCard({ Icon, label, value, gradient, className }) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-sm',
        className,
      )}
    >
      <div
        aria-hidden
        className={cn(
          'absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br opacity-15 blur-2xl',
          gradient,
        )}
      />
      <div className="relative flex items-center gap-3">
        <div
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm',
            gradient,
          )}
        >
          <Icon size={18} />
        </div>
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {label}
          </div>
          <div className="font-display text-lg tracking-tight text-foreground">
            {value}
          </div>
        </div>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-1 items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition',
        active
          ? 'bg-card text-foreground shadow-sm'
          : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {children}
    </button>
  );
}

function AccountRow({
  account,
  password,
  show,
  onPasswordChange,
  onToggleShow,
  onSave,
  onDelete,
}) {
  return (
    <tr className="border-t border-border hover:bg-muted/30">
      <td className="px-4 py-3 text-sm font-semibold text-foreground">
        {account.username}
      </td>
      <td className="px-4 py-3 text-sm text-muted-foreground">
        {account.display_name}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="relative max-w-xs flex-1">
            <input
              type={show ? 'text' : 'password'}
              value={password}
              onChange={(e) => onPasswordChange(e.target.value)}
              placeholder="새 비밀번호 입력 후 변경"
              className="w-full rounded-lg border border-border bg-muted/50 px-3 py-1.5 pr-9 text-sm outline-none focus:border-brand-500"
            />
            <button
              onClick={onToggleShow}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              type="button"
            >
              {show ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          <button
            onClick={onSave}
            className="rounded-lg border border-border bg-muted px-3 py-1.5 text-xs font-semibold text-foreground hover:border-brand-400"
          >
            변경
          </button>
        </div>
      </td>
      <td className="px-4 py-3 text-center">
        <button
          onClick={onDelete}
          className="rounded-lg p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
          title="계정 삭제"
        >
          <Trash2 size={15} />
        </button>
      </td>
    </tr>
  );
}
