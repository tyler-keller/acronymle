"use strict";
const MAX_GUESSES = 6;
const EPOCH = new Date(2026, 9, 31); // local midnight, puzzle #1
const $ = (s) => document.querySelector(s);

// ---------- puzzle selection ----------
function dayIndex(d = new Date()) {
  const mid = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.round((mid - EPOCH) / 864e5);
}
const params = new URLSearchParams(location.search);
const PRACTICE = params.has("practice");
let puzzleIdx, puzzleNo;
if (PRACTICE) {
  const v = parseInt(params.get("practice"), 10);
  puzzleIdx = Number.isInteger(v) ? ((v % PUZZLES.length) + PUZZLES.length) % PUZZLES.length
                                  : Math.floor(Math.random() * PUZZLES.length);
} else {
  puzzleNo = Math.max(0, dayIndex()) + 1;
  puzzleIdx = (puzzleNo - 1) % PUZZLES.length;
}
const [ACRO, EXPANSION, CATEGORY] = PUZZLES[puzzleIdx];
// parts: [{text, conn}] in display order; slots: the guessable words
const PARTS = EXPANSION.split(" ").map((w) => ({ text: w.replace("~", "").toUpperCase(), conn: w.startsWith("~") }));
const SLOTS = PARTS.filter((p) => !p.conn).map((p) => p.text);

// ---------- state ----------
const KEY = PRACTICE ? null : `acronymal:day:${puzzleNo}`;
let state = (KEY && JSON.parse(localStorage.getItem(KEY) || "null")) || { guesses: [], status: "playing" };
let typed = []; // letters for the editable positions of the current row
const save = () => KEY && localStorage.setItem(KEY, JSON.stringify(state));

// Wordle-style scoring within a single word; position 0 is always the given first letter.
function score(guess, answer) {
  const res = Array(answer.length).fill("absent"), pool = {};
  for (let i = 0; i < answer.length; i++) {
    if (guess[i] === answer[i]) res[i] = "correct";
    else pool[answer[i]] = (pool[answer[i]] || 0) + 1;
  }
  for (let i = 0; i < answer.length; i++) {
    if (res[i] !== "correct" && pool[guess[i]] > 0) { res[i] = "present"; pool[guess[i]]--; }
  }
  return res;
}
const solvedSlots = () => SLOTS.map((ans, s) => state.guesses.some((g) => g[s] === ans));
function editablePositions() { // [[slot, pos], ...] for the active row
  const solved = solvedSlots(), out = [];
  SLOTS.forEach((w, s) => { if (!solved[s]) for (let p = 1; p < w.length; p++) out.push([s, p]); });
  return out;
}
function currentWords() {
  const solved = solvedSlots(), words = SLOTS.map((w, s) => (solved[s] ? w : w[0] + " ".repeat(w.length - 1)).split(""));
  editablePositions().forEach(([s, p], i) => { words[s][p] = typed[i] || " "; });
  return words.map((w) => w.join(""));
}

