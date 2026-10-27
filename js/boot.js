// Event handlers for the planner, daily tagline, sync bridge and app start.
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-pa]");
  if (!b) return;
  const a = b.dataset.pa,
    d = getDay(pDate);
  if (a === "prev") {
    pDate = addDays(pDate, -1);
    render();
  } else if (a === "next") {
    pDate = addDays(pDate, 1);
    render();
  } else if (a === "now") {
    pDate = today();
    render();
  } else if (a === "pray") {
    const n = b.dataset.n;
    if (d.pr[n]) delete d.pr[n];
    else d.pr[n] = 1;
    putDay(pDate, d);
  } else if (a === "done") {
    const x = d.b.find((z) => z.id === b.dataset.id);
    if (x) {
      x.x = x.x ? 0 : 1;
      putDay(pDate, d);
    }
  } else if (a === "add") openBlock(null, b.dataset.s != null ? +b.dataset.s : undefined);
  else if (a === "ai") {
    aiRes = null;
    aiBusy = false;
    openPSheet(aiForm());
  } else if (a === "aiex") {
    const t = $("#ai-in");
    t.value = AI_EX[+b.dataset.i].t;
    t.focus();
  } else if (a === "aiback") {
    openPSheet(aiForm());
  } else if (a === "aigo") {
    if (aiBusy) return;
    const t = $("#ai-in").value.trim();
    aiKeep = $("#ai-keep").checked;
    if (t.length < 8) {
      $("#ai-in").focus();
      toast("Describe your day in a sentence or two");
      return;
    }
    aiText = t;
    aiBusy = true;
    openPSheet(aiForm());
    aiRun(t, aiKeep)
      .then((raw) => {
        aiRes = aiFit(raw, aiKeep);
        aiBusy = false;
        if (!$("#psheet").hidden) openPSheet(aiPreview());
      })
      .catch((e) => {
        aiBusy = false;
        if (!$("#psheet").hidden) openPSheet(aiForm(aiErr(e)));
      });
  } else if (a === "aiapply") {
    if (!aiRes) return;
    const dd = getDay(pDate);
    if (!aiKeep) dd.b = dd.b.filter((x) => x.x);
    dd.b = dd.b.concat(aiRes.blocks);
    dd.ai = { note: aiRes.note, tips: aiRes.tips };
    aiRes = null;
    closePSheet();
    putDay(pDate, dd);
    toast("Plan added to your schedule");
  } else if (a === "qadd") openBlock(null, undefined, b.dataset.v);
  else if (a === "pdur") {
    $("#pf-d").value = b.dataset.v;
    bkUpd();
  } else if (a === "dm" || a === "dp") {
    const el = $("#pf-d"),
      v = (+el.value || 0) + (a === "dp" ? 15 : -15);
    el.value = Math.max(5, Math.min(480, Math.round(v / 5) * 5));
    bkUpd();
  } else if (a === "edit") openBlock(b.dataset.id);
  else if (a === "set") openSettings();
  else if (a === "close") closePSheet();
  else if (a === "focus") startFocus(pDate, b.dataset.id);
  else if (a === "fpause") {
    if (FT) {
      if (FT.paused) {
        FT.end = Date.now() + FT.left;
        FT.paused = 0;
      } else {
        FT.left = ftLeft();
        FT.paused = 1;
      }
      saveFT();
      render();
    }
  } else if (a === "ffin") finishFocus(false);
  else if (a === "fstop") {
    FT = null;
    saveFT();
    render();
  } else if (a === "save") {
    const s = P24($("#pf-s").value),
      du = Math.max(5, Math.min(480, +$("#pf-d").value || 60)),
      t = $("#pf-t").value;
    if (s === null) {
      toast("Pick a start time");
      return;
    }
    const cf = getCfg(),
      hit = PRAY.find((n) => s < cf.pt[n] + PDUR[n] && s + du > cf.pt[n]);
    if (hit && !confirm("This block overlaps " + PNAME[hit] + " prayer time. Save anyway?")) return;
    const o = {
      id: pEdit === "new" ? uid() : pEdit,
      t,
      n: $("#pf-n").value.trim() || BT[t].n,
      s,
      d: Math.min(du, 1440 - s),
      x: 0,
    };
    if (pEdit === "new") d.b.push(o);
    else {
      const i = d.b.findIndex((z) => z.id === pEdit);
      if (i >= 0) {
        o.x = d.b[i].x;
        d.b[i] = o;
      }
    }
    closePSheet();
    putDay(pDate, d);
  } else if (a === "del") {
    d.b = d.b.filter((z) => z.id !== pEdit);
    closePSheet();
    putDay(pDate, d);
  } else if (a === "setsave") {
    saveSettings();
    closePSheet();
    render();
    toast("Prayer times saved");
  } else if (a === "setreset") {
    S.c = Object.assign({}, S.c || {}, { pt: Object.assign({}, PDEF) });
    commit();
    closePSheet();
    render();
    toast("Prayer times reset");
  } else if (a === "tgt") openTarget();
  else if (a === "tgtv") {
    $("#pt-goal").value = b.dataset.v;
  } else if (a === "tgtsave") {
    const g = +$("#pt-goal").value;
    S.c = Object.assign({}, S.c || {}, { goal: isFinite(g) && g > 0 ? Math.max(1, Math.min(14, g)) : 10 });
    commit();
    closePSheet();
    render();
  } else if (a === "clear") {
    if (confirm("Clear all blocks and prayer marks for this day?")) {
      closePSheet();
      d.b = [];
      d.pr = {};
      putDay(pDate, d);
    }
  }
});

const TAGS = [
  "Consistency beats intensity.",
  "Recall it, don't just reread it.",
  "Revise today, remember tomorrow.",
  "Start with the hardest topic.",
  "One focused hour beats three distracted.",
  "Sleep is part of studying.",
  "Test yourself before the exam does.",
  "Progress, not perfection.",
  "Small daily gains add up.",
  "Understand first, memorise second.",
  "Practice questions teach what notes can't.",
  "Plan the day, then follow the plan.",
  "Mistakes show you what to fix.",
  "Phone away, timer on.",
  "Spaced revision beats last-night cramming.",
  "Done is better than perfect.",
  "Write answers out; speed comes with practice.",
  "Rest well, return sharper.",
  "Every topic finished is one less to fear.",
  "Show up today, even for 30 minutes.",
];
{
  const el = document.getElementById("tagline");
  if (el) {
    const n = Math.floor(Date.now() / 864e5 - new Date().getTimezoneOffset() / 1440);
    el.textContent = TAGS[((n % TAGS.length) + TAGS.length) % TAGS.length];
  }
}

window.__bcs = {
  t: () => S.t,
  remote: (r) => {
    const b = S.t;
    adopt(r);
    if (S.t !== b) {
      try {
        localStorage.setItem(KEY, JSON.stringify({ v: 3, ...S }));
      } catch (e) {}
      render();
    }
  },
  push: () => {
    dirty = true;
    flush();
  },
  setRef: (r) => {
    ref = r;
  },
};
const loc = loadLocal();
if (loc) adopt(loc);
render();
initStore();
