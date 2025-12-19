'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AdminDashboard() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState('prompts');

    // Account Management State
    const [accounts, setAccounts] = useState([]);
    const [loadingAccounts, setLoadingAccounts] = useState(false);
    const [passwords, setPasswords] = useState({}); // Stores input password for each user id
    const [showPasswords, setShowPasswords] = useState({}); // Stores visibility state for each user id

    // Create Account State
    const [isCreating, setIsCreating] = useState(false);
    const [newAccount, setNewAccount] = useState({ username: '', password: '', display_name: '' });

    // Initial targets (legacy/default list)
    const targets = [
        { id: 'business', name: '비즈니스' },
        { id: 'public', name: '공공기관' },
        { id: 'univ', name: '대학' },
        { id: 'elem', name: '초등학교' },
        { id: 'middle', name: '중학교' },
        { id: 'high', name: '고등학교' },
        { id: 'adult', name: '일반성인 (기초)' },
    ];

    const targetNameMap = targets.reduce((acc, t) => ({ ...acc, [t.id]: t.name }), {});

    useEffect(() => {
        const checkAdmin = () => {
            try {
                const session = localStorage.getItem('admin_session');
                if (!session) {
                    router.push('/admin/login');
                    return;
                }
                fetchAccounts();
            } catch (e) {
                console.error("Local storage error:", e);
                router.push('/admin/login');
            }
        };
        checkAdmin();
    }, [router]);

    const fetchAccounts = async () => {
        setLoadingAccounts(true);
        const { data, error } = await supabase.from('accounts').select('*').neq('role', 'admin').order('created_at');
        if (!error) {
            setAccounts(data || []);
            // Initialize passwords with current values
            const initialPasswords = {};
            data?.forEach(acc => initialPasswords[acc.id] = acc.password);
            setPasswords(initialPasswords);
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

        const { error } = await supabase.from('accounts').update({ password: newPassword }).eq('id', userId);

        if (error) {
            alert('변경 실패: ' + error.message);
        } else {
            alert('비밀번호가 성공적으로 변경되었습니다.');
        }
    };

    const handleDeleteAccount = async (userId, username) => {
        if (!confirm(`정말로 '${username}' 그룹을 삭제하시겠습니까?\n\n※ 주의: 해당 그룹에 속한 모든 프롬프트가 함께 영구 삭제됩니다.`)) return;

        // 1. Delete associated prompts first (by target_group OR created_by)
        // Deleting by created_by is crucial for FK constraints on account ID
        const { error: promptError1 } = await supabase.from('prompts').delete().eq('created_by', userId);
        if (promptError1) {
            console.error("Error deleting prompts by created_by:", promptError1);
            // Continue? Or stop? Let's try to continue or at least clean up target_group too.
        }

        const { error: promptError2 } = await supabase.from('prompts').delete().eq('target_group', username);
        if (promptError2) {
            console.error("Error deleting prompts by target_group:", promptError2);
        }

        // 2. Delete the account
        const { error } = await supabase.from('accounts').delete().eq('id', userId);
        if (error) {
            alert("계정 삭제 실패: " + error.message);
        } else {
            alert("그룹 및 관련 프롬프트가 모두 삭제되었습니다.");
            fetchAccounts();
        }
    };

    const handleCreateAccount = async (e) => {
        e.preventDefault();
        if (!newAccount.username || !newAccount.password) return;

        try {
            // Fixed Role Assignment Logic
            // Default to 'user', which should be a valid role in the check constraint.


            const payload = {
                username: newAccount.username,
                password: newAccount.password,
                display_name: newAccount.display_name || newAccount.username,

                role: 'student' // Fixed: DB requires 'student' or 'admin'
            };

            console.log("Creating account with payload:", payload);
            const { error } = await supabase.from('accounts').insert([payload]);

            if (error) {
                console.error("Account Creation Error:", error);
                throw error;
            }

            alert("새로운 그룹(계정)이 생성되었습니다.");
            setIsCreating(false);
            setNewAccount({ username: '', password: '', display_name: '' });
            fetchAccounts();
        } catch (e) {
            alert("생성 실패: " + e.message + "\n(ID 중복 혹은 시스템 오류)");
        }
    };

    const handleAdminPasswordChange = async () => {
        const newPassword = prompt("새로운 관리자 비밀번호를 입력하세요:");
        if (!newPassword) return;

        try {
            const adminSessionStr = localStorage.getItem('admin_session');
            if (adminSessionStr) {
                const adminSession = JSON.parse(adminSessionStr);
                const { error } = await supabase.from('accounts').update({ password: newPassword }).eq('id', adminSession.id);

                if (error) alert("비밀번호 변경 실패: " + error.message);
                else alert("관리자 비밀번호가 변경되었습니다. 다음 로그인부터 적용됩니다.");
            }
        } catch (e) {
            console.error("Local storage error:", e);
            alert("관리자 세션 정보를 불러오는 중 오류가 발생했습니다.");
        }
    };

    return (
        <div className="centered-container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 2rem', paddingBottom: '4rem' }}>
            <div style={{ marginBottom: '3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span>🛡️</span> 관리자 대시보드
                    </h1>
                    <p style={{ color: '#64748b' }}>프롬프트 및 사용자 계정을 관리합니다.</p>
                </div>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid #e2e8f0' }}>
                <button
                    onClick={() => setActiveTab('prompts')}
                    style={{
                        padding: '1rem 1.5rem',
                        fontWeight: 600,
                        color: activeTab === 'prompts' ? '#2563eb' : '#64748b',
                        borderBottom: activeTab === 'prompts' ? '2px solid #2563eb' : 'none',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '1.05rem'
                    }}
                >
                    프롬프트 관리
                </button>
                <button
                    onClick={() => setActiveTab('accounts')}
                    style={{
                        padding: '1rem 1.5rem',
                        fontWeight: 600,
                        color: activeTab === 'accounts' ? '#2563eb' : '#64748b',
                        borderBottom: activeTab === 'accounts' ? '2px solid #2563eb' : 'none',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '1.05rem'
                    }}
                >
                    계정 관리
                </button>
            </div>

            {/* Prompt Management Tab */}
            {activeTab === 'prompts' && (
                <div>
                    <div style={{ background: '#eff6ff', border: '1px solid #dbeafe', borderRadius: '0.5rem', padding: '1.5rem', marginBottom: '2rem' }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e40af', marginBottom: '0.5rem' }}>
                            💡 프롬프트 관리 방법
                        </h3>
                        <p style={{ color: '#1e3a8a', lineHeight: '1.6' }}>
                            관리를 원하는 <strong>대상 유형을 선택</strong>하면 해당 학습 페이지로 이동합니다.<br />
                            이동한 페이지에서 <span style={{ background: '#fff7ed', color: '#c2410c', padding: '0.1rem 0.4rem', borderRadius: '4px', fontSize: '0.85rem', border: '1px solid #fed7aa' }}>관리자 모드</span> 가 활성화되며, 자유롭게 프롬프트를 <strong>추가, 수정, 삭제</strong>할 수 있습니다.
                        </p>
                    </div>

                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                        gap: '1.5rem'
                    }}>
                        {/* Default Targets */}
                        {targets.map((target) => (
                            <div
                                key={target.id}
                                onClick={() => router.push(`/learn/${target.id}`)}
                                style={{
                                    background: 'white',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '0.75rem',
                                    padding: '2rem',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    textAlign: 'center',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                }}
                            >
                                <div style={{ fontSize: '2rem', marginBottom: '1rem', color: '#3b82f6' }}>
                                    🏢 {/* Placeholder Emoji */}
                                </div>
                                <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#1e293b', marginBottom: '0.5rem' }}>
                                    {target.name}
                                </h3>
                                <p style={{ fontSize: '0.9rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                    관리하기 <span>➡️</span>
                                </p>
                            </div>
                        ))}
                    </div>

                    {/* Note: User created accounts also appear here? 
                        Originally they are just targets. 
                        If accounts are groups, we should list accounts too?
                        The original code only listed hardcoded targets.
                        I will stick to hardcoded + maybe dynamic?
                        For now, leaving as is to fix errors first.
                    */}
                </div>
            )}

            {/* Account Management Tab */}
            {activeTab === 'accounts' && (
                <div>
                    {/* Admin Password Change Card */}
                    <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '0.5rem', padding: '1.5rem', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                        <div>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.25rem' }}>관리자 계정 설정</h3>
                            <p style={{ color: '#64748b', fontSize: '0.9rem' }}>관리자 계정의 비밀번호를 안전하게 관리하세요.</p>
                        </div>
                        <button
                            onClick={handleAdminPasswordChange}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '0.5rem 1rem',
                                background: 'white',
                                border: '1px solid #e2e8f0',
                                borderRadius: '0.5rem',
                                cursor: 'pointer',
                                fontSize: '0.9rem',
                                color: '#475569',
                                fontWeight: 500
                            }}
                        >
                            <span>🔑</span> 관리자 비밀번호 변경
                        </button>
                    </div>

                    <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                            onClick={() => setIsCreating(!isCreating)}
                            className="btn btn-primary"
                            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                        >
                            <span>➕</span> 그룹(계정) 추가
                        </button>
                    </div>

                    {/* Create Account Form */}
                    {isCreating && (
                        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', p: '1.5rem', borderRadius: '0.5rem', marginBottom: '2rem', padding: '1.5rem' }}>
                            <h4 style={{ marginBottom: '1rem', fontWeight: 600 }}>새 그룹(계정) 생성</h4>
                            <p style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '1rem' }}>
                                영문/한글 ID 사용이 가능합니다. 주소창에 입력할 ID로 사용됩니다.<br />
                                (예: '영업팀' 생성 시 -&gt; /learn/영업팀)
                            </p>
                            <form onSubmit={handleCreateAccount} style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'end' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem', color: '#64748b' }}>그룹 ID (이름)</label>
                                    <input
                                        type="text"
                                        value={newAccount.username}
                                        onChange={(e) => {
                                            setNewAccount({ ...newAccount, username: e.target.value });
                                            // Optional: Auto-fill display name?
                                        }}
                                        placeholder="예: 영업팀"
                                        required
                                        style={{ padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '0.25rem', minWidth: '150px' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem', color: '#64748b' }}>비밀번호</label>
                                    <input
                                        type="text"
                                        value={newAccount.password}
                                        onChange={(e) => setNewAccount({ ...newAccount, password: e.target.value })}
                                        required
                                        style={{ padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '0.25rem' }}
                                    />
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button type="submit" className="btn btn-primary" style={{ padding: '0.5rem 1rem' }}>생성하기</button>
                                    <button type="button" onClick={() => setIsCreating(false)} className="btn" style={{ background: 'white', border: '1px solid #cbd5e1', padding: '0.5rem 1rem' }}>취소</button>
                                </div>
                            </form>
                        </div>
                    )}

                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white', borderRadius: '0.5rem', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                            <thead style={{ background: '#f8fafc' }}>
                                <tr>
                                    <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #e2e8f0', width: '25%', color: '#64748b', fontWeight: 600 }}>아이디 (그룹명)</th>
                                    <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #e2e8f0', width: '20%', color: '#64748b', fontWeight: 600 }}>표시 이름</th>
                                    <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #e2e8f0', width: '40%', color: '#64748b', fontWeight: 600 }}>비밀번호 관리</th>
                                    <th style={{ padding: '1rem', textAlign: 'center', borderBottom: '1px solid #e2e8f0', width: '15%', color: '#64748b', fontWeight: 600 }}>작업</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loadingAccounts ? (
                                    <tr><td colSpan="4" style={{ padding: '2rem', textAlign: 'center' }}>데이터를 불러오는 중...</td></tr>
                                ) : accounts.map((account) => (
                                    <tr key={account.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                        <td style={{ padding: '1rem', fontWeight: 500, color: '#334155' }}>
                                            {account.username}
                                        </td>
                                        <td style={{ padding: '1rem', color: '#64748b' }}>
                                            {account.display_name}
                                        </td>
                                        <td style={{ padding: '1rem' }}>
                                            <div style={{ display: 'flex', gap: '0.5rem', maxWidth: '300px', alignItems: 'center' }}>
                                                <div style={{ position: 'relative', flex: 1 }}>
                                                    <input
                                                        type={showPasswords[account.id] ? "text" : "password"}
                                                        placeholder="비밀번호"
                                                        value={passwords[account.id] !== undefined ? passwords[account.id] : account.password}
                                                        onChange={(e) => setPasswords({ ...passwords, [account.id]: e.target.value })}
                                                        style={{ padding: '0.5rem', paddingRight: '2.5rem', borderRadius: '4px', border: '1px solid #cbd5e1', width: '100%' }}
                                                    />
                                                    <button
                                                        onClick={() => setShowPasswords(prev => ({ ...prev, [account.id]: !prev[account.id] }))}
                                                        style={{
                                                            position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)',
                                                            background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex'
                                                        }}
                                                    >
                                                        {showPasswords[account.id] ? <span>🙈</span> : <span>👁️</span>}
                                                    </button>
                                                </div>
                                                <button
                                                    onClick={() => handlePasswordChange(account.id)}
                                                    className="btn"
                                                    style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', whiteSpace: 'nowrap', padding: '0.5rem 0.75rem', fontSize: '0.9rem' }}
                                                >
                                                    변경
                                                </button>
                                            </div>
                                        </td>
                                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                                            <button
                                                onClick={() => handleDeleteAccount(account.id, account.username)}
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '0.5rem' }}
                                                title="계정 삭제"
                                            >
                                                🗑️
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
