import React, { useEffect, useState } from 'react';
import { listStudents, upsertStudents, issuePasswords, updateStudent, removeStudent } from '../../lib/db';
import { Modal, Field, Spinner, useToast, Empty } from '../../components/ui';
import { makePassword } from '../../lib/utils';

/** "1 김민수" / "1,김민수" / "김민수" 를 모두 받아들입니다. */
function parseRoster(raw) {
  const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean);
  const rows = [];
  lines.forEach((line, i) => {
    const m = line.match(/^(\d{1,2})[.\s,\t]+(.+)$/);
    if (m) rows.push({ number: Number(m[1]), name: m[2].trim() });
    else rows.push({ number: i + 1, name: line });
  });
  return rows.filter((r) => r.name);
}

export default function TeacherRoster({ grade, classNum, goTo }) {
  const toast = useToast();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [openAdd, setOpenAdd] = useState(false);
  const [raw, setRaw] = useState('');

  const refresh = async () => {
    setLoading(true);
    try {
      setList(await listStudents(grade, classNum));
    } catch (e) {
      console.error(e);
      toast('명단을 불러오지 못했습니다.', 'bad');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grade, classNum]);

  const saveRoster = async () => {
    const rows = parseRoster(raw);
    if (!rows.length) return toast('등록할 이름이 없습니다.', 'bad');
    setBusy(true);
    try {
      setList(await upsertStudents(grade, classNum, rows));
      setOpenAdd(false);
      setRaw('');
      toast(`${rows.length}명을 등록했습니다.`);
    } catch (e) {
      console.error(e);
      toast('저장에 실패했습니다.', 'bad');
    } finally {
      setBusy(false);
    }
  };

  const issue = async (all) => {
    setBusy(true);
    try {
      setList(await issuePasswords(grade, classNum, { regenerateAll: all }));
      toast(all ? '모든 비밀번호를 새로 발급했습니다.' : '비밀번호를 발급했습니다.');
    } catch (e) {
      console.error(e);
      toast('발급에 실패했습니다.', 'bad');
    } finally {
      setBusy(false);
    }
  };

  const reissueOne = async (s) => {
    const pw = makePassword();
    await updateStudent(s.id, { password: pw });
    setList((v) => v.map((x) => (x.id === s.id ? { ...x, password: pw } : x)));
    toast(`${s.name} 학생 비밀번호를 ${pw}로 바꿨습니다.`);
  };

  const del = async (s) => {
    if (!confirm(`${s.number}번 ${s.name} 학생을 명단에서 지울까요?`)) return;
    await removeStudent(s.id);
    setList((v) => v.filter((x) => x.id !== s.id));
    toast('명단에서 지웠습니다.');
  };

  const copyAll = async () => {
    const text = list.map((s) => `${s.number}\t${s.name}\t${s.password || '(미발급)'}`).join('\n');
    try {
      await navigator.clipboard.writeText(text);
      toast('명단과 비밀번호를 복사했습니다.');
    } catch {
      toast('복사에 실패했습니다. 표를 직접 선택해 주세요.', 'bad');
    }
  };

  const missing = list.filter((s) => !s.password).length;

  return (
    <div className="stack">
      <div className="section-head">
        <h1>
          {grade}학년 {classNum}반 명단
        </h1>
        <span className="hint">{list.length}명 등록{missing > 0 && ` · 비밀번호 미발급 ${missing}명`}</span>
      </div>

      <div className="row">
        <button className="btn wood" onClick={() => setOpenAdd(true)}>
          이름 붙여넣어 등록
        </button>
        <button className="btn primary" onClick={() => issue(false)} disabled={busy || !missing}>
          비밀번호 생성하기
        </button>
        <button className="btn" onClick={() => issue(true)} disabled={busy || !list.length}>
          전체 재발급
        </button>
        <button className="btn ghost" onClick={copyAll} disabled={!list.length}>
          명단 복사
        </button>
        <button className="btn ghost" onClick={() => window.print()} disabled={!list.length}>
          인쇄
        </button>
        {busy && <Spinner />}
      </div>

      {loading ? (
        <div className="row">
          <Spinner /> <span className="counter">불러오는 중</span>
        </div>
      ) : list.length === 0 ? (
        <div className="card">
          <Empty title="아직 명단이 없습니다">
            엑셀이나 나이스에서 이름을 복사해 붙여넣으면 한 번에 등록됩니다.
          </Empty>
        </div>
      ) : (
        <div className="sheet scroll-x">
          <table className="table">
            <thead>
              <tr>
                <th className="num">번호</th>
                <th>이름</th>
                <th>비밀번호</th>
                <th style={{ width: 170 }}></th>
              </tr>
            </thead>
            <tbody>
              {list.map((s) => (
                <tr key={s.id}>
                  <td className="num">{s.number}</td>
                  <td>{s.name}</td>
                  <td className="pw-code">{s.password || <span className="counter">미발급</span>}</td>
                  <td>
                    <div className="row" style={{ gap: 6 }}>
                      <button className="btn sm ghost" onClick={() => reissueOne(s)}>
                        재발급
                      </button>
                      <button className="btn sm danger" onClick={() => del(s)}>
                        삭제
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {list.length > 0 && (
        <div className="notice">
          비밀번호는 학생 본인만 알 수 있도록 나눠 주세요. 잊어버린 학생은 재발급 버튼으로 새 코드를 줄 수 있습니다.
          다음은 <button className="btn ghost sm" onClick={() => goTo('sessions')}>회차 만들기</button>입니다.
        </div>
      )}

      {openAdd && (
        <Modal
          title={`${grade}학년 ${classNum}반 명단 등록`}
          onClose={() => setOpenAdd(false)}
          footer={
            <>
              <button className="btn ghost" onClick={() => setOpenAdd(false)}>
                취소
              </button>
              <button className="btn primary" onClick={saveRoster} disabled={busy}>
                {busy ? <Spinner /> : '명단 저장'}
              </button>
            </>
          }
        >
          <div className="stack">
            <Field label="한 줄에 한 명씩 붙여넣기">
              <textarea
                className="textarea"
                style={{ minHeight: 220, fontFamily: 'inherit' }}
                value={raw}
                onChange={(e) => setRaw(e.target.value)}
                placeholder={'1 김민수\n2 이영희\n3 박준서'}
              />
            </Field>
            <p className="counter">
              번호를 함께 적으면 그 번호로, 이름만 적으면 위에서부터 1번으로 등록됩니다. 이미 있는 번호는 이름만
              갱신되고 비밀번호는 그대로 유지됩니다.
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
}
