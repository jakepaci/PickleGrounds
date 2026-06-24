import { db } from '../db/client.js';
import { paymentEvents, players, stackQueue } from '../db/schema.js';
import { COURT_COUNT } from '../../shared/constants.js';
import { endCourtSession } from './court-session.js';

/** Clear courts, deck, and wipe the entire player roster for a fresh facility day. */
export function startNewSession() {
  for (let courtId = 1; courtId <= COURT_COUNT; courtId++) {
    endCourtSession(courtId);
  }

  db.delete(stackQueue).run();
  db.update(paymentEvents).set({ playerId: null }).run();
  db.delete(players).run();
}
