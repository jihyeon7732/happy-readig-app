import React, { useEffect, useState } from 'react';
import Login from './pages/Login';
import TeacherApp from './pages/teacher/TeacherApp';
import StudentApp from './pages/student/StudentApp';
import { watchAuth, signInStudentAnon, signOutAll } from './lib/firebase';
import { load, save, drop } from './lib/utils';
import { Spinner, Footer } from './components/ui';
import { setDemoMode, resetDemoData, DEMO_STUDENT, DEMO_GRADE, DEMO_CLASS } from './lib/demoData';

const KEY = 'myeongil.student.v1';

export default function App() {
  const [phase, setPhase] = useState('boot'); // boot | anon | teacher | error
  const [student, setStudent] = useState(() => load(KEY, null));
  const [fatal, setFatal] = useState('');
  const [demoRole, setDemoRole] = useState(null); // null | 'teacher' | 'student'

  useEffect(() => {
    const stop = watchAuth((user) => {
      if (!user) {
        // 로그인 흔적이 없으면 학생용 익명 세션을 연다.
        signInStudentAnon().catch((e) => {
          console.error(e);
          setFatal(
            'Firebase에 연결하지 못했습니다. Vercel 환경변수(VITE_FB_*)와 Firebase 콘솔의 익명 로그인 사용 설정을 확인해 주세요.'
          );
          setPhase('error');
        });
        return;
      }
      setPhase(user.isAnonymous ? 'anon' : 'teacher');
    });
    return stop;
  }, []);

  const signInStudent = (s) => {
    setStudent(s);
    save(KEY, s);
  };

  const signOut = async () => {
    setStudent(null);
    drop(KEY);
    await signOutAll(); // watchAuth가 곧바로 익명 세션을 다시 연다
  };

  const enterDemo = (role) => {
    resetDemoData();
    setDemoMode(true);
    setDemoRole(role);
  };

  const exitDemo = () => {
    setDemoMode(false);
    setDemoRole(null);
  };

  if (demoRole === 'teacher') {
    return <TeacherApp onSignOut={exitDemo} isDemo initialClass={{ grade: DEMO_GRADE, classNum: DEMO_CLASS }} />;
  }
  if (demoRole === 'student') {
    return <StudentApp student={DEMO_STUDENT} onSignOut={exitDemo} isDemo />;
  }

  if (phase === 'boot') {
    return (
      <div className="login-wrap">
        <div className="row">
          <Spinner /> <span className="counter">접속하는 중</span>
        </div>
        <Footer />
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div className="login-wrap">
        <div className="card login-card">
          <h2 style={{ marginBottom: 8 }}>연결할 수 없습니다</h2>
          <p className="err">{fatal}</p>
        </div>
        <Footer />
      </div>
    );
  }

  if (phase === 'teacher') return <TeacherApp onSignOut={signOut} />;
  if (student) return <StudentApp student={student} onSignOut={signOut} />;
  return (
    <Login
      onSignInStudent={signInStudent}
      onDemoTeacher={() => enterDemo('teacher')}
      onDemoStudent={() => enterDemo('student')}
    />
  );
}
