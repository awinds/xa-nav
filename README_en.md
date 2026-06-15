[中文](README.md) | English

# XA Nav

XA Nav is a bookmark navigation page based on React, Vite, Cloudflare Pages Functions, and Cloudflare D1. It supports a public navigation homepage, admin dashboard, smart autofill, friend links, backup/restore, and multilingual UI.

Author's blog: [https://www.xiaoa.me](https://www.xiaoa.me)

If this project helps you, please give it a `Star` ⭐.

![](screenshot.png)

![](screenshot2.png)

## Features

- Homepage supports local search, external search, category sidebar, parent/child category tabs, and bookmark cards
- After admin login, a quick-add bookmark button appears in the lower-right corner of the homepage; bookmarks can be added in a modal with smart site information autofill
- Admin dashboard supports bookmark management, category management, friend link management, system settings, and backup/restore
- Categories support Font Awesome icons, sorting, parent/child hierarchy, and private categories
- Private categories are only shown after admin login; logged-out users cannot retrieve private categories or their bookmarks
- Friend links support site name, icon, description, URL, sorting, and enabled status, and are displayed at the bottom of the homepage
- Login supports image captcha and Cloudflare Turnstile
- Login cookie lifetime can be configured by hour in the admin dashboard
- Site name, Logo URL, footer copyright, default language, and Favicon API prefix can be configured in the admin dashboard
- Smart bookmark autofill prioritizes saving the site's own icon; if no icon is found, it stays empty, and the UI uses the Favicon API prefix plus the domain when displaying it
- Workers AI can be enabled from the admin dashboard to automatically generate Meta information when description or tags cannot be retrieved; it is disabled by default
- Supports JSON backup import/export
- Supports browser bookmark HTML file import/export
- Supports Chinese and English UI

## Tech Stack

- Frontend: React 18, React Router, Vite, Tailwind CSS
- Backend: Cloudflare Pages Functions
- Database: Cloudflare D1
- Optional capabilities: Cloudflare Turnstile, Workers AI

## Local Development

### 1. Install dependencies

```bash
npm install
```

### 2. Start the frontend development server

```bash
npm run dev
```

Default frontend URL:

```text
http://localhost:5173
```

Vite is configured to proxy `/api` to the local Cloudflare Pages Functions service:

```text
http://localhost:8788
```

### 3. Start the local Cloudflare Pages Functions service

Cloudflare Pages Functions must be started through Wrangler. It is recommended to build the frontend first, then start Pages dev:

```bash
npm run build
npx wrangler pages dev dist --port 8788
```

Example API URL:

```text
http://localhost:8788/api/categories
```

When the frontend accesses `/api/*`, Vite proxies the request to this service.

If you modify backend API code under [functions/](functions/), it is recommended to restart Wrangler Pages dev to avoid the old process continuing to serve old logic.

### 4. Initialize the D1 database

First use [db/schema.sql](db/schema.sql) to create the D1 table structure. After the table structure exists, the application automatically writes the default configuration and default category when it first reads system configuration or categories.

```bash
npx wrangler d1 execute xa-nav-db --local --file db/schema.sql
```

The default admin account comes from environment variables. If not configured, it is:

```text
Username: admin
Password: admin123
```

### 3. Import sample data

```bash
npx wrangler d1 execute xa-nav-db --local --file db/seed.sql
```

## Build

```bash
npm run build
```

Build output is generated in:

```text
dist
```

Preview the build output locally:

```bash
npm run preview
```

## Cloudflare Pages Deployment

### 1. Fork this project

When you `Fork` this project, please also give it a `Star` ⭐.

### 2. Create a D1 database

Create a D1 database in the Cloudflare dashboard, for example:

```text
xa-nav-db
```

*Or* create it with a script:

```bash
# Create D1 database
wrangler d1 create xa-nav-db
```

### 3. Import the table structure

Manually copy `db/schema.sql` (*4 tables*) and import it in the D1 database console.

*Or* import it with a script:

```bash
# Initialize the database with schema and default data
wrangler d1 execute xa-nav-db --file=db/schema.sql
```

### 4. Cloudflare Pages build settings

1. Go to **Cloudflare Dashboard** > **Workers & Pages** > **Create application** > **Want to deploy Pages? Get started**
2. Connect your Git repository
3. Configure **Build settings**:
   - **Framework preset**: `None`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist` (current directory)
   - **Root directory**: `/` (repository root)

### 5. Configure environment variables

1. Go to **Cloudflare Dashboard** > **Workers & Pages** > **xa-nav**
2. Go to **Settings** > **Variables and Secrets**
- `ADMIN_USER`: admin username, defaults to `admin` if not configured
- `ADMIN_PASSWORD`: admin password, defaults to `admin123` if not configured
- `AUTH_SECRET`: (optional) signing secret for login cookies and image captcha
3. Go to **Settings** > **Bindings**
4. Add **D1 database**:
   - **Variable name**: `db`
   - **D1 database**: `xa-nav-db`
5. (Optional) Add **Workers AI**:
   - **Variable name**: `AI`
5. Go to **Deployments** > **All deployments**, then `Retry deployment` for the latest deployment (you must redeploy after binding the D1 database)

## System Configuration

The admin dashboard “System Configuration” page can maintain:

- Site name
- Site description
- Logo URL
- Footer copyright
- Default language
- Login cookie lifetime (hours)
- Image captcha switch
- Cloudflare Turnstile switch, Site Key, and Secret Key
- Favicon API prefix
- AI Meta switch

Notes:

- Turnstile Site Key and Secret Key are maintained in the admin dashboard; the Secret Key is never returned in plaintext by the configuration API
- When Turnstile is not fully configured, the login page does not display Turnstile and the backend does not enforce Turnstile verification
- If Logo URL is empty, the built-in default Logo is used
- The Favicon API prefix is directly concatenated with the domain after removing the protocol, for example:

```text
https://faviconsnap.com/api/favicon?url= + www.v2ex.com
https://icon.horse/icon/ + www.v2ex.com
```

- “Enable AI Meta” is disabled by default; even when enabled, the app prioritizes the site's own Meta data and only calls Workers AI when description or tags cannot be retrieved

## D1 Table Structure

Main data tables:

- `config`: platform configuration items, including site title, Logo, footer copyright, Favicon API, AI Meta switch, captcha, Turnstile, default language, and more
- `categories`: category directory, supporting parent/child categories, default category, private categories, and Font Awesome icons
- `bookmarks`: URL bookmarks, supporting Favicon, sorting, tags, and enabled status
- `friend_links`: friend links, supporting site icon, description, URL, sorting, and enabled status

## Common Commands

```bash
# Install dependencies
npm install

# Start Vite frontend
npm run dev

# Build frontend
npm run build

# Preview build output locally
npm run preview

# Start Cloudflare Pages Functions local service
npx wrangler pages dev dist --port 8788

# Test remote D1 / Workers AI and other Cloudflare resources if needed
npx wrangler pages dev dist --port 8788 --remote
```

## Directory Description

```text
src/                 Frontend source code
src/pages/           Page components
src/lib/             Frontend utilities and internationalization
src/images/          Static image assets
functions/           Cloudflare Pages Functions APIs
functions/api/       API routes
functions/lib/       Backend shared utilities
```
