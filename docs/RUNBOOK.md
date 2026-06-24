# PickleGrounds — Facility Runbook

Short guide for staff running PickleGrounds at the facility. No coding tools required.

## Bookmarks

Replace `YOUR-PC-IP` with the facility computer’s address (e.g. `192.168.1.50`).  
If everything runs on **one PC**, use `localhost` instead.

| Screen | URL |
|--------|-----|
| **Admin** (front desk) | `http://YOUR-PC-IP:3000/admin` |
| **Display** (TV / projector) | `http://YOUR-PC-IP:3000/display` |

Pin these in the browser. Use full-screen (F11) on the display.

## Starting the app

**First time only** (or after an update from your installer):

1. Double-click `scripts\install-once.bat`
2. Wait until it says “Install complete”

**Every day** (if not set to auto-start):

1. Double-click `scripts\start-picklegrounds.bat`
2. Leave the window open — closing it stops the app

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
