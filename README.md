# ReadRoom

A personal book library: sign in, keep three shelves (want to read, currently reading, read), rate books 1–5 stars, and discover titles via [Open Library](https://openlibrary.org/dev/docs/api/search).

## Setup

```bash
npm install
cp .env.example .env
```

Set `AUTH_SECRET` in `.env` to a long random string. `DATABASE_URL` can stay as `file:./dev.db` for local SQLite.

```bash
npx prisma migrate dev --name init
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), create an account, verify the email code, then search by title or author.

Optional Google sign-in uses `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET`. In Google Cloud, create separate OAuth clients for Production and Preview and set those variables on the matching Vercel environment. Authorized redirect URI: `https://<host>/api/auth/callback/google` (Production: `https://readroom-gamma.vercel.app/api/auth/callback/google`). The Continue with Google button stays hidden until both variables are set.

Signup verification and password reset emails use Gmail SMTP. Create a dedicated Gmail account for ReadRoom, turn on 2-Step Verification, and generate an [App Password](https://myaccount.google.com/apppasswords). Set `SMTP_USER`, `SMTP_PASS`, and `EMAIL_FROM` in `.env` and in the Vercel project. Codes are sent to the address the user registered with; the visible sender is `ReadRoom <your-gmail>`.

## CI/CD

GitHub Actions runs **Test → Build → Deploy PRD**.

- Feature work goes on `feature/*`, `fix/*`, or `refactor/*` branches and a pull request to `master`.
- Test runs lint, typecheck, unit tests, Prisma schema checks, and Playwright smoke tests.
- Build compiles the app only after Test passes.
- **Deploy PRD** is a separate workflow. It never runs on pull requests, feature branches, or automatic pushes to `master`. After Test and Build are green on `master`, open **Actions → Deploy PRD → Run workflow** and select the `master` branch. That run executes Test → Build → Deploy PRD.

Required GitHub secrets for production deploys: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`. Review-email secrets: `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`.

## Production (Vercel + Neon)

Production uses a free Neon Postgres database. Local development still uses SQLite. The Vercel build runs `prisma migrate deploy` against `prisma/prod/schema.prisma`. The live app is at https://readroom-gamma.vercel.app — `readroom.vercel.app` is a different project.

## Preview / STG (Vercel Preview)

Pull-request previews are a separate STG environment. They must not use Production `DATABASE_URL`, SMTP, or `AUTH_SECRET`.

| Service | Production | Preview / STG |
| --- | --- | --- |
| Database | Neon branch `main` | Neon schema-only branch `stg` |
| Auth secret | Production `AUTH_SECRET` | Preview-only `AUTH_SECRET` |
| Email | Production Gmail SMTP | Ethereal SMTP (`smtp.ethereal.email`) |
| Book search / covers | Public Open Library (no key) | Same public API |

Vercel Preview variables include `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `AUTH_SECRET`, `AUTH_TRUST_HOST`, `SMTP_*`, `EMAIL_FROM`, and `READROOM_ENV=stg`. Open Library has no credentials. Unused `RESEND_API_KEY` is not set on Preview.

STG verification emails are captured by Ethereal, not delivered to a real inbox. After signup, the Preview verify screen shows an **Open the STG verification email** link. Production still sends through Gmail SMTP to the user’s address.
