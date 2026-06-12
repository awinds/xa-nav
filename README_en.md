# XA Nav

XA Nav is a bookmark/navigation web app built with React, Vite, Cloudflare Pages Functions, and Cloudflare D1. It includes a public navigation homepage, an admin panel, smart site info autofill, friend links, backup/restore, and multilingual UI.

中文文档: [README.md](README.md)

## Features

- Homepage with local search, external search, category sidebar, parent/child category tabs, and bookmark cards
- Admin-only quick add bookmark button on the homepage, with a modal for adding bookmarks and smart site info autofill
- Admin panel for bookmark management, category management, friend link management, system settings, and backup/restore
- Categories with Font Awesome icons, sorting, parent/child structure, and private visibility
- Private categories are only visible after admin login; logged-out users cannot fetch private categories or their bookmarks
- Friend links with site name, icon, description, URL, sort order, and enabled state; displayed at the bottom of the homepage
- Login supports image captcha and Cloudflare Turnstile
- Login cookie lifetime can be configured in hours from the admin panel
- Site name, Logo URL, footer copyright, default language, and Favicon API prefix are configurable
- Default logo is bundled from [src/images/logo.png](src/images/logo.png)
- Smart bookmark autofill stores the site's own favicon when found; if no favicon is found, the stored value stays empty and the UI falls back to the configured Favicon API prefix plus hostname
- Optional Workers AI fallback for generating missing meta description or tags; disabled by default
- JSON backup import/export
- Browser bookmark HTML import/export
- Chinese and English UI

## Tech Stack

- Frontend: React 18, React Router, Vite, Tailwind CSS
- Backend: Cloudflare Pages Functions
- Database: Cloudflare D1
- Optional services: Cloudflare Turnstile, Workers AI

## Local Development

### 1. Install dependencies

```bash
npm install
```

### 2. Start the frontend dev server

```bash
npm run dev
```

Default frontend URL:

```text
http://localhost:5173
```

Vite proxies `/api` requests to the local Cloudflare Pages Functions service:

```text
http://localhost:8788
```

### 3. Start Cloudflare Pages Functions locally

Cloudflare Pages Functions are started through Wrangler. Build the frontend first, then start Pages dev:

```bash
npm run build
npx wrangler pages dev dist --port 8788
```

Example API URL:

```text
http://localhost:8788/api/categories
```

Frontend requests to `/api/*` are proxied to this service by Vite.

If you change backend API code under [functions/](functions/), restart Wrangler Pages dev to avoid an old process continuing to serve stale logic.

### 4. Initialize the D1 database

Create the D1 table structure with [db/schema.sql](db/schema.sql) first. Once the tables exist, the app automatically inserts the default config and default category on the first config or category API access. The seed endpoint is no longer needed.

Local example:

```bash
npx wrangler d1 execute xa_nav --local --file db/schema.sql
```

The default admin account comes from environment variables. If not configured, the fallback is:

```text
Username: admin
Password: admin123
```

`AUTH_SECRET` is optional. If it is not configured, the app uses a built-in strong random default. You can override it through Cloudflare Pages environment variables in production.

## Build

```bash
npm run build
```

Build output directory:

```text
dist
```

Preview the production build locally:

```bash
npm run preview
```

## Cloudflare Pages Deployment

### 1. Create a D1 database

Create a D1 database in the Cloudflare dashboard, for example:

```text
xa_nav
```

Bind it to the Cloudflare Pages project:

```text
Binding name: D1
Database: xa_nav
```

If you manage bindings through Wrangler, confirm the D1 binding in [wrangler.toml](wrangler.toml):

```toml
d1_databases = [
  { binding = "D1", database_name = "xa_nav" }
]
```

### 2. Configure Workers AI binding (optional)

Workers AI is used only when smart bookmark autofill cannot get a description or tags. The feature is disabled by default in the admin panel.

[wrangler.toml](wrangler.toml) already includes an example binding:

```toml
[ai]
binding = "AI"
```

If you do not need AI meta generation, keep the admin switch disabled.

### 3. Cloudflare Pages build settings

Configure the Pages project with:

```text
Build command: npm run build
Build output directory: dist
Functions directory: functions
```

### 4. Configure environment variables

Required variables:

- `ADMIN_USER`: admin username. Defaults to `admin` if not configured.
- `ADMIN_PASSWORD`: admin password. Defaults to `admin123` if not configured.

Optional variables. If not configured, the app uses a built-in strong random default:

- `AUTH_SECRET`: signing secret for login cookies and image captcha tokens.

The `[vars]` section in [wrangler.toml](wrangler.toml) only keeps the admin username and password as a local development example. For production, configure variables in the Cloudflare Pages dashboard if you need to override the defaults.

### 5. Initialize the production database

Before or after deployment, execute [db/schema.sql](db/schema.sql) in Cloudflare D1 to create the table structure. After the tables exist, the first site or admin API access automatically inserts the default system config and default category.

You can run [db/schema.sql](db/schema.sql) from the Cloudflare dashboard D1 SQL page, or use Wrangler:

```bash
npx wrangler d1 execute xa_nav --remote --file db/schema.sql
```

## System Settings

The admin panel system settings can manage:

- Site name
- Site description
- Logo URL
- Footer copyright
- Default language
- Login cookie lifetime in hours
- Image captcha switch
- Cloudflare Turnstile switch, Site Key, and Secret Key
- Favicon API prefix
- AI meta generation switch

Notes:

- Turnstile Site Key and Secret Key are maintained in the admin panel. The Secret Key is never returned in plaintext by the config API.
- If Turnstile is not fully configured, the login page will not show Turnstile and the backend will not require Turnstile verification.
- If Logo URL is empty, the bundled default logo is used.
- The Favicon API prefix is concatenated directly with the hostname without protocol, for example:

```text
https://faviconsnap.com/api/favicon?url= + www.v2ex.com
https://icon.horse/icon/ + www.v2ex.com
```

- "AI Meta" is disabled by default. Even when enabled, the app first uses the site's own meta data and only calls Workers AI when description or tags are missing.

## D1 Tables

Main tables:

- `config`: platform configuration, including site title, logo, footer copyright, Favicon API, AI Meta switch, captcha, Turnstile, default language, and more
- `categories`: categories with parent/child structure, default category, private category, and Font Awesome icon support
- `bookmarks`: bookmarks with favicon, sort order, tags, and enabled state
- `friend_links`: friend links with site icon, description, URL, sort order, and enabled state

## Common Commands

```bash
# Install dependencies
npm install

# Start Vite frontend
npm run dev

# Build frontend
npm run build

# Preview production build locally
npm run preview

# Start Cloudflare Pages Functions locally
npx wrangler pages dev dist --port 8788

# Test remote Cloudflare resources such as D1 / Workers AI
npx wrangler pages dev dist --port 8788 --remote
```

## Directory Structure

```text
src/                 Frontend source
src/pages/           Page components
src/lib/             Frontend utilities and i18n
src/images/          Static image assets
functions/           Cloudflare Pages Functions
functions/api/       API routes
functions/lib/       Backend shared utilities
```