// ---------- rendering ----------
function tile(ch, cls) { const t = document.createElement("span"); t.className = "tile " + cls; t.textContent = ch.trim(); return t; }
function renderRow(kind, words, extra) {
  const row = document.createElement("div");
  row.className = "guess " + (kind === "active" ? "active" : "") + (extra || "");
  const solved = solvedSlots(), edit = editablePositions(), cursor = edit[typed.length];
  let s = 0;
  for (const part of PARTS) {
    if (part.conn) { const c = document.createElement("span"); c.className = "conn"; c.textContent = part.text.toLowerCase(); row.append(c); continue; }
    const wEl = document.createElement("span"); wEl.className = "word";
    const ans = SLOTS[s];
    if (kind === "done") {
      const sc = score(words[s], ans);
      for (let i = 0; i < ans.length; i++) wEl.append(tile(words[s][i], sc[i]));
    } else if (kind === "active") {
      for (let i = 0; i < ans.length; i++) {
        if (solved[s]) wEl.append(tile(ans[i], "locked"));
        else if (i === 0) wEl.append(tile(ans[0], "first"));
        else {
          const ch = words[s][i];
          const isCur = cursor && cursor[0] === s && cursor[1] === i;
          wEl.append(tile(ch, (ch.trim() ? "filled" : "") + (isCur ? " cursor" : "")));
        }
      }
    } else { // empty future row
      for (let i = 0; i < ans.length; i++) wEl.append(tile(i === 0 ? ans[0] : "", i === 0 ? "first faint" : ""));
    }
    row.append(wEl); s++;
  }
  return row;
}
function render(revealLast) {
  $("#acronym").innerHTML = ACRO.split("").map((c) => `<span>${c}</span>`).join("");
  $("#category").textContent = CATEGORY;
  $("#number").textContent = PRACTICE ? `Practice #${puzzleIdx + 1}` : `#${puzzleNo}`;
  const b = $("#board"); b.innerHTML = "";
  state.guesses.forEach((g, i) => b.append(renderRow("done", g, revealLast && i === state.guesses.length - 1 ? " reveal" : "")));
  if (state.status === "playing") b.append(renderRow("active", currentWords()));
  if (state.status === "playing") { const n = document.createElement("div"); n.className = "left"; n.textContent = `Guess ${state.guesses.length + 1} of ${MAX_GUESSES}`; b.append(n); }
  const act = b.querySelector(".guess.active"); if (act && revealLast !== undefined) act.scrollIntoView({ block: "nearest" });
  renderKeys();
}

// ---------- keyboard ----------
const ROWS = ["QWERTYUIOP", "ASDFGHJKL", "↵ZXCVBNM⌫"];
function keyStates() {
  const st = {};
  for (const g of state.guesses) SLOTS.forEach((ans, s) => {
    const sc = score(g[s], ans);
    for (let i = 1; i < ans.length; i++) {
      const ch = g[s][i], v = sc[i], cur = st[ch];
      if (v === "correct") st[ch] = "green";
      else if (v === "present" && cur !== "green") st[ch] = "hit";
      else if (!cur) st[ch] = "miss";
    }
  });
  return st;
}
function renderKeys() {
  const kb = $("#keyboard"), st = keyStates(); kb.innerHTML = "";
  for (const r of ROWS) {
    const row = document.createElement("div"); row.className = "krow";
    for (const k of r) {
      const b = document.createElement("button"); b.className = "key";
      if (k === "↵") { b.textContent = "ENTER"; b.classList.add("wide"); b.dataset.k = "Enter"; }
      else if (k === "⌫") { b.textContent = "⌫"; b.classList.add("wide"); b.dataset.k = "Backspace"; }
      else { b.textContent = k; b.dataset.k = k; if (st[k]) b.classList.add(st[k]); }
      row.append(b);
    }
    kb.append(row);
  }
}
$("#keyboard").addEventListener("click", (e) => { const k = e.target.closest(".key"); if (k) press(k.dataset.k); });
document.addEventListener("keydown", (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey || document.querySelector("dialog[open]")) return;
  if (e.key === "Enter" || e.key === "Backspace") { e.preventDefault(); press(e.key); }
  else if (/^[a-z]$/i.test(e.key)) press(e.key.toUpperCase());
});

function press(k) {
  if (state.status !== "playing") return;
  const n = editablePositions().length;
  if (k === "Backspace") typed.pop();
  else if (k === "Enter") return submit();
  else if (typed.length < n) typed.push(k);
  render();
}
function submit() {
  if (typed.length < editablePositions().length) { toast("Fill every word"); shake(); return; }
  const words = currentWords();
  state.guesses.push(words); typed = [];
  const won = words.every((w, i) => w === SLOTS[i]);
  if (won) state.status = "won";
  else if (state.guesses.length >= MAX_GUESSES) state.status = "lost";
  save(); render(true);
  if (state.status !== "playing") { recordStats(); setTimeout(showEnd, 700); }
  else { const newly = solvedSlots().filter(Boolean).length; if (newly) toast(`${newly}/${SLOTS.length} words locked`); }
}

