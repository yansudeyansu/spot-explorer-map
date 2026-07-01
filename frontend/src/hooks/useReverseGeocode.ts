'use client';
import { useState, useEffect, useRef } from 'react';
import { LatLng } from '@/types';
import { useDebounce } from './useDebounce';

// 逆ジオコーディングは「呼び出し回数の抑制」が肝。フロント側でも多層で間引く:
//   ① 500ms デバウンス（下） … 地図を動かしている最中は投げない
//   ② 座標を3桁に丸めたキー   … 数十mの微小な移動では再取得しない
//   ③ このモジュールスコープのキャッシュ … 一度引いた住所はTTL内なら即返す
// バックエンド側にも同等のキャッシュがあり、二段構えでAPIコストを抑えている。
const geoCache = new Map<string, { address: string; expires: number }>();
const CACHE_TTL = 10 * 60 * 1000;

function cacheKey(lat: number, lng: number) {
  return `${lat.toFixed(3)},${lng.toFixed(3)}`;
}

export function useReverseGeocode(center: LatLng) {
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const debouncedCenter = useDebounce(center, 500);
  const prevKey = useRef('');

  useEffect(() => {
    const key = cacheKey(debouncedCenter.lat, debouncedCenter.lng);

    // 丸めたキーが前回と同じ＝意味のある移動が無い → 何もしない
    if (key === prevKey.current) return;
    prevKey.current = key;

    const cached = geoCache.get(key);
    if (cached && cached.expires > Date.now()) {
      setAddress(cached.address);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const params = new URLSearchParams({
      lat: debouncedCenter.lat.toString(),
      lng: debouncedCenter.lng.toString(),
    });

    fetch(`/api/geocode/reverse?${params}`)
      .then((r) => r.json())
      .then((data) => {
        // cancelled は古いリクエストの結果が新しい表示を上書きするのを防ぐガード
        // （素早く動かした際の競合対策）。
        if (!cancelled) {
          const addr = data.address || '';
          geoCache.set(key, { address: addr, expires: Date.now() + CACHE_TTL });
          setAddress(addr);
        }
      })
      .catch(() => { /* 住所取得の失敗は致命的でないため握りつぶす（地図操作は継続） */ })
      .finally(() => { if (!cancelled) setLoading(false); });

    // クリーンアップで cancelled を立て、未完了のリクエストを無効化する
    return () => { cancelled = true; };
  }, [debouncedCenter.lat, debouncedCenter.lng]);

  return { address, loading };
}
