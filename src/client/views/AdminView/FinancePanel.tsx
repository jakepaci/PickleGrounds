import { api } from '../../lib/api';
import { useAppStore } from '../../store/appStore';
import {
  formatPeso,
  getReservationFee,
  OPEN_PLAY_FEE,
  RESERVATION_PEAK_RATE,
  RESERVATION_REGULAR_RATE,
} from '../../../shared/constants';

const panelClass = 'bg-white rounded-lg border border-black/10 p-4 shadow-sm';

export function FinancePanel() {
  const { players, finances } = useAppStore((s) => s.state);

  async function markPlayerPaid(playerId: string) {
    await api.post(`/api/players/${playerId}/mark-paid`);
  }

  return (
    <section className={panelClass}>
      <h2 className="text-lg font-semibold mb-2 text-black">Finances</h2>
      <p className="text-2xl font-bold text-pickle-green mb-4 tabular-nums">
        Total Income: {formatPeso(finances.totalIncome)}
      </p>
      <p className="text-xs text-black/45 mb-3">
        Open play: {formatPeso(OPEN_PLAY_FEE)} per player. Court reservations:{' '}
        {formatPeso(getReservationFee('regular'))} regular ({formatPeso(RESERVATION_REGULAR_RATE)}
        /hr · 1 hr) or {formatPeso(getReservationFee('peak'))} peak (
        {formatPeso(RESERVATION_PEAK_RATE)}/hr · 1 hr) — mark from the Courts panel.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
        {players.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => !p.paid && markPlayerPaid(p.id)}
            disabled={p.paid}
            title={p.paid ? 'Already paid' : `Mark paid · ${formatPeso(OPEN_PLAY_FEE)}`}
            className={`text-left px-3 py-2 rounded text-sm transition-all ${
              p.paid
                ? 'bg-pickle-green/10 text-pickle-green border border-pickle-green/40 cursor-default'
                : 'bg-white border border-black/15 hover:border-pickle-green hover:ring-2 hover:ring-pickle-green/25 text-black'
            }`}
          >
            <span className="font-medium block truncate">{p.name}</span>
            <span className="text-xs text-black/45">{p.skill}</span>
            {p.paid ? (
              <span className="text-xs text-pickle-green font-semibold block mt-0.5">Paid ✓</span>
            ) : (
              <span className="text-xs text-black/40 block mt-0.5">{formatPeso(OPEN_PLAY_FEE)}</span>
            )}
          </button>
        ))}
      </div>
      {players.length === 0 && (
        <p className="text-black/45 text-sm">Register players to track payments.</p>
      )}
    </section>
  );
}

