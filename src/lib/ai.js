import { countChars, MIN_CHARS } from './utils';

/* ---------------------------------------------------------------
 * 규칙 기반 엔진
 * 명일중 평가 기준(상/하)을 그대로 코드로 옮긴 것입니다.
 * Gemini 호출이 실패해도 학생은 항상 피드백을 받습니다.
 * ------------------------------------------------------------- */

const FLAT_EMOTION = [
  '슬펐다', '기뻤다', '재밌었다', '재미있었다', '궁금했다', '인상 깊었다', '인상깊었다',
  '무서웠다', '불쌍했다', '놀랐다', '화났다', '감동적이었다', '안타까웠다', '신기했다', '좋았다',
];

const SELF_LINK = ['나도', '내가', '나는', '나라면', '내 경험', '예전에', '작년', '우리 반', '친구와', '내 삶'];
const SOCIAL_LINK = ['우리 사회', '사회', '현실', '요즘', '뉴스', '세상', '현대', '오늘날', '우리나라'];
const REASON = ['왜냐하면', '때문', '그 이유', '이유는', '그래서', '따라서', '그러므로'];
const JUDGE = ['생각한다', '생각했다', '~라고 본다', '판단', '평가', '옳', '그르', '문제점', '아쉬', '동의'];
const QUOTE = ['구절', '문장', '‘', '“', '"', "'"];

const has = (text, words) => words.some((w) => text.includes(w));
const countHits = (text, words) => words.reduce((n, w) => n + (text.includes(w) ? 1 : 0), 0);

export function analyzeEntry(body = '') {
  const len = countChars(body);
  const sentences = body.split(/[.!?。\n]+/).filter((s) => s.trim().length > 1);
  const selfHits = countHits(body, SELF_LINK);
  const socialHits = countHits(body, SOCIAL_LINK);
  const reasonHits = countHits(body, REASON);
  const emotionHits = countHits(body, FLAT_EMOTION);
  const hasQuote = has(body, QUOTE);
  const hasJudge = has(body, JUDGE);

  const connection = selfHits + socialHits;
  const summaryOnly = connection === 0 && reasonHits === 0 && !hasJudge;
  const flatEmotion = emotionHits > 0 && connection === 0 && reasonHits === 0;

  let level = 'high';
  if (summaryOnly || flatEmotion || len < MIN_CHARS) level = 'low';

  return {
    len,
    sentenceCount: sentences.length,
    selfHits,
    socialHits,
    reasonHits,
    emotionHits,
    hasQuote,
    hasJudge,
    summaryOnly,
    flatEmotion,
    suggestedStamp: level,
  };
}

export function ruleFeedback(body = '', keywords = []) {
  const a = analyzeEntry(body);
  const tips = [];

  if (a.len < MIN_CHARS) {
    tips.push(`지금은 ${a.len}자예요. ${MIN_CHARS}자를 채우려면 생각을 한 겹 더 풀어 써야 합니다.`);
  }
  if (a.summaryOnly) {
    tips.push('책 내용 정리가 대부분이에요. 요약은 3분의 1로 줄이고, 나머지는 "나는 이 장면을 보고 ~라고 생각했다"처럼 자신의 판단을 써 보세요.');
  }
  if (a.flatEmotion) {
    tips.push('"슬펐다·무서웠다" 같은 감정 단어에서 멈췄어요. 그 감정이 든 이유를 "왜냐하면"으로 이어 붙이면 바로 상 수준이 됩니다.');
  }
  if (a.selfHits === 0) {
    tips.push('책 내용과 겹치는 내 경험을 한 가지만 떠올려 보세요. 비슷했던 순간, 또는 나라면 어떻게 했을지를 적으면 좋습니다.');
  }
  if (a.socialHits === 0) {
    tips.push('이 이야기가 지금 우리 사회의 어떤 모습과 닮았는지도 한 문장 덧붙여 보세요.');
  }
  if (!a.hasQuote && a.len >= 300) {
    tips.push('가장 인상 깊었던 구절을 그대로 옮겨 적고, 왜 그 문장이 마음에 남았는지 이유를 붙이면 글에 힘이 생깁니다.');
  }
  if (keywords.length && !keywords.some((k) => k && body.includes(k))) {
    tips.push(`직접 고른 키워드(${keywords.filter(Boolean).join(', ')})가 본문에 보이지 않아요. 키워드를 중심으로 생각을 이어 보세요.`);
  }

  if (!tips.length) {
    return '요약과 자신의 생각이 균형 있게 담겼고, 이유까지 분명히 밝혔습니다. 다음에는 인물의 선택에 대한 평가나 판단까지 더해 보면 글이 한층 깊어집니다.';
  }
  return tips.slice(0, 3).join(' ');
}

