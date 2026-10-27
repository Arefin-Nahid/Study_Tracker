# Study Tracker

Syllabus tracker, weekly plan and daily planner for BCS preparation. Progress syncs across devices with Google sign-in.

**Live:** https://arefin-nahid.github.io/Study_Tracker/

## Features
- **Today:** what to learn next, revision due, this week's plan
- **Week:** lectures and exams, Sunday to Saturday
- **Planner:** five prayers, your own schedule blocks, focus timer, and an **AI plan** that builds a day from your instruction
- **Syllabus:** 145 lectures, 530 topics, with revision stages

## Structure
```
index.html                 page layout
sw.js                      install and offline support
study-tracker.webmanifest  install settings
css/styles.css             all styling
js/
  data.js                  lecture and topic data
  app.js                   core app: storage, Today, Week, Syllabus
  planner.js               Planner tab and block editor
  ai.js                    AI plan (Gemini via Firebase AI Logic)
  boot.js                  planner click handlers and app start
  sync.js                  Google sign-in and Firestore sync
config/firebase-config.js  Firebase, AI model and App Check settings
icons/                     logo-32/180/192/512.png, icon.svg (all needed to install)
firebase/firestore.rules   database rules to paste in Firebase
.nojekyll                  serve files as they are
```
`index.html`, `sw.js` and the manifest stay in the root so install and offline work. Scripts load in this order: `data`, `app`, `planner`, `ai`, `boot`. Keep that order.

## Setup
1. **Firebase:** enable Authentication (Google) and create a Firestore database.
2. **Rules:** paste `firebase/firestore.rules` in Firestore, Rules, and publish.
3. **Domain:** Authentication, Settings, Authorized domains, add `arefin-nahid.github.io`.
4. **AI plan:** Firebase console, AI Services, AI Logic, Get started, choose the Gemini Developer API.
5. **App Check:** register the web app with reCAPTCHA Enterprise, allow your domain, and set the site key in `config/firebase-config.js` (`APP_CHECK_SITE_KEY`).
6. **GitHub:** Settings, Pages, deploy from branch `main` / root.

## Notes
- Update: replace files, commit, then hard refresh. Reopen the installed app once.
- Model names are set in `config/firebase-config.js` (`AI_CONFIG.models`). Change them if Google retires one.
- The Firebase and reCAPTCHA site keys are public by design. Never commit a reCAPTCHA secret key.
- Opening `index.html` from your computer will not sign in; use the live site.
