import { db } from '../db/client.js';
import { paymentEvents, players, stackQueue } from '../db/schema.js';
import { COURT_COUNT } from '../../shared/constants.js';
import { endCourtSession } from './court-session.js';

export function startNewSession(options: { removePlayers?: boolean } = {}) {
  for (let courtId = 1; courtId <= COURT_COUNT; courtId++) {
    endCourtSession(courtId);
  }

  db.delete(stackQueue).run();

  if (options.removePlayers) {
    db.update(paymentEvents).set({ playerId: null }).run();
    db.delete(players).run();
  } else {
    db.update(players).set({ paid: false }).run();
  }
}
