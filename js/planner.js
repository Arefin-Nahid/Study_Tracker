// Planner tab: prayers, schedule blocks, focus timer, block editor, settings.
/* ===== Planner: daily time-blocking + 5 prayers ===== */
const PRAY = ["fajr", "dhuhr", "asr", "maghrib", "isha"];
const PNAME = { fajr: "Fajr", dhuhr: "Dhuhr", asr: "Asr", maghrib: "Maghrib", isha: "Isha" };
const PDUR = { fajr: 25, dhuhr: 20, asr: 20, maghrib: 20, isha: 20 };
const PDEF = { fajr: 275, dhuhr: 710, asr: 910, maghrib: 1060, isha: 1140 };
const BT = {
  class: { n: "Class lecture", h: 200 },
  vocab: { n: "Vocabulary", h: 45 },
  study: { n: "Deep study", h: 215 },
  revise: { n: "Revision", h: 28 },
  practice: { n: "Practice", h: 150 },
  exam: { n: "Exam", h: 268 },
  write: { n: "Writing", h: 185 },
  news: { n: "Newspaper", h: 330 },
  meal: { n: "Meal", h: 0 },
  break: { n: "Break", h: 0 },
  other: { n: "Other", h: 0 },
};
const WORK = ["class", "study", "revise", "practice", "exam", "write", "news", "vocab"];
let pDate = today(),
  pEdit = null;
