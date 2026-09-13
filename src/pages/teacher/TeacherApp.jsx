import React, { useState } from 'react';
import TeacherRoster from './TeacherRoster';
import TeacherSessions from './TeacherSessions';
import TeacherGrading from './TeacherGrading';
import TeacherStats from './TeacherStats';
import TeacherWall from './TeacherWall';
import { load, save } from '../../lib/utils';

const TABS = [
  { id: 'roster', label: '학생 명단' },
  { id: 'sessions', label: '회차 관리' },
  { id: 'grading', label: '채점' },
  { id: 'wall', label: '담벼락' },
  { id: 'stats', label: '학급 통계' },
];

const KEY = 'myeongil.teacher.class';

export default function TeacherApp({ onSignOut }) {
  const [tab, setTab] = useState('roster');
  const [cls, setCls] = useState(() => load(KEY, { grade: 3, classNum: 1 }));

  const setClass = (patch) => {
    const next = { ...cls, ...patch };
    setCls(next);
    save(KEY, next);
  };

  const shared = { grade: Number(cls.grade), classNum: Number(cls.classNum), goTo: setTab };

  return (
    <div className="app">
      <header className="topbar">
        <span className="brand">독서 포트폴리오</span>

        <div className="row" style={{ gap: 6 }}>
          <select
            className="select"
            style={{ width: 'auto', padding: '6px 8px' }}
            value={cls.grade}
            onChange={(e) => setClass({ grade: Number(e.target.value) })}
            aria-label="학년"
          >
            {[1, 2, 3].map((g) => (
              <option key={g} value={g}>
                {g}학년
              </option>
            ))}
          </select>
          <select
            className="select"
            style={{ width: 'auto', padding: '6px 8px' }}
            value={cls.classNum}
            onChange={(e) => setClass({ classNum: Number(e.target.value) })}
            aria-label="반"
          >
            {Array.from({ length: 15 }, (_, i) => i + 1).map((c) => (
              <option key={c} value={c}>
                {c}반
              </option>
            ))}
          </select>
        </div>

        <nav className="tabs">
          {TABS.map((t) => (
            <button key={t.id} className="tab" aria-current={tab === t.id} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </nav>

        <span className="spacer" />
        <span className="who">김지현 선생님</span>
        <button className="btn ghost sm" onClick={onSignOut}>
          나가기
        </button>
      </header>

      <main className="page">
        {tab === 'roster' && <TeacherRoster key={`r${cls.grade}${cls.classNum}`} {...shared} />}
        {tab === 'sessions' && <TeacherSessions key={`s${cls.grade}${cls.classNum}`} {...shared} />}
        {tab === 'grading' && <TeacherGrading key={`g${cls.grade}${cls.classNum}`} {...shared} />}
        {tab === 'wall' && <TeacherWall key={`w${cls.grade}${cls.classNum}`} {...shared} />}
        {tab === 'stats' && <TeacherStats key={`t${cls.grade}${cls.classNum}`} {...shared} />}
      </main>
    </div>
  );
}
