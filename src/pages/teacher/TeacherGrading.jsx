import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  listSessions,
  listStudents,
  listEntriesBySession,
  patchEntry,
  toggleHonor,
} from '../../lib/db';
import { generateBatchFeedback, analyzeEntry } from '../../lib/ai';
import HighlightBody from '../../components/HighlightBody';
import { StampButton, StampMini, Spinner, useToast, Empty, Trophy } from '../../components/ui';
import { countChars, fmtDate } from '../../lib/utils';

export default function TeacherGrading({ grade, classNum, goTo }) {
  const toast = useToast();
  const [sessions, setSessions] = useState([]);
  const [sessionId, setSessionId] = useState('');
  const [roster, setRoster] = useState([]);
  const [entries, setEntries] = useState([]);
  const [cursor, setCursor] = useState(0);
  const [loading, setLoading] = useState(true);
  const [ai, setAi] = useState({ running: false, done: 0, total: 0 });
  const fbTimer = useRef(null);

  /* 회차 목록 */
  useEffect(() => {
    (async () => {
      setLoading(true);
      const [s, r] = await Promise.all([listSessions(grade, classNum), listStudents(grade, classNum)]);
      setSessions(s);
      setRoster(r);
      setSessionId((prev) => prev || s[s.length - 1]?.id || '');
      setLoading(false);
    })().catch((e) => {
      console.error(e);
      toast('불러오지 못했습니다.', 'bad');
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grade, classNum]);

  /* 선택한 회차의 일지 */
  const loadEntries = useCallback(async (sid) => {
    if (!sid) return setEntries([]);
    setEntries(await listEntriesBySession(sid));
  }, []);

  useEffect(() => {
    loadEntries(sessionId).catch(console.error);
    setCursor(0);
  }, [sessionId, loadEntries]);

  /* 명단 기준으로 제출/미제출을 합쳐 좌측 리스트 구성 */
  const rows = useMemo(() => {
    const byId = Object.fromEntries(entries.map((e) => [e.studentId, e]));
    return roster.map((s) => ({ student: s, entry: byId[s.id] || null }));
  }, [roster, entries]);

  const current = rows[cursor];
  const entry = current?.entry;
  const session = sessions.find((s) => s.id === sessionId);

  const update = async (patch) => {
    if (!entry) return;
    setEntries((v) => v.map((e) => (e.id === entry.id ? { ...e, ...patch } : e)));
    try {
      await patchEntry(entry.id, patch);
    } catch (e) {
      console.error(e);
      toast('저장하지 못했습니다.', 'bad');
    }
  };

  const setStamp = (kind) => {
    if (!entry) return;
    const next = entry.stamp === kind ? null : kind;
    update({ stamp: next });
  };

  const onHonor = async () => {
    if (!entry) return;
    const res = await toggleHonor(entry, entries);
    if (!res.ok) return toast(res.reason, 'bad');
    setEntries((v) => v.map((e) => (e.id === entry.id ? { ...e, honor: res.honor } : e)));
    toast(res.honor ? '명예의 전당에 올렸습니다.' : '명예의 전당에서 내렸습니다.');
  };

  const onFeedbackChange = (text) => {
    setEntries((v) => v.map((e) => (e.id === entry.id ? { ...e, teacherFeedback: text } : e)));
    clearTimeout(fbTimer.current);
    fbTimer.current = setTimeout(() => patchEntry(entry.id, { teacherFeedback: text }).catch(console.error), 700);
  };

  const runAI = async () => {
    const targets = entries.filter((e) => (e.body || '').trim());
    if (!targets.length) return toast('제출된 일지가 없습니다.', 'bad');
    setAi({ running: true, done: 0, total: targets.length });
    try {
      const results = await generateBatchFeedback(targets, (done, total) => setAi({ running: true, done, total }));
      const map = Object.fromEntries(results.map((r) => [r.id, r]));
      setEntries((v) => v.map((e) => (map[e.id] ? { ...e, aiFeedback: map[e.id].feedback, aiStamp: map[e.id].suggestedStamp } : e)));
      await Promise.all(
        results.map((r) => patchEntry(r.id, { aiFeedback: r.feedback, aiStamp: r.suggestedStamp }))
      );
      const usedRule = results.filter((r) => r.source === 'rule').length;
      toast(usedRule ? `피드백 ${results.length}건 생성 (규칙 기반 ${usedRule}건)` : `피드백 ${results.length}건을 만들었습니다.`);
    } catch (e) {
      console.error(e);
      toast('피드백 생성에 실패했습니다.', 'bad');
    } finally {
      setAi({ running: false, done: 0, total: 0 });
    }
  };

  /* 키보드 단축키: ← → 이동, 1 상, 2 하 */
  useEffect(() => {
    const onKey = (e) => {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') setCursor((c) => Math.min(c + 1, rows.length - 1));
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') setCursor((c) => Math.max(c - 1, 0));
      if (e.key === '1') setStamp('high');
      if (e.key === '2') setStamp('low');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const submitted = entries.length;
  const graded = entries.filter((e) => e.stamp).length;
  const honorCount = entries.filter((e) => e.honor).length;

  if (loading) {
    return (
      <div className="row">
        <Spinner /> <span className="counter">불러오는 중</span>
      </div>
    );
  }

  if (!sessions.length) {
    return (
      <div className="card">
        <Empty title="채점할 회차가 없습니다">
          <button className="btn sm" onClick={() => goTo('sessions')}>
            회차 관리로 이동
          </button>
        </Empty>
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div className="row">
          <select className="select" style={{ width: 'auto' }} value={sessionId} onChange={(e) => setSessionId(e.target.value)}>
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.round}회차 · {fmtDate(s.date)} {s.period}교시
              </option>
            ))}
          </select>
          <span className="badge">
            제출 {submitted}/{roster.length}
          </span>
          <span className="badge">채점 {graded}</span>
          <span className="badge gold">
            <Trophy size={13} /> 명예의 전당 {honorCount}/3
          </span>
        </div>

        <div className="row">
          {ai.running && (
            <span className="counter">
              <Spinner /> {ai.done}/{ai.total}
            </span>
          )}
          <button className="btn primary" onClick={runAI} disabled={ai.running || !submitted}>
            AI 피드백 생성하기
          </button>
        </div>
      </div>

      <div className="split">
        <aside className="roster-list">
          {rows.map((r, i) => (
            <button
              key={r.student.id}
              className={`roster-item ${r.entry ? '' : 'empty'}`}
              aria-current={i === cursor}
              onClick={() => setCursor(i)}
            >
              <span className="no">{r.student.number}</span>
              <span className="nm">{r.student.name}</span>
              {r.entry?.honor && (
                <span className="badge gold" style={{ padding: '1px 6px' }}>
                  <Trophy size={11} />
                </span>
              )}
              {r.entry ? <StampMini stamp={r.entry.stamp} /> : <span className="counter">미제출</span>}
            </button>
          ))}
        </aside>

        <section className="stack">
          {!current ? (
            <div className="card">
              <Empty title="학생을 선택해 주세요">왼쪽 명단에서 이름을 누르면 일지가 열립니다.</Empty>
            </div>
          ) : !entry ? (
            <div className="card">
              <Empty title={`${current.student.name} 학생은 아직 제출하지 않았습니다`}>
                결석한 경우 다음 시간에 일지 2개를 써서 내도록 안내해 주세요.
              </Empty>
            </div>
          ) : (
            <EntryDetail
              entry={entry}
              session={session}
              onStamp={setStamp}
              onHonor={onHonor}
              onHighlights={(h) => update({ highlights: h })}
              onFeedback={onFeedbackChange}
              onPrev={() => setCursor((c) => Math.max(0, c - 1))}
              onNext={() => setCursor((c) => Math.min(rows.length - 1, c + 1))}
            />
          )}
        </section>
      </div>
    </div>
  );
}

function EntryDetail({ entry, session, onStamp, onHonor, onHighlights, onFeedback, onPrev, onNext }) {
  const stat = analyzeEntry(entry.body || '');
  const chars = countChars(entry.body || '');

  return (
    <>
      <div className="card">
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <h2>
              {entry.number}번 {entry.name}
            </h2>
            <p className="counter">
              {session?.round}회차 · {fmtDate(entry.date)} · {entry.bookTitle || '제목 미기재'} · {entry.pageStart}~
              {entry.pageEnd}쪽 · {chars}자
            </p>
          </div>
          <div className="row" style={{ gap: 6 }}>
            <button className="btn ghost sm" onClick={onPrev}>
              이전
            </button>
            <button className="btn ghost sm" onClick={onNext}>
              다음
            </button>
          </div>
        </div>

        <div className="row" style={{ marginBottom: 14 }}>
          {(entry.keywords || []).map((k, i) => (
            <span className="keyword" key={i}>
              {k}
            </span>
          ))}
        </div>

        <HighlightBody
          text={entry.body || ''}
          highlights={entry.highlights || []}
          editable
          onChange={onHighlights}
        />
        <p className="counter" style={{ marginTop: 12 }}>
          칭찬할 문장을 마우스로 드래그하면 형광펜을 칠할 수 있습니다. 잘못 칠했다면 마크를 클릭해서 지울 수 있습니다.
        </p>
      </div>

      <div className="card">
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div className="row" style={{ gap: 18 }}>
            <StampButton kind="high" active={entry.stamp === 'high'} onClick={() => onStamp('high')} />
            <StampButton kind="low" active={entry.stamp === 'low'} onClick={() => onStamp('low')} />
            <div className="stack" style={{ gap: 4 }}>
              <span className="counter">단축키 1 = 상, 2 = 하</span>
              {entry.aiStamp && (
                <span className="counter">
                  AI 추천: {entry.aiStamp === 'high' ? '상' : '하'}
                </span>
              )}
              <span className="counter">
                자기 경험 {stat.selfHits} · 사회 연결 {stat.socialHits} · 이유 서술 {stat.reasonHits}
              </span>
            </div>
          </div>

          <button className={`btn sm ${entry.honor ? 'wood' : ''}`} onClick={onHonor}>
            <Trophy size={14} /> {entry.honor ? '명예의 전당 지정됨 (클릭하면 해제)' : '명예의 전당에 올리기'}
          </button>
        </div>
      </div>

      <div className="card stack">
        <label className="field">
          <span>한 줄 피드백</span>
          <textarea
            className="textarea"
            style={{ minHeight: 76 }}
            value={entry.teacherFeedback || ''}
            onChange={(e) => onFeedback(e.target.value)}
            placeholder="예) 인물의 선택을 평가한 문장이 좋았어요. 그 판단의 이유를 한 문장만 더 붙여 볼까요?"
          />
        </label>

        {entry.aiFeedback && (
          <div className="fb ai">
            <span className="lb">AI 피드백</span>
            {entry.aiFeedback}
          </div>
        )}
      </div>
    </>
  );
}
