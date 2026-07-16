# Sentinel Arena

React + TypeScript + Vite로 만든 보안 교육 워게임 프런트엔드입니다. 실습은 브라우저 내의 **시뮬레이션**이며 실제 공격 요청이나 데이터베이스 연결을 실행하지 않습니다.

## 실행

```bash
npm install
npm run dev
```

## 배포 (Netlify)

- Build command: `npm run build`
- Publish directory: `dist`
- Node: 20 이상

`netlify.toml`이 포함되어 있어 저장소를 연결하면 자동으로 설정됩니다.

## 연결 지점

- Neon DB: `src/App.tsx`의 `DEMO_DATA`를 API 요청으로 교체하세요.
- 로그인: 헤더의 프로필 버튼을 OAuth/세션 모달로 연결하세요.
- AI 코치: `askCoach`를 서버 측 OpenAI 호출로 교체하세요. API 키는 절대 브라우저에 보관하지 마세요.
