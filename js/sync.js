// Firebase sync: Google sign-in + one Firestore document per user (users/<uid>).
const btn = document.getElementById("acct");
const cfg = window.FIREBASE_CONFIG;
if (cfg && cfg.apiKey && !String(cfg.apiKey).startsWith("PASTE")) {
  const V = "10.12.2",
    B = "https://www.gstatic.com/firebasejs/" + V + "/";
  try {
    const [{ initializeApp }, A, F] = await Promise.all([
      import(B + "firebase-app.js"),
      import(B + "firebase-auth.js"),
      import(B + "firebase-firestore.js"),
    ]);
    const app = initializeApp(cfg),
      auth = A.getAuth(app);
    const db = F.initializeFirestore(app, { localCache: F.persistentLocalCache() });
    let unsub = null;
    const menu = document.createElement("div");
    menu.className = "amenu";
    menu.hidden = true;
    document.body.appendChild(menu);
    const ini = (u) => ((u.displayName || u.email || "?").trim()[0] || "?").toUpperCase();
    const avatar = (u) =>
      u.photoURL ? `<img src="${u.photoURL}" alt="" referrerpolicy="no-referrer">` : ini(u);
    const esc2 = (t) =>
      String(t || "").replace(
        /[&<>"]/g,
        (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
      );
    const USER =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="8" r="3.6"/><path d="M4.5 20c.9-3.6 3.9-5.4 7.5-5.4s6.6 1.8 7.5 5.4"/></svg>';
    const paint = (user, off) => {
      btn.hidden = false;
      btn.classList.toggle("off", !!off);
      btn.classList.toggle("in", !!user);
      btn.innerHTML = user
        ? `<span class="av">${avatar(user)}</span><span class="dot2"></span>`
        : USER + "Sign in";
      btn.title = user ? user.displayName || user.email || "Account" : "Sign in with Google to sync";
      btn.setAttribute("aria-label", user ? "Account menu" : "Sign in with Google");
      menu.innerHTML = user
        ? `<div class="who"><span class="av">${avatar(user)}</span><div style="min-width:0"><b>${esc2(user.displayName || "Signed in")}</b><small>${esc2(user.email)}</small></div></div><div class="sync${off ? " off" : ""}"><i></i>${off ? "Offline. Changes sync when you reconnect." : "Synced across your devices"}</div><button class="out" type="button" id="signout">Sign out</button>`
        : "";
      const so = menu.querySelector("#signout");
      if (so)
        so.onclick = () => {
          menu.hidden = true;
          A.signOut(auth);
        };
      if (!user) menu.hidden = true;
    };
    document.addEventListener("click", (e) => {
      if (!menu.hidden && !menu.contains(e.target) && !btn.contains(e.target)) menu.hidden = true;
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") menu.hidden = true;
    });
    btn.onclick = async () => {
      if (auth.currentUser) {
        menu.hidden = !menu.hidden;
        return;
      }
      const p = new A.GoogleAuthProvider();
      try {
        await A.signInWithPopup(auth, p);
      } catch (e) {
        if (["auth/popup-blocked", "auth/operation-not-supported-in-this-environment"].includes(e.code))
          A.signInWithRedirect(auth, p);
        else if (e.code !== "auth/popup-closed-by-user" && e.code !== "auth/cancelled-popup-request")
          alert("Sign-in failed: " + (e.code || e.message));
      }
    };
    A.onAuthStateChanged(auth, (user) => {
      if (unsub) {
        unsub();
        unsub = null;
      }
      window.__bcs.setRef(null);
      paint(user, false);
      if (!user) return;
      const ref = F.doc(db, "users", user.uid);
      window.__bcs.setRef({ set: (d) => F.setDoc(ref, d) });
      unsub = F.onSnapshot(
        ref,
        (snap) => {
          paint(user, snap.metadata.fromCache && !snap.metadata.hasPendingWrites && !navigator.onLine);
          if (snap.metadata.hasPendingWrites) return;
          const mine = window.__bcs.t();
          if (snap.exists()) {
            const r = snap.data();
            if ((r.t || 0) > mine) window.__bcs.remote(r);
            else if ((r.t || 0) < mine) window.__bcs.push();
          } else if (mine) window.__bcs.push();
        },
        () => paint(user, true),
      );
    });
    addEventListener("online", () => auth.currentUser && paint(auth.currentUser, false));
    addEventListener("offline", () => auth.currentUser && paint(auth.currentUser, true));
  } catch (e) {
    console.warn("Sync unavailable", e);
  }
}
