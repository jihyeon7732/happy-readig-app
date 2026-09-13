import React, { useEffect, useMemo, useState } from 'react';
import { listSessions, createSession, setSessionOpen, removeSession, listEntriesByClass, listStudents } from '../../lib/db';
import { Field, Spinner, useToast, Empty } from '../../components/ui';
import { todayStr, fmtDate } from '../../lib/utils';

export default function TeacherSessions({ grade, classNum, goTo }) {
  const toast = useToast();
  const [sessions, setSessions] = useState([]);
  const [entries, setEntries] = useState([]);
  const [roster, setRoster] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [form, setForm] = useState({ date: todayStr(), period: 1, round: 1 });
  const set = (k) => (e) => setForm((v) => ({ ...v, [k]: e.target.value }));

  const refresh = async () => {
    setLoading(true);
    try {
      const [s, e, r] = await Promise.all([
        listSessions(grade, classNum),
        listEntriesByClass(grade, classNum),
        listStudents(grade, classNum),
      ]);
      setSessions(s);
      setEntries(e);
      setRoster(r);
      setForm((v) => ({ ...v, round: (s[s.length - 1]?.round || 0) + 1 }));
    } catch (err) {
      console.error(err);
      toast('회차를 불러오지 못했습니다.', 'bad');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grade, classNum]);

  const counts = useMemo(() => {
    const m = {};
    for (const e of entries) {
      m[e.sessionId] ??= { submitted: 0, graded: 0 };
      m[e.sessionId].submitted += 1;
      if (e.stamp) m[e.sessionId].graded += 1;
    }
    return m;
  }, [entries]);

  const add = async (e) => {
    e.preventDefault();
    if (!roster.length) return toast('학생 명단을 먼저 등록해 주세요.', 'bad');
    setBusy(true);
    try {
      await createSession({ grade, classNum, ...form, period: Number(form.period), round: Number(form.round) });
      await refresh();
      toast(`${form.round}회차를 열었습니다.`);
    } catch (err) {
      console.error(err);
      toast('회차를 만들지 못했습니다.', 'bad');
    } finally {
      setBusy(false);
    }
  };

  const toggleOpen = async (s) => {
    await setSessionOpen(s.id, !s.open);
    setSessions((v) => v.map((x) => (x.id === s.id ? { ...x, open: !s.open } : x)));
    toast(s.open ? `${s.round}회차 작성을 마감했습니다.` : `${s.round}회차를 다시 열었습니다.`);
  };

  const del = async (s) => {
    if (!confirm(`${s.round}회차와 그 회차에 제출된 일지가 모두 지워집니다. 계속할까요?`)) return;
    setBusy(true);
    try {
      await removeSession(s.id);
      await refresh();
      toast('회차를 지웠습니다.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="stack">
      <div className="section-head">
        <h1>
          {grade}학년 {classNum}반 회차
        </h1>
        <span className="hint">수업 시작 전에 회차를 열어 두면 학생 화면에 바로 나타납니다.</span>
      </div>

      <form className="card" onSubmit={add}>
        <div className="grid-4" style={{ alignItems: 'end' }}>
          <Field label="읽은 날짜">
            <input className="input" type="date" value={form.date} onChange={set('date')} />
          </Field>
          <Field label="교시">
            <select className="select" value={form.period} onChange={set('period')}>
              {[1, 2, 3, 4, 5, 6, 7].map((p) => (
                <option key={p} value={p}>
                  {p}교시
                </option>
              ))}
            </select>
          </Field>
          <Field label="회차">
            <input className="input" inputMode="numeric" value={form.round} onChange={set('round')} />
          </Field>
          <button className="btn primary" disabled={busy}>
            {busy ? <Spinner /> : '회차 열기'}
          </button>
        </div>
      </form>

      {loading ? (
        <div className="row">
          <Spinner /> <span className="counter">불러오는 중</span>
        </div>
      ) : sessions.length === 0 ? (
        <div className="card">
          <Empty title="열린 회차가 없습니다">위에서 날짜와 교시를 정해 첫 회차를 열어 주세요.</Empty>
        </div>
      ) : (
        <div className="sheet scroll-x">
          <table className="table">
            <thead>
              <tr>
                <th className="num">회차</th>
                <th>날짜</th>
                <th className="num">교시</th>
                <th className="num">제출</th>
                <th className="num">채점</th>
                <th>상태</th>
                <th style={{ width: 200 }}></th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => {
                const c = counts[s.id] || { submitted: 0, graded: 0 };
                return (
                  <tr key={s.id}>
                    <td className="num">{s.round}</td>
                    <td>{fmtDate(s.date)}</td>
                    <td className="num">{s.period}</td>
                    <td className="num">
                      {c.submitted} / {roster.length}
                    </td>
                    <td className="num">{c.graded}</td>
                    <td>
                      <span className={`badge ${s.open ? 'green' : ''}`}>{s.open ? '작성 중' : '마감'}</span>
                    </td>
                    <td>
                      <div className="row" style={{ gap: 6 }}>
                        <button className="btn sm" onClick={() => goTo('grading')}>
                          채점하기
                        </button>
                        <button className="btn sm ghost" onClick={() => toggleOpen(s)}>
                          {s.open ? '마감' : '열기'}
                        </button>
                        <button className="btn sm danger" onClick={() => del(s)}>
                          삭제
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
