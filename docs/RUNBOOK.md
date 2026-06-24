# PickleGrounds — Facility Runbook

Short guide for staff running PickleGrounds at the facility. No coding tools required.

## Get the app onto the facility PC

You need the **whole project folder** (the one that contains `package.json` and a `scripts` folder). You do **not** copy only `src` or another subfolder.

### Option A — Download from GitHub (easiest)

1. Open **https://github.com/jakepaci/PickleGrounds**
2. Click the green **Code** button
3. Click **Download ZIP**
4. Extract the zip (e.g. to `C:\PickleGrounds`)
5. You should see a folder like `PickleGrounds-main` — you can rename it to `PickleGrounds`
6. Open that folder and confirm you see `package.json`, `scripts\`, and `docs\` in the same place

### Option B — USB from your installer

Your installer can copy the same folder to a USB drive. Put it anywhere on the PC (e.g. `C:\PickleGrounds`).

### Install Node.js (once per PC)

1. Go to **https://nodejs.org** and download the **LTS** Windows installer
2. Run it and accept the **default** options (this adds Node to PATH automatically)
3. Restart the PC, or close and reopen any terminal windows
4. Optional check: open Command Prompt and run `node -v` — you should see a version number

## First-time setup on the facility PC

Inside the project folder (where `package.json` lives):

1. Double-click **`scripts\install-once.bat`**
2. Wait until it says **Install complete** (this needs internet the first time)

## Bookmarks

Replace `YOUR-PC-IP` with the facility computer’s address (e.g. `192.168.1.50`).  
If everything runs on **one PC**, use `localhost` instead.

| Screen | URL |
|--------|-----|
| **Admin** (front desk) | `http://YOUR-PC-IP:3000/admin` |
| **Display** (TV / projector) | `http://YOUR-PC-IP:3000/display` |

Pin these in the browser. Use full-screen (F11) on the display.

## Starting the app

**Every day** (if not set to auto-start):

1. Open the project folder
2. Double-click **`scripts\start-picklegrounds.bat`**
3. Leave the window open — closing it stops the app

**After an update** (new zip from GitHub): run **`scripts\install-once.bat`** once, then start as usual.

The admin header should show a green **Live** indicator when connected.

## Ending the day

1. Open **Admin** → **Start new session**
2. Choose whether to clear the player roster or keep names for next time
3. Close the start window only after courts and queue are cleared

## Daily workflow

1. **Register** players (name + skill) if they are not already on the roster
2. Add players to the **Stack Queue** (drag from roster, **+ Stack**, or **+ Add group** for friends)
3. **Courts** → **Fill from Next Up**, drag players to slots, or reserve a court
4. When 4 players are on a court → **Start timer**
5. **Display** screen updates automatically — no refresh needed
6. When a game ends → **End game** (players return to the deck)

## Paid status

On the roster, click **Paid** / **Unpaid** to track who has paid for open play. This is for staff notes only — not a card payment system.

## Backup (important)

All data is stored in one file:

```
data\picklegrounds.db
```

Copy this file to a USB drive or cloud folder **weekly** (or nightly).  
If the computer fails, restoring this file restores your roster and history.

## What not to do

- Do **not** run `npm run dev` — that is for developers only
- Do **not** delete the `data` folder
- Do **not** run the app on two computers at once (one database, one server PC)

## Troubleshooting

| Problem | Try |
|---------|-----|
| `node` is not recognized | Install Node from nodejs.org (LTS installer, defaults); restart PC; run `install-once.bat` again |
| Display says Offline / not updating | Restart `start-picklegrounds.bat`; check **Live** in admin |
| Can’t open admin from another device | Same Wi‑Fi as facility PC; use PC’s IP; allow port 3000 in Windows Firewall |
| “Not built yet” when starting | Run `install-once.bat` again |
| App won’t start after Windows update | Run `install-once.bat` once more |

## One PC + TV (no Wi‑Fi)

Use the same computer for admin and display:

- Admin: `http://localhost:3000/admin`
- Display: `http://localhost:3000/display` on a second monitor or TV via HDMI

## Auto-start on boot (optional)

If PM2 is installed (`npm install -g pm2`):

```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

Ask your installer to set this up during handover.

## Support

Contact your installer for updates and technical issues.
