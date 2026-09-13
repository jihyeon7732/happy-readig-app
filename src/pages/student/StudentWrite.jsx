import React, { useEffect, useMemo, useRef, useState } from 'react';
import { listSessions, getEntry, submitEntry } from '../../lib/db';
import HighlightBody from '../../components/HighlightBody';
import { Field, Spinner, StampMini, useToast, Empty } from '../../components/ui';
import { countChars, MIN_CHARS, MAX_CHARS, fmtDate, load, save, drop } from '../../lib/utils';

const blank = { bookTitle: '', pageStart: '', pageEnd: '', keywords: ['', '', ''], body: '' };

export default function StudentWrite({ student }) {
  const toast = useToast();
  const [sessions, setSessions] = useState([]);
  const [sessionId, setSessionId] = useState('');
  const [entry, setEntry] = useState(null);
  const [form, setForm] = useState(blank);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const draftKey = useRef('');

  useEffect(() => {
    (async () => {
      const s = await listSessions(student.grade, student.classNum);
      setSessions(s);
      const openOne = [...s].reverse().find((x) => x.open) || s[s.length - 1];
      setSessionId(openOne?.id || '');
      setLoading(false);
    })().catch((e) => {
      console.error(e);
      toast('회차를 불러오지 못했습니다.', 'bad');
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [student.id]);

  useEffect(() => {
    if (!sessionId) return;
    draftKey.current = `myeongil.draft.${sessionId}.${student.id}`;
    setLoading(true);
    getEntry(sessionId, student.id)
      .then((e) => {
        setEntry(e);
        if (e) {
          setForm({
            bookTitle: e.bookTitle || '',
            pageStart: e.pageStart || '',
            pageEnd: e.pageEnd || '',
            keywords: [e.keywords?.[0] || '', e.keywords?.[1] || '', e.keywords?.[2] || ''],
            body: e.body || '',
          });
        } else {
          setForm(load(draftKey.current, blank));
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [sessionId, student.id]);

  const session = sessions.find((s) => s.id === sessionId);
  const chars = countChars(form.body);
  const tooShort = chars < MIN_CHARS;
  const full = chars >= MAX_CHARS;
  const canSubmit =
    session?.open &&
    !tooShort &&
    form.bookTitle.trim() &&
    form.pageStart !== '' &&
    form.pageEnd !== '' &&
    form.keywords.every((k) => k.trim());

  const setField = (k) => (e) => {
    const next = { ...form, [k]: e.target.value };
    setForm(next);
    save(draftKey.current, next);
  };

  const setKeyword = (i) => (e) => {
    const keywords = [...form.keywords];
    keywords[i] = e.target.value;
    const next = { ...form, keywords };
    setForm(next);
    save(draftKey.current, next);
  };

  const setBody = (e) => {
    const value = e.target.value;
    if (countChars(value) > MAX_CHARS && value.length > form.body.length) {
      toast(`${MAX_CHARS}자까지만 쓸 수 있어요.`, 'bad');
      return;
    }
    const next = { ...form, body: value };
    setForm(next);
    save(draftKey.current, next);
  };

  const submit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    try {
      const saved = await submitEntry({ session, student, ...form });
      setEntry({ ...entry, ...saved });
      drop(draftKey.current);
      toast(entry ? '일지를 다시 냈습니다.' : '일지를 냈습니다.');
    } catch (e) {
      console.error(e);
      toast('제출에 실패했습니다. 다시 눌러 주세요.', 'bad');
    } finally {
      setSaving(false);
    }
  };

  const meterPct = useMemo(() => Math.min(100, (chars / MAX_CHARS) * 100), [chars]);
  const meterState = full ? 'over' : tooShort ? '' : 'ok';

  if (loading && !sessions.length) {
    return (
      <div className="row">
        <Spinner /> <span className="counter">불러오는 중</span>
      </div>
    );
  }

  if (!sessions.length) {
    return (
      <div className="card">
        <Empty title="아직 열린 회차가 없습니다">선생님이 회차를 열면 여기에서 바로 쓸 수 있어요.</Empty>
      </div>
    );
  }

  return (
    <div className="stack">
      <nav className="tabs" aria-label="회차">
        {sessions.map((s) => (
          <button key={s.id} className="tab" aria-current={s.id === sessionId} onClick={() => setSessionId(s.id)}>
            {s.round}회차
          </button>
        ))}
      </nav>

      <div className="guide">
        줄거리 요약에만 치중하지 마세요. <b>자신의 생각과 느낌을 구체적으로</b> 쓰고, 책 내용과 관련되는{' '}
        <b>나의 경험이나 우리 사회의 모습</b>을 떠올려 보세요.
      </div>

      {session && (
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <span className="counter">
            {session.round}회차 · {fmtDate(session.date)} · {session.period}교시
          </span>
          {!session.open && <span className="badge">마감된 회차예요</span>}
          {entry?.stamp && (
            <span className="row" style={{ gap: 6 }}>
              <StampMini stamp={entry.stamp} /> <span className="counter">선생님 확인</span>
            </span>
          )}
        </div>
      )}

      <div className="card stack">
        <Field label="읽은 책 제목">
          <input className="input" value={form.bookTitle} onChange={setField('bookTitle')} placeholder="인간 실격" disabled={!session?.open} />
        </Field>

        <div className="grid-2">
          <Field label="시작 쪽수">
            <input className="input" inputMode="numeric" value={form.pageStart} onChange={setField('pageStart')} placeholder="1" disabled={!session?.open} />
          </Field>
          <Field label="끝 쪽수">
            <input className="input" inputMode="numeric" value={form.pageEnd} onChange={setField('pageEnd')} placeholder="60" disabled={!session?.open} />
          </Field>
        </div>

        <div className="grid-3">
          {[0, 1, 2].map((i) => (
            <Field key={i} label={`키워드 ${i + 1}`}>
              <input className="input" value={form.keywords[i]} onChange={setKeyword(i)} placeholder={['생애', '위선', '현실'][i]} disabled={!session?.open} />
            </Field>
          ))}
        </div>

        <Field label="오늘 읽은 부분에 대한 생각, 느낌, 감상">
          <textarea
            className="textarea ruled"
            style={{ minHeight: 300 }}
            value={form.body}
            onChange={setBody}
            disabled={!session?.open}
            placeholder="가장 인상 깊었던 구절과 그 이유, 그리고 그 장면이 내 경험이나 우리 사회의 어떤 모습과 닮았는지 써 보세요."
          />
        </Field>

        <div className="stack" style={{ gap: 6 }}>
          <div className="meter">
            <i className={meterState} style={{ width: `${meterPct}%` }} />
          </div>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className={`counter ${full ? 'over' : tooShort ? '' : 'ok'}`}>
              공백 제외 {chars}자 {tooShort ? `· ${MIN_CHARS - chars}자 더 필요해요` : full ? '· 여기까지예요' : '· 제출할 수 있어요'}
            </span>
            <span className="counter">
              {MIN_CHARS}~{MAX_CHARS}자
            </span>
          </div>
        </div>

        <button className="btn primary block" onClick={submit} disabled={!canSubmit || saving}>
          {saving ? <Spinner /> : entry ? '다시 내기' : '제출하기'}
        </button>
      </div>

      {entry && (entry.teacherFeedback || entry.aiFeedback || entry.highlights?.length) && (
        <div className="card stack">
          <h3>선생님이 남긴 것</h3>
          {entry.highlights?.length > 0 && (
            <div>
              <p className="counter" style={{ marginBottom: 6 }}>칭찬 문장</p>
              <HighlightBody text={entry.body} highlights={entry.highlights} />
            </div>
          )}
          {entry.teacherFeedback && (
            <div className="fb teacher">
              <span className="lb">선생님 피드백</span>
              {entry.teacherFeedback}
            </div>
          )}
          {entry.aiFeedback && (
            <div className="fb ai">
              <span className="lb">AI 피드백</span>
              {entry.aiFeedback}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
