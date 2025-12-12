'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Users, Building2, GraduationCap, School, Baby, User, ShieldCheck, KeyRound, LogOut, ChevronRight } from 'lucide-react';

export default function AdminDashboard() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState('prompts');

    // Account Management State
    const [accounts, setAccounts] = useState([]);
    const [loadingAccounts, setLoadingAccounts] = useState(false);
    const [passwords, setPasswords] = useState({}); // Stores input password for each user id

    const targets = [
        { id: 'business', name: '비즈니스', icon: <Building2 size={32} /> },
        { id: 'public', name: '공공기관', icon: <Users size={32} /> },
        { id: 'univ', name: '대학', icon: <GraduationCap size={32} /> },
        { id: 'elem', name: '초등학교', icon: <Baby size={32} /> },
        { id: 'middle', name: '중학교', icon: <School size={32} /> },
        { id: 'high', name: '고등학교', icon: <School size={32} /> },
        { id: 'adult', name: '일반성인 (기초)', icon: <User size={32} /> },
    ];

    useEffect(() => {
        const checkAdmin = () => {
            const session = localStorage.getItem('admin_session');
            if (!session) {
                router.push('/admin/login');
                return;
            }
            fetchAccounts();
        };
        checkAdmin();
    }, [router]);

    const fetchAccounts = async () => {
        setLoadingAccounts(true);
        const { data, error } = await supabase.from('accounts').select('*').neq('role', 'admin').order('created_at');
        if (!error) setAccounts(data || []);
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
            setPasswords(prev => ({ ...prev, [userId]: '' })); // Clear input
        }
    };

    const handleAdminPasswordChange = async () => {
        const newPassword = prompt("새로운 관리자 비밀번호를 입력하세요:");
        if (!newPassword) return;

        const adminSession = JSON.parse(localStorage.getItem('admin_session'));
        const { error } = await supabase.from('accounts').update({ password: newPassword }).eq('id', adminSession.id);

        if (error) alert("비밀번호 변경 실패: " + error.message);
        else alert("관리자 비밀번호가 변경되었습니다. 다음 로그인부터 적용됩니다.");
    }

    return (
        <div className="centered-container" style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '4rem' }}>
            <div style={{ marginBottom: '3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <ShieldCheck size={32} color="#2563eb" /> 관리자 대시보드
                    </h1>
                    <p style={{ color: '#64748b' }}>프롬프트 및 사용자 계정을 관리합니다.</p>
                </div>
                <button
                    onClick={handleAdminPasswordChange}
                    className="btn"
                    style={{ border: '1px solid #e2e8f0', background: 'white', color: '#475569' }}
                >
                    <KeyRound size={16} style={{ marginRight: '0.5rem' }} /> 관리자 비밀번호 변경
                </button>
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

            {/* Prompt Management Tab (New Grid Layout) */}
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
                                onMouseOver={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-4px)';
                                    e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)';
                                    e.currentTarget.style.borderColor = '#3b82f6';
                                }}
                                onMouseOut={(e) => {
                                    e.currentTarget.style.transform = 'none';
                                    e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)';
                                    e.currentTarget.style.borderColor = '#e2e8f0';
                                }}
                            >
                                <div style={{ color: '#3b82f6', marginBottom: '1rem' }}>
                                    {target.icon}
                                </div>
                                <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#1e293b', marginBottom: '0.5rem' }}>
                                    {target.name}
                                </h3>
                                <p style={{ fontSize: '0.9rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                    관리하기 <ChevronRight size={14} />
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Account Management Tab (Existing Logic) */}
            {activeTab === 'accounts' && (
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white', borderRadius: '0.5rem', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                        <thead style={{ background: '#f8fafc' }}>
                            <tr>
                                <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #e2e8f0', width: '20%' }}>아이디 (그룹)</th>
                                <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #e2e8f0', width: '30%' }}>표시 이름</th>
                                <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #e2e8f0', width: '50%' }}>비밀번호 변경</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loadingAccounts ? (
                                <tr><td colSpan="3" style={{ padding: '2rem', textAlign: 'center' }}>로딩 중...</td></tr>
                            ) : accounts.map((account) => (
                                <tr key={account.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: '1rem', fontWeight: 500 }}>{account.username}</td>
                                    <td style={{ padding: '1rem', color: '#64748b' }}>{account.display_name}</td>
                                    <td style={{ padding: '1rem' }}>
                                        <div style={{ display: 'flex', gap: '0.5rem', maxWidth: '300px' }}>
                                            <input
                                                type="text"
                                                placeholder="새 비밀번호"
                                                value={passwords[account.id] || ''}
                                                onChange={(e) => setPasswords({ ...passwords, [account.id]: e.target.value })}
                                                style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1', width: '100%' }}
                                            />
                                            <button
                                                onClick={() => handlePasswordChange(account.id)}
                                                className="btn"
                                                style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', whiteSpace: 'nowrap' }}
                                            >
                                                변경
                                            </button>
                                        </p>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                            <input
                                                type="password"
                                                placeholder="새로운 비밀번호"
                                                value={newPassword}
                                                onChange={e => setNewPassword(e.target.value)}
                                                style={{ padding: '0.5rem', border: '1px solid #e2e8f0' }}
                                            />
                                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                                <button onClick={() => setIsPasswordModalOpen(false)} className="btn">취소</button>
                                                <button
                                                    onClick={async () => {
                                                        if (!newPassword) return alert('새 비밀번호를 입력하세요.');
                                                        try {
                                                            const { error } = await supabase
                                                                .from('accounts')
                                                                .update({ password: newPassword })
                                                                .eq('id', adminUser.id);
                                                            if (error) throw error;
                                                            alert('비밀번호가 변경되었습니다. 다시 로그인해주세요.');
                                                            handleLogout();
                                                        } catch (e) { alert(e.message); }
                                                    }}
                                                    className="btn btn-primary"
                                                >
                                                    변경하기
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                        );
}
