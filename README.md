# Study Tracker

Syllabus tracker, weekly plan and daily planner for BCS preparation. Progress syncs across devices with Google sign-in.

**Live:** https://arefin-nahid.github.io/Study_Tracker/

## Features
- **Today:** what to learn next, revision due, this week's plan
- **Week:** lectures and exams, Sunday to Saturday
- **Planner:** five prayers, your own schedule blocks, focus timer, and an **AI plan** that builds a day from your instruction
- **Syllabus:** 145 lectures, 530 topics, with revision stages

## Files (repo root)
| File | Purpose |
|---|---|
| `index.html` | Page layout and script links |
| `styles.css` | All styling |
| `data.js` | Lecture and topic data |
| `app.js` | Core app: storage, Today, Week, Syllabus |
| `planner.js` | Planner tab and block editor |
| `ai.js` | AI plan (Gemini through Firebase AI Logic) |
| `boot.js` | Planner click handlers and app start |
| `sync.js` | Google sign-in and Firestore sync |
| `firebase-config.js` | Firebase, AI model and App Check settings |
| `sw.js`, `study-tracker.webmanifest` | Install and offline support |
| `logo-32/180/192/512.png`, `icon.svg` | App icons (all needed to install) |
| `firestore.rules` | Database rules to paste in Firebase |
| `.nojekyll` | Serve files as they are |

Scripts load in this order: `data`, `app`, `planner`, `ai`, `boot`. Keep that order.

## Setup
1. **Firebase:** enable Authentication (Google) and create a Firestore database.
2. **Rules:** paste `firestore.rules` in Firestore, Rules, and publish.
3. **Domain:** Authentication, Settings, Authorized domains, add `arefin-nahid.github.io`.
4. **AI plan:** Firebase console, AI Services, AI Logic, Get started, choose the Gemini Developer API.
5. **App Check:** register the web app with reCAPTCHA Enterprise, allow your domain, and set the site key in `firebase-config.js` (`APP_CHECK_SITE_KEY`).
6. **GitHub:** Settings, Pages, deploy from branch `main` / root.
