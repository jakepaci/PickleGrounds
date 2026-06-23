import type { AppState } from '../../../shared/types';

/** Example state for local UI preview / Storybook — not used in production. */
export const MOCK_DISPLAY_STATE: AppState = {
  players: [],
  courts: [
    {
      id: 1,
      status: 'Occupied',
      reservationPaid: false,
      reservationRate: null,
      secondsRemaining: 830,
      timerPaused: false,
      timerStarted: true,
      players: [
        { slot: 0, player: { id: '1', name: 'Mia', skill: 'Intermediate', paid: true, createdAt: '2026-01-01T00:00:00.000Z' } },
        { slot: 1, player: { id: '2', name: 'Noah', skill: 'Novice', paid: true, createdAt: '2026-01-01T00:00:00.000Z' } },
        { slot: 2, player: { id: '3', name: 'Olive', skill: 'Expert', paid: true, createdAt: '2026-01-01T00:00:00.000Z' } },
        { slot: 3, player: { id: '4', name: 'Pete', skill: 'Beginner', paid: true, createdAt: '2026-01-01T00:00:00.000Z' } },
      ],
    },
    {
      id: 2,
      status: 'Occupied',
      reservationPaid: false,
      reservationRate: null,
      secondsRemaining: 754,
      timerPaused: false,
      timerStarted: true,
      players: [
        { slot: 0, player: { id: '5', name: 'Erin', skill: 'Intermediate', paid: true, createdAt: '2026-01-01T00:00:00.000Z' } },
        { slot: 1, player: { id: '6', name: 'Faye', skill: 'Novice', paid: true, createdAt: '2026-01-01T00:00:00.000Z' } },
        { slot: 2, player: { id: '7', name: 'Gabe', skill: 'Expert', paid: true, createdAt: '2026-01-01T00:00:00.000Z' } },
        { slot: 3, player: { id: '8', name: 'Hugo', skill: 'Beginner', paid: true, createdAt: '2026-01-01T00:00:00.000Z' } },
      ],
    },
    {
      id: 3,
      status: 'Occupied',
      reservationPaid: false,
      reservationRate: null,
      secondsRemaining: 612,
      timerPaused: false,
      timerStarted: true,
      players: [
        { slot: 0, player: { id: '9', name: 'Ivy', skill: 'Intermediate', paid: true, createdAt: '2026-01-01T00:00:00.000Z' } },
        { slot: 1, player: { id: '10', name: 'Jack', skill: 'Novice', paid: true, createdAt: '2026-01-01T00:00:00.000Z' } },
        { slot: 2, player: { id: '11', name: 'Kira', skill: 'Expert', paid: true, createdAt: '2026-01-01T00:00:00.000Z' } },
        { slot: 3, player: { id: '12', name: 'Leo', skill: 'Beginner', paid: true, createdAt: '2026-01-01T00:00:00.000Z' } },
      ],
    },
  ],
  stack: [
    { id: '13', name: 'Quinn', skill: 'Intermediate', paid: false, createdAt: '2026-01-01T00:00:00.000Z' },
    { id: '14', name: 'Ravi', skill: 'Novice', paid: false, createdAt: '2026-01-01T00:00:00.000Z' },
    { id: '15', name: 'Sofia', skill: 'Expert', paid: false, createdAt: '2026-01-01T00:00:00.000Z' },
    { id: '16', name: 'Tom', skill: 'Beginner', paid: false, createdAt: '2026-01-01T00:00:00.000Z' },
  ],
  finances: { totalIncome: 0 },
  serverTime: new Date().toISOString(),
};
