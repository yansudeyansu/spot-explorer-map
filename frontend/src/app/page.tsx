'use client';
import { useState, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { LatLng } from '@/types';
import { useSpots } from '@/hooks/useSpots';
import { useReverseGeocode } from '@/hooks/useReverseGeocode';
import SpotList from '@/components/SpotList';
import RadiusControl from '@/components/RadiusControl';
import AddressDisplay from '@/components/AddressDisplay';

// Leaflet は window/document などブラウザ専用APIに依存するため SSR を無効化。
// （サーバー描画すると "window is not defined" で落ちる）
const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

const DEFAULT_CENTER: LatLng = { lat: 35.6812, lng: 139.7671 };
const DEFAULT_RADIUS = 10;
const HINT_KEY = 'landit_hint_dismissed';

export default function HomePage() {
  const [center, setCenter] = useState<LatLng>(DEFAULT_CENTER);
  const [radius, setRadius] = useState(DEFAULT_RADIUS);
  const [selectedSpotId, setSelectedSpotId] = useState<number | null>(null);

  // 初回オンボーディングのヒント。一度閉じたら localStorage で再表示を抑止。
  const [showHint, setShowHint] = useState(false);
  useEffect(() => {
    if (!localStorage.getItem(HINT_KEY)) setShowHint(true);
  }, []);
  const dismissHint = useCallback(() => {
    localStorage.setItem(HINT_KEY, '1');
    setShowHint(false);
  }, []);

  const { spots, loading } = useSpots(center, radius);
  const { address, loading: addrLoading } = useReverseGeocode(center);

  const handleCenterChange = useCallback((c: LatLng) => setCenter(c), []);
  const handleSpotSelect = useCallback((id: number | null) => setSelectedSpotId(id), []);

  return (
    <div className="flex flex-col h-screen">
      {/* ---- Header ---- */}
      <header className="flex items-center justify-between px-5 h-14 bg-white border-b border-zinc-200 shrink-0 z-20">
        <div className="flex items-center gap-2.5">
          <span aria-hidden="true" className="block w-2.5 h-2.5 rounded-full bg-zinc-900" />
          <h1 className="text-[15px] font-semibold tracking-tight text-zinc-900">
            スポット探索マップ
          </h1>
        </div>
        <p className="hidden sm:block text-xs text-zinc-400">
          地図を動かして、中心の円内にあるスポットを探す
        </p>
      </header>

      {/* ---- Main ---- */}
      <main className="flex flex-1 overflow-hidden">
        {/* Map */}
        <section className="relative flex-1" aria-label="地図">
          <MapView
            center={center}
            home={DEFAULT_CENTER}
            spots={spots}
            radius={radius}
            selectedSpotId={selectedSpotId}
            onCenterChange={handleCenterChange}
            onSpotSelect={handleSpotSelect}
          />

          {/* 地図中心の住所（要件③）。＋印の地点を指していることを明示。 */}
          <div className="pointer-events-none absolute top-4 left-1/2 -translate-x-1/2 z-[500] w-[min(92%,32rem)]">
            <AddressDisplay address={address} loading={addrLoading} />
          </div>

          {/* 中心マーカー（＋）＋「検索の中心」ラベル。
              これが検索の起点であることを一目で分かるようにする。 */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center z-[450]"
          >
            <div className="relative">
              <span className="absolute -inset-3 rounded-full border border-zinc-900/15" />
              <span className="block w-3 h-3 rounded-full bg-white border-[3px] border-zinc-900 shadow" />
            </div>
            <span className="mt-2 text-[11px] font-medium text-zinc-700 bg-white/90 px-2 py-0.5 rounded-full shadow-sm">
              検索の中心
            </span>
          </div>

          {/* 初回ヒント: 操作モデル（ドラッグ→中心→円→一覧）を1枚で説明 */}
          {showHint && (
            <div
              role="note"
              className="absolute bottom-5 left-1/2 -translate-x-1/2 z-[500] w-[min(92%,30rem)]
                         bg-zinc-900 text-white rounded-xl shadow-lg px-4 py-3"
            >
              <div className="flex items-start gap-3">
                <p className="flex-1 text-[13px] leading-relaxed">
                  <span className="font-semibold">使い方:</span>{' '}
                  地図をドラッグすると中心（＋）が移動します。
                  右の「検索半径」で指定した<span className="font-semibold">破線の円の中</span>にあるスポットが、
                  右側の一覧に表示されます。
                </p>
                <button
                  type="button"
                  onClick={dismissHint}
                  className="shrink-0 text-zinc-300 hover:text-white text-xs underline underline-offset-2"
                  aria-label="使い方の説明を閉じる"
                >
                  閉じる
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Sidebar */}
        <aside
          className="w-[21rem] xl:w-[23rem] flex flex-col bg-white border-l border-zinc-200 shrink-0"
          aria-label="検索コントロールとスポット一覧"
        >
          <RadiusControl radius={radius} onChange={setRadius} count={spots.length} loading={loading} />
          <SpotList
            spots={spots}
            loading={loading}
            selectedSpotId={selectedSpotId}
            onSelect={handleSpotSelect}
          />
        </aside>
      </main>
    </div>
  );
}
