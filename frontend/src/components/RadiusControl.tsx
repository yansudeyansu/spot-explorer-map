'use client';

interface Props {
  radius: number;
  onChange: (r: number) => void;
  count: number;
  loading: boolean;
}

const MIN = 1;
const MAX = 100;

export default function RadiusControl({ radius, onChange, count, loading }: Props) {
  const pct = ((radius - MIN) / (MAX - MIN)) * 100;

  return (
    <div className="px-5 py-4 border-b border-zinc-200">
      <div className="flex items-baseline justify-between mb-1">
        <label htmlFor="radius" className="text-sm font-medium text-zinc-700">
          検索半径
        </label>
        <span className="text-sm font-semibold tabular-nums text-zinc-900">
          {radius} km
        </span>
      </div>
      <p className="text-xs text-zinc-400 mb-3">
        中心から この距離以内 のスポットを表示
      </p>

      <input
        id="radius"
        type="range"
        className="brand-slider w-full"
        style={{ ['--pct' as string]: `${pct}%` }}
        min={MIN}
        max={MAX}
        step={1}
        value={radius}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-valuetext={`${radius} キロメートル`}
        aria-describedby="result-count"
      />

      <div className="flex items-center justify-between mt-3">
        <span aria-hidden="true" className="text-xs text-zinc-400 tabular-nums">
          {MIN}–{MAX} km
        </span>
        <p
          id="result-count"
          className="text-xs text-zinc-500"
          aria-live="polite"
          aria-atomic="true"
        >
          {loading ? (
            '検索中…'
          ) : (
            <>
              円内のスポット{' '}
              <span className="font-semibold text-zinc-900 tabular-nums">{count}</span> 件
            </>
          )}
        </p>
      </div>
    </div>
  );
}
