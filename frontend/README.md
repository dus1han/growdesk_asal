# GrowDesk web

Next.js (App Router) frontend. See `../DEVELOPMENT_PLAN.md` for the full picture.

```bash
cp .env.example .env.local   # API_URL of the backend, default http://localhost:5080
npm install
npm run dev                  # http://localhost:3000
```

The browser only calls `/api/*` on this server; `next.config.ts` forwards those to the API, so the
session cookie is first-party and the API address never reaches the bundle.
