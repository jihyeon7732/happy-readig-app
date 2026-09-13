import { classKeyOf, studentIdOf, makePassword } from './utils';

/**
 * 로그인 없이 둘러보는 체험판 전용 가짜 데이터 저장소.
 * 실제 Firebase(Firestore/Auth)에는 전혀 접근하지 않고, 이 파일 안의 메모리에서만
 * 읽고 씁니다. 그래서 체험판에서 무엇을 눌러도 실제 학급 데이터에는 영향이 없고,
 * 새로고침하면 다시 처음 상태로 돌아갑니다.
 */

export const DEMO_GRADE = 3;
export const DEMO_CLASS = 1;
const CLASS_KEY = classKeyOf(DEMO_GRADE, DEMO_CLASS);

const ROSTER = [
  { number: 1, name: '김민준' },
  { number: 2, name: '이서연' },
  { number: 3, name: '박도윤' },
  { number: 4, name: '최하은' },
  { number: 5, name: '정시우' },
  { number: 6, name: '강지우' },
  { number: 7, name: '조은우' },
  { number: 8, name: '윤소율' },
];

/** 체험용 학생 버전 클릭 시 "나"로 로그인되는 학생 (1번 김민준) */
export const DEMO_STUDENT = {
  id: studentIdOf(DEMO_GRADE, DEMO_CLASS, 1),
  grade: DEMO_GRADE,
  classNum: DEMO_CLASS,
  number: 1,
  name: '김민준',
  password: 'DEMO',
};

let demoMode = false;
export const isDemoMode = () => demoMode;
export const setDemoMode = (v) => {
  demoMode = v;
};

/** 본문에서 phrase를 찾아 형광펜(칭찬 마크) 구간으로 변환 */
function markPhrase(body, phrase) {
  const start = body.indexOf(phrase);
  if (start < 0) return [];
  return [{ start, end: start + phrase.length }];
}

