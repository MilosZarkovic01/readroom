# ReadRoom

A personal book library: sign in, keep three shelves (want to read, currently reading, read), rate books 1–5 stars, and discover titles via [Open Library](https://openlibrary.org/dev/docs/api/search).

## Setup

```bash
npm install
cp .env.example .env
docker compose up -d
```

Set `AUTH_SECRET` in `.env` to a long random string. Apply the schema, then start the app:

```bash
npx prisma migrate deploy
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), create an account, then search by title or author.

## Production (Vercel + Neon)

The app deploys on Vercel with a free [Neon](https://neon.tech) Postgres database. The Hobby project `readroom` is linked to this GitHub repo. Neon injects `DATABASE_URL` (pooled) and `DATABASE_URL_UNPOOLED` (migrations). The `build` script runs `prisma migrate deploy` before `next build`.
