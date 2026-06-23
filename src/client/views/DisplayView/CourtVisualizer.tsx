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

function quadrantPos(
  y1: number,
  y2: number,
  side: 'left' | 'right',
  vertical: 'top' | 'bottom',
  inset = 0.22,
): { x: number; y: number } {
  const yFrac = vertical === 'top' ? 0.38 : 0.62;
  const y = y1 + (y2 - y1) * yFrac;
  const left = leftX(y);
  const right = rightX(y);
  const x =
    side === 'left'
      ? left + (CENTER - left) * inset
      : CENTER + (right - CENTER) * (1 - inset);
  return { x, y };
}

function toPct(x: number, y: number) {
  return { left: `${(x / VB_W) * 100}%`, top: `${(y / VB_H) * 100}%` };
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

  const kitchenMidY = (KITCHEN_TOP + KITCHEN_BOTTOM) / 2;

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

  const p0 = quadrantPos(TOP, KITCHEN_TOP, 'left', 'top');
  const p2 = quadrantPos(TOP, KITCHEN_TOP, 'right', 'top');
  const p1 = quadrantPos(KITCHEN_BOTTOM, BOTTOM, 'left', 'bottom');
  const p3 = quadrantPos(KITCHEN_BOTTOM, BOTTOM, 'right', 'bottom');

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

      <div className="pointer-events-none absolute inset-0 font-sans">
        <PlayerName pos={p0} text={playerLabel(0)} align="left" />
        <PlayerName pos={p2} text={playerLabel(2)} align="right" />
        <PlayerName pos={p1} text={playerLabel(1)} align="left" />
        <PlayerName pos={p3} text={playerLabel(3)} align="right" />

        <p
          className="absolute font-bold tabular-nums tracking-tight text-white text-[clamp(1.35rem,2.4vw,2.375rem)] leading-none"
          style={{
            left: '50%',
            top: `${(kitchenMidY / VB_H) * 100}%`,
            transform: 'translate(-50%, -50%)',
          }}
        >
          {timer}
        </p>
      </div>
    </div>
  );
}

function PlayerName({
  pos,
  text,
  align,
}: {
  pos: { x: number; y: number };
  text: string;
  align: 'left' | 'right';
}) {
  const isPlaceholder = text.startsWith('Player ');
  const { left, top } = toPct(pos.x, pos.y);

  return (
    <p
      className={`absolute max-w-[42%] truncate font-semibold text-[clamp(0.7rem,1.15vw,1.25rem)] leading-tight ${
        isPlaceholder ? 'text-white/75' : 'text-white'
      } ${align === 'left' ? 'text-left' : 'text-right'}`}
      style={{
        left,
        top,
        transform: align === 'left' ? 'translateY(-50%)' : 'translate(-100%, -50%)',
      }}
    >
      {text}
    </p>
  );
}

export const FLOOR_CLIP = 'polygon(2.5% 0%, 97.5% 0%, 100% 100%, 0% 100%)';
