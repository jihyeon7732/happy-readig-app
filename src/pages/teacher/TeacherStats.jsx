import React, { useEffect, useMemo, useState } from 'react';
import { listStudents, listSessions, listEntriesByClass, tallyStamps } from '../../lib/db';
import { generateGrowthReport } from '../../lib/ai';
import { Modal, Spinner, useToast, Empty, Trophy } from '../../components/ui';

export default function TeacherStats({ grade, classNum }) {
  const toast = useToast();
  const [roster, setRoster] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  const [report, setReport] = useState(null);
  const [bulk, setBulk] = useState(null);

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
      return { ...s, ...t };
    });
  }, [roster, entries]);

  const submitRate = roster.length && sessions.length
    ? Math.round((entries.length / (roster.length * sessions.length)) * 100)
    : 0;

  const exportCsv = () => {
    const head = ['번호', '이름', '제출', '상', '하', '미채점', '명예의전당'];
    const body = rows.map((r) => [r.number, r.name, r.total, r.high, r.low, r.none, r.honor]);
    const csv = [head, ...body].map((line) => line.join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${grade}학년${classNum}반_독서포트폴리오.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast('CSV 파일을 내려받았습니다.');
  };

  const entriesOf = (studentId) => entries.filter((e) => e.studentId === studentId).sort((a, b) => a.round - b.round);

  const openReport = async (row) => {
    const mine = entriesOf(row.id);
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

  const runAllReports = async () => {
    const targets = roster.map((s) => ({ student: s, mine: entriesOf(s.id) })).filter((t) => t.mine.length);
    if (!targets.length) return toast('제출한 일지가 있는 학생이 없습니다.', 'bad');
    setBulk({ loading: true, done: 0, total: targets.length, items: [] });
    const items = [];
    for (const t of targets) {
      try {
        const { report: text, source } = await generateGrowthReport(t.student, t.mine);
        items.push({ id: t.student.id, number: t.student.number, name: t.student.name, text, source });
      } catch (e) {
        console.error(e);
        items.push({ id: t.student.id, number: t.student.number, name: t.student.name, text: '평가서를 만들지 못했습니다.', source: 'error' });
      }
      setBulk((v) => ({ ...v, done: v.done + 1, items: [...items].sort((a, b) => a.number - b.number) }));
    }
    setBulk((v) => ({ ...v, loading: false }));
    const failed = items.filter((i) => i.source === 'error').length;
    toast(failed ? `${items.length}명 중 ${failed}명은 만들지 못했습니다.` : `${items.length}명의 성장 평가서를 만들었습니다.`);
  };

  const copyAllReports = () => {
    if (!bulk?.items.length) return;
    const text = bulk.items.map((i) => `[${i.number}번 ${i.name}]\n${i.text}`).join('\n\n');
    navigator.clipboard?.writeText(text);
    toast('전체 평가서를 복사했습니다.');
  };

  const downloadAllReports = () => {
    if (!bulk?.items.length) return;
    const text = bulk.items.map((i) => `[${i.number}번 ${i.name}]\n${i.text}`).join('\n\n');
    const blob = new Blob(['﻿' + text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${grade}학년${classNum}반_성장평가서.txt`;
    a.click();
    URL.revokeObjectURL(url);
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
          회차 {sessions.length}개 · 제출률 {submitRate}%
        </span>
      </div>

      <div className="card">
        <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <span className="counter">
            {bulk?.loading && (
              <>
                <Spinner /> 성장 평가서 만드는 중 {bulk.done}/{bulk.total}
              </>
            )}
          </span>
          <div className="row" style={{ gap: 8 }}>
            <button className="btn primary" onClick={runAllReports} disabled={bulk?.loading}>
              전체 학생 성장 평가서 일괄 생성
            </button>
            <button className="btn" onClick={exportCsv}>
              CSV로 내려받기
            </button>
          </div>
        </div>
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
                <td className="num">
                  {r.honor > 0 ? (
                    <span className="row" style={{ justifyContent: 'center', gap: 3 }}>
                      <Trophy size={14} /> {r.honor}
                    </span>
                  ) : (
                    0
                  )}
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

      {bulk && (
        <Modal
          title={`${grade}학년 ${classNum}반 전체 성장 평가서 (${bulk.items.length}명)`}
          onClose={() => setBulk(null)}
          footer={
            <>
              <button className="btn ghost" onClick={copyAllReports} disabled={!bulk.items.length}>
                전체 복사
              </button>
              <button className="btn primary" onClick={downloadAllReports} disabled={!bulk.items.length}>
                TXT로 내려받기
              </button>
            </>
          }
        >
          {bulk.loading && !bulk.items.length ? (
            <div className="row">
              <Spinner /> <span className="counter">평가서를 만드는 중입니다</span>
            </div>
          ) : (
            <div className="stack" style={{ maxHeight: '55vh', overflowY: 'auto' }}>
              {bulk.items.map((i) => (
                <div key={i.id} className="card flat stack" style={{ gap: 6 }}>
                  <div className="row" style={{ justifyContent: 'space-between' }}>
                    <b>
                      {i.number}번 {i.name}
                    </b>
                    {i.source === 'rule' && <span className="counter">규칙 기반</span>}
                    {i.source === 'error' && <span className="counter">실패</span>}
                  </div>
                  <p style={{ lineHeight: 1.8, margin: 0 }}>{i.text}</p>
                </div>
              ))}
              {bulk.loading && (
                <div className="row">
                  <Spinner /> <span className="counter">계속 만드는 중 {bulk.done}/{bulk.total}</span>
                </div>
              )}
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
