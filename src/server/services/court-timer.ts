import { db } from '../db/client.js';
import { courts } from '../db/schema.js';
import { lte, isNotNull, and } from 'drizzle-orm';
import { broadcastState } from './broadcast.js';
import { endCourtSession, processOpenPlayCourtEnd } from './court-session.js';

export function startCourtTimerLoop() {
  setInterval(() => {
    const now = new Date();
    const expired = db
      .select()
      .from(courts)
      .where(and(isNotNull(courts.matchEndsAt), lte(courts.matchEndsAt, now)))
      .all();

    if (expired.length > 0) {
      for (const court of expired) {
        if (court.status === 'Occupied') {
          processOpenPlayCourtEnd(court.id);
        } else {
          endCourtSession(court.id);
        }
      }
    }

    broadcastState();
  }, 1000);
}
