<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# DsCinema — Agent Instructions

## Commands
- `npm run dev` — dev server (Next.js 16.2.6)
- `npm run build` — production build
- `npm run lint` — ESLint (flat config, `eslint.config.mjs`)
- `npm run seed` — seed `db.json` into KV / ensure local defaults (`npx tsx scripts/seed.ts`)
- `npm run dev:all` — seed + dev (run this first-time)

## Architecture
- **App Router** with `app/` directory — pages are `app/*/page.tsx`
- **Data layer**: auto-detects Vercel KV (env `KV_URL`) vs local `db.json`. `app/lib/db.ts` is the entrypoint; `app/lib/kv.ts` re-exports it. No migrations.
- **Client state**: `@tanstack/react-query` with hooks in `app/hooks/` (`useFilms`, `useWinners`, `useRoulette`, `usePatchNotes`). `app/providers.tsx` wraps `QueryClientProvider` (10s staleTime, 1 retry, no refetch on focus).
- **Auth**: no backend auth. User identity stored in `localStorage` key `"me"`. Four hardcoded users: `dzhebra`, `artem`, `andrey`, `misha`.
- **Host routes**: `/host` (dashboard), `/host/winners`. Member routes: `/member/[id]`, `/member/[id]/winners`.

## Notable conventions
- `app/services/api.ts` is the client-side API facade — all fetch calls go through it.
- API routes live in `app/api/` (films, winners, roulette, patch-notes, search-movie, movie-detail, search-watch).
- `search-movie` and `movie-detail` require `KINOPOISK_API_KEY` in `.env.local`. Already present.
- `search-watch` searches Kinopoisk, RuTube, VK Video for watch links.
- UI is in **Russian**. All labels, messages, comments are in Russian.
- Tailwind CSS v4 with `@tailwindcss/postcss` (not v3). No `tailwind.config`.
- CSS Modules for component styles (`*.module.css`).
- Path alias `@/*` maps to project root.
- Only 6 npm packages: next, react, react-dom, react-icons, @tanstack/react-query, @vercel/kv. No UI library, no Prisma, no ORM.

## Things to know
- No test suite or CI/CD present.
- No opencode.json config — the system prompt from `AGENTS.md` is the only instruction.
- `.gitignore` excludes `*.md` files (but `AGENTS.md` and `CLAUDE.md` are tracked).
