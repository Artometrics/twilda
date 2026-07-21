# AGENTS.md — Twilda (`@artometrics/twilda`)

**Twilda** (Artometrics) is a personal novel workspace for **iOS, Android, and web** via **Expo**: **Library** (Plan / Write / Board / Codex), **Journal**, and **Account** — with Supabase Auth (email + Google).

**Publisher / support:** See README. Production web: Netlify site `twilda` (static Expo export). Domain from `EXPO_PUBLIC_SITE_URL`.

## Tech stack

- **Expo** `~57` + **Expo Router** (`app/`)
- **React Native** + **react-native-web**
- **Supabase:** `@supabase/supabase-js` — client in `src/lib/supabase/client.ts` (SecureStore / AsyncStorage)
- **Fonts:** Literata + DM Sans (`@expo-google-fonts/*`)
- **Host (web):** Netlify publishes `dist/` from `npm run build` (`netlify.toml`)
- **Aliases:** `@/*` → `src/*` then project root (`tsconfig.json`)

## Folder map

| Area | Path | Role |
|------|------|------|
| Routes | `app/` | Expo Router screens (auth, tabs, novel, journal) |
| Lib | `src/lib/` | Auth, novels, journal, Supabase |
| Domain | `src/apps/novelcrafter/` | Types, starter manuscript data |
| UI | `src/components/` | Shared RN UI |
| Theme | `src/constants/theme.ts` | Color / type tokens |
| Setup docs | `docs/SETUP.md` | Env + Supabase checklist |
| Supabase SQL | `supabase/migrations/` | Schema migrations |

## Product routes

| Area | Path |
|------|------|
| Home | `/` → library or login |
| Library | `/(tabs)/novels` |
| Workspace | `/novels/[id]` (Plan / Write / Board / Codex / Settings) |
| Journal | `/(tabs)/journal`, `/journal/[id]` |
| Account | `/(tabs)/account` |
| Auth | `/(auth)/login`, signup, forgot; `/auth/callback` |

## Guardrails

- Prefer **minimal diffs**; reuse `src/lib` services + RLS instead of reintroducing a custom API layer.
- Call Supabase from the client with the anon key; never ship `SUPABASE_SERVICE_ROLE_KEY` in the app.
- Protected UX is route-guarded via `AuthProvider` + tab/auth layouts.

## Cursor Cloud specific instructions

- Setup: `npm install`, copy `.env.example` → `.env`, run `npm run dev` or `npm run web`.
- Correctness checks: `npm run typecheck` and `npm run build` (web export).
- See **`docs/SETUP.md`**.
