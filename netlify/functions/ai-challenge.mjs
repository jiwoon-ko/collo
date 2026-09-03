import { getPool, corsHeaders } from './_db.mjs';

const buildPrompt = (category, role) => `당신은 화이트햇 보안 워게임 플랫폼의 문제 출제자입니다.
카테고리: ${category}
작전 모드: ${role} (Hacking = 공격 페이로드를 작성해야 하는 문제, Security = 방어/패치 코드를 작성해야 하는 문제)
난이도: 고급(Hard) — 실무에서 마주칠 법한 현실적이고 창의적인 시나리오로 작성하세요. 흔한 예시(admin'--, alert(1) 등)는 피하고 새로운 변형을 만드세요.

아래 JSON 스키마와 정확히 일치하는 하나의 JSON 객체만 출력하세요. 다른 설명 텍스트는 절대 포함하지 마세요.
{
  "title": "문제 제목 (한글, [고급] 접두사 포함)",
  "desc": "상황 설명 (한글, HTML 일부 허용: <code>, <b>, <div class='code-snippet'>...</div>). 마지막 줄에 '정답 작성 양식: ...' 형태로 기대하는 답안 형식을 반드시 명시할 것.",
  "code": "취약하거나 패치가 필요한 코드 조각",
  "language": "코드 언어 (예: javascript, python, sql, java, php)",
  "hint": "짧은 힌트 한 문장",
  "answer": "정답 문자열 (제출값과 정확히 일치해야 하는 채점 기준, 너무 길거나 모호하지 않게)",
  "cwe": "관련 CWE 번호 (예: CWE-89)"
}`;

const callGemini = async (apiKey, prompt) => {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json' },
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || 'Gemini API 오류');
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
};

const callOpenAI = async (apiKey, prompt) => {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'You only output a single JSON object matching the requested schema. No other text.' },
        { role: 'user', content: prompt },
      ],
      max_tokens: 1200,
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || 'OpenAI API 오류');
  return data.choices?.[0]?.message?.content || '';
};

const callClaude = async (apiKey, prompt) => {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1200,
      messages: [{ role: 'user', content: `${prompt}\n\nJSON 객체 하나만 출력하고 다른 텍스트(설명, 코드펜스 등)는 절대 포함하지 마세요.` }],
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || 'Claude API 오류');
  const raw = data.content?.[0]?.text || '';
  // 혹시 ```json ... ``` 코드펜스로 감싸져 오면 벗겨냄
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  return fenced ? fenced[1] : raw;
};

export const handler = async (event) => {
  const headers = corsHeaders('GET, POST');
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  const pool = getPool();
  try {
    // GET: 다른 사용자들이 만들어 둔 AI 문제 보관함 목록
    if (event.httpMethod === 'GET') {
      const result = await pool.query('SELECT * FROM ai_challenges ORDER BY id DESC LIMIT 50');
      return { statusCode: 200, headers, body: JSON.stringify({ challenges: result.rows }) };
    }

    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    const { category, provider, apiKey, author } = JSON.parse(event.body || '{}');
    if (!apiKey) return { statusCode: 400, headers, body: JSON.stringify({ error: 'AI API 키가 필요합니다.' }) };
    if (!category) return { statusCode: 400, headers, body: JSON.stringify({ error: '카테고리를 선택해주세요.' }) };

    const role = Math.random() < 0.5 ? 'Hacking' : 'Security';
    const prompt = buildPrompt(category, role);

    let text = '';
    if (provider === 'claude') text = await callClaude(apiKey, prompt);
    else if (provider === 'openai') text = await callOpenAI(apiKey, prompt);
    else text = await callGemini(apiKey, prompt);

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error('AI 응답을 JSON으로 해석하지 못했습니다. 다시 시도해 주세요.');
    }
    if (!parsed.title || !parsed.answer) {
      throw new Error('AI 응답에 title 또는 answer가 없습니다. 다시 시도해 주세요.');
    }

    const flag = `FLAG{AI_${category.replace(/[^A-Za-z0-9]/g, '_').toUpperCase()}_${Date.now()}}`;
    const insertRes = await pool.query(
      `INSERT INTO ai_challenges (title, category, role, level, xp, cwe, answer, flag, "desc", code, language, hint, created_by)
       VALUES ($1, $2, $3, 'Hard', 300, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [parsed.title, category, role, parsed.cwe || '', parsed.answer, flag, parsed.desc || '', parsed.code || '', parsed.language || 'text', parsed.hint || '', (author || 'Anonymous').slice(0, 50)]
    );

    return { statusCode: 201, headers, body: JSON.stringify({ problem: insertRes.rows[0] }) };
  } catch (err) {
    console.error('AI challenge error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: `AI 문제 생성 중 오류: ${err.message}` }) };
  } finally {
    await pool.end();
  }
};
