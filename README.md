# AEGIS CYBER ARENA — 통합 보안 워게임 플랫폼

폴더 1(AegisPath 단일 HTML 워게임), 2(Sentinel Arena 백엔드/DB 연동 풀스택), 3(CYBERHACKSTEP 사이버펑크 HUD)의 모든 기능을 하나로 통합한 보안 워게임 플랫폼입니다.

배포는 **Netlify**(프론트엔드 + Serverless Functions), 데이터베이스는 **Neon(PostgreSQL)**을 사용합니다.

---

## 🏗️ 구조

```
netlify/functions/   Netlify Functions (백엔드 API) — auth, me, sync, rankings, posts, coach
src/                 React + Vite 프론트엔드 (App.tsx)
init-db.js           Neon DB 테이블 생성 스크립트 (최초 1회 실행)
netlify.toml         Netlify 빌드 / 리다이렉트 설정
```

챌린지 문제(제목, 코드, 힌트, flag 등)는 `src/App.tsx`의 `masterProblemDB`에 정적으로 포함되어 있습니다. DB에는 **계정, 누적 XP, 클리어한 문제 목록, 전술 마스터리 진행도, 커뮤니티 게시글**만 저장됩니다.

---

## 🚀 로컬 개발

### 1. 사전 준비
- [Node.js 20+](https://nodejs.org) 설치
- [Neon](https://neon.tech)에서 무료 프로젝트 생성 후 **Connection string** 복사 (Dashboard → Connect)

### 2. 환경변수 설정
`.env.example`을 복사해 `.env` 파일을 만들고 `DATABASE_URL`을 Neon 연결 문자열로 채워주세요.

```bash
cp .env.example .env
```

### 3. DB 테이블 생성 (최초 1회)
```bash
npm install
npm run init-db
```

### 4. 개발 서버 실행
Netlify Functions까지 함께 로컬에서 띄우려면 Netlify CLI를 사용하세요 (권장):
```bash
npm run dev
```
프론트엔드만 빠르게 확인하고 싶다면 (백엔드 API 없이):
```bash
npm run dev:vite-only
```

즉시 브라우저에서 열어보고 싶다면 `standalone.html`을 더블클릭해도 됩니다. (단, 이 파일은 정적 스냅샷이라 이번에 추가된 DB 연동 로그인/랭킹/커뮤니티 기능은 반영되어 있지 않습니다.)

---

## ☁️ Netlify 배포

1. 이 폴더를 GitHub 저장소로 push
2. [Netlify](https://app.netlify.com) → **Add new site → Import an existing project** → 저장소 선택
3. Build settings는 `netlify.toml`에 이미 정의되어 있어 자동 인식됩니다 (`npm run build`, publish `dist`)
4. **Site settings → Environment variables**에 아래 값을 등록:
   - `DATABASE_URL` — Neon 연결 문자열 (Pooled connection 권장)
   - `JWT_SECRET` — 임의의 긴 랜덤 문자열
   - (선택) `GEMINI_API_KEY` 또는 `OPENAI_API_KEY` — 설정 시 AI 코치가 실제 LLM 응답 사용, 없으면 자동 휴리스틱 힌트로 동작
5. 배포 완료 후, 로컬에서 `npm run init-db`를 실행해 Neon에 테이블을 생성해두면 배포된 사이트에서도 바로 회원가입/로그인이 동작합니다.

---

## 🌟 핵심 기능

1. **듀얼 작전 모드 (Offensive & Defensive)** — 취약점 분석/침투 실습(HACKING), 시큐어 코딩 패치 실습(SECURITY)
2. **8대 보안 카테고리** — SQL Injection, XSS, 메모리 취약점, 암호 해독, 네트워크 패킷, 웹 해킹(LFI/RCE), 디지털 포렌식, 리버싱
3. **3분할 실전 샌드박스** — 시나리오/코드/CWE 이론 탭, 실시간 터미널 + FLAG 제출, AI 보안 코치 대화창
4. **8축 전술 레이더 차트 & 마스터리 시스템** (0T~5T)
5. **10단계 개발자 레벨 티어 & 칭호 보관소**
6. **커뮤니티(암호화 통신망)** — Neon DB에 저장되어 모든 사용자에게 공유됨
7. **실시간 글로벌 랭킹** — Neon DB의 누적 포인트 기준 (`/api/rankings`)
8. **계정 시스템** — 회원가입/로그인 시 진행 상황(XP, 클리어 목록, 마스터리)이 Neon DB에 저장되어 기기 간 동기화. 게스트 로그인은 이 기기에만 로컬 저장됩니다.
