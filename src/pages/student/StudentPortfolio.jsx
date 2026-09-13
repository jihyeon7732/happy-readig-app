import React, { useEffect, useMemo, useState } from 'react';
import { listEntriesByStudent } from '../../lib/db';
import HighlightBody from '../../components/HighlightBody';
import { StampMini, Spinner, useToast, Empty, Trophy } from '../../components/ui';
import { countChars, fmtDate } from '../../lib/utils';

export default function StudentPortfolio({ student }) {
  const toast = useToast();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listEntriesByStudent(student.id)
      .then(setEntries)
      .catch((e) => {
        console.error(e);
        toast('포트폴리오를 불러오지 못했습니다.', 'bad');
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [student.id]);

  const stat = useMemo(() => {
    const high = entries.filter((e) => e.stamp === 'high').length;
    const low = entries.filter((e) => e.stamp === 'low').length;
    const honor = entries.filter((e) => e.honor).length;
    const chars = entries.reduce((a, e) => a + countChars(e.body || ''), 0);
    const books = new Set(entries.map((e) => (e.bookTitle || '').trim()).filter(Boolean)).size;
    return { high, low, honor, chars, books };
  }, [entries]);

  if (loading) {
    return (
      <div className="row">
        <Spinner /> <span className="counter">불러오는 중</span>
      </div>
    );
  }

  if (!entries.length) {
    return (
      <div className="card">
        <Empty title="아직 쌓인 일지가 없습니다">첫 일지를 내면 여기에 차곡차곡 모입니다.</Empty>
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="section-head">
        <h1>{student.name}의 독서 포트폴리오</h1>
        <span className="hint">
          {student.grade}학년 {student.classNum}반 {student.number}번
        </span>
      </div>

      <div className="grid-4">
        <Stat label="낸 일지" value={`${entries.length}편`} />
        <Stat label="상 도장" value={`${stat.high}개`} accent />
        <Stat label="읽은 책" value={`${stat.books}권`} />
        <Stat label="명예의 전당" value={`${stat.honor}회`} icon={stat.honor > 0 ? <Trophy size={18} /> : null} />
      </div>

      <p className="counter">지금까지 공백 없이 {stat.chars.toLocaleString()}자를 썼습니다.</p>

      <div className="stack">
        {entries.map((e) => (
          <article className="card stack" key={e.id}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <div>
                <h3>
                  {e.round}회차 · {e.bookTitle || '제목 미기재'}
                </h3>
                <p className="counter">
                  {fmtDate(e.date)} · {e.pageStart}~{e.pageEnd}쪽 · {countChars(e.body || '')}자
                </p>
              </div>
              <div className="row" style={{ gap: 8 }}>
                {e.honor && (
                  <span className="badge gold">
                    <Trophy size={13} /> 명예의 전당
                  </span>
                )}
                <StampMini stamp={e.stamp} />
              </div>
            </div>

            <div className="row" style={{ gap: 6 }}>
              {(e.keywords || []).map((k, i) => (
                <span className="keyword" key={i}>
                  {k}
                </span>
              ))}
            </div>

            <HighlightBody text={e.body} highlights={e.highlights || []} />

            {e.teacherFeedback && (
              <div className="fb teacher">
                <span className="lb">선생님 피드백</span>
                {e.teacherFeedback}
              </div>
            )}
            {e.aiFeedback && (
              <div className="fb ai">
                <span className="lb">AI 피드백</span>
                {e.aiFeedback}
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value, accent, icon }) {
  return (
    <div className="card flat" style={{ padding: '14px 16px' }}>
      <p className="counter">{label}</p>
      <p
        className="row"
        style={{
          fontFamily: 'var(--serif)',
          fontSize: 24,
          color: accent ? 'var(--seal)' : 'var(--wood)',
          lineHeight: 1.4,
          gap: 6,
        }}
      >
        {icon}
        {value}
      </p>
    </div>
  );
}
