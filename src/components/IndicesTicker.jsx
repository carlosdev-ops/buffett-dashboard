import { useState, useEffect } from 'react';
import { fetchIndices } from '../utils/apiClient';

const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 min

export default function IndicesTicker() {
  const [indices, setIndices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const data = await fetchIndices();
        if (mounted) {
          setIndices(data);
          setLoading(false);
          setError(false);
        }
      } catch {
        if (mounted) {
          setError(true);
          setLoading(false);
        }
      }
    }

    load();
    const interval = setInterval(load, REFRESH_INTERVAL);
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  if (error || (!loading && indices.length === 0)) return null;

  if (loading) {
    return (
      <div className="bg-gray-100 text-gray-400 py-2 overflow-hidden mb-4 rounded-lg">
        <div className="flex gap-8 px-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex gap-2 items-center animate-pulse">
              <div className="h-3 w-16 bg-gray-300 rounded" />
              <div className="h-3 w-12 bg-gray-300 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const items = indices.map((idx) => {
    const isPositive = idx.changePercent >= 0;
    const color = isPositive ? 'text-green-600' : 'text-red-600';
    const arrow = isPositive ? '▲' : '▼';
    const priceStr = idx.price != null ? idx.price.toLocaleString('fr-CA', { maximumFractionDigits: 2 }) : '—';
    const pctStr = idx.changePercent != null ? `${isPositive ? '+' : ''}${idx.changePercent.toFixed(2)}%` : '';

    return (
      <span key={idx.symbol} className="inline-flex items-center gap-2 whitespace-nowrap text-sm">
        <span className="font-medium text-gray-700">{idx.name}</span>
        <span className="text-gray-600">{priceStr}</span>
        <span className={color}>{arrow} {pctStr}</span>
      </span>
    );
  });

  // Dupliquer pour défilement continu
  return (
    <div className="bg-gray-100 py-2 overflow-hidden mb-4 rounded-lg border border-gray-200">
      <div className="ticker-scroll flex gap-10">
        <div className="ticker-content flex gap-10 shrink-0">{items}</div>
        <div className="ticker-content flex gap-10 shrink-0" aria-hidden="true">{items}</div>
      </div>

      <style>{`
        .ticker-scroll {
          animation: ticker-marquee 40s linear infinite;
        }
        .ticker-scroll:hover {
          animation-play-state: paused;
        }
        @keyframes ticker-marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
