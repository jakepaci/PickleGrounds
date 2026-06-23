export const COURT_COUNT = 3;
export const PLAYERS_PER_COURT = 4;
export const MATCH_DURATION_MS = 15 * 60 * 1000;

/** Open play session fee per player (PHP) */
export const OPEN_PLAY_FEE = 100;

/** Court reservation — 1-hour blocks */
export const RESERVATION_DURATION_HOURS = 1;
export const RESERVATION_REGULAR_RATE = 160;
export const RESERVATION_PEAK_RATE = 300;

export const reservationRates = ['regular', 'peak'] as const;
export type ReservationRate = (typeof reservationRates)[number];

export function getReservationHourlyRate(rate: ReservationRate): number {
  return rate === 'peak' ? RESERVATION_PEAK_RATE : RESERVATION_REGULAR_RATE;
}

export function getReservationFee(rate: ReservationRate): number {
  return getReservationHourlyRate(rate) * RESERVATION_DURATION_HOURS;
}

export function formatPeso(amount: number): string {
  return `₱${amount.toLocaleString('en-PH')}`;
}

/** @deprecated Use OPEN_PLAY_FEE */
export const DEFAULT_SESSION_FEE = OPEN_PLAY_FEE;
