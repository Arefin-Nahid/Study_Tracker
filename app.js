// Core app: state, storage, Today, Week and Syllabus views, render().
const $ = (s) => document.querySelector(s);
const esc = (s) =>
  String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const hue = (k) => HUE[k] ?? 160;

let S = { w: {}, e: {}, s: {}, d: [], k: {}, p: {}, c: null, n: {}, t: 0 };
const KEY = "bcs-tracker-v1";
let ref = null,
  saving = false,
  dirty = false,
  timer = null;
let wkOff = 0,
  sheetSlot = null,
  sheetF = "all",
  sheetQ = "";
let tab = "today",
  filt = "all",
  q = "",
  onlyOpen = false,
  open = new Set(),
  pick = null,
  focus = "all",
  showAllDue = false;

const iso = (d) => {
  const x = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return x.toISOString().slice(0, 10);
};
const today = () => iso(new Date());
const addDays = (s, n) => {
  const d = new Date(s + "T00:00:00");
  d.setDate(d.getDate() + n);
  return iso(d);
};
const daysBetween = (a, b) => Math.round((new Date(b + "T00:00:00") - new Date(a + "T00:00:00")) / 864e5);
const fmt = (s) => new Date(s + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" });
const U = (id) => S.s[id] || [0, "", 0];
const dueOf = (u) => (u[0] >= 1 && u[2] < 5 && u[1] ? addDays(u[1], INT[u[2]]) : null);

function loadLocal() {
  try {
    const r = JSON.parse(localStorage.getItem(KEY) || "null");
    if (r && r.s) return r;
  } catch (e) {}
  return null;
}
function migrate(r) {
  /* older saves: v1 had Notes step, v2 had Mastered. Map to 0/1/2 */
  const o = {};
  for (const id in r.s) {
    const u = r.s[id].slice();
    let st = u[0];
    if (!r.v || r.v < 2) st = st <= 1 ? 0 : st - 1;
    u[0] = Math.min(2, st);
    if (u[0] > 0) o[id] = u;
  }
  return o;
}
function adopt(r) {
  if (r && r.s && (r.t || 0) >= (S.t || 0)) {
    S = {
      w: r.w || {},
      e: r.e || {},
      p: r.p || {},
      c: r.c || null,
      n: r.n || {},
      s: migrate(r),
      d: r.d || [],
      k: r.k || {},
      t: r.t || 0,
    };
  }
}
function touchDay() {
  const t = today();
  if (!S.d.includes(t)) {
    S.d.push(t);
    S.d = S.d.slice(-90);
  }
}
function commit() {
  S.t = Date.now();
  touchDay();
  if (S.p) {
    const lim = addDays(today(), -90);
    for (const k in S.p) if (k < lim) delete S.p[k];
  }
  try {
    localStorage.setItem(KEY, JSON.stringify({ v: 3, ...S }));
  } catch (e) {}
  dirty = true;
  clearTimeout(timer);
  timer = setTimeout(flush, 700);
}
async function flush() {
  if (!ref || saving || !dirty) return;
  saving = true;
  dirty = false;
  try {
    await ref.set({
      v: 3,
      t: S.t,
      w: S.w,
      e: S.e || {},
      p: S.p || {},
      c: S.c || null,
      n: S.n || {},
      s: S.s,
      d: S.d,
      k: S.k || {},
    });
  } catch (e) {}
  saving = false;
  if (dirty) flush();
}
async function initStore() {
  try {
    const c = window.claude;
    if (!c || !c.use) return;
    const [db, user] = await Promise.all([c.use("db"), c.use("user")]);
    if (!db || !user) return;
    const id = await user.id();
    if (!id) return;
    ref = db.collection("data/users/" + id).doc("progress");
    const snap = await ref.get();
    if (snap.exists) {
      adopt(snap.data());
      try {
        localStorage.setItem(KEY, JSON.stringify({ v: 3, ...S }));
      } catch (e) {}
    } else if (S.t) {
      dirty = true;
      flush();
    }
    render();
  } catch (e) {}
}

function toast(m) {
  const t = $("#toast");
  t.textContent = m;
  t.hidden = false;
  clearTimeout(toast.h);
  toast.h = setTimeout(() => (t.hidden = true), 2600);
}
function setStage(id, st) {
  const u = U(id).slice();
  if (st >= 1 && u[0] < 1) {
    u[1] = today();
    u[2] = 0;
  }
  if (st < 1) {
    u[1] = "";
    u[2] = 0;
  }
  u[0] = st;
  if (st === 0) delete S.s[id];
  else S.s[id] = u;
  commit();
  render();
  if (st >= 1 && !U(id)[2] && dueOf(U(id))) toast("Revision scheduled: " + fmt(dueOf(U(id))));
}
function reviewed(id) {
  const u = U(id).slice();
  u[2] = Math.min(5, u[2] + 1);
  u[1] = today();
  S.s[id] = u;
  commit();
  render();
  toast(u[2] >= 5 ? "Revision cycle complete ✔" : "Next review: " + fmt(dueOf(u)));
}
function forgot(id) {
  S.s[id] = [1, today(), 0];
  commit();
  render();
  toast("Reset: review again tomorrow.");
}
function toggleExam(lid) {
  if (!S.e) S.e = {};
  if (S.e[lid]) delete S.e[lid];
  else S.e[lid] = today();
  commit();
  render();
}
function toggleWatch(lid) {
  if (S.w[lid]) delete S.w[lid];
  else S.w[lid] = today();
  commit();
  render();
}

function stats(list) {
  let lec = list.length,
    w = 0,
    un = 0,
    l1 = 0,
    l2 = 0;
  list.forEach((l) => {
    if (S.w[l.i]) w++;
    l.u.forEach((u) => {
      un++;
      const s = U(u[0])[0];
      if (s >= 1) l1++;
      if (s >= 2) l2++;
    });
  });
  return { lec, w, un, l1, l2 };
}
function inFocus(l) {
  return focus === "all" || l.f === focus;
}
function dueList() {
  const t = today(),
    out = [];
  for (const id in S.s) {
    const d = dueOf(S.s[id]);
    if (d && d <= t && UNIT[id]) out.push({ id, d });
  }
  out.sort((a, b) => (a.d < b.d ? -1 : a.d > b.d ? 1 : 0));
  return out;
}
function nextTask() {
  const dl = dueList().filter((x) => inFocus(LECOF[x.id]));
  if (dl.length) return { k: "rev", id: dl[0].id, d: dl[0].d };
  const pl = plannedIds()
      .map((id) => LECBY[id])
      .filter(Boolean),
    order = pl.concat(LEC.filter((l) => !pl.includes(l)));
  for (const l of order) {
    if (!inFocus(l) || !S.w[l.i]) continue;
    for (const u of l.u) if (U(u[0])[0] < 1) return { k: "learn", id: u[0], l };
  }
  for (const l of order) {
    if (inFocus(l) && !S.w[l.i]) return { k: "watch", l };
  }
  return null;
}

function ring(p) {
  const r = 50,
    c = 2 * Math.PI * r;
  return `<svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="${r}" fill="none" stroke="rgba(255,255,255,.22)" stroke-width="12"/><circle cx="60" cy="60" r="${r}" fill="none" stroke="#fff" stroke-width="12" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - p)}"/></svg>`;
}
function barHtml(p) {
  return `<div class="bar"><i style="width:${Math.round(p * 100)}%"></i></div>`;
}

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const wkStart = (d) => addDays(d, -new Date(d + "T00:00:00").getDay());
const curWeek = () => addDays(wkStart(today()), wkOff * 7);
const emptyWk = () => ({ s: [null, null, null, null], xs: [{ e: 0, sc: "", d: 6 }] });
function getWk(k) {
  const w = (S.k || {})[k];
  if (!w) return emptyWk();
  let a = (w.s || []).slice();
  while (a.length > 4 && !a[a.length - 1]) a.pop();
  while (a.length < 4) a.push(null);
  let xs =
    Array.isArray(w.xs) && w.xs.length
      ? w.xs.map((x) => ({ e: x.e ? 1 : 0, sc: x.sc ?? "", d: x.d == null ? 6 : x.d }))
      : [{ e: w.x && w.x.e ? 1 : 0, sc: w.x ? (w.x.sc ?? "") : "", d: 6 }];
  return { s: a, xs };
}
function putWk(k, w) {
  if (!S.k) S.k = {};
  delete w.x;
  S.k[k] = w;
  commit();
  render();
}
function plannedIds() {
  return getWk(wkStart(today()))
    .s.filter(Boolean)
    .map((x) => x.l);
}
function slotLabel(l) {
  return l.l;
}
function weekCard() {
  /* compact card for Today */
  const k = wkStart(today()),
    w = getWk(k),
    t = today(),
    dow = new Date(t + "T00:00:00").getDay();
  const used = w.s.filter(Boolean),
    n = used.length,
    ex = used.filter((x) => x.e).length,
    xd = w.xs.filter((x) => x.e).length,
    xn = w.xs.length;
  let h = `<section class="card"><h2>This week<span>${fmt(k)} – ${fmt(addDays(k, 6))}</span></h2>`;
  if (!n)
    h += `<p class="empty">Add your lectures for this week and the daily and weekly exams.</p><button class="btn primary2" data-a="gweek">Plan this week</button>`;
  else {
    h +=
      '<div class="wkrows">' +
      used
        .map((x) => {
          const l = LECBY[x.l];
          if (!l) return "";
          const st = stats([l]);
          const isToday = x.d === dow;
          return `<button class="wkrow${isToday ? " now" : ""}" style="--h:${hue(l.f)}" data-a="gweek"><span class="dot"></span><span class="wl"><b>${esc(l.l)}</b><small>${S.w[l.i] ? "● watched" : "○ not watched"} · ${st.l1}/${st.un} learned</small></span><span class="wd2">${x.d >= 0 ? DOW[x.d] : ""}${x.e ? " <i>✔ exam</i>" : ""}</span></button>`;
        })
        .join("") +
      "</div>";
    const toSat = 6 - dow;
    h += `<p class="wkfoot"><b>${ex}/${n}</b> daily exams done · ${xd === xn ? "weekly exam" + (xn > 1 ? "s" : "") + " done ✔" : toSat === 0 ? "<b>Weekly exam today</b>" : "Weekly exam on Saturday (" + toSat + " day" + (toSat > 1 ? "s" : "") + ")"}</p>`;
  }
  return h + "</section>";
}
function renderWeek() {
  const k = curWeek(),
    w = getWk(k),
    t = today(),
    now = wkOff === 0;
  const used = w.s.map((x) => (x ? LECBY[x.l] : null));
  let h = `<div class="syl"><div class="wk-head"><button class="icon" data-a="wkprev" aria-label="Previous week">‹</button><div><b>${fmt(k)} – ${fmt(addDays(k, 6))}</b><small>${now ? "This week" : wkOff < 0 ? Math.abs(wkOff) + " week(s) ago" : "In " + wkOff + " week(s)"}</small></div><button class="icon" data-a="wknext" aria-label="Next week">›</button>${now ? "" : '<button class="btn" data-a="wknow">This week</button>'}</div>`;
  h +=
    '<div class="days">' +
    DOW.map((n, i) => {
      const d = addDays(k, i);
      const dots = w.s
        .map((x, j) => (x && x.d === i && used[j] ? `<i style="--h:${hue(used[j].f)}"></i>` : ""))
        .join("");
      return `<div class="dp${d === t ? " now" : ""}${w.xs.some((x) => x.d === i) ? " sat" : ""}"><span>${n}</span><b>${new Date(d + "T00:00:00").getDate()}</b><em>${(() => {
        const xx = w.xs.filter((x) => x.d === i);
        return xx.length ? (xx.every((x) => x.e) ? "✔" : "Exam") : dots;
      })()}</em></div>`;
    }).join("") +
    "</div>";
  h += `<h2 class="plain">${w.s.filter(Boolean).length || w.s.length} lecture${w.s.length > 1 ? "s" : ""} this week<span>one daily exam each</span></h2><div class="slots">`;
  w.s.forEach((sl, i) => {
    const l = sl ? LECBY[sl.l] : null;
    if (!l) {
      h += `<button class="slot empty-slot" data-a="wkadd" data-i="${i}"><b>+</b><span>Add lecture ${i + 1}</span></button>`;
      return;
    }
    const st = stats([l]),
      p = st.un ? st.l1 / st.un : 0;
    h += `<article class="slot filled" style="--h:${hue(l.f)}"><div class="slot-top"><span class="num">${i + 1}</span><div class="slot-t"><b>${esc(l.l)}</b><small>${esc(l.sn)} · ${st.un} topics</small></div><button class="icon sm" data-a="wkdel" data-i="${i}" aria-label="Remove lecture">×</button></div>
    <div class="bar"><i style="width:${Math.round(p * 100)}%"></i></div><p class="sub">${st.l1}/${st.un} topics learned</p>
    <div class="slot-ctl"><button class="tg${S.w[l.i] ? " on" : ""}" data-a="watch" data-lid="${l.i}">${S.w[l.i] ? "✓ Watched" : "Watched?"}</button>
    <label class="sel"><span>Exam day</span><select data-a2="wkday" data-i="${i}"><option value="-1">Not set</option>${[0, 1, 2, 3, 4, 5].map((d) => `<option value="${d}"${sl.d === d ? " selected" : ""}>${DOW[d]}</option>`).join("")}</select></label></div>
    <div class="slot-ctl"><button class="tg${sl.e ? " on ok" : ""}" data-a="wkexam" data-i="${i}">${sl.e ? "✓ Daily exam done" : "Daily exam done?"}</button></div>
    <button class="link" data-a="wkopen" data-lid="${l.i}">Open topics →</button></article>`;
  });
  h += '</div><button class="btn addmore" data-a="wkmore">+ Add another lecture</button>';
  const n = w.s.filter(Boolean).length,
    ex = w.s.filter((x) => x && x.e).length;
  const covers = n
    ? "Covers: " +
      w.s
        .filter(Boolean)
        .map((x) => esc(LECBY[x.l].l))
        .join(" · ")
    : "Add your lectures first. A weekly exam covers all of them.";
  h += `<h2 class="plain">${w.xs.length} weekly exam${w.xs.length > 1 ? "s" : ""}<span>${ex}/${n} daily exams done</span></h2>`;
  w.xs.forEach((x, i) => {
    h += `<section class="card wx"><h2>Weekly exam ${w.xs.length > 1 ? i + 1 : ""}<span>${w.xs.length > 1 ? '<button class="icon sm" data-a="wkxdel" data-i="' + i + '" aria-label="Remove exam">×</button>' : ""}</span></h2>
   ${i === 0 ? '<p class="empty" style="margin-bottom:10px">' + covers + "</p>" : ""}
   <div class="slot-ctl"><button class="tg${x.e ? " on ok" : ""}" data-a="wkx" data-i="${i}">${x.e ? "✓ Weekly exam done" : "Weekly exam done?"}</button>
   <label class="sel"><span>Day</span><select data-a2="wkxday" data-i="${i}">${DOW.map((n2, d) => `<option value="${d}"${x.d === d ? " selected" : ""}>${n2}</option>`).join("")}</select></label></div></section>`;
  });
  h += '<button class="btn addmore" data-a="wkxmore">+ Add another weekly exam</button></div>';
  return h;
}
function openSheet(i) {
  sheetSlot = i;
  sheetF = "all";
  sheetQ = "";
  $("#sheetQ").value = "";
  $("#sheet").hidden = false;
  $("#sheetTitle").textContent = "Pick lecture " + (i + 1);
  renderSheet();
}
function closeSheet() {
  sheetSlot = null;
  $("#sheet").hidden = true;
}
function renderSheet() {
  if (sheetSlot === null) return;
  const w = getWk(curWeek()),
    inWeek = new Set(w.s.filter(Boolean).map((x) => x.l)),
    usedF = new Set(w.s.filter(Boolean).map((x) => LECBY[x.l] && LECBY[x.l].f));
  $("#sheetChips").innerHTML = [["all", "All"]]
    .concat(SUBJ.map((s) => [s.k, s.bn]))
    .map(
      (c) =>
        `<button class="chip${c[0] === "all" ? " all" : ""}" style="--h:${hue(c[0])}" data-a="sheetf" data-k="${c[0]}" aria-pressed="${sheetF === c[0]}">${c[0] !== "all" ? "<i></i>" : ""}${esc(c[1])}${usedF.has(c[0]) ? " ✓" : ""}</button>`,
    )
    .join("");
  const k = sheetQ.toLowerCase();
  const L = LEC.filter(
    (l) =>
      (sheetF === "all" || l.f === sheetF) &&
      (!k || l.l.toLowerCase().includes(k) || l.u.some((u) => u[3].toLowerCase().includes(k))),
  );
  $("#sheetList").innerHTML =
    L.map((l) => {
      const dis = inWeek.has(l.i),
        st = stats([l]);
      return `<button class="pickrow" style="--h:${hue(l.f)}" data-a="wkpick" data-lid="${l.i}"${dis ? " disabled" : ""}><span class="dot"></span><span><b>${esc(l.l)}</b><small>${esc(l.sn)} · ${st.un} topics${S.w[l.i] ? " · watched" : ""}${dis ? " · already this week" : ""}${!dis && usedF.has(l.f) ? " · same subject as another slot" : ""}</small></span></button>`;
    }).join("") || '<p class="empty">No lectures match.</p>';
}

function streak() {
  const t = today();
  let d = S.d.includes(t) ? t : addDays(t, -1),
    n = 0;
  while (S.d.includes(d)) {
    n++;
    d = addDays(d, -1);
  }
  return n;
}
function greet() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}
function miniRing(p) {
  const r = 15,
    c = 2 * Math.PI * r;
  return `<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="${r}" fill="none" stroke="var(--surface2)" stroke-width="5"/><circle cx="20" cy="20" r="${r}" fill="none" stroke="var(--c)" stroke-width="5" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - p)}" transform="rotate(-90 20 20)"/></svg>`;
}
function renderToday() {
  const A = stats(LEC),
    p = A.un ? A.l1 / A.un : 0,
    t = today();
  const ms = [0.1, 0.25, 0.5, 0.75, 1].find((m) => p < m);
  const mile = ms
    ? `${Math.ceil(ms * A.un) - A.l1} topics to the ${Math.round(ms * 100)}% milestone`
    : "Every topic learned. Keep revising.";
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = addDays(t, -i);
    days.push({
      d,
      on: S.d.includes(d),
      today: i === 0,
      l: new Date(d + "T00:00:00").toLocaleDateString("en-GB", { weekday: "narrow" }),
    });
  }
  const wk = days.filter((x) => x.on).length,
    st = streak();
  const last = S.d.length ? S.d[S.d.length - 1] : null,
    gap = last ? daysBetween(last, t) : null;
  const dl = dueList();
  const learnedToday = Object.values(S.s).filter((u) => u[0] >= 1 && u[1] === t && u[2] === 0).length;
  const watchedToday = Object.values(S.w).filter((v) => v === t).length;
  const plan = [
    {
      done: dl.length === 0,
      t: dl.length ? `Revise ${dl.length} topic${dl.length > 1 ? "s" : ""}` : "No revisions due",
      s: dl.length ? "Do these first, they take a few minutes" : "You are all caught up",
      c: "--due-c",
    },
    {
      done: learnedToday > 0,
      t: "Learn 1 new topic",
      s: learnedToday ? `${learnedToday} learned today` : "Recall it from memory, then mark ◐",
      c: "--learn-c",
    },
    {
      done: watchedToday > 0,
      t: "Watch 1 class",
      s: watchedToday ? `${watchedToday} watched today` : "Mark it watched when you finish",
      c: "--watch-c",
    },
  ];
  const pd = plan.filter((x) => x.done).length;
  let L = "",
    R = "";
  if (gap !== null && gap > 3)
    L += `<div class="banner"><b>Welcome back.</b> ${gap} days away is fine. Don't catch up: one revision and one topic is a complete day.</div>`;
  const nt = nextTask();
  const opts = [["all", "All subjects"]]
    .concat(SUBJ.map((s) => [s.k, s.bn + " · " + s.en]))
    .map((o) => `<option value="${o[0]}"${o[0] === focus ? " selected" : ""}>${esc(o[1])}</option>`)
    .join("");
  L +=
    '<section class="next' +
    (nt && nt.k === "rev" ? " rev" : nt && nt.k === "learn" ? " lrn" : "") +
    '"><div class="next-in">';
  if (!nt)
    L += `<span class="tag">UP NEXT</span><p class="what">Nothing left in this focus. Pick another subject.</p>`;
  else if (nt.k === "rev") {
    const u = UNIT[nt.id],
      l = LECOF[nt.id];
    L += `<span class="tag">⟳ REVISE FIRST</span><p class="what">${esc(u[3])}</p><p class="where">${esc(l.l)} · due ${nt.d < t ? "since " + fmt(nt.d) : "today"}</p><div class="row-btns"><button class="btn primary" data-a="rev" data-id="${nt.id}">Reviewed ✓</button><button class="btn ghost" data-a="forgot" data-id="${nt.id}">Forgot it</button></div>`;
  } else if (nt.k === "learn") {
    const u = UNIT[nt.id];
    L += `<span class="tag">LEARN NEXT</span><p class="what">${esc(u[3])}</p><p class="where">${esc(nt.l.l)} · watched, not learned yet</p><div class="row-btns"><button class="btn primary" data-a="stage" data-id="${nt.id}" data-st="1">I can recall it ◐</button><button class="btn ghost" data-a="open" data-lid="${nt.l.i}">Open lecture</button></div>`;
  } else
    L += `<span class="tag">▶ WATCH NEXT</span><p class="what">${esc(nt.l.l)}</p><p class="where">${nt.l.u.length} topics inside</p><div class="row-btns"><button class="btn primary" data-a="watch" data-lid="${nt.l.i}">Mark watched ✓</button><button class="btn ghost" data-a="open" data-lid="${nt.l.i}">See topics</button></div>`;
  L += `<label class="focus">Focus <select id="focus">${opts}</select></label></div></section>`;
  L += weekCard();
  R += `<section class="card prog"><div class="prog-top"><div class="ring">${ring(p)}<div class="num"><div>${Math.round(p * 100)}%<small>learned</small></div></div></div>
   <div class="tiles"><div class="tile"><b>${A.w}<i>/${A.lec}</i></b><span>Classes watched</span></div><div class="tile"><b>${A.l1}<i>/${A.un}</i></b><span>Topics learned ◐</span></div><div class="tile"><b>${A.l2}</b><span>Practiced ✔</span></div><div class="tile"><b>${st}<i> day${st === 1 ? "" : "s"}</i></b><span>Current streak</span></div></div></div>
   <p class="mile">${mile}</p>
   <div class="week" aria-label="Days studied in the last 7 days">${days.map((x) => `<div class="wd${x.on ? " on" : ""}${x.today ? " now" : ""}"><i>${x.on ? "✓" : ""}</i><span>${x.l}</span></div>`).join("")}</div></section>`;
  if (dl.length) {
    R += `<section class="card"><h2>Revision due<span>${dl.length + " topic" + (dl.length > 1 ? "s" : "")}</span></h2>`;
    {
      (showAllDue ? dl : dl.slice(0, 5)).forEach((x) => {
        const u = UNIT[x.id],
          l = LECOF[x.id];
        R += `<div class="due-item"><div><p>${esc(u[3])}</p><small>${esc(l.l)} · <span class="pill-due">${x.d < t ? "overdue" : "today"}</span></small></div><button class="btn" data-a="rev" data-id="${x.id}">Done ✓</button></div>`;
      });
      if (dl.length > 5)
        R += `<button class="btn" style="margin-top:8px" data-a="moredue">${showAllDue ? "Show fewer" : "Show all " + dl.length}</button>`;
    }
    R += "</section>";
  }
  R += '<section><h2 class="plain">Subjects<span>tap to open</span></h2><div class="sgrid">';
  SUBJ.forEach((s) => {
    const x = stats(LEC.filter((l) => l.f === s.k)),
      pp = x.un ? x.l1 / x.un : 0;
    R += `<button class="sc" style="--h:${hue(s.k)}" data-a="subj" data-k="${s.k}"><span class="mr">${miniRing(pp)}<b>${Math.round(pp * 100)}%</b></span><span class="sn"><b>${esc(s.bn)}</b><em>${esc(s.en)}</em><small>${x.w}/${x.lec} classes · ${x.l1}/${x.un} topics</small></span></button>`;
  });
  R += "</div></section>";
  return `<div class="hello"><div><h1>${greet()}, Nahid</h1><p>${wk} of 7 days studied this week</p></div></div><div class="cols"><div class="stack">${L}${R}</div></div>`;
}

