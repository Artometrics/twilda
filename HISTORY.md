# History

This Git repository, [Artometrics/twilda](https://github.com/Artometrics/twilda), previously held a different product.

Until commit `106b96f` (2026-10-03, `feat(hosting): add Firebase Hosting configuration`), the working tree was a personal novel workspace: Library, Journal, and Account. It was built with Expo SDK 57, Expo Router, React Native, and Supabase Auth plus Postgres. Production web had been published to the Netlify site `twilda` and to Firebase Hosting on project `twilda-510519`, with a homepage at https://twilda.com.

That product is no longer the working tree. The commits were not deleted and were not rewritten. `106b96f` and its parents stay reachable on `main` and in this repository's history.

The same commit also contained a `research/stanford` analysis, Supabase SQL migrations, and Expo app source. Those files left the tip of this branch with the novel app. They are still in git history.

This branch replaces the working tree with **Twilda CMS**, a git-native static CMS for Astro, licensed Apache-2.0. The change does not deploy anything. `firebase.json` records Hosting headers for the static `dist/` on site `twilda-510519`. That file is not a deploy script and not a restoration of the Expo app. Do not add credentials, and do not point a deploy command at `artometrics-510519`, the old Netlify site, twilda.com, or the Artometrics site.
