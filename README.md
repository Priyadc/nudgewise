# ◉ Nudgewise — tasks, reminders & money in one app

Nudgewise is a full-stack productivity app: to-do lists, reminders, bills and expense tracking,
with voice input, photo attachments, shared lists, push notifications, and light/dark themes.

**Stack:** Next.js 15 (App Router, JavaScript) · React 19 · MongoDB Atlas + Mongoose · NextAuth (email/password + Google) ·
Cloudinary (images) · Web Push (VAPID) · Nodemailer (email) · Framer Motion · Lucide icons · plain CSS design system.

---

## 1. Run it on your computer

```bash
# Node.js 18.18+ (20 LTS recommended)
npm install
cp .env.example .env.local      # then fill in the values (see section 2)
npm run dev                     # http://localhost:3000
```

Minimum to start: `MONGODB_URI`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`.
Everything else (Google, images, push, email) is optional and switches on when its keys are present.

## 2. Get your keys (all free tiers)

| Service | What for | Where |
|---|---|---|
| **MongoDB Atlas** | Database | atlas.mongodb.com → create free M0 cluster → Database Access (user) → Network Access → add `0.0.0.0/0` → Connect → Drivers → copy URI into `MONGODB_URI` (add `/nudgewise` before `?`) |
| **NextAuth secret** | Signs login sessions | `openssl rand -base64 32` → `NEXTAUTH_SECRET` |
| **Google OAuth** | "Continue with Google" | console.cloud.google.com → APIs & Services → OAuth consent screen (External) → Credentials → OAuth client ID (Web). Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google` and `https://YOUR-APP.vercel.app/api/auth/callback/google` |
| **Cloudinary** | Task photos, receipts, avatars | cloudinary.com → Dashboard → copy cloud name, API key, API secret |
| **VAPID keys** | Push notifications | `npm run vapid` → public key → `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, private → `VAPID_PRIVATE_KEY` |
| **Gmail SMTP** | Email reminders, password reset, invites | Google Account → Security → 2-Step Verification on → App passwords → create one → `SMTP_USER` = your Gmail, `SMTP_PASS` = the app password |
| **CRON_SECRET** | Protects the reminder endpoint | any long random string |

## 3. Deploy to Vercel

1. Push this folder to a GitHub repository.
2. vercel.com → **Add New Project** → import the repo (framework auto-detected as Next.js).
3. Add every variable from `.env.local` under **Settings → Environment Variables**. Set
   `NEXTAUTH_URL` and `NEXT_PUBLIC_APP_URL` to your production URL (e.g. `https://nudgewise-priya.vercel.app`).
4. Deploy. Then add the production callback URL in Google Cloud (see table above).
5. **Reminder scheduler (important).** Vercel's free Hobby plan only runs cron jobs once a day
   (`vercel.json` includes a daily backup run). For on-time reminders, create a free job at
   **cron-job.org**:
   - URL: `https://YOUR-APP.vercel.app/api/cron/reminders`
   - Schedule: every 1 minute · Method: POST
   - Header: `Authorization: Bearer YOUR_CRON_SECRET`

   (Alternatively use the GitHub Action in `.github/workflows/reminders.yml`, every 5 minutes.)
   In-app reminders also fire whenever the app is open, even without a scheduler.

## 4. Install on your phone

Open your Vercel URL → Android Chrome: menu → **Install app**. iPhone Safari: Share → **Add to Home Screen**
(required on iOS for push notifications). Then Settings → Notifications → turn on push.

## 5. Project structure

```
src/
  app/
    (auth)/login, register, forgot-password, reset-password
    (app)/dashboard, tasks, reminders, finance, settings   ← signed-in pages
    share/[token]                                          ← join a shared list
    api/                                                   ← REST API (route handlers)
  components/  layout · tasks · finance · ui · auth · landing
  hooks/       useApi, useSpeech (voice-to-text)
  lib/         auth, db, validators (zod), access control, reminders, notify, nlp, recurrence
  models/      User, List, Task, Reminder, Transaction, Budget, Bill, Notification, PushSubscription
public/        manifest.json, sw.js (push + offline), icons
```

## 6. Keyboard & power-user tips

- `N` or `Ctrl/⌘ + K` → quick add (task, reminder or money)
- Natural language: `Pay rent tomorrow 9am !high #home every month @Personal`
- Money by voice: "spent 250 on Swiggy", "got salary 45000"

## Security notes

Passwords hashed with bcrypt (12 rounds) · JWT sessions (httpOnly cookies) · every API validates input with zod
and checks ownership / list roles · images uploaded directly to Cloudinary with server signatures ·
reset tokens stored hashed with 30-minute expiry · security headers set in `next.config.mjs`.