const getCfg = () => {
  const c = S.c || {};
  return { pt: Object.assign({}, PDEF, c.pt || {}), goal: c.goal || (c.ap && c.ap.goal) || 10 };
};
const getDay = (d) => {
  const x = (S.p || {})[d] || {};
  return { b: (x.b || []).slice(), pr: Object.assign({}, x.pr || {}), ai: x.ai || null };
};
function putDay(d, x) {
  if (!S.p) S.p = {};
  if (!x.b.length) delete x.ai;
  if (x.ai === null) delete x.ai;
  if (!x.b.length && !Object.keys(x.pr).length) delete S.p[d];
  else S.p[d] = x;
  commit();
  render();
}
const T12 = (m) => {
  m = ((m % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60),
    mm = m % 60;
  return (h % 12 || 12) + ":" + String(mm).padStart(2, "0") + (h < 12 ? " AM" : " PM");
};
const T24 = (m) => String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0");
const P24 = (s) => {
  const m = /^(\d{1,2}):(\d{2})/.exec(s || "");
  return m ? +m[1] * 60 + +m[2] : null;
};
const DUR = (m) => (m >= 60 ? Math.floor(m / 60) + "h" + (m % 60 ? " " + (m % 60) + "m" : "") : m + "m");
const nowMin = () => {
  const n = new Date();
  return n.getHours() * 60 + n.getMinutes();
};
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

function planItems(date) {
  const cfg = getCfg(),
    d = getDay(date);
  const it = d.b.map((x) => ({ k: "b", id: x.id, t: x.t, n: x.n, s: x.s, d: x.d, x: x.x }));
  PRAY.forEach((n) =>
    it.push({ k: "p", id: n, n: PNAME[n], t: "prayer", s: cfg.pt[n], d: PDUR[n], x: d.pr[n] }),
  );
  return it.sort((a, b) => a.s - b.s || (a.k === "p" ? -1 : 1));
}

function plannedMins(items, onlyDone) {
  return items
    .filter((x) => x.k === "b" && WORK.includes(x.t) && (!onlyDone || x.x))
    .reduce((a, x) => a + x.d, 0);
}

function insights(items, date) {
  const cfg = getCfg(),
    pl = plannedMins(items),
    out = [],
    nDue = dueList().length;
  const blocks = items.filter((x) => x.k === "b");
  if (!blocks.length)
    return [{ c: "info", t: "No blocks yet. Use + Add block, or tap a type above, to build your day." }];
  if (pl < cfg.goal * 60 - 30)
    out.push({ c: "warn", t: `Planned study is ${DUR(cfg.goal * 60 - pl)} below your ${cfg.goal}h target.` });
  if (nDue && !blocks.some((x) => x.t === "revise"))
    out.push({
      c: "warn",
      t: `${nDue} topic${nDue > 1 ? "s" : ""} due for revision but no revision block. Do revision first; it is the cheapest gain.`,
    });
  if (!blocks.some((x) => x.t === "exam" || x.t === "practice"))
    out.push({ c: "warn", t: "No practice or mock exam. Timed recall beats re-reading for retention." });
  if (!blocks.some((x) => x.t === "news" || x.t === "vocab"))
    out.push({
      c: "warn",
      t: "No newspaper or vocabulary block. 20 to 45 minutes daily compounds for the English, general knowledge and current affairs sections.",
    });
  const wk = plannedMins(items),
    rc = blocks.filter((x) => RECALL.includes(x.t)).reduce((a, x) => a + x.d, 0);
  if (wk && rc / wk < 0.35)
    out.push({
      c: "warn",
      t: `Only ${Math.round((rc / wk) * 100)}% of study time is active recall. Add practice questions or a timed test; recall builds memory faster than re-reading.`,
    });
  const long = blocks.find((x) => WORK.includes(x.t) && x.d > 120);
  if (long)
    out.push({
      c: "warn",
      t: `"${long.n || BT[long.t].n}" runs ${DUR(long.d)}. Focus drops after about 90 minutes; split it with a 10 to 15 minute break.`,
    });
  const last = Math.max(...blocks.map((x) => x.s + x.d));
  if (last > 23 * 60)
    out.push({
      c: "warn",
      t: "Plan runs past 11 PM. Protect 7 hours of sleep; it consolidates what you studied.",
    });
  if (!out.length)
    out.push({
      c: "ok",
      t: "Balanced plan. Protect your first deep-study block and do the hardest topic there.",
    });
  return out;
}

const DDUR = { class: 120, study: 60, revise: 45, practice: 60, exam: 60, news: 45, vocab: 20, other: 30 };
const TIPS = {
  class: "Take active notes and pause to summarise every 20 minutes. Review them within 24 hours.",
  study: "One topic only, phone away. Do your hardest subject first, when attention is highest.",
  revise: "Recall from memory first, then check. Revise topics due today before new ones.",
  practice: "Mixed-topic questions. Log every mistake and its cause.",
  exam: "Timed, in exam conditions. Review each wrong answer afterwards.",
  news: "Read for facts likely to be asked. Note 5 to 8 key points.",
  vocab: "Learn 10 to 15 new words with meanings and a sentence. Review yesterday's words first.",
  other: "Anything else: writing, travel, rest, errands.",
};
const QUICK = ["class", "study", "revise", "practice", "exam", "news", "vocab"];
function nextStart(date) {
  const b = getDay(date).b;
  let t = b.length
    ? Math.max(...b.map((x) => x.s + x.d))
    : date === today()
      ? Math.max(8 * 60, Math.ceil(nowMin() / 5) * 5)
      : 8 * 60;
  t = Math.ceil(t / 5) * 5;
  const cfg = getCfg();
  for (let k = 0; k < 5; k++)
    for (const n of PRAY) {
      const ps = cfg.pt[n],
        pe = ps + PDUR[n];
      if (t < pe && t + 30 > ps) t = pe;
    }
  return Math.min(t, 23 * 60 + 30);
}
const TECH = {
  study: "Deep work, one topic",
  revise: "Spaced repetition",
  practice: "Interleaved practice",
  exam: "Timed retrieval test",
  write: "Output practice",
  news: "Current affairs, brief notes",
  class: "Active note-taking",
  vocab: "Spaced word review",
  meal: "Recovery",
  break: "Recovery",
  other: "Review",
};
const RECALL = ["practice", "exam", "revise"];
let showFree = true;
try {
  showFree = localStorage.getItem("st-free") !== "0";
} catch (e) {}
let FT = null;
try {
  FT = JSON.parse(localStorage.getItem("st-focus") || "null");
} catch (e) {}
const saveFT = () => {
  try {
    FT ? localStorage.setItem("st-focus", JSON.stringify(FT)) : localStorage.removeItem("st-focus");
  } catch (e) {}
};
const ftLeft = () => (FT ? (FT.paused ? FT.left : Math.max(0, FT.end - Date.now())) : 0);
const mmss = (ms) => {
  const s = Math.ceil(ms / 1000),
    h = Math.floor(s / 3600),
    m = Math.floor((s % 3600) / 60),
    z = (n) => String(n).padStart(2, "0");
  return (h ? h + ":" : "") + z(m) + ":" + z(s % 60);
};
setInterval(() => {
  if (!FT) return;
  if (!FT.paused && ftLeft() <= 0) {
    finishFocus(true);
    return;
  }
  const el = document.getElementById("ftTime");
  if (el) el.textContent = mmss(ftLeft());
  const bar = document.getElementById("ftBar");
  if (bar) bar.style.width = Math.min(100, 100 - (ftLeft() / FT.total) * 100) + "%";
}, 1000);
function startFocus(date, id) {
  const d = getDay(date),
    b = d.b.find((x) => x.id === id);
  if (!b) return;
  if (FT && !confirm("Replace the running focus session?")) return;
  FT = {
    date,
    id,
    total: b.d * 60000,
    end: Date.now() + b.d * 60000,
    paused: 0,
    left: 0,
    n: b.n || BT[b.t].n,
  };
  saveFT();
  render();
}
function finishFocus(auto) {
  if (!FT) return;
  const f = FT;
  FT = null;
  saveFT();
  const d = getDay(f.date),
    b = d.b.find((x) => x.id === f.id);
  if (b && !b.x) {
    b.x = 1;
    putDay(f.date, d);
  } else render();
  toast(auto ? "Focus session complete. Block marked done." : "Block marked done.");
}

function mixHtml(items) {
  const by = {};
  items.filter((x) => x.k === "b").forEach((x) => (by[x.t] = (by[x.t] || 0) + x.d));
  const tot = Object.values(by).reduce((a, b) => a + b, 0);
  if (!tot) return "";
  const keys = Object.keys(BT).filter((k) => by[k]);
  const work = WORK.reduce((a, k) => a + (by[k] || 0), 0),
    rec = RECALL.reduce((a, k) => a + (by[k] || 0), 0);
  const share = work ? Math.round((rec / work) * 100) : 0;
  return `<section class="card mix"><div class="mixbar" role="img" aria-label="Time by type">${keys.map((k) => `<i style="flex:${by[k]};--h:${BT[k].h}" class="${["meal", "break", "other"].includes(k) ? "neu" : ""}"></i>`).join("")}</div>
  <div class="mixleg">${keys.map((k) => `<span class="${["meal", "break", "other"].includes(k) ? "neu" : ""}" style="--h:${BT[k].h}"><i></i>${BT[k].n} <b>${DUR(by[k])}</b></span>`).join("")}</div>
  <p class="mixnote">Active recall <b>${share}%</b> of study time <span>(practice, mock exams, revision). Aim for 40% or more.</span></p></section>`;
}

function renderPlanner() {
  const cfg = getCfg(),
    d = getDay(pDate),
    items = planItems(pDate),
    isT = pDate === today(),
    nm = isT ? nowMin() : -1;
  const pl = plannedMins(items),
    dn = plannedMins(items, true),
    pr = PRAY.filter((n) => d.pr[n]).length;
  const dt = new Date(pDate + "T00:00:00").toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "short",
  });
  let h = `<div class="syl pln"><div class="wk-head"><button class="icon" data-pa="prev" aria-label="Previous day">‹</button><div><b>${dt}</b><small>${isT ? "Today" : daysBetween(today(), pDate) > 0 ? "In " + daysBetween(today(), pDate) + " day(s)" : Math.abs(daysBetween(today(), pDate)) + " day(s) ago"}</small></div><button class="icon" data-pa="next" aria-label="Next day">›</button>${isT ? "" : '<button class="btn" data-pa="now">Today</button>'}</div>`;
  if (FT) {
    const l = ftLeft();
    h += `<section class="card ft"><div class="ft-t"><span>Focus session</span><b>${esc(FT.n)}</b></div><div class="ft-time" id="ftTime">${mmss(l)}</div><div class="bar ftbar"><i id="ftBar" style="width:${Math.min(100, 100 - (l / FT.total) * 100)}%"></i></div><div class="plact"><button class="btn" data-pa="fpause">${FT.paused ? "Resume" : "Pause"}</button><button class="btn primary2" data-pa="ffin">Finish</button><button class="btn warn" data-pa="fstop">Stop</button></div></section>`;
  }
  const pct = cfg.goal ? Math.min(100, Math.round((dn / (cfg.goal * 60)) * 100)) : 0;
  h += `<section class="card plsum"><div class="plsum-g"><div><span>Studied</span><b>${DUR(dn)}</b><small>of ${DUR(pl)} planned</small></div><button class="tgt" data-pa="tgt" aria-label="Edit daily target"><span>Target</span><b>${cfg.goal}h</b><small>${pct}% reached ✎</small></button><div><span>Prayers</span><b>${pr}/5</b><small>${pr === 5 ? "All done" : 5 - pr + " left"}</small></div></div><div class="bar plbar"><i style="width:${pct}%"></i></div></section>`;
  h +=
    `<section class="card"><h2>Prayers<span>tap when prayed<button class="gear" data-pa="set" aria-label="Prayer times" title="Prayer times"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg></button></span></h2><div class="prs">` +
    PRAY.map(
      (n) =>
        `<button class="pr${d.pr[n] ? " on" : ""}" data-pa="pray" data-n="${n}" aria-pressed="${!!d.pr[n]}"><span class="pc">${d.pr[n] ? "✓" : ""}</span><b>${PNAME[n]}</b><small>${T12(cfg.pt[n]).replace(" ", "")}</small></button>`,
    ).join("") +
    `</div></section>`;
  const nb = items.filter((x) => x.k === "b").length;
  h += `<div class="sch-h"><div><h2 class="plain">Schedule</h2><small>${nb ? nb + " block" + (nb === 1 ? "" : "s") + " · " + DUR(pl) + " planned" : "Nothing planned yet"}</small></div><div class="sch-act"><button class="btn ai" data-pa="ai"><svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M12 2l1.9 6.1L20 10l-6.1 1.9L12 18l-1.9-6.1L4 10l6.1-1.9z"/><path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9z"/></svg> AI plan</button><button class="btn primary2" data-pa="add">+ Add block</button></div></div>`;
  h += (nb ? mixHtml(items) : "") + '<div class="tl">';
  let prevEnd = null,
    shown = 0;
  items.forEach((x) => {
    prevEnd = Math.max(prevEnd ?? 0, x.s + x.d);
    if (x.k === "p") return;
    shown++;
    const now = nm >= x.s && nm < x.s + x.d,
      done = !!x.x,
      work = WORK.includes(x.t),
      neutral = !work;
    const run = FT && FT.id === x.id && FT.date === pDate;
    h += `<div class="tl-row${done ? " done" : ""}${now ? " now" : ""}${neutral ? " neu" : ""}${run ? " run" : ""}" style="--h:${BT[x.t].h}"><div class="tl-time"><b>${T12(x.s).replace(" ", "")}</b><small>${DUR(x.d)}</small></div><i class="tl-bar"></i>
    <button class="tl-body" data-pa="edit" data-id="${x.id}"><b>${esc(x.n || BT[x.t].n)}</b><small><span class="tg2">${BT[x.t].n}</span>${TECH[x.t]}${now ? " · <em>Now</em>" : ""}</small></button>
    ${work && !done ? `<button class="tl-play" data-pa="focus" data-id="${x.id}" aria-label="Start focus timer">▶</button>` : "<span></span>"}
    <button class="tl-chk" data-pa="done" data-id="${x.id}" aria-pressed="${done}" aria-label="Mark done">${done ? "✓" : ""}</button></div>`;
  });
  if (!shown)
    h += '<div class="empty-day"><b>No blocks yet</b><p>Tap + Add block, or let AI plan your day.</p></div>';
  h += "</div>";
  if (nb && d.ai && d.ai.tips && d.ai.tips.length)
    h +=
      '<section class="card"><h2>Make it effective<span>From your AI plan</span></h2><ul class="tips">' +
      d.ai.tips.map((t) => `<li class="info">${esc(t)}</li>`).join("") +
      "</ul></section>";
  h += "</div>";
  return h;
}

