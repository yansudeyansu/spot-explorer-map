'use client';
import { useEffect, useRef } from 'react';
import { Spot } from '@/types';

// Muted, editorial palette — color only encodes category, never decoration.
const CATEGORY_COLORS: Record<string, string> = {
  観光名所: '#b45454',
  交通機関: '#4b688a',
  公園: '#4f7a4f',
  寺院: '#7a5a8a',
  神社: '#a06a3c',
  歴史的建造物: '#8a7a3c',
  美術館: '#9a5a78',
  博物館: '#3c7a78',
  自然景観: '#5c7a3c',
  温泉: '#a8763c',
  科学施設: '#3c6a8a',
  ショッピング: '#9a4a5c',
  スポーツ施設: '#4a5a9a',
  水族館: '#3c6a9a',
  動物園: '#5c7a3c',
};

export function getCategoryColor(category: string | null): string {
  if (!category) return '#a1a1aa';
  return CATEGORY_COLORS[category] ?? '#71717a';
}

interface Props {
  spots: Spot[];
  loading: boolean;
  selectedSpotId: number | null;
  onSelect: (id: number | null) => void;
}

export default function SpotList({ spots, loading, selectedSpotId, onSelect }: Props) {
  const selectedRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (selectedSpotId && selectedRef.current) {
      selectedRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selectedSpotId]);

  return (
    <section
      id="spot-results"
      aria-label="スポット一覧"
      className="flex flex-col flex-1 overflow-hidden"
    >
      <div className="px-5 py-2.5 border-b border-zinc-200">
        <h2 className="text-[11px] font-semibold tracking-wide text-zinc-500">
          スポット一覧
        </h2>
        {/* クリックで地図が動くことを明示（発見されにくい操作のヒント） */}
        {spots.length > 0 && (
          <p className="mt-0.5 text-[11px] text-zinc-400">
            選ぶと地図がその場所へ移動します・中心から近い順
          </p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto nice-scroll" aria-busy={loading}>
        {/* First load */}
        {loading && spots.length === 0 && (
          <p className="flex items-center justify-center h-32 text-sm text-zinc-400">
            読み込んでいます…
          </p>
        )}

        {/* Empty state */}
        {!loading && spots.length === 0 && (
          <div className="flex flex-col items-center justify-center h-40 px-6 text-center">
            <p className="text-sm font-medium text-zinc-600">
              この範囲にスポットはありません
            </p>
            <p className="mt-1 text-xs text-zinc-400">
              半径を広げるか、地図を移動してください
            </p>
          </div>
        )}

        {/* Results */}
        <ul role="list" className="divide-y divide-zinc-100">
          {spots.map((spot) => {
            const color = getCategoryColor(spot.category);
            const isSelected = spot.id === selectedSpotId;
            return (
              <li key={spot.id}>
                <button
                  ref={isSelected ? selectedRef : null}
                  type="button"
                  onClick={() => onSelect(isSelected ? null : spot.id)}
                  aria-pressed={isSelected}
                  aria-label={
                    `${spot.name}、${spot.category ?? 'カテゴリなし'}` +
                    (spot.distance_km !== undefined ? `、中心から${spot.distance_km}キロメートル` : '')
                  }
                  className={`group w-full text-left px-5 py-3 transition-colors
                    hover:bg-zinc-50 focus-visible:bg-zinc-50
                    ${isSelected ? 'bg-zinc-50' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    <span
                      aria-hidden="true"
                      className="shrink-0 mt-1.5 w-2 h-2 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2">
                        <p
                          className={`text-sm truncate ${
                            isSelected ? 'font-semibold text-zinc-900' : 'font-medium text-zinc-800'
                          }`}
                        >
                          {spot.name}
                        </p>
                        {spot.distance_km !== undefined && (
                          <span className="shrink-0 text-xs tabular-nums text-zinc-400">
                            {spot.distance_km} km
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-zinc-500">
                        {spot.category && <span>{spot.category}</span>}
                        {spot.category && spot.address && (
                          <span aria-hidden="true" className="text-zinc-300">·</span>
                        )}
                        {spot.address && <span className="truncate">{spot.address}</span>}
                      </div>
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
