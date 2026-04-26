# Linktree Features Design — 2026-04-26

## Scope
Complete implementation of 7 pending features for the reokiy linktree (Next.js 15).

---

## 1. Songs API
- Create `GET /api/songs` — reads `/public/audio/songs`, returns `{ songs: string[] }` with filenames
- Supports mp3, mp4, m4a, ogg, wav formats
- MusicPlayer.tsx already calls this endpoint; just needs the route

## 2. Carousel in About Me
- Add a "Galería" section to `app/aboutme/page.tsx` using the existing `<Carousel />` component
- Carousel component fetches from `/api/carousel` (already implemented)
- Section placed after existing content, styled to match the glassmorphism theme

## 3. Discord Status Fix
- Investigate `useDiscord.ts` and `DiscordStatus.tsx`
- Root cause: user ID is hardcoded; Lanyard requires the user to join their Discord server (discord.gg/lanyard)
- Fix: make user ID configurable via env var `DISCORD_USER_ID`, add error/loading states, improve fallback UI
- Document setup requirement in README

## 4. Image Loading Fix
- Background images are 3-9MB PNGs — cause slow/failed loads on refresh
- Fix: add `priority` prop to above-the-fold Next.js Image components; add `loading="eager"` where needed
- Investigate and fix any hydration mismatch that causes blank image on reload

## 5. Performance Optimization
- Convert bg images from PNG to WebP (estimated 70% size reduction)
- Add `<link rel="preload">` for fonts
- Lazy load below-the-fold images (stickers, carousel)
- Add `next/image` optimization config in `next.config.mjs`

## 6. Admin Dashboard UI
- Route: `/admin/dashboard` — protected by session cookie (existing auth)
- Stack: Recharts for charts (lightweight, React-native)
- Layout:
  - Header with logout button
  - 4 stat cards: Total visits, Unique visitors, Top country, Top page
  - Line chart: visits per day (last 7 days)
  - Bar chart: top pages
  - Bar chart: top countries
  - Donut chart: referrers
  - Table: 20 most recent visits (page, country, city, time)
- Data from existing `GET /api/admin/stats`
- Redirect `/admin/login` → `/admin/dashboard` on success

## 7. SEO
- Update `app/layout.tsx` metadata: title, description, OG image, canonical URL, Twitter card
- Create `app/sitemap.ts` — Next.js dynamic sitemap (/, /aboutme)
- Create `app/robots.ts` — allow all, point to sitemap
- Add `<meta name="google-site-verification">` placeholder

---

## Architecture Notes
- All new routes are App Router (Next.js 15)
- Admin dashboard is a Client Component (needs Recharts)
- No new dependencies beyond Recharts
- Environment vars needed: `DISCORD_USER_ID`, `NEXT_PUBLIC_SITE_URL`
