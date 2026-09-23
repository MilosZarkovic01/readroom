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

Open [http://localhost:3000](http://localhost:3000), create an account, then search by title or author.

## Production (Vercel + Neon)

Production uses a free Neon Postgres database. Local development still uses SQLite. The Vercel build runs `prisma migrate deploy` against `prisma/prod/schema.prisma`. The live app is at https://readroom-gamma.vercel.app — `readroom.vercel.app` is a different project.
