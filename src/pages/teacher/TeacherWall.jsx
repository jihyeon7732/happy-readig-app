import React, { useEffect, useMemo, useState } from 'react';
import { listSessions, listEntriesBySession } from '../../lib/db';
import HighlightBody from '../../components/HighlightBody';
import { Spinner, useToast, Empty, Trophy, StampMini } from '../../components/ui';
import { fmtDate } from '../../lib/utils';

export default function TeacherWall({ grade, classNum }) {
  const toast = useToast();
  const [sessions, setSessions] = useState([]);
  const [sessionId, setSessionId] = useState('');
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    listSessions(grade, classNum)
      .then((s) => {
        setSessions(s);
        setSessionId(s[s.length - 1]?.id || '');
        if (!s.length) setLoading(false);
      })
      .catch((e) => {
        console.error(e);
        toast('담벼락을 불러오지 못했습니다.', 'bad');
        setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grade, classNum]);

  useEffect(() => {
    if (!sessionId) return;
    setLoading(true);
    listEntriesBySession(sessionId)
      .then(setEntries)
      .catch((e) => {
        console.error(e);
        toast('담벼락을 불러오지 못했습니다.', 'bad');
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const cards = useMemo(() => {
    const sorted = [...entries].sort((a, b) => a.number - b.number);
    return {
      honor: sorted.filter((e) => e.honor),
      rest: sorted.filter((e) => !e.honor),
    };
  }, [entries]);

  if (!loading && !sessions.length) {
    return (
      <div className="card">
        <Empty title="아직 담벼락에 붙은 글이 없습니다">회차를 열면 학생들의 일지를 볼 수 있어요.</Empty>
      </div>
    );
  }

  const session = sessions.find((s) => s.id === sessionId);

  return (
    <div className="stack">
      <div className="section-head">
        <h1>
          {grade}학년 {classNum}반 담벼락
        </h1>
        <span className="hint">학생들이 보는 화면과 같은 글이지만, 여기서는 이름이 그대로 보입니다.</span>
      </div>

      <div className="row" style={{ justifyContent: 'space-between' }}>
        <nav className="tabs" aria-label="회차">
          {sessions.map((s) => (
            <button key={s.id} className="tab" aria-current={s.id === sessionId} onClick={() => setSessionId(s.id)}>
              {s.round}회차
            </button>
          ))}
        </nav>
        {session && (
          <span className="counter">
            {fmtDate(session.date)} · {entries.length}편
          </span>
        )}
      </div>

      {loading ? (
        <div className="row">
          <Spinner /> <span className="counter">불러오는 중</span>
        </div>
      ) : entries.length === 0 ? (
        <div className="card">
          <Empty title="이 회차에는 아직 올라온 글이 없습니다">학생이 일지를 내면 여기에 함께 붙습니다.</Empty>
        </div>
      ) : (
        <>
          {cards.honor.length > 0 && (
            <section className="stack">
              <div className="hof-head">
                <Trophy size={30} />
                <div>
                  <h2>이번 회차 명예의 전당</h2>
                  <span className="hint">{cards.honor.length}편</span>
                </div>
              </div>
              <div className="wall">
                {cards.honor.map((e) => (
                  <Card key={e.id} entry={e} honor />
                ))}
              </div>
            </section>
          )}

          <section className="stack">
            <div className="section-head">
              <h2>우리 반 담벼락</h2>
            </div>
            <div className="wall">
              {cards.rest.map((e) => (
                <Card key={e.id} entry={e} />
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function Card({ entry, honor }) {
  return (
    <article className={`postit ${honor ? 'honor' : ''}`}>
      {honor && <span className="ribbon">HONOR</span>}
      <div className="meta">
        {honor && (
          <span className="badge gold">
            <Trophy size={13} /> 명예의 전당
          </span>
        )}
        <span>
          {entry.number}번 {entry.name}
        </span>
        <span>·</span>
        <span>
          {entry.bookTitle} {entry.pageStart}~{entry.pageEnd}쪽
        </span>
        <StampMini stamp={entry.stamp} />
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

      {entry.teacherFeedback && (
        <div className="fb teacher" style={{ marginTop: 12 }}>
          <span className="lb">선생님 피드백</span>
          {entry.teacherFeedback}
        </div>
      )}
      {entry.aiFeedback && (
        <div className="fb ai" style={{ marginTop: 12 }}>
          <span className="lb">AI 피드백</span>
          {entry.aiFeedback}
        </div>
      )}
    </article>
  );
}
