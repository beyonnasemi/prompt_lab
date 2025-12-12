import Link from "next/link";
import { Users, Building2, GraduationCap, School, Baby, User } from "lucide-react";

export default function Home() {
  const targets = [
    { id: 'business', name: '비즈니스', icon: <Building2 size={40} /> },
    { id: 'public', name: '공공기관', icon: <Users size={40} /> },
    { id: 'univ', name: '대학', icon: <GraduationCap size={40} /> },
    { id: 'elem', name: '초등학교', icon: <Baby size={40} /> },
    { id: 'middle', name: '중학교', icon: <School size={40} /> },
    { id: 'high', name: '고등학교', icon: <School size={40} /> },
    { id: 'adult', name: '일반성인 (기초)', icon: <User size={40} /> },
  ];

  const { Sparkles } = require('lucide-react');

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

      <div className="target-grid">
        {targets.map((target) => (
          <Link href={`/login?target=${target.id}`} key={target.id} style={{ textDecoration: 'none' }}>
            <div className="target-card">
              <div className="target-icon">
                {target.icon}
              </div>
              <h3 className="target-name">{target.name}</h3>
              <p style={{ marginTop: '0.5rem', color: '#94a3b8', fontSize: '0.9rem' }}>
                학습 시작하기 &rarr;
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
