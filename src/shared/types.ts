import type { ReservationRate } from './constants.js';

export const skillCategories = ['Beginner', 'Novice', 'Intermediate', 'Expert'] as const;
export type SkillCategory = (typeof skillCategories)[number];

export const courtStatuses = ['Reserved', 'Occupied', 'Idle'] as const;
export type CourtStatus = (typeof courtStatuses)[number];

export type { ReservationRate };

export interface Player {
  id: string;
  name: string;
  skill: SkillCategory;
  paid: boolean;
  createdAt: string;
  /** Set on stack entries when a foursome is locked together. */
  stackGroupId?: string | null;
}

export interface CourtPlayerSlot {
  slot: number;
  player: Player | null;
}

export interface Court {
  id: 1 | 2 | 3;
  status: CourtStatus;
  reservationPaid: boolean;
  reservationRate: ReservationRate | null;
  players: CourtPlayerSlot[];
  secondsRemaining: number;
  timerPaused: boolean;
  /** Open play: true once staff has started the max-court-time countdown. */
  timerStarted: boolean;
}

export interface AppState {
  players: Player[];
  courts: Court[];
  stack: Player[];
  finances: {
    totalIncome: number;
  };
  serverTime: string;
}

export type WsMessage =
  | { type: 'STATE_UPDATE'; payload: AppState }
  | { type: 'PING' }
  | { type: 'PONG' };