/* ---------------------------------------------------------------
 * Gemini 호출 (Vercel 서버리스 함수 경유)
 * ------------------------------------------------------------- */

async function callApi(payload) {
  const res = await fetch('/api/feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

const chunk = (arr, size) =>
  arr.reduce((acc, _, i) => (i % size ? acc : [...acc, arr.slice(i, i + size)]), []);

/**
 * 회차 전체 일지에 대한 피드백 생성.
 * @returns {Promise<Array<{id:string, feedback:string, suggestedStamp:'high'|'low', source:'ai'|'rule'}>>}
 */
export async function generateBatchFeedback(entryList, onProgress) {
  const results = [];
  const groups = chunk(entryList, 5);
  let done = 0;

  for (const group of groups) {
    let mapped = null;
    try {
      const data = await callApi({
        mode: 'batch',
        items: group.map((e) => ({
          id: e.id,
          keywords: e.keywords || [],
          bookTitle: e.bookTitle || '',
          body: e.body || '',
          charCount: countChars(e.body || ''),
        })),
      });
      if (Array.isArray(data?.results)) mapped = data.results;
    } catch {
      mapped = null;
    }

    for (const e of group) {
      const hit = mapped?.find((r) => r.id === e.id);
      const local = analyzeEntry(e.body || '');
      results.push({
        id: e.id,
        feedback: hit?.feedback?.trim() || ruleFeedback(e.body || '', e.keywords || []),
        suggestedStamp: hit?.suggestedStamp === 'high' || hit?.suggestedStamp === 'low'
          ? hit.suggestedStamp
          : local.suggestedStamp,
        source: hit?.feedback ? 'ai' : 'rule',
      });
      done += 1;
      onProgress?.(done, entryList.length);
    }
  }
  return results;
}

/** 한 학생의 학기 누적 일지로 성장 평가서 작성 */
export async function generateGrowthReport(student, studentEntries) {
  const stats = {
    total: studentEntries.length,
    high: studentEntries.filter((e) => e.stamp === 'high').length,
    low: studentEntries.filter((e) => e.stamp === 'low').length,
    honor: studentEntries.filter((e) => e.honor).length,
  };
  try {
    const data = await callApi({
      mode: 'growth',
      student: { name: student.name, number: student.number },
      stats,
      items: studentEntries.map((e) => ({
        round: e.round,
        bookTitle: e.bookTitle,
        keywords: e.keywords,
        stamp: e.stamp,
        body: (e.body || '').slice(0, 700),
      })),
    });
    if (data?.report) return { report: data.report, source: 'ai' };
  } catch {
    /* 폴백으로 진행 */
  }

  const first = analyzeEntry(studentEntries[0]?.body || '');
  const last = analyzeEntry(studentEntries[studentEntries.length - 1]?.body || '');
  const grew = last.selfHits + last.socialHits - (first.selfHits + first.socialHits);
  const trend =
    grew > 0
      ? '초반보다 자신의 경험과 사회를 연결 짓는 문장이 늘었습니다.'
      : grew < 0
        ? '초반에 비해 자신의 생각을 연결하는 문장이 줄었습니다. 다시 "나라면"으로 시작하는 문장을 넣어 보세요.'
        : '연결 서술의 양이 학기 내내 비슷하게 유지되었습니다.';
  return {
    report: `총 ${stats.total}회 제출, 상 ${stats.high}개 / 하 ${stats.low}개. ${trend} 앞으로는 인상 깊은 구절을 인용하고 그 이유를 밝히는 방식으로 한 단계 더 나아가 보세요.`,
    source: 'rule',
  };
}