function lecMatches(l) {
  if (filt !== "all" && l.f !== filt) return false;
  if (onlyOpen) {
    const done = l.u.every((u) => U(u[0])[0] >= 1);
    if (done && S.w[l.i]) return false;
  }
  if (q) {
    const k = q.toLowerCase();
    return l.l.toLowerCase().includes(k) || l.u.some((u) => u[3].toLowerCase().includes(k));
  }
  return true;
}
function topicHtml(u) {
  const us = U(u[0]),
    s = us[0],
    d = dueOf(us),
    t = today();
  let h = `<div class="t"><div class="t-main"><p>${u[1] !== "T" ? `<span class="tag2">${TYPE[u[1]]}</span>` : ""}${u[2] ? `<span class="tag2">${esc(u[2])}</span>` : ""}${esc(u[3])}</p><button class="st st${s}" data-a="pick" data-id="${u[0]}" aria-expanded="${pick === u[0]}"><span aria-hidden="true">${ST[s].s}</span>${ST[s].sh}</button></div>`;
  if (d) {
    const over = d <= t;
    h += `<div class="rv">${over ? `<span class="pill-due">${d < t ? "overdue" : "due today"}</span><button class="btn" data-a="rev" data-id="${u[0]}">Reviewed ✓</button><button class="btn warn" data-a="forgot" data-id="${u[0]}">Forgot</button>` : `<span>Next review ${fmt(d)}</span>`}</div>`;
  } else if (s >= 1 && us[2] >= 5) h += '<div class="rv"><span>✔ Revision cycle complete</span></div>';
  if (pick === u[0]) {
    h +=
      '<div class="pick" role="group" aria-label="Set status">' +
      ST.map(
        (x, i) =>
          `<button class="p${i}" data-a="stage" data-id="${u[0]}" data-st="${i}" aria-pressed="${s === i}"><b>${x.s}</b>${x.sh}</button>`,
      ).join("") +
      "</div>";
  }
  return h + "</div>";
}
function renderSyl() {
  const chips = SUBJ.map(
    (s) =>
      `<button class="chip" style="--h:${hue(s.k)}" data-a="filt" data-k="${s.k}" aria-pressed="${filt === s.k}"><i></i>${esc(s.bn)}</button>`,
  ).join("");
  return `<div class="syl"><div class="chips" role="group" aria-label="Subject"><button class="chip all" data-a="filt" data-k="all" aria-pressed="${filt === "all"}">All</button>${chips}</div>
  <div class="tools"><input type="search" id="q" placeholder="Search topics or lectures" value="${esc(q)}" aria-label="Search"><div class="seg"><button data-a="only" data-v="0" aria-pressed="${!onlyOpen}">All</button><button data-a="only" data-v="1" aria-pressed="${onlyOpen}">Unfinished</button></div></div><div id="list"></div></div>`;
}
function renderList() {
  const L = LEC.filter(lecMatches);
  let h = "";
  if (!L.length) h = '<p class="empty">No lectures match.</p>';
  L.forEach((l) => {
    const st = stats([l]),
      p = st.un ? st.l1 / st.un : 0,
      isOpen = open.has(l.i) || !!q;
    h += `<article class="lec" style="--h:${hue(l.f)}"><div class="lec-top"><button class="lec-head" data-a="toggle" data-lid="${l.i}" aria-expanded="${isOpen}"><b>${esc(l.l)}</b><span class="meta">${filt === "all" && (l.f === "WLV" || l.f === "REC") ? esc(l.sn) + " · " : ""}${st.l1}/${st.un} learned${barHtml(p)}</span></button>
    <div class="lec-act"><button class="watch" data-a="watch" data-lid="${l.i}" aria-pressed="${!!S.w[l.i]}"><span class="box" aria-hidden="true">✓</span>${S.w[l.i] ? "Watched" : "Watched?"}</button>
    <button class="watch pex" data-a="pexam" data-lid="${l.i}" aria-pressed="${!!(S.e && S.e[l.i])}"><span class="box" aria-hidden="true">✓</span>${S.e && S.e[l.i] ? "Exam done" : "Practice exam"}</button></div></div>`;
    if (isOpen) {
      const k = q.toLowerCase();
      const us = l.u.filter((u) => !q || l.l.toLowerCase().includes(k) || u[3].toLowerCase().includes(k));
      h += '<div class="topics">' + us.map(topicHtml).join("") + "</div>";
    }
    h += "</article>";
  });
  $("#list").innerHTML = h;
}
function render() {
  $("#tabToday").setAttribute("aria-current", tab === "today" ? "page" : "false");
  $("#tabSyl").setAttribute("aria-current", tab === "syl" ? "page" : "false");
  $("#tabWeek").setAttribute("aria-current", tab === "week" ? "page" : "false");
  $("#tabPlan").setAttribute("aria-current", tab === "plan" ? "page" : "false");
  const v = $("#view");
  if (tab === "today") {
    v.innerHTML = renderToday();
  } else if (tab === "week") {
    v.innerHTML = renderWeek();
  } else if (tab === "plan") {
    v.innerHTML = renderPlanner();
  } else {
    if (!$("#list")) {
      v.innerHTML = renderSyl();
    } else {
      document
        .querySelectorAll(".chip")
        .forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.k === filt)));
      document
        .querySelectorAll(".seg button")
        .forEach((b) => b.setAttribute("aria-pressed", String((b.dataset.v === "1") === onlyOpen)));
    }
    renderList();
  }
}

