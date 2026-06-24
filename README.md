# Picklegrounds

Local pickleball facility management — court stacks, timers, and player roster.

## Prerequisites

- **Node.js 20+** ([nodejs.org](https://nodejs.org))

---

## Facility install (production)

For the computer that runs at the facility. **No Cursor, VS Code, or Git required.**

### 1. Get the project

**From GitHub (recommended):**

1. Open [github.com/jakepaci/PickleGrounds](https://github.com/jakepaci/PickleGrounds)
2. Click **Code** → **Download ZIP**
3. Extract the zip (e.g. to `C:\PickleGrounds`)
4. Use the extracted folder as-is — it is the project root. You should see `package.json` and `scripts\` together in that folder (GitHub may name it `PickleGrounds-main`; renaming to `PickleGrounds` is fine).

**Other options:** `git clone https://github.com/jakepaci/PickleGrounds.git`, or copy the same folder from a USB stick your installer provides.

### 2. Install Node.js

Download the **LTS** installer from [nodejs.org](https://nodejs.org), run with defaults, then restart the PC (or open a new terminal). Test with `node -v`.

### 3. Install and run PickleGrounds

Inside the project folder:

1. Double-click **`scripts\install-once.bat`** (once, or again after updates)
2. Double-click **`scripts\start-picklegrounds.bat`** (each day, unless auto-start is configured)

Open in a browser:

| View | URL |
|------|-----|
| **Admin** | http://localhost:3000/admin |
| **Display** (TV) | http://localhost:3000/display |

On other devices on the same Wi‑Fi, replace `localhost` with the facility PC’s IP  
(e.g. `http://192.168.1.50:3000/display`).

Staff instructions: **[docs/RUNBOOK.md](docs/RUNBOOK.md)**

### Command line (same result)

```bash
npm install
copy .env.example .env    # Windows — use cp on Mac/Linux
npm run setup             # migrate + build
npm run prod              # start production server
```

Configuration is in **`.env`** (created from `.env.example`).  
`NODE_ENV=production` is required so the built UI is served on port 3000.

### Auto-start (optional)

With [PM2](https://pm2.keymetrics.io/) installed globally:

```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

---

## Developer quick start

For building and changing the app:

```bash
npm install
npm run db:migrate
npm run dev
```

| View | Dev URL |
|------|---------|
| Admin | http://localhost:5173/admin |
| Display | http://localhost:5173/display |

Dev mode runs the UI on **5173** (Vite) and API on **3000**.  
**Do not use `npm run dev` at the facility.**

### Build production artifacts

```bash
npm run build
npm run prod
```

---

## Daily operations (staff)

1. **Admin** → register players (name + skill)
2. Add players to the **Stack Queue**
3. **Courts** → fill from deck, assign players, start timer
4. **Display** on a second screen — live updates via WebSocket
5. End of day → **Start new session**

See [docs/RUNBOOK.md](docs/RUNBOOK.md) for the full facility guide.

---

## Data & backup

- Database file: `data/picklegrounds.db` (SQLite)
- Back up this file regularly — it contains roster, queue, and session state

---

## Scripts reference

| Script | Purpose |
|--------|---------|
| `scripts/install-once.bat` | Install, migrate DB, build (facility PC, first time) |
| `scripts/start-picklegrounds.bat` | Run production server |
| `npm run dev` | Developer mode only |
| `npm run build` | Build UI + server |
| `npm run prod` | Production server (reads `.env`) |
| `npm run db:migrate` | Apply database migrations |
