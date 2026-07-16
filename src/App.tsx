import { useEffect, useState } from "react";

type View = "home" | "challenges" | "arena" | "rankings" | "learn" | "admin";
type Challenge = {
  id: number;
  title: string;
  category: string;
  level: string;
  points: number;
  desc: string;
  progress: number;
  accent: string;
  icon: string;
};

const challenges: Challenge[] = [
  {
    id: 1,
    title: "Echo Chamber",
    category: "XSS",
    level: "Beginner",
    points: 120,
    desc: "반사형 입력이 페이지에 닿는 과정을 추적하세요.",
    progress: 0,
    accent: "violet",
    icon: "◌",
  },
  {
    id: 2,
    title: "False Query",
    category: "SQLi",
    level: "Beginner",
    points: 160,
    desc: "로그인 쿼리의 신뢰 경계를 찾아보세요.",
    progress: 0,
    accent: "amber",
    icon: "⌁",
  },
  {
    id: 3,
    title: "Header Ghost",
    category: "Web",
    level: "Intermediate",
    points: 250,
    desc: "응답 헤더에 숨겨진 정책의 틈을 읽습니다.",
    progress: 35,
    accent: "cyan",
    icon: "↗",
  },
  {
    id: 4,
    title: "Quiet Harbor",
    category: "API",
    level: "Intermediate",
    points: 310,
    desc: "권한 검증의 순서를 안전하게 모델링합니다.",
    progress: 0,
    accent: "pink",
    icon: "◎",
  },
];

const Icon = ({ name, size = 18 }: { name: string; size?: number }) => {
  const paths: Record<string, string> = {
    home: "M3 10.7 12 3l9 7.7v9.8a.5.5 0 0 1-.5.5H15v-6H9v6H3.5a.5.5 0 0 1-.5-.5v-9.3Z",
    grid: "M4 4h6v6H4V4Zm10 0h6v6h-6V4ZM4 14h6v6H4v-6Zm10 0h6v6h-6v-6Z",
    trophy:
      "M8 4h8v3h3v2a4 4 0 0 1-3 3.87A5 5 0 0 1 13 16.7V19h3v2H8v-2h3v-2.3a5 5 0 0 1-3-3.83A4 4 0 0 1 5 9V7h3V4Z",
    book: "M5 4.5A2.5 2.5 0 0 1 7.5 2H20v18H7.5A2.5 2.5 0 0 0 5 22V4.5Zm2.5-.5A.5.5 0 0 0 7 4.5v13.1c.16-.04.33-.07.5-.09H18V4H7.5Z",
    shield:
      "M12 2 20 5v6c0 5-3.45 9.74-8 11-4.55-1.26-8-6-8-11V5l8-3Zm0 3.13L7 7v4c0 3.7 2.4 7.12 5 8.35 2.6-1.23 5-4.65 5-8.35V7l-5-1.87Z",
    plus: "M12 5v14M5 12h14",
    arrow: "M5 12h13m-5-5 5 5-5 5",
    check: "m5 12 4.2 4L19 6.5",
    bolt: "m13 2-9 12h7l-1 8 10-13h-7l0-7Z",
    terminal: "m5 7 4 4-4 4m6 1h7",
    lock: "M6 10V7a6 6 0 0 1 12 0v3m-13 0h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1Z",
    spark: "m12 2 1.7 6.3L20 10l-6.3 1.7L12 18l-1.7-6.3L4 10l6.3-1.7L12 2Z",
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={paths[name] || paths.spark} />
    </svg>
  );
};