document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-a]");
  if (!b) return;
  const a = b.dataset.a;
  if (a === "gweek") {
    wkOff = 0;
    goTab("week");
    return;
  }
  if (a === "wkprev") {
    wkOff--;
    render();
    return;
  }
  if (a === "wknext") {
    wkOff++;
    render();
    return;
  }
  if (a === "wknow") {
    wkOff = 0;
    render();
    return;
  }
  if (a === "wkadd") {
    openSheet(+b.dataset.i);
    return;
  }
  if (a === "sheetclose") {
    closeSheet();
    return;
  }
  if (a === "sheetf") {
    sheetF = b.dataset.k;
    renderSheet();
    return;
  }
  if (a === "wkpick") {
    const k = curWeek(),
      w = getWk(k);
    w.s[sheetSlot] = { l: b.dataset.lid, d: -1, e: 0, sc: "" };
    closeSheet();
    putWk(k, w);
    return;
  }
  if (a === "wkdel") {
    const k = curWeek(),
      w = getWk(k),
      i = +b.dataset.i;
    if (i >= 4) w.s.splice(i, 1);
    else w.s[i] = null;
    putWk(k, w);
    return;
  }
  if (a === "wkmore") {
    const k = curWeek(),
      w = getWk(k);
    w.s.push(null);
    putWk(k, w);
    openSheet(w.s.length - 1);
    return;
  }
  if (a === "wkxmore") {
    const k = curWeek(),
      w = getWk(k);
    w.xs.push({ e: 0, sc: "", d: 6 });
    putWk(k, w);
    return;
  }
  if (a === "wkxdel") {
    const k = curWeek(),
      w = getWk(k);
    w.xs.splice(+b.dataset.i, 1);
    putWk(k, w);
    return;
  }
  if (a === "wkexam") {
    const k = curWeek(),
      w = getWk(k),
      sl = w.s[+b.dataset.i];
    sl.e = sl.e ? 0 : 1;
    putWk(k, w);
    return;
  }
  if (a === "wkx") {
    const k = curWeek(),
      w = getWk(k),
      x = w.xs[+b.dataset.i];
    x.e = x.e ? 0 : 1;
    putWk(k, w);
    return;
  }
  if (a === "wkopen") {
    const l = LECBY[b.dataset.lid];
    open.add(l.i);
    filt = l.f;
    q = "";
    onlyOpen = false;
    goTab("syl", () => {
      const el = document.querySelector(`[data-lid="${l.i}"][data-a="toggle"]`);
      if (el) el.scrollIntoView({ block: "center" });
    });
    return;
  }
  if (a === "rev") reviewed(b.dataset.id);
  else if (a === "forgot") forgot(b.dataset.id);
  else if (a === "stage") {
    const id = b.dataset.id;
    pick = null;
    setStage(id, +b.dataset.st);
  } else if (a === "watch") toggleWatch(b.dataset.lid);
  else if (a === "pexam") toggleExam(b.dataset.lid);
  else if (a === "moredue") {
    showAllDue = !showAllDue;
    render();
  } else if (a === "subj") {
    filt = b.dataset.k;
    q = "";
    goTab("syl");
  } else if (a === "open") {
    const lid = b.dataset.lid;
    open.add(lid);
    const l = LEC.find((x) => x.i === lid);
    filt = l.f;
    q = "";
    onlyOpen = false;
    goTab("syl", () => {
      const el = document.querySelector(`[data-lid="${lid}"][data-a="toggle"]`);
      if (el) el.scrollIntoView({ block: "center" });
    });
  } else if (a === "toggle") {
    const id = b.dataset.lid;
    open.has(id) ? open.delete(id) : open.add(id);
    pick = null;
    render();
  } else if (a === "pick") {
    pick = pick === b.dataset.id ? null : b.dataset.id;
    render();
  } else if (a === "filt") {
    filt = b.dataset.k;
    pick = null;
    render();
    window.scrollTo({ top: 0 });
  } else if (a === "only") {
    onlyOpen = b.dataset.v === "1";
    render();
  }
});
document.addEventListener("change", (e) => {
  if (e.target.id === "pf-t") {
    const v = e.target.value;
    $("#pf-tip").textContent = TIPS[v] || "";
    if (pEdit === "new") $("#pf-d").value = DDUR[v] || 60;
    bkUpd();
  }
});
document.addEventListener("input", (e) => {
  if (e.target.id === "pf-s" || e.target.id === "pf-d") bkUpd();
  if (e.target.id === "q") {
    q = e.target.value.trim();
    renderList();
  }
  if (e.target.id === "sheetQ") {
    sheetQ = e.target.value.trim();
    renderSheet();
  }
});
document.addEventListener("change", (e) => {
  const t = e.target;
  if (t.id === "focus") {
    focus = t.value;
    render();
    return;
  }
  const a = t.dataset.a2;
  if (!a) return;
  const k = curWeek(),
    w = getWk(k);
  if (a === "wkday") {
    w.s[+t.dataset.i].d = +t.value;
    putWk(k, w);
  } else if (a === "wksc") {
    w.s[+t.dataset.i].sc = t.value === "" ? "" : Math.max(0, Math.min(100, +t.value));
    putWk(k, w);
  } else if (a === "wkxsc") {
    w.xs[+t.dataset.i].sc = t.value === "" ? "" : Math.max(0, Math.min(100, +t.value));
    putWk(k, w);
  } else if (a === "wkxday") {
    w.xs[+t.dataset.i].d = +t.value;
    putWk(k, w);
  }
});
function goTab(t, cb) {
  tab = t;
  pick = null;
  render();
  if (cb) cb();
  else window.scrollTo({ top: 0 });
}
$("#tabToday").onclick = () => goTab("today");
$("#tabSyl").onclick = () => goTab("syl");
$("#tabWeek").onclick = () => goTab("week");
$("#tabPlan").onclick = () => goTab("plan");
$("#date").textContent = new Date().toLocaleDateString("en-GB", {
  weekday: "long",
  day: "numeric",
  month: "short",
});
