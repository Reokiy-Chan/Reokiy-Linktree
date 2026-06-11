# Plan Maestro — Fixes + UI + Audit Log

**Goal:** Corregir errores de TypeScript, mejorar la UI del admin, añadir sistema de audit log con búsqueda.

**Architecture:** 3 bloques independientes ejecutados en orden — primero los fixes bloqueantes del build, luego mejoras de UI, finalmente el sistema de logs (nuevo módulo `app/lib/audit.ts` + ruta API + página admin).

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript strict, Upstash Redis / filesystem dual storage

---

## ══════════════════════════════════════
## BLOQUE A — TYPE FIXES (build bloqueante)
## ══════════════════════════════════════

## Task A1 — `req: Request` → `req: NextRequest` en me/route.ts

**Files:**
- Modify: `app/api/admin/me/route.ts:24`

- [ ] **Step 1: Cambiar el tipo del parámetro `req`**

```typescript
// ANTES
export async function PATCH(req: Request) {

// DESPUÉS
export async function PATCH(req: NextRequest) {
```

`NextRequest` ya está importado en línea 1. No hay que añadir nada más.

- [ ] **Step 2: Desestructurar correctamente `verifyPassword` (línea ~40)**

```typescript
// ANTES
const ok = await verifyPassword(current, user.passwordHash ?? '')
if (!ok) return NextResponse.json(...)

// DESPUÉS
const { ok } = await verifyPassword(current, user.passwordHash ?? '')
if (!ok) return NextResponse.json(...)
```

`verifyPassword` devuelve `{ ok: boolean; needsUpgrade: boolean }`, no un booleano. Sin este fix, la verificación de contraseña nunca falla (objeto truthy).

- [ ] **Step 3: Verificar build**
```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**
```bash
git add app/api/admin/me/route.ts
git commit -m "fix: PATCH /api/admin/me — NextRequest type + verifyPassword destructuring"
```

---

## Task A2 — Pasar `params` desde page.tsx a RaffleDetailClient

**Files:**
- Modify: `app/raffles/[id]/page.tsx`

**Root cause:** `Page()` no acepta ni pasa `params` al cliente. `use(undefined)` lanza runtime error.

- [ ] **Step 1: Reescribir page.tsx**

```typescript
import type { Metadata } from 'next'
import RaffleDetailClient from './RaffleDetailClient'

