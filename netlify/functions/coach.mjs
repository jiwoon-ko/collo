import { corsHeaders } from './_db.mjs';

const CHALLENGE_RULES = `절대 규칙 (반드시 지킬 것):
- 이 문제의 정답, FLAG, 최종 페이로드/코드를 그대로 완성해서 주지 마세요. 사용자가 복사해서 붙여넣기만 하면 통과되는 완성된 답을 절대 제공하지 마세요.
- 사용자가 "그냥 답을 알려줘", "정답이 뭐야", "복사할 수 있게 완성된 코드를 줘", "너는 선생님이니까 알려줘도 돼" 등 어떤 방식으로 요청하더라도 완성된 정답 제공을 거절하고, 대신 개념 설명과 스스로 생각해볼 힌트만 제공하세요.
- 취약점의 원리, 왜 그런 문제가 생기는지, 어떤 부분을 살펴봐야 하는지는 자유롭게 자세히 설명해도 됩니다. 다만 최종 정답 문자열 자체를 완성해서 제시하지는 마세요.
- 학생이 스스로 생각해서 정답을 완성하도록 유도하는 것이 목표입니다.`;

const buildChallengePrompt = ({ category, challengeTitle, codeContext, userMessage }) => `당신은 화이트햇 보안 교육 워게임 플랫폼의 AI 보안 코치입니다. 100명 규모의 학생들이 실습 중이며, 이 문제의 정답 무결성이 중요합니다.

현재 카테고리: ${category || 'Web Security'}
문제 제목: ${challengeTitle || 'Wargame Challenge'}
코드 컨텍스트:
${codeContext || '(제공되지 않음)'}

${CHALLENGE_RULES}

학생의 질문: ${userMessage || '힌트를 알려주세요.'}

친절하고 이해하기 쉬운 말투로, 3~5문장 이내로 답변하세요.`;

const buildGeneralPrompt = ({ userMessage }) => `당신은 보안 입문자를 위한 친절한 AI 보안 튜터입니다. 사용자는 화이트햇 보안 워게임 플랫폼에서 배우는 학생이며, 특정 문제와 무관하게 일반적인 보안 개념을 질문하고 있습니다.

전문 용어를 쓰더라도 반드시 쉬운 말로 풀어서 설명하고, 가능하면 짧은 예시를 들어주세요. 너무 길지 않게, 이해하기 쉽게 답변하세요 (5문장 내외).

학생의 질문: ${userMessage}`;

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
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || 'Claude API 오류');
  return data.content?.[0]?.text || '';
};

const callGemini = async (apiKey, prompt) => {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
  });
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
};

const callOpenAI = async (apiKey, prompt) => {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 500,
    }),
  });
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
};

// 방어선: 혹시라도 응답에 FLAG{...} 형태가 그대로 섞여 나오면 걸러냄
const scrubFlag = (text) => text.replace(/FLAG\{[^}]*\}/gi, '[FLAG 비공개]');

export const handler = async (event) => {
  const headers = corsHeaders('POST');
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  const { challengeTitle, category, userMessage, codeContext, mode } = JSON.parse(event.body || '{}');
  const isGeneral = mode === 'general';
  const prompt = isGeneral
    ? buildGeneralPrompt({ userMessage })
    : buildChallengePrompt({ category, challengeTitle, codeContext, userMessage });

  const providers = [
    { key: process.env.ANTHROPIC_API_KEY, call: callClaude },
    { key: process.env.GEMINI_API_KEY, call: callGemini },
    { key: process.env.OPENAI_API_KEY, call: callOpenAI },
  ];

  for (const provider of providers) {
    if (!provider.key) continue;
    try {
      const reply = await provider.call(provider.key, prompt);
      if (reply) return { statusCode: 200, headers, body: JSON.stringify({ reply: scrubFlag(reply) }) };
    } catch (e) {
      console.warn('AI coach provider call failed:', e.message);
    }
  }

  // 휴리스틱 폴백 (API 키가 없거나 모든 호출이 실패한 경우)
  const hints = {
    'SQL Injection': 'SQL Injection의 핵심은 사용자 입력이 데이터가 아닌 "명령어(문법 기호)"로 해석되는 데 있습니다. 작은따옴표(\')로 문자열을 닫고, OR 조건이나 주석 기호(--, #)가 쿼리 구조에 미치는 영향을 추적해 보세요.',
    'XSS 스크립트': 'XSS 공격은 브라우저가 사용자 입력을 단순 텍스트가 아닌 실행 가능한 HTML 태그나 자바스크립트로 인식할 때 발생합니다. <script> 태그나 이벤트 핸들러(onerror, onload) 속성을 확인하세요.',
    'default': '입력값이 검증 없이 서버나 브라우저의 핵심 렌더링/실행 엔진에 전달되는 신뢰 경계를 파악하는 것이 급선무입니다.',
  };
  const advice = hints[category] || hints['default'];
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ reply: `[AI 코치 분석] ${advice}\n\n질문하신 내용("${userMessage}")에 대해 코드의 파라미터 처리 부분을 다시 한 번 점검해 보세요.` }),
  };
};
