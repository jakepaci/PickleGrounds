import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { db } from './client.js';
import { courts, courtPlayers, finances } from './schema.js';
import { COURT_COUNT, PLAYERS_PER_COURT } from '../../shared/constants.js';

const dbPath = process.env.DB_PATH ?? './data/picklegrounds.db';
const dir = path.dirname(dbPath);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

const sqlite = new Database(dbPath);
const migrationsFolder = path.join(import.meta.dirname, 'migrations');
migrate(drizzle(sqlite), { migrationsFolder });

const existingCourts = db.select().from(courts).all();
if (existingCourts.length === 0) {
  for (let id = 1; id <= COURT_COUNT; id++) {
    db.insert(courts).values({ id, status: 'Idle', reservationPaid: false }).run();
    for (let slot = 0; slot < PLAYERS_PER_COURT; slot++) {
      db.insert(courtPlayers).values({ courtId: id, slot, playerId: null }).run();
    }
  }
  db.insert(finances).values({ id: 1, totalIncome: 0 }).run();
  console.log('Seeded courts and finances.');
}

console.log('Database migrated and ready.');
