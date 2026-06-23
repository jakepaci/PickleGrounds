import { useMemo, useState } from 'react';
import { api } from '../../lib/api';
import { useAppStore } from '../../store/appStore';
import { skillCategories, type Player, type SkillCategory } from '../../../shared/types';

const panelClass = 'bg-white rounded-lg border border-black/10 p-4 shadow-sm';
const inputClass =
  'px-3 py-2 rounded bg-white border border-black/15 text-sm text-black placeholder:text-black/35 focus:outline-none focus:border-pickle-green focus:ring-1 focus:ring-pickle-green/40';

type PaidFilter = 'all' | 'unpaid' | 'paid';
type SkillFilter = 'all' | SkillCategory;

const skillBadgeClass: Record<SkillCategory, string> = {
  Beginner: 'bg-pickle-green/12 text-pickle-green border-pickle-green/25',
  Novice: 'bg-sky-100 text-sky-800 border-sky-200',
  Intermediate: 'bg-pickle-orange/12 text-pickle-orange border-pickle-orange/30',
  Expert: 'bg-black/8 text-black/75 border-black/15',
};

export function PlayerPanel() {
  const players = useAppStore((s) => s.state.players);
  const courts = useAppStore((s) => s.state.courts);
  const stack = useAppStore((s) => s.state.stack);
  const stackIds = useMemo(() => new Set(stack.map((p) => p.id)), [stack]);
  const courtByPlayerId = useMemo(() => {
    const map = new Map<string, 1 | 2 | 3>();
    for (const court of courts) {
      for (const { player } of court.players) {
        if (player) map.set(player.id, court.id);
      }
    }
    return map;
  }, [courts]);
  const [name, setName] = useState('');
  const [skill, setSkill] = useState<SkillCategory>('Beginner');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [paidFilter, setPaidFilter] = useState<PaidFilter>('all');
  const [skillFilter, setSkillFilter] = useState<SkillFilter>('all');

  const stackOrder = useMemo(() => {
    const map = new Map<string, number>();
    stack.forEach((p, index) => map.set(p.id, index));
    return map;
  }, [stack]);

  const unpaidCount = players.filter((p) => !p.paid).length;

  const filteredPlayers = useMemo(() => {
    const q = search.trim().toLowerCase();
    const priority = (id: string) => {
      if (courtByPlayerId.has(id)) return 2;
      if (stackIds.has(id)) return 1;
      return 0;
    };

    return [...players]
      .filter((p) => {
        if (paidFilter === 'unpaid' && p.paid) return false;
        if (paidFilter === 'paid' && !p.paid) return false;
        if (skillFilter !== 'all' && p.skill !== skillFilter) return false;
        if (!q) return true;
        return p.name.toLowerCase().includes(q) || p.skill.toLowerCase().includes(q);
      })
      .sort((a, b) => {
        const priorityDiff = priority(a.id) - priority(b.id);
        if (priorityDiff !== 0) return priorityDiff;

        if (stackIds.has(a.id) && stackIds.has(b.id)) {
          return (stackOrder.get(a.id) ?? 0) - (stackOrder.get(b.id) ?? 0);
        }

        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [players, search, paidFilter, skillFilter, stackIds, stackOrder, courtByPlayerId]);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/api/players', { name, skill });
      setName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to register');
    } finally {
      setLoading(false);
    }
  }

  async function togglePaid(player: Player) {
    try {
      if (player.paid) {
        await api.post(`/api/players/${player.id}/mark-unpaid`);
      } else {
        await api.post(`/api/players/${player.id}/mark-paid`);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update paid status');
    }
  }

  async function addToStack(playerId: string) {
    try {
      await api.post(`/api/players/${playerId}/stack`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed');
    }
  }

  async function removePlayer(playerId: string) {
    if (!confirm('Remove this player?')) return;
    await api.delete(`/api/players/${playerId}`);
  }

  return (
    <div className="flex flex-col gap-4">
      <section className={`${panelClass} shrink-0`}>
        <h2 className="text-lg font-semibold mb-3 text-black">Register player</h2>
        <form onSubmit={handleRegister} className="flex flex-wrap gap-2">
          <input
            type="text"
            placeholder="Player name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={`flex-1 min-w-[140px] ${inputClass}`}
          />
          <select
            value={skill}
            onChange={(e) => setSkill(e.target.value as SkillCategory)}
            className={inputClass}
          >
            {skillCategories.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="px-4 py-2 rounded bg-pickle-green hover:bg-pickle-green/90 disabled:opacity-50 text-sm font-semibold text-white"
          >
            Register
          </button>
        </form>
        {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
      </section>

      <section
        className={`${panelClass} flex flex-col min-h-0 overflow-hidden`}
        style={{ height: 'min(420px, calc(100vh - 14rem))' }}
      >
        <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 mb-3">
          <h2 className="text-lg font-semibold text-black">Player roster</h2>
          <p className="text-xs text-black/45 tabular-nums">
            {players.length} player{players.length !== 1 ? 's' : ''}
            {unpaidCount > 0 && ` · ${unpaidCount} unpaid`}
          </p>
        </div>

        <input
          type="search"
          placeholder="Search by name or skill…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={`shrink-0 w-full mb-2 ${inputClass}`}
        />

        <div className="shrink-0 flex flex-wrap gap-1 mb-2">
          {(['all', 'unpaid', 'paid'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setPaidFilter(f)}
              className={`px-2.5 py-1 rounded text-xs font-semibold capitalize transition-colors ${
                paidFilter === f
                  ? 'bg-pickle-green text-white'
                  : 'bg-black/5 text-black/60 hover:bg-black/10'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="shrink-0 flex flex-wrap gap-1 mb-3">
          <button
            type="button"
            onClick={() => setSkillFilter('all')}
            className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
              skillFilter === 'all'
                ? 'bg-black/75 text-white'
                : 'bg-black/5 text-black/60 hover:bg-black/10'
            }`}
          >
            All skills
          </button>
          {skillCategories.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSkillFilter(s)}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors border ${
                skillFilter === s
                  ? skillBadgeClass[s]
                  : 'bg-black/5 text-black/60 border-transparent hover:bg-black/10'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain space-y-1.5 -mx-1 px-1 pb-1">
          {players.length === 0 ? (
            <p className="text-black/45 text-sm py-4 text-center">No players yet.</p>
          ) : filteredPlayers.length === 0 ? (
            <p className="text-black/45 text-sm py-4 text-center">No matches.</p>
          ) : (
            filteredPlayers.map((p) => (
              <PlayerRow
                key={p.id}
                player={p}
                inStack={stackIds.has(p.id)}
                courtId={courtByPlayerId.get(p.id)}
                onTogglePaid={() => togglePaid(p)}
                onAddToStack={() => addToStack(p.id)}
                onRemove={() => removePlayer(p.id)}
              />
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function SkillBadge({ skill, className = '' }: { skill: SkillCategory; className?: string }) {
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-[10px] sm:text-xs font-semibold border shrink-0 ${skillBadgeClass[skill]} ${className}`}
    >
      {skill}
    </span>
  );
}

function PlayerRow({
  player,
  inStack,
  courtId,
  onTogglePaid,
  onAddToStack,
  onRemove,
}: {
  player: Player;
  inStack: boolean;
  courtId?: 1 | 2 | 3;
  onTogglePaid: () => void;
  onAddToStack: () => void;
  onRemove: () => void;
}) {
  const onCourt = courtId != null;
  const canStack = !inStack && !onCourt;

  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${
        onCourt
          ? 'bg-pickle-green/8 border-pickle-green/30'
          : player.paid
            ? 'bg-pickle-green/10 border-pickle-green/35'
            : 'bg-white border-black/10'
      }`}
    >
      <span
        className={`w-2 h-2 rounded-full shrink-0 ${
          onCourt ? 'bg-pickle-green' : player.paid ? 'bg-pickle-green' : 'bg-black/25'
        }`}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`min-w-0 truncate font-medium ${
              onCourt || player.paid ? 'text-pickle-green' : 'text-black'
            }`}
          >
            {player.name}
          </span>
          {onCourt && (
            <span className="text-[10px] font-bold uppercase tracking-wide text-pickle-green shrink-0">
              Court {courtId}
            </span>
          )}
          {!onCourt && inStack && (
            <span className="text-[10px] font-bold uppercase tracking-wide text-pickle-orange shrink-0">
              In deck
            </span>
          )}
        </div>
      </div>

      <div className="shrink-0 min-w-[5.25rem] sm:min-w-[6rem] flex justify-end">
        <SkillBadge skill={player.skill} />
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={onTogglePaid}
          className={`px-2.5 py-0.5 rounded text-xs font-semibold transition-colors ${
            player.paid
              ? 'bg-pickle-green/20 text-pickle-green border border-pickle-green/40 hover:bg-pickle-green/30'
              : 'bg-black/5 text-black/70 border border-black/15 hover:bg-black/10'
          }`}
        >
          {player.paid ? 'Unpaid' : 'Paid'}
        </button>
        <button
          type="button"
          onClick={onAddToStack}
          disabled={!canStack}
          title={
            onCourt
              ? `On court ${courtId}`
              : inStack
                ? 'Already in the deck'
                : 'Add to deck'
          }
          className="px-2 py-0.5 rounded bg-pickle-orange hover:bg-pickle-orange/90 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-medium text-white"
        >
          + Stack
        </button>
        <button
          type="button"
          onClick={onRemove}
          disabled={onCourt}
          title={onCourt ? 'Clear the court first' : 'Remove player'}
          className="px-2 py-0.5 rounded bg-red-600/90 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-medium text-white"
          aria-label={`Remove ${player.name}`}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
