# Save accounts in a database (Supabase)

Supabase hosts the database and handles sign-in. It has a free tier. Passwords are hashed on Supabase's servers, and each person can only read their own rows.

## 1. Create the project

1. Go to supabase.com, sign in, and choose **New project**.
2. Pick a name and a database password (save it somewhere). Wait about two minutes.

## 2. Create the tables

1. In the project, open **SQL Editor** and choose **New query**.
2. Paste the whole contents of `supabase/schema.sql` and press **Run**.
3. It should say "Success. No rows returned".

## 3. Connect the site

1. Open **Project Settings > API**. Copy the **Project URL** and the **anon public** key.
2. In your project folder, copy `.env.example` to a new file named `.env`.
3. In `.env`, add these two lines with your own values:

```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

Never use the `service_role` key here. The anon key is meant to be public; the policies in `schema.sql` are what protect the data.

4. In PowerShell: `npm install`, then stop and restart `npm run dev`. Vite only reads `.env` when it starts.

## 4. Choose how sign-up confirms email

**Authentication > Providers > Email > Confirm email**

- **On** (safer for a public site): new people get a confirmation link, then sign in.
- **Off** (easier while testing): people are signed in immediately.

Both work. With it on, set **Authentication > URL Configuration > Site URL** to your site address (`http://localhost:5173` while testing) so the links come back to you.

For password reset links, add your site address with `/account.html` under **Redirect URLs** in the same place.

## 5. Check it works

Sign up on the site, then open **Table Editor** in Supabase. You should see a row in `profiles` and one in `libraries`. Users appear under **Authentication > Users**.

## Deploying

Set the same two `VITE_` variables in your host (Netlify, Vercel, Cloudflare Pages) and add your live address to Supabase's Site URL and Redirect URLs.

## Without the keys

Leave the variables unset and the site keeps using browser-only accounts, as before.

## Notes

- Uploaded documents are stored inside the library row, so the 1 MB per file and 3 MB total limits still apply. For larger files, move them to Supabase Storage later.
- Free projects pause after a week with no traffic. They resume from the dashboard.
- The free tier's built-in email sender is rate limited. Add your own SMTP under **Authentication > SMTP Settings** before a public launch.
