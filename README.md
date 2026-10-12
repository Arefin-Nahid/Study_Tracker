# Study Tracker

Study tracker, weekly plan and daily planner for the BCS preparation. Progress syncs across devices with Google sign-in.

**Live:** https://arefin-nahid.github.io/Study_Tracker/

## Features
- **Today:** what to watch or learn next, and this week's plan
- **Week:** lectures and exams for Sunday to Saturday
- **Planner:** prayers, daily schedule, focus timer, to-do and notes
- **Syllabus:** all 145 lectures and 530 topics

## Files (all in the repo root)
| File | Purpose |
|---|---|
| `index.html` | The whole app, including the Firebase settings |
| `study-tracker.webmanifest` | Install settings (name, icons) |
| `sw.js` | Service worker: install and offline support |
| `logo-32.png`, `logo-180.png`, `logo-192.png`, `logo-512.png`, `icon.svg` | App icons. All are required for install. |
| `check.html` | Optional install checker |
| `firestore.rules` | Database rules, paste in Firebase (not used by the site) |
| `.nojekyll` | Tells GitHub Pages to serve files as they are |

Do not keep `firebase-config.js`, `manifest.webmanifest` or other old files in the repo.

## Setup
1. Firebase: enable **Authentication, Google**, and create a **Firestore** database.
2. Firestore, Rules: paste `firestore.rules` and publish.
3. Authentication, Settings, Authorized domains: add `arefin-nahid.github.io`.
4. GitHub: Settings, Pages, deploy from branch `main` / root.

## Install as an app
Open the live link in Chrome, wait 10 seconds, then menu, **Install app** (phone) or the install icon in the address bar (laptop). If it does not work, open `/check.html` on the site: it shows which file is missing.

## Troubleshooting
- **Cannot be installed:** open `logo-512.png` on the live site. If it shows 404, upload the icon files.
- **Sign-in "unauthorized-domain":** add the domain in setup step 3.
- **Old version showing:** hard refresh (Ctrl+Shift+R).
