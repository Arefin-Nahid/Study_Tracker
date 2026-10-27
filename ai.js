// AI plan: Gemini through Firebase AI Logic (+ App Check). Loaded lazily on click.
/* ===== AI day planner (Gemini via Firebase AI Logic) ===== */
const AI_TYPES = ["class", "study", "revise", "practice", "exam", "news", "vocab", "other"];
let aiBusy = false,
  aiRes = null,
  aiText = "",
  aiKeep = true,
  aiAI = null;
const aiCfg = () =>
  Object.assign(
    { version: "13.1.0", models: ["gemini-3.8-flash", "gemini-3.5-flash-lite"] },
    window.AI_CONFIG || {},
  );
function aiForm(msg) {
  return `${bkHead("AI plan", esc(new Date(pDate + "T00:00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short" })))}
  <p class="hint">Describe your day in your own words. It plans around your prayer times, target and revision due. You review it before anything is saved.</p>
  <label class="fld"><span>Your instruction</span><textarea id="ai-in" rows="4" maxlength="800" placeholder="e.g. Class 3 to 5 PM. Polity and math first, mock exam in the evening.">${esc(aiText)}</textarea></label>
  <label class="chk"><input id="ai-keep" type="checkbox" ${aiKeep ? "checked" : ""}> Keep my existing blocks and plan around them</label>
  ${msg ? `<p class="aierr">${esc(msg)}</p>` : ""}
  <div class="plact"><button class="btn primary2" data-pa="aigo" ${aiBusy ? "disabled" : ""}>${aiBusy ? "Planning…" : "Generate plan"}</button></div>`;
}
function aiPreview() {
  const r = aiRes;
  return `${bkHead("Review plan", r.blocks.length + " blocks")}
  ${r.note ? `<p class="ptip">${esc(r.note)}</p>` : ""}
  <div class="aiw">${r.blocks.map((b) => `<div class="airow" style="--h:${BT[b.t].h}"><b>${T12(b.s).replace(" ", "")}</b><span>${DUR(b.d)}</span><div><strong>${esc(b.n)}</strong><small>${BT[b.t].n}</small></div></div>`).join("")}</div>
  ${r.tips.length ? `<details class="why"><summary>Instructions (${r.tips.length})</summary><ul>${r.tips.map((t) => `<li>${esc(t)}</li>`).join("")}</ul></details>` : ""}
  <p class="hint">${r.blocks.length} blocks · ${DUR(r.blocks.filter((b) => WORK.includes(b.t)).reduce((a, b) => a + b.d, 0))} of study${r.adj ? " · " + r.adj + " adjusted around prayers or overlaps" : ""}</p>
  <div class="plact"><button class="btn primary2" data-pa="aiapply">Apply to schedule</button><button class="btn" data-pa="aiback">Edit instruction</button></div>`;
}
function aiBuildPrompt(text, keep) {
  const cfg = getCfg(),
    d = getDay(pDate),
    isT = pDate === today();
  const lec = plannedIds()
    .map((id) => LECBY[id])
    .filter((l) => l && !S.w[l.i])
    .slice(0, 8)
    .map((l) => l.l);
  const ctx = {
    date: pDate,
    nowTime: isT ? T24(Math.ceil(nowMin() / 5) * 5) : null,
    studyTargetHours: cfg.goal,
    prayers: PRAY.map((n) => ({ name: PNAME[n], start: T24(cfg.pt[n]), minutes: PDUR[n] })),
    topicsDueForRevision: dueList().length,
    lecturesPlannedThisWeekNotYetWatched: lec,
    existingBlocks: keep
      ? d.b.map((x) => ({ type: x.t, title: x.n, start: T24(x.s), minutes: x.d, done: !!x.x }))
      : [],
  };
  return 'Student request:\n"""' + text + '"""\n\nContext (JSON):\n' + JSON.stringify(ctx);
}
const AI_SYS = `You are a study-planning assistant for a university graduate preparing for a competitive government job exam (BCS). Turn the student's request into a one-day schedule of blocks.
Rules:
- Obey the student's instructions first (fixed class times, subjects, hours, wake time).
- Use only these block types: class (class lecture), study (deep study of new material), revise (spaced revision), practice (question practice), exam (timed mock exam), news (newspaper and current affairs), vocab (new words and meanings), other.
- Default total study time is studyTargetHours unless the request says otherwise. If nowTime is given, plan only after it.
- Put the hardest new learning first when attention is highest. Deep-study blocks 60 to 90 minutes, practice and exam 45 to 90, news 30 to 45, vocab 15 to 25, revise 30 to 60. Put light tasks (news, vocab) after heavy ones. Aim for about 35% revise or practice or exam.
- Never schedule over a prayer window (prayer start plus its minutes) or over existingBlocks. Do not create meal or break blocks. Leave natural free gaps of 10 to 20 minutes between blocks.
- Times are 24-hour HH:MM between 05:00 and 23:00, minutes are multiples of 5. Give each block a short specific title (use the lecture names given when relevant, or the subject the student named).
- "note": one or two short sentences explaining the logic of the plan.
- "tips": 4 to 6 short, specific instructions for carrying out THIS plan well (what to do in the main blocks, how to review mistakes, when to take your own breaks, how to protect focus, how to close the day). Reference the actual subjects and blocks in the plan. Evidence-based (active recall, spaced repetition, timed practice, error log). One sentence each, no markdown.
Return JSON only.`;
async function aiGetModel(name, Schema, getAI, getGenerativeModel, GoogleAIBackend, app) {
  const schema = Schema.object({
    properties: {
      note: Schema.string(),
      blocks: Schema.array({
        items: Schema.object({
          properties: {
            type: Schema.string(),
            title: Schema.string(),
            start: Schema.string(),
            minutes: Schema.number(),
          },
        }),
      }),
      tips: Schema.array({ items: Schema.string() }),
    },
  });
  const ai = getAI(app, { backend: new GoogleAIBackend(), useLimitedUseAppCheckTokens: true });
  return getGenerativeModel(ai, {
    model: name,
    systemInstruction: AI_SYS,
    generationConfig: { responseMimeType: "application/json", responseSchema: schema, temperature: 0.4 },
  });
}
const AI_APPCHK = /app.?check|appcheck|recaptcha|401|unauthenticated|attestation|token/i;
function aiErr(e) {
  const m = String((e && e.message) || e);
  if (AI_APPCHK.test(m))
    return (
      "App Check could not verify this site. Check that the reCAPTCHA key allows " +
      location.hostname +
      " and that App Check is registered for the web app in the Firebase console, then reload and try again."
    );
  if (/quota|429|rate|exhaust/i.test(m))
    return "The free AI limit is used up for now. Try again later or add the blocks manually.";
  if (/403|permission|api key|not enabled|has not been used|disabled|API_KEY|forbidden/i.test(m))
    return "AI Logic is not enabled for this Firebase project yet. In the Firebase console open AI Logic, press Get started and choose the Gemini Developer API.";
  if (/network|fetch|failed to load|import|Load failed/i.test(m))
    return "Could not reach Gemini. Check your connection and try again.";
  if (/timeout/i.test(m)) return "The AI took too long. Try again.";
  return "AI could not plan this: " + m.slice(0, 140);
}
async function aiRun(text, keep) {
  if (!window.FIREBASE_CONFIG) throw new Error("API key not valid: firebase-config.js is missing");
  const C = aiCfg(),
    B = "https://www.gstatic.com/firebasejs/" + C.version + "/";
  if (!aiAI) {
    const [A, L, K] = await Promise.all([
      import(B + "firebase-app.js"),
      import(B + "firebase-ai.js"),
      window.APP_CHECK_SITE_KEY ? import(B + "firebase-app-check.js") : Promise.resolve(null),
    ]);
    const app =
      A.getApps().find((a) => a.name === "ai-plan") || A.initializeApp(window.FIREBASE_CONFIG, "ai-plan");
    if (K && !app.__ac) {
      try {
        K.initializeAppCheck(app, {
          provider: new K.ReCaptchaEnterpriseProvider(window.APP_CHECK_SITE_KEY),
          isTokenAutoRefreshEnabled: true,
        });
        app.__ac = 1;
      } catch (e) {
        if (!/already|exists/i.test(String(e && e.message))) throw e;
        app.__ac = 1;
      }
    }
    aiAI = { A, L, app };
  }
  let pref = null;
  try {
    pref = localStorage.getItem("st-ai-model");
  } catch (e) {}
  if (!C.models.includes(pref)) pref = null;
  const list = (pref ? [pref] : []).concat(C.models.filter((x) => x !== pref));
  let last = null;
  for (const name of list) {
    try {
      const m = await aiGetModel(
        name,
        aiAI.L.Schema,
        aiAI.L.getAI,
        aiAI.L.getGenerativeModel,
        aiAI.L.GoogleAIBackend,
        aiAI.app,
      );
      const res = await Promise.race([
        m.generateContent(aiBuildPrompt(text, keep)),
        new Promise((_, rj) => setTimeout(() => rj(new Error("timeout")), 45000)),
      ]);
      try {
        localStorage.setItem("st-ai-model", name);
      } catch (e) {}
      return res.response.text();
    } catch (e) {
      last = e;
      const msg = String((e && e.message) || e);
      const retryable =
        !AI_APPCHK.test(msg) &&
        /404|not found|not supported|unsupported|model|quota|429|rate|exhaust|timeout|503|overloaded|unavailable/i.test(
          msg,
        );
      if (!retryable) throw e;
    }
  }
  throw last || new Error("No model available");
}
function aiFit(raw, keep) {
  let j;
  try {
    j = JSON.parse(
      String(raw)
        .replace(/^```(?:json)?|```$/g, "")
        .trim(),
    );
  } catch (e) {
    throw new Error("The AI reply was not valid JSON");
  }
  const cfg = getCfg(),
    d = getDay(pDate);
  const fixed = PRAY.map((n) => ({ s: cfg.pt[n], e: cfg.pt[n] + PDUR[n] })).concat(
    d.b.filter((x) => keep || x.x).map((x) => ({ s: x.s, e: x.s + x.d })),
  );
  const list = (Array.isArray(j.blocks) ? j.blocks : [])
    .map((b) => ({
      t: AI_TYPES.includes(b.type) ? b.type : null,
      n: String(b.title || "")
        .trim()
        .slice(0, 80),
      s: P24(String(b.start || "")),
      d: Math.round((+b.minutes || 0) / 5) * 5,
    }))
    .filter((b) => b.t && b.s !== null && b.d >= 15)
    .sort((a, b) => a.s - b.s);
  const placed = [];
  let adj = 0;
  for (const b0 of list) {
    let s0 = b0.s,
      dd = Math.min(b0.d, 240),
      moved = false;
    for (let k = 0; k < 12; k++) {
      const hit = fixed.concat(placed).find((f) => s0 < f.e && s0 + dd > f.s);
      if (!hit) break;
      moved = true;
      if (s0 < hit.s && hit.s - s0 >= 30) dd = Math.floor((hit.s - s0) / 5) * 5;
      else s0 = hit.e;
    }
    s0 = Math.max(300, s0);
    if (s0 + dd > 1410 || dd < 15) continue;
    if (moved || s0 !== b0.s || dd !== b0.d) adj++;
    placed.push({ s: s0, e: s0 + dd, id: uid(), t: b0.t, n: b0.n || BT[b0.t].n, d: dd, x: 0 });
  }
  placed.sort((a, b) => a.s - b.s);
  if (!placed.length) throw new Error("The AI returned no usable blocks. Try rewording your instruction.");
  return {
    blocks: placed.map(({ s, t, n, d, id, x }) => ({ id, t, n, s, d, x })),
    note: String(j.note || "").slice(0, 240),
    tips: (Array.isArray(j.tips) ? j.tips : [])
      .map((t) => String(t).trim().slice(0, 220))
      .filter(Boolean)
      .slice(0, 6),
    adj,
  };
}
