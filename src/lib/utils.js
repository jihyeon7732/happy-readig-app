/** 공백을 제외한 글자 수 */
export const countChars = (s = '') => s.replace(/\s/g, '').length;

/** 공백을 포함한 글자 수 (일지 분량 기준용) */
export const countCharsAll = (s = '') => s.length;

export const MIN_CHARS = 300;
export const MAX_CHARS = 500;

/** 혼동하기 쉬운 글자(O,0,I,1)를 뺀 영문 대문자+숫자 4자리 */
const PW_POOL = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function makePassword(len = 4) {
  let out = '';
  const buf = new Uint32Array(len);
  crypto.getRandomValues(buf);
  for (let i = 0; i < len; i++) out += PW_POOL[buf[i] % PW_POOL.length];
  return out;
}

export const classKeyOf = (grade, classNum) => `${grade}-${classNum}`;
export const studentIdOf = (grade, classNum, number) => `${grade}-${classNum}-${number}`;

/** 학번 표시용: 학년(1) + 반(2) + 번호(2), 예) 3학년 1반 1번 -> 30101 */
export const studentNoDisplay = (grade, classNum, number) =>
  `${grade}${String(classNum).padStart(2, '0')}${String(number).padStart(2, '0')}`;

export const todayStr = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

export const fmtDate = (iso) => {
  if (!iso) return '';
  const [, m, d] = iso.split('-');
  return `${Number(m)}/${Number(d)}`;
};

/** 문자열을 32비트 시드로 변환 (FNV-1a) */
function hashSeed(str = '') {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** 시드 기반 의사난수 생성기 (mulberry32) */
function mulberry32(seed) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * 같은 seedKey(회차 id 등)에서는 항상 같은 순서로, 완전히 뒤섞인 배열을 반환합니다.
 * 번호 순서가 그대로 드러나는 회전(rotation)이 되지 않도록 진짜 Fisher-Yates 셔플을 씁니다.
 */
export function seededShuffle(arr, seedKey) {
  const rand = mulberry32(hashSeed(String(seedKey)));
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** 겹치는 하이라이트 구간을 정렬·병합 */
export function mergeRanges(ranges = []) {
  const sorted = [...ranges].filter((r) => r && r.end > r.start).sort((a, b) => a.start - b.start);
  const out = [];
  for (const r of sorted) {
    const last = out[out.length - 1];
    if (last && r.start <= last.end) last.end = Math.max(last.end, r.end);
    else out.push({ start: r.start, end: r.end });
  }
  return out;
}

/** 본문 문자열을 하이라이트 구간에 따라 조각으로 나눔 (각 조각의 start/end 포함) */
export function splitByRanges(text = '', ranges = []) {
  const merged = mergeRanges(ranges);
  const parts = [];
  let cur = 0;
  for (const r of merged) {
    const s = Math.max(0, Math.min(r.start, text.length));
    const e = Math.max(s, Math.min(r.end, text.length));
    if (s > cur) parts.push({ text: text.slice(cur, s), mark: false, start: cur, end: s });
    if (e > s) parts.push({ text: text.slice(s, e), mark: true, start: s, end: e });
    cur = e;
  }
  if (cur < text.length) parts.push({ text: text.slice(cur), mark: false, start: cur, end: text.length });
  return parts;
}

/** 컨테이너 안의 드래그 선택 영역을 문자 인덱스로 환산 */
export function getSelectionOffsets(root) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return null;
  const range = sel.getRangeAt(0);
  if (!root || !root.contains(range.commonAncestorContainer)) return null;
  const pre = range.cloneRange();
  pre.selectNodeContents(root);
  pre.setEnd(range.startContainer, range.startOffset);
  const start = pre.toString().length;
  const text = range.toString();
  if (!text.trim()) return null;
  const rect = range.getBoundingClientRect();
  return { start, end: start + text.length, text, rect };
}

export const load = (k, fallback = null) => {
  try {
    const v = localStorage.getItem(k);
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
};
export const save = (k, v) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {
    /* noop */
  }
};
export const drop = (k) => {
  try {
    localStorage.removeItem(k);
  } catch {
    /* noop */
  }
};
