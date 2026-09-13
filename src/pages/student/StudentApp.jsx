import React, { useState } from 'react';
import StudentWrite from './StudentWrite';
import StudentWall from './StudentWall';
import StudentPortfolio from './StudentPortfolio';
import { Footer } from '../../components/ui';

const TABS = [
  { id: 'write', label: '일지 쓰기' },
  { id: 'wall', label: '학급 담벼락' },
  { id: 'me', label: '나의 포트폴리오' },
];

export default function StudentApp({ student, onSignOut }) {
  const [tab, setTab] = useState('write');

  return (
    <div className="app">
      <header className="topbar">
        <span className="brand">독서 일지</span>
        <nav className="tabs">
          {TABS.map((t) => (
            <button key={t.id} className="tab" aria-current={tab === t.id} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </nav>
        <span className="spacer" />
        <span className="who">
          {student.grade}-{student.classNum} {student.number}번 {student.name}
        </span>
        <button className="btn ghost sm" onClick={onSignOut}>
          나가기
        </button>
      </header>

      <main className={`page ${tab === 'write' ? 'page-narrow' : ''}`}>
        {tab === 'write' && <StudentWrite student={student} />}
        {tab === 'wall' && <StudentWall student={student} />}
        {tab === 'me' && <StudentPortfolio student={student} />}
      </main>
      <Footer />
    </div>
  );
}
