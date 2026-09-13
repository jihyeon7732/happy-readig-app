import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  writeBatch,
  serverTimestamp,
  onSnapshot,
} from 'firebase/firestore';
import { db } from './firebase';
import { classKeyOf, studentIdOf, makePassword } from './utils';

const students = collection(db, 'students');
const sessions = collection(db, 'sessions');
const entries = collection(db, 'entries');
const hands = collection(db, 'hands');

/* ---------------- 학생 명단 ---------------- */

export async function listStudents(grade, classNum) {
  const q = query(students, where('classKey', '==', classKeyOf(grade, classNum)));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => a.number - b.number);
}

export async function listStudentsByGrade(grade) {
  const q = query(students, where('grade', '==', Number(grade)));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => a.classNum - b.classNum || a.number - b.number);
}

/** 이름 목록을 한 번에 등록. 이미 있는 번호는 이름만 갱신하고 비밀번호는 유지합니다. */
export async function upsertStudents(grade, classNum, rows) {
  const existing = await listStudents(grade, classNum);
  const byId = Object.fromEntries(existing.map((s) => [s.id, s]));
  const batch = writeBatch(db);
  for (const row of rows) {
    const id = studentIdOf(grade, classNum, row.number);
    const prev = byId[id];
    batch.set(
      doc(students, id),
      {
        grade: Number(grade),
        classNum: Number(classNum),
        classKey: classKeyOf(grade, classNum),
        number: Number(row.number),
        name: row.name.trim(),
        password: prev?.password ?? '',
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  }
  await batch.commit();
  return listStudents(grade, classNum);
}

/** 비밀번호가 비어 있는 학생에게만(또는 전체 재발급) 4자리 코드를 부여 */
export async function issuePasswords(grade, classNum, { regenerateAll = false } = {}) {
  const list = await listStudents(grade, classNum);
  const used = new Set(list.map((s) => s.password).filter(Boolean));
  const batch = writeBatch(db);
  for (const s of list) {
    if (!regenerateAll && s.password) continue;
    let pw = makePassword();
    let guard = 0;
    while (used.has(pw) && guard++ < 50) pw = makePassword();
    used.add(pw);
    batch.update(doc(students, s.id), { password: pw });
  }
  await batch.commit();
  return listStudents(grade, classNum);
}

export async function updateStudent(id, patch) {
  await updateDoc(doc(students, id), patch);
}

export async function removeStudent(id) {
  await deleteDoc(doc(students, id));
}

/** 학생 로그인 검증 */
export async function authStudent({ grade, classNum, number, name, password }) {
  const id = studentIdOf(grade, classNum, number);
  const snap = await getDoc(doc(students, id));
  if (!snap.exists()) return { ok: false, reason: '등록되지 않은 학번입니다. 선생님께 확인해 주세요.' };
  const s = { id: snap.id, ...snap.data() };
  if (s.name.replace(/\s/g, '') !== String(name).replace(/\s/g, ''))
    return { ok: false, reason: '이름이 명단과 다릅니다.' };
  if (!s.password) return { ok: false, reason: '아직 비밀번호가 발급되지 않았습니다.' };
  if (s.password.toUpperCase() !== String(password).toUpperCase().trim())
    return { ok: false, reason: '비밀번호가 맞지 않습니다.' };
  return { ok: true, student: s };
}

/* ---------------- 회차 세션 ---------------- */

export async function listSessions(grade, classNum) {
  const q = query(sessions, where('classKey', '==', classKeyOf(grade, classNum)));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => a.round - b.round);
}

export async function createSession({ grade, classNum, date, period, round }) {
  const id = `${classKeyOf(grade, classNum)}-r${round}`;
  const payload = {
    grade: Number(grade),
    classNum: Number(classNum),
    classKey: classKeyOf(grade, classNum),
    date,
    period: Number(period),
    round: Number(round),
    open: true,
    createdAt: serverTimestamp(),
  };
  await setDoc(doc(sessions, id), payload, { merge: true });
  return { id, ...payload };
}

export async function setSessionOpen(id, open) {
  await updateDoc(doc(sessions, id), { open });
}

export async function removeSession(id) {
  const snap = await getDocs(query(entries, where('sessionId', '==', id)));
  const batch = writeBatch(db);
  snap.docs.forEach((d) => batch.delete(d.ref));
  batch.delete(doc(sessions, id));
  await batch.commit();
}

/* ---------------- 독서 일지 ---------------- */

const entryId = (sessionId, studentId) => `${sessionId}__${studentId}`;

export async function getEntry(sessionId, studentId) {
  const snap = await getDoc(doc(entries, entryId(sessionId, studentId)));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function listEntriesBySession(sessionId) {
  const snap = await getDocs(query(entries, where('sessionId', '==', sessionId)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => a.number - b.number);
}

export async function listEntriesByStudent(studentId) {
  const snap = await getDocs(query(entries, where('studentId', '==', studentId)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => a.round - b.round);
}

export async function listEntriesByClass(grade, classNum) {
  const snap = await getDocs(query(entries, where('classKey', '==', classKeyOf(grade, classNum))));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function submitEntry({ session, student, bookTitle, pageStart, pageEnd, keywords, body, suspiciousInput }) {
  const id = entryId(session.id, student.id);
  const ref = doc(entries, id);
  const prev = await getDoc(ref);

  // 이미 제출한 일지를 고칠 때는 본문 관련 항목만 다시 씁니다.
  // (신원·회차 정보를 매번 덮어쓰면 보안 규칙의 '학생은 본문만 수정' 조건에 걸립니다.)
  const payload = {
    bookTitle: bookTitle.trim(),
    pageStart: Number(pageStart) || 0,
    pageEnd: Number(pageEnd) || 0,
    keywords: keywords.map((k) => k.trim()).filter(Boolean),
    body,
    suspiciousInput: Boolean(suspiciousInput),
    updatedAt: serverTimestamp(),
  };
  if (!prev.exists()) {
    Object.assign(payload, {
      sessionId: session.id,
      classKey: session.classKey,
      grade: session.grade,
      classNum: session.classNum,
      round: session.round,
      date: session.date,
      studentId: student.id,
      number: student.number,
      name: student.name,
      stamp: null,
      teacherFeedback: '',
      aiFeedback: '',
      highlights: [],
      honor: false,
      createdAt: serverTimestamp(),
    });
  }
  await setDoc(ref, payload, { merge: true });
  return { id, ...payload };
}

export async function patchEntry(id, patch) {
  await updateDoc(doc(entries, id), patch);
}

/** 명예의 전당은 회차당 3명까지 */
export async function toggleHonor(entry, allEntries) {
  const current = allEntries.filter((e) => e.honor && e.id !== entry.id).length;
  if (!entry.honor && current >= 3) {
    return { ok: false, reason: '명예의 전당은 회차당 3명까지 지정할 수 있습니다.' };
  }
  await patchEntry(entry.id, { honor: !entry.honor });
  return { ok: true, honor: !entry.honor };
}

/* ---------------- 손들기 ---------------- */

/** 학생이 손을 듦 (질문 있어요) */
export async function raiseHand(student) {
  await setDoc(doc(hands, student.id), {
    studentId: student.id,
    number: student.number,
    name: student.name,
    grade: Number(student.grade),
    classNum: Number(student.classNum),
    classKey: classKeyOf(student.grade, student.classNum),
    raisedAt: serverTimestamp(),
  });
}

/** 손을 내림 (학생이 스스로 내리거나, 선생님이 확인 처리) */
export async function lowerHand(studentId) {
  await deleteDoc(doc(hands, studentId));
}

/** 지금 내 손이 들려 있는 상태인지 확인 */
export async function getHandStatus(studentId) {
  const snap = await getDoc(doc(hands, studentId));
  return snap.exists();
}

/** 학급의 손든 학생 목록을 실시간으로 구독. 새로 손을 든 학생을 onRaise로 알려 줍니다. */
export function subscribeHands(grade, classNum, onChange, onRaise) {
  const q = query(hands, where('classKey', '==', classKeyOf(grade, classNum)));
  return onSnapshot(q, (snap) => {
    snap.docChanges().forEach((c) => {
      if (c.type === 'added') onRaise?.({ id: c.doc.id, ...c.doc.data() });
    });
    const list = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (a.raisedAt?.toMillis?.() ?? 0) - (b.raisedAt?.toMillis?.() ?? 0));
    onChange(list);
  });
}

/** 학생별 상/하 도장 집계 */
export function tallyStamps(allEntries) {
  const map = {};
  for (const e of allEntries) {
    const k = e.studentId;
    map[k] ??= { studentId: k, number: e.number, name: e.name, high: 0, low: 0, none: 0, total: 0, honor: 0 };
    map[k].total += 1;
    if (e.stamp === 'high') map[k].high += 1;
    else if (e.stamp === 'low') map[k].low += 1;
    else map[k].none += 1;
    if (e.honor) map[k].honor += 1;
  }
  return Object.values(map).sort((a, b) => a.number - b.number);
}