// ---------- end, stats, share ----------
function recordStats() {
  if (PRACTICE) return;
  const s = JSON.parse(localStorage.getItem("acronymal:stats") || '{"played":0,"won":0,"streak":0,"best":0,"dist":[0,0,0,0,0,0],"last":0}');
  if (s.lastRecorded === puzzleNo) return;
  s.played++;
  if (state.status === "won") {
    s.won++; s.dist[state.guesses.length - 1]++;
    s.streak = s.last === puzzleNo - 1 ? s.streak + 1 : 1; s.best = Math.max(s.best, s.streak);
  } else s.streak = 0;
  s.last = state.status === "won" ? puzzleNo : s.last; s.lastRecorded = puzzleNo;
  localStorage.setItem("acronymal:stats", JSON.stringify(s));
}
function showEnd() {
  $("#end-title").textContent = state.status === "won" ? ["Genius", "Brilliant", "Sharp", "Nice", "Solid", "Phew"][state.guesses.length - 1] : "Out of guesses";
  $("#end-answer").innerHTML = `<b>${ACRO}</b> = ${PARTS.map((p) => p.conn ? p.text.toLowerCase() : `<b>${p.text[0]}</b>${p.text.slice(1).toLowerCase()}`).join(" ")}`;
  const s = JSON.parse(localStorage.getItem("acronymal:stats") || "null");
  $("#stats").innerHTML = PRACTICE || !s ? "" : `
    <div class="nums"><div><b>${s.played}</b><span>Played</span></div><div><b>${Math.round(100 * s.won / s.played)}</b><span>Win %</span></div>
    <div><b>${s.streak}</b><span>Streak</span></div><div><b>${s.best}</b><span>Best</span></div></div>
    <div class="dist">${s.dist.map((n, i) => `<div>${i + 1} <i class="${state.status === "won" && state.guesses.length === i + 1 ? "me" : ""}" style="width:${8 + 92 * n / Math.max(1, ...s.dist)}%">${n}</i></div>`).join("")}</div>`;
  $("#end-next").textContent = PRACTICE ? "" : "Next puzzle at midnight.";
  $("#dlg-end").showModal();
}
function shareText() {
  const rows = state.guesses.map((g) => SLOTS.map((ans, s) => {
    const sc = score(g[s], ans).slice(1);
    return sc.every((v) => v === "correct") ? "🟩" : sc.some((v) => v !== "absent") ? "🟨" : "⬛";
  }).join(""));
  const head = PRACTICE ? `Acronymal practice ${ACRO}` : `Acronymal #${puzzleNo} ${ACRO}`;
  return `${head} ${state.status === "won" ? state.guesses.length : "X"}/${MAX_GUESSES}\n${rows.join("\n")}\n${location.origin}${location.pathname}`;
}
$("#btn-share").addEventListener("click", async () => {
  const t = shareText();
  try { if (navigator.share && matchMedia("(pointer:coarse)").matches) await navigator.share({ text: t }); else { await navigator.clipboard.writeText(t); toast("Copied"); } }
  catch { toast("Couldn't share"); }
});

let toastTimer;
function toast(msg) { const t = $("#toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("show"), 1500); }
function shake() { const r = $(".guess.active"); if (r) { r.classList.remove("shake"); void r.offsetWidth; r.classList.add("shake"); } }

$("#btn-help").addEventListener("click", () => $("#dlg-help").showModal());
$("#btn-stats").addEventListener("click", () => (state.status === "playing" ? toast("Finish today's puzzle first") : showEnd()));

render();
if (!localStorage.getItem("acronymal:seen")) { localStorage.setItem("acronymal:seen", "1"); $("#dlg-help").showModal(); }
else if (state.status !== "playing") setTimeout(showEnd, 300);
