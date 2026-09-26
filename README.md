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

Signup verification and password reset emails use Gmail SMTP. Create a dedicated Gmail account for ReadRoom, turn on 2-Step Verification, and generate an [App Password](https://myaccount.google.com/apppasswords). Set `SMTP_USER`, `SMTP_PASS`, and `EMAIL_FROM` in `.env` and in the Vercel project. Codes are sent to the address the user registered with; the visible sender is `ReadRoom <your-gmail>`.

## CI/CD

GitHub Actions runs **Test → Build → Deploy PRD**.

- Feature work goes on `feature/*`, `fix/*`, or `refactor/*` branches and a pull request to `master`.
- Test runs lint, typecheck, unit tests, Prisma schema checks, and Playwright smoke tests.
- Build compiles the app only after Test passes.
- **Deploy PRD** never runs on pull requests, feature branches, or automatic pushes to `master`. After merge, open **Actions → CI/CD → Run workflow** on `master`. That run executes Test → Build → Deploy PRD. The `production` environment is an extra approval gate if you enable required reviewers.

Required GitHub secrets for production deploys: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`. Review-email secrets: `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`.

## Production (Vercel + Neon)

Production uses a free Neon Postgres database. Local development still uses SQLite. The Vercel build runs `prisma migrate deploy` against `prisma/prod/schema.prisma`. The live app is at https://readroom-gamma.vercel.app — `readroom.vercel.app` is a different project.
