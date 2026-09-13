import React, { useEffect, useMemo, useState } from 'react';
import { listSessions, listEntriesBySession } from '../../lib/db';
import HighlightBody from '../../components/HighlightBody';
import { Spinner, useToast, Empty } from '../../components/ui';
import { fmtDate } from '../../lib/utils';

export default function StudentWall({ student }) {
  const toast = useToast();
  const [sessions, setSessions] = useState([]);
  const [sessionId, setSessionId] = useState('');
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listSessions(student.grade, student.classNum)
      .then((s) => {
        setSessions(s);
        setSessionId(s[s.length - 1]?.id || '');
      })
      .catch((e) => {
        console.error(e);
        toast('담벼락을 불러오지 못했습니다.', 'bad');
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [student.id]);

  useEffect(() => {
    if (!sessionId) return;
    setLoading(true);
    listEntriesBySession(sessionId)
      .then(setEntries)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [sessionId]);

  /* 번호 순서를 그대로 쓰면 누구인지 추측할 수 있으므로 회차 id로 섞은 익명 번호를 붙입니다. */
  const cards = useMemo(() => {
    const seed = [...sessionId].reduce((a, c) => a + c.charCodeAt(0), 0);
    const shuffled = [...entries]
      .map((e, i) => ({ e, k: ((i + 1) * 9301 + seed * 49297) % 233280 }))
      .sort((a, b) => a.k - b.k)
      .map(({ e }, i) => ({ ...e, alias: `익명 ${i + 1}` }));
    const honor = shuffled.filter((e) => e.honor);
    const rest = shuffled.filter((e) => !e.honor);
    return { honor, rest };
  }, [entries, sessionId]);

  if (!sessions.length && !loading) {
    return (
      <div className="card">
        <Empty title="아직 담벼락에 붙은 글이 없습니다">첫 회차가 열리면 친구들의 일지를 볼 수 있어요.</Empty>
      </div>
    );
  }

  const session = sessions.find((s) => s.id === sessionId);

  return (
    <div className="stack">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <nav className="tabs" aria-label="회차">
          {sessions.map((s) => (
            <button key={s.id} className="tab" aria-current={s.id === sessionId} onClick={() => setSessionId(s.id)}>
              {s.round}회차
            </button>
          ))}
        </nav>
        {session && <span className="counter">{fmtDate(session.date)} · {entries.length}편</span>}
      </div>

      {loading ? (
        <div className="row">
          <Spinner /> <span className="counter">불러오는 중</span>
        </div>
      ) : entries.length === 0 ? (
        <div className="card">
          <Empty title="이 회차에는 아직 올라온 글이 없습니다">일지를 내면 담벼락에 함께 붙습니다.</Empty>
        </div>
      ) : (
        <>
          {cards.honor.length > 0 && (
            <section className="stack">
              <div className="section-head">
                <h2>이번 회차 명예의 전당</h2>
                <span className="hint">선생님이 고른 {cards.honor.length}편</span>
              </div>
              <div className="wall">
                {cards.honor.map((e) => (
                  <Card key={e.id} entry={e} me={e.studentId === student.id} honor />
                ))}
              </div>
            </section>
          )}

          <section className="stack">
            <div className="section-head">
              <h2>우리 반 담벼락</h2>
              <span className="hint">이름은 서로 보이지 않습니다</span>
            </div>
            <div className="wall">
              {cards.rest.map((e) => (
                <Card key={e.id} entry={e} me={e.studentId === student.id} />
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function Card({ entry, me, honor }) {
  return (
    <article className={`postit ${honor ? 'honor' : ''}`}>
      <div className="meta">
        {honor && <span className="badge gold">명예의 전당</span>}
        <span>{me ? '내 글' : entry.alias}</span>
        <span>·</span>
        <span>
          {entry.bookTitle} {entry.pageStart}~{entry.pageEnd}쪽
        </span>
      </div>

      <div className="row" style={{ gap: 6, marginBottom: 8 }}>
        {(entry.keywords || []).map((k, i) => (
          <span className="keyword" key={i}>
            {k}
          </span>
        ))}
      </div>

      <div className="txt">
        <HighlightBody text={entry.body} highlights={entry.highlights || []} />
      </div>

      {honor && entry.teacherFeedback && (
        <div className="fb teacher" style={{ marginTop: 12 }}>
          <span className="lb">선생님 피드백</span>
          {entry.teacherFeedback}
        </div>
      )}
    </article>
  );
}
