import React, { useState } from 'react';
import { authStudent } from '../lib/db';
import { signInTeacher, signInTeacherGoogle } from '../lib/firebase';
import { Field, Spinner, Footer } from '../components/ui';

export default function Login({ onSignInStudent, onDemoTeacher, onDemoStudent }) {
  const [mode, setMode] = useState('student');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');

  const [form, setForm] = useState({ grade: 3, classNum: '', number: '', name: '', password: '' });
  const set = (k) => (e) => setForm((v) => ({ ...v, [k]: e.target.value }));

  const teacherSubmit = async (e) => {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      await signInTeacher(email, pw); // 성공하면 App이 자동으로 교사 화면으로 전환
    } catch (e2) {
      console.error(e2);
      setErr(
        e2.code === 'auth/invalid-credential' || e2.code === 'auth/wrong-password'
          ? '계정 또는 비밀번호가 맞지 않습니다.'
          : '로그인에 실패했습니다. 잠시 후 다시 시도해 주세요.'
      );
      setBusy(false);
    }
  };

  const teacherGoogleSubmit = async () => {
    setErr('');
    setBusy(true);
    try {
      await signInTeacherGoogle(); // 성공하면 App이 자동으로 교사 화면으로 전환
    } catch (e2) {
      console.error(e2);
      if (e2.code !== 'auth/popup-closed-by-user' && e2.code !== 'auth/cancelled-popup-request') {
        setErr('구글 로그인에 실패했습니다. 잠시 후 다시 시도해 주세요.');
      }
      setBusy(false);
    }
  };

  const studentSubmit = async (e) => {
    e.preventDefault();
    setErr('');
    if (!form.classNum || !form.number || !form.name || !form.password) {
      setErr('반, 번호, 이름, 비밀번호를 모두 입력해 주세요.');
      return;
    }
    setBusy(true);
    try {
      const res = await authStudent(form);
      if (res.ok) onSignInStudent(res.student);
      else setErr(res.reason);
    } catch (e2) {
      console.error(e2);
      setErr('접속에 실패했습니다. 네트워크를 확인하고 다시 시도해 주세요.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-wrap">
      <div className="stack" style={{ width: '100%', maxWidth: 420 }}>
        <div className="login-card stack">
        <div>
          <p className="login-title">
            읽은 만큼,
            <br />
            남는 만큼
          </p>
          <p className="login-sub">명일중학교 독서 포트폴리오</p>
        </div>

        <div className="card">
          <div className="seg">
            <button aria-pressed={mode === 'student'} onClick={() => { setMode('student'); setErr(''); }}>
              학생
            </button>
            <button aria-pressed={mode === 'teacher'} onClick={() => { setMode('teacher'); setErr(''); }}>
              선생님
            </button>
          </div>

          {mode === 'student' ? (
            <form className="stack" onSubmit={studentSubmit}>
              <div className="grid-3">
                <Field label="학년">
                  <select className="select" value={form.grade} onChange={set('grade')}>
                    <option value={1}>1학년</option>
                    <option value={2}>2학년</option>
                    <option value={3}>3학년</option>
                  </select>
                </Field>
                <Field label="반">
                  <input className="input" inputMode="numeric" value={form.classNum} onChange={set('classNum')} placeholder="5" />
                </Field>
                <Field label="번호">
                  <input className="input" inputMode="numeric" value={form.number} onChange={set('number')} placeholder="12" />
                </Field>
              </div>
              <Field label="이름">
                <input className="input" value={form.name} onChange={set('name')} placeholder="김민수" />
              </Field>
              <Field label="비밀번호 4자리">
                <input
                  className="input pw-code"
                  value={form.password}
                  onChange={(e) => setForm((v) => ({ ...v, password: e.target.value.toUpperCase().slice(0, 4) }))}
                  placeholder="A3K9"
                  autoCapitalize="characters"
                />
              </Field>
              {err && <p className="err">{err}</p>}
              <button className="btn primary block" disabled={busy}>
                {busy ? <Spinner /> : '들어가기'}
              </button>
              <p className="counter">비밀번호는 선생님이 나눠 준 4자리 코드입니다.</p>
            </form>
          ) : (
            <form className="stack" onSubmit={teacherSubmit}>
              <Field label="교사 계정">
                <input
                  className="input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="teacher@naver.com"
                  autoComplete="username"
                />
              </Field>
              <Field label="비밀번호">
                <input
                  className="input"
                  type="password"
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                  autoComplete="current-password"
                />
              </Field>
              {err && <p className="err">{err}</p>}
              <button className="btn wood block" disabled={busy}>
                {busy ? <Spinner /> : '관리자로 들어가기'}
              </button>
              <div className="row" style={{ alignItems: 'center', gap: 8 }}>
                <hr style={{ flex: 1 }} />
                <span className="counter">또는</span>
                <hr style={{ flex: 1 }} />
              </div>
              <button type="button" className="btn block" disabled={busy} onClick={teacherGoogleSubmit}>
                구글 계정으로 로그인
              </button>
              <p className="counter">Firebase 콘솔에 등록한 교사 계정으로 로그인합니다.</p>
            </form>
          )}
        </div>

        <div className="card stack" style={{ gap: 8 }}>
          <p className="counter" style={{ margin: 0 }}>
            계정 없이 기능만 미리 둘러보고 싶다면?
          </p>
          <div className="row" style={{ gap: 8 }}>
            <button type="button" className="btn block" onClick={onDemoTeacher}>
              교사용 체험판 보기
            </button>
            <button type="button" className="btn block" onClick={onDemoStudent}>
              학생용 체험판 보기
            </button>
          </div>
          <p className="counter" style={{ margin: 0 }}>
            체험판은 가짜 데이터로만 동작하며, 새로고침하면 초기화됩니다.
          </p>
        </div>
        </div>
        <Footer />
      </div>
    </div>
  );
}
