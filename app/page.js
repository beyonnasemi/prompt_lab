import { useState, useEffect } from 'react';
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Users, Building2, GraduationCap, School, Baby, User, Sparkles } from "lucide-react";
import { supabase } from '@/lib/supabase';

// Icon mapping for known static IDs (optional, prevents regression of nice icons)
const iconMap = {
  'business': <Building2 size={40} />,
  'public': <Users size={40} />,
  'univ': <GraduationCap size={40} />,
  'elem': <Baby size={40} />,
  'middle': <School size={40} />,
  'high': <School size={40} />,
  'adult': <User size={40} />
};

export default function Home() {
  const router = useRouter();
  const [targets, setTargets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const { data, error } = await supabase
          .from('accounts')
          .select('id, username, display_name')
          .neq('username', 'admin') // Exclude admin
          .order('created_at', { ascending: true }); // Keep order?

        if (error) throw error;

        // Map to target format
        const formattedTargets = data.map(account => ({
          id: account.username, // logic uses username as target ID
          name: account.display_name,
          icon: iconMap[account.username] || <Users size={40} /> // Default icon
        }));
        setTargets(formattedTargets);
      } catch (err) {
        console.error("Failed to fetch groups:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchGroups();
  }, []);

  const handleTargetClick = (id) => {
    // If admin is logged in, go directly to learn page
    try {
      const adminSession = localStorage.getItem('admin_session');
      if (adminSession) {
        router.push(`/learn/${id}`);
        return;
      }
    } catch (e) {
      console.error('Local storage access failed:', e);
    }
    // Otherwise go to login
    router.push(`/login?target=${id}`);
  };

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <p style={{ color: '#2563eb', fontWeight: 600, marginBottom: '0.5rem' }}>
          인공지능융합교육협회 & 인공지능융합교육원
        </p>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          생성형 AI 프롬프트 실습 Lab <Sparkles color="#fbbf24" fill="#fbbf24" />
        </h1>
        <p style={{ color: '#64748b', fontSize: '1.1rem' }}>
          학습을 진행할 소속 유형을 선택해주세요.
        </p>
      </div>

      {loading ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>로딩 중...</div>
      ) : (
        <div className="target-grid">
          {targets.map((target) => (
            <div key={target.id} onClick={() => handleTargetClick(target.id)} style={{ textDecoration: 'none', cursor: 'pointer' }}>
              <div className="target-card">
                <div className="target-icon">
                  {target.icon}
                </div>
                <h3 className="target-name">{target.name}</h3>
                <p style={{ marginTop: '0.5rem', color: '#94a3b8', fontSize: '0.9rem' }}>
                  학습 시작하기 &rarr;
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
