# linktree — VRChat creator linktree

A dark gothic glassmorphism linktree built with Next.js 15.

## Setup

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Customization checklist

### 1. Replace all placeholder links
In `app/page.tsx`, update the `links` array and the social hub grid with your real URLs:
- `https://discord.gg/YOUR_INVITE`
- `https://x.com/yourhandle`
- `https://twitch.tv/yourhandle`
- `https://fansly.com/yourhandle`
- `https://instagram.com/yourhandle`
- `https://throne.com/yourhandle`
- `https://ko-fi.com/yourhandle`
- `https://vrchat.com/home/user/yourID`

### 2. Set your Discord User ID for live status
In `app/components/DiscordStatus.tsx`, replace `YOUR_DISCORD_ID_HERE` with your real Discord user ID.

To get your ID: Discord → Settings → Advanced → Enable Developer Mode → right-click your profile → Copy User ID.

**Note:** Your account must be registered on Lanyard. Join the Lanyard Discord server (`https://discord.gg/lanyard`) to register.

### 3. Add your avatar image
Place your avatar image at `public/images/avatar.png`, then in `app/page.tsx` uncomment the `<img>` tag inside the avatar section and remove the emoji placeholder.

### 4. Update your bio & name
In `app/page.tsx`, update:
- The `<h1>` text (your display name)
- The tags array (`['vrchat', '18+', 'alter', 'catgirl']`)
- The bio paragraph

### 5. Customize the /forreo note
In `app/forreo/page.tsx`, update the note text to your message.

### 6. SEO/metadata
In `app/layout.tsx`, update the `metadata` object with your title and description.

---

## Pages

- `/` — The main linktree
- `/forreo` — Surprise romantic note with heart explosion effect

## Tech

- Next.js 15 App Router
- Pure CSS animations (no animation libraries)
- Lanyard API for Discord status
- Google Fonts (Cormorant Garamond, Space Mono, Pinyon Script)
