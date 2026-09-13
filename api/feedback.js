/**
 * Vercel Serverless Function — Gemini 피드백 생성
 * 브라우저에 API 키가 노출되지 않도록 반드시 이 함수를 거쳐서 호출합니다.
 * 환경변수: GEMINI_API_KEY  (VITE_ 접두사를 붙이면 안 됩니다!)
 */

export const config = { maxDuration: 60 };

const MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
const ENDPOINT = (model) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

const RUBRIC = `
너는 대한민국 중학교 3학년 국어과 독서 수업을 담당하는 교사다.
학생이 쓴 '초간단 독서일지'를 읽고, 학생 본인에게 직접 건네는 피드백을 쓴다.

[평가 기준]
- '하': 책 내용만 요약했거나, 자신의 생각이 "슬펐다/기뻤다/궁금했다/인상 깊었다/무서웠다/불쌍했다" 수준으로만 단순하게 드러난 경우.
- '상': 책 내용 요약(3분의 1) + 자신의 생각(3분의 2)이 구체적이고 분명하게 드러난 경우.

[상 수준으로 가는 서술 방법 — 피드백은 이 중 학생 글에 가장 부족한 것을 짚어 준다]
1. 책 내용과 연관된 나의 경험과 생각 떠올리기
2. 책 내용과 연관된 우리 사회의 모습 떠올리기
3. 가장 인상 깊었던 구절 + 그 이유
4. 내가 느낀 구체적인 감정과 생각 + 그 이유
5. 책 속 인물에 대한 평가나 판단 + 그 이유

[피드백 작성 규칙]
- 한국어 2~3문장, 총 120자 이내.
- 반드시 잘한 점 한 가지를 먼저 짚고, 그다음 고칠 점을 구체적으로 제시한다.
- "구체적으로 쓰세요" 같은 막연한 말 금지. 그 학생 글에 실제로 등장한 소재·인물·장면을 인용해 무엇을 어떻게 덧붙일지 알려 준다.
- 중학생이 읽는 글이므로 존중하는 말투(~해요/~합니다)를 쓰고, 비난하거나 점수를 통보하지 않는다.
- 학생 글 속에 개인정보나 부적절한 내용이 있어도 그대로 옮겨 적지 않는다.
`;

async function callGemini(prompt, schema) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY 환경변수가 없습니다.');

  const res = await fetch(ENDPOINT(MODEL), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        // Gemini 3 계열에서는 temperature / topP / topK가 폐기되어 넣으면 400 오류가 납니다.
        maxOutputTokens: 4096,
        responseMimeType: 'application/json',
        ...(schema ? { responseSchema: schema } : {}),
      },
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Gemini ${res.status}: ${detail.slice(0, 300)}`);
  }

  const data = await res.json();
  const text =
    data?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') ?? '';
  const clean = text.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  return JSON.parse(clean);
}

const batchSchema = {
  type: 'OBJECT',
  properties: {
    results: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          id: { type: 'STRING' },
          feedback: { type: 'STRING' },
          suggestedStamp: { type: 'STRING', enum: ['high', 'low'] },
        },
        required: ['id', 'feedback', 'suggestedStamp'],
      },
    },
  },
  required: ['results'],
};

const growthSchema = {
  type: 'OBJECT',
  properties: { report: { type: 'STRING' } },
  required: ['report'],
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'POST만 지원합니다.' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const { mode } = body;

    if (mode === 'batch') {
      const items = (body.items || []).slice(0, 8);
      if (!items.length) return res.status(400).json({ error: '분석할 일지가 없습니다.' });

      const prompt = `${RUBRIC}

아래는 학생 ${items.length}명의 독서일지다. 각 일지마다 id를 그대로 유지하여 피드백과 도장 추천(suggestedStamp)을 만들어라.

${items
  .map(
    (it, i) => `--- 일지 ${i + 1} ---
id: ${it.id}
책 제목: ${it.bookTitle || '(미기재)'}
학생이 고른 키워드: ${(it.keywords || []).join(', ') || '(없음)'}
공백 제외 글자 수: ${it.charCount}
본문:
${String(it.body || '').slice(0, 1200)}`
  )
  .join('\n\n')}

JSON 형식으로만 답하라: {"results":[{"id":"...","feedback":"...","suggestedStamp":"high"|"low"}]}`;

      const out = await callGemini(prompt, batchSchema);
      return res.status(200).json({ results: out.results || [] });
    }

    if (mode === 'growth') {
      const { student = {}, stats = {}, items = [] } = body;
      const prompt = `${RUBRIC}

아래는 ${student.name || '한 학생'}이(가) 한 학기 동안 쓴 독서일지 ${items.length}편이다.
누적 도장: 상 ${stats.high ?? 0}개, 하 ${stats.low ?? 0}개, 명예의 전당 ${stats.honor ?? 0}회.

${items
  .map(
    (it) => `[${it.round}회차 · ${it.bookTitle || '제목 미기재'} · 도장:${it.stamp || '미채점'}]
${String(it.body || '').slice(0, 700)}`
  )
  .join('\n\n')}

학기 전체를 관통하는 성장 평가서를 써라. 조건:
- 한국어 4~5문장, 300자 내외.
- 회차가 지나며 달라진 점(좋아진 점과 아직 부족한 점)을 실제 글의 소재를 근거로 짚을 것.
- 마지막 문장은 다음 학기에 시도해 볼 구체적인 서술 방법 한 가지를 제안할 것.
- 학교생활기록부에 옮겨 적어도 어색하지 않은 담백한 문장으로 쓸 것.

JSON 형식으로만 답하라: {"report":"..."}`;

      const out = await callGemini(prompt, growthSchema);
      return res.status(200).json({ report: out.report || '' });
    }

    return res.status(400).json({ error: 'mode는 batch 또는 growth여야 합니다.' });
  } catch (err) {
    console.error('[feedback]', err);
    return res.status(500).json({ error: String(err.message || err) });
  }
}
