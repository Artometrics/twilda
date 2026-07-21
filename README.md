# Twilda

**Twilda** is a personal novel workspace from **Artometrics**: Library (Plan / Write / Board / Codex), Journal, and Account — as an **Expo** app for iOS, Android, and web. Data lives in Supabase Auth + Postgres (RLS).

## Stack

- Expo SDK 57 + Expo Router (file routes)
- React Native + React Native Web
- Supabase Auth + Postgres (RLS)
- Literata + DM Sans

## Setup

See **[docs/SETUP.md](docs/SETUP.md)**.

```bash
npm install
cp .env.example .env
# Fill EXPO_PUBLIC_SITE_URL, EXPO_PUBLIC_SUPABASE_*
# Run SQL migrations in Supabase (001, 003, 007, 008, 009)
npm run dev
```

## Commands

| Command | Action |
|--------|--------|
| `npm run dev` / `npm start` | Expo dev server |
| `npm run web` | Web only |
| `npm run ios` / `npm run android` | Native targets |
| `npm run build` | Static web export → `dist/` |

## Product routes

| Area | Path |
|------|------|
| Library | `/(tabs)/novels` |
| Novel workspace | `/novels/[id]` |
| Journal | `/(tabs)/journal` |
| Account | `/(tabs)/account` |
| Login | `/(auth)/login` |

## Support

Lexington Themes roots (legacy template docs): [Documentation](https://lexingtonthemes.com/documentation/quick-start/), [Support](https://lexingtonthemes.com/legal/support/).
