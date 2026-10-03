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

### Password Management

Email password recovery has been removed. Members change their own password in
Profile using `sb.auth.updateUser`. Admins use the password button beside each
member in Admin, including inactive members and other admins.

The admin action calls `/.netlify/functions/mh-admin-password`. The server
validates the bearer token with Supabase, reads the caller's profile, and requires
`role = admin` and `status = active` before updating the target Auth account.
Passwords are never stored in profiles or returned by the endpoint.

Before deploying, set the Netlify environment variable `MH_SUPABASE_SECRET_KEY`
to a Supabase secret key or legacy service_role key from this same project.
Give it Functions scope and redeploy. Do not put this key in HTML, browser JS,
or the repository. `MH_SUPABASE_URL` is optional and defaults to the existing
project URL. No SMTP configuration is required for these password actions.

Deploy both the `mh` files and `netlify/functions/mh-admin-password.mjs`.
Test setting a member password in Admin, logging in as that member, changing it
in Profile, and logging in again. Test rejection of non-admin and inactive-admin
tokens. Run `node --test mh/tests/admin-password.test.mjs` for server checks.

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
