'use client';
import { useState, useEffect } from 'react';
import { Spot, LatLng } from '@/types';
import { useDebounce } from './useDebounce';

// 地図の中心と半径から周辺スポットを取得するフック。
export function useSpots(center: LatLng, radius: number) {
  const [spots, setSpots] = useState<Spot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ドラッグ中の連続発火を抑えるためデバウンス。
  // 中心(400ms)はパン操作が続きやすいので長め、半径(200ms)はスライダーの追従性を優先して短め。
  const debouncedCenter = useDebounce(center, 400);
  const debouncedRadius = useDebounce(radius, 200);

  useEffect(() => {
    // cancelled: 遅れて返ってきた古い検索結果が新しい結果を上書きしないようにするガード
    let cancelled = false;
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({
      lat: debouncedCenter.lat.toString(),
      lng: debouncedCenter.lng.toString(),
      radius: debouncedRadius.toString(),
    });

    fetch(`/api/spots?${params}`)
      .then((r) => {
        if (!r.ok) throw new Error('APIエラー');
        return r.json();
      })
      .then((data: Spot[]) => {
        if (!cancelled) setSpots(data);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [debouncedCenter.lat, debouncedCenter.lng, debouncedRadius]);

  return { spots, loading, error };
}