const bkHead = (t, sub) =>
  `<div class="bk-h"><div><b>${t}</b>${sub ? `<small>${sub}</small>` : ""}</div><button class="xbtn" data-pa="close" aria-label="Close">&times;</button></div>`;
const fmtEnd = (m) => T12(m % 1440);
function bkUpd() {
  const t = $("#pf-t"),
    sv = P24($("#pf-s").value),
    dv = Math.max(0, +$("#pf-d").value || 0);
  if (!t) return;
  const bk = $("#bk");
  bk.style.setProperty("--h", BT[t.value].h);
  const r = $("#bk-range"),
    l = $("#bk-len");
  if (sv === null || !dv) {
    r.textContent = "Set a start time";
    l.textContent = BT[t.value].n;
    return;
  }
  const e = Math.min(sv + dv, 1440);
  r.textContent = T12(sv) + " to " + fmtEnd(e);
  l.textContent = DUR(e - sv) + " · " + BT[t.value].n + (sv + dv > 1440 ? " · ends at midnight" : "");
  document.querySelectorAll(".dchips button").forEach((x) => x.classList.toggle("on", +x.dataset.v === dv));
}
function openPSheet(html) {
  $("#pcard").innerHTML = html;
  $("#psheet").hidden = false;
}
function closePSheet() {
  $("#psheet").hidden = true;
  pEdit = null;
}
function openBlock(id, start, type) {
  const d = getDay(pDate),
    b = id ? d.b.find((x) => x.id === id) : null;
  pEdit = id || "new";
  const t = b ? b.t : type || "study",
    s = b ? b.s : (start ?? nextStart(pDate)),
    dur = b ? b.d : DDUR[t] || 60;
  const kinds = ["class", "study", "revise", "practice", "exam", "news", "vocab", "other"].concat(
    ["write", "meal", "break"].includes(t) ? [t] : [],
  );
  const dt = new Date(pDate + "T00:00:00").toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "short",
  });
  openPSheet(`<div id="bk" style="--h:${BT[t].h}">${bkHead(b ? "Edit block" : "New block", dt)}
  <div class="bk-prev"><i></i><div><b id="bk-range"></b><small id="bk-len"></small></div></div>
  <div class="bk-body">
   <div class="bk-col">
    <label class="fld"><span>Type</span><div class="selw"><i></i><select id="pf-t">${kinds.map((k) => `<option value="${k}"${k === t ? " selected" : ""}>${BT[k].n}</option>`).join("")}</select></div></label>
    <p class="ptip" id="pf-tip">${esc(TIPS[t] || "")}</p>
    <label class="fld"><span>Title <em>optional</em></span><input id="pf-n" type="text" maxlength="80" placeholder="e.g. Polity: Constitution" value="${b ? esc(b.n) : ""}"></label>
   </div>
   <div class="bk-col">
    <label class="fld"><span>Start time</span><input id="pf-s" type="time" value="${T24(s)}"></label>
    <div class="fld"><span>Duration</span><div class="stp"><button type="button" data-pa="dm" aria-label="Less">&minus;</button><input id="pf-d" type="number" inputmode="numeric" min="5" max="480" step="5" value="${dur}" aria-label="Minutes"><em>min</em><button type="button" data-pa="dp" aria-label="More">+</button></div></div>
    <div class="dchips">${[
      [30, "30m"],
      [45, "45m"],
      [60, "1h"],
      [90, "1h 30m"],
      [120, "2h"],
    ]
      .map((v) => `<button type="button" data-pa="pdur" data-v="${v[0]}">${v[1]}</button>`)
      .join("")}</div>
   </div>
  </div>
  <div class="bk-foot">${b ? '<button class="btn warn" data-pa="del">Delete</button>' : ""}<button class="btn primary2" data-pa="save">${b ? "Save changes" : "Add to schedule"}</button></div></div>`);
  bkUpd();
}
function openSettings() {
  const c = getCfg();
  openPSheet(`<div class="sheet-h"><b>Prayer times</b><button class="btn" data-pa="close">Close</button></div>
  <p class="hint">Set the five times from your local timetable. The planner warns you if a block overlaps a prayer.</p>
  <div class="fld2 pt">${PRAY.map((n) => `<label class="fld"><span>${PNAME[n]}</span><input id="ps-${n}" type="time" value="${T24(c.pt[n])}"></label>`).join("")}</div>
  <div class="plact"><button class="btn primary2" data-pa="setsave">Save</button><button class="btn" data-pa="setreset">Reset to default</button></div>`);
}
function openTarget() {
  const c = getCfg();
  openPSheet(`<div class="sheet-h"><b>Daily study target</b><button class="btn" data-pa="close">Close</button></div>
  <label class="fld"><span>Hours per day</span><input id="pt-goal" type="number" inputmode="decimal" min="1" max="14" step="0.5" value="${c.goal}"></label>
  <div class="dchips">${[6, 8, 10, 12].map((v) => `<button type="button" data-pa="tgtv" data-v="${v}">${v}h</button>`).join("")}</div>
  <div class="plact"><button class="btn primary2" data-pa="tgtsave">Save</button></div>`);
}
function saveSettings() {
  const pt = {};
  for (const n of PRAY) {
    const m = P24(document.getElementById("ps-" + n).value);
    pt[n] = m === null ? PDEF[n] : m;
  }
  S.c = Object.assign({}, S.c || {}, { pt });
  commit();
}
