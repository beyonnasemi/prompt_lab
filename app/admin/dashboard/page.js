'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Plus, Trash2, Edit, Upload, LogOut, Users, MessageSquare } from 'lucide-react';

export default function AdminDashboard() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState('prompts'); // 'prompts' | 'accounts'

    const [prompts, setPrompts] = useState([]);
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [adminUser, setAdminUser] = useState(null);

    // Prompt Form State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
    const [bulkJson, setBulkJson] = useState('');
    const [promptForm, setPromptForm] = useState({
        target_group: 'business',
        difficulty: 'beginner',
        title: '',
        content: '',
        expected_answer: ''
    });

    // Account Form State
    const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
    const [accountForm, setAccountForm] = useState({
        username: '',
        password: '',
        display_name: ''
    });

    useEffect(() => {
        const session = localStorage.getItem('admin_session');
        if (!session) {
            router.push('/admin/login');
            return;
        }
        setAdminUser(JSON.parse(session));
        fetchData();
    }, [router]);

    const fetchData = async () => {
        setLoading(true);
        await Promise.all([fetchPrompts(), fetchAccounts()]);
        setLoading(false);
    };

    const fetchPrompts = async () => {
        const { data } = await supabase.from('prompts').select('*').order('created_at', { ascending: false });
        setPrompts(data || []);
    };

    const fetchAccounts = async () => {
        const { data } = await supabase.from('accounts').select('*').eq('role', 'student').order('created_at', { ascending: true });
        setAccounts(data || []);
    };

    const handleLogout = () => {
        localStorage.removeItem('admin_session');
        router.push('/admin/login');
    };

    // --- Prompt Actions ---
    const handlePromptSubmit = async (e) => {
        e.preventDefault();
        try {
            const { error } = await supabase.from('prompts').insert([{ ...promptForm, created_by: adminUser.id }]);
            if (error) throw error;
            alert('프롬프트가 등록되었습니다.');
            setIsModalOpen(false);
            setPromptForm({ target_group: 'business', difficulty: 'beginner', title: '', content: '', expected_answer: '' });
            fetchPrompts();
        } catch (err) { alert(err.message); }
    };

    const deletePrompt = async (id) => {
        if (!confirm('삭제하시겠습니까?')) return;
        await supabase.from('prompts').delete().eq('id', id);
        fetchPrompts();
    };

    // --- Account Actions ---
    const handleAccountSubmit = async (e) => {
        e.preventDefault();
        try {
            const { error } = await supabase.from('accounts').insert([{ ...accountForm, role: 'student' }]);
            if (error) throw error;
            alert('대상이 추가되었습니다.');
            setIsAccountModalOpen(false);
            setAccountForm({ username: '', password: '', display_name: '' });
            fetchAccounts();
        } catch (err) { alert(err.message); }
    };

    const deleteAccount = async (id) => {
        if (!confirm('이 대상을 삭제하시겠습니까? 관련 프롬프트는 삭제되지 않습니다.')) return;
        await supabase.from('accounts').delete().eq('id', id);
        fetchAccounts();
    };

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '1.8rem', fontWeight: 700 }}>관리자 대시보드</h1>
                <button onClick={handleLogout} className="btn" style={{ border: '1px solid #e2e8f0' }}>
                    <LogOut size={18} /> 로그아웃
                </button>
            </header>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
                <button
                    onClick={() => setActiveTab('prompts')}
                    className={`btn ${activeTab === 'prompts' ? 'btn-primary' : ''}`}
                    style={activeTab !== 'prompts' ? { background: 'white', border: '1px solid #e2e8f0' } : {}}
                >
                    <MessageSquare size={18} style={{ marginRight: '0.5rem' }} /> 프롬프트 관리
                </button>
                <button
                    onClick={() => setActiveTab('accounts')}
                    className={`btn ${activeTab === 'accounts' ? 'btn-primary' : ''}`}
                    style={activeTab !== 'accounts' ? { background: 'white', border: '1px solid #e2e8f0' } : {}}
                >
                    <Users size={18} style={{ marginRight: '0.5rem' }} /> 대상(계정) 관리
                </button>
            </div>

            {/* PROMPTS TAB */}
            {activeTab === 'prompts' && (
                <>
                    <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button onClick={() => setIsModalOpen(true)} className="btn btn-primary">
                            <Plus size={18} style={{ marginRight: '0.5rem' }} /> 추가
                        </button>
                        <button onClick={() => setIsBulkModalOpen(true)} className="btn" style={{ backgroundColor: '#4f46e5', color: 'white' }}>
                            <Upload size={18} style={{ marginRight: '0.5rem' }} /> 대량 등록
                        </button>
                    </div>

                    <div style={{ background: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                <tr>
                                    <th style={{ padding: '1rem' }}>대상</th>
                                    <th style={{ padding: '1rem' }}>난이도</th>
                                    <th style={{ padding: '1rem' }}>제목</th>
                                    <th style={{ padding: '1rem', textAlign: 'right' }}>관리</th>
                                </tr>
                            </thead>
                            <tbody>
                                {prompts.map((p) => (
                                    <tr key={p.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                        <td style={{ padding: '1rem' }}><span style={{ background: '#eff6ff', color: '#2563eb', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem' }}>{p.target_group}</span></td>
                                        <td style={{ padding: '1rem' }}>{p.difficulty}</td>
                                        <td style={{ padding: '1rem' }}>{p.title}</td>
                                        <td style={{ padding: '1rem', textAlign: 'right' }}>
                                            <button onClick={() => deletePrompt(p.id)} style={{ color: '#ef4444', border: 'none', background: 'none', cursor: 'pointer' }}><Trash2 size={18} /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {/* ACCOUNTS TAB */}
            {activeTab === 'accounts' && (
                <>
                    <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
                        <button onClick={() => setIsAccountModalOpen(true)} className="btn btn-primary">
                            <Plus size={18} style={{ marginRight: '0.5rem' }} /> 대상 추가
                        </button>
                    </div>

                    <div style={{ background: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                <tr>
                                    <th style={{ padding: '1rem' }}>표시 이름 (대상명)</th>
                                    <th style={{ padding: '1rem' }}>아이디 (URL 파라미터)</th>
                                    <th style={{ padding: '1rem' }}>비밀번호</th>
                                    <th style={{ padding: '1rem', textAlign: 'right' }}>관리</th>
                                </tr>
                            </thead>
                            <tbody>
                                {accounts.map((a) => (
                                    <tr key={a.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                        <td style={{ padding: '1rem', fontWeight: 600 }}>{a.display_name}</td>
                                        <td style={{ padding: '1rem' }}>{a.username}</td>
                                        <td style={{ padding: '1rem', fontFamily: 'monospace' }}>{a.password}</td>
                                        <td style={{ padding: '1rem', textAlign: 'right' }}>
                                            <button onClick={() => deleteAccount(a.id)} style={{ color: '#ef4444', border: 'none', background: 'none', cursor: 'pointer' }}><Trash2 size={18} /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {/* Prompt Modal */}
            {isModalOpen && (
                <div className="mobile-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60 }}>
                    <div style={{ background: 'white', padding: '2rem', borderRadius: '0.5rem', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <h2 style={{ marginBottom: '1rem', fontWeight: 700 }}>프롬프트 등록</h2>
                        <form onSubmit={handlePromptSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <select style={{ padding: '0.5rem', border: '1px solid #e2e8f0' }} value={promptForm.target_group} onChange={e => setPromptForm({ ...promptForm, target_group: e.target.value })}>
                                {accounts.map(a => <option key={a.id} value={a.username}>{a.display_name}</option>)}
                                <option value="business">비즈니스 (기본)</option>
                            </select>
                            <select style={{ padding: '0.5rem', border: '1px solid #e2e8f0' }} value={promptForm.difficulty} onChange={e => setPromptForm({ ...promptForm, difficulty: e.target.value })}>
                                <option value="beginner">초급</option>
                                <option value="intermediate">중급</option>
                                <option value="advanced">고급</option>
                            </select>
                            <input placeholder="제목" required style={{ padding: '0.5rem', border: '1px solid #e2e8f0' }} value={promptForm.title} onChange={e => setPromptForm({ ...promptForm, title: e.target.value })} />
                            <textarea placeholder="프롬프트 내용" required rows={5} style={{ padding: '0.5rem', border: '1px solid #e2e8f0' }} value={promptForm.content} onChange={e => setPromptForm({ ...promptForm, content: e.target.value })} />
                            <textarea placeholder="예상 답변" rows={3} style={{ padding: '0.5rem', border: '1px solid #e2e8f0' }} value={promptForm.expected_answer} onChange={e => setPromptForm({ ...promptForm, expected_answer: e.target.value })} />
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                <button type="button" onClick={() => setIsModalOpen(false)} className="btn">취소</button>
                                <button type="submit" className="btn btn-primary">등록</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Account Modal */}
            {isAccountModalOpen && (
                <div className="mobile-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60 }}>
                    <div style={{ background: 'white', padding: '2rem', borderRadius: '0.5rem', width: '100%', maxWidth: '400px' }}>
                        <h2 style={{ marginBottom: '1rem', fontWeight: 700 }}>대상(계정) 추가</h2>
                        <form onSubmit={handleAccountSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <input placeholder="표시 이름 (예: 대학원)" required style={{ padding: '0.5rem', border: '1px solid #e2e8f0' }} value={accountForm.display_name} onChange={e => setAccountForm({ ...accountForm, display_name: e.target.value })} />
                            <input placeholder="아이디 (예: grad_school)" required style={{ padding: '0.5rem', border: '1px solid #e2e8f0' }} value={accountForm.username} onChange={e => setAccountForm({ ...accountForm, username: e.target.value })} />
                            <input placeholder="비밀번호" required style={{ padding: '0.5rem', border: '1px solid #e2e8f0' }} value={accountForm.password} onChange={e => setAccountForm({ ...accountForm, password: e.target.value })} />
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                <button type="button" onClick={() => setIsAccountModalOpen(false)} className="btn">취소</button>
                                <button type="submit" className="btn btn-primary">추가</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Bulk Modal */}
            {isBulkModalOpen && (
                <div className="mobile-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60 }}>
                    <div style={{ background: 'white', padding: '2rem', borderRadius: '0.5rem', width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <h2 style={{ marginBottom: '1rem', fontWeight: 700 }}>대량 등록 (JSON)</h2>
                        <textarea
                            rows={10}
                            value={bulkJson}
                            onChange={e => setBulkJson(e.target.value)}
                            placeholder='[{"target_group": "business", "difficulty": "beginner", "title": "...", "content": "..."}]'
                            style={{ width: '100%', padding: '0.5rem', border: '1px solid #e2e8f0', fontFamily: 'monospace' }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
                            <button onClick={() => setIsBulkModalOpen(false)} className="btn">취소</button>
                            <button
                                onClick={async () => {
                                    try {
                                        const parsed = JSON.parse(bulkJson);
                                        const toInsert = parsed.map(i => ({ ...i, created_by: adminUser.id }));
                                        const { error } = await supabase.from('prompts').insert(toInsert);
                                        if (error) throw error;
                                        alert('일괄 등록 완료');
                                        setIsBulkModalOpen(false);
                                        fetchPrompts();
                                    } catch (e) { alert(e.message); }
                                }}
                                className="btn btn-primary"
                            >
                                등록
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