export const metadata: Metadata = {
  title: 'Giveaway | reokiy',
  description: 'Giveaway entry page',
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <RaffleDetailClient params={params} />
}
```

- [ ] **Step 2: Commit**
```bash
git add app/raffles/[id]/page.tsx
git commit -m "fix: pass params from page.tsx to RaffleDetailClient"
```

---

## ══════════════════════════════════════
## BLOQUE B — UI IMPROVEMENTS
## ══════════════════════════════════════

## Task B1 — Eliminar "Llaves de seguridad U2F" de Settings

**Files:**
- Modify: `app/admin/settings/page.tsx`

- [ ] **Step 1: Borrar el bloque U2F**

Localizar el comentario `{/* ─── Llaves de seguridad U2F ───── */}` (~línea 164) y eliminar todo el `<div>` hasta su cierre, justo antes del bloque "last updated".

- [ ] **Step 2: Eliminar state innecesario**

```typescript
// Borrar:
const [credentials, setCredentials] = useState<{...}[]>([])
const [registerState, setRegisterState] = useState<...>('idle')
const [registerError, setRegisterError] = useState('')
const [newKeyName, setNewKeyName] = useState('Flipper Zero')
```

- [ ] **Step 3: Borrar el fetch de /api/admin/me del useEffect y las funciones `registerKey` y `deleteKey`**

- [ ] **Step 4: Commit**
```bash
git add app/admin/settings/page.tsx
git commit -m "feat: remove duplicated U2F section from settings"
```

---

## Task B2 — Campos extra en modelo de usuario (pronouns, bio, banner)

**Files:**
- Modify: `app/lib/users.ts`
- Modify: `app/api/admin/me/route.ts`

- [ ] **Step 1: Añadir campos a `AdminUser` (después de `avatar?`)**

```typescript
pronouns?: string       // e.g. "she/her"
bio?: string            // máx 280 chars
bannerUrl?: string      // URL Vercel Blob
```

- [ ] **Step 2: Añadir los mismos campos a `SafeUser` y propagar en `toSafeUser()`**

```typescript
// En toSafeUser():
pronouns: u.pronouns,
bio: u.bio,
bannerUrl: u.bannerUrl,
```

- [ ] **Step 3: Aceptarlos en PATCH /api/admin/me**

```typescript
if (typeof body.pronouns === 'string') updates.pronouns = body.pronouns.slice(0, 40)
if (typeof body.bio === 'string') updates.bio = body.bio.slice(0, 280)
if (typeof body.bannerUrl === 'string') updates.bannerUrl = body.bannerUrl
```

- [ ] **Step 4: Commit**
```bash
git add app/lib/users.ts app/api/admin/me/route.ts
git commit -m "feat: pronouns, bio, bannerUrl in user model"
```

---

## Task B3 — Popup de perfil estilo Discord en AdminSidebar

**Files:**
- Modify: `app/admin/components/AdminSidebar.tsx`

- [ ] **Step 1: Ampliar la interfaz `Me`**

```typescript
interface Me {
  user: {
    id: string; username: string; name: string; avatar?: string
    pronouns?: string; bio?: string; bannerUrl?: string
    authMethod?: string; createdAt?: string
  }
  isRoot: boolean
  permissions: Permission[]
}
```

- [ ] **Step 2: Añadir state**

```typescript
const [profileOpen, setProfileOpen] = useState(false)
```

- [ ] **Step 3: Reemplazar el `<Link href="/admin/account">` del pie del sidebar por un botón que abre el popup**

El popup se posiciona `bottom: 100%` sobre el botón usando `position: absolute` dentro del aside (que ya tiene `position: sticky`). Estructura:

```tsx
{me && (
  <div style={{ position: 'relative' }}>
    {profileOpen && (
      <>
        {/* Overlay para cerrar */}
        <div style={{ position: 'fixed', inset: 0, zIndex: 50 }} onClick={() => setProfileOpen(false)} />

        {/* Popup */}
        <div style={{
          position: 'absolute', bottom: '100%', left: 8, right: 8, marginBottom: 8, zIndex: 51,
          background: '#0d0014', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 16, overflow: 'hidden', boxShadow: '0 -8px 32px rgba(0,0,0,0.6)',
          animation: 'fadeInUp 0.2s ease',
        }}>
          {/* Banner */}
          <div style={{
            height: 64,
            background: me.user.bannerUrl
              ? `url(${me.user.bannerUrl}) center/cover`
              : 'linear-gradient(135deg,#c41428,#5a0010)',
          }} />

          <div style={{ padding: '0 14px 14px', position: 'relative' }}>
            {/* Avatar con dot online */}
            <div style={{ position: 'relative', display: 'inline-block', marginTop: -22, marginBottom: 8 }}>
              {me.user.avatar
                ? <img src={me.user.avatar} style={{ width: 44, height: 44, borderRadius: '50%', border: '3px solid #0d0014', objectFit: 'cover' }} />
                : <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg,#c41428,#e8195c)', border: '3px solid #0d0014', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-body)', fontSize: 14, color: '#fff' }}>
                    {(me.user.name || me.user.username).slice(0,2).toUpperCase()}
                  </div>}
              <div style={{ position: 'absolute', bottom: 2, right: 2, width: 12, height: 12, borderRadius: '50%', background: '#22c55e', border: '2px solid #0d0014' }} />
            </div>

            {/* Nombre + pronombres */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap', marginBottom: 2 }}>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text)' }}>
                {me.user.name}{me.isRoot && ' 👑'}
              </span>
              {me.user.pronouns && (
                <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'rgba(254,224,244,0.35)' }}>
                  {me.user.pronouns}
                </span>
              )}
            </div>

            {me.user.bio && (
              <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'rgba(254,224,244,0.55)', lineHeight: 1.5, marginBottom: 10 }}>
                {me.user.bio}
              </div>
            )}

            <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', margin: '8px 0' }} />

            {/* Metadata */}
            {[['username', `@${me.user.username}`], ['auth', me.user.authMethod ?? '—']].map(([label, val]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-body)', fontSize: 11, marginBottom: 4 }}>
                <span style={{ color: 'rgba(254,224,244,0.3)' }}>{label}</span>
                <span style={{ color: 'rgba(254,224,244,0.65)' }}>{val}</span>
              </div>
            ))}

            <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', margin: '8px 0' }} />

            {/* Acciones */}
            <div style={{ display: 'flex', gap: 6 }}>
              <Link href="/admin/account" onClick={() => { setProfileOpen(false); setOpen(false) }}
                style={{ flex: 1, textAlign: 'center', padding: '7px 0', background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: 8, fontFamily: 'var(--font-body)', fontSize: 11, color: 'rgba(254,224,244,0.55)', textDecoration: 'none' }}>
                ⚙ edit profile
              </Link>
              <button type="button" onClick={logout}
                style={{ padding: '7px 14px', background: 'rgba(196,20,40,0.12)', border: '0.5px solid rgba(196,20,40,0.3)', borderRadius: 8, fontFamily: 'var(--font-body)', fontSize: 11, color: '#f87171', cursor: 'pointer' }}>
                log out
              </button>
            </div>
          </div>
        </div>
      </>
    )}

    {/* Trigger — pie de sidebar */}
    <div onClick={() => setProfileOpen(o => !o)}
      style={{ padding: '10px 14px', borderTop: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
      <div style={{ position: 'relative', flexShrink: 0 }}>
        {me.user.avatar
          ? <img src={me.user.avatar} style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover', border: '1px solid rgba(196,20,40,0.3)' }} />
          : <div style={{ width: 30, height: 30, borderRadius: '50%', background: me.isRoot ? 'linear-gradient(135deg,#c41428,#e8195c)' : 'rgba(196,20,40,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-body)', fontSize: 12, color: '#fff' }}>
              {(me.user.name || me.user.username).slice(0,2).toUpperCase()}
            </div>}
        <div style={{ position: 'absolute', bottom: 0, right: 0, width: 9, height: 9, borderRadius: '50%', background: '#22c55e', border: '1.5px solid #050007' }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {me.user.name}{me.isRoot && ' 👑'}
        </div>
        <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'rgba(254,224,244,0.3)' }}>@{me.user.username}</div>
      </div>
    </div>
  </div>
)}
```

- [ ] **Step 4: Borrar el botón "log out" del bloque Live indicator** (ahora está en el popup)

- [ ] **Step 5: Commit**
```bash
git add app/admin/components/AdminSidebar.tsx
git commit -m "feat: Discord-style profile popup in admin sidebar"
```

---

## Task B4 — Campos de perfil en Account page

**Files:**
- Modify: `app/admin/account/page.tsx`

- [ ] **Step 1: Ampliar interfaz Me local**
```typescript
interface Me {
  id: string; username: string; name: string; avatar?: string
  pronouns?: string; bio?: string; bannerUrl?: string
  authMethod: 'password' | 'webauthn'
  webauthnCredentials?: { id: string; name: string; createdAt: string }[]
  isRoot?: boolean
}
```

- [ ] **Step 2: Añadir state + inicializar en useEffect**
```typescript
const [pronouns, setPronouns] = useState('')
const [bio, setBio] = useState('')
// En useEffect: setPronouns(d.user.pronouns ?? ''); setBio(d.user.bio ?? '')
```

- [ ] **Step 3: Renombrar `saveName` → `saveProfile` e incluir todos los campos**
```typescript
body: JSON.stringify({ name: name.trim(), pronouns: pronouns.trim(), bio: bio.trim() })
```

- [ ] **Step 4: Añadir inputs de pronombres y bio al formulario** (después del campo de nombre)

```tsx
<input value={pronouns} onChange={e => setPronouns(e.target.value)} maxLength={40} placeholder="she/her, they/them…" style={FIELD} />
<textarea value={bio} onChange={e => setBio(e.target.value)} maxLength={280} rows={3} placeholder="una descripción corta…" style={{ ...FIELD, resize: 'vertical' }} />
```

- [ ] **Step 5: Commit**
```bash
git add app/admin/account/page.tsx
git commit -m "feat: pronouns and bio fields in account page"
```

---

## Task B5 — Tira de alerta para Maintenance / Attack Mode

**Files:**
- Modify: `app/admin/layout.tsx`
- Modify: `app/globals.css`

- [ ] **Step 1: Importar `getSettings` en el layout**
```typescript
import { getSettings } from '@/app/lib/settings'
```

- [ ] **Step 2: Leer settings en el Server Component y renderizar la tira**
```tsx
const settings = await getSettings()
const alertMode = settings?.maintenanceMode ? 'maintenance' : settings?.attackMode ? 'attack' : null

