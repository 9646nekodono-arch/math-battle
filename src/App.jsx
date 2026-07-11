import React, { useState, useEffect, useRef, useCallback } from "react";

/* ============================================================
   計算バトル — 算数・計算特訓アプリ
   デザイン方針:
   - 色: ディープネイビー背景 + 電光掲示板のようなシアン/オレンジ
   - 型: 見出しに Space Grotesk(数字が力強い幾何学体), 本文に Inter
   - 署名要素: 進級のたびに育つ「ランクバッジ」と、対戦時の VS アリーナ演出
   ============================================================ */

const FONT_LINK_ID = "mathbattle-fonts";
function ensureFonts() {
  if (typeof document === "undefined") return;
  if (document.getElementById(FONT_LINK_ID)) return;
  const link = document.createElement("link");
  link.id = FONT_LINK_ID;
  link.rel = "stylesheet";
  link.href =
    "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=Space+Mono:wght@400;700&family=Inter:wght@400;500;600;700&display=swap";
  document.head.appendChild(link);
}

/* iOS Safariは <button> に独自の見た目(appearance)を適用し、
   Tailwindのbg-[#...]指定を上書きしてしまうことがある。
   これを無効化して、指定した背景色が必ず表示されるようにする。 */
const RESET_STYLE_ID = "mathbattle-reset";
function ensureButtonReset() {
  if (typeof document === "undefined") return;
  if (document.getElementById(RESET_STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = RESET_STYLE_ID;
  style.textContent = `
    button {
      -webkit-appearance: none;
      appearance: none;
      background-image: none;
      touch-action: manipulation;
    }
    input {
      -webkit-appearance: none;
      appearance: none;
    }
    [class*="text-[#0F1226]"] { color: #0F1226 !important; }
    [class*="text-[#4A4F72]"] { color: #4A4F72 !important; }
    [class*="text-[#4FE0D0]"] { color: #4FE0D0 !important; }
    [class*="text-[#6EE7A8]"] { color: #6EE7A8 !important; }
    [class*="text-[#8B90BE]"] { color: #8B90BE !important; }
    [class*="text-[#F3F5FF]"] { color: #F3F5FF !important; }
    [class*="text-[#FF5D73]"] { color: #FF5D73 !important; }
    [class*="text-[#FF7A45]"] { color: #FF7A45 !important; }
    @keyframes mb-pop {
      0% { transform: translate(-50%, 6px) scale(0.6); opacity: 0; }
      60% { transform: translate(-50%, -4px) scale(1.08); opacity: 1; }
      100% { transform: translate(-50%, 0) scale(1); opacity: 1; }
    }
    @keyframes mb-pop-scale {
      0% { transform: translateY(6px) scale(0.6); opacity: 0; }
      60% { transform: translateY(-4px) scale(1.08); opacity: 1; }
      100% { transform: translateY(0) scale(1); opacity: 1; }
    }
    @keyframes mb-coin-shake {
      0%, 100% { transform: rotate(0deg); }
      50% { transform: rotate(-15deg); }
    }
    @keyframes mb-coin-float {
      0% { transform: translateY(0) scale(1); opacity: 1; }
      100% { transform: translateY(-22px) scale(1.3); opacity: 0; }
    }
  `;
  document.head.appendChild(style);
}

/* ---------------- ユーティリティ ---------------- */
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[randInt(0, arr.length - 1)];
const gcd = (a, b) => (b === 0 ? Math.abs(a) : gcd(b, a % b));

/* ---------------- カリキュラム定義 ---------------- */
/* 各ユニットは学年の代表的な範囲。type によって回答UIと採点方法が変わる。
   type: 'int' | 'decimal' | 'signed' | 'fracFixed' | 'fracFree'         */

const UNITS = [
  {
    id: "u1",
    grade: "1年生",
    title: "たし算(くり上がりなし)",
    type: "int",
    timeTarget: 6,
    gen: () => {
      const a = randInt(0, 9), b = randInt(0, 9 - a);
      return { text: `${a} + ${b}`, answer: a + b };
    },
  },
  {
    id: "u2",
    grade: "1年生",
    title: "たし算・ひき算(くり上がり/くり下がり)",
    type: "int",
    timeTarget: 7,
    gen: () => {
      if (Math.random() < 0.5) {
        const a = randInt(3, 9), b = randInt(3, 9);
        return { text: `${a} + ${b}`, answer: a + b };
      }
      const a = randInt(11, 18), b = randInt(2, a - 1);
      return { text: `${a} − ${b}`, answer: a - b };
    },
  },
  {
    id: "u3",
    grade: "2年生",
    title: "2桁のたし算・ひき算",
    type: "int",
    timeTarget: 9,
    gen: () => {
      if (Math.random() < 0.5) {
        const a = randInt(10, 89), b = randInt(10, 99 - a);
        return { text: `${a} + ${b}`, answer: a + b };
      }
      const a = randInt(20, 99), b = randInt(10, a - 1);
      return { text: `${a} − ${b}`, answer: a - b };
    },
  },
  {
    id: "u4",
    grade: "2年生",
    title: "かけ算九九",
    type: "int",
    timeTarget: 5,
    gen: () => {
      const a = randInt(1, 9), b = randInt(1, 9);
      return { text: `${a} × ${b}`, answer: a * b };
    },
  },
  {
    id: "u5",
    grade: "3年生",
    title: "わり算(あまりなし)",
    type: "int",
    timeTarget: 7,
    gen: () => {
      const b = randInt(2, 9), q = randInt(2, 9);
      return { text: `${b * q} ÷ ${b}`, answer: q };
    },
  },
  {
    id: "u6",
    grade: "3年生",
    title: "わり算(あまりあり)",
    type: "fracFixed",
    fixedLabel: "あまり",
    timeTarget: 10,
    gen: () => {
      const b = randInt(3, 9), q = randInt(2, 9), r = randInt(1, b - 1);
      const a = b * q + r;
      return { text: `${a} ÷ ${b} = ？ あまり ？`, answer: q, extra: r };
    },
  },
  {
    id: "u7",
    grade: "3年生",
    title: "大きな数の計算(3桁)",
    type: "int",
    timeTarget: 11,
    gen: () => {
      if (Math.random() < 0.5) {
        const a = randInt(100, 799), b = randInt(100, 899 - a);
        return { text: `${a} + ${b}`, answer: a + b };
      }
      const a = randInt(200, 900), b = randInt(100, a - 50);
      return { text: `${a} − ${b}`, answer: a - b };
    },
  },
  {
    id: "u8",
    grade: "4年生",
    title: "小数のたし算・ひき算",
    type: "decimal",
    timeTarget: 10,
    gen: () => {
      const a = randInt(10, 99) / 10, b = randInt(10, 99) / 10;
      if (Math.random() < 0.5) {
        return { text: `${a.toFixed(1)} + ${b.toFixed(1)}`, answer: Math.round((a + b) * 10) / 10 };
      }
      const hi = Math.max(a, b), lo = Math.min(a, b);
      return { text: `${hi.toFixed(1)} − ${lo.toFixed(1)}`, answer: Math.round((hi - lo) * 10) / 10 };
    },
  },
  {
    id: "u9",
    grade: "4年生",
    title: "分数(同じ分母のたし算・ひき算)",
    type: "fracSameDenom",
    timeTarget: 10,
    gen: () => {
      const d = randInt(4, 9);
      const a = randInt(1, d - 1), b = randInt(1, d - 1);
      if (Math.random() < 0.5 && a + b <= d) {
        return { text: `${a}/${d} + ${b}/${d}`, denom: d, answer: a + b };
      }
      const hi = Math.max(a, b), lo = Math.min(a, b);
      return { text: `${hi}/${d} − ${lo}/${d}`, denom: d, answer: hi - lo };
    },
  },
  {
    id: "u10",
    grade: "5年生",
    title: "分数(異なる分母のたし算)",
    type: "fracSameDenom",
    timeTarget: 14,
    gen: () => {
      const d1 = randInt(2, 5), k = randInt(2, 3), d2 = d1 * k;
      const commonD = d2;
      const a = randInt(1, d1 - 1), b = randInt(1, d2 - 1);
      const aCommon = a * k;
      return {
        text: `${a}/${d1} + ${b}/${d2}`,
        denom: commonD,
        answer: aCommon + b,
      };
    },
  },
  {
    id: "u10b",
    grade: "5年生",
    title: "分数(通分:さいしょうこうばいすう)",
    type: "fracSameDenom",
    timeTarget: 18,
    gen: () => {
      // どちらの分母も、もう一方の倍数ではないペアだけを使う(本当のLCM計算が必要)
      const PAIRS = [
        [4, 6], [3, 4], [4, 9], [6, 9], [3, 10], [6, 4],
        [9, 6], [4, 10], [8, 6], [9, 12], [8, 12], [6, 10],
      ];
      const [d1, d2] = pick(PAIRS);
      const lcm = (d1 * d2) / gcd(d1, d2);
      const a = randInt(1, d1 - 1), b = randInt(1, d2 - 1);
      const aCommon = a * (lcm / d1);
      const bCommon = b * (lcm / d2);
      return {
        text: `${a}/${d1} + ${b}/${d2}`,
        denom: lcm,
        answer: aCommon + bCommon,
      };
    },
  },
  {
    id: "u11",
    grade: "5年生",
    title: "割合・百分率",
    type: "int",
    suffix: "%",
    timeTarget: 12,
    gen: () => {
      const percentChoices = [10, 20, 25, 40, 50, 75];
      const p = pick(percentChoices);
      const whole = randInt(2, 20) * (100 / gcd(100, p));
      const wholeSafe = Math.round(whole / 4) * 4 || 100;
      const part = Math.round((wholeSafe * p) / 100);
      return { text: `${wholeSafe}のうち ${part} は何%？`, answer: p };
    },
  },
  {
    id: "u12",
    grade: "6年生",
    title: "分数 × 分数",
    type: "fracFree",
    timeTarget: 16,
    gen: () => {
      const a = randInt(1, 5), b = randInt(2, 7);
      const c = randInt(1, 5), d = randInt(2, 7);
      return { text: `${a}/${b} × ${c}/${d}`, answerNum: a * c, answerDen: b * d };
    },
  },
  {
    id: "u13",
    grade: "6年生",
    title: "分数 ÷ 分数",
    type: "fracFree",
    timeTarget: 16,
    gen: () => {
      const a = randInt(1, 5), b = randInt(2, 7);
      const c = randInt(1, 5), d = randInt(2, 7);
      // a/b ÷ c/d = a/b × d/c
      return { text: `${a}/${b} ÷ ${c}/${d}`, answerNum: a * d, answerDen: b * c };
    },
  },
  {
    id: "u14",
    grade: "中学1年",
    title: "正負の数の計算",
    type: "signed",
    timeTarget: 10,
    gen: () => {
      const a = randInt(-15, 15), b = randInt(-15, 15);
      const op = pick(["+", "−"]);
      const answer = op === "+" ? a + b : a - b;
      return { text: `(${a}) ${op} (${b})`, answer };
    },
  },
  {
    id: "u15",
    grade: "中学1年",
    title: "文字式の値",
    type: "signed",
    timeTarget: 14,
    gen: () => {
      const x = randInt(-6, 6);
      const a = randInt(2, 6), b = randInt(-8, 8);
      const answer = a * x + b;
      const bStr = b >= 0 ? `+ ${b}` : `− ${Math.abs(b)}`;
      return { text: `x = ${x} のとき ${a}x ${bStr}`, answer };
    },
  },
];

const LAST_UNIT_INDEX = UNITS.length - 1;

function reduceFrac(n, d) {
  const g = gcd(n, d) || 1;
  return [n / g, d / g];
}

// 直前の問題と答えが連続で被らないように、最大5回まで作り直す
function genUnique(unit, prevAnswer) {
  let problem = unit.gen();
  let attempts = 0;
  while (prevAnswer != null && problem.answer === prevAnswer && attempts < 5) {
    problem = unit.gen();
    attempts += 1;
  }
  return problem;
}

// 連続正解数(streak)に応じたコンボ表示のラベルと色
function comboLabel(streak, total) {
  if (streak >= total) return { text: "👑 LEGEND！", color: "#FFC864" };
  if (streak >= 8) return { text: "🌟 PERFECT！", color: "#FFC864" };
  if (streak >= 5) return { text: `🔥 ${streak} COMBO！`, color: "#FF7A45" };
  if (streak >= 3) return { text: `⚡ ${streak}れんぞく！`, color: "#6EE7A8" };
  return { text: "✨ せいかい！", color: "#6EE7A8" };
}

function checkAnswer(unit, problem, input) {
  switch (unit.type) {
    case "int":
    case "decimal":
      return Number(input.value) === problem.answer;
    case "signed":
      return Number(input.value) === problem.answer;
    case "fracFixed":
      return Number(input.value) === problem.answer && Number(input.extra) === problem.extra;
    case "fracSameDenom":
      return Number(input.num) === problem.answer && Number(input.den) === problem.denom;
    case "fracFree": {
      const n = Number(input.num);
      const d = input.den === "" ? 1 : Number(input.den); // 分母が空欄なら整数の答えとして扱う
      if (!d) return false;
      return n * problem.answerDen === problem.answerNum * d;
    }
    default:
      return false;
  }
}

/* ---------------- ランク表示 ---------------- */
const RANKS = ["E", "D", "C", "B", "A", "S"];
function rankForUnitIndex(idx) {
  const ratio = idx / LAST_UNIT_INDEX;
  const i = Math.min(RANKS.length - 1, Math.floor(ratio * RANKS.length));
  return RANKS[i];
}

/* ---------------- ストレージ ---------------- */
const PROFILES_KEY = "mathbattle:profiles";
const profileKey = (id) => `mathbattle:profile:${id}`;

async function loadProfiles() {
  try {
    const raw = localStorage.getItem(PROFILES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
async function saveProfiles(list) {
  try {
    localStorage.setItem(PROFILES_KEY, JSON.stringify(list));
  } catch {}
}
async function loadProfile(id) {
  try {
    const raw = localStorage.getItem(profileKey(id));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
async function saveProfile(p) {
  try {
    localStorage.setItem(profileKey(p.id), JSON.stringify(p));
  } catch {}
}

function freshProfile(id, name, avatar) {
  return {
    id,
    name,
    avatar,
    unitIndex: 0,
    unitProgress: {}, // unitId -> {bestAcc, bestAvgTime}
    battle: { wins: 0, losses: 0, draws: 0 },
    coins: 0,
    xp: 0,
    records: { practice: {}, battle: {} },
    monsterDefeats: {}, // AI_RANKSのキー -> 倒した回数
    createdAt: Date.now(),
  };
}

// レベルは100XPごとに1段階アップするシンプルな設計
function levelForXp(xp) {
  return Math.floor((xp || 0) / 100) + 1;
}
function xpIntoLevel(xp) {
  return (xp || 0) % 100;
}

// 称号(レベルに応じて村人→勇者へ育っていく)
const TITLES = [
  { level: 1, name: "村人", emoji: "🧑‍🌾" },
  { level: 4, name: "見習い戦士", emoji: "🗡️" },
  { level: 10, name: "戦士", emoji: "⚔️" },
  { level: 18, name: "騎士", emoji: "🛡️" },
  { level: 28, name: "賢者", emoji: "🧙" },
  { level: 40, name: "勇者", emoji: "👑" },
];
const HERO_LEVEL = 40;
function titleForLevel(level) {
  let current = TITLES[0];
  for (const t of TITLES) {
    if (level >= t.level) current = t;
  }
  return current;
}

/* ---------------- 汎用UI部品 ---------------- */

/* コインが0から目標値までチャリンチャリンと数え上がる演出 */
function CoinCounter({ amount }) {
  const [shown, setShown] = useState(0);
  const [coinPops, setCoinPops] = useState([]);

  useEffect(() => {
    setShown(0);
    setCoinPops([]);
    if (amount <= 0) return;
    const steps = Math.min(amount, 12); // 多すぎる場合は間引いて刻む
    const stepAmount = amount / steps;
    let i = 0;
    const timer = setInterval(() => {
      i += 1;
      setShown(Math.min(amount, Math.round(stepAmount * i)));
      setCoinPops((prev) => [...prev, Date.now() + i]);
      if (i >= steps) clearInterval(timer);
    }, 90);
    return () => clearInterval(timer);
  }, [amount]);

  return (
    <div
      className="flex items-center gap-2 mt-4 rounded-full px-4 py-2 relative"
      style={{ backgroundColor: "#1B1F3B", border: "1px solid #FFC864", animation: "mb-pop-scale .4s ease" }}
    >
      <span className="text-lg" style={{ animation: shown < amount ? "mb-coin-shake .18s ease infinite" : "none" }}>
        🪙
      </span>
      <span className="font-bold font-mono" style={{ color: "#FFC864" }}>
        +{shown} コイン
      </span>
      {coinPops.slice(-1).map((key) => (
        <span
          key={key}
          className="absolute -top-2 right-3 text-xs"
          style={{ animation: "mb-coin-float .5s ease forwards" }}
        >
          🪙
        </span>
      ))}
    </div>
  );
}


function RankBadge({ rank, size = 84, glow = false }) {
  const colorMap = {
    E: "#8B90BE",
    D: "#6FB1FF",
    C: "#4FE0D0",
    B: "#6EE7A8",
    A: "#FFC864",
    S: "#FF7A45",
  };
  const color = colorMap[rank] || "#4FE0D0";
  return (
    <div
      style={{
        width: size,
        height: size,
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        filter: glow ? `drop-shadow(0 0 14px ${color}99)` : "none",
      }}
    >
      <svg width={size} height={size} viewBox="0 0 100 100">
        <polygon
          points="50,3 93,26 93,74 50,97 7,74 7,26"
          fill="#1B1F3B"
          stroke={color}
          strokeWidth="3"
        />
      </svg>
      <span
        style={{
          position: "absolute",
          fontFamily: "'Space Grotesk', sans-serif",
          fontWeight: 700,
          fontSize: size * 0.4,
          color,
        }}
      >
        {rank}
      </span>
    </div>
  );
}

function TopBar({ profile, onHome, onSwitchProfile }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-[#242A4F]">
      <button
        onClick={onHome}
        className="font-bold tracking-wide text-[#F3F5FF]"
        style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18 }}
      >
        計算<span style={{ color: "#FF7A45" }}>バトル</span>
      </button>
      {profile && (
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 rounded-full px-2.5 py-1" style={{ backgroundColor: "#1B1F3B", border: "1px solid #FFC864" }}>
            <span className="text-sm">🪙</span>
            <span className="text-xs font-bold" style={{ color: "#FFC864" }}>{profile.coins || 0}</span>
          </div>
          <button
            onClick={onSwitchProfile}
            className="flex items-center gap-2 text-sm text-[#8B90BE] hover:text-[#F3F5FF] transition"
          >
            <span className="text-lg">{profile.avatar}</span>
            <span>{profile.name}</span>
          </button>
        </div>
      )}
    </div>
  );
}

/* ---------------- プロフィール選択画面 ---------------- */

const AVATARS = ["🦊", "🐯", "🐼", "🦁", "🐸", "🐧", "🦄", "🐙", "🐨", "🦉"];

function ProfileSelect({ onSelect }) {
  const [profiles, setProfiles] = useState(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [error, setError] = useState("");

  useEffect(() => {
    loadProfiles().then((list) => setProfiles(list));
  }, []);

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("名前を入れてね");
      return;
    }
    const id = `p_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const p = freshProfile(id, trimmed, avatar);
    const newList = [...(profiles || []), { id, name: trimmed, avatar }];
    await saveProfiles(newList);
    await saveProfile(p);
    setProfiles(newList);
    setCreating(false);
    setName("");
    onSelect(p);
  };

  if (profiles === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0F1226] text-[#8B90BE]">
        よみこみ中...
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-[#0F1226] text-[#F3F5FF] flex flex-col items-center px-6 py-12"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      <h1
        className="text-3xl mb-1 font-bold tracking-tight"
        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
      >
        計算<span style={{ color: "#FF7A45" }}>バトル</span>
      </h1>
      <p className="text-[#8B90BE] mb-10 text-sm">だれが たたかう？</p>

      <div className="w-full max-w-sm space-y-3">
        {profiles.map((p) => (
          <button
            key={p.id}
            onClick={async () => {
              const full = await loadProfile(p.id);
              onSelect(full || freshProfile(p.id, p.name, p.avatar));
            }}
            className="w-full flex items-center gap-4 bg-[#1B1F3B] hover:bg-[#242A4F] transition rounded-2xl px-5 py-4 border border-[#242A4F]"
          >
            <span className="text-3xl">{p.avatar}</span>
            <span className="font-semibold text-lg">{p.name}</span>
          </button>
        ))}

        {!creating ? (
          <button
            onClick={() => setCreating(true)}
            className="w-full rounded-2xl px-5 py-4 border-2 border-dashed border-[#3A4070] text-[#8B90BE] hover:text-[#4FE0D0] hover:border-[#4FE0D0] transition"
          >
            ＋ あたらしいプレイヤー
          </button>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleCreate();
            }}
            className="bg-[#1B1F3B] rounded-2xl p-5 border border-[#242A4F] space-y-4"
          >
            <div>
              <label className="text-xs text-[#8B90BE]">なまえ</label>
              <input
                autoFocus
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError("");
                }}
                maxLength={10}
                enterKeyHint="done"
                style={{ backgroundColor: "#FFFFFF", color: "#0F1226" }}
                className="w-full mt-1 border border-[#3A4070] rounded-lg px-3 py-2 outline-none focus:border-[#4FE0D0]"
                placeholder="ゆうと"
              />
              {error && <p className="text-[#FF5D73] text-xs mt-1">{error}</p>}
            </div>
            <div>
              <label className="text-xs text-[#8B90BE]">アバター</label>
              <div className="flex flex-wrap gap-2 mt-2">
                {AVATARS.map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setAvatar(a)}
                    className={`text-2xl w-10 h-10 flex items-center justify-center rounded-lg border transition ${
                      avatar === a
                        ? "border-[#4FE0D0] bg-[#4FE0D0]/10"
                        : "border-[#3A4070]"
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                style={{ backgroundColor: "#4FE0D0", color: "#0F1226" }}
                className="flex-1 font-bold rounded-lg py-3 hover:opacity-90 transition active:opacity-80"
              >
                はじめる
              </button>
              <button
                type="button"
                onClick={() => setCreating(false)}
                className="px-4 rounded-lg border border-[#3A4070] text-[#8B90BE] hover:text-[#F3F5FF] transition"
              >
                やめる
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

/* ---------------- ホーム画面 ---------------- */

function Home({ profile, onStartPractice, onReviewUnit, onStartBattle, onOpenZukan, onSwitchProfile }) {
  const unit = UNITS[profile.unitIndex];
  const rank = rankForUnitIndex(profile.unitIndex);
  const progressPct = Math.round((profile.unitIndex / LAST_UNIT_INDEX) * 100);

  return (
    <div className="min-h-screen bg-[#0F1226] text-[#F3F5FF]" style={{ fontFamily: "'Inter', sans-serif" }}>
      <TopBar profile={profile} onHome={() => {}} onSwitchProfile={onSwitchProfile} />

      <div className="px-5 py-6 max-w-md mx-auto">
        <div className="flex items-center gap-3 bg-[#1B1F3B] rounded-2xl p-4 border border-[#242A4F] mb-3">
          <span className="text-2xl">{profile.avatar}</span>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold flex items-center gap-1" style={{ fontFamily: "'Space Grotesk', sans-serif", color: "#FFC864" }}>
                Lv.{levelForXp(profile.xp)}
                <span className="text-xs font-normal" style={{ color: "#F3F5FF" }}>
                  {titleForLevel(levelForXp(profile.xp)).emoji} {titleForLevel(levelForXp(profile.xp)).name}
                </span>
              </p>
              <p className="text-[10px] text-[#8B90BE] font-mono">{xpIntoLevel(profile.xp)}/100 XP</p>
            </div>
            <div className="w-full h-2 rounded-full mt-1 overflow-hidden" style={{ backgroundColor: "#0F1226" }}>
              <div
                className="h-full"
                style={{ width: `${xpIntoLevel(profile.xp)}%`, backgroundColor: "#FFC864", transition: "width .6s ease" }}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 bg-[#1B1F3B] rounded-2xl p-5 border border-[#242A4F]">
          <RankBadge rank={rank} glow />
          <div className="flex-1">
            <p className="text-xs text-[#8B90BE] mb-1">いまの ランク</p>
            <p className="text-2xl font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              {rank}ランク
            </p>
            <div className="w-full h-2 bg-[#0F1226] rounded-full mt-2 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#4FE0D0] to-[#6EE7A8]"
                style={{ width: `${progressPct}%`, transition: "width .6s ease" }}
              />
            </div>
            <p className="text-[10px] text-[#8B90BE] mt-1">全{UNITS.length}単元中 {profile.unitIndex + 1}番目</p>
          </div>
        </div>

        <div className="mt-5 bg-[#1B1F3B] rounded-2xl p-5 border border-[#242A4F]">
          <p className="text-xs text-[#8B90BE]">いま とりくむ たんげん</p>
          <p className="text-lg font-bold mt-1">{unit.title}</p>
          <p className="text-xs text-[#4FE0D0] mt-0.5">{unit.grade}</p>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-3">
          <button
            onClick={onStartPractice}
            className="rounded-2xl p-5 text-left bg-gradient-to-br from-[#242A4F] to-[#1B1F3B] border border-[#3A4070] hover:border-[#4FE0D0] transition"
          >
            <p className="text-sm text-[#4FE0D0] font-semibold mb-1">SOLO MODE</p>
            <p className="text-xl font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              1人モードで きたえる
            </p>
            <p className="text-xs text-[#8B90BE] mt-1">10問といて 正解率と速さで つぎの単元へ</p>
          </button>

          <button
            onClick={onStartBattle}
            className="rounded-2xl p-5 text-left bg-gradient-to-br from-[#3A2340] to-[#1B1F3B] border border-[#3A4070] hover:border-[#FF7A45] transition"
          >
            <p className="text-sm text-[#FF7A45] font-semibold mb-1">BATTLE MODE</p>
            <p className="text-xl font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              AIと たいせん する
            </p>
            <p className="text-xs text-[#8B90BE] mt-1">
              勝{profile.battle.wins} 敗{profile.battle.losses} 分{profile.battle.draws}
            </p>
          </button>

          <button
            onClick={onOpenZukan}
            className="rounded-2xl p-4 text-left bg-[#1B1F3B] border border-[#242A4F] hover:border-[#8B90BE] transition flex items-center gap-3"
          >
            <span className="text-2xl">📖</span>
            <div>
              <p className="text-sm font-bold">モンスターずかん</p>
              <p className="text-[10px] text-[#8B90BE]">
                {Object.values(profile.monsterDefeats || {}).filter((n) => n > 0).length} / {Object.keys(AI_RANKS).length} コンプリート
              </p>
            </div>
          </button>
        </div>

        <div className="mt-6">
          <p className="text-xs text-[#8B90BE] mb-2">たんげん いちらん(タップで れんしゅう できる)</p>
          <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
            {UNITS.map((u, i) => {
              const cleared = i < profile.unitIndex;
              const isCurrent = i === profile.unitIndex;
              return (
                <button
                  key={u.id}
                  onClick={() => onReviewUnit(i)}
                  className="w-full flex items-center justify-between rounded-lg px-3 py-2 text-sm border text-left border-[#242A4F] bg-[#1B1F3B] text-[#F3F5FF] active:border-[#4FE0D0]"
                >
                  <span>
                    {isCurrent && <span className="text-[#4FE0D0] mr-1">▶</span>}
                    {cleared && <span className="text-[#6EE7A8] mr-1">✓</span>}
                    {u.title}
                  </span>
                  <span className="text-[10px]">{u.grade}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- 回答入力パッド ---------------- */

function NumPad({ onDigit, onClear, onBack, onToggleSign, showSign, onDot, showDot, showAdvance, focusField, onAdvance }) {
  const keys = ["7", "8", "9", "4", "5", "6", "1", "2", "3"];
  return (
    <div className="grid grid-cols-3 gap-2 w-full max-w-xs mx-auto">
      {keys.map((k) => (
        <button
          key={k}
          onClick={() => onDigit(k)}
          className="bg-[#1B1F3B] border border-[#242A4F] rounded-xl py-3 text-xl font-bold text-[#F3F5FF] active:bg-[#242A4F]"
          style={{ fontFamily: "'Space Mono', monospace" }}
        >
          {k}
        </button>
      ))}
      {showSign ? (
        <button
          onClick={onToggleSign}
          className="bg-[#1B1F3B] border border-[#242A4F] rounded-xl py-3 text-lg font-bold text-[#FF7A45] active:bg-[#242A4F]"
        >
          ±
        </button>
      ) : showDot ? (
        <button
          onClick={onDot}
          className="bg-[#1B1F3B] border border-[#242A4F] rounded-xl py-3 text-xl font-bold text-[#F3F5FF] active:bg-[#242A4F]"
        >
          .
        </button>
      ) : showAdvance ? (
        <button
          onClick={onAdvance}
          style={{ backgroundColor: "#242A4F", color: "#4FE0D0" }}
          className="border border-[#4FE0D0] rounded-xl py-3 text-xs font-bold active:opacity-80"
        >
          {focusField === "num" ? "↓ぶんぼへ" : "↑ぶんしへ"}
        </button>
      ) : (
        <div />
      )}
      <button
        onClick={() => onDigit("0")}
        className="bg-[#1B1F3B] border border-[#242A4F] rounded-xl py-3 text-xl font-bold text-[#F3F5FF] active:bg-[#242A4F]"
        style={{ fontFamily: "'Space Mono', monospace" }}
      >
        0
      </button>
      <button
        onClick={onBack}
        className="bg-[#1B1F3B] border border-[#242A4F] rounded-xl py-3 text-lg font-bold text-[#8B90BE] active:bg-[#242A4F]"
      >
        ⌫
      </button>
    </div>
  );
}

/* 回答フォームの状態管理をユニットのtypeに応じて切り替える */
function useAnswerInput(unit) {
  const [value, setValue] = useState("");
  const [num, setNum] = useState("");
  const [den, setDen] = useState("");
  const [extra, setExtra] = useState(""); // あまり
  const [negative, setNegative] = useState(false);
  const [focusField, setFocusField] = useState("num"); // for fracFree

  const reset = () => {
    setValue("");
    setNum("");
    setDen("");
    setExtra("");
    setNegative(false);
    setFocusField("num");
  };

  const digit = (d) => {
    if (unit.type === "fracFree" || unit.type === "fracSameDenom") {
      if (focusField === "num") setNum((v) => (v.length < 3 ? v + d : v));
      else setDen((v) => (v.length < 3 ? v + d : v));
      return;
    }
    if (unit.type === "fracFixed") {
      setValue((v) => (v.length < 3 ? v + d : v));
      return;
    }
    setValue((v) => (v.length < 5 ? v + d : v));
  };

  const back = () => {
    if (unit.type === "fracFree" || unit.type === "fracSameDenom") {
      if (focusField === "num") setNum((v) => v.slice(0, -1));
      else setDen((v) => v.slice(0, -1));
      return;
    }
    setValue((v) => v.slice(0, -1));
  };

  const clear = () => {
    if (unit.type === "fracFree" || unit.type === "fracSameDenom") {
      if (focusField === "num") setNum("");
      else setDen("");
      return;
    }
    setValue("");
  };

  const dot = () => {
    if (!value.includes(".")) setValue((v) => v + ".");
  };

  const toggleSign = () => setNegative((n) => !n);

  const advanceFocus = () => setFocusField((f) => (f === "num" ? "den" : "num"));

  const packaged = () => {
    if (unit.type === "fracFree" || unit.type === "fracSameDenom") return { num, den };
    if (unit.type === "fracFixed") return { value, extra };
    if (unit.type === "signed") {
      const raw = value === "" ? "" : (negative ? -1 : 1) * Number(value);
      return { value: raw };
    }
    return { value };
  };

  return {
    value, num, den, extra, negative, focusField,
    setFocusField, setExtra,
    digit, back, clear, dot, toggleSign, advanceFocus, reset, packaged,
  };
}

/* ---------------- 1人モード(練習) ---------------- */

function Practice({ profile, unitIndex, onFinish }) {
  const unit = UNITS[unitIndex];
  const TOTAL = 10;
  const [qIndex, setQIndex] = useState(0);
  const [problem, setProblem] = useState(() => unit.gen());
  const [correctCount, setCorrectCount] = useState(0);
  const [totalTimeMs, setTotalTimeMs] = useState(0);
  const [feedback, setFeedback] = useState(null); // 'correct' | 'wrong' | null
  const [streak, setStreak] = useState(0);
  const startRef = useRef(Date.now());
  const input = useAnswerInput(unit);

  useEffect(() => {
    startRef.current = Date.now();
  }, [qIndex]);

  const submit = () => {
    if (feedback) return;
    const packaged = input.packaged();
    const ok = checkAnswer(unit, problem, packaged);
    const elapsed = Date.now() - startRef.current;
    setTotalTimeMs((t) => t + elapsed);
    setFeedback(ok ? "correct" : "wrong");
    if (ok) {
      setCorrectCount((c) => c + 1);
      setStreak((s) => s + 1);
    } else {
      setStreak(0);
    }

    setTimeout(() => {
      if (qIndex + 1 >= TOTAL) {
        onFinish({ correctCount: ok ? correctCount + 1 : correctCount, totalTimeMs: totalTimeMs + elapsed });
      } else {
        setQIndex((i) => i + 1);
        setProblem(genUnique(unit, problem.answer));
        input.reset();
        setFeedback(null);
      }
    }, 650);
  };

  const canSubmit = () => {
    if (unit.type === "fracFree") return input.num !== ""; // 分母は空欄なら1として扱う
    if (unit.type === "fracSameDenom") return input.num !== "" && input.den !== "";
    if (unit.type === "fracFixed") return input.value !== "" && input.extra !== "";
    return input.value !== "";
  };

  return (
    <div className="min-h-screen bg-[#0F1226] text-[#F3F5FF] flex flex-col" style={{ fontFamily: "'Inter', sans-serif" }}>
      <div className="px-5 pt-6 max-w-md mx-auto w-full flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs text-[#8B90BE]">{unit.grade} ・ {unit.title}</p>
          <p className="text-xs text-[#4FE0D0] font-mono">{qIndex + 1} / {TOTAL}</p>
        </div>
        <div className="w-full h-1.5 bg-[#1B1F3B] rounded-full overflow-hidden mb-8">
          <div
            className="h-full"
            style={{ width: `${(qIndex / TOTAL) * 100}%`, backgroundColor: "#4FE0D0", transition: "width .4s ease" }}
          />
        </div>

        <div className="flex-1 flex flex-col items-center justify-center relative">
          {feedback && (
            <div
              key={qIndex}
              className="absolute -top-2 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full font-bold text-sm whitespace-nowrap"
              style={{
                backgroundColor: feedback === "correct" ? comboLabel(streak, TOTAL).color : "#FF5D73",
                color: "#0F1226",
                animation: "mb-pop .35s ease",
              }}
            >
              {feedback === "correct" ? comboLabel(streak, TOTAL).text : "😢 ざんねん"}
            </div>
          )}
          <div
            className={`text-4xl font-bold text-center mb-2 transition-colors ${
              feedback === "correct" ? "text-[#6EE7A8]" : feedback === "wrong" ? "text-[#FF5D73]" : "text-[#F3F5FF]"
            }`}
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            {problem.text}
          </div>
          {unit.suffix && <div className="text-[#8B90BE] text-sm mb-4">答えは {unit.suffix} の数だけ入力</div>}

          {/* 回答表示 */}
          <div className="flex items-center gap-2 my-6 min-h-[3rem]">
            {unit.type === "fracFree" ? (
              <div className="flex flex-col items-center">
                <span className="text-[10px] text-[#8B90BE] mb-1">ぶんし(上の数)</span>
                <button
                  onClick={() => input.setFocusField("num")}
                  className={`text-2xl font-mono px-4 py-1 rounded border-b-2 ${
                    input.focusField === "num" ? "border-[#4FE0D0] text-[#4FE0D0]" : "border-[#3A4070] text-[#F3F5FF]"
                  }`}
                >
                  {input.num || "?"}
                </button>
                <div className="w-16 h-[3px] my-1" style={{ backgroundColor: "#8B90BE" }} />
                <button
                  onClick={() => input.setFocusField("den")}
                  className={`text-2xl font-mono px-4 py-1 rounded border-b-2 ${
                    input.focusField === "den" ? "border-[#4FE0D0] text-[#4FE0D0]" : "border-[#3A4070] text-[#F3F5FF]"
                  }`}
                >
                  {input.den || "?"}
                </button>
                <span className="text-[10px] text-[#8B90BE] mt-1">ぶんぼ(下の数)</span>
                <span className="text-[9px] text-[#4A4F72] mt-1">※せいすうの答えは ぶんぼ を あけてもOK</span>
              </div>
            ) : unit.type === "fracSameDenom" ? (
              <div className="flex flex-col items-center">
                <span className="text-[10px] text-[#8B90BE] mb-1">ぶんし</span>
                <button
                  onClick={() => input.setFocusField("num")}
                  className={`text-2xl font-mono px-4 py-1 rounded border-b-2 ${
                    input.focusField === "num" ? "border-[#4FE0D0] text-[#4FE0D0]" : "border-[#3A4070] text-[#F3F5FF]"
                  }`}
                >
                  {input.num || "?"}
                </button>
                <div className="w-14 h-[3px] my-1" style={{ backgroundColor: "#8B90BE" }} />
                <button
                  onClick={() => input.setFocusField("den")}
                  className={`text-2xl font-mono px-4 py-1 rounded border-b-2 ${
                    input.focusField === "den" ? "border-[#4FE0D0] text-[#4FE0D0]" : "border-[#3A4070] text-[#F3F5FF]"
                  }`}
                >
                  {input.den || "?"}
                </button>
                <span className="text-[10px] text-[#8B90BE] mt-1">ぶんぼ(じぶんで にゅうりょく)</span>
              </div>
            ) : unit.type === "fracFixed" ? (
              <div className="flex flex-col items-center gap-1 text-2xl font-mono">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#8B90BE]">こたえ</span>
                  <span className="px-2">{input.value || "?"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#8B90BE]">あまり</span>
                  <span className="px-2" style={{ color: "#4FE0D0" }}>
                    {input.extra !== "" ? input.extra : "?"}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-3xl font-mono">
                {unit.type === "signed" && (
                  <span className="text-[#FF7A45] mr-1">{input.negative ? "−" : ""}</span>
                )}
                {input.value || "?"}
                {unit.suffix && <span className="text-lg text-[#8B90BE] ml-1">{unit.suffix}</span>}
              </div>
            )}
          </div>

          {unit.type === "fracFixed" && (
            <div className="mb-4 text-center">
              <p className="text-[10px] text-[#8B90BE] mb-1.5">① あまりをえらぶ</p>
              <div className="flex gap-2 justify-center">
                {[0,1,2,3,4,5,6,7,8].map((n) => (
                  <button
                    key={n}
                    onClick={() => input.setExtra(String(n))}
                    className={`w-8 h-8 rounded text-sm border ${
                      input.extra === String(n) ? "border-[#4FE0D0] text-[#4FE0D0]" : "border-[#3A4070] text-[#8B90BE]"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-[#8B90BE] mt-4 mb-1.5">② こたえを にゅうりょく</p>
            </div>
          )}

          <NumPad
            onDigit={input.digit}
            onClear={input.clear}
            onBack={input.back}
            onToggleSign={input.toggleSign}
            showSign={unit.type === "signed"}
            onDot={input.dot}
            showDot={unit.type === "decimal"}
            showAdvance={unit.type === "fracFree" || unit.type === "fracSameDenom"}
            focusField={input.focusField}
            onAdvance={input.advanceFocus}
          />

          <button
            onClick={submit}
            disabled={!canSubmit()}
            style={{ backgroundColor: "#4FE0D0", color: "#0F1226" }}
            className="mt-6 w-full max-w-xs py-3 rounded-xl font-bold disabled:opacity-30 transition"
          >
            こたえる
          </button>
        </div>
      </div>
    </div>
  );
}

function PracticeResult({ profile, result, unit, isReview, coinsEarned, recordInfo, onContinue }) {
  const accuracy = result.correctCount / 10;
  const avgTime = result.totalTimeMs / 10 / 1000;
  const passed = accuracy >= 0.8 && avgTime <= unit.timeTarget;
  const isLast = profile.unitIndex >= LAST_UNIT_INDEX;
  const levelBefore = levelForXp(profile.xp);
  const levelAfter = levelForXp((profile.xp || 0) + coinsEarned);
  const leveledUp = levelAfter > levelBefore;
  const titleBefore = titleForLevel(levelBefore);
  const titleAfter = titleForLevel(levelAfter);
  const titleChanged = titleBefore.name !== titleAfter.name;

  return (
    <div className="min-h-screen bg-[#0F1226] text-[#F3F5FF] flex flex-col items-center justify-center px-6" style={{ fontFamily: "'Inter', sans-serif" }}>
      {titleChanged && (
        <div
          className="mb-3 px-5 py-2 rounded-2xl font-bold text-center"
          style={{ backgroundColor: "#B24FFF", color: "#0F1226", animation: "mb-pop-scale .5s ease" }}
        >
          <p className="text-sm">✨ 称号アップ！</p>
          <p className="text-lg" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            {titleAfter.emoji} {titleAfter.name} になった！
          </p>
        </div>
      )}
      {leveledUp && (
        <div
          className="mb-3 px-5 py-2 rounded-2xl font-bold text-center"
          style={{ backgroundColor: "#4FE0D0", color: "#0F1226", animation: "mb-pop-scale .45s ease" }}
        >
          <p className="text-sm">🎉 LEVEL UP！</p>
          <p className="text-lg" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Lv.{levelBefore} → Lv.{levelAfter}</p>
        </div>
      )}
      {recordInfo?.isNewRecord && (
        <div
          className="mb-3 px-4 py-1.5 rounded-full font-bold text-sm"
          style={{ backgroundColor: "#FFC864", color: "#0F1226", animation: "mb-pop-scale .4s ease" }}
        >
          🏆 NEW RECORD！
        </div>
      )}
      <RankBadge rank={rankForUnitIndex(profile.unitIndex)} size={100} glow={passed} />
      <h2 className="text-2xl font-bold mt-6" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
        {isReview
          ? passed ? "ふくしゅう クリア！" : "ふくしゅう けっか"
          : passed ? (isLast ? "コンプリート！" : "つぎの たんげんへ！") : "もういちど ちょうせん"}
      </h2>
      <div className="grid grid-cols-2 gap-4 mt-6 w-full max-w-xs">
        <div className="bg-[#1B1F3B] rounded-xl p-4 text-center border border-[#242A4F]">
          <p className="text-xs text-[#8B90BE]">正解</p>
          <p className="text-2xl font-bold font-mono">{result.correctCount}/10</p>
        </div>
        <div className="bg-[#1B1F3B] rounded-xl p-4 text-center border border-[#242A4F]">
          <p className="text-xs text-[#8B90BE]">平均タイム</p>
          <p className="text-2xl font-bold font-mono">{avgTime.toFixed(1)}s</p>
        </div>
      </div>
      {recordInfo?.bestTimeMs != null && (
        <div className="flex items-center gap-4 mt-3 text-xs text-[#8B90BE]">
          <span>今回:{formatTime(result.totalTimeMs)}</span>
          <span style={{ color: "#FFC864" }}>ベスト:{formatTime(recordInfo.bestTimeMs)}</span>
        </div>
      )}
      <p className="text-[#8B90BE] text-xs mt-4 text-center">
        {isReview
          ? "ふくしゅうなので ランクには えいきょうしません"
          : passed
          ? "正解率80%以上・目標タイム達成でクリア！"
          : `合格ラインは 正解率80%以上 & 平均${unit.timeTarget}秒以内`}
      </p>
      <CoinCounter amount={coinsEarned} />
      <button
        onClick={() => onContinue(passed, coinsEarned)}
        style={{ backgroundColor: "#4FE0D0", color: "#0F1226" }}
        className="mt-8 w-full max-w-xs py-3 rounded-xl font-bold"
      >
        つづける
      </button>
    </div>
  );
}

/* ---------------- 対戦モード ---------------- */

const AI_RANKS = {
  easy: { label: "イージー", monster: "スライム", emoji: "💧", correctProb: 0.55, timeRange: [3500, 7200], color: "#6EE7A8", unlockLevel: 1 },
  normal: { label: "ノーマル", monster: "ゴブリン", emoji: "🧌", correctProb: 0.75, timeRange: [2200, 4600], color: "#FFC864", unlockLevel: 1 },
  hard: { label: "ハード", monster: "ドラゴン", emoji: "🐉", correctProb: 0.92, timeRange: [1200, 2800], color: "#FF5D73", unlockLevel: 1 },
  orc: { label: "オーク", monster: "オーク", emoji: "👹", correctProb: 0.82, timeRange: [1800, 3800], color: "#8FE05C", unlockLevel: 10 },
  lich: { label: "リッチ", monster: "リッチ", emoji: "💀", correctProb: 0.88, timeRange: [1500, 3200], color: "#7C8CFF", unlockLevel: 18 },
  phoenix: { label: "フェニックス", monster: "フェニックス", emoji: "🦅", correctProb: 0.93, timeRange: [1300, 2600], color: "#FF9F45", unlockLevel: 28 },
  boss: { label: "ボス", monster: "まおう", emoji: "😈", correctProb: 0.97, timeRange: [900, 2000], color: "#B24FFF", unlockLevel: HERO_LEVEL },
};

function computeBattleOutcome(result) {
  if (result.userScore > result.aiScore) return "win";
  if (result.userScore < result.aiScore) return "lose";
  if (result.userTotalMs < result.aiTotalMs) return "win";
  if (result.userTotalMs > result.aiTotalMs) return "lose";
  return "draw";
}

function formatTime(ms) {
  return (ms / 1000).toFixed(1) + "s";
}

function Zukan({ profile, onBack }) {
  const myLevel = levelForXp(profile.xp);
  const defeats = profile.monsterDefeats || {};
  const totalDefeated = Object.values(defeats).filter((n) => n > 0).length;

  return (
    <div className="min-h-screen bg-[#0F1226] text-[#F3F5FF]" style={{ fontFamily: "'Inter', sans-serif" }}>
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[#242A4F]">
        <button onClick={onBack} className="text-[#8B90BE] text-sm">← もどる</button>
        <p className="font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          モンスター<span style={{ color: "#FF7A45" }}>ずかん</span>
        </p>
      </div>

      <div className="px-5 py-6 max-w-md mx-auto">
        <p className="text-xs text-[#8B90BE] mb-4">
          コンプリート {totalDefeated} / {Object.keys(AI_RANKS).length}
        </p>

        <div className="grid grid-cols-2 gap-3">
          {Object.entries(AI_RANKS).map(([key, r]) => {
            const locked = myLevel < r.unlockLevel;
            const count = defeats[key] || 0;
            const seen = !locked; // レベル的に会えるようになったかどうか
            const defeated = count > 0;

            return (
              <div
                key={key}
                className="rounded-2xl p-4 flex flex-col items-center text-center border"
                style={{
                  backgroundColor: "#1B1F3B",
                  borderColor: defeated ? r.color : "#242A4F",
                }}
              >
                <span
                  className="text-4xl mb-1"
                  style={{ filter: seen ? "none" : "brightness(0)", opacity: seen ? 1 : 0.5 }}
                >
                  {locked ? "🔒" : r.emoji}
                </span>
                <p className="text-sm font-bold" style={{ color: seen ? "#F3F5FF" : "#4A4F72" }}>
                  {seen ? r.monster : "？？？"}
                </p>
                <p className="text-[9px] text-[#8B90BE] mt-0.5">
                  {locked ? `Lv.${r.unlockLevel}〜` : r.label}
                </p>
                {seen && (
                  <p
                    className="text-[10px] mt-2 font-mono font-bold"
                    style={{ color: defeated ? "#FFC864" : "#4A4F72" }}
                  >
                    {defeated ? `🏆 ${count}かい とうばつ` : "まだ たおしていない"}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}


function BattleSetup({ profile, onStart, onCancel }) {
  const [unitIdx, setUnitIdx] = useState(profile.unitIndex);
  const [aiRank, setAiRank] = useState("normal");

  return (
    <div className="min-h-screen bg-[#0F1226] text-[#F3F5FF] px-5 py-8 max-w-md mx-auto" style={{ fontFamily: "'Inter', sans-serif" }}>
      <h2 className="text-2xl font-bold mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
        AIと <span style={{ color: "#FF7A45" }}>たいせん</span>
      </h2>
      <p className="text-[#8B90BE] text-sm mb-6">10問の 速さと 正確さで きそおう</p>

      <p className="text-xs text-[#8B90BE] mb-2">たんげんを えらぶ</p>
      <div className="space-y-1.5 max-h-48 overflow-y-auto mb-6 pr-1">
        {UNITS.map((u, i) => (
          <button
            key={u.id}
            onClick={() => setUnitIdx(i)}
            className={`w-full text-left rounded-lg px-3 py-2 text-sm border ${
              unitIdx === i ? "border-[#4FE0D0] bg-[#4FE0D0]/10 text-[#4FE0D0]" : "border-[#242A4F] text-[#F3F5FF]"
            }`}
          >
            {u.title} <span className="text-[10px] text-[#8B90BE]">({u.grade})</span>
          </button>
        ))}
      </div>

      <p className="text-xs text-[#8B90BE] mb-2">たいせん あいて</p>
      <div className="grid grid-cols-3 gap-2 mb-2">
        {Object.entries(AI_RANKS).map(([key, r]) => {
          const myLevel = levelForXp(profile.xp);
          const locked = myLevel < r.unlockLevel;
          return (
            <button
              key={key}
              onClick={() => !locked && setAiRank(key)}
              disabled={locked}
              className={`rounded-xl py-3 text-sm font-bold border transition flex flex-col items-center gap-1 ${locked ? "opacity-40" : ""}`}
              style={{
                borderColor: aiRank === key ? r.color : "#242A4F",
                color: aiRank === key ? r.color : "#8B90BE",
                backgroundColor: aiRank === key ? `${r.color}1A` : "transparent",
              }}
            >
              <span className="text-2xl">{locked ? "🔒" : r.emoji}</span>
              <span>{locked ? "？？？" : r.monster}</span>
              <span className="text-[9px] opacity-70">{locked ? `Lv.${r.unlockLevel}〜` : r.label}</span>
            </button>
          );
        })}
      </div>
      {levelForXp(profile.xp) < HERO_LEVEL && (
        <p className="text-[10px] text-[#8B90BE] mb-6">
          👑 勇者(Lv.{HERO_LEVEL})になると まおうに ちょうせんできる！ (いま Lv.{levelForXp(profile.xp)})
        </p>
      )}
      {levelForXp(profile.xp) >= HERO_LEVEL && <div className="mb-6" />}

      <button
        onClick={() => onStart(unitIdx, aiRank)}
        style={{ backgroundColor: "#FF7A45", color: "#0F1226" }}
        className="w-full py-3 rounded-xl font-bold"
      >
        バトル開始
      </button>
      <button onClick={onCancel} className="w-full py-3 mt-2 text-[#8B90BE] text-sm">
        もどる
      </button>
    </div>
  );
}

function Battle({ profile, unitIndex, aiRankKey, onFinish }) {
  const unit = UNITS[unitIndex];
  const aiRank = AI_RANKS[aiRankKey];
  const TOTAL = 10;

  const [qIndex, setQIndex] = useState(0);
  const [problem, setProblem] = useState(() => unit.gen());
  const [userScore, setUserScore] = useState(0);
  const [aiScore, setAiScore] = useState(0);
  const [userProgress, setUserProgress] = useState(0);
  const [aiProgress, setAiProgress] = useState(0);
  const [userTotalMs, setUserTotalMs] = useState(0);
  const [aiTotalMs, setAiTotalMs] = useState(0);
  const [aiFlash, setAiFlash] = useState(false);
  const [userFlash, setUserFlash] = useState(null);
  const [playerHitFlash, setPlayerHitFlash] = useState(false);
  const [locked, setLocked] = useState(false);
  const [hitFlash, setHitFlash] = useState(false);
  const [streak, setStreak] = useState(0);
  const startRef = useRef(Date.now());
  const aiTimerRef = useRef(null);
  const aiResolvedRef = useRef(false);
  // stateは表示用。setTimeout経由のonFinishで古い値を参照しないよう、常に最新値を持つrefで別管理する
  const userScoreRef = useRef(0);
  const aiScoreRef = useRef(0);
  const userTotalMsRef = useRef(0);
  const aiTotalMsRef = useRef(0);
  const input = useAnswerInput(unit);

  useEffect(() => {
    startRef.current = Date.now();
    aiResolvedRef.current = false;
    const aiTime = randInt(aiRank.timeRange[0], aiRank.timeRange[1]);
    aiTimerRef.current = setTimeout(() => {
      aiResolvedRef.current = true;
      const ok = Math.random() < aiRank.correctProb;
      aiTotalMsRef.current += aiTime;
      setAiTotalMs((t) => t + aiTime);
      if (ok) {
        aiScoreRef.current += 1;
        setAiScore((s) => s + 1);
        setPlayerHitFlash(true);
        setTimeout(() => setPlayerHitFlash(false), 300);
      }
      setAiProgress((p) => p + 1);
      setAiFlash(true);
      setTimeout(() => setAiFlash(false), 500);
    }, aiTime);

    return () => clearTimeout(aiTimerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qIndex]);

  const nextQuestion = () => {
    clearTimeout(aiTimerRef.current);
    if (!aiResolvedRef.current) {
      // AIが間に合わなかった場合は0点扱いで進める
      setAiProgress((p) => p + 1);
    }
    if (qIndex + 1 >= TOTAL) {
      onFinish({
        userScore: userScoreRef.current,
        aiScore: aiScoreRef.current,
        userTotalMs: userTotalMsRef.current,
        aiTotalMs: aiTotalMsRef.current,
      });
    } else {
      setQIndex((i) => i + 1);
      setProblem(genUnique(unit, problem.answer));
      input.reset();
      setLocked(false);
      setUserFlash(null);
    }
  };

  const submit = () => {
    if (locked) return;
    const packaged = input.packaged();
    const ok = checkAnswer(unit, problem, packaged);
    const elapsed = Date.now() - startRef.current;
    userTotalMsRef.current += elapsed;
    setUserTotalMs((t) => t + elapsed);
    setUserFlash(ok ? "correct" : "wrong");
    if (ok) {
      userScoreRef.current += 1;
      setUserScore((s) => s + 1);
      setHitFlash(true);
      setStreak((s) => s + 1);
      setTimeout(() => setHitFlash(false), 300);
    } else {
      setStreak(0);
    }
    setUserProgress((p) => p + 1);
    setLocked(true);
    setTimeout(nextQuestion, 550);
  };

  const canSubmit = () => {
    if (unit.type === "fracFree") return input.num !== ""; // 分母は空欄なら1として扱う
    if (unit.type === "fracSameDenom") return input.num !== "" && input.den !== "";
    if (unit.type === "fracFixed") return input.value !== "" && input.extra !== "";
    return input.value !== "";
  };

  return (
    <div className="min-h-screen bg-[#0F1226] text-[#F3F5FF] flex flex-col" style={{ fontFamily: "'Inter', sans-serif" }}>
      <div className="px-4 pt-5 max-w-md mx-auto w-full">
        {/* プレイヤーとモンスターのHPバー */}
        <div className="flex items-center justify-center gap-4 mb-3">
          <div className="flex flex-col items-center">
            <div
              style={{
                fontSize: 40,
                transform: playerHitFlash ? "scale(0.88) rotate(4deg)" : "scale(1)",
                filter: playerHitFlash ? "brightness(1.7) drop-shadow(0 0 12px #FF5D73)" : "none",
                transition: "all .15s ease",
              }}
            >
              {profile.avatar}
            </div>
            <p className="text-[10px] font-bold mt-0.5" style={{ color: "#4FE0D0" }}>{profile.name}</p>
            <div className="w-24 h-2.5 rounded-full overflow-hidden mt-1" style={{ backgroundColor: "#1B1F3B", border: "1px solid #4FE0D0" }}>
              <div
                className="h-full"
                style={{
                  width: `${Math.max(0, 100 - (aiScore / TOTAL) * 100)}%`,
                  backgroundColor: "#4FE0D0",
                  transition: "width .3s ease",
                }}
              />
            </div>
            <p className="text-[8px] text-[#8B90BE] mt-0.5">HP {Math.max(0, TOTAL - aiScore)}/{TOTAL}</p>
          </div>

          <span className="text-xs text-[#8B90BE] tracking-widest mt-4">VS</span>

          <div className="flex flex-col items-center">
            <div
              style={{
                fontSize: 40,
                transform: hitFlash ? "scale(0.88) rotate(-4deg)" : "scale(1)",
                filter: hitFlash ? "brightness(1.7) drop-shadow(0 0 12px #FF5D73)" : "none",
                transition: "all .15s ease",
              }}
            >
              {aiRank.emoji}
            </div>
            <p className="text-[10px] font-bold mt-0.5" style={{ color: aiRank.color }}>{aiRank.monster}</p>
            <div className="w-24 h-2.5 rounded-full overflow-hidden mt-1" style={{ backgroundColor: "#1B1F3B", border: `1px solid ${aiRank.color}` }}>
              <div
                className="h-full"
                style={{
                  width: `${Math.max(0, 100 - (userScore / TOTAL) * 100)}%`,
                  backgroundColor: aiRank.color,
                  transition: "width .3s ease",
                }}
              />
            </div>
            <p className="text-[8px] text-[#8B90BE] mt-0.5">HP {Math.max(0, TOTAL - userScore)}/{TOTAL}</p>
          </div>
        </div>

        {/* VSアリーナバー(進み具合の目安) */}
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xl">{profile.avatar}</span>
          <div className="flex-1 h-3 bg-[#1B1F3B] rounded-full overflow-hidden">
            <div
              className="h-full"
              style={{ width: `${(userProgress / TOTAL) * 100}%`, backgroundColor: "#4FE0D0", transition: "width .4s ease" }}
            />
          </div>
          <span className="text-xs font-mono w-6 text-right">{userScore}</span>
        </div>
        <div className="text-center text-[10px] text-[#8B90BE] my-1 tracking-widest">VS</div>
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xl">{aiRank.emoji}</span>
          <div className="flex-1 h-3 bg-[#1B1F3B] rounded-full overflow-hidden">
            <div
              className="h-full transition-all"
              style={{
                width: `${(aiProgress / TOTAL) * 100}%`,
                backgroundColor: aiRank.color,
                transition: "width .4s ease",
              }}
            />
          </div>
          <span className="text-xs font-mono w-6 text-right">{aiScore}</span>
        </div>

        {aiFlash && (
          <p className="text-center text-[10px] mb-2" style={{ color: aiRank.color }}>
            {aiRank.monster}が こうげきした！
          </p>
        )}

        <p className="text-center text-xs text-[#8B90BE] mb-6">{qIndex + 1} / {TOTAL} 問目</p>

        <div className="flex flex-col items-center relative">
          {userFlash && (
            <div
              key={qIndex}
              className="absolute -top-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full font-bold text-xs whitespace-nowrap"
              style={{
                backgroundColor: userFlash === "correct" ? comboLabel(streak, TOTAL).color : "#FF5D73",
                color: "#0F1226",
                animation: "mb-pop .35s ease",
              }}
            >
              {userFlash === "correct" ? comboLabel(streak, TOTAL).text : "😢 ざんねん"}
            </div>
          )}
          <div
            className={`text-3xl font-bold text-center mb-6 transition-colors ${
              userFlash === "correct" ? "text-[#6EE7A8]" : userFlash === "wrong" ? "text-[#FF5D73]" : "text-[#F3F5FF]"
            }`}
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            {problem.text}
          </div>

          <div className="flex items-center gap-2 mb-5 min-h-[2.5rem]">
            {unit.type === "fracFree" ? (
              <div className="flex flex-col items-center">
                <span className="text-[9px] text-[#8B90BE] mb-0.5">ぶんし</span>
                <button
                  onClick={() => input.setFocusField("num")}
                  className={`text-xl font-mono px-3 py-1 rounded border-b-2 ${
                    input.focusField === "num" ? "border-[#4FE0D0] text-[#4FE0D0]" : "border-[#3A4070]"
                  }`}
                >
                  {input.num || "?"}
                </button>
                <div className="w-14 h-[3px] my-1" style={{ backgroundColor: "#8B90BE" }} />
                <button
                  onClick={() => input.setFocusField("den")}
                  className={`text-xl font-mono px-3 py-1 rounded border-b-2 ${
                    input.focusField === "den" ? "border-[#4FE0D0] text-[#4FE0D0]" : "border-[#3A4070]"
                  }`}
                >
                  {input.den || "?"}
                </button>
                <span className="text-[9px] text-[#8B90BE] mt-0.5">ぶんぼ</span>
                <span className="text-[8px] text-[#4A4F72]">※せいすうはあけてOK</span>
              </div>
            ) : unit.type === "fracSameDenom" ? (
              <div className="flex flex-col items-center">
                <span className="text-[9px] text-[#8B90BE] mb-0.5">ぶんし</span>
                <button
                  onClick={() => input.setFocusField("num")}
                  className={`text-xl font-mono px-3 py-1 rounded border-b-2 ${
                    input.focusField === "num" ? "border-[#4FE0D0] text-[#4FE0D0]" : "border-[#3A4070]"
                  }`}
                >
                  {input.num || "?"}
                </button>
                <div className="w-12 h-[3px] my-1" style={{ backgroundColor: "#8B90BE" }} />
                <button
                  onClick={() => input.setFocusField("den")}
                  className={`text-xl font-mono px-3 py-1 rounded border-b-2 ${
                    input.focusField === "den" ? "border-[#4FE0D0] text-[#4FE0D0]" : "border-[#3A4070]"
                  }`}
                >
                  {input.den || "?"}
                </button>
                <span className="text-[9px] text-[#8B90BE] mt-0.5">ぶんぼ</span>
              </div>
            ) : unit.type === "fracFixed" ? (
              <div className="flex flex-col items-center gap-1 text-xl font-mono">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-[#8B90BE]">こたえ</span>
                  <span className="px-1">{input.value || "?"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-[#8B90BE]">あまり</span>
                  <span className="px-1" style={{ color: "#4FE0D0" }}>
                    {input.extra !== "" ? input.extra : "?"}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-2xl font-mono">
                {unit.type === "signed" && <span className="text-[#FF7A45] mr-1">{input.negative ? "−" : ""}</span>}
                {input.value || "?"}
                {unit.suffix && <span className="text-base text-[#8B90BE] ml-1">{unit.suffix}</span>}
              </div>
            )}
          </div>

          {unit.type === "fracFixed" && (
            <div className="mb-4 text-center">
              <p className="text-[9px] text-[#8B90BE] mb-1">① あまりをえらぶ</p>
              <div className="flex gap-1.5 justify-center">
                {[0,1,2,3,4,5,6,7,8].map((n) => (
                  <button
                    key={n}
                    onClick={() => input.setExtra(String(n))}
                    className={`w-7 h-7 rounded text-xs border ${
                      input.extra === String(n) ? "border-[#4FE0D0] text-[#4FE0D0]" : "border-[#3A4070] text-[#8B90BE]"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <p className="text-[9px] text-[#8B90BE] mt-3 mb-1">② こたえを にゅうりょく</p>
            </div>
          )}

          <NumPad
            onDigit={input.digit}
            onClear={input.clear}
            onBack={input.back}
            onToggleSign={input.toggleSign}
            showSign={unit.type === "signed"}
            onDot={input.dot}
            showDot={unit.type === "decimal"}
            showAdvance={unit.type === "fracFree" || unit.type === "fracSameDenom"}
            focusField={input.focusField}
            onAdvance={input.advanceFocus}
          />

          <button
            onClick={submit}
            disabled={!canSubmit() || locked}
            style={{ backgroundColor: "#FF7A45", color: "#0F1226" }}
            className="mt-5 w-full max-w-xs py-3 rounded-xl font-bold disabled:opacity-30"
          >
            こたえる
          </button>
        </div>
      </div>
    </div>
  );
}

function BattleResult({ profile, result, aiRankKey, coinsEarned, recordInfo, onDone }) {
  const aiRank = AI_RANKS[aiRankKey];
  const outcome = computeBattleOutcome(result);
  const levelBefore = levelForXp(profile.xp);
  const levelAfter = levelForXp((profile.xp || 0) + coinsEarned);
  const leveledUp = levelAfter > levelBefore;
  const heroTitleBefore = titleForLevel(levelBefore);
  const heroTitleAfter = titleForLevel(levelAfter);
  const titleChanged = heroTitleBefore.name !== heroTitleAfter.name;

  const title = outcome === "win" ? `${aiRank.monster}を たおした！` : outcome === "lose" ? "またチャレンジ！" : "ひきわけ！";
  const color = outcome === "win" ? "#6EE7A8" : outcome === "lose" ? "#FF5D73" : "#FFC864";

  return (
    <div className="min-h-screen bg-[#0F1226] text-[#F3F5FF] flex flex-col items-center justify-center px-6" style={{ fontFamily: "'Inter', sans-serif" }}>
      {titleChanged && (
        <div
          className="mb-3 px-5 py-2 rounded-2xl font-bold text-center"
          style={{ backgroundColor: "#B24FFF", color: "#0F1226", animation: "mb-pop-scale .5s ease" }}
        >
          <p className="text-sm">✨ 称号アップ！</p>
          <p className="text-lg" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            {heroTitleAfter.emoji} {heroTitleAfter.name} になった！
          </p>
        </div>
      )}
      {leveledUp && (
        <div
          className="mb-3 px-5 py-2 rounded-2xl font-bold text-center"
          style={{ backgroundColor: "#4FE0D0", color: "#0F1226", animation: "mb-pop-scale .45s ease" }}
        >
          <p className="text-sm">🎉 LEVEL UP！</p>
          <p className="text-lg" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Lv.{levelBefore} → Lv.{levelAfter}</p>
        </div>
      )}
      {recordInfo?.isNewRecord && (
        <div
          className="mb-3 px-4 py-1.5 rounded-full font-bold text-sm"
          style={{ backgroundColor: "#FFC864", color: "#0F1226", animation: "mb-pop-scale .4s ease" }}
        >
          🏆 NEW RECORD！
        </div>
      )}
      <span className="text-5xl mb-2">{aiRank.emoji}</span>
      <p className="text-xs tracking-widest mb-2" style={{ color: aiRank.color }}>
        VS {aiRank.monster} ({aiRank.label})
      </p>
      <h2 className="text-3xl font-bold mb-6 text-center" style={{ fontFamily: "'Space Grotesk', sans-serif", color }}>
        {title}
      </h2>
      <div className="grid grid-cols-2 gap-4 w-full max-w-xs">
        <div className="bg-[#1B1F3B] rounded-xl p-4 text-center border border-[#242A4F]">
          <p className="text-xs text-[#8B90BE]">あなた</p>
          <p className="text-2xl font-bold font-mono">{result.userScore}/10</p>
          <p className="text-[10px] text-[#8B90BE] mt-1">{(result.userTotalMs / 1000).toFixed(1)}s</p>
        </div>
        <div className="bg-[#1B1F3B] rounded-xl p-4 text-center border border-[#242A4F]">
          <p className="text-xs text-[#8B90BE]">{aiRank.monster}</p>
          <p className="text-2xl font-bold font-mono">{result.aiScore}/10</p>
          <p className="text-[10px] text-[#8B90BE] mt-1">{(result.aiTotalMs / 1000).toFixed(1)}s</p>
        </div>
      </div>
      {recordInfo?.bestTimeMs != null && (
        <div className="flex items-center gap-4 mt-3 text-xs text-[#8B90BE]">
          <span>今回:{formatTime(result.userTotalMs)}</span>
          <span style={{ color: "#FFC864" }}>ベスト:{formatTime(recordInfo.bestTimeMs)}</span>
        </div>
      )}
      <CoinCounter amount={coinsEarned} />
      <button onClick={() => onDone(outcome, coinsEarned)} style={{ backgroundColor: "#4FE0D0", color: "#0F1226" }} className="mt-8 w-full max-w-xs py-3 rounded-xl font-bold">
        ホームへ
      </button>
    </div>
  );
}

/* ---------------- ルート ---------------- */

export default function MathBattleApp() {
  useEffect(() => {
    ensureFonts();
    ensureButtonReset();
  }, []);

  const [profile, setProfile] = useState(null);
  const [screen, setScreen] = useState("select"); // select | home | practice | practiceResult | battleSetup | battle | battleResult
  const [practiceUnitIndex, setPracticeUnitIndex] = useState(0);
  const [practiceResult, setPracticeResult] = useState(null);
  const [practiceRecordInfo, setPracticeRecordInfo] = useState({ isNewRecord: false, bestTimeMs: null });
  const [battleConfig, setBattleConfig] = useState(null);
  const [battleResult, setBattleResult] = useState(null);
  const [battleRecordInfo, setBattleRecordInfo] = useState({ isNewRecord: false, bestTimeMs: null });

  const handleSelectProfile = (p) => {
    setProfile(p);
    setScreen("home");
  };

  const handlePracticeFinish = async (result) => {
    const unit = UNITS[practiceUnitIndex];
    const accuracy = result.correctCount / 10;
    const records = profile.records || { practice: {}, battle: {} };
    const existing = records.practice?.[unit.id];
    let isNewRecord = false;
    let bestTimeMs = existing?.bestTimeMs ?? null;

    // 正解率80%以上のときだけ記録更新の対象にする(速いだけの答えを記録にしないため)
    if (accuracy >= 0.8 && (!existing || result.totalTimeMs < existing.bestTimeMs)) {
      isNewRecord = true;
      bestTimeMs = result.totalTimeMs;
      const updatedProfile = {
        ...profile,
        records: {
          ...records,
          practice: { ...records.practice, [unit.id]: { bestTimeMs: result.totalTimeMs, updatedAt: Date.now() } },
        },
      };
      setProfile(updatedProfile);
      await saveProfile(updatedProfile);
    }

    setPracticeRecordInfo({ isNewRecord, bestTimeMs });
    setPracticeResult(result);
    setScreen("practiceResult");
  };

  const practiceCoins = practiceResult
    ? practiceResult.correctCount * 2 + (practiceResult.correctCount / 10 >= 0.8 ? 10 : 0)
    : 0;

  const handlePracticeContinue = async (passed, coinsEarned) => {
    // 復習(すでにクリア済みの単元)のときは進度を進めない
    const advance = passed && practiceUnitIndex === profile.unitIndex && profile.unitIndex < LAST_UNIT_INDEX;
    const updated = {
      ...profile,
      unitIndex: advance ? profile.unitIndex + 1 : profile.unitIndex,
      coins: (profile.coins || 0) + coinsEarned,
      xp: (profile.xp || 0) + coinsEarned,
    };
    setProfile(updated);
    await saveProfile(updated);
    setScreen("home");
  };

  const handleBattleStart = (unitIdx, aiRankKey) => {
    setBattleConfig({ unitIdx, aiRankKey });
    setScreen("battle");
  };

  const handleBattleFinish = async (result) => {
    const unit = UNITS[battleConfig.unitIdx];
    const key = `${unit.id}:${battleConfig.aiRankKey}`;
    const outcome = computeBattleOutcome(result);
    const records = profile.records || { practice: {}, battle: {} };
    const existing = records.battle?.[key];
    let isNewRecord = false;
    let bestTimeMs = existing?.bestTimeMs ?? null;

    // 勝ったときだけ記録更新の対象にする
    if (outcome === "win" && (!existing || result.userTotalMs < existing.bestTimeMs)) {
      isNewRecord = true;
      bestTimeMs = result.userTotalMs;
      const updatedProfile = {
        ...profile,
        records: {
          ...records,
          battle: { ...records.battle, [key]: { bestTimeMs: result.userTotalMs, updatedAt: Date.now() } },
        },
      };
      setProfile(updatedProfile);
      await saveProfile(updatedProfile);
    }

    setBattleRecordInfo({ isNewRecord, bestTimeMs });
    setBattleResult(result);
    setScreen("battleResult");
  };

  const battleCoins = battleResult
    ? battleResult.userScore > battleResult.aiScore
      ? 30
      : battleResult.userScore === battleResult.aiScore
      ? 15
      : 5
    : 0;

  const handleBattleDone = async (outcome, coinsEarned) => {
    const battle = { ...profile.battle };
    if (outcome === "win") battle.wins += 1;
    else if (outcome === "lose") battle.losses += 1;
    else battle.draws += 1;
    const monsterDefeats = { ...(profile.monsterDefeats || {}) };
    if (outcome === "win") {
      const key = battleConfig.aiRankKey;
      monsterDefeats[key] = (monsterDefeats[key] || 0) + 1;
    }
    const updated = {
      ...profile,
      battle,
      monsterDefeats,
      coins: (profile.coins || 0) + coinsEarned,
      xp: (profile.xp || 0) + coinsEarned,
    };
    setProfile(updated);
    await saveProfile(updated);
    setScreen("home");
  };

  if (screen === "select" || !profile) {
    return <ProfileSelect onSelect={handleSelectProfile} />;
  }

  if (screen === "home") {
    return (
      <Home
        profile={profile}
        onStartPractice={() => {
          setPracticeUnitIndex(profile.unitIndex);
          setScreen("practice");
        }}
        onReviewUnit={(i) => {
          setPracticeUnitIndex(i);
          setScreen("practice");
        }}
        onStartBattle={() => setScreen("battleSetup")}
        onOpenZukan={() => setScreen("zukan")}
        onSwitchProfile={() => setScreen("select")}
      />
    );
  }

  if (screen === "zukan") {
    return <Zukan profile={profile} onBack={() => setScreen("home")} />;
  }

  if (screen === "practice") {
    return <Practice profile={profile} unitIndex={practiceUnitIndex} onFinish={handlePracticeFinish} />;
  }

  if (screen === "practiceResult") {
    return (
      <PracticeResult
        profile={profile}
        result={practiceResult}
        unit={UNITS[practiceUnitIndex]}
        isReview={practiceUnitIndex !== profile.unitIndex}
        coinsEarned={practiceCoins}
        recordInfo={practiceRecordInfo}
        onContinue={handlePracticeContinue}
      />
    );
  }

  if (screen === "battleSetup") {
    return (
      <BattleSetup
        profile={profile}
        onStart={handleBattleStart}
        onCancel={() => setScreen("home")}
      />
    );
  }

  if (screen === "battle") {
    return (
      <Battle
        profile={profile}
        unitIndex={battleConfig.unitIdx}
        aiRankKey={battleConfig.aiRankKey}
        onFinish={handleBattleFinish}
      />
    );
  }

  if (screen === "battleResult") {
    return (
      <BattleResult
        profile={profile}
        result={battleResult}
        aiRankKey={battleConfig.aiRankKey}
        coinsEarned={battleCoins}
        recordInfo={battleRecordInfo}
        onDone={handleBattleDone}
      />
    );
  }

  return null;
}
