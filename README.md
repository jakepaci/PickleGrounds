# Picklegrounds

Local pickleball facility management — court stacks, timers, and simple finances.

## Prerequisites

- **Node.js 20+** (including current LTS and v26)

## Quick start

```bash
# 1. Install dependencies
npm install

# 2. Create database & seed 3 courts
npm run db:migrate

# 3. Start dev (API on :3000, UI on :5173)
npm run dev
```

Open in your browser:

| View | URL |
|------|-----|
| **Player display** (projector) | http://localhost:5173/display |
| **Admin dashboard** | http://localhost:5173/admin |

On your facility LAN, replace `localhost` with the server's IP (e.g. `http://192.168.1.50:5173/display`).

## Production

```bash
npm run build
npm start
```

Serves UI + API on port **3000** (set `PORT` in `.env`).

## What to do first

1. **Admin** → register a few players (name + skill).
2. Add players to the **stack queue**.
3. **Courts** → pick 4 players, assign as Occupied or Reserved.
4. Open **Display** on a second screen — updates live via WebSocket.
5. **Finances** → click players to mark paid; mark court reservations from the Courts panel.