function App() {
  const [view, setView] = useState<View>("home");
  const [selected, setSelected] = useState<Challenge>(challenges[0]);
  const [completed, setCompleted] = useState<number[]>([]);
  const [toast, setToast] = useState("");
  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2800);
  };
  const applyRoute = () => {
    const [, route = "home", id] = window.location.hash.split("/");
    const nextView = [
      "home",
      "challenges",
      "arena",
      "rankings",
      "learn",
      "admin",
    ].includes(route)
      ? (route as View)
      : "home";
    if (nextView === "arena")
      setSelected(challenges.find((c) => c.id === Number(id)) ?? challenges[0]);
    setView(nextView);
  };
  useEffect(() => {
    applyRoute();
    window.addEventListener("hashchange", applyRoute);
    return () => window.removeEventListener("hashchange", applyRoute);
  }, []);
  const navigate = (nextView: View, challenge?: Challenge) => {
    const route = challenge ? `#arena/${challenge.id}` : `#${nextView}`;
    if (window.location.hash === route) {
      applyRoute();
      return;
    }
    window.location.hash = route;
  };
  const openChallenge = (challenge: Challenge) => navigate("arena", challenge);
  const nav = [
    { id: "home", label: "Overview", icon: "home" },
    { id: "challenges", label: "Challenges", icon: "grid" },
    { id: "rankings", label: "Rankings", icon: "trophy" },
    { id: "learn", label: "Learning", icon: "book" },
    { id: "admin", label: "Control room", icon: "shield" },
  ] as { id: View; label: string; icon: string }[];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button className="brand" onClick={() => navigate("home")}>
          <span className="brand-mark">
            <span />
          </span>
          <span>
            SENTINEL<em>ARENA</em>
          </span>
        </button>
        <div className="nav-label">WORKSPACE</div>
        <nav>
          {nav.map((item) => (
            <button
              key={item.id}
              className={"nav-item " + (view === item.id ? "active" : "")}
              onClick={() => navigate(item.id)}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
              {item.id === "challenges" && <b>4</b>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="streak-card">
            <span className="streak-icon">✦</span>
            <div>
              <strong>7 day streak</strong>
              <small>Keep your signal strong.</small>
            </div>
          </div>
          <button className="profile">
            <span className="avatar">J</span>
            <span>
              <strong>Jin Kim</strong>
              <small>Rookie · Lv. 4</small>
            </span>
            <span className="dots">•••</span>
          </button>
        </div>
      </aside>
      <main className="main">
        <header className="topbar">
          <div className="crumb">
            <span>Workspace</span>
            <span>/</span>
            <strong>
              {view === "home"
                ? "Overview"
                : view === "arena"
                  ? selected.title
                  : nav.find((n) => n.id === view)?.label}
            </strong>
          </div>
          <div className="top-actions">
            <button
              className="ghost-btn"
              onClick={() => notify("알림이 없습니다.")}
            >
              ◔
            </button>
            <button className="help" onClick={() => navigate("learn")}>
              ?
            </button>
          </div>
        </header>
        {view === "home" && (
          <Home
            setView={navigate}
            openChallenge={openChallenge}
            completed={completed}
          />
        )}
        {view === "challenges" && (
          <Challenges openChallenge={openChallenge} completed={completed} />
        )}
        {view === "arena" && (
          <Arena
            challenge={selected}
            completed={completed}
            setCompleted={setCompleted}
            notify={notify}
            onBack={() => navigate("challenges")}
          />
        )}
        {view === "rankings" && <Rankings />}{" "}
        {view === "learn" && <Learning openChallenge={openChallenge} />}{" "}
        {view === "admin" && <Admin notify={notify} />}
      </main>
      {toast && (
        <div className="toast">
          <Icon name="check" size={16} />
          {toast}
        </div>
      )}
    </div>
  );
}

function Home({
  setView,
  openChallenge,
  completed,
}: {
  setView: (v: View) => void;
  openChallenge: (c: Challenge) => void;
  completed: number[];
}) {
  const progress = Math.round((completed.length / challenges.length) * 100);
  return (
    <div className="page home-page">
      <section className="welcome">
        <div>
          <span className="eyebrow">
            <i /> SECURITY TRAINING PLATFORM
          </span>
          <h1>
            Train your instinct.
            <br />
            <span>Build your defense.</span>
          </h1>
          <p>
            안전한 시뮬레이션 안에서 공격의 흐름을 이해하고,
            <br />더 견고한 서비스를 설계하세요.
          </p>
          <div className="hero-actions">
            <button className="primary" onClick={() => setView("challenges")}>
              챌린지 둘러보기 <Icon name="arrow" size={16} />
            </button>
            <button className="text-btn" onClick={() => setView("learn")}>
              학습 경로 보기
            </button>
          </div>
        </div>
        <div className="signal-visual" aria-label="Security signal visual">
          <div className="orb o1" />
          <div className="orb o2" />
          <div className="scan-line" />
          <div className="hex h1">⌘</div>
          <div className="hex h2">◈</div>
          <div className="signal-core">
            <Icon name="shield" size={39} />
          </div>
          <span className="signal-caption">LIVE ENVIRONMENT</span>
        </div>
      </section>
      <section className="stats">
        <Stat
          label="CURRENT RANK"
          value="# 248"
          meta="↑ 12 this week"
          icon="trophy"
        />
        <Stat
          label="SIGNAL POINTS"
          value={`${840 + completed.length * 120}`}
          meta="Next level at 1,200"
          icon="bolt"
        />
        <Stat
          label="COMPLETION"
          value={`${progress}%`}
          meta={`${completed.length} of ${challenges.length} modules`}
          icon="check"
        />
      </section>
      <section className="section-heading">
        <div>
          <span className="eyebrow">
            <i /> KEEP EXPLORING
          </span>
          <h2>Continue your training</h2>
        </div>
        <button className="link-btn" onClick={() => setView("challenges")}>
          All challenges <Icon name="arrow" size={15} />
        </button>
      </section>
      <div className="challenge-grid">
        {challenges.slice(0, 3).map((c) => (
          <ChallengeCard
            key={c.id}
            challenge={c}
            done={completed.includes(c.id)}
            onClick={() => openChallenge(c)}
          />
        ))}
      </div>
      <section className="coach-banner">
        <div className="coach-orbit">
          <span>✦</span>
        </div>
        <div>
          <span className="eyebrow">
            <i /> AI SECURITY COACH
          </span>
          <h3>막히는 지점이 있나요?</h3>
          <p>
            해답을 바로 보여주지 않고, 다음에 살펴볼 단서를 함께 찾아드릴게요.
          </p>
        </div>
        <button
          className="outline-btn"
          onClick={() => openChallenge(challenges[0])}
        >
          코치와 시작하기 <Icon name="spark" size={16} />
        </button>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  meta,
  icon,
}: {
  label: string;
  value: string;
  meta: string;
  icon: string;
}) {
  return (
    <div className="stat">
      <div className="stat-icon">
        <Icon name={icon} />
      </div>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
        <span>{meta}</span>
      </div>
    </div>
  );
}

function ChallengeCard({
  challenge,
  done,
  onClick,
}: {
  challenge: Challenge;
  done: boolean;
  onClick: () => void;
}) {
  return (
    <button className={"challenge-card " + challenge.accent} onClick={onClick}>
      <div className="card-top">
        <span className="challenge-symbol">{done ? "✓" : challenge.icon}</span>
        <span className="tag">{challenge.category}</span>
      </div>
      <div className="card-body">
        <h3>{challenge.title}</h3>
        <p>{challenge.desc}</p>
      </div>
      <div className="card-bottom">
        <span className="difficulty">
          <i className={challenge.level === "Beginner" ? "easy" : ""} />
          {challenge.level}
        </span>
        <span className="points">+{challenge.points} SP</span>
      </div>
      {challenge.progress > 0 && (
        <div className="progress">
          <i style={{ width: `${challenge.progress}%` }} />
        </div>
      )}
    </button>
  );
}

function Challenges({
  openChallenge,
  completed,
}: {
  openChallenge: (c: Challenge) => void;
  completed: number[];
}) {
  const [filter, setFilter] = useState("All");
  const filtered =
    filter === "All"
      ? challenges
      : challenges.filter((c) => c.category === filter);
  return (
    <div className="page">
      <section className="page-title">
        <span className="eyebrow">
          <i /> PRACTICE LABS
        </span>
        <h1>Choose your next signal</h1>
        <p>모든 실습은 격리된 학습 시나리오에서 안전하게 진행됩니다.</p>
      </section>
      <div className="filter-row">
        {["All", "XSS", "SQLi", "Web", "API"].map((f) => (
          <button
            className={filter === f ? "selected" : ""}
            key={f}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>
      <div className="challenge-grid all-challenges">
        {filtered.map((c) => (
          <ChallengeCard
            key={c.id}
            challenge={c}
            done={completed.includes(c.id)}
            onClick={() => openChallenge(c)}
          />
        ))}
      </div>
    </div>
  );
}

function Arena({
  challenge,
  completed,
  setCompleted,
  notify,
  onBack,
}: {
  challenge: Challenge;
  completed: number[];
  setCompleted: React.Dispatch<React.SetStateAction<number[]>>;
  notify: (s: string) => void;
  onBack: () => void;
}) {
  const [tab, setTab] = useState<"brief" | "lab" | "guide">("brief");
  const [payload, setPayload] = useState("<img src=x onerror=alert(1)>");
  const [logs, setLogs] = useState<string[]>([
    "Sandbox initialized",
    "Policy: simulation-only environment",
  ]);
  const [flag, setFlag] = useState("");
  const [coachOpen, setCoachOpen] = useState(true);
  const [coachInput, setCoachInput] = useState("");
  const [messages, setMessages] = useState([
    {
      role: "coach",
      text: "좋아요. 먼저 입력값이 어디에서 DOM으로 다시 그려지는지 추적해 볼까요? 데이터의 “출처”와 “도착점”을 연결해 보세요.",
    },
  ]);
  const [simulation, setSimulation] = useState<{
    risk: "low" | "high";
    summary: string;
  } | null>(null);
  const [running, setRunning] = useState(false);
  const [capturedFlag, setCapturedFlag] = useState(false);
  const run = () => {
    const isRisky = /<|onerror|script|javascript:/i.test(payload);
    setRunning(true);
    setSimulation(null);
    setCapturedFlag(false);
    window.setTimeout(() => {
      setLogs((l) => [
        ...l,
        `Input received: ${payload.slice(0, 28)}…`,
        `Parser analysis: ${isRisky ? "untrusted markup reaches an unsafe sink" : "plain text reaches the output boundary"}`,
        "Simulation complete · no external requests made",
      ]);
      setSimulation({
        risk: isRisky ? "high" : "low",
        summary: isRisky
          ? "입력값이 HTML로 해석될 수 있는 경로를 감지했습니다."
          : "활성 마크업 패턴이 감지되지 않았습니다.",
      });
      setCapturedFlag(isRisky);
      setRunning(false);
      notify("시뮬레이션 분석 결과가 업데이트되었습니다.");
    }, 420);
  };
  const submit = () => {
    if (flag.trim().toLowerCase() === "flag{echo_reflection_found}") {
      if (!completed.includes(challenge.id))
        setCompleted((v) => [...v, challenge.id]);
      notify(`정답입니다! +${challenge.points} SP를 획득했습니다.`);
    } else notify("아직 일치하지 않아요. 가이드의 흐름도를 다시 살펴보세요.");
  };
  const ask = () => {
    if (!coachInput.trim()) return;
    setMessages((m) => [
      ...m,
      { role: "you", text: coachInput },
      {
        role: "coach",
        text: "좋은 질문이에요. 실행 결과보다 먼저, 사용자 입력이 인코딩 없이 렌더링 경계에 도달하는지 확인하세요. 이것이 이번 시나리오의 핵심 단서입니다.",
      },
    ]);
    setCoachInput("");
  };
  return (
    <div className="arena-page">
      <div className="arena-head">
        <button className="back" onClick={onBack} aria-label="Back to challenges">
          ←
        </button>
        <div>
          <span className="eyebrow">
            <i /> {challenge.category} · {challenge.level.toUpperCase()}
          </span>
          <h1>{challenge.title}</h1>
        </div>
        <span className="arena-points">+{challenge.points} SP</span>
      </div>
      <div className="arena-tabs">
        {(
          [
            ["brief", "Mission brief"],
            ["lab", "Live lab"],
            ["guide", "Theory & guide"],
          ] as const
        ).map(([id, label]) => (
          <button
            className={tab === id ? "active" : ""}
            key={id}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="arena-layout">
        <section className="lab-panel">
          {tab === "brief" && (
            <MissionBrief challenge={challenge} onStart={() => setTab("lab")} />
          )}{" "}
          {tab === "lab" && (
            <>
              <div className="panel-title">
                <div>
                  <span className="tiny-label">SIMULATION CONSOLE</span>
                  <h2>Observe the reflection</h2>
                </div>
                <span className="safe-chip">
                  <Icon name="lock" size={13} /> Isolated
                </span>
              </div>
              <div className="code-window">
                <div className="code-bar">
                  <span />
                  <span />
                  <span />
                  <b>preview.tsx</b>
                </div>
                <pre>
                  <code>
                    <em>01</em> const search = new
                    URLSearchParams(location.search);{`\n`}
                    <em>02</em> const query = search.get(<span>'q'</span>) ||{" "}
                    <span>''</span>;{`\n`}
                    <em>03</em>{" "}
                    <mark>
                      result.innerHTML = `Results for: $&#123;query&#125;`;
                    </mark>
                    {`\n`}
                    <em>04</em> // What crosses the rendering boundary?
                  </code>
                </pre>
              </div>
              <div className="input-row">
                <label>Test input</label>
                <textarea
                  value={payload}
                  onChange={(e) => setPayload(e.target.value)}
                />
                <button className="run-btn" onClick={run} disabled={running}>
                  <Icon name="terminal" size={16} />
                  {running ? "Analyzing…" : "Run simulation"}
                </button>
              </div>
              <FlowMap logs={logs} flagCaptured={capturedFlag} />
            </>
          )}{" "}
          {tab === "guide" && (
            <Guide challenge={challenge} onTry={() => setTab("lab")} />
          )}
        </section>
        <aside className="side-stack">
          <div className="flag-panel">
            <div className="panel-title">
              <div>
                <span className="tiny-label">OBJECTIVE</span>
                <h3>Capture the flag</h3>
              </div>
              <Icon name="shield" />
            </div>
            <p>취약한 렌더링 경로를 확인하고 아래 플래그를 제출하세요.</p>
            <div className="flag-form">
              <input
                value={flag}
                onChange={(e) => setFlag(e.target.value)}
                placeholder="flag{...}"
              />
              <button onClick={submit}>Submit</button>
            </div>
            {capturedFlag && (
              <div className="flag-found">
                <span>FLAG CAPTURED</span>
                <code>flag&#123;echo_reflection_found&#125;</code>
                <button onClick={() => setFlag("flag{echo_reflection_found}")}>
                  Use flag
                </button>
              </div>
            )}
            <small>완료 여부는 로컬 데모 상태로 검증됩니다.</small>
          </div>
          <div className={"coach-panel " + (coachOpen ? "" : "collapsed")}>
            <button
              className="coach-head"
              onClick={() => setCoachOpen((v) => !v)}
            >
              <span className="coach-dot">
                <Icon name="spark" size={16} />
              </span>
              <span>
                <b>Sentinel Coach</b>
                <small>힌트 기반 안내</small>
              </span>
              <span>{coachOpen ? "−" : "+"}</span>
            </button>
            {coachOpen && (
              <>
                <div className="messages">
                  {messages.map((m, i) => (
                    <div key={i} className={"message " + m.role}>
                      {m.text}
                    </div>
                  ))}
                </div>
                <div className="coach-input">
                  <input
                    value={coachInput}
                    onChange={(e) => setCoachInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && ask()}
                    placeholder="코치에게 물어보세요"
                  />
                  <button onClick={ask}>↑</button>
                </div>
              </>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function MissionBrief({
  challenge,
  onStart,
}: {
  challenge: Challenge;
  onStart: () => void;
}) {
  return (
    <div className="mission">
      <div className="mission-glyph">{challenge.icon}</div>
      <span className="tiny-label">MISSION 01</span>
      <h2>
        사용자 입력의
        <br />
        <span>도착점을 찾으세요.</span>
      </h2>
      <p>
        검색 기능이 사용자의 문자열을 화면에 되돌려 줍니다. 이 흐름에서 신뢰
        경계가 무너지는 지점을 관찰하고, 안전한 대안을 설명하세요.
      </p>
      <div className="mission-list">
        <div>
          <b>01</b>
          <span>입력 데이터의 출처를 찾기</span>
        </div>
        <div>
          <b>02</b>
          <span>렌더링 API와 컨텍스트 확인하기</span>
        </div>
        <div>
          <b>03</b>
          <span>안전한 출력 처리 제안하기</span>
        </div>
      </div>
      <button className="primary" onClick={onStart}>
        실습 환경 열기 <Icon name="arrow" size={16} />
      </button>
    </div>
  );
}
function FlowMap({
  logs,
  flagCaptured,
}: {
  logs: string[];
  flagCaptured: boolean;
}) {
  const hasRun = logs.some((log) => log.startsWith("Parser analysis:"));
  const risky = logs.some((log) => log.includes("unsafe sink"));
  return (
    <div className={"flow " + (hasRun ? "flow-complete" : "")}>
      <div className="flow-title">
        <span className="tiny-label">ATTACK / DEFENSE MAP</span>
        <b>데이터 흐름 관찰</b>
        {hasRun && (
          <span className={"analysis-badge " + (risky ? "danger" : "safe")}>
            {risky ? "Unsafe path detected" : "Safe text path"}
          </span>
        )}
      </div>
      <div className="flow-nodes">
        <div className={hasRun ? "active" : ""}>
          <span>01</span>
          <b>URL input</b>
          <small>untrusted</small>
        </div>
        <i>→</i>
        <div className={hasRun ? "active" : ""}>
          <span>02</span>
          <b>Template</b>
          <small>unsafe sink</small>
        </div>
        <i>→</i>
        <div className={"risk " + (hasRun && risky ? "active" : "")}>
          <span>03</span>
          <b>DOM parser</b>
          <small>{hasRun && risky ? "risk confirmed" : "risk detected"}</small>
        </div>
        <i>→</i>
        <div className={"defense " + (hasRun ? "active" : "")}>
          <span>04</span>
          <b>textContent</b>
          <small>defended</small>
        </div>
      </div>
      {hasRun && (
        <div className={"simulation-result " + (risky ? "danger" : "safe")}>
          <b>{risky ? "Risk signal: High" : "Risk signal: Low"}</b>
          <span>
            {risky
              ? "The sandbox identified markup flowing toward an HTML parsing boundary. No code was executed."
              : "The sandbox treated this input as text. No code was executed."}
          </span>
        </div>
      )}
      {flagCaptured && (
        <div className="evidence-card">
          <Icon name="check" size={16} />
          <span>
            <b>Evidence recovered</b>
            <small>
              The reflected input reached the unsafe rendering boundary. Your
              flag is ready in the objective panel.
            </small>
          </span>
        </div>
      )}
      <div className="terminal-log">
        {logs.slice(-3).map((l, i) => (
          <p key={i}>
            <span>›</span>
            {l}
          </p>
        ))}
      </div>
    </div>
  );
}
function Guide({
  challenge,
  onTry,
}: {
  challenge: Challenge;
  onTry: () => void;
}) {
  return (
    <div className="guide">
      <span className="tiny-label">GUIDED WALKTHROUGH</span>
      <h2>문자열이 코드가 되는 순간</h2>
      <p>
        이 시나리오의 핵심은 “입력이 위험한가”가 아니라, 그 입력이 어떤 API를
        통해 브라우저에 전달되는가입니다.
      </p>
      <div className="guide-cards">
        <article>
          <b>1. Source</b>
          <p>
            URL 파라미터는 사용자가 제어하는 데이터입니다. 신뢰하지 않는 출처로
            분류하세요.
          </p>
        </article>
        <article>
          <b>2. Sink</b>
          <p>
            <code>innerHTML</code>은 문자열을 HTML로 해석합니다. 텍스트 표시에
            적합하지 않은 렌더링 경계입니다.
          </p>
        </article>
        <article>
          <b>3. Defense</b>
          <p>
            <code>textContent</code>를 사용하거나, 컨텍스트에 맞는 인코딩과
            검증을 적용하세요.
          </p>
        </article>
      </div>
      <div className="solution-note">
        <Icon name="shield" />
        <span>
          <b>관리자용 해답 요약</b>
          <br />
          입력값을 HTML 해석 API에 직접 넣지 않고, <code>textContent</code>로
          출력한다. 플래그: <code>flag&#123;echo_reflection_found&#125;</code>
        </span>
      </div>
      <button className="primary" onClick={onTry}>
        실습으로 확인하기 <Icon name="arrow" size={16} />
      </button>
    </div>
  );
}

function Rankings() {
  const ranks = [
    { n: "Mina Park", p: "2,480", c: "14", a: "MP" },
    { n: "Alex Chen", p: "2,210", c: "12", a: "AC" },
    { n: "Sora Lee", p: "1,960", c: "11", a: "SL" },
    { n: "Jin Kim", p: "840", c: "3", a: "JK" },
  ];
  return (
    <div className="page">
      <section className="page-title">
        <span className="eyebrow">
          <i /> COMMUNITY SIGNAL
        </span>
        <h1>Rankings</h1>
        <p>매주 새로운 실습과 함께 신호를 쌓아 보세요.</p>
      </section>
      <div className="podium">
        <div className="podium-user second">
          <span>2</span>
          <i>AC</i>
          <b>Alex Chen</b>
          <small>2,210 SP</small>
        </div>
        <div className="podium-user first">
          <span>1</span>
          <i>MP</i>
          <b>Mina Park</b>
          <small>2,480 SP</small>
          <em>✦</em>
        </div>
        <div className="podium-user third">
          <span>3</span>
          <i>SL</i>
          <b>Sora Lee</b>
          <small>1,960 SP</small>
        </div>
      </div>
      <div className="rank-table">
        <div className="rank-head">
          <span>RANK</span>
          <span>OPERATOR</span>
          <span>CHALLENGES</span>
          <span>SIGNAL POINTS</span>
        </div>
        {ranks.map((r, i) => (
          <div
            className={"rank-row " + (r.n === "Jin Kim" ? "me" : "")}
            key={r.n}
          >
            <strong>#{i + 1}</strong>
            <span className="rank-person">
              <i>{r.a}</i>
              {r.n}
            </span>
            <span>{r.c}</span>
            <b>{r.p} SP</b>
          </div>
        ))}
      </div>
    </div>
  );
}
function Learning({
  openChallenge,
}: {
  openChallenge: (c: Challenge) => void;
}) {
  const lessons = [
    {
      title: "웹 요청과 신뢰 경계",
      meta: "START HERE · 12 MIN",
      desc: "브라우저, 서버, 데이터베이스가 주고받는 데이터를 지도로 읽어봅니다.",
      detail:
        "URL, 폼, 쿠키, API 응답은 모두 서로 다른 신뢰 수준을 가집니다. 사용자가 바꿀 수 있는 값은 서버에 도착하기 전부터 신뢰하지 않는 데이터로 표시하세요.",
      takeaway:
        "핵심: 데이터가 어디서 왔는지 먼저 표시하면 검증 지점이 보입니다.",
    },
    {
      title: "출처(Source)와 도착점(Sink)",
      meta: "CORE CONCEPT · 18 MIN",
      desc: "취약점은 데이터의 의미가 변하는 경계에서 시작됩니다.",
      detail:
        "Source는 외부에서 들어오는 데이터이고, Sink는 그 데이터가 브라우저·DB·셸 등에서 의미를 갖게 되는 API입니다. 두 지점을 선으로 연결하면 위험 경로를 찾을 수 있습니다.",
      takeaway:
        "핵심: source → transform → sink 흐름을 코드 리뷰의 기본 단위로 삼으세요.",
    },
    {
      title: "안전한 렌더링 패턴",
      meta: "APPLY · 25 MIN",
      desc: "프레임워크의 기본 보호와 우회되는 상황을 구분합니다.",
      detail:
        "텍스트 출력에는 textContent 또는 프레임워크의 기본 이스케이프를 사용합니다. HTML 해석 API가 꼭 필요하면 검증된 정화 라이브러리와 엄격한 정책을 함께 적용합니다.",
      takeaway:
        "핵심: “HTML로 해석하지 않는 것”이 가장 단순하고 강한 방어입니다.",
    },
  ];
  const [activeLesson, setActiveLesson] = useState<number | null>(null);
  const active = activeLesson === null ? null : lessons[activeLesson];
  return (
    <div className="page">
      <section className="page-title">
        <span className="eyebrow">
          <i /> FOUNDATION FIRST
        </span>
        <h1>Learn the map before the maze.</h1>
        <p>
          공격을 따라 하기보다, 데이터의 이동과 방어 결정을 먼저 이해합니다.
        </p>
      </section>
      <div className="learning-path">
        {lessons.map((lesson, index) => (
          <article
            key={lesson.title}
            className={index === 0 ? "path-active" : ""}
          >
            <span>0{index + 1}</span>
            <div>
              <small>{lesson.meta}</small>
              <h2>{lesson.title}</h2>
              <p>{lesson.desc}</p>
            </div>
            <button onClick={() => setActiveLesson(index)}>
              {index === 0 ? "Begin" : "Open"} <Icon name="arrow" size={15} />
            </button>
          </article>
        ))}
      </div>
      {active && (
        <section className="lesson-panel">
          <div>
            <span className="tiny-label">LESSON 0{activeLesson! + 1}</span>
            <h2>{active.title}</h2>
            <p>{active.detail}</p>
            <div className="lesson-takeaway">
              <Icon name="shield" size={16} />
              {active.takeaway}
            </div>
          </div>
          <div className="lesson-actions">
            <button className="text-btn" onClick={() => setActiveLesson(null)}>
              목록으로
            </button>
            {activeLesson === 2 && (
              <button
                className="primary"
                onClick={() => openChallenge(challenges[0])}
              >
                Echo Chamber 실습 <Icon name="arrow" size={16} />
              </button>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
function Admin({ notify }: { notify: (s: string) => void }) {
  const [api, setApi] = useState("");
  const [created, setCreated] = useState(false);
  return (
    <div className="page">
      <section className="page-title control-title">
        <div>
          <span className="eyebrow">
            <i /> ADMIN ONLY
          </span>
          <h1>Control room</h1>
          <p>챌린지를 설계하고, 해답과 검증 규칙을 관리합니다.</p>
        </div>
        <span className="admin-lock">
          <Icon name="lock" size={15} /> Demo access
        </span>
      </section>
      <div className="admin-grid">
        <section className="builder">
          <div className="panel-title">
            <div>
              <span className="tiny-label">CHALLENGE BUILDER</span>
              <h2>새 아레나 만들기</h2>
            </div>
            <span className="step">1 / 3</span>
          </div>
          <div className="form-grid">
            <label>
              챌린지 이름
              <input placeholder="예: Session Mirage" />
            </label>
            <label>
              카테고리
              <select>
                <option>XSS</option>
                <option>SQLi</option>
                <option>API Security</option>
              </select>
            </label>
            <label>
              난이도
              <select>
                <option>Beginner · 120 SP</option>
                <option>Intermediate · 250 SP</option>
                <option>Advanced · 450 SP</option>
              </select>
            </label>
            <label>
              정답 플래그
              <input placeholder="flag{your_verified_answer}" />
            </label>
          </div>
          <label className="full-label">
            관리자 해답지
            <textarea placeholder="풀이의 핵심 원리, 재현 단계, 안전한 수정 방법을 작성하세요." />
          </label>
          <button
            className="primary"
            onClick={() => {
              setCreated(true);
              notify("검증 가능한 초안이 생성되었습니다.");
            }}
          >
            초안 생성 <Icon name="plus" size={16} />
          </button>
          {created && (
            <div className="success-line">
              <Icon name="check" size={16} /> Solution validator connected ·
              사용자에게는 힌트 기반으로만 공개됩니다.
            </div>
          )}
        </section>
        <aside className="api-card">
          <span className="tiny-label">AI COACH CONNECTION</span>
          <h3>Bring your own key</h3>
          <p>
            AI 코치용 API 키는 서버 환경 변수로 연결하세요. 이 데모는 키를
            저장하지 않습니다.
          </p>
          <input
            type="password"
            value={api}
            onChange={(e) => setApi(e.target.value)}
            placeholder="sk-••••••••••••"
          />
          <button
            className="outline-btn"
            onClick={() =>
              notify(
                api
                  ? "연결 설정이 임시로 저장되었습니다."
                  : "API 키를 입력해 주세요.",
              )
            }
          >
            연결 테스트
          </button>
          <small>
            <Icon name="lock" size={12} /> Production에서는 Netlify 환경 변수
            사용
          </small>
        </aside>
      </div>
      <section className="solution-table">
        <div className="panel-title">
          <div>
            <span className="tiny-label">SOLUTION REGISTRY</span>
            <h2>검증된 해답</h2>
          </div>
          <button
            className="link-btn"
            onClick={() => notify("모든 해답은 현재 검증됨 상태입니다.")}
          >
            검증 기록 보기
          </button>
        </div>
        <div className="solution-row">
          <span className="check-circle">✓</span>
          <div>
            <b>Echo Chamber</b>
            <small>
              flag&#123;echo_reflection_found&#125; · 안전한 출력 처리
            </small>
          </div>
          <span className="verified">Verified</span>
          <button onClick={() => notify("해답 상세 보기가 열렸습니다.")}>
            View →
          </button>
        </div>
      </section>
    </div>
  );
}

export default App;
