# BCS Tracker: GitHub Pages + Firebase sync

Files: index.html (the app), firebase-config.js (YOU edit this), manifest.webmanifest + icon.svg (home-screen install), firestore.rules (database security), .nojekyll.

## Part A: Firebase (free, ~5 min)
1. Open https://console.firebase.google.com and sign in with Google. Click "Create a project", name it (e.g. bcs-tracker). Turn Google Analytics off. Create.
2. Left menu: Build > Authentication > Get started > Sign-in method > Google > Enable > pick your support email > Save.
3. Left menu: Build > Firestore Database > Create database > Standard edition > location: asia-south1 (Mumbai) or nearest > Start in PRODUCTION mode > Create.
4. Firestore > Rules tab: delete everything, paste the contents of firestore.rules, click Publish.
5. Project settings (gear icon) > General > "Your apps" > click the web icon </> > nickname "bcs-tracker" > Register app (no hosting). Copy the firebaseConfig values it shows.
6. Open firebase-config.js and replace every PASTE_... value with yours. Save.

## Part B: GitHub Pages (free, ~3 min)
1. https://github.com > New repository > name: bcs-tracker > Public > Create.
2. "uploading an existing file" > drag ALL files from this folder (index.html, firebase-config.js, manifest.webmanifest, icon.svg, .nojekyll, README.md, firestore.rules) > Commit changes.
3. Repository Settings > Pages > Source: "Deploy from a branch" > Branch: main, folder / (root) > Save.
4. After ~1 minute your site is at https://YOUR-USERNAME.github.io/bcs-tracker/

## Part C: Allow your site to sign in (important)
Firebase console > Authentication > Settings > Authorized domains > Add domain: YOUR-USERNAME.github.io (no https, no path). Without this, Google sign-in fails with "auth/unauthorized-domain".

## Part D: Use it
1. Open your GitHub Pages link on the laptop > tap "Sign in" (top right) > choose your Google account.
2. Do the same on your phone, same Google account. Changes on one device appear on the other within a few seconds.
3. Phone: browser menu > "Add to Home screen" for an app-like icon.
4. Your existing progress in this browser is uploaded on first sign-in (newest copy wins).

## Notes
- The apiKey in firebase-config.js is not a secret; your data is protected by firestore.rules (only you can read/write your own document). Keep the repo public or private, both work.
- Offline: it keeps working offline and syncs when you are back online.
- Sign out: tap your initial in the top right.
- If config is left as PASTE..., the app still works but saves only in that browser.
