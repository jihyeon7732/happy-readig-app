import React, { useEffect, useState } from 'react';
import TeacherRoster from './TeacherRoster';
import TeacherSessions from './TeacherSessions';
import TeacherGrading from './TeacherGrading';
import TeacherStats from './TeacherStats';
import TeacherWall from './TeacherWall';
import { Modal, Footer, Hand, useToast } from '../../components/ui';
import { subscribeHands, lowerHand } from '../../lib/db';
import { load, save, studentNoDisplay } from '../../lib/utils';

const TABS = [
  { id: 'roster', label: '학생 명단' },
  { id: 'sessions', label: '회차 관리' },
  { id: 'grading', label: '채점' },
  { id: 'wall', label: '담벼락' },
  { id: 'stats', label: '학급 통계' },
];

const KEY = 'myeongil.teacher.class';
const GUIDE_KEY = 'myeongil.teacher.guideSeen';

const GUIDE_STEPS = [
  {
    title: '1. 학생 명단 등록',
    desc: '상단에서 학년·반을 고른 뒤 "학생 명단" 탭에서 이름을 등록하고 "비밀번호 생성하기"를 눌러 4자리 코드를 만들어 학생들에게 나눠 주세요.',
  },
  {
    title: '2. 회차 열기',
    desc: '수업 전 "회차 관리"에서 날짜·교시·회차 번호를 정해 회차를 엽니다. 회차가 열려 있어야 학생이 일지를 쓸 수 있습니다.',
  },
  {
    title: '3. 채점하기',
    desc: '"채점" 탭에서 칭찬할 문장을 드래그해 형광펜을 남기고(잘못 남겼으면 마크를 클릭하면 지워집니다), 상/하 도장(단축키 1, 2)을 찍습니다. "AI 피드백 생성하기"로 반 전체 피드백을 한 번에 만들 수 있고, 특히 잘 쓴 글은 명예의 전당(회차당 3명, 다시 누르면 해제)에 올릴 수 있습니다.',
  },
  {
    title: '4. 담벼락 확인',
    desc: '학생들이 보는 것과 같은 글을 "담벼락" 탭에서 회차별로 볼 수 있습니다. 학생 화면과 달리 이름이 그대로 보입니다.',
  },
  {
    title: '5. 학급 통계 확인',
    desc: '제출·상/하 도장·명예의 전당 현황을 한눈에 보고, "전체 학생 성장 평가서 일괄 생성"으로 반 전체 평가서를 한 번에 만들거나 CSV로 내려받을 수 있습니다.',
  },
];

function TeacherGuide({ onClose }) {
  return (
    <Modal
      title="선생님, 이렇게 사용하세요"
      onClose={onClose}
      footer={
        <button className="btn primary" onClick={onClose}>
          시작하기
        </button>
      }
    >
      <div className="stack">
        {GUIDE_STEPS.map((s) => (
          <div key={s.title} className="card flat stack" style={{ gap: 4 }}>
            <b>{s.title}</b>
            <p style={{ margin: 0, lineHeight: 1.7 }}>{s.desc}</p>
          </div>
        ))}
      </div>
    </Modal>
  );
}

export default function TeacherApp({ onSignOut, isDemo = false, initialClass }) {
  const toast = useToast();
  const [tab, setTab] = useState('roster');
  const [cls, setCls] = useState(() => initialClass || load(KEY, { grade: 3, classNum: 1 }));
  const [showGuide, setShowGuide] = useState(false);
  const [hands, setHands] = useState([]);

  useEffect(() => {
    if (!isDemo && !load(GUIDE_KEY, false)) setShowGuide(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const closeGuide = () => {
    setShowGuide(false);
    if (!isDemo) save(GUIDE_KEY, true);
  };

  useEffect(() => {
    const unsub = subscribeHands(
      cls.grade,
      cls.classNum,
      setHands,
      (h) => toast(`${studentNoDisplay(h.grade, h.classNum, h.number)} ${h.name}이 손을 들었습니다.`, 'alert')
    );
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cls.grade, cls.classNum]);

  const setClass = (patch) => {
    const next = { ...cls, ...patch };
    setCls(next);
    if (!isDemo) save(KEY, next);
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
            disabled={isDemo}
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
            disabled={isDemo}
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
        {isDemo && <span className="who">체험판</span>}
        <button className="btn ghost sm" onClick={() => setShowGuide(true)}>
          사용법
        </button>
        <span className="who">{isDemo ? '체험용 선생님' : '김지현 선생님'}</span>
        <button className="btn ghost sm" onClick={onSignOut}>
          {isDemo ? '체험판 나가기' : '나가기'}
        </button>
      </header>

      {hands.length > 0 && (
        <div className="hand-banner">
          <Hand size={18} />
          {hands.map((h) => (
            <span key={h.id} className="hand-chip">
              {studentNoDisplay(h.grade, h.classNum, h.number)} {h.name}
              <button type="button" onClick={() => lowerHand(h.id).catch(console.error)} title="확인 (손 내리기)" aria-label="확인, 손 내리기">
                ✕
              </button>
            </span>
          ))}
        </div>
      )}

      <main className="page">
        {tab === 'roster' && <TeacherRoster key={`r${cls.grade}${cls.classNum}`} {...shared} />}
        {tab === 'sessions' && <TeacherSessions key={`s${cls.grade}${cls.classNum}`} {...shared} />}
        {tab === 'grading' && <TeacherGrading key={`g${cls.grade}${cls.classNum}`} {...shared} />}
        {tab === 'wall' && <TeacherWall key={`w${cls.grade}${cls.classNum}`} {...shared} />}
        {tab === 'stats' && <TeacherStats key={`t${cls.grade}${cls.classNum}`} {...shared} />}
      </main>
      <Footer />

      {showGuide && <TeacherGuide onClose={closeGuide} />}
    </div>
  );
}
