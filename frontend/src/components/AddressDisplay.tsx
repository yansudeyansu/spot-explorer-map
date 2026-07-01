'use client';

interface Props {
  address: string;
  loading: boolean;
}

/**
 * 地図中心の住所を地図上に常時表示するパネル（要件③）。
 * ラベルは「地図の中心」とし、GPSの現在地ではなく＋印の地点だと明示する
 * （"現在地" だと自分の居場所と誤解されるため）。
 * aria-live で、地図移動に応じてスクリーンリーダーが住所を読み上げる。
 */
export default function AddressDisplay({ address, loading }: Props) {
  return (
    <div className="pointer-events-auto bg-white border border-zinc-200 rounded-xl shadow-sm px-4 py-2.5">
      <div className="flex items-center gap-3">
        <span className="text-[10px] font-semibold tracking-wide text-zinc-500 shrink-0">
          地図の中心
        </span>
        <p
          className="flex-1 min-w-0 text-sm font-medium text-zinc-900 truncate"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          {loading ? (
            <span className="text-zinc-400">住所を取得しています…</span>
          ) : (
            address || <span className="text-zinc-400">住所が見つかりません</span>
          )}
        </p>
      </div>
    </div>
  );
}