function daysAgoStr(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  const p = (v) => String(v).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

let students = [];
let sessions = [];
let entries = [];
let hands = {};
const handSubs = new Set();

function seedStudents() {
  return ROSTER.map((r) => ({
    id: studentIdOf(DEMO_GRADE, DEMO_CLASS, r.number),
    grade: DEMO_GRADE,
    classNum: DEMO_CLASS,
    classKey: CLASS_KEY,
    number: r.number,
    name: r.name,
    password: r.number === 1 ? DEMO_STUDENT.password : makePassword(),
    updatedAt: Date.now(),
  }));
}

function seedSessions() {
  const r1 = `${CLASS_KEY}-r1`;
  const r2 = `${CLASS_KEY}-r2`;
  return [
    {
      id: r1,
      grade: DEMO_GRADE,
      classNum: DEMO_CLASS,
      classKey: CLASS_KEY,
      date: daysAgoStr(5),
      period: 3,
      round: 1,
      open: false,
      createdAt: Date.now(),
    },
    {
      id: r2,
      grade: DEMO_GRADE,
      classNum: DEMO_CLASS,
      classKey: CLASS_KEY,
      date: daysAgoStr(0),
      period: 3,
      round: 2,
      open: true,
      createdAt: Date.now(),
    },
  ];
}

function makeEntry({ sessionId, session, studentNumber, bookTitle, pageStart, pageEnd, keywords, body, patch }) {
  const student = ROSTER.find((r) => r.number === studentNumber);
  const studentId = studentIdOf(DEMO_GRADE, DEMO_CLASS, studentNumber);
  return {
    id: `${sessionId}__${studentId}`,
    sessionId,
    classKey: CLASS_KEY,
    grade: DEMO_GRADE,
    classNum: DEMO_CLASS,
    round: session.round,
    date: session.date,
    studentId,
    number: studentNumber,
    name: student.name,
    bookTitle,
    pageStart,
    pageEnd,
    keywords,
    body,
    suspiciousInput: false,
    stamp: null,
    teacherFeedback: '',
    aiFeedback: '',
    highlights: [],
    honor: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...patch,
  };
}

function seedEntries(sessionList) {
  const r1 = sessionList[0];
  const r2 = sessionList[1];
  const out = [];

  const e2Body =
    '똥주 선생님이 완득이를 끊임없이 자극하고 화나게 만드는 이유가 처음에는 이해되지 않았다. 그런데 읽다 보니 그것이 완득이를 무관심 속에 방치하지 않겠다는, 선생님 나름의 방식이라는 걸 알게 되었다. 나라면 저렇게 참견하는 어른이 부담스러웠을 것 같은데, 완득이에게는 그 관심이 결국 세상 밖으로 나갈 용기가 되어 주었다. 요즘 우리 사회에도 무관심이 배려라고 착각하는 어른들이 많은 것 같다. 진짜 어른의 역할은 적당한 거리를 두는 게 아니라, 불편해도 곁에 있어 주는 것이라는 생각이 들었다.';
  const e5Body =
    "이 책을 읽으면서 가장 기억에 남는 문장은 '사람은 누구나 자기 몫의 싸움이 있다'는 부분이다. 완득이도, 아버지도, 똥주 선생님도 각자의 방식으로 세상과 싸우고 있었다. 나도 요즘 성적 때문에 부모님과 자주 부딪히는데, 이것도 결국 내 몫의 싸움이라고 생각하니 조금 마음이 편해졌다. 사회에서 약자라고 불리는 사람들을 동정의 대상으로만 보지 말고, 각자의 싸움을 존중하는 태도가 필요하다는 생각이 들었다.";

  out.push(
    makeEntry({
      sessionId: r1.id,
      session: r1,
      studentNumber: 1,
      bookTitle: '완득이',
      pageStart: 1,
      pageEnd: 35,
      keywords: ['가족', '편견', '성장'],
      body: '완득이가 태어나면서부터 짊어져야 했던 편견들을 보면서 마음이 무거웠다. 몸이 불편한 아버지와 이웃에게 손가락질받는 삼촌을 보며 완득이는 세상과 벽을 쌓고 살아왔던 것 같다. 나는 그동안 겉모습만 보고 사람을 판단한 적이 없었는지 되돌아보게 됐다. 예전에 전학 온 친구가 사투리를 쓴다는 이유로 놀림받는 걸 본 적이 있는데, 그때 나도 방관자였다. 완득이처럼 자신을 있는 그대로 받아들이기까지는 시간이 필요하겠지만, 그 과정을 함께 지켜보고 싶어졌다.',
      patch: { stamp: 'high', teacherFeedback: '겉모습으로 사람을 판단했던 자신의 경험까지 솔직하게 꺼낸 점이 좋았어요.' },
    })
  );

  out.push(
    makeEntry({
      sessionId: r1.id,
      session: r1,
      studentNumber: 2,
      bookTitle: '완득이',
      pageStart: 1,
      pageEnd: 35,
      keywords: ['성장', '선생님', '용기'],
      body: e2Body,
      patch: {
        stamp: 'high',
        honor: true,
        highlights: markPhrase(e2Body, '그것이 완득이를 무관심 속에 방치하지 않겠다는'),
        teacherFeedback: "인물의 태도 변화를 진짜 예리하게 짚어냈어요. '무관심이 배려라고 착각'한다는 표현이 인상적이에요.",
        aiFeedback:
          '요약과 자신의 생각이 균형 있게 담겼고, 어른의 역할에 대한 판단까지 분명히 드러났습니다. 다음에는 완득이의 변화 이전과 이후를 비교하는 문장을 더해 보면 좋겠습니다.',
        aiStamp: 'high',
      },
    })
  );

  out.push(
    makeEntry({
      sessionId: r1.id,
      session: r1,
      studentNumber: 3,
      bookTitle: '완득이',
      pageStart: 1,
      pageEnd: 35,
      keywords: ['킥복싱', '가족', '변화'],
      body: '완득이는 킥복싱을 배우면서 조금씩 달라졌다. 처음에는 그냥 시간 때우기로 다니는 것 같았는데 나중에는 진지해졌다. 아버지와 삼촌이 춤을 추는 장면이 슬펐다. 완득이가 불쌍했다. 앞으로 어떻게 될지 궁금했다.',
      patch: { stamp: 'low', teacherFeedback: "줄거리 정리는 잘 되어 있어요. 다음에는 '왜' 그 장면이 슬펐는지 이유를 한 문장만 더 붙여볼까요?" },
    })
  );

  out.push(
    makeEntry({
      sessionId: r1.id,
      session: r1,
      studentNumber: 4,
      bookTitle: '완득이',
      pageStart: 1,
      pageEnd: 35,
      keywords: ['어머니', '편견', '이해'],
      body: '완득이 어머니가 베트남 사람이라는 것을 알게 됐을 때 완득이의 반응이 마음에 남았다. 나라면 갑자기 나타난 엄마를 어떻게 대해야 할지 몰라 혼란스러웠을 것 같다. 우리 학교에도 다문화 가정 친구들이 있는데, 나는 그 친구들의 마음을 깊이 생각해 본 적이 없었던 것 같다. 완득이가 어머니를 조금씩 받아들이는 과정을 보면서, 가족의 의미는 핏줄이 아니라 함께한 시간과 마음이라는 생각이 들었다.',
      patch: {
        aiFeedback: '책 내용과 자신의 경험을 잘 연결했습니다. 다문화 가정 친구를 향한 생각을 조금 더 구체적인 상황으로 풀어 쓰면 글이 더 깊어지겠습니다.',
        aiStamp: 'high',
      },
    })
  );

  out.push(
    makeEntry({
      sessionId: r1.id,
      session: r1,
      studentNumber: 5,
      bookTitle: '완득이',
      pageStart: 1,
      pageEnd: 35,
      keywords: ['싸움', '존중', '사회'],
      body: e5Body,
      patch: {
        stamp: 'high',
        honor: true,
        suspiciousInput: true,
        highlights: markPhrase(e5Body, '사람은 누구나 자기 몫의 싸움이 있다'),
        teacherFeedback: '인용한 문장을 자신의 상황과 연결한 부분이 훌륭해요. 사회적 약자를 바라보는 시선까지 확장한 점도 좋았습니다.',
      },
    })
  );

  out.push(
    makeEntry({
      sessionId: r1.id,
      session: r1,
      studentNumber: 6,
      bookTitle: '완득이',
      pageStart: 1,
      pageEnd: 35,
      keywords: ['킥복싱', '시합', '가족'],
      body: '완득이 이야기를 재밌게 읽었다. 킥복싱 시합 장면이 제일 인상 깊었다. 완득이가 이겼으면 좋겠다고 생각했다. 아버지도 응원하러 온 게 감동적이었다. 다음 내용이 기대된다.',
      patch: { stamp: 'low' },
    })
  );
  // 7, 8번은 아직 제출하지 않은 상태(미제출)로 둡니다.

  out.push(
    makeEntry({
      sessionId: r2.id,
      session: r2,
      studentNumber: 2,
      bookTitle: '완득이',
      pageStart: 36,
      pageEnd: 70,
      keywords: ['이어서', '변화', '희망'],
      body: '이어지는 이야기에서 완득이가 예전보다 훨씬 당당해진 모습을 보고 뿌듯했다. 사람은 주변의 관심과 기회만 있다면 충분히 달라질 수 있다는 걸 다시 느꼈다. 나도 누군가에게 그런 기회를 주는 사람이 되고 싶다는 생각을 했다.',
    })
  );

  out.push(
    makeEntry({
      sessionId: r2.id,
      session: r2,
      studentNumber: 3,
      bookTitle: '완득이',
      pageStart: 36,
      pageEnd: 70,
      keywords: ['아버지', '대화', '가족'],
      body: '이번 장에서는 완득이와 아버지의 관계가 조금씩 편해지는 게 느껴졌다. 예전에는 서로 말을 잘 안 했는데 이제는 소소한 농담도 주고받는다. 우리 아빠랑도 이렇게 편하게 이야기해본 적이 별로 없었던 것 같아서 나도 오늘 저녁에 말을 걸어보고 싶어졌다.',
    })
  );
  // 1번(체험용 학생)은 2회차를 아직 내지 않아, 직접 써서 제출하는 과정을 체험할 수 있습니다.

  return out;
}

/** 체험판에 들어갈 때마다 깨끗한 초기 상태로 되돌립니다. */
export function resetDemoData() {
  students = seedStudents();
  sessions = seedSessions();
  entries = seedEntries(sessions);
  hands = {};
  const raised = {
    id: studentIdOf(DEMO_GRADE, DEMO_CLASS, 4),
    studentId: studentIdOf(DEMO_GRADE, DEMO_CLASS, 4),
    number: 4,
    name: '최하은',
    grade: DEMO_GRADE,
    classNum: DEMO_CLASS,
    classKey: CLASS_KEY,
    raisedAt: Date.now(),
  };
  hands[raised.studentId] = raised;
  handSubs.forEach((sub) => sub.onChange(handsList(sub.classKey)));
}
resetDemoData();

const cloneEntry = (e) => ({ ...e, keywords: [...(e.keywords || [])], highlights: (e.highlights || []).map((h) => ({ ...h })) });
const cloneStudent = (s) => ({ ...s });
const cloneSession = (s) => ({ ...s });

/* ---------------- 학생 명단 ---------------- */

export async function listStudents(grade, classNum) {
  const ck = classKeyOf(grade, classNum);
  return students.filter((s) => s.classKey === ck).sort((a, b) => a.number - b.number).map(cloneStudent);
}

export async function listStudentsByGrade(grade) {
  return students
    .filter((s) => s.grade === Number(grade))
    .sort((a, b) => a.classNum - b.classNum || a.number - b.number)
    .map(cloneStudent);
}

export async function upsertStudents(grade, classNum, rows) {
  const ck = classKeyOf(grade, classNum);
  for (const row of rows) {
    const id = studentIdOf(grade, classNum, row.number);
    const prev = students.find((s) => s.id === id);
    if (prev) {
      prev.name = row.name.trim();
    } else {
      students.push({
        id,
        grade: Number(grade),
        classNum: Number(classNum),
        classKey: ck,
        number: Number(row.number),
        name: row.name.trim(),
        password: '',
        updatedAt: Date.now(),
      });
    }
  }
  return listStudents(grade, classNum);
}

export async function issuePasswords(grade, classNum, { regenerateAll = false } = {}) {
  const list = students.filter((s) => s.classKey === classKeyOf(grade, classNum));
  const used = new Set(list.map((s) => s.password).filter(Boolean));
  for (const s of list) {
    if (!regenerateAll && s.password) continue;
    let pw = makePassword();
    let guard = 0;
    while (used.has(pw) && guard++ < 50) pw = makePassword();
    used.add(pw);
    s.password = pw;
  }
  return listStudents(grade, classNum);
}

export async function updateStudent(id, patch) {
  const s = students.find((x) => x.id === id);
  if (s) Object.assign(s, patch);
}

export async function removeStudent(id) {
  students = students.filter((s) => s.id !== id);
}

/* ---------------- 회차 세션 ---------------- */

export async function listSessions(grade, classNum) {
  const ck = classKeyOf(grade, classNum);
  return sessions.filter((s) => s.classKey === ck).sort((a, b) => a.round - b.round).map(cloneSession);
}

export async function createSession({ grade, classNum, date, period, round }) {
  const ck = classKeyOf(grade, classNum);
  const id = `${ck}-r${round}`;
  const payload = {
    id,
    grade: Number(grade),
    classNum: Number(classNum),
    classKey: ck,
    date,
    period: Number(period),
    round: Number(round),
    open: true,
    createdAt: Date.now(),
  };
  const idx = sessions.findIndex((s) => s.id === id);
  if (idx >= 0) sessions[idx] = { ...sessions[idx], ...payload };
  else sessions.push(payload);
  return { ...payload };
}

export async function setSessionOpen(id, open) {
  const s = sessions.find((x) => x.id === id);
  if (s) s.open = open;
}

export async function removeSession(id) {
  entries = entries.filter((e) => e.sessionId !== id);
  sessions = sessions.filter((s) => s.id !== id);
}

/* ---------------- 독서 일지 ---------------- */

export async function getEntry(sessionId, studentId) {
  const e = entries.find((x) => x.id === `${sessionId}__${studentId}`);
  return e ? cloneEntry(e) : null;
}

export async function listEntriesBySession(sessionId) {
  return entries.filter((e) => e.sessionId === sessionId).sort((a, b) => a.number - b.number).map(cloneEntry);
}

export async function listEntriesByStudent(studentId) {
  return entries.filter((e) => e.studentId === studentId).sort((a, b) => a.round - b.round).map(cloneEntry);
}

export async function listEntriesByClass(grade, classNum) {
  const ck = classKeyOf(grade, classNum);
  return entries.filter((e) => e.classKey === ck).map(cloneEntry);
}

export async function submitEntry({ session, student, bookTitle, pageStart, pageEnd, keywords, body, suspiciousInput }) {
  const id = `${session.id}__${student.id}`;
  const payload = {
    bookTitle: bookTitle.trim(),
    pageStart: Number(pageStart) || 0,
    pageEnd: Number(pageEnd) || 0,
    keywords: keywords.map((k) => k.trim()).filter(Boolean),
    body,
    suspiciousInput: Boolean(suspiciousInput),
    updatedAt: Date.now(),
  };
  let e = entries.find((x) => x.id === id);
  if (!e) {
    e = {
      id,
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
      createdAt: Date.now(),
      ...payload,
    };
    entries.push(e);
  } else {
    Object.assign(e, payload);
  }
  return cloneEntry(e);
}

export async function patchEntry(id, patch) {
  const e = entries.find((x) => x.id === id);
  if (e) Object.assign(e, patch);
}

/* ---------------- 손들기 ---------------- */

function handsList(classKey) {
  return Object.values(hands)
    .filter((h) => h.classKey === classKey)
    .sort((a, b) => a.raisedAt - b.raisedAt);
}

function pushHandsUpdate(classKey, raisedDoc) {
  handSubs.forEach((sub) => {
    if (sub.classKey !== classKey) return;
    if (raisedDoc) sub.onRaise?.(raisedDoc);
    sub.onChange(handsList(classKey));
  });
}

export async function raiseHand(student) {
  const classKey = classKeyOf(student.grade, student.classNum);
  const doc = {
    id: student.id,
    studentId: student.id,
    number: student.number,
    name: student.name,
    grade: Number(student.grade),
    classNum: Number(student.classNum),
    classKey,
    raisedAt: Date.now(),
  };
  hands[student.id] = doc;
  pushHandsUpdate(classKey, doc);
}

export async function lowerHand(studentId) {
  const doc = hands[studentId];
  delete hands[studentId];
  if (doc) pushHandsUpdate(doc.classKey, null);
}

export async function getHandStatus(studentId) {
  return Boolean(hands[studentId]);
}

export function subscribeHands(grade, classNum, onChange, onRaise) {
  const classKey = classKeyOf(grade, classNum);
  const sub = { classKey, onChange, onRaise };
  handSubs.add(sub);
  onChange(handsList(classKey));
  return () => handSubs.delete(sub);
}
