# Phase 5 - Authentication

## What This Phase Builds

Phase 5 creates the static frontend authentication layer using Supabase Auth.

Implemented pages:

- `index.html`
- `login.html`
- `register.html`
- `dashboard.html`
- `profile.html`

Implemented JavaScript:

- `js/supabase.js`
- `js/auth.js`
- `js/dashboard.js`
- `js/profile.js`

Implemented CSS:

- `css/style.css`

## Supabase Configuration

Edit this file before testing:

```text
js/supabase.js
```

Replace:

```js
const SUPABASE_URL = 'YOUR_SUPABASE_PROJECT_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
```

Use values from:

```text
Supabase Dashboard > Project Settings > API
```

Use only the anon/publishable key. Never use a service role key in frontend JavaScript.

## Supabase Dashboard Settings

Enable email auth:

```text
Authentication > Providers > Email
```

Recommended during early testing:

- Enable Email provider.
- Use Email + Password.
- Decide whether to require email confirmation.

Set URLs:

```text
Authentication > URL Configuration
```

Add your development and deployed URLs, for example:

```text
http://localhost:5500/**
https://your-site.netlify.app/**
https://your-github-username.github.io/**
```

## How Auth Works

Registration:

```text
register.html
  -> sb.auth.signUp()
  -> Supabase Auth creates auth.users row
  -> database trigger handle_new_user()
  -> profiles row is created
```

Login:

```text
login.html
  -> sb.auth.signInWithPassword()
  -> dashboard.html
```

Protected pages:

```text
body data-protected="true"
  -> auth.js checks session
  -> loads profile
  -> redirects inactive/no-session users to login.html
```

Logout:

```text
sb.auth.signOut()
  -> login.html
```

## Testing Steps

1. Run Phase 3 SQL in Supabase.
2. Run Phase 4 RLS SQL in Supabase.
3. Configure Supabase URL and anon key in `js/supabase.js`.
4. Open `register.html`.
5. Register a test account.
6. Confirm a new row appears in `profiles`.
7. Open `login.html`.
8. Log in with the test account.
9. Confirm redirect to `dashboard.html`.
10. Open `profile.html`.
11. Update profile fields.
12. Confirm the update appears in Supabase `profiles`.

## Current Scope

This phase does not build the running record form, leaderboard, challenge, or admin dashboard yet. Those continue in later phases.
