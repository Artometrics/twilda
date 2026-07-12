# OAuth setup — Google, GitHub, Apple, Microsoft

Product: **Twilda** · Supabase project: **twilda**

OAuth buttons on `/forms/login` and `/forms/signup` call Supabase `signInWithOAuth`. After the provider approves, Supabase redirects to your app at `/auth/callback`.

## One value every provider needs

In each provider’s developer console, set the **authorization / redirect / callback URL** to Supabase’s callback (copy from the provider modal in Supabase):

```
https://<YOUR_PROJECT_REF>.supabase.co/auth/v1/callback
```

For project **twilda**, the ref is shown in Supabase → **Settings → General → Project ID** (paste into the URL above).

Do **not** put `twilda.com/auth/callback` in Google/GitHub/Apple/Microsoft — that URL is only in Supabase **Redirect URLs** (already configured).

---

## 1. Google (recommended first)

### Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → select or create a project.
2. **APIs & Services** → **OAuth consent screen** → configure (app name, support email, scopes). For testing, add your email as a test user.
3. **APIs & Services** → **Credentials** → **Create credentials** → **OAuth client ID**.
4. Application type: **Web application**.
5. **Authorized JavaScript origins:**
   - Your `PUBLIC_SITE_URL` (production)
   - `http://localhost:4321`
6. **Authorized redirect URIs:**
   - `https://<YOUR_PROJECT_REF>.supabase.co/auth/v1/callback` (from Supabase Google modal)
7. Copy **Client ID** and **Client secret**.

### Supabase

1. **Authentication** → **Sign In / Providers** → **Google**.
2. Toggle **Enable Sign in with Google** ON.
3. Paste **Client ID** and **Client secret**.
4. **Save**.

### Test

1. Deploy the app code (OAuth buttons on login/signup).
2. Visit `/forms/login` → **Continue with Google**.
3. After redirect, you should land on `/novels/` and see a user under **Authentication → Users**.

---

## 2. GitHub

### GitHub

1. GitHub → **Settings** → **Developer settings** → **OAuth Apps** → **New OAuth App**.
2. **Application name:** Twilda (or similar).
3. **Homepage URL:** your `PUBLIC_SITE_URL`
4. **Authorization callback URL:** copy from Supabase GitHub provider modal (`https://<ref>.supabase.co/auth/v1/callback`)
5. Register → copy **Client ID** → generate **Client secret**.

### Supabase

1. **Sign In / Providers** → **GitHub**.
2. Toggle **GitHub enabled** ON.
3. Paste Client ID and Client secret → **Save**.

---

## 3. Apple (more setup)

Requires an [Apple Developer](https://developer.apple.com/) account ($99/year).

### Apple Developer

1. **Certificates, Identifiers & Profiles** → **Identifiers** → **+** → **Services IDs**.
2. Register a Services ID (e.g. `com.artometrics.twilda.web`).
3. Enable **Sign in with Apple** → configure:
   - **Domains:** your production domain (from `PUBLIC_SITE_URL`)
   - **Return URLs:** `https://<YOUR_PROJECT_REF>.supabase.co/auth/v1/callback`
4. Create a **Sign in with Apple** key (.p8) → note **Key ID**.
5. Note your **Team ID** (membership details).

### Supabase

1. **Sign In / Providers** → **Apple**.
2. Enable Apple.
3. Fill in:
   - **Services ID** (client ID)
   - **Secret Key** (contents of .p8 file)
   - **Key ID**
   - **Team ID**
4. **Save**.

Apple may require domain verification for your production domain (file upload or DNS).

---

## 4. Microsoft (Azure)

### Azure Portal

1. [Azure Portal](https://portal.azure.com/) → **Microsoft Entra ID** → **App registrations** → **New registration**.
2. Name: Twilda.
3. Supported account types: **Accounts in any organizational directory and personal Microsoft accounts** (multitenant + personal) if you want broad sign-in.
4. Redirect URI: **Web** → `https://<YOUR_PROJECT_REF>.supabase.co/auth/v1/callback`
5. Register → copy **Application (client) ID**.
6. **Certificates & secrets** → **New client secret** → copy value.
7. **Overview** → note tenant; for “any Microsoft account” use tenant URL:
   ```
   https://login.microsoftonline.com/common
   ```

### Supabase

1. **Sign In / Providers** → **Azure**.
2. Enable Azure.
3. Paste **Application (client) ID**, **Secret**, and **Azure tenant URL** (`https://login.microsoftonline.com/common`).
4. **Save**.

---

## Troubleshooting

| Error | Fix |
|-------|-----|
| `redirect_uri_mismatch` (Google) | Redirect URI in Google must exactly match Supabase callback URL |
| Provider enabled but button does nothing | Deploy latest app; check browser console |
| Lands on callback then “Link expired” | Add `{PUBLIC_SITE_URL}/auth/callback` to Supabase Redirect URLs |
| Apple fails immediately | Verify Services ID return URL and domain verification |
| GitHub “redirect_uri not valid” | Callback must be Supabase URL, not twilda.com |

## App routes (already implemented)

| Route | Role |
|-------|------|
| `/forms/login`, `/forms/signup` | OAuth + email buttons |
| `/auth/callback` | Exchanges OAuth `code` for session cookie |

After OAuth sign-in, `handle_new_user` trigger still creates a `profiles` row for new users.
