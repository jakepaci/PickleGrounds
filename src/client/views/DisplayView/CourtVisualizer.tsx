import type { CourtPlayerSlot } from '../../../shared/types';

const ORANGE = '#EE6E2B';
const LINE = '#FFFFFF';

/** Wide canvas with gentle perspective — subtle slope, not sharp trapezoids */
const VB_W = 600;
const VB_H = 210;

const TOP = 8;
const BOTTOM = 202;
const KITCHEN_TOP = 68;
const KITCHEN_BOTTOM = 142;
const CENTER = VB_W / 2;

const TOP_LEFT = 52;
const TOP_RIGHT = 548;
const BOTTOM_LEFT = 44;
const BOTTOM_RIGHT = 556;

function leftX(y: number): number {
  const t = (y - TOP) / (BOTTOM - TOP);
  return TOP_LEFT + (BOTTOM_LEFT - TOP_LEFT) * t;
}

function rightX(y: number): number {
  const t = (y - TOP) / (BOTTOM - TOP);
  return TOP_RIGHT + (BOTTOM_RIGHT - TOP_RIGHT) * t;
}

function PlayerCell({ text }: { text: string }) {
  const isPlaceholder = text.startsWith('Player ');
  const sizeClass =
    text.length > 12
      ? 'text-[clamp(0.9rem,1.55vw,1.6rem)]'
      : text.length > 9
        ? 'text-[clamp(1rem,1.85vw,1.85rem)]'
        : 'text-[clamp(1.1rem,2.1vw,2.1rem)]';

  return (
    <div className="flex min-w-0 min-h-0 items-center justify-center overflow-hidden text-center">
      <span
        className={`block w-full truncate font-bold leading-tight ${sizeClass} ${
          isPlaceholder ? 'text-white/75' : 'text-white'
        }`}
      >
        {text}
      </span>
    </div>
  );
}

interface CourtVisualizerProps {
  players: CourtPlayerSlot[];
  timer: string;
  className?: string;
}

/**
 * Wireframe court on seamless green board — only the kitchen is filled.
 * Lines stretch to fill the cell; labels render as HTML so they stay crisp.
 */
export function CourtVisualizer({ players, timer, className = '' }: CourtVisualizerProps) {
  const playerLabel = (slot: number) => {
    const p = players.find((s) => s.slot === slot)?.player?.name;
    return p ?? `Player ${slot + 1}`;
  };

  const kitchen = `
    M ${leftX(KITCHEN_TOP)} ${KITCHEN_TOP}
    L ${rightX(KITCHEN_TOP)} ${KITCHEN_TOP}
    L ${rightX(KITCHEN_BOTTOM)} ${KITCHEN_BOTTOM}
    L ${leftX(KITCHEN_BOTTOM)} ${KITCHEN_BOTTOM} Z`;

  const perimeter = `
    M ${leftX(TOP)} ${TOP}
    L ${rightX(TOP)} ${TOP}
    L ${rightX(BOTTOM)} ${BOTTOM}
    L ${leftX(BOTTOM)} ${BOTTOM} Z`;

  const sw = 2.75;

  return (
    <div className={`relative ${className}`} aria-label="Pickleball court">
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        className="absolute inset-0 h-full w-full"
        preserveAspectRatio="none"
        aria-hidden
      >
        <path d={kitchen} fill={ORANGE} />

        <path d={perimeter} fill="none" stroke={LINE} strokeWidth={sw} strokeLinejoin="round" />

        <line
          x1={leftX(KITCHEN_TOP)}
          y1={KITCHEN_TOP}
          x2={rightX(KITCHEN_TOP)}
          y2={KITCHEN_TOP}
          stroke={LINE}
          strokeWidth={sw}
        />
        <line
          x1={leftX(KITCHEN_BOTTOM)}
          y1={KITCHEN_BOTTOM}
          x2={rightX(KITCHEN_BOTTOM)}
          y2={KITCHEN_BOTTOM}
          stroke={LINE}
          strokeWidth={sw}
        />

        <line x1={CENTER} y1={TOP} x2={CENTER} y2={KITCHEN_TOP} stroke={LINE} strokeWidth={sw} />
        <line
          x1={CENTER}
          y1={KITCHEN_BOTTOM}
          x2={CENTER}
          y2={BOTTOM}
          stroke={LINE}
          strokeWidth={sw}
        />
      </svg>

      <div className="pointer-events-none absolute inset-0 flex flex-col font-sans">
        <div className="flex-[0.32] min-h-0 grid grid-cols-2 gap-x-3 px-[8%] pt-[5%]">
          <PlayerCell text={playerLabel(0)} />
          <PlayerCell text={playerLabel(2)} />
        </div>

        <div className="flex-[0.36] shrink-0" aria-hidden />

        <div className="flex-[0.32] min-h-0 grid grid-cols-2 gap-x-3 px-[8%] pb-[5%]">
          <PlayerCell text={playerLabel(1)} />
          <PlayerCell text={playerLabel(3)} />
        </div>

        <p
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-bold tabular-nums tracking-tight text-white text-[clamp(1.35rem,2.4vw,2.375rem)] leading-none"
        >
          {timer}
        </p>
      </div>
    </div>
  );
}

export const FLOOR_CLIP = 'polygon(2.5% 0%, 97.5% 0%, 100% 100%, 0% 100%)';
