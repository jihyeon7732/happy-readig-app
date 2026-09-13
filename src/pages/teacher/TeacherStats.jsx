import React, { useEffect, useMemo, useState } from 'react';
import { listStudents, listSessions, listEntriesByClass, tallyStamps } from '../../lib/db';
import { generateGrowthReport } from '../../lib/ai';
import { Modal, Field, Spinner, useToast, Empty } from '../../components/ui';

export default function TeacherStats({ grade, classNum }) {
  const toast = useToast();
  const [roster, setRoster] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  const [rule, setRule] = useState({ target: 0, perMissing: 0.5, perLow: 0.25 });
  const [report, setReport] = useState(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [r, s, e] = await Promise.all([
        listStudents(grade, classNum),
        listSessions(grade, classNum),
        listEntriesByClass(grade, classNum),
      ]);
      setRoster(r);
      setSessions(s);
      setEntries(e);
      setRule((v) => ({ ...v, target: v.target || s.length }));
      setLoading(false);
    })().catch((err) => {
      console.error(err);
      toast('통계를 불러오지 못했습니다.', 'bad');
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grade, classNum]);

  const rows = useMemo(() => {
    const tally = Object.fromEntries(tallyStamps(entries).map((t) => [t.studentId, t]));
    return roster.map((s) => {
      const t = tally[s.id] || { high: 0, low: 0, none: 0, total: 0, honor: 0 };
      const missing = Math.max(0, Number(rule.target) - t.high);
      const score = Math.max(0, 10 - missing * Number(rule.perMissing) - t.low * Number(rule.perLow));
      return { ...s, ...t, missing, score: Math.round(score * 100) / 100 };
    });
  }, [roster, entries, rule]);

  const avg = rows.length ? rows.reduce((a, b) => a + b.score, 0) / rows.length : 0;
  const submitRate = roster.length && sessions.length
    ? Math.round((entries.length / (roster.length * sessions.length)) * 100)
    : 0;

  const exportCsv = () => {
    const head = ['번호', '이름', '제출', '상', '하', '미채점', '명예의전당', '환산점수'];
    const body = rows.map((r) => [r.number, r.name, r.total, r.high, r.low, r.none, r.honor, r.score]);
    const csv = [head, ...body].map((line) => line.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${grade}학년${classNum}반_독서포트폴리오.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast('CSV 파일을 내려받았습니다.');
  };

  const openReport = async (row) => {
    const mine = entries.filter((e) => e.studentId === row.id).sort((a, b) => a.round - b.round);
    if (!mine.length) return toast('제출한 일지가 없습니다.', 'bad');
    setReport({ name: row.name, loading: true, text: '' });
    try {
      const { report: text, source } = await generateGrowthReport(row, mine);
      setReport({ name: row.name, loading: false, text, source });
    } catch (e) {
      console.error(e);
      setReport(null);
      toast('평가서를 만들지 못했습니다.', 'bad');
    }
  };

  if (loading) {
    return (
      <div className="row">
        <Spinner /> <span className="counter">불러오는 중</span>
      </div>
    );
  }

  if (!roster.length) {
    return (
      <div className="card">
        <Empty title="집계할 학생이 없습니다">학생 명단부터 등록해 주세요.</Empty>
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="section-head">
        <h1>
          {grade}학년 {classNum}반 통계
        </h1>
        <span className="hint">
          회차 {sessions.length}개 · 제출률 {submitRate}% · 평균 {avg.toFixed(1)}점
        </span>
      </div>

      <div className="card">
        <div className="grid-4" style={{ alignItems: 'end' }}>
          <Field label="만점 기준 '상' 개수">
            <input
              className="input"
              inputMode="numeric"
              value={rule.target}
              onChange={(e) => setRule((v) => ({ ...v, target: e.target.value }))}
            />
          </Field>
          <Field label="'상' 1개 부족당 감점">
            <input
              className="input"
              inputMode="decimal"
              value={rule.perMissing}
              onChange={(e) => setRule((v) => ({ ...v, perMissing: e.target.value }))}
            />
          </Field>
          <Field label="'하' 1개당 감점">
            <input
              className="input"
              inputMode="decimal"
              value={rule.perLow}
              onChange={(e) => setRule((v) => ({ ...v, perLow: e.target.value }))}
            />
          </Field>
          <button className="btn" onClick={exportCsv}>
            CSV로 내려받기
          </button>
        </div>
        <p className="counter" style={{ marginTop: 10 }}>
          10점 만점 − (부족한 상 개수 × {rule.perMissing}) − (하 개수 × {rule.perLow}). 진도에 따라 기준을 바꾸면
          점수가 즉시 다시 계산됩니다.
        </p>
      </div>

      <div className="sheet scroll-x">
        <table className="table">
          <thead>
            <tr>
              <th className="num">번호</th>
              <th>이름</th>
              <th className="num">제출</th>
              <th className="num">상</th>
              <th className="num">하</th>
              <th className="num">미채점</th>
              <th className="num">전당</th>
              <th className="num">환산 점수</th>
              <th style={{ width: 130 }}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="num">{r.number}</td>
                <td>{r.name}</td>
                <td className="num">
                  {r.total}/{sessions.length}
                </td>
                <td className="num" style={{ color: 'var(--seal)' }}>
                  {r.high}
                </td>
                <td className="num">{r.low}</td>
                <td className="num">{r.none}</td>
                <td className="num">{r.honor}</td>
                <td className="num">
                  <b>{r.score}</b>
                </td>
                <td>
                  <button className="btn sm ghost" onClick={() => openReport(r)}>
                    성장 평가서
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {report && (
        <Modal
          title={`${report.name} 학생 성장 평가서`}
          onClose={() => setReport(null)}
          footer={
            <button
              className="btn primary"
              disabled={report.loading}
              onClick={() => {
                navigator.clipboard?.writeText(report.text);
                toast('평가서를 복사했습니다.');
              }}
            >
              복사하기
            </button>
          }
        >
          {report.loading ? (
            <div className="row">
              <Spinner /> <span className="counter">학기 전체 일지를 읽는 중</span>
            </div>
          ) : (
            <div className="stack">
              <p style={{ lineHeight: 1.9 }}>{report.text}</p>
              {report.source === 'rule' && (
                <p className="notice">
                  AI 연결이 되지 않아 규칙 기반 요약으로 만들었습니다. 환경변수 GEMINI_API_KEY를 확인해 주세요.
                </p>
              )}
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