// Dentro del JSX, antes del <AdminSidebar />:
{alertMode && (
  <div style={{
    position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200, height: 32,
    overflow: 'hidden',
    background: alertMode === 'maintenance' ? 'rgba(251,191,36,0.08)' : 'rgba(248,113,113,0.08)',
    borderBottom: `1px solid ${alertMode === 'maintenance' ? 'rgba(251,191,36,0.3)' : 'rgba(248,113,113,0.3)'}`,
    display: 'flex', alignItems: 'center',
  }}>
    <div className={`alert-marquee alert-${alertMode}`}>
      {Array.from({ length: 8 }, (_, i) => (
        <span key={i}>
          {alertMode === 'maintenance'
            ? '🔧 MAINTENANCE MODE ACTIVE'
            : '🛡 ATTACK MODE ACTIVE — rate limiting public endpoints'}
          &nbsp;·&nbsp;
        </span>
      ))}
    </div>
  </div>
)}
```

- [ ] **Step 3: Empujar contenido 32px cuando la tira está activa**
```tsx
<main style={{ flex: 1, minWidth: 0, padding: '24px', paddingTop: alertMode ? '56px' : '24px', overflowX: 'hidden' }}>
```

- [ ] **Step 4: Añadir keyframes en globals.css**
```css
.alert-marquee {
  display: flex;
  white-space: nowrap;
  animation: alert-scroll 20s linear infinite;
  font-family: var(--font-body);
  font-size: 11px;
  letter-spacing: 0.15em;
}
.alert-maintenance { color: #fbbf24; }
.alert-attack { color: #f87171; }

@keyframes alert-scroll {
  0%   { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}
```

- [ ] **Step 5: Commit**
```bash
git add app/admin/layout.tsx app/globals.css
git commit -m "feat: fixed alert marquee strip for maintenance/attack mode"
```

---

## Task B6 — Corregir sistema de permisos (tab Users)

**Files:**
- Modify: `app/admin/components/AdminSidebar.tsx`

**Bug:** Users solo visible con `HandleUsers`/`HandleUserActions`. Debería ser visible si el permiso `'users'` está en `me.permissions`, igual que cualquier otra sección.

- [ ] **Step 1: Añadir Users al array NAV**
```typescript
{ href: '/admin/users', label: 'Users', icon: '👤', section: 'users' as Section },
```

- [ ] **Step 2: Borrar el bloque JSX especial de Users** (el `{(me?.isRoot || me?.permissions.includes('HandleUsers') ...}`)

La lógica `visibleNav = NAV.filter(n => me.isRoot || me.permissions.includes(n.section))` cubre Users automáticamente.

- [ ] **Step 3: Commit**
```bash
git add app/admin/components/AdminSidebar.tsx
git commit -m "fix: Users tab uses 'users' permission consistently with other sections"
```

---

## Task B7 — Sidebar verdaderamente sticky

**Files:**
- Modify: `app/admin/components/AdminSidebar.tsx`

- [ ] **Step 1: Ajustar estilos del aside**
```typescript
<aside style={{
  width: 200, flexShrink: 0,
  background: 'rgba(5,0,7,0.95)',
  borderRight: '1px solid var(--glass-border)',
  display: 'flex', flexDirection: 'column',
  position: 'sticky',
  top: 0,
  height: '100vh',        // altura exacta del viewport
  overflowY: 'auto',      // scroll interno si hay mucho contenido
  alignSelf: 'flex-start',
}} className="admin-sidebar-desktop">
```

- [ ] **Step 2: Asegurar que el div raíz del layout NO tiene `overflow: hidden` ni `overflow: auto`**

En `app/admin/layout.tsx`, el `div` wrapper debe tener solo `display: flex; minHeight: 100vh`.

- [ ] **Step 3: Commit**
```bash
git add app/admin/components/AdminSidebar.tsx app/admin/layout.tsx
git commit -m "fix: sidebar sticky with height:100vh + overflowY:auto"
```

---

## Task B8 — Responsive completo

**Files:**
- Modify: `app/globals.css`
- Modify: `app/admin/live/page.tsx`
- Modify: `app/admin/components/AdminSidebar.tsx`
- Modify: `app/HomeClient.tsx`
- Modify: `app/raffles/[id]/RaffleDetailClient.tsx`

- [ ] **Step 1: Añadir clases helpers en globals.css**
```css
@media (max-width: 768px) {
  .live-grid { grid-template-columns: 1fr !important; }
  .stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
  .admin-main { padding: 40px 14px 40px !important; }
}
@media (max-width: 480px) {
  .stats-grid { grid-template-columns: 1fr 1fr !important; }
  .enter-row { flex-direction: column !important; }
}
```

- [ ] **Step 2: Añadir `className="live-grid"` al grid del mapa+feed en `app/admin/live/page.tsx`**

```tsx
<div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: 14 }} className="live-grid">
```

- [ ] **Step 3: Añadir tab bar de acceso rápido en el mobile top bar del sidebar**

Debajo del row logo+hamburger, añadir una fila con las 3 primeras tabs del NAV + botón "más":
```tsx
<div style={{ display: 'flex', borderTop: '1px solid var(--glass-border)' }}>
  {NAV.slice(0, 3).map(({ href, label, icon }) => (
    <Link key={href} href={href} onClick={() => setOpen(false)}
      style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '8px 4px',
        borderBottom: isActive(href) ? '2px solid var(--primary)' : '2px solid transparent',
        background: isActive(href) ? 'rgba(196,20,40,0.08)' : 'transparent', textDecoration: 'none' }}>
      <span style={{ fontSize: 14 }}>{icon}</span>
      <span style={{ fontFamily: 'var(--font-body)', fontSize: 9, color: isActive(href) ? 'var(--text)' : 'var(--text-muted)', letterSpacing: '0.08em' }}>
        {label.toLowerCase()}
      </span>
    </Link>
  ))}
  <button type="button" onClick={() => setOpen(true)}
    style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '8px 4px', background: 'none', border: 'none', cursor: 'pointer' }}>
    <span style={{ fontSize: 14 }}>⋯</span>
    <span style={{ fontFamily: 'var(--font-body)', fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.08em' }}>más</span>
  </button>
</div>
```

- [ ] **Step 4: En RaffleDetailClient, añadir `className="enter-row"` al div del form y asegurar que en móvil se apila**

- [ ] **Step 5: Commit**
```bash
git add app/globals.css app/admin/live/page.tsx app/admin/components/AdminSidebar.tsx app/HomeClient.tsx app/raffles/[id]/RaffleDetailClient.tsx
git commit -m "feat: full responsive — admin tab bar + public pages"
```

---

## Task B9 — Rediseño del panel del mapa

**Files:**
- Modify: `app/admin/live/page.tsx`

- [ ] **Step 1: Reestructurar el contenedor del mapa con header limpio**

Reemplazar el div que envuelve `<WorldMapV2>`:
```tsx
<div style={{ background: 'rgba(255,255,255,0.022)', border: '1px solid rgba(196,20,40,0.18)', borderRadius: 14, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
  {/* Header */}
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.2)' }}>
    <span style={{ ...S, fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(196,20,40,0.65)' }}>live map</span>
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 5px #4ade80', animation: 'lp 2s ease-in-out infinite' }} />
        <span style={{ ...S, fontSize: 11, color: '#4ade80', letterSpacing: '0.1em' }}>{online.length} online</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--primary)', animation: 'lp 2s ease-in-out infinite' }} />
        <span style={{ ...S, fontSize: 11, color: 'var(--primary)', letterSpacing: '0.1em' }}>live</span>
      </div>
    </div>
  </div>
  {/* Mapa — los controles zoom y toggles van dentro de WorldMapV2 con showControls */}
  <WorldMapV2 height={380} showControls liveVisits={liveVisits} online={online} liveEvents={events} />
</div>
```

- [ ] **Step 2: Commit**
```bash
git add app/admin/live/page.tsx
git commit -m "fix: cleaner live map panel header, no duplicate title"
```

---

## ══════════════════════════════════════
## BLOQUE C — AUDIT LOG SYSTEM
## ══════════════════════════════════════

## Task C1 — Modelo y storage de audit logs

**Files:**
- Create: `app/lib/audit.ts`

**Diseño del tipo `AuditEntry`:**
```typescript
export type AuditAction =
  | 'settings.update'
  | 'user.create' | 'user.update' | 'user.delete' | 'user.suspend'
  | 'code.create' | 'code.delete'
  | 'raffle.create' | 'raffle.update' | 'raffle.delete' | 'raffle.pick'
  | 'account.update'         // cambio de nombre/avatar/bio del propio usuario
  | 'account.password'       // cambio de contraseña
  | 'webauthn.register' | 'webauthn.delete'
  | 'login.success' | 'login.fail'
```

Storage: lista LPUSH en Redis (`reokiy:audit`) con máximo de 2000 entradas, igual que las visitas. En local usa fichero `data/audit.json`.

- [ ] **Step 1: Crear `app/lib/audit.ts`**

```typescript
import path from 'path'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { randomBytes } from 'crypto'
import { USE_KV, getRedis } from './redis'

export type AuditAction =
  | 'settings.update'
  | 'user.create' | 'user.update' | 'user.delete' | 'user.suspend'
  | 'code.create' | 'code.delete'
  | 'raffle.create' | 'raffle.update' | 'raffle.delete' | 'raffle.pick'
  | 'account.update' | 'account.password'
  | 'webauthn.register' | 'webauthn.delete'
  | 'login.success' | 'login.fail'

export interface AuditEntry {
  id: string
  action: AuditAction
  actorId: string           // uid del usuario que hizo la acción
  actorName: string         // display name en el momento del log
  actorUsername: string     // @handle
  actorAvatar?: string      // URL foto de perfil (puede estar desactualizada)
  target?: string           // qué se afectó: nombre del setting, username del usuario, título del código/raffle, etc.
  detail?: string           // descripción libre: qué cambió, valores antes/después relevantes
  ts: string                // ISO timestamp
}

const KV_KEY = 'reokiy:audit'
const MAX_ENTRIES = 2000
const DATA_DIR = process.env.VERCEL ? '/tmp' : path.join(process.cwd(), 'data')
const AUDIT_FILE = path.join(DATA_DIR, 'audit.json')

function fsRead(): AuditEntry[] {
  try {
    if (!existsSync(AUDIT_FILE)) return []
    return JSON.parse(readFileSync(AUDIT_FILE, 'utf-8')) as AuditEntry[]
  } catch { return [] }
}

function fsWrite(entries: AuditEntry[]): void {
  mkdirSync(DATA_DIR, { recursive: true })
  writeFileSync(AUDIT_FILE, JSON.stringify(entries.slice(0, MAX_ENTRIES)))
}

export async function appendAudit(entry: Omit<AuditEntry, 'id' | 'ts'>): Promise<void> {
  const full: AuditEntry = {
    ...entry,
    id: randomBytes(8).toString('hex'),
    ts: new Date().toISOString(),
  }
  if (USE_KV) {
    const redis = await getRedis()
    await redis.lpush(KV_KEY, JSON.stringify(full))
    await redis.ltrim(KV_KEY, 0, MAX_ENTRIES - 1)
  } else {
    const all = fsRead()
    fsWrite([full, ...all])
  }
}

export async function listAudit(limit = 200): Promise<AuditEntry[]> {
  if (USE_KV) {
    const redis = await getRedis()
    const raw = await redis.lrange(KV_KEY, 0, limit - 1) as string[]
    return raw.map(r => {
      try { return JSON.parse(r) as AuditEntry } catch { return null }
    }).filter(Boolean) as AuditEntry[]
  }
  return fsRead().slice(0, limit)
}
```

- [ ] **Step 2: Commit**
```bash
git add app/lib/audit.ts
git commit -m "feat: audit log — model + storage (Redis / fs dual)"
```

---

## Task C2 — Ruta API de audit logs

**Files:**
- Create: `app/api/admin/audit/route.ts`

- [ ] **Step 1: Crear la ruta GET**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/app/lib/auth'
import { listAudit } from '@/app/lib/audit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const session = await getSession(req)
  // Solo root o quien tenga permiso 'settings' puede ver los logs
  if (!session || session.setup) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const canView = session.r === 'root' || session.p === 'all' || (Array.isArray(session.p) && session.p.includes('settings'))
  if (!canView) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const url = new URL(req.url)
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '200'), 500)
  const entries = await listAudit(limit)
  return NextResponse.json({ entries })
}
```

- [ ] **Step 2: Commit**
```bash
git add app/api/admin/audit/route.ts
git commit -m "feat: GET /api/admin/audit route"
```

---

## Task C3 — Instrumentar rutas con appendAudit

**Files:**
- Modify: `app/api/admin/settings/route.ts`
- Modify: `app/api/admin/users/route.ts`
- Modify: `app/api/admin/users/[id]/route.ts`
- Modify: `app/api/admin/codes/route.ts`
- Modify: `app/api/admin/codes/[id]/route.ts`
- Modify: `app/api/admin/raffles/route.ts`
- Modify: `app/api/admin/raffles/[id]/route.ts`
- Modify: `app/api/admin/raffles/[id]/pick/route.ts`
- Modify: `app/api/admin/me/route.ts`
- Modify: `app/api/admin/auth/route.ts`

**Patrón a aplicar en cada ruta tras una mutación exitosa:**

```typescript
import { appendAudit } from '@/app/lib/audit'

// Dentro del handler, después de que la operación sea exitosa:
await appendAudit({
  action: 'settings.update',
  actorId: session.uid,
  actorName: session.u,
  actorUsername: session.u,
  // actorAvatar: — recuperar del user si es relevante (opcional, no bloquear el handler)
  target: 'maintenanceMode',
  detail: `maintenanceMode → ${patch.maintenanceMode}`,
})
```

- [ ] **Step 1: Instrumentar `app/api/admin/settings/route.ts` PATCH**

Después de `updateSettings(patch)`:
```typescript
await appendAudit({
  action: 'settings.update',
  actorId: session.uid, actorName: session.u, actorUsername: session.u,
  target: Object.keys(patch).join(', '),
  detail: JSON.stringify(patch),
})
```

- [ ] **Step 2: Instrumentar `app/api/admin/me/route.ts` PATCH**

Después de `updateUser(...)`:
```typescript
const action = updates.passwordHash ? 'account.password' : 'account.update'
await appendAudit({
  action, actorId: session.uid, actorName: session.u, actorUsername: session.u,
  detail: updates.passwordHash ? 'contraseña actualizada' : Object.keys(updates).join(', '),
})
```

- [ ] **Step 3: Instrumentar `app/api/admin/users/route.ts` POST (crear usuario)**

Después de `createUser(...)`:
```typescript
await appendAudit({
  action: 'user.create',
  actorId: session.uid, actorName: session.u, actorUsername: session.u,
  target: body.username,
  detail: `permisos: ${body.permissions?.join(', ') ?? 'none'}`,
})
```

- [ ] **Step 4: Instrumentar `app/api/admin/users/[id]/route.ts` PATCH y DELETE**

PATCH:
```typescript
await appendAudit({
  action: 'user.update',
  actorId: session.uid, actorName: session.u, actorUsername: session.u,
  target: targetUser.username,
  detail: Object.keys(body).join(', '),
})
```

DELETE:
```typescript
await appendAudit({
  action: 'user.delete',
  actorId: session.uid, actorName: session.u, actorUsername: session.u,
  target: targetUser.username,
})
```

- [ ] **Step 5: Instrumentar codes (POST crear, DELETE borrar)**

POST:
```typescript
await appendAudit({ action: 'code.create', actorId: session.uid, actorName: session.u, actorUsername: session.u, target: body.code, detail: body.label })
```

DELETE:
```typescript
await appendAudit({ action: 'code.delete', actorId: session.uid, actorName: session.u, actorUsername: session.u, target: code.code, detail: code.label })
```

- [ ] **Step 6: Instrumentar raffles (POST crear, PATCH actualizar, DELETE, pick)**

```typescript
// Crear:
await appendAudit({ action: 'raffle.create', actorId: session.uid, actorName: session.u, actorUsername: session.u, target: raffle.title })
// Actualizar:
await appendAudit({ action: 'raffle.update', actorId: session.uid, actorName: session.u, actorUsername: session.u, target: raffle.title, detail: Object.keys(body).join(', ') })
// Pick winner:
await appendAudit({ action: 'raffle.pick', actorId: session.uid, actorName: session.u, actorUsername: session.u, target: raffle.title, detail: `winner: ${winnerId}` })
// Delete:
await appendAudit({ action: 'raffle.delete', actorId: session.uid, actorName: session.u, actorUsername: session.u, target: raffle.title })
```

- [ ] **Step 7: Instrumentar login en `app/api/admin/auth/route.ts`**

En el POST, después del resultado de `resolveLogin`:
```typescript
// Si ok:
await appendAudit({ action: 'login.success', actorId: result.user.id, actorName: result.user.name, actorUsername: result.user.username })
// Si !ok (antes del return 401):
await appendAudit({ action: 'login.fail', actorId: 'unknown', actorName: 'unknown', actorUsername: username, detail: result.error })
```

- [ ] **Step 8: Commit**
```bash
git add app/api/admin/settings/route.ts app/api/admin/me/route.ts app/api/admin/users/route.ts app/api/admin/users/[id]/route.ts app/api/admin/codes/route.ts app/api/admin/codes/[id]/route.ts app/api/admin/raffles/route.ts app/api/admin/raffles/[id]/route.ts app/api/admin/raffles/[id]/pick/route.ts app/api/admin/auth/route.ts
git commit -m "feat: instrument all admin mutations with audit log"
```

---

## Task C4 — Página /admin/audit

**Files:**
- Create: `app/admin/audit/page.tsx`
- Modify: `app/admin/components/AdminSidebar.tsx` (añadir tab)

**Diseño:**
- Lista vertical de entradas, las más recientes primero
- Cada fila: foto del actor (avatar o iniciales con fallback), nombre + @username, badge de acción coloreado por categoría, target en bold, detail en muted, timestamp relativo (hover → absoluto)
- Barra de búsqueda: filtra en cliente sobre las entradas cargadas (sin nueva petición) por actorUsername, target, detail, action
- Sin paginación — carga las últimas 200 entradas, suficiente para el scroll

**Colores de badge por categoría:**
- `login.*` → azul (`rgba(59,130,246,0.15)` / `#93c5fd`)
- `settings.*` → amarillo (`rgba(251,191,36,0.15)` / `#fbbf24`)
- `user.*` → violeta (`rgba(167,139,250,0.15)` / `#c4b5fd`)
- `code.*` → verde (`rgba(74,222,128,0.15)` / `#4ade80`)
- `raffle.*` → naranja (`rgba(251,146,60,0.15)` / `#fb923c`)
- `account.*` → rosa (`rgba(232,25,92,0.15)` / `#e8195c`)
- `webauthn.*` → gris (`rgba(255,255,255,0.08)` / `rgba(254,224,244,0.5)`)

- [ ] **Step 1: Crear `app/admin/audit/page.tsx`**

```tsx
'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import type { AuditEntry, AuditAction } from '@/app/lib/audit'

const S: React.CSSProperties = { fontFamily: 'var(--font-body)' }

const ACTION_META: Record<string, { label: string; bg: string; color: string }> = {
  'login':    { label: 'login',    bg: 'rgba(59,130,246,0.15)',   color: '#93c5fd' },
  'settings': { label: 'settings', bg: 'rgba(251,191,36,0.15)',   color: '#fbbf24' },
  'user':     { label: 'user',     bg: 'rgba(167,139,250,0.15)',  color: '#c4b5fd' },
  'code':     { label: 'code',     bg: 'rgba(74,222,128,0.15)',   color: '#4ade80' },
  'raffle':   { label: 'raffle',   bg: 'rgba(251,146,60,0.15)',   color: '#fb923c' },
  'account':  { label: 'account',  bg: 'rgba(232,25,92,0.15)',    color: '#e8195c' },
  'webauthn': { label: 'webauthn', bg: 'rgba(255,255,255,0.08)',  color: 'rgba(254,224,244,0.5)' },
}

function getActionMeta(action: AuditAction) {
  const category = action.split('.')[0]
  return ACTION_META[category] ?? { label: category, bg: 'rgba(255,255,255,0.06)', color: 'rgba(254,224,244,0.4)' }
}

function relativeTime(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function AuditRow({ entry }: { entry: AuditEntry }) {
  const meta = getActionMeta(entry.action)
  const initials = (entry.actorName || entry.actorUsername).slice(0, 2).toUpperCase()
  const [hover, setHover] = useState(false)

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 16px',
      borderBottom: '1px solid rgba(255,255,255,0.04)',
      transition: 'background 0.15s',
      background: hover ? 'rgba(255,255,255,0.02)' : 'transparent',
    }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {/* Avatar */}
      <div style={{ flexShrink: 0, marginTop: 2 }}>
        {entry.actorAvatar
          ? <img src={entry.actorAvatar} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.1)' }} />
          : <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(196,20,40,0.25)', border: '1px solid rgba(196,20,40,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-body)', fontSize: 11, color: 'rgba(254,224,244,0.7)' }}>
              {initials}
            </div>}
      </div>

      {/* Contenido */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', marginBottom: 4 }}>
          <span style={{ ...S, fontSize: 12, color: 'var(--text)', fontWeight: 500 }}>{entry.actorName}</span>
          <span style={{ ...S, fontSize: 11, color: 'rgba(254,224,244,0.3)' }}>@{entry.actorUsername}</span>
          <span style={{
            ...S, fontSize: 10, padding: '1px 8px', borderRadius: 10,
            background: meta.bg, color: meta.color,
            letterSpacing: '0.1em', textTransform: 'uppercase',
          }}>
            {entry.action}
          </span>
        </div>
        {entry.target && (
          <div style={{ ...S, fontSize: 12, color: 'rgba(254,224,244,0.75)', marginBottom: 2 }}>
            → <strong style={{ color: 'var(--text)' }}>{entry.target}</strong>
            {entry.detail && <span style={{ color: 'rgba(254,224,244,0.4)', marginLeft: 8 }}>{entry.detail}</span>}
          </div>
        )}
      </div>

      {/* Timestamp */}
      <div style={{ ...S, fontSize: 11, color: 'rgba(254,224,244,0.25)', flexShrink: 0, marginTop: 2, cursor: 'default' }}
        title={new Date(entry.ts).toLocaleString('es-ES')}>
        {relativeTime(entry.ts)}
      </div>
    </div>
  )
}

export default function AuditPage() {
  const router = useRouter()
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')

  useEffect(() => {
    fetch('/api/admin/audit')
      .then(r => { if (r.status === 401) { router.replace('/admin/login'); return null } return r.json() })
      .then(d => { if (d?.entries) setEntries(d.entries) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [router])

  const filtered = useMemo(() => {
    if (!query.trim()) return entries
    const q = query.toLowerCase()
    return entries.filter(e =>
      e.actorUsername.toLowerCase().includes(q) ||
      e.actorName.toLowerCase().includes(q) ||
      e.action.includes(q) ||
      (e.target ?? '').toLowerCase().includes(q) ||
      (e.detail ?? '').toLowerCase().includes(q)
    )
  }, [entries, query])

  return (
    <div style={{ maxWidth: 860, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 20, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 26, color: 'var(--text)', margin: 0 }}>audit log</h1>
          <div style={{ ...S, fontSize: 12, color: 'rgba(254,224,244,0.3)', letterSpacing: '0.14em', textTransform: 'uppercase', marginTop: 4 }}>
            admin activity history
          </div>
        </div>
        <span style={{ ...S, fontSize: 12, color: 'rgba(254,224,244,0.25)', letterSpacing: '0.06em' }}>
          {filtered.length} {filtered.length !== entries.length ? `/ ${entries.length}` : ''} entries
        </span>
      </div>

      {/* Barra de búsqueda */}
      <div style={{ marginBottom: 12, position: 'relative' }}>
        <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: 'rgba(254,224,244,0.25)', pointerEvents: 'none' }}>⌕</span>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="buscar por usuario, acción, target…"
          style={{
            ...S, width: '100%', boxSizing: 'border-box',
            padding: '10px 12px 10px 34px',
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(196,20,40,0.2)',
            borderRadius: 10, color: 'var(--text)', fontSize: 12, outline: 'none',
          }}
        />
        {query && (
          <button type="button" onClick={() => setQuery('')}
            style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(254,224,244,0.3)', fontSize: 14 }}>
            ✕
          </button>
        )}
      </div>

      {/* Lista */}
      <div style={{ background: 'rgba(255,255,255,0.022)', border: '1px solid rgba(196,20,40,0.12)', borderRadius: 14, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ ...S, fontSize: 12, color: 'rgba(254,224,244,0.3)', textAlign: 'center', padding: '60px 0', letterSpacing: '0.1em' }}>loading…</div>
        ) : filtered.length === 0 ? (
          <div style={{ ...S, fontSize: 12, color: 'rgba(254,224,244,0.3)', textAlign: 'center', padding: '60px 0', letterSpacing: '0.1em' }}>
            {query ? 'no results' : 'no audit entries yet'}
          </div>
        ) : (
          filtered.map(e => <AuditRow key={e.id} entry={e} />)
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Añadir la tab Audit al NAV de AdminSidebar**

```typescript
// En el array NAV:
{ href: '/admin/audit', label: 'Audit', icon: '📋', section: 'settings' as Section },
// Nota: usa section:'settings' para que sea visible a quien tenga el permiso de settings
```

- [ ] **Step 3: Commit**
```bash
git add app/admin/audit/page.tsx app/admin/components/AdminSidebar.tsx
git commit -m "feat: audit log page with search — /admin/audit"
```

---

## Resumen de archivos y orden de ejecución

| Orden | Task | Archivos clave |
|-------|------|---------------|
| 1 | A1 — Fix NextRequest | `app/api/admin/me/route.ts` |
| 2 | A2 — Fix params raffle | `app/raffles/[id]/page.tsx` |
| 3 | B1 — Quitar U2F de settings | `app/admin/settings/page.tsx` |
| 4 | B2 — Campos usuario | `app/lib/users.ts`, `app/api/admin/me/route.ts` |
| 5 | B3 — Popup perfil sidebar | `app/admin/components/AdminSidebar.tsx` |
| 6 | B4 — Account page campos | `app/admin/account/page.tsx` |
| 7 | B5 — Tira alerta | `app/admin/layout.tsx`, `app/globals.css` |
| 8 | B6 — Fix permisos Users | `app/admin/components/AdminSidebar.tsx` |
| 9 | B7 — Sidebar sticky | `app/admin/components/AdminSidebar.tsx`, `app/admin/layout.tsx` |
| 10 | B8 — Responsive | `app/globals.css`, varios |
| 11 | B9 — Panel mapa | `app/admin/live/page.tsx` |
| 12 | C1 — Audit lib | `app/lib/audit.ts` |
| 13 | C2 — Audit API | `app/api/admin/audit/route.ts` |
| 14 | C3 — Instrumentar rutas | 10 rutas API |
| 15 | C4 — Página audit | `app/admin/audit/page.tsx` |

**Total: 15 tasks · ~18 archivos · Redis key: `reokiy:audit` · máx 2000 entradas**