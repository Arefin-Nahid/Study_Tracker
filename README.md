# BCS Tracker

A study tracker for the BCS Pioneer Batch syllabus. It tracks lectures, topics, weekly plans and exams, and syncs across devices.

**Live:** https://arefin-nahid.github.io/Study_Tracker/

## Features
- **Today:** what to watch or learn next, and this week's plan
- **Week:** add your lectures and weekly exams (Sunday to Saturday)
- **Syllabus:** all 145 lectures and 530 topics
- **Sync:** sign in with Google and progress follows you across your phone and laptop

## Files
| File | Purpose |
|---|---|
| `index.html` | The whole app, including the Firebase settings |
| `manifest.webmanifest`, `icon.svg` | Home-screen install |
| `.nojekyll` | Tells GitHub Pages to serve files as they are |

## Setup
1. Firebase: turn on **Authentication → Google** and create a **Firestore** database.
2. Firestore → Rules, paste and publish:
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{uid} {
         allow read, write: if request.auth != null && request.auth.uid == uid;
       }
     }
   }
   ```
3. Authentication → Settings → Authorized domains → add `arefin-nahid.github.io`.
4. GitHub: Settings → Pages → Deploy from branch `main` / root.

## Use
Open the link, tap **Sign in**, and use the same Google account on every device. On a phone, choose "Add to Home screen".

## Troubleshooting
- **Sign-in fails with "unauthorized-domain":** add the domain in step 3.
- **Changes don't save:** check that the rules in step 2 are published.
- **Old version showing:** hard refresh (Ctrl+Shift+R).
